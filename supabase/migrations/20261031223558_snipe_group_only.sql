-- Snipe is a group-chat feature. Keep all consent, eligibility, locking and reward checks.
-- Replace only the existing core and staging bridges; no data or access grants are broadened.
-- Original actors retain the separate metadata-only sharing withdrawal/removal path.
BEGIN;

CREATE OR REPLACE FUNCTION public.socialu_snipe(p_auth_id UUID, p_action TEXT, p_conversation_id BIGINT,
  p_snipe_id BIGINT DEFAULT NULL, p_payload JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me BIGINT; c socialu.conversations%ROWTYPE; r socialu.snipe_requests%ROWTYPE; mine socialu.snipe_tags%ROWTYPE;
  v_role TEXT; v_key UUID; v_targets BIGINT[]; v_count INTEGER; v_cooldowns JSONB; v_asset BIGINT;
  v_storage_key TEXT; v_mime TEXT; v_bytes BIGINT; v_identity JSONB; v_sharing JSONB; v_submitter BIGINT; v_digest TEXT;
  v_before BIGINT; v_before_at TIMESTAMPTZ; v_ids BIGINT[]; v_page CONSTANT INTEGER := 50;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_conversation_id IS NULL OR NOT socialu.is_current_participant(p_conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id;
  -- The same unavailable response for DMs, missing chats and nonparticipants.
  IF c.kind IS DISTINCT FROM 'group' THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  p_payload := coalesce(p_payload, '{}'::jsonb);

  IF p_action = 'list' THEN
    PERFORM socialu.snipe_settle(p_conversation_id);
    -- SRS-512.1, 512.11: an absent `before` is the first page. A supplied one (including JSON null) must be a
    -- Snipe ID string naming a request in this conversation that this student can see right now.
    IF p_payload ? 'before' THEN
      IF jsonb_typeof(p_payload->'before') IS DISTINCT FROM 'string' OR (p_payload->>'before') !~ '^[1-9][0-9]{0,17}$' THEN
        RAISE EXCEPTION 'These Snipes could not be loaded. Refresh and try again.' USING ERRCODE = 'SN400';
      END IF;
      v_before := (p_payload->>'before')::bigint;
      SELECT r2.submitted_at INTO v_before_at FROM socialu.snipe_requests r2
       WHERE r2.snipe_id = v_before AND r2.conversation_id = p_conversation_id AND socialu.snipe_viewer_role(r2.snipe_id, me) IS NOT NULL;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'These Snipes could not be loaded. Refresh and try again.' USING ERRCODE = 'SN400';
      END IF;
    END IF;
    -- One visible row beyond the page shows whether another page exists. Stable order: submitted_at, then
    -- snipe_id, newest first. Requests added after the first page sort before the cursor, so they never shift it.
    SELECT array_agg(x.snipe_id ORDER BY x.submitted_at DESC, x.snipe_id DESC) INTO v_ids FROM (
      SELECT r2.snipe_id, r2.submitted_at FROM socialu.snipe_requests r2
       WHERE r2.conversation_id = p_conversation_id
         AND (v_before IS NULL OR (r2.submitted_at, r2.snipe_id) < (v_before_at, v_before))
         AND socialu.snipe_viewer_role(r2.snipe_id, me) IS NOT NULL
       ORDER BY r2.submitted_at DESC, r2.snipe_id DESC LIMIT v_page + 1) x;
    v_ids := coalesce(v_ids, ARRAY[]::BIGINT[]);
    RETURN jsonb_build_object('student_id', me::text, 'kind', c.kind, 'rewards', socialu.snipe_rewards_summary(me),
      'targets', socialu.snipe_targets(p_conversation_id, me),
      'snipes', coalesce((SELECT jsonb_agg(socialu.snipe_view(u.id, me) ORDER BY u.n)
          FROM unnest(v_ids[1:v_page]) WITH ORDINALITY u(id, n)), '[]'::jsonb),
      'next_cursor', CASE WHEN cardinality(v_ids) > v_page THEN v_ids[v_page]::text END);
  END IF;

  IF p_action IN ('prepare', 'create') THEN
    -- SRS-510.11: one stable UUID per submission action; retries return the existing request.
    IF coalesce(p_payload->>'submission_key', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Start the Snipe again.' USING ERRCODE = 'SN400';
    END IF;
    v_key := (p_payload->>'submission_key')::uuid;
    IF jsonb_typeof(p_payload->'targets') IS DISTINCT FROM 'array' OR jsonb_array_length(p_payload->'targets') = 0
       OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_payload->'targets') e
                   WHERE jsonb_typeof(e) <> 'string' OR (e #>> '{}') !~ '^[1-9][0-9]{0,17}$') THEN
      RAISE EXCEPTION 'Choose at least one friend to tag.' USING ERRCODE = 'SN400';
    END IF;
    SELECT array_agg(DISTINCT (e #>> '{}')::bigint ORDER BY (e #>> '{}')::bigint), count(*)
      INTO v_targets, v_count FROM jsonb_array_elements(p_payload->'targets') e;
    IF cardinality(v_targets) <> v_count THEN RAISE EXCEPTION 'Tag each friend only once.' USING ERRCODE = 'SN400'; END IF;
    -- SHA-256 of the validated photo, computed by the server. It is the 4th segment of the private storage
    -- path (snipe/<auth>/<key>/<digest>/<attempt>.<ext>), so the committed photo's digest needs no new column.
    v_digest := p_payload->>'content_digest';
    IF v_digest IS NULL OR v_digest !~ '^[0-9a-f]{64}$' THEN
      RAISE EXCEPTION 'The photo upload was not recognized.' USING ERRCODE = 'SN400';
    END IF;
    -- SRS-513.8: serialize this photographer's submissions (validate_snipe takes the same lock), so
    -- concurrent attempts see each other's committed pair reservations and submission keys.
    IF p_action = 'create' THEN PERFORM 1 FROM socialu.students WHERE student_id = me FOR UPDATE; END IF;

    SELECT * INTO r FROM socialu.snipe_requests WHERE submitter_id = me AND submission_key = v_key;
    IF FOUND THEN
      -- The same key is only the same action with the same conversation, tags and photo.
      IF r.conversation_id <> p_conversation_id OR v_targets IS DISTINCT FROM
         (SELECT array_agg(t.student_id ORDER BY t.student_id) FROM socialu.snipe_tags t WHERE t.snipe_id = r.snipe_id)
         OR v_digest IS DISTINCT FROM (SELECT split_part(m.storage_key, '/', 4) FROM socialu.media_assets m WHERE m.asset_id = r.photo_id) THEN
        RAISE EXCEPTION 'This submission was already used for a different Snipe. Start a new one.' USING ERRCODE = 'SN409';
      END IF;
      -- same_upload tells the server whether the object it just sent is the committed photo (never delete it).
      RETURN jsonb_build_object('created', false, 'snipe', socialu.snipe_view(r.snipe_id, me),
        'same_upload', EXISTS (SELECT 1 FROM socialu.media_assets m WHERE m.asset_id = r.photo_id AND m.storage_key = p_payload->>'storage_key'));
    END IF;

    -- SRS-510.6 to 510.8: the whole submission is rejected; no tag is silently dropped.
    IF me = ANY(v_targets) THEN RAISE EXCEPTION 'You cannot tag yourself in a Snipe.' USING ERRCODE = 'SN400'; END IF;
    IF EXISTS (SELECT 1 FROM unnest(v_targets) t(id)
               WHERE NOT socialu.are_friends(me, t.id) OR NOT socialu.is_current_participant(p_conversation_id, t.id)) THEN
      RAISE EXCEPTION 'Only current friends in this conversation can be tagged. Refresh and choose again.' USING ERRCODE = 'SN422';
    END IF;
    -- SRS-513.1 to 513.7: ordered photographer-friend pairs, across every conversation. Exactly 24
    -- elapsed hours passes (the trigger's own boundary). Failed attempts never reach the insert below.
    SELECT jsonb_agg(jsonb_build_object('friend', socialu.snipe_person(x.id), 'next_eligible_at', x.available_at) ORDER BY x.id)
      INTO v_cooldowns FROM (
        SELECT t.id, max(r2.submitted_at) + INTERVAL '24 hours' AS available_at FROM unnest(v_targets) t(id)
          JOIN socialu.snipe_tags st ON st.student_id = t.id JOIN socialu.snipe_requests r2 ON r2.snipe_id = st.snipe_id
         WHERE r2.submitter_id = me AND r2.submitted_at > CURRENT_TIMESTAMP - INTERVAL '24 hours' GROUP BY t.id) x;
    IF v_cooldowns IS NOT NULL THEN
      RAISE EXCEPTION 'A selected friend was Sniped by you in the last 24 hours.' USING ERRCODE = 'SN429', DETAIL = v_cooldowns::text;
    END IF;
    IF p_action = 'prepare' THEN RETURN jsonb_build_object('created', false, 'snipe', NULL); END IF;

    -- The server generated and uploaded this object for this account and submission key.
    v_storage_key := p_payload->>'storage_key'; v_mime := p_payload->>'mime_type';
    IF v_storage_key IS NULL OR v_storage_key !~ ('^snipe/' || p_auth_id::text || '/' || v_key::text || '/' || v_digest || '/[0-9a-f-]{36}\.(jpg|png)$')
       -- Parenthesized: PL/pgSQL ends an IF condition at the first unparenthesized THEN.
       OR v_mime IS DISTINCT FROM (CASE WHEN v_storage_key LIKE '%.jpg' THEN 'image/jpeg' ELSE 'image/png' END)
       OR coalesce(p_payload->>'byte_count', '') !~ '^[1-9][0-9]{0,8}$' THEN
      RAISE EXCEPTION 'The photo upload was not recognized.' USING ERRCODE = 'SN400';
    END IF;
    v_bytes := (p_payload->>'byte_count')::bigint;
    -- validate_media rejects anything outside the approved snipe policy rows seeded above.
    INSERT INTO socialu.media_assets(owner_id, storage_key, upload_context, mime_type, byte_count)
      VALUES (me, v_storage_key, 'snipe', v_mime, v_bytes) RETURNING asset_id INTO v_asset;
    -- SRS-510.9/510.10/512.4: immutable identity, Pending, deadline exactly 24 hours after acceptance.
    INSERT INTO socialu.snipe_requests(submitter_id, conversation_id, photo_id, submission_key, expires_at)
      VALUES (me, p_conversation_id, v_asset, v_key, CURRENT_TIMESTAMP + INTERVAL '24 hours') RETURNING * INTO r;
    INSERT INTO socialu.snipe_tags(snipe_id, student_id) SELECT r.snipe_id, t.id FROM unnest(v_targets) t(id);
    UPDATE socialu.snipe_requests SET review_locked = TRUE WHERE snipe_id = r.snipe_id;
    SET CONSTRAINTS ALL IMMEDIATE;
    RETURN jsonb_build_object('created', true, 'snipe', socialu.snipe_view(r.snipe_id, me));
  END IF;

  IF p_action NOT IN ('respond', 'withdraw', 'remove', 'photo') THEN
    RAISE EXCEPTION 'Unsupported Snipe action.' USING ERRCODE = 'SN400';
  END IF;
  -- Lock the photographer, then the request: the same order as settle and the existing triggers.
  -- This also serializes concurrent final answers, so only one of them performs the publication (and award).
  SELECT submitter_id INTO v_submitter FROM socialu.snipe_requests WHERE snipe_id = p_snipe_id AND conversation_id = p_conversation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Snipe not available.' USING ERRCODE = 'SN404'; END IF;
  PERFORM 1 FROM socialu.students WHERE student_id = v_submitter FOR UPDATE;
  PERFORM 1 FROM socialu.snipe_requests WHERE snipe_id = p_snipe_id FOR UPDATE;
  -- SRS-512.6: a response at or after the deadline is rejected even if no refresh ran yet.
  PERFORM socialu.snipe_settle(p_conversation_id, p_snipe_id);
  SELECT * INTO r FROM socialu.snipe_requests WHERE snipe_id = p_snipe_id;
  v_role := socialu.snipe_viewer_role(r.snipe_id, me);
  IF v_role IS NULL THEN RAISE EXCEPTION 'Snipe not available.' USING ERRCODE = 'SN404'; END IF;
  IF v_role = 'tagged' THEN SELECT * INTO mine FROM socialu.snipe_tags WHERE snipe_id = r.snipe_id AND student_id = me; END IF;

  IF p_action = 'photo' THEN
    -- SRS-511.1, 514.6: rechecked on every image request; nothing is served after a terminal outcome.
    IF NOT (r.status = 'approved' OR (r.status = 'pending' AND v_role IN ('photographer', 'tagged'))) THEN
      RAISE EXCEPTION 'Snipe not available.' USING ERRCODE = 'SN404';
    END IF;
    RETURN (SELECT jsonb_build_object('storage_key', m.storage_key, 'mime_type', m.mime_type, 'byte_count', m.byte_count)
      FROM socialu.media_assets m WHERE m.asset_id = r.photo_id);
  END IF;

  IF p_action = 'respond' THEN
    -- SRS-511.5: only the tagged account records its own answers.
    IF v_role <> 'tagged' THEN RAISE EXCEPTION 'Only tagged friends can answer this Snipe.' USING ERRCODE = 'SN403'; END IF;
    -- SRS-511.13: no answers after a request closes.
    IF r.status <> 'pending' THEN
      RETURN jsonb_build_object('result', CASE WHEN r.status = 'expired' THEN 'expired' ELSE 'closed' END, 'snipe', socialu.snipe_view(r.snipe_id, me));
    END IF;
    v_identity := p_payload->'identity'; v_sharing := p_payload->'sharing';
    IF (v_identity IS NULL AND v_sharing IS NULL)
       OR (v_identity IS NOT NULL AND jsonb_typeof(v_identity) <> 'boolean')
       OR (v_sharing IS NOT NULL AND jsonb_typeof(v_sharing) <> 'boolean') THEN
      RAISE EXCEPTION 'Answer Yes or No.' USING ERRCODE = 'SN400';
    END IF;
    IF (v_identity IS NOT NULL AND mine.identity_yes IS NOT NULL AND mine.identity_yes <> v_identity::boolean)
       OR (v_sharing IS NOT NULL AND mine.sharing_yes IS NOT NULL AND mine.sharing_yes <> v_sharing::boolean) THEN
      RAISE EXCEPTION 'You already answered this question.' USING ERRCODE = 'SN409';
    END IF;
    -- SRS-511.4: an unanswered question stays NULL; nothing is assumed from the other answer.
    -- The existing consent_outcome trigger derives Rejected / Approved / Closed (SRS-511.6 to 511.10);
    -- an Approved outcome also writes the photographer's reward (snipe_publication_reward).
    UPDATE socialu.snipe_tags SET identity_yes = coalesce(identity_yes, v_identity::boolean),
        sharing_yes = coalesce(sharing_yes, v_sharing::boolean)
     WHERE snipe_id = r.snipe_id AND student_id = me;
    SET CONSTRAINTS ALL IMMEDIATE;
    RETURN jsonb_build_object('result', 'saved', 'snipe', socialu.snipe_view(r.snipe_id, me));
  END IF;

  IF p_action = 'remove' AND v_role = 'photographer' THEN
    -- SRS-514.5/514.15: Removed once; repeating returns the existing state. SRS-524.4: points are kept.
    IF r.status = 'removed' THEN RETURN jsonb_build_object('result', 'saved', 'snipe', socialu.snipe_view(r.snipe_id, me)); END IF;
    IF r.status <> 'approved' THEN RETURN jsonb_build_object('result', 'closed', 'snipe', socialu.snipe_view(r.snipe_id, me)); END IF;
    UPDATE socialu.snipe_requests SET status = 'removed', terminal_reason = 'Removed by the photographer' WHERE snipe_id = r.snipe_id;
    SET CONSTRAINTS ALL IMMEDIATE;
    RETURN jsonb_build_object('result', 'saved', 'snipe', socialu.snipe_view(r.snipe_id, me));
  END IF;

  -- withdraw, or remove by an originally tagged friend (SRS-511.11, 511.12, 514.1).
  IF v_role <> 'tagged' THEN
    RAISE EXCEPTION 'Only the photographer or a tagged friend can remove this Snipe.' USING ERRCODE = 'SN403';
  END IF;
  IF mine.sharing_withdrawn THEN RETURN jsonb_build_object('result', 'saved', 'snipe', socialu.snipe_view(r.snipe_id, me)); END IF;
  IF r.status NOT IN ('pending', 'approved') THEN
    RETURN jsonb_build_object('result', 'closed', 'snipe', socialu.snipe_view(r.snipe_id, me));
  END IF;
  IF mine.sharing_yes IS NOT TRUE THEN
    RAISE EXCEPTION 'Only a sharing approval can be withdrawn.' USING ERRCODE = 'SN409';
  END IF;
  -- The existing consent_outcome trigger cancels a pending request or removes a published one.
  UPDATE socialu.snipe_tags SET sharing_withdrawn = TRUE WHERE snipe_id = r.snipe_id AND student_id = me;
  SET CONSTRAINTS ALL IMMEDIATE;
  RETURN jsonb_build_object('result', 'saved', 'snipe', socialu.snipe_view(r.snipe_id, me));
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_snipe(UUID, TEXT, BIGINT, BIGINT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_snipe(UUID, TEXT, BIGINT, BIGINT, JSONB) TO service_role;


CREATE OR REPLACE FUNCTION public.socialu_snipe_photo(p_auth_id UUID, p_action TEXT, p_conversation_id BIGINT, p_payload JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me BIGINT; s socialu.snipe_photo_stages%ROWTYPE; v JSONB; v_hash TEXT; v_key UUID; v_targets BIGINT[];
  v_digest TEXT; v_mime TEXT; v_bytes BIGINT; v_max BIGINT; v_staging TEXT; v_claim UUID;
  v_state TEXT; v_message TEXT; v_detail TEXT;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- Reject every staging action for a DM, including tickets issued by an older app.
  IF NOT EXISTS (SELECT 1 FROM socialu.conversations WHERE conversation_id = p_conversation_id AND kind = 'group') THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
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

NOTIFY pgrst, 'reload schema';
COMMIT;
