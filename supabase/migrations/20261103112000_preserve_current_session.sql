-- SRS-107.9: selected logout succeeds only with confirmed caller preservation.
BEGIN;
CREATE OR REPLACE FUNCTION public.socialu_end_other_session(
 p_auth_id UUID,p_current_session UUID,p_history_id BIGINT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 -- The underlying operation takes the account advisory lock, verifies ownership,
 -- rejects the current session as a target, and rechecks caller validity.
 IF NOT public.socialu_end_login_session(p_auth_id,p_current_session,p_history_id) THEN
  RAISE EXCEPTION 'Session logout was not confirmed' USING ERRCODE='22023';
 END IF;
 -- An exception rolls back the selected update as well: never claim continuity
 -- when the calling session is no longer authorized.
 IF NOT public.socialu_session_guard('check',p_auth_id,p_current_session,statement_timestamp()) THEN
  RAISE EXCEPTION 'Current session was not preserved' USING ERRCODE='42501';
 END IF;
 RETURN jsonb_build_object('ended',TRUE,'current_session_active',TRUE);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_end_other_session(UUID,UUID,BIGINT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_end_other_session(UUID,UUID,BIGINT) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
