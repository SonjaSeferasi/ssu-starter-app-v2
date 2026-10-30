-- SocialU | Snipe administrator review and group administrator removal (SRS-514.10, 514.12, 514.13, 514.15,
-- 514.1, 524.4; DP). See documentation/snipe-moderation.md.
-- Additive only: reuses socialu.snipe_reports (status, resolved_by and their CHECK), the validate_snipe_report
-- trigger (resolution only by a current group owner/administrator), freeze_snipe_report, the existing
-- approved -> removed lifecycle transition in validate_snipe and the shared ledger, which removal never touches.
-- No new tables. Reporting (20261029184238) and the photographer/tagged removal paths are unchanged.
--
-- New error codes returned to the API (mapped in lib/snipe.ts), alongside 42501, SC404, SN404 and SR403:
--   SM400 invalid moderation request (unknown action, or a decision other than "dismissed" / "removed")
--   SM403 not a current owner or administrator of this group
--   SR404 report not available (missing, or in another conversation)
BEGIN;

-- A current manager of a group conversation: a current participant (membership and school) whose current
-- membership has the owner or administrator role. Read fresh on every call; nothing is cached.
CREATE FUNCTION socialu.snipe_group_manager(p_conversation_id BIGINT, p_student BIGINT) RETURNS BOOLEAN
LANGUAGE sql SET search_path = '' AS $$
  SELECT coalesce(socialu.is_current_participant(p_conversation_id, p_student), false) AND EXISTS (
    SELECT 1 FROM socialu.conversations c JOIN socialu.group_memberships gm ON gm.conversation_id = c.conversation_id
     WHERE c.conversation_id = p_conversation_id AND c.kind = 'group' AND gm.student_id = p_student
       AND gm.left_at IS NULL AND gm.role IN ('owner', 'administrator'));
$$;

-- SRS-514.10: one report as a manager sees it. The photo flag follows the existing viewing rule: a manager who
-- joined after publication is not a viewer of that Snipe (snipe_viewer_role), so they get the report's
-- metadata and decision controls but never its photo. Pending Snipes are never reported (the bridge only
-- accepts Approved ones and nothing moves a Snipe back to Pending), so a pending photo is never exposed here.
CREATE FUNCTION socialu.snipe_report_item(p_report_id BIGINT, p_manager BIGINT) RETURNS JSONB
LANGUAGE sql SET search_path = '' AS $$
  SELECT jsonb_build_object('id', x.report_id::text, 'reason', x.reason, 'status', x.status,
    'reporter', socialu.snipe_person(x.reporter_id),
    'resolved_by', CASE WHEN x.resolved_by IS NOT NULL THEN socialu.snipe_person(x.resolved_by) END,
    'snipe', jsonb_build_object('id', r.snipe_id::text, 'status', r.status, 'published_at', r.published_at,
      'photographer', socialu.snipe_person(r.submitter_id), 'visible', v.role IS NOT NULL,
      'photo_available', r.status = 'approved' AND v.role IS NOT NULL))
  FROM socialu.snipe_reports x JOIN socialu.snipe_requests r ON r.snipe_id = x.snipe_id
  CROSS JOIN LATERAL (SELECT socialu.snipe_viewer_role(r.snipe_id, p_manager) AS role) v
  WHERE x.report_id = p_report_id;
$$;

-- SRS-514.5, 514.6, 514.13, 514.15, 524.4: the published removal behavior, by a group manager. Called with the
-- photographer and request rows already locked. Only an Approved Snipe transitions, so an already Removed one
-- keeps its single removal and nothing is written twice. The ledger is not touched: points stay awarded.
-- The decision covers every open report of this Snipe, so none is left waiting on content that is gone.
CREATE FUNCTION socialu.snipe_manager_remove(p_snipe_id BIGINT, p_manager BIGINT) RETURNS VOID
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  UPDATE socialu.snipe_requests SET status = 'removed', terminal_reason = 'Removed by a group administrator'
   WHERE snipe_id = p_snipe_id AND status = 'approved';
  -- validate_snipe_report rechecks that p_manager is a current owner or administrator of the group.
  UPDATE socialu.snipe_reports SET status = 'removed', resolved_by = p_manager
   WHERE snipe_id = p_snipe_id AND status = 'unresolved';
