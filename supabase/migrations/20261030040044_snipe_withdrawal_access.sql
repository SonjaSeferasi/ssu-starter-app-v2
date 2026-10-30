-- SocialU | Snipe sharing permissions for original actors (SRS-511.12, 514.1 to 514.7, 514.15, 524.4; DP).
-- See documentation/snipe-sharing-permissions.md.
-- Additive only: no table, column, trigger, view or grant on existing objects changes. public.socialu_snipe,
-- socialu.snipe_view, the report bridge and the existing consent/lifecycle triggers are untouched.
--
-- The photographer and every originally tagged friend who approved sharing (including identity No with
-- sharing Yes) keep their withdrawal/removal control over a published Snipe after leaving the group or after
-- the friendship ends. Scope comes only from the stored original roles, never from current membership,
-- friendship or anything the browser sends. This grants no photo, chat history or conversation access: the
-- list returns metadata only, and the existing photo/list/chat paths still require current participation.
--
-- Error codes returned to the API (mapped in lib/snipe-sharing.ts):
--   42501 verified, active account required (public.socialu_require_student)
--   SN404 Snipe not available (missing, unrelated, not an original actor, or never published: all identical)
--   SN400 invalid request (unsupported or NULL action, invalid cursor, or an action that does not match the role)
BEGIN;

-- The actor's original role for a published (Approved or Removed) Snipe, or NULL. Tagged friends qualify only
-- with their own stored sharing Yes. Pending and unpublished outcomes never qualify, so nothing is resurrected.
CREATE FUNCTION socialu.snipe_sharing_role(p_snipe_id BIGINT, p_actor BIGINT) RETURNS TEXT
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN r.submitter_id = p_actor THEN 'photographer'
    WHEN EXISTS (SELECT 1 FROM socialu.snipe_tags t WHERE t.snipe_id = r.snipe_id AND t.student_id = p_actor AND t.sharing_yes IS TRUE) THEN 'tagged'
  END
  FROM socialu.snipe_requests r WHERE r.snipe_id = p_snipe_id AND r.status IN ('approved', 'removed');
$$;

-- Metadata only. No photo or storage reference, conversation ID or name, other people, answers of others,
-- terminal reasons, reports or rewards. `sharing` is the tagged actor's own permission; `action` is the one
-- control still available ('remove' for the photographer, 'withdraw' for a tagged friend, NULL once Removed).
CREATE FUNCTION socialu.snipe_sharing_record(p_snipe_id BIGINT, p_actor BIGINT) RETURNS JSONB
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT jsonb_build_object('id', r.snipe_id::text, 'status', r.status, 'role', x.role,
    'submitted_at', r.submitted_at, 'published_at', r.published_at,
    'sharing', CASE WHEN x.role = 'tagged' THEN (SELECT CASE WHEN t.sharing_withdrawn THEN 'withdrawn' ELSE 'approved' END
      FROM socialu.snipe_tags t WHERE t.snipe_id = r.snipe_id AND t.student_id = p_actor) END,
    'action', CASE WHEN r.status = 'approved' THEN CASE x.role WHEN 'photographer' THEN 'remove' ELSE 'withdraw' END END)
  FROM socialu.snipe_requests r CROSS JOIN LATERAL (SELECT socialu.snipe_sharing_role(r.snipe_id, p_actor) AS role) x
  WHERE r.snipe_id = p_snipe_id AND x.role IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION socialu.snipe_sharing_role(BIGINT, BIGINT), socialu.snipe_sharing_record(BIGINT, BIGINT)
  FROM PUBLIC, anon, authenticated, service_role;

