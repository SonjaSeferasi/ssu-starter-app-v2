-- SRS-107.6: activity comes from provider sessions, expiry and existing application revocation rules.
CREATE OR REPLACE FUNCTION public.socialu_login_history(
  p_auth_id UUID,p_before_at TIMESTAMPTZ,p_before_id BIGINT,p_current_session UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result JSONB; next_page JSONB;
BEGIN
  PERFORM public.socialu_require_student(p_auth_id);
  IF (p_before_at IS NULL) <> (p_before_id IS NULL) OR p_before_id <= 0 THEN
    RAISE EXCEPTION 'Invalid history cursor' USING ERRCODE='22023';
  END IF;
  WITH page AS (
    SELECT history_id,signed_in_at,session_id FROM socialu.login_history
    WHERE auth_user_id=p_auth_id AND (p_before_id IS NULL OR (signed_in_at,history_id)<(p_before_at,p_before_id))
    ORDER BY signed_in_at DESC,history_id DESC LIMIT 26
  ), shown AS (SELECT * FROM page ORDER BY signed_in_at DESC,history_id DESC LIMIT 25)
  SELECT coalesce((SELECT jsonb_agg(jsonb_build_object('id',history_id::TEXT,'signed_in_at',signed_in_at,
       'active',EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id=shown.session_id AND s.user_id=p_auth_id
         AND (nullif(to_jsonb(s)->>'not_after','') IS NULL OR (to_jsonb(s)->>'not_after')::TIMESTAMPTZ>statement_timestamp())
         AND NOT EXISTS(SELECT 1 FROM socialu.session_revocations r WHERE r.auth_user_id=p_auth_id
           AND s.created_at<=r.revoked_before AND s.id IS DISTINCT FROM r.preserved_session)),
       'is_current',coalesce(session_id=p_current_session,FALSE))
     ORDER BY signed_in_at DESC,history_id DESC) FROM shown),'[]'::jsonb),
    CASE WHEN (SELECT count(*) FROM page)>25 THEN
      (SELECT jsonb_build_object('at',signed_in_at,'id',history_id::TEXT) FROM shown ORDER BY signed_in_at,history_id LIMIT 1)
    ELSE NULL END INTO result,next_page;
  RETURN jsonb_build_object('entries',result,'next',next_page);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_login_history(UUID,TIMESTAMPTZ,BIGINT,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_login_history(UUID,TIMESTAMPTZ,BIGINT,UUID) TO service_role;
-- Keep earlier API signatures compatible during rollout.
CREATE OR REPLACE FUNCTION public.socialu_login_history(p_auth_id UUID,p_before_at TIMESTAMPTZ,p_before_id BIGINT) RETURNS JSONB
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.socialu_login_history(p_auth_id,p_before_at,p_before_id,NULL);
$$;
NOTIFY pgrst, 'reload schema';
