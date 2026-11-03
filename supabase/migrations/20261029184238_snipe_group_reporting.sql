-- SocialU | Snipe group reporting and receipt (SRS-514.8, 514.9, 514.11, 514.14; DP). See documentation/snipe-moderation.md.
-- Additive only: reuses socialu.snipe_reports with its existing reason/status/resolution checks and the
-- validate_snipe_report trigger (group conversations only, reporter must be a current member, resolution only
-- by a current group owner/administrator). Administrator review and decisions (SRS-514.10, 514.12, 514.13)
-- are the next phase; nothing here resolves a report or changes a Snipe's status, photo, consent or points.
--
-- New error codes returned to the API (mapped in lib/snipe.ts), alongside the existing 42501, SC404, SN404:
--   SR400 invalid report reason
--   SR403 Snipes in direct messages cannot be reported
--   SR409 the Snipe is not published (pending, removed or another outcome)
BEGIN;

-- One unresolved report per reporter and Snipe. A retry or double submit returns the first report instead of
-- creating another. Once an administrator resolves it (next phase), the student may report a new issue.
CREATE UNIQUE INDEX snipe_reports_one_unresolved ON socialu.snipe_reports(snipe_id, reporter_id) WHERE status = 'unresolved';

-- A report keeps the Snipe, reporter and reason it was submitted with; review only changes status/resolved_by.
CREATE FUNCTION socialu.freeze_snipe_report() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF (NEW.snipe_id, NEW.reporter_id, NEW.reason) IS DISTINCT FROM (OLD.snipe_id, OLD.reporter_id, OLD.reason) THEN
    RAISE EXCEPTION 'A Snipe report keeps its original Snipe, reporter and reason.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER freeze_snipe_report BEFORE UPDATE ON socialu.snipe_reports FOR EACH ROW EXECUTE FUNCTION socialu.freeze_snipe_report();

-- SRS-514.9: the receipt shown to the reporter. Only the reporter's own report is ever returned.
CREATE FUNCTION socialu.snipe_report_receipt(p_report_id BIGINT) RETURNS JSONB
LANGUAGE sql SET search_path = '' AS $$
  SELECT jsonb_build_object('id', x.report_id::text, 'snipe_id', x.snipe_id::text, 'reason', x.reason, 'status', x.status)
    FROM socialu.snipe_reports x WHERE x.report_id = p_report_id;
$$;

-- Unchanged from 20261029182808_snipe_rewards.sql except 'can_report' and 'my_report'. SRS-514.14: both are
-- only ever set in group conversations. SRS-514.8: any current group member who can see an Approved Snipe may
-- report it, the photographer included (who can also remove it). SRS-514.11: a report never changes photo_available.
CREATE OR REPLACE FUNCTION socialu.snipe_view(p_snipe_id BIGINT, p_viewer BIGINT) RETURNS JSONB
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE r socialu.snipe_requests%ROWTYPE; v_role TEXT; v_reviewer BOOLEAN; mine socialu.snipe_tags%ROWTYPE;
  v_group BOOLEAN; v_report socialu.snipe_reports%ROWTYPE;
BEGIN
  v_role := socialu.snipe_viewer_role(p_snipe_id, p_viewer);
  IF v_role IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO r FROM socialu.snipe_requests WHERE snipe_id = p_snipe_id;
  v_reviewer := v_role IN ('photographer', 'tagged');
  IF v_role = 'tagged' THEN
    SELECT * INTO mine FROM socialu.snipe_tags WHERE snipe_id = p_snipe_id AND student_id = p_viewer;
  END IF;
  v_group := EXISTS (SELECT 1 FROM socialu.conversations c WHERE c.conversation_id = r.conversation_id AND c.kind = 'group');
  IF v_group THEN
    SELECT * INTO v_report FROM socialu.snipe_reports x WHERE x.snipe_id = p_snipe_id AND x.reporter_id = p_viewer
     ORDER BY (x.status = 'unresolved') DESC, x.report_id DESC LIMIT 1;
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
    'reward', CASE WHEN v_role = 'photographer' AND r.status IN ('approved', 'removed') THEN socialu.snipe_reward(r.snipe_id, p_viewer) END,
    'can_report', v_group AND r.status = 'approved' AND v_report.status IS DISTINCT FROM 'unresolved',
    'my_report', CASE WHEN v_report.report_id IS NOT NULL THEN socialu.snipe_report_receipt(v_report.report_id) END);
END;
$$;

