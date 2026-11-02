-- SocialU | Snipe private large-photo transport (SRS-510.2, 510.3, 510.11; DP). See documentation/snipe-photo-transport.md.
-- Additive only. The browser uploads the ORIGINAL photo straight to a private staging bucket through a
-- one-object, upload-only signed URL, so photos up to the approved 10,000,000 bytes never pass through a
-- size-capped function request. The server then downloads, verifies and re-encodes it and accepts the Snipe
-- through the existing core bridge. Nothing here replaces public.socialu_snipe, socialu.snipe_view or any
-- reward object: the staging bridge calls the core 'prepare' / 'create' actions by name at run time
-- (EXECUTE), so the current core function, or a later wrapper installed under the same name, decides every
-- participant, friendship, cooldown, retry and reward rule exactly as for any other submission.
--
-- New error codes returned to the API (mapped in lib/snipe.ts):
--   SP404 upload ticket not available (missing, another account or another conversation all look the same)
--   SP409 this upload is already being checked, or its check lost its claim
--   SP422 the uploaded photo was rejected by the server decoder (stored as the terminal reason)
--   SP429 too many photo uploads in progress / not yet cleaned up for this account
BEGIN;

-- One row per upload ticket. The browser only ever holds the random ticket; the database stores its SHA-256.
-- Every binding the finalize step relies on is fixed here at begin and never accepted from the browser again.
-- Lifecycle: open -> finalizing (a server claim with a short lease) -> accepted | rejected | expired, or back
-- to open when a check could not finish (missing object, transient storage or database failure).
-- accepted / rejected / expired are terminal for the ticket. The staging object can be recreated through the
-- signed URL until that URL expires, so object cleanup is tracked separately (upload_expires_at, object_cleared_at).
CREATE TABLE socialu.snipe_photo_stages (
  stage_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_hash TEXT NOT NULL UNIQUE CHECK (ticket_hash ~ '^[0-9a-f]{64}$'),
  owner_id BIGINT NOT NULL REFERENCES socialu.students(student_id),
  auth_user_id UUID NOT NULL,
  conversation_id BIGINT NOT NULL REFERENCES socialu.conversations(conversation_id),
  submission_key UUID NOT NULL,
  -- Sorted, unique friend IDs, exactly as the core bridge compares them.
  targets BIGINT[] NOT NULL CHECK (cardinality(targets) > 0),
  -- SHA-256 of the ORIGINAL bytes the browser declared; finalize recomputes it from the stored object.
  content_digest TEXT NOT NULL CHECK (content_digest ~ '^[0-9a-f]{64}$'),
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png')),
  byte_count BIGINT NOT NULL CHECK (byte_count BETWEEN 1 AND 10000000),
  -- stage/<auth user id>/<random UUID>.<jpg|png> in the staging bucket only; never a committed photo key.
  staging_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'finalizing', 'accepted', 'rejected', 'expired')),
  terminal_code TEXT,
  terminal_reason TEXT,
  terminal_detail TEXT,
  claim_token UUID,
  claimed_until TIMESTAMPTZ,
  snipe_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- The ticket can be finalized only before this time.
  expires_at TIMESTAMPTZ NOT NULL,
  -- Conservative end of the signed upload URL's own lifetime (2 hours, not revocable) plus a margin.
  upload_expires_at TIMESTAMPTZ NOT NULL,
  reap_claimed_until TIMESTAMPTZ,
  object_cleared_at TIMESTAMPTZ,
  CHECK (staging_key ~ ('^stage/' || auth_user_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png)$')),
  CHECK ((mime_type = 'image/jpeg') = (staging_key LIKE '%.jpg')),
  CHECK ((status = 'finalizing') = (claim_token IS NOT NULL AND claimed_until IS NOT NULL)),
  CHECK ((status = 'accepted') = (snipe_id IS NOT NULL)),
  CHECK (object_cleared_at IS NULL OR status IN ('accepted', 'rejected', 'expired'))
);
-- At most one live ticket per submission; a retry of the same submission reuses it.
CREATE UNIQUE INDEX snipe_photo_stages_live_key ON socialu.snipe_photo_stages(owner_id, submission_key) WHERE status IN ('open', 'finalizing');
CREATE INDEX snipe_photo_stages_owner ON socialu.snipe_photo_stages(owner_id, submission_key);
CREATE INDEX snipe_photo_stages_uncleared ON socialu.snipe_photo_stages(upload_expires_at) WHERE object_cleared_at IS NULL;
-- Server-only: no browser role and not even service_role reads the table; only the functions below do.
ALTER TABLE socialu.snipe_photo_stages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE socialu.snipe_photo_stages FROM PUBLIC, anon, authenticated, service_role;

