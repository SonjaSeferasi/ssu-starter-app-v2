-- SocialU | Snipe rewards (SRS-525.1 to 525.6, 521.1, 524.4, 527.5, 527.7, 528.2, NFR-49; DP). See documentation/snipe-rewards.md.
-- Additive only: reuses socialu.reward_rules, socialu.point_transactions (validate_points_transaction,
-- snipe_reward_once, immutable_points) and the points_balances / points_history views. No new tables,
-- balances or ledgers. The award is written by a trigger on the pending -> approved transition, so it
-- commits or rolls back together with the consent answer that published the Snipe.
--
-- New error code returned to the API (mapped in lib/snipe.ts):
--   SN503 Snipe rewards unavailable (no current Snipe reward rule); the answer is not saved, retry later
BEGIN;

-- B-01 approved by DP on 29 October 2026: 25 shared points per verified friend, photographer only, no
-- photographer-wide daily cap. Other reward categories stay unconfigured. A different current Snipe rate
-- is never silently replaced: applying this migration stops so the decision can be reviewed.
DO $rule$
BEGIN
  IF EXISTS (SELECT 1 FROM socialu.reward_rules WHERE category = 'snipe' AND is_current AND points_per_unit <> 25) THEN
    RAISE EXCEPTION 'A different current Snipe reward rule exists. Review Appendix B-01 before applying this migration.';
  END IF;
END
$rule$;
INSERT INTO socialu.reward_rules(category, points_per_unit, eligibility_text)
SELECT 'snipe', 25, 'The photographer earns 25 points for each originally tagged friend who answers Yes to "Is this you?", '
    || 'once, when the Snipe is published. Every tagged friend must approve sharing. Tagged friends earn no points.'
WHERE NOT EXISTS (SELECT 1 FROM socialu.reward_rules WHERE category = 'snipe' AND is_current);

-- SRS-527.5: a Snipe rule is never edited or deleted, only retired (is_current true -> false). A new rate is
-- a new row, so every ledger entry keeps pointing at the rule it was valued with. Amounts are also frozen
-- in point_transactions itself (points_change, reward_units; immutable_points).
CREATE FUNCTION socialu.freeze_snipe_reward_rule() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' OR (NEW.category, NEW.points_per_unit, NEW.milestone_days, NEW.eligibility_text)
       IS DISTINCT FROM (OLD.category, OLD.points_per_unit, OLD.milestone_days, OLD.eligibility_text)
     OR (NEW.is_current AND NOT OLD.is_current) THEN
    RAISE EXCEPTION 'Snipe reward rules are kept for history. Retire the rule and add a new one instead.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER freeze_snipe_reward_rule BEFORE UPDATE OR DELETE ON socialu.reward_rules
  FOR EACH ROW WHEN (OLD.category = 'snipe') EXECUTE FUNCTION socialu.freeze_snipe_reward_rule();

-- SRS-525.1 to 525.5, 523.3, 523.7, NFR-49: one ledger credit, to the photographer, in the same transaction
-- as publication. Fires only on pending -> approved (validate_snipe forbids any other way into approved),
-- so nothing is backfilled for Snipes approved before this migration, and unpublished outcomes never reach it.
-- validate_points_transaction re-derives the amount (current rule x identity_yes count) and requires the
-- request to be approved by this photographer; snipe_reward_once rejects any second credit for the Snipe,
-- which would roll the whole publication back rather than double-credit. The action key is the Snipe's own
-- submission key (unique per photographer). Publication already requires every original tag's sharing Yes
-- (check_snipe_consent), including friends who answered No to identity. No photographer-wide cap applies.
-- SECURITY DEFINER: runs as the owner wherever the transition happens (the bridge or a later trigger).
CREATE FUNCTION socialu.award_snipe_publication() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_rule socialu.reward_rules%ROWTYPE; v_units INTEGER;
BEGIN
  SELECT * INTO v_rule FROM socialu.reward_rules WHERE category = 'snipe' AND is_current FOR SHARE;
  IF NOT FOUND THEN
    -- Publication and its reward are one outcome: nothing is published without the promised credit.
    RAISE EXCEPTION 'Snipe rewards are unavailable right now, so your answer was not saved. Please try again later.' USING ERRCODE = 'SN503';
  END IF;
  SELECT count(*) INTO v_units FROM socialu.snipe_tags WHERE snipe_id = NEW.snipe_id AND identity_yes IS TRUE;
  INSERT INTO socialu.point_transactions(student_id, category, points_change, action_key, reward_rule_id, reward_units, snipe_id)
    VALUES (NEW.submitter_id, 'snipe', v_rule.points_per_unit * v_units, NEW.submission_key, v_rule.rule_id, v_units, NEW.snipe_id);
  RETURN NULL;
