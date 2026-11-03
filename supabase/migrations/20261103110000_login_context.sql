-- SRS-107.5: record approximate sign-in context without storing IP addresses.
BEGIN;
ALTER TABLE socialu.login_history ADD COLUMN IF NOT EXISTS device_label TEXT;
ALTER TABLE socialu.login_history ADD COLUMN IF NOT EXISTS login_location TEXT;
ALTER TABLE socialu.login_history ADD COLUMN IF NOT EXISTS context_recorded BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.socialu_record_login_context(
 p_auth_id UUID,p_session UUID,p_device TEXT,p_location TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF length(p_device)>120 OR length(p_location)>200 THEN
  RAISE EXCEPTION 'Invalid login context' USING ERRCODE='22023';
 END IF;
 -- The server supplies identity and session only after successful authentication.
 UPDATE socialu.login_history h SET device_label=p_device,login_location=p_location,context_recorded=TRUE
 WHERE h.auth_user_id=p_auth_id AND h.session_id=p_session AND NOT h.context_recorded
 AND EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id=p_session AND s.user_id=p_auth_id);
 RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_record_login_context(UUID,UUID,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_record_login_context(UUID,UUID,TEXT,TEXT) TO service_role;

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
    SELECT history_id,signed_in_at,session_id,device_label,login_location FROM socialu.login_history
    WHERE auth_user_id=p_auth_id AND (p_before_id IS NULL OR (signed_in_at,history_id)<(p_before_at,p_before_id))
    ORDER BY signed_in_at DESC,history_id DESC LIMIT 26
  ), shown AS (SELECT * FROM page ORDER BY signed_in_at DESC,history_id DESC LIMIT 25)
  SELECT coalesce((SELECT jsonb_agg(jsonb_build_object('id',history_id::TEXT,'signed_in_at',signed_in_at,
       'device',device_label,'location',login_location,
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

NOTIFY pgrst, 'reload schema';
COMMIT;