-- The core Snipe bridge, resolved by name when called (never a copy of it). Only 'prepare' and 'create'.
CREATE FUNCTION socialu.snipe_photo_core(p_auth_id UUID, p_action TEXT, p_conversation_id BIGINT, p_payload JSONB) RETURNS JSONB
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v JSONB;
BEGIN
  IF p_action NOT IN ('prepare', 'create') THEN RAISE EXCEPTION 'Unsupported Snipe action.' USING ERRCODE = 'SN400'; END IF;
  EXECUTE 'SELECT public.socialu_snipe($1, $2, $3, NULL, $4)' INTO v USING p_auth_id, p_action, p_conversation_id, p_payload;
  RETURN v;
END;
$$;

-- The selection a staged ticket was bound to, in the core bridge's payload shape.
CREATE FUNCTION socialu.snipe_photo_selection(s socialu.snipe_photo_stages) RETURNS JSONB
LANGUAGE sql SET search_path = '' AS $$
  SELECT jsonb_build_object('submission_key', s.submission_key::text, 'targets', to_jsonb(s.targets::text[]), 'content_digest', s.content_digest);
$$;

-- Lock contention, deadlock and serialization failures leave a ticket usable; every other database answer is final.
CREATE FUNCTION socialu.snipe_photo_retryable(p_state TEXT) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT p_state LIKE '40%' OR p_state IN ('55P03', '57014');
$$;

REVOKE ALL ON FUNCTION socialu.snipe_photo_core(UUID, TEXT, BIGINT, JSONB), socialu.snipe_photo_selection(socialu.snipe_photo_stages),
  socialu.snipe_photo_retryable(TEXT) FROM PUBLIC, anon, authenticated, service_role;

