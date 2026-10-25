-- SocialU | Basic Snipe vertical slice (UR-510 to UR-514, DP). See documentation/snipe-basic.md.
-- Additive only: reuses socialu.snipe_requests, snipe_tags, media_assets and their existing
-- consent/cooldown/departure/friendship triggers. No new tables, no reward rates, no auth model.
-- Raw socialu tables stay private; the Next.js server calls one service_role bridge with the
-- verified Supabase Auth user id. The browser never chooses the acting student.
--
-- Error codes returned to the API (mapped in lib/snipe.ts):
--   42501 verified, active account required (public.socialu_require_student)
--   SC404 conversation not available (missing and forbidden look the same, as in Chat)
--   SN404 Snipe not available (missing, hidden from this member, or photo no longer served)
--   SN400 invalid request              SN403 visible, but this member may not do that
--   SN409 submission key reused        SN422 a selected friend cannot be tagged here
--   SN429 pair cooldown (DETAIL is JSON naming each affected friend and next eligible time)
BEGIN;

-- Snipe media policy approved by DP on 2026-10-25 (Appendix B-06): JPEG and PNG only,
-- at most 10,000,000 bytes. The 4096 x 4096 pixel limit is enforced by the server decoder,
-- because media_assets does not store dimensions.
INSERT INTO socialu.upload_policies(upload_context, mime_type, max_bytes) VALUES
  ('snipe', 'image/jpeg', 10000000),
  ('snipe', 'image/png', 10000000)
ON CONFLICT (upload_context, mime_type) DO UPDATE SET max_bytes = EXCLUDED.max_bytes;

-- Deferred consent check fix. snipe_request_consent / snipe_tag_consent are DEFERRABLE INITIALLY
-- DEFERRED, so they can fire at commit as the session role. The app calls as service_role, which has
-- no USAGE on schema socialu, so the check cannot see its own tables (42P01). This also happens when an
-- existing friendship or group-membership change cancels a pending Snipe and commits outside this file's
-- functions. Same narrow fix as 20261019120100 for check_group_structure: run the unchanged check as its
-- owner with its existing fixed search_path. No browser role gains access; the function is not callable.
ALTER FUNCTION socialu.check_snipe_consent() SECURITY DEFINER SET search_path = socialu, pg_catalog;
REVOKE ALL ON FUNCTION socialu.check_snipe_consent() FROM PUBLIC, anon, authenticated;

-- Display identity of one student (no email, no private data).
CREATE FUNCTION socialu.snipe_person(p_student BIGINT) RETURNS JSONB
LANGUAGE sql SET search_path = '' AS $$
  SELECT jsonb_build_object('id', s.student_id::text, 'name', coalesce(p.display_name, s.full_name), 'username', s.username)
    FROM socialu.students s LEFT JOIN socialu.student_profiles p ON p.student_id = s.student_id
   WHERE s.student_id = p_student;
$$;

