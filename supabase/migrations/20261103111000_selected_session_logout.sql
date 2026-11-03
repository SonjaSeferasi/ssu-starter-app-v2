-- SRS-107.8: revoke only the selected owned sign-in. Installation ends no sessions.
BEGIN;
ALTER TABLE socialu.login_history ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.socialu_session_guard(
 p_action TEXT,p_auth_id UUID,p_session UUID,p_issued_at TIMESTAMPTZ
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r socialu.session_revocations%ROWTYPE;
BEGIN
 IF p_action IN ('revoke_all','revoke_others') THEN
  INSERT INTO socialu.session_revocations(auth_user_id,revoked_before,preserved_session)
  VALUES(p_auth_id,clock_timestamp(),CASE WHEN p_action='revoke_others' THEN p_session ELSE NULL END)
  ON CONFLICT(auth_user_id) DO UPDATE SET revoked_before=EXCLUDED.revoked_before,preserved_session=EXCLUDED.preserved_session;
  RETURN TRUE;
 ELSIF p_action IS DISTINCT FROM 'check' THEN
  RAISE EXCEPTION 'Invalid session action' USING ERRCODE='22023';
 END IF;
 -- Check the stable provider session ID, including after an access-token refresh.
 IF EXISTS(SELECT 1 FROM socialu.login_history WHERE auth_user_id=p_auth_id AND session_id=p_session AND revoked_at IS NOT NULL) THEN
  RETURN FALSE;
 END IF;
 SELECT * INTO r FROM socialu.session_revocations WHERE auth_user_id=p_auth_id;
 IF NOT FOUND THEN RETURN TRUE; END IF;
 RETURN coalesce(p_session=r.preserved_session,FALSE) OR EXISTS(
  SELECT 1 FROM auth.sessions WHERE id=p_session AND user_id=p_auth_id AND created_at>r.revoked_before
 );
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_session_guard(TEXT,UUID,UUID,TIMESTAMPTZ) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_session_guard(TEXT,UUID,UUID,TIMESTAMPTZ) TO service_role;

CREATE OR REPLACE FUNCTION public.socialu_end_login_session(p_auth_id UUID,p_current_session UUID,p_history_id BIGINT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target UUID;
BEGIN
 PERFORM public.socialu_require_student(p_auth_id);
 PERFORM pg_advisory_xact_lock(hashtextextended(p_auth_id::TEXT,0));
 IF p_current_session IS NULL OR NOT EXISTS(
  SELECT 1 FROM auth.sessions s WHERE s.id=p_current_session AND s.user_id=p_auth_id
  AND (nullif(to_jsonb(s)->>'not_after','') IS NULL OR (to_jsonb(s)->>'not_after')::TIMESTAMPTZ>statement_timestamp())
 ) OR NOT public.socialu_session_guard('check',p_auth_id,p_current_session,statement_timestamp()) THEN
  RAISE EXCEPTION 'Current session is invalid' USING ERRCODE='42501';
 END IF;
 SELECT session_id INTO target FROM socialu.login_history WHERE history_id=p_history_id AND auth_user_id=p_auth_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Sign-in not found' USING ERRCODE='P0002'; END IF;
 IF target=p_current_session THEN RAISE EXCEPTION 'Use normal logout for your current session' USING ERRCODE='22023'; END IF;
 UPDATE socialu.login_history SET revoked_at=coalesce(revoked_at,clock_timestamp())
 WHERE history_id=p_history_id AND auth_user_id=p_auth_id;
 RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_end_login_session(UUID,UUID,BIGINT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_end_login_session(UUID,UUID,BIGINT) TO service_role;

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
    SELECT history_id,signed_in_at,session_id,device_label,login_location,revoked_at FROM socialu.login_history
    WHERE auth_user_id=p_auth_id AND (p_before_id IS NULL OR (signed_in_at,history_id)<(p_before_at,p_before_id))
    ORDER BY signed_in_at DESC,history_id DESC LIMIT 26
  ), shown AS (SELECT * FROM page ORDER BY signed_in_at DESC,history_id DESC LIMIT 25)
  SELECT coalesce((SELECT jsonb_agg(jsonb_build_object('id',history_id::TEXT,'signed_in_at',signed_in_at,
       'device',device_label,'location',login_location,
       'active',revoked_at IS NULL AND EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id=shown.session_id AND s.user_id=p_auth_id
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