-- Server-only staging bridge. The acting student always comes from the verified Supabase Auth user id.
--   begin    validate the selection with the core 'prepare', then open (or reuse) one ticket
--   discard  close an open ticket whose upload URL could not be issued
--   claim    take a short exclusive lease to check the uploaded object (or report the ticket's outcome)
--   release  give the lease back without an outcome (object missing, transient failure)
--   reject   record a definite decoder rejection (terminal)
--   accept   atomically recheck everything through the core 'create' and record the outcome
-- Every action except begin finds the ticket by its hash AND the verified account AND the conversation.
CREATE FUNCTION public.socialu_snipe_photo(p_auth_id UUID, p_action TEXT, p_conversation_id BIGINT, p_payload JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me BIGINT; s socialu.snipe_photo_stages%ROWTYPE; v JSONB; v_hash TEXT; v_key UUID; v_targets BIGINT[];
  v_digest TEXT; v_mime TEXT; v_bytes BIGINT; v_max BIGINT; v_staging TEXT; v_claim UUID;
  v_state TEXT; v_message TEXT; v_detail TEXT;
BEGIN
  p_payload := coalesce(p_payload, '{}'::jsonb);
  v_hash := p_payload->>'ticket_hash';
  IF v_hash IS NULL OR v_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Start the Snipe again.' USING ERRCODE = 'SN400'; END IF;

  IF p_action = 'begin' THEN
    -- The same participant, friendship, cooldown and retry checks as any submission; an accepted retry
    -- returns the saved request (nothing is uploaded) and a changed reuse of the key is SN409.
    v := socialu.snipe_photo_core(p_auth_id, 'prepare', p_conversation_id, jsonb_build_object(
      'submission_key', p_payload->'submission_key', 'targets', p_payload->'targets', 'content_digest', p_payload->'content_digest'));
    me := public.socialu_require_student(p_auth_id);
    IF (v->>'snipe') IS NOT NULL THEN
      -- The core compares conversation, tags and photo. Once accepted, the key also stays bound to the original's
      -- declared type and size wherever its ticket is still kept (a legacy multipart submission has none).
      IF EXISTS (SELECT 1 FROM socialu.snipe_photo_stages x WHERE x.owner_id = me AND x.submission_key = (p_payload->>'submission_key')::uuid
          AND (x.conversation_id, x.content_digest, x.mime_type, x.byte_count::text)
            IS DISTINCT FROM (p_conversation_id, p_payload->>'content_digest', p_payload->>'mime_type', p_payload->>'byte_count')) THEN
        RAISE EXCEPTION 'This submission was already used for a different Snipe. Start a new one.' USING ERRCODE = 'SN409';
      END IF;
      RETURN jsonb_build_object('state', 'accepted', 'created', false, 'snipe', v->'snipe');
    END IF;

    v_key := (p_payload->>'submission_key')::uuid;
    SELECT array_agg(DISTINCT (e #>> '{}')::bigint ORDER BY (e #>> '{}')::bigint) INTO v_targets FROM jsonb_array_elements(p_payload->'targets') e;
    v_digest := p_payload->>'content_digest';
    v_mime := p_payload->>'mime_type';
    SELECT max_bytes INTO v_max FROM socialu.upload_policies WHERE upload_context = 'snipe' AND mime_type = v_mime;
    IF v_max IS NULL THEN RAISE EXCEPTION 'Only JPEG and PNG photos are supported.' USING ERRCODE = 'SN400'; END IF;
    IF coalesce(p_payload->>'byte_count', '') !~ '^[1-9][0-9]{0,8}$' OR (p_payload->>'byte_count')::bigint > v_max THEN
      RAISE EXCEPTION 'Photos can be at most 10 MB.' USING ERRCODE = 'SN400';
    END IF;
    v_bytes := (p_payload->>'byte_count')::bigint;
    v_staging := p_payload->>'staging_key';
    IF v_staging IS NULL OR v_staging !~ ('^stage/' || p_auth_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.'
         || CASE WHEN v_mime = 'image/jpeg' THEN 'jpg' ELSE 'png' END || '$') THEN
      RAISE EXCEPTION 'The photo upload was not recognized.' USING ERRCODE = 'SN400';
    END IF;

    -- The photographer lock the core create takes: bounds and reuse decisions below cannot race each other.
    PERFORM 1 FROM socialu.students WHERE student_id = me FOR UPDATE;
    -- Tickets past their deadline (or about to pass it) are closed for good; a stale claim cannot accept any more.
    UPDATE socialu.snipe_photo_stages SET status = 'expired', terminal_code = 'SP410', terminal_reason = 'This photo upload expired. Start the Snipe again.',
        claim_token = NULL, claimed_until = NULL
     WHERE owner_id = me AND ((status = 'open' AND expires_at <= CURRENT_TIMESTAMP + INTERVAL '1 minute')
        OR (status = 'finalizing' AND expires_at <= CURRENT_TIMESTAMP AND claimed_until <= CURRENT_TIMESTAMP));
    -- SRS-510.11: one submission key is one photo, conversation and tag set, including while it is only staged.
    IF EXISTS (SELECT 1 FROM socialu.snipe_photo_stages x WHERE x.owner_id = me AND x.submission_key = v_key
        AND (x.conversation_id, x.targets, x.content_digest, x.mime_type, x.byte_count) IS DISTINCT FROM (p_conversation_id, v_targets, v_digest, v_mime, v_bytes)) THEN
      RAISE EXCEPTION 'This submission was already used for a different Snipe. Start a new one.' USING ERRCODE = 'SN409';
    END IF;
    SELECT * INTO s FROM socialu.snipe_photo_stages WHERE owner_id = me AND submission_key = v_key AND status IN ('open', 'finalizing') FOR UPDATE;
    IF FOUND THEN
      IF s.status = 'finalizing' AND s.claimed_until > CURRENT_TIMESTAMP THEN
        RAISE EXCEPTION 'This photo is already being checked. Try again in a moment.' USING ERRCODE = 'SP409';
      END IF;
      -- Same submission and same photo: the new ticket replaces the old one (which stops working) and keeps the
      -- staging object. The new upload URL lives two more hours, so cleanup waits for it as well.
      UPDATE socialu.snipe_photo_stages SET ticket_hash = v_hash, status = 'open', claim_token = NULL, claimed_until = NULL,
          upload_expires_at = greatest(upload_expires_at, CURRENT_TIMESTAMP + INTERVAL '135 minutes')
       WHERE stage_id = s.stage_id RETURNING * INTO s;
      RETURN jsonb_build_object('state', 'staged', 'reused', true, 'staging_key', s.staging_key, 'expires_at', s.expires_at);
    END IF;
    -- Bounded staging per account: a few live tickets, and a cap on objects that may still exist in storage.
    IF (SELECT count(*) FROM socialu.snipe_photo_stages WHERE owner_id = me AND status IN ('open', 'finalizing')) >= 3 THEN
      RAISE EXCEPTION 'Too many photo uploads are in progress. Finish one or wait a few minutes, then try again.' USING ERRCODE = 'SP429';
    END IF;
    IF (SELECT count(*) FROM socialu.snipe_photo_stages WHERE owner_id = me AND object_cleared_at IS NULL) >= 20 THEN
      RAISE EXCEPTION 'You started too many Snipe uploads recently. Try again in a couple of hours.' USING ERRCODE = 'SP429';
    END IF;
    INSERT INTO socialu.snipe_photo_stages(ticket_hash, owner_id, auth_user_id, conversation_id, submission_key, targets,
        content_digest, mime_type, byte_count, staging_key, expires_at, upload_expires_at)
      VALUES (v_hash, me, p_auth_id, p_conversation_id, v_key, v_targets, v_digest, v_mime, v_bytes, v_staging,
        CURRENT_TIMESTAMP + INTERVAL '30 minutes', CURRENT_TIMESTAMP + INTERVAL '135 minutes')
      RETURNING * INTO s;
    RETURN jsonb_build_object('state', 'staged', 'reused', false, 'staging_key', s.staging_key, 'expires_at', s.expires_at);
  END IF;

  IF p_action NOT IN ('discard', 'claim', 'release', 'reject', 'accept') THEN
    RAISE EXCEPTION 'Unsupported Snipe upload action.' USING ERRCODE = 'SN400';
  END IF;
  -- Another account's or another conversation's ticket is indistinguishable from a missing one.
  SELECT owner_id INTO me FROM socialu.snipe_photo_stages
   WHERE ticket_hash = v_hash AND auth_user_id = p_auth_id AND conversation_id IS NOT DISTINCT FROM p_conversation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'This photo upload is no longer available. Start the Snipe again.' USING ERRCODE = 'SP404'; END IF;
  -- Photographer first, then the ticket: the same order as begin and the core create.
  PERFORM 1 FROM socialu.students WHERE student_id = me FOR UPDATE;
  SELECT * INTO s FROM socialu.snipe_photo_stages WHERE ticket_hash = v_hash AND auth_user_id = p_auth_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This photo upload is no longer available. Start the Snipe again.' USING ERRCODE = 'SP404'; END IF;
  IF p_action IN ('release', 'reject', 'accept') THEN
    IF coalesce(p_payload->>'claim', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Start the Snipe again.' USING ERRCODE = 'SN400';
    END IF;
    v_claim := (p_payload->>'claim')::uuid;
  END IF;

  IF p_action = 'discard' THEN
    UPDATE socialu.snipe_photo_stages SET status = 'rejected', terminal_code = 'SP410', terminal_reason = 'The photo upload could not be started. Start the Snipe again.'
     WHERE stage_id = s.stage_id AND status = 'open';
    RETURN jsonb_build_object('state', CASE WHEN FOUND THEN 'rejected' ELSE s.status END);
  END IF;

  IF p_action = 'claim' THEN
    IF s.status = 'accepted' THEN
      -- A repeated finalize (for example after a lost response) returns the saved request through the core check.
      v := socialu.snipe_photo_core(p_auth_id, 'prepare', p_conversation_id, socialu.snipe_photo_selection(s));
      RETURN jsonb_build_object('state', 'accepted', 'created', false, 'snipe', v->'snipe');
    END IF;
    IF s.status IN ('rejected', 'expired') THEN
      RETURN jsonb_build_object('state', s.status, 'error', jsonb_build_object('code', s.terminal_code, 'message', s.terminal_reason, 'details', s.terminal_detail));
    END IF;
    IF s.status = 'finalizing' AND s.claimed_until > CURRENT_TIMESTAMP THEN
      RAISE EXCEPTION 'This photo is already being checked. Try again in a moment.' USING ERRCODE = 'SP409';
    END IF;
    -- An expired ticket never finalizes, even when its bytes were uploaded.
    IF CURRENT_TIMESTAMP >= s.expires_at THEN
      UPDATE socialu.snipe_photo_stages SET status = 'expired', terminal_code = 'SP410', terminal_reason = 'This photo upload expired. Start the Snipe again.',
          claim_token = NULL, claimed_until = NULL WHERE stage_id = s.stage_id RETURNING * INTO s;
      RETURN jsonb_build_object('state', 'expired', 'error', jsonb_build_object('code', s.terminal_code, 'message', s.terminal_reason));
    END IF;
    -- Eligibility before any download. A lost response may also have hidden an earlier acceptance of this
    -- exact submission; the core check returns that request instead of starting another.
    BEGIN
      v := socialu.snipe_photo_core(p_auth_id, 'prepare', p_conversation_id, socialu.snipe_photo_selection(s));
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT, v_detail = PG_EXCEPTION_DETAIL;
      IF socialu.snipe_photo_retryable(v_state) THEN RAISE; END IF;
      UPDATE socialu.snipe_photo_stages SET status = 'rejected', terminal_code = v_state, terminal_reason = v_message, terminal_detail = nullif(v_detail, ''),
          claim_token = NULL, claimed_until = NULL WHERE stage_id = s.stage_id;
      RETURN jsonb_build_object('state', 'rejected', 'error', jsonb_build_object('code', v_state, 'message', v_message, 'details', nullif(v_detail, '')));
    END;
    IF (v->>'snipe') IS NOT NULL THEN
      UPDATE socialu.snipe_photo_stages SET status = 'accepted', snipe_id = (v->'snipe'->>'id')::bigint, claim_token = NULL, claimed_until = NULL
       WHERE stage_id = s.stage_id;
      RETURN jsonb_build_object('state', 'accepted', 'created', false, 'snipe', v->'snipe');
    END IF;
    UPDATE socialu.snipe_photo_stages SET status = 'finalizing', claim_token = gen_random_uuid(), claimed_until = CURRENT_TIMESTAMP + INTERVAL '3 minutes'
     WHERE stage_id = s.stage_id RETURNING * INTO s;
    RETURN jsonb_build_object('state', 'claimed', 'claim', s.claim_token, 'staging_key', s.staging_key, 'submission_key', s.submission_key,
      'targets', to_jsonb(s.targets::text[]), 'content_digest', s.content_digest, 'mime_type', s.mime_type, 'byte_count', s.byte_count);
  END IF;

  -- release / reject / accept act only for the current claim holder.
  IF p_action IN ('release', 'reject') THEN
    IF s.status <> 'finalizing' OR s.claim_token IS DISTINCT FROM v_claim THEN RETURN jsonb_build_object('state', s.status); END IF;
    IF p_action = 'release' THEN
      UPDATE socialu.snipe_photo_stages SET status = 'open', claim_token = NULL, claimed_until = NULL WHERE stage_id = s.stage_id RETURNING * INTO s;
    ELSE
      UPDATE socialu.snipe_photo_stages SET status = 'rejected', terminal_code = 'SP422',
          terminal_reason = coalesce(nullif(left(p_payload->>'reason', 300), ''), 'This photo could not be accepted. Choose a different JPEG or PNG photo.'),
          claim_token = NULL, claimed_until = NULL
       WHERE stage_id = s.stage_id RETURNING * INTO s;
    END IF;
    RETURN jsonb_build_object('state', s.status);
  END IF;

  -- accept
  IF s.status = 'accepted' THEN
    -- A duplicate accept after a lost response: the core answers created=false and whether this object is the committed one.
    v := socialu.snipe_photo_core(p_auth_id, 'create', p_conversation_id, socialu.snipe_photo_selection(s)
      || jsonb_build_object('storage_key', p_payload->'storage_key', 'mime_type', p_payload->'mime_type', 'byte_count', p_payload->'byte_count'));
    RETURN jsonb_build_object('state', 'accepted', 'created', false, 'snipe', v->'snipe', 'same_upload', coalesce(v->'same_upload', 'false'::jsonb));
  END IF;
  IF s.status <> 'finalizing' OR s.claim_token IS DISTINCT FROM v_claim OR s.claimed_until <= CURRENT_TIMESTAMP THEN
    RAISE EXCEPTION 'This photo check took too long. Please try again.' USING ERRCODE = 'SP409';
  END IF;
  IF CURRENT_TIMESTAMP >= s.expires_at THEN
    UPDATE socialu.snipe_photo_stages SET status = 'expired', terminal_code = 'SP410', terminal_reason = 'This photo upload expired. Start the Snipe again.',
        claim_token = NULL, claimed_until = NULL WHERE stage_id = s.stage_id RETURNING * INTO s;
    RETURN jsonb_build_object('state', 'expired', 'error', jsonb_build_object('code', s.terminal_code, 'message', s.terminal_reason));
  END IF;
  IF p_payload->>'mime_type' IS DISTINCT FROM s.mime_type THEN
    RAISE EXCEPTION 'The photo upload was not recognized.' USING ERRCODE = 'SN400';
  END IF;
  -- Atomic acceptance: the core create re-verifies the account, membership, friendship, cooldowns and retry
  -- identity under the photographer lock, inserts the media and request rows, and keeps every reward trigger.
  BEGIN
    v := socialu.snipe_photo_core(p_auth_id, 'create', p_conversation_id, socialu.snipe_photo_selection(s)
      || jsonb_build_object('storage_key', p_payload->'storage_key', 'mime_type', p_payload->'mime_type', 'byte_count', p_payload->'byte_count'));
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_message = MESSAGE_TEXT, v_detail = PG_EXCEPTION_DETAIL;
    IF socialu.snipe_photo_retryable(v_state) THEN
      UPDATE socialu.snipe_photo_stages SET status = 'open', claim_token = NULL, claimed_until = NULL WHERE stage_id = s.stage_id;
      RETURN jsonb_build_object('state', 'retry', 'error', jsonb_build_object('code', v_state, 'message', v_message));
    END IF;
    UPDATE socialu.snipe_photo_stages SET status = 'rejected', terminal_code = v_state, terminal_reason = v_message, terminal_detail = nullif(v_detail, ''),
        claim_token = NULL, claimed_until = NULL WHERE stage_id = s.stage_id;
    RETURN jsonb_build_object('state', 'rejected', 'error', jsonb_build_object('code', v_state, 'message', v_message, 'details', nullif(v_detail, '')));
  END;
  UPDATE socialu.snipe_photo_stages SET status = 'accepted', snipe_id = (v->'snipe'->>'id')::bigint, claim_token = NULL, claimed_until = NULL
   WHERE stage_id = s.stage_id;
  RETURN jsonb_build_object('state', 'accepted', 'created', v->'created', 'snipe', v->'snipe', 'same_upload', coalesce(v->'same_upload', 'false'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_snipe_photo(UUID, TEXT, BIGINT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_snipe_photo(UUID, TEXT, BIGINT, JSONB) TO service_role;

-- Server-only cleanup of staging objects. Only staging keys are ever returned (never a committed photo key,
-- which lives in another bucket), and only once the ticket is terminal AND its signed upload URL can no
-- longer recreate the object. Batches are claimed with SKIP LOCKED and a lease, so concurrent cleaners never
-- wait on each other or on live submissions.
--   claim    close stale tickets, then lease up to 20 staging objects that are safe to delete
--   cleared  record that the server deleted those objects; old cleared rows are dropped
CREATE FUNCTION public.socialu_snipe_photo_reap(p_action TEXT, p_payload JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v JSONB; v_count INTEGER;
BEGIN
  IF p_action = 'claim' THEN
    -- A stale claim past both its lease and the ticket deadline can no longer accept (accept needs a live lease).
    WITH stale AS (
      SELECT stage_id FROM socialu.snipe_photo_stages
       WHERE status IN ('open', 'finalizing') AND expires_at <= CURRENT_TIMESTAMP AND (status = 'open' OR claimed_until <= CURRENT_TIMESTAMP)
       ORDER BY stage_id LIMIT 100 FOR UPDATE SKIP LOCKED)
    UPDATE socialu.snipe_photo_stages x SET status = 'expired', terminal_code = 'SP410', terminal_reason = 'This photo upload expired. Start the Snipe again.',
        claim_token = NULL, claimed_until = NULL
      FROM stale WHERE x.stage_id = stale.stage_id;
    WITH due AS (
      SELECT stage_id FROM socialu.snipe_photo_stages
       WHERE object_cleared_at IS NULL AND status IN ('accepted', 'rejected', 'expired') AND upload_expires_at <= CURRENT_TIMESTAMP
         AND (reap_claimed_until IS NULL OR reap_claimed_until <= CURRENT_TIMESTAMP)
       ORDER BY upload_expires_at, stage_id LIMIT 20 FOR UPDATE SKIP LOCKED),
    leased AS (
      UPDATE socialu.snipe_photo_stages x SET reap_claimed_until = CURRENT_TIMESTAMP + INTERVAL '5 minutes'
        FROM due WHERE x.stage_id = due.stage_id RETURNING x.stage_id, x.staging_key)
    SELECT coalesce(jsonb_agg(jsonb_build_object('id', l.stage_id::text, 'staging_key', l.staging_key) ORDER BY l.stage_id), '[]'::jsonb) INTO v FROM leased l;
    RETURN jsonb_build_object('objects', v);
  END IF;
  IF p_action = 'cleared' THEN
    IF jsonb_typeof(p_payload->'ids') IS DISTINCT FROM 'array'
       OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_payload->'ids') e WHERE jsonb_typeof(e) <> 'string' OR (e #>> '{}') !~ '^[1-9][0-9]{0,17}$') THEN
      RAISE EXCEPTION 'Unsupported Snipe upload cleanup.' USING ERRCODE = 'SN400';
    END IF;
    UPDATE socialu.snipe_photo_stages SET object_cleared_at = CURRENT_TIMESTAMP, reap_claimed_until = NULL
     WHERE stage_id IN (SELECT (e #>> '{}')::bigint FROM jsonb_array_elements(p_payload->'ids') e)
       AND object_cleared_at IS NULL AND status IN ('accepted', 'rejected', 'expired') AND upload_expires_at <= CURRENT_TIMESTAMP;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    -- Rows are kept a week after cleanup (conflict answers for a reused key), then dropped.
    DELETE FROM socialu.snipe_photo_stages WHERE object_cleared_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
    RETURN jsonb_build_object('cleared', v_count);
  END IF;
  RAISE EXCEPTION 'Unsupported Snipe upload cleanup.' USING ERRCODE = 'SN400';
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_snipe_photo_reap(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_snipe_photo_reap(TEXT, JSONB) TO service_role;

-- Staged originals live in their own private bucket, separate from committed photos, so cleanup can never
-- reach a committed object. Where Storage supports it, the bucket itself refuses objects over the approved
-- 10,000,000 bytes and anything other than JPEG/PNG. A second RESTRICTIVE policy (only ever tightening; the
-- existing socialu_snipe_photos_server_only policy is unchanged) keeps anon and authenticated out of it even
-- under a broad permissive policy. Only the server (service_role) signs, downloads and removes objects here.
DO $storage$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets(id, name, public) VALUES ('socialu-snipe-staging', 'socialu-snipe-staging', false)
    ON CONFLICT (id) DO UPDATE SET public = false;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'file_size_limit') THEN
      EXECUTE $sql$UPDATE storage.buckets SET file_size_limit = 10000000 WHERE id = 'socialu-snipe-staging'$sql$;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'allowed_mime_types') THEN
      EXECUTE $sql$UPDATE storage.buckets SET allowed_mime_types = ARRAY['image/jpeg', 'image/png'] WHERE id = 'socialu-snipe-staging'$sql$;
    END IF;
  END IF;
  IF to_regclass('storage.objects') IS NOT NULL THEN
    DROP POLICY IF EXISTS socialu_snipe_staging_server_only ON storage.objects;
    CREATE POLICY socialu_snipe_staging_server_only ON storage.objects AS RESTRICTIVE FOR ALL TO anon, authenticated
      USING (bucket_id IS DISTINCT FROM 'socialu-snipe-staging')
      WITH CHECK (bucket_id IS DISTINCT FROM 'socialu-snipe-staging');
  END IF;
END
$storage$;

NOTIFY pgrst, 'reload schema';
COMMIT;