-- SRS-512.5 to 512.8: close pending requests whose deadline passed or whose required memberships or
-- friendships no longer hold, before any read or action uses them. Locks the photographer before the
-- request (the order validate_snipe uses), so concurrent settles and responses cannot deadlock.
CREATE FUNCTION socialu.snipe_settle(p_conversation_id BIGINT, p_snipe_id BIGINT DEFAULT NULL) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v RECORD;
BEGIN
  -- Only requests that need closing are locked; the updates below recheck each condition under the lock.
  FOR v IN SELECT r.snipe_id, r.submitter_id FROM socialu.snipe_requests r
    WHERE r.conversation_id = p_conversation_id AND (p_snipe_id IS NULL OR r.snipe_id = p_snipe_id) AND r.status = 'pending'
      AND (CURRENT_TIMESTAMP >= r.expires_at OR NOT socialu.is_current_participant(r.conversation_id, r.submitter_id)
        OR EXISTS (SELECT 1 FROM socialu.snipe_tags t WHERE t.snipe_id = r.snipe_id
          AND (NOT socialu.is_current_participant(r.conversation_id, t.student_id) OR NOT socialu.are_friends(r.submitter_id, t.student_id))))
    ORDER BY r.submitter_id, r.snipe_id
  LOOP
    PERFORM 1 FROM socialu.students WHERE student_id = v.submitter_id FOR UPDATE;
    UPDATE socialu.snipe_requests r SET status = 'expired', terminal_reason = 'Not every tagged friend answered within 24 hours'
     WHERE r.snipe_id = v.snipe_id AND r.status = 'pending' AND CURRENT_TIMESTAMP >= r.expires_at;
    UPDATE socialu.snipe_requests r SET status = 'canceled', terminal_reason = 'Required participant left the conversation'
     WHERE r.snipe_id = v.snipe_id AND r.status = 'pending'
       AND (NOT socialu.is_current_participant(r.conversation_id, r.submitter_id)
         OR EXISTS (SELECT 1 FROM socialu.snipe_tags t WHERE t.snipe_id = r.snipe_id
                     AND NOT socialu.is_current_participant(r.conversation_id, t.student_id)));
    -- are_friends also fails for blocked or deactivated accounts.
    UPDATE socialu.snipe_requests r SET status = 'canceled', terminal_reason = 'Required friendship ended'
     WHERE r.snipe_id = v.snipe_id AND r.status = 'pending'
       AND EXISTS (SELECT 1 FROM socialu.snipe_tags t WHERE t.snipe_id = r.snipe_id
                    AND NOT socialu.are_friends(r.submitter_id, t.student_id));
  END LOOP;
END;
$$;

-- SRS-511.1, 512.1, 512.2: who may see a request at all. Only current participants qualify.
-- Pending and unpublished outcomes: the photographer and originally tagged friends only.
-- Approved/Removed: also other members (group members from before publication, like chat history).
CREATE FUNCTION socialu.snipe_viewer_role(p_snipe_id BIGINT, p_viewer BIGINT) RETURNS TEXT
LANGUAGE sql SET search_path = '' AS $$
  SELECT CASE
    WHEN NOT socialu.is_current_participant(r.conversation_id, p_viewer) THEN NULL
    WHEN r.submitter_id = p_viewer THEN 'photographer'
    WHEN EXISTS (SELECT 1 FROM socialu.snipe_tags t WHERE t.snipe_id = r.snipe_id AND t.student_id = p_viewer) THEN 'tagged'
    WHEN r.status IN ('approved', 'removed') AND EXISTS (SELECT 1 FROM socialu.group_memberships gm
      WHERE gm.conversation_id = r.conversation_id AND gm.student_id = p_viewer AND gm.left_at IS NULL
        AND gm.joined_at <= r.published_at) THEN 'member'
  END
  FROM socialu.snipe_requests r WHERE r.snipe_id = p_snipe_id;
$$;

