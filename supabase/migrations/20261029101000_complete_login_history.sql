-- SRS-107.2: keyset pagination keeps every recorded entry reachable without offset caps.
CREATE OR REPLACE FUNCTION public.socialu_login_history(
  p_auth_id UUID,p_before_at TIMESTAMPTZ,p_before_id BIGINT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result JSONB; next_page JSONB;
BEGIN
  PERFORM public.socialu_require_student(p_auth_id);
  IF (p_before_at IS NULL) <> (p_before_id IS NULL) OR p_before_id <= 0 THEN
    RAISE EXCEPTION 'Invalid history cursor' USING ERRCODE='22023';
  END IF;
  WITH page AS (
    SELECT history_id,signed_in_at FROM socialu.login_history
    WHERE auth_user_id=p_auth_id AND (p_before_id IS NULL OR (signed_in_at,history_id)<(p_before_at,p_before_id))
    ORDER BY signed_in_at DESC,history_id DESC LIMIT 26
  ), shown AS (SELECT * FROM page ORDER BY signed_in_at DESC,history_id DESC LIMIT 25)
  SELECT coalesce((SELECT jsonb_agg(jsonb_build_object('id',history_id::TEXT,'signed_in_at',signed_in_at)
     ORDER BY signed_in_at DESC,history_id DESC) FROM shown),'[]'::jsonb),
    CASE WHEN (SELECT count(*) FROM page)>25 THEN
      (SELECT jsonb_build_object('at',signed_in_at,'id',history_id::TEXT) FROM shown ORDER BY signed_in_at,history_id LIMIT 1)
    ELSE NULL END INTO result,next_page;
  RETURN jsonb_build_object('entries',result,'next',next_page);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_login_history(UUID,TIMESTAMPTZ,BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_login_history(UUID,TIMESTAMPTZ,BIGINT) TO service_role;
-- Existing callers get the same bounded first page.
CREATE OR REPLACE FUNCTION public.socialu_login_history(p_auth_id UUID) RETURNS JSONB
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.socialu_login_history(p_auth_id,NULL,NULL);
$$;
NOTIFY pgrst, 'reload schema';