END;
$$;

-- Unchanged from 20261029184238_snipe_group_reporting.sql except 'can_admin_remove' (SRS-514.1): a current
-- manager of the group who can see an Approved Snipe may remove it. The photographer keeps 'can_remove' instead.
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
    'my_report', CASE WHEN v_report.report_id IS NOT NULL THEN socialu.snipe_report_receipt(v_report.report_id) END,
    'can_admin_remove', v_group AND r.status = 'approved' AND v_role <> 'photographer'
      AND socialu.snipe_group_manager(r.conversation_id, p_viewer));
END;
$$;

REVOKE ALL ON FUNCTION socialu.snipe_group_manager(BIGINT, BIGINT), socialu.snipe_report_item(BIGINT, BIGINT),
  socialu.snipe_manager_remove(BIGINT, BIGINT), socialu.snipe_view(BIGINT, BIGINT)
  FROM PUBLIC, anon, authenticated, service_role;

-- SRS-514.1, 514.10, 514.12, 514.13, 514.15: server-only moderation bridge for a group's current owner or
-- administrator. The actor always comes from the verified account (socialu_require_student); the browser never
-- supplies a resolver, role or balance. Actions:
--   queue    unresolved reports for this group (oldest first, at most 100)
--   resolve  decide one report: payload {"decision": "dismissed" | "removed"}. Result 'saved', 'existing' (the
--            report already has this decision) or 'conflict' (it already has the other decision, which is kept)
--   remove   remove a published Snipe the manager can see. Result 'saved' (now or already Removed) or 'closed'
CREATE FUNCTION public.socialu_snipe_moderation(p_auth_id UUID, p_action TEXT, p_conversation_id BIGINT,
  p_target_id BIGINT DEFAULT NULL, p_payload JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me BIGINT; c socialu.conversations%ROWTYPE; r socialu.snipe_requests%ROWTYPE; x socialu.snipe_reports%ROWTYPE;
  v_snipe BIGINT; v_submitter BIGINT; v_decision TEXT;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- Role changes (assign, revoke, transfer, leave, member removal) update group_memberships, whose
  -- validate_membership trigger locks this conversation row FOR UPDATE. Sharing that lock means a decision and
  -- a role change run one after the other, and the manager check below reads the role as committed.
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id FOR SHARE;
  IF NOT FOUND OR NOT socialu.is_current_participant(c.conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  -- SRS-514.14: direct messages have no reports and no administrators.
  IF c.kind <> 'group' THEN
    RAISE EXCEPTION 'Snipe reports and administrator removal are only available in group chats.' USING ERRCODE = 'SR403';
  END IF;
  IF NOT socialu.snipe_group_manager(c.conversation_id, me) THEN
    RAISE EXCEPTION 'Only a current owner or administrator of this group can do that.' USING ERRCODE = 'SM403';
  END IF;
  p_payload := coalesce(p_payload, '{}'::jsonb);

  IF p_action = 'queue' THEN
    -- SRS-514.10: only this group's unresolved reports.
    RETURN jsonb_build_object('reports', coalesce((SELECT jsonb_agg(socialu.snipe_report_item(q.report_id, me) ORDER BY q.report_id)
      FROM (SELECT x2.report_id FROM socialu.snipe_reports x2 JOIN socialu.snipe_requests r2 ON r2.snipe_id = x2.snipe_id
             WHERE r2.conversation_id = c.conversation_id AND x2.status = 'unresolved'
             ORDER BY x2.report_id LIMIT 100) q), '[]'::jsonb));
  END IF;

  IF p_action = 'resolve' THEN
    IF jsonb_typeof(p_payload->'decision') IS DISTINCT FROM 'string' OR (p_payload->>'decision') NOT IN ('dismissed', 'removed') THEN
      RAISE EXCEPTION 'Choose Dismiss or Remove.' USING ERRCODE = 'SM400';
    END IF;
    v_decision := p_payload->>'decision';
    SELECT x2.snipe_id, r2.submitter_id INTO v_snipe, v_submitter FROM socialu.snipe_reports x2
      JOIN socialu.snipe_requests r2 ON r2.snipe_id = x2.snipe_id
     WHERE x2.report_id = p_target_id AND r2.conversation_id = c.conversation_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Report not available.' USING ERRCODE = 'SR404'; END IF;
    -- Lock the photographer, then the request, then the report: the order the Snipe and report bridges use, so
    -- concurrent decisions, reports, withdrawals and removals of this Snipe run one after the other.
    PERFORM 1 FROM socialu.students WHERE student_id = v_submitter FOR UPDATE;
    SELECT * INTO r FROM socialu.snipe_requests WHERE snipe_id = v_snipe FOR UPDATE;
    SELECT * INTO x FROM socialu.snipe_reports WHERE report_id = p_target_id FOR UPDATE;
    -- A decided report keeps its first decision: the same decision again is a stable retry; the other is refused.
    IF x.status <> 'unresolved' THEN
      RETURN jsonb_build_object('result', CASE WHEN x.status = v_decision THEN 'existing' ELSE 'conflict' END,
        'report', socialu.snipe_report_item(x.report_id, me), 'snipe', socialu.snipe_view(r.snipe_id, me));
    END IF;
    IF v_decision = 'removed' THEN
      -- SRS-514.13: the published removal behavior (also closes the Snipe's other open reports).
      PERFORM socialu.snipe_manager_remove(r.snipe_id, me);
    ELSE
      -- SRS-514.11: a dismissal leaves the Snipe, its photo, consent answers and points as they are.
      UPDATE socialu.snipe_reports SET status = 'dismissed', resolved_by = me WHERE report_id = x.report_id;
    END IF;
    SET CONSTRAINTS ALL IMMEDIATE;
    RETURN jsonb_build_object('result', 'saved', 'report', socialu.snipe_report_item(x.report_id, me), 'snipe', socialu.snipe_view(r.snipe_id, me));
  END IF;

  IF p_action = 'remove' THEN
    SELECT submitter_id INTO v_submitter FROM socialu.snipe_requests WHERE snipe_id = p_target_id AND conversation_id = c.conversation_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Snipe not available.' USING ERRCODE = 'SN404'; END IF;
    PERFORM 1 FROM socialu.students WHERE student_id = v_submitter FOR UPDATE;
    SELECT * INTO r FROM socialu.snipe_requests WHERE snipe_id = p_target_id FOR UPDATE;
    -- Pending Snipes the manager is not tagged in, and Snipes published before they joined, stay hidden and
    -- indistinguishable from missing. A reported one can still be removed by resolving its report.
    IF socialu.snipe_viewer_role(r.snipe_id, me) IS NULL THEN RAISE EXCEPTION 'Snipe not available.' USING ERRCODE = 'SN404'; END IF;
    -- SRS-514.15: an already Removed Snipe keeps its existing removal.
    IF r.status = 'removed' THEN RETURN jsonb_build_object('result', 'saved', 'snipe', socialu.snipe_view(r.snipe_id, me)); END IF;
    IF r.status <> 'approved' THEN RETURN jsonb_build_object('result', 'closed', 'snipe', socialu.snipe_view(r.snipe_id, me)); END IF;
    PERFORM socialu.snipe_manager_remove(r.snipe_id, me);
    SET CONSTRAINTS ALL IMMEDIATE;
    RETURN jsonb_build_object('result', 'saved', 'snipe', socialu.snipe_view(r.snipe_id, me));
  END IF;

  RAISE EXCEPTION 'Unsupported moderation action.' USING ERRCODE = 'SM400';
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_snipe_moderation(UUID, TEXT, BIGINT, BIGINT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_snipe_moderation(UUID, TEXT, BIGINT, BIGINT, JSONB) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