-- The one response shape. Reviewers see every tagged friend's separate answers (SRS-512.3);
-- other members see only the Approved photo's verified targets (SRS-511.9) or the Removed placeholder.
-- Storage keys are never part of a view.
CREATE FUNCTION socialu.snipe_view(p_snipe_id BIGINT, p_viewer BIGINT) RETURNS JSONB
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE r socialu.snipe_requests%ROWTYPE; v_role TEXT; v_reviewer BOOLEAN; mine socialu.snipe_tags%ROWTYPE;
BEGIN
  v_role := socialu.snipe_viewer_role(p_snipe_id, p_viewer);
  IF v_role IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO r FROM socialu.snipe_requests WHERE snipe_id = p_snipe_id;
  v_reviewer := v_role IN ('photographer', 'tagged');
  IF v_role = 'tagged' THEN
    SELECT * INTO mine FROM socialu.snipe_tags WHERE snipe_id = p_snipe_id AND student_id = p_viewer;
  END IF;
  RETURN jsonb_build_object(
    'id', r.snipe_id::text, 'status', r.status, 'viewer_role', v_role,
    'submitted_at', r.submitted_at, 'expires_at', r.expires_at, 'published_at', r.published_at,
    'terminal_reason', CASE WHEN v_reviewer THEN r.terminal_reason END,
    'photographer', socialu.snipe_person(r.submitter_id),
    'photo_available', r.status = 'approved' OR (r.status = 'pending' AND v_reviewer),
    'verified_targets', CASE WHEN r.status = 'approved' THEN (SELECT coalesce(jsonb_agg(socialu.snipe_person(t.student_id) ORDER BY t.student_id), '[]'::jsonb)
      FROM socialu.snipe_tags t WHERE t.snipe_id = r.snipe_id AND t.identity_yes IS TRUE) ELSE '[]'::jsonb END,
    'tags', CASE WHEN v_reviewer THEN (SELECT jsonb_agg(socialu.snipe_person(t.student_id) || jsonb_build_object(
        'identity', t.identity_yes, 'sharing', t.sharing_yes, 'withdrawn', t.sharing_withdrawn) ORDER BY t.student_id)
      FROM socialu.snipe_tags t WHERE t.snipe_id = r.snipe_id) END,
    'my_answers', CASE WHEN v_role = 'tagged' THEN jsonb_build_object(
      'identity', mine.identity_yes, 'sharing', mine.sharing_yes, 'withdrawn', mine.sharing_withdrawn) END,
    'can_answer', coalesce(v_role = 'tagged' AND r.status = 'pending' AND (mine.identity_yes IS NULL OR mine.sharing_yes IS NULL), false),
    'can_withdraw', coalesce(v_role = 'tagged' AND r.status IN ('pending', 'approved') AND mine.sharing_yes IS TRUE AND NOT mine.sharing_withdrawn, false),
    'can_remove', v_role = 'photographer' AND r.status = 'approved');
END;
$$;

-- SRS-510.4, 513.7: current friends of the photographer who are current participants, with the next
-- time each ordered pair passes its 24-elapsed-hour cooldown (NULL when it already does).
CREATE FUNCTION socialu.snipe_targets(p_conversation_id BIGINT, p_me BIGINT) RETURNS JSONB
LANGUAGE sql SET search_path = '' AS $$
  SELECT coalesce(jsonb_agg(socialu.snipe_person(x.student_id) || jsonb_build_object('next_eligible_at',
      CASE WHEN x.available_at > CURRENT_TIMESTAMP THEN x.available_at END) ORDER BY x.student_id), '[]'::jsonb)
  FROM (
    SELECT p.student_id, (SELECT max(r.submitted_at) + INTERVAL '24 hours' FROM socialu.snipe_requests r
        JOIN socialu.snipe_tags t ON t.snipe_id = r.snipe_id WHERE r.submitter_id = p_me AND t.student_id = p.student_id) AS available_at
    FROM (SELECT c.private_student_low AS student_id FROM socialu.conversations c WHERE c.conversation_id = p_conversation_id AND c.kind = 'private'
          UNION SELECT c.private_student_high FROM socialu.conversations c WHERE c.conversation_id = p_conversation_id AND c.kind = 'private'
          UNION SELECT gm.student_id FROM socialu.group_memberships gm WHERE gm.conversation_id = p_conversation_id AND gm.left_at IS NULL) p
    WHERE p.student_id <> p_me AND socialu.are_friends(p_me, p.student_id) AND socialu.is_current_participant(p_conversation_id, p.student_id)
  ) x;
$$;

REVOKE ALL ON FUNCTION socialu.snipe_person(BIGINT), socialu.snipe_settle(BIGINT, BIGINT), socialu.snipe_viewer_role(BIGINT, BIGINT),
  socialu.snipe_view(BIGINT, BIGINT), socialu.snipe_targets(BIGINT, BIGINT) FROM PUBLIC, anon, authenticated;

