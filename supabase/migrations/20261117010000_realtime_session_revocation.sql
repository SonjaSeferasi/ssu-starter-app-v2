-- SRS-107.8 / #1228: cached Realtime grants must never receive future revoked-session payloads.
BEGIN;
CREATE OR REPLACE FUNCTION public.socialu_realtime_session_allowed()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE claims jsonb; who uuid; sid uuid;
BEGIN
 claims:=auth.jwt(); who:=(claims->>'sub')::uuid; sid:=(claims->>'session_id')::uuid;
 RETURN coalesce(EXISTS(SELECT 1 FROM auth.sessions s JOIN socialu.students st ON st.auth_user_id=s.user_id
  WHERE s.id=sid AND s.user_id=who AND st.is_active AND NOT st.reverification_required AND st.email_verified_at IS NOT NULL
   AND (nullif(to_jsonb(s)->>'not_after','') IS NULL OR (to_jsonb(s)->>'not_after')::timestamptz>statement_timestamp())
  AND public.socialu_session_guard('check',who,sid,statement_timestamp())),false);
EXCEPTION WHEN invalid_text_representation THEN RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_realtime_session_allowed() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.socialu_realtime_session_allowed() TO authenticated,service_role;
DROP POLICY IF EXISTS socialu_students_receive_own_chat_channel ON realtime.messages;
CREATE POLICY socialu_students_receive_own_chat_channel ON realtime.messages FOR SELECT TO authenticated
USING(extension='broadcast'
 AND (SELECT realtime.topic())='session:'||(SELECT auth.uid())::text||':'||(SELECT auth.jwt()->>'session_id')
 AND (SELECT public.socialu_realtime_session_allowed()));

-- Route all existing student-topic producers through a per-send session check.
-- No legacy user-wide copies: even a connection with cached permission receives no payload.
CREATE OR REPLACE FUNCTION socialu.send_to_active_sessions(payload jsonb,event text,topic text,private boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE who uuid; s record;
BEGIN
 IF topic NOT LIKE 'student:%' OR private IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Invalid protected broadcast topic' USING ERRCODE='22023';
 END IF;
 who:=substring(topic from 9)::uuid;
 FOR s IN SELECT a.id FROM auth.sessions a JOIN socialu.students st ON st.auth_user_id=a.user_id
  WHERE a.user_id=who AND st.is_active AND NOT st.reverification_required AND st.email_verified_at IS NOT NULL
   AND (nullif(to_jsonb(a)->>'not_after','') IS NULL OR (to_jsonb(a)->>'not_after')::timestamptz>statement_timestamp())
   AND public.socialu_session_guard('check',who,a.id,statement_timestamp())
 LOOP
  PERFORM realtime.send(payload,event,'session:'||who::text||':'||s.id::text,true);
 END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION socialu.send_to_active_sessions(jsonb,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION socialu.send_to_active_sessions(jsonb,text,text,boolean) TO service_role;
DO $patch$
DECLARE f record; source text; patched integer:=0;
BEGIN
 FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('public','socialu') AND p.prokind='f'
   AND p.proname<>'send_to_active_sessions' AND p.prosrc LIKE '%realtime.send(%'
   AND p.prosrc LIKE '%student:%'
 LOOP
  source:=pg_get_functiondef(f.oid);
  EXECUTE replace(source,'realtime.send(','socialu.send_to_active_sessions(');
  patched:=patched+1;
 END LOOP;
 IF patched=0 AND NOT EXISTS(SELECT 1 FROM pg_proc WHERE prosrc LIKE '%socialu.send_to_active_sessions(%' AND proname<>'send_to_active_sessions') THEN
  RAISE EXCEPTION 'No protected broadcast producers found';
 END IF;
END;
$patch$;
NOTIFY pgrst,'reload schema';
COMMIT;