-- Server-only bridge. Actions:
--   list     the actor's published Snipes, newest first, 20 per page; p_before is the previous next_cursor
--   remove   photographer: Approved -> Removed ('Removed by the photographer'), as the existing remove does
--   withdraw tagged friend (remove is accepted as the same): marks the existing sharing_withdrawn, and the
--            existing consent_outcome trigger removes the Snipe ('Sharing permission withdrawn')
-- SRS-514.15: Removed once. A repeat, or an action after another actor already removed it, changes nothing and
-- returns the stored state. SRS-524.4: no point_transactions row is written, changed or reversed here.
CREATE FUNCTION public.socialu_snipe_sharing(p_auth_id UUID, p_action TEXT, p_snipe_id BIGINT DEFAULT NULL, p_before BIGINT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; v_submitter BIGINT; v_role TEXT; v_status TEXT; v_ids BIGINT[]; v_page CONSTANT INTEGER := 20;
BEGIN
  me := public.socialu_require_student(p_auth_id);

  IF p_action = 'list' THEN
    IF p_before IS NOT NULL AND p_before < 1 THEN RAISE EXCEPTION 'Invalid page.' USING ERRCODE = 'SN400'; END IF;
    -- One row beyond the page shows whether another page exists. Stable order: Snipe ID, newest first.
    SELECT array_agg(x.snipe_id ORDER BY x.snipe_id DESC) INTO v_ids FROM (
      SELECT r.snipe_id FROM socialu.snipe_requests r
       WHERE r.status IN ('approved', 'removed') AND (p_before IS NULL OR r.snipe_id < p_before)
         AND (r.submitter_id = me OR EXISTS (SELECT 1 FROM socialu.snipe_tags t
               WHERE t.snipe_id = r.snipe_id AND t.student_id = me AND t.sharing_yes IS TRUE))
       ORDER BY r.snipe_id DESC LIMIT v_page + 1) x;
    v_ids := coalesce(v_ids, ARRAY[]::BIGINT[]);
    RETURN jsonb_build_object(
      'records', coalesce((SELECT jsonb_agg(socialu.snipe_sharing_record(u.id, me) ORDER BY u.n)
        FROM unnest(v_ids[1:v_page]) WITH ORDINALITY u(id, n)), '[]'::jsonb),
      'next_cursor', CASE WHEN cardinality(v_ids) > v_page THEN v_ids[v_page]::text END);
  END IF;

  -- NULL must be refused explicitly: `NULL NOT IN (...)` is NULL, which IF treats as false.
  IF p_action IS NULL OR p_action NOT IN ('withdraw', 'remove') THEN RAISE EXCEPTION 'Unsupported action.' USING ERRCODE = 'SN400'; END IF;

  -- Lock the photographer, then the request: the same order as the Snipe bridge, settle, the report bridge and
  -- the existing validate_snipe / validate_snipe_tag triggers. Every check below runs again under the locks.
  SELECT submitter_id INTO v_submitter FROM socialu.snipe_requests WHERE snipe_id = p_snipe_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Snipe not available.' USING ERRCODE = 'SN404'; END IF;
  PERFORM 1 FROM socialu.students WHERE student_id = v_submitter FOR UPDATE;
  SELECT status INTO v_status FROM socialu.snipe_requests WHERE snipe_id = p_snipe_id FOR UPDATE;
  -- Unrelated students, tagged friends without a sharing Yes, and unpublished requests look exactly like missing.
  v_role := socialu.snipe_sharing_role(p_snipe_id, me);
  IF v_role IS NULL THEN RAISE EXCEPTION 'Snipe not available.' USING ERRCODE = 'SN404'; END IF;
  IF v_role = 'photographer' AND p_action <> 'remove' THEN
    RAISE EXCEPTION 'Photographers remove their Snipe instead.' USING ERRCODE = 'SN400';
  END IF;

  IF v_status = 'removed' THEN
    RETURN jsonb_build_object('changed', false, 'snipe', socialu.snipe_sharing_record(p_snipe_id, me));
  END IF;
  IF v_role = 'photographer' THEN
    UPDATE socialu.snipe_requests SET status = 'removed', terminal_reason = 'Removed by the photographer' WHERE snipe_id = p_snipe_id;
  ELSE
    UPDATE socialu.snipe_tags SET sharing_withdrawn = TRUE WHERE snipe_id = p_snipe_id AND student_id = me;
  END IF;
  SET CONSTRAINTS ALL IMMEDIATE;
  RETURN jsonb_build_object('changed', true, 'snipe', socialu.snipe_sharing_record(p_snipe_id, me));
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_snipe_sharing(UUID, TEXT, BIGINT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_snipe_sharing(UUID, TEXT, BIGINT, BIGINT) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