-- Server-only bridge. Actions:
--   list     visible requests, eligible targets             prepare  validate a submission before upload
--   create   one Pending request after a validated upload   respond  save one or both consent answers
--   withdraw tagged sharing withdrawal                      remove   photographer removal (tagged: withdrawal)
--   photo    private storage reference for an allowed photo read (never returned to the browser)
CREATE FUNCTION public.socialu_snipe(p_auth_id UUID, p_action TEXT, p_conversation_id BIGINT,
  p_snipe_id BIGINT DEFAULT NULL, p_payload JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me BIGINT; c socialu.conversations%ROWTYPE; r socialu.snipe_requests%ROWTYPE; mine socialu.snipe_tags%ROWTYPE;
  v_role TEXT; v_key UUID; v_targets BIGINT[]; v_count INTEGER; v_cooldowns JSONB; v_asset BIGINT;
  v_storage_key TEXT; v_mime TEXT; v_bytes BIGINT; v_identity JSONB; v_sharing JSONB; v_submitter BIGINT; v_digest TEXT;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_conversation_id IS NULL OR NOT socialu.is_current_participant(p_conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id;
  p_payload := coalesce(p_payload, '{}'::jsonb);

  IF p_action = 'list' THEN
    PERFORM socialu.snipe_settle(p_conversation_id);
    RETURN jsonb_build_object('student_id', me::text, 'kind', c.kind, 'rewards_connected', false,
      'targets', socialu.snipe_targets(p_conversation_id, me),
      'snipes', coalesce((SELECT jsonb_agg(x.view ORDER BY x.submitted_at DESC, x.snipe_id DESC) FROM (
          SELECT r2.snipe_id, r2.submitted_at, socialu.snipe_view(r2.snipe_id, me) AS view FROM socialu.snipe_requests r2
           WHERE r2.conversation_id = p_conversation_id AND socialu.snipe_viewer_role(r2.snipe_id, me) IS NOT NULL
           ORDER BY r2.submitted_at DESC, r2.snipe_id DESC LIMIT 50) x), '[]'::jsonb));
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
    -- The existing consent_outcome trigger derives Rejected / Approved / Closed (SRS-511.6 to 511.10).
    UPDATE socialu.snipe_tags SET identity_yes = coalesce(identity_yes, v_identity::boolean),
        sharing_yes = coalesce(sharing_yes, v_sharing::boolean)
     WHERE snipe_id = r.snipe_id AND student_id = me;
    SET CONSTRAINTS ALL IMMEDIATE;
    RETURN jsonb_build_object('result', 'saved', 'snipe', socialu.snipe_view(r.snipe_id, me));
  END IF;

  IF p_action = 'remove' AND v_role = 'photographer' THEN
    -- SRS-514.5/514.15: Removed once; repeating returns the existing state.
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

-- Snipe photos live in their own private bucket, never the general media bucket. Only the server
-- (service_role, which bypasses RLS) uploads, downloads and removes them; no public or signed URL exists.
-- The RESTRICTIVE policy is ANDed with every permissive policy, so even an existing broad policy such as
-- "authenticated may read storage.objects" cannot expose or create objects in this bucket. Rows in
-- every other bucket pass it unchanged. Skipped where Supabase Storage is not installed.
DO $storage$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets(id, name, public) VALUES ('socialu-snipe-photos', 'socialu-snipe-photos', false)
    ON CONFLICT (id) DO UPDATE SET public = false;
  END IF;
  IF to_regclass('storage.objects') IS NOT NULL THEN
    DROP POLICY IF EXISTS socialu_snipe_photos_server_only ON storage.objects;
    CREATE POLICY socialu_snipe_photos_server_only ON storage.objects AS RESTRICTIVE FOR ALL TO anon, authenticated
      USING (bucket_id IS DISTINCT FROM 'socialu-snipe-photos')
      WITH CHECK (bucket_id IS DISTINCT FROM 'socialu-snipe-photos');
  END IF;
END
$storage$;

NOTIFY pgrst, 'reload schema';
COMMIT;