REVOKE ALL ON FUNCTION socialu.freeze_snipe_report(), socialu.snipe_report_receipt(BIGINT), socialu.snipe_view(BIGINT, BIGINT)
  FROM PUBLIC, anon, authenticated, service_role;

-- SRS-514.8, 514.9, 514.11, 514.14: server-only report bridge. The reporter always comes from the verified
-- account (socialu_require_student); participant and school checks run fresh on every call. The browser
-- supplies only the reason; status and resolution are never accepted from it.
-- Result: 'created' (new report), 'existing' (retry with the same reason) or 'conflict' (an unresolved
-- report with a different reason already exists; the first reason is kept). Each includes the receipt.
CREATE FUNCTION public.socialu_snipe_report(p_auth_id UUID, p_conversation_id BIGINT, p_snipe_id BIGINT, p_payload JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me BIGINT; c socialu.conversations%ROWTYPE; r socialu.snipe_requests%ROWTYPE; v_role TEXT; v_submitter BIGINT;
  v_reason TEXT; v_existing socialu.snipe_reports%ROWTYPE; v_id BIGINT;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_conversation_id IS NULL OR NOT socialu.is_current_participant(p_conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id;

  -- Lock the photographer, then the request: the same order as the Snipe bridge, so a report and a concurrent
  -- removal or withdrawal run one after the other, and concurrent reports by one student cannot both insert.
  SELECT submitter_id INTO v_submitter FROM socialu.snipe_requests WHERE snipe_id = p_snipe_id AND conversation_id = p_conversation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Snipe not available.' USING ERRCODE = 'SN404'; END IF;
  PERFORM 1 FROM socialu.students WHERE student_id = v_submitter FOR UPDATE;
  SELECT * INTO r FROM socialu.snipe_requests WHERE snipe_id = p_snipe_id FOR UPDATE;
  -- Hidden Snipes (pending for untagged members, or published before this member joined) stay indistinguishable.
  v_role := socialu.snipe_viewer_role(r.snipe_id, me);
  IF v_role IS NULL THEN RAISE EXCEPTION 'Snipe not available.' USING ERRCODE = 'SN404'; END IF;
  IF c.kind <> 'group' THEN RAISE EXCEPTION 'Snipes in direct messages can’t be reported.' USING ERRCODE = 'SR403'; END IF;

  -- A JSON string of 1 to 500 characters once surrounding whitespace is trimmed.
  IF jsonb_typeof(coalesce(p_payload, '{}'::jsonb)->'reason') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'Enter a reason for your report.' USING ERRCODE = 'SR400';
  END IF;
  v_reason := regexp_replace(p_payload->>'reason', '^[[:space:]]+|[[:space:]]+$', '', 'g');
  IF char_length(v_reason) = 0 THEN RAISE EXCEPTION 'Enter a reason for your report.' USING ERRCODE = 'SR400'; END IF;
  IF char_length(v_reason) > 500 THEN RAISE EXCEPTION 'Keep your reason to 500 characters or fewer.' USING ERRCODE = 'SR400'; END IF;

  -- Stable retries: the same student's unresolved report is returned, never duplicated or rewritten.
  SELECT * INTO v_existing FROM socialu.snipe_reports WHERE snipe_id = r.snipe_id AND reporter_id = me AND status = 'unresolved';
  IF FOUND THEN
    RETURN jsonb_build_object('result', CASE WHEN v_existing.reason = v_reason THEN 'existing' ELSE 'conflict' END,
      'report', socialu.snipe_report_receipt(v_existing.report_id), 'snipe', socialu.snipe_view(r.snipe_id, me));
  END IF;

  IF r.status = 'removed' THEN
    RAISE EXCEPTION 'This Snipe was already removed, so it can’t be reported.' USING ERRCODE = 'SR409';
  ELSIF r.status <> 'approved' THEN
    RAISE EXCEPTION 'Only published Snipes can be reported.' USING ERRCODE = 'SR409';
  END IF;

  -- validate_snipe_report rechecks the group and current membership. SRS-514.11: the Snipe is not touched.
  INSERT INTO socialu.snipe_reports(snipe_id, reporter_id, reason) VALUES (r.snipe_id, me, v_reason) RETURNING report_id INTO v_id;
  RETURN jsonb_build_object('result', 'created', 'report', socialu.snipe_report_receipt(v_id), 'snipe', socialu.snipe_view(r.snipe_id, me));
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_snipe_report(UUID, BIGINT, BIGINT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_snipe_report(UUID, BIGINT, BIGINT, JSONB) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