END;
$$;
CREATE TRIGGER snipe_publication_reward AFTER UPDATE OF status ON socialu.snipe_requests
  FOR EACH ROW WHEN (OLD.status = 'pending' AND NEW.status = 'approved') EXECUTE FUNCTION socialu.award_snipe_publication();

-- SRS-525.6, 527.7: the photographer's frozen reward outcome, read from the shared ledger history only.
-- A published Snipe without a ledger entry (approved before rewards existed) is reported as not awarded;
-- nothing is credited on read.
CREATE FUNCTION socialu.snipe_reward(p_snipe_id BIGINT, p_photographer BIGINT) RETURNS JSONB
LANGUAGE sql SET search_path = '' AS $$
  SELECT coalesce((SELECT jsonb_build_object('awarded', true, 'verified_friends', h.reward_units,
      'points_per_friend', h.points_change / h.reward_units, 'points', h.points_change,
      'recorded_at', h.recorded_at, 'balance_after', h.resulting_balance)
    FROM socialu.points_history h WHERE h.student_id = p_photographer AND h.category = 'snipe' AND h.snipe_id = p_snipe_id),
    jsonb_build_object('awarded', false));
$$;

-- SRS-521.1, 521.5, 528.2: the current Snipe rate (NULL when none is configured) and this account's
-- confirmed shared balance from the existing points_balances view.
CREATE FUNCTION socialu.snipe_rewards_summary(p_student BIGINT) RETURNS JSONB
LANGUAGE sql SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'points_per_friend', (SELECT r.points_per_unit FROM socialu.reward_rules r WHERE r.category = 'snipe' AND r.is_current),
    'balance', coalesce((SELECT b.balance FROM socialu.points_balances b WHERE b.student_id = p_student), 0));
$$;

-- Unchanged from 20261025043213_snipe_basic.sql except 'reward', which only the photographer receives,
-- and only for a published (Approved or Removed) Snipe. Tagged friends and members never see points.
CREATE OR REPLACE FUNCTION socialu.snipe_view(p_snipe_id BIGINT, p_viewer BIGINT) RETURNS JSONB
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
    'can_remove', v_role = 'photographer' AND r.status = 'approved',
    'reward', CASE WHEN v_role = 'photographer' AND r.status IN ('approved', 'removed') THEN socialu.snipe_reward(r.snipe_id, p_viewer) END);
END;
$$;

REVOKE ALL ON FUNCTION socialu.freeze_snipe_reward_rule(), socialu.award_snipe_publication(), socialu.snipe_reward(BIGINT, BIGINT),
  socialu.snipe_rewards_summary(BIGINT), socialu.snipe_view(BIGINT, BIGINT) FROM PUBLIC, anon, authenticated, service_role;

-- Unchanged from 20261025043213_snipe_basic.sql except the list action, which now returns 'rewards'
-- (current rate and this student's confirmed balance) instead of 'rewards_connected': false.
CREATE OR REPLACE FUNCTION public.socialu_snipe(p_auth_id UUID, p_action TEXT, p_conversation_id BIGINT,
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
    RETURN jsonb_build_object('student_id', me::text, 'kind', c.kind, 'rewards', socialu.snipe_rewards_summary(me),
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

NOTIFY pgrst, 'reload schema';
COMMIT;
