-- SRS-531.7: hosted cleanup, queued only while voice leases exist.
-- The deployment operator installs the sweep secret in Vault and the same secret in Vercel.
-- No provider key, audio, transcript or participant identity is stored in job text.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE TABLE IF NOT EXISTS dormspace_live.voice_sweep_health (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 last_queued_at timestamptz, last_success_at timestamptz, last_request_id bigint
);
ALTER TABLE dormspace_live.voice_sweep_health ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE dormspace_live.voice_sweep_health FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO dormspace_live.voice_sweep_health(singleton) VALUES(true) ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION dormspace_live.queue_voice_sweep() RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE secret text; request_id bigint;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM dormspace_live.voice_leases) THEN RETURN; END IF;
 SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE name='dormspace_voice_sweep_secret';
 IF secret IS NULL OR char_length(secret)<32 THEN RETURN; END IF;
 SELECT net.http_post(
  url:='https://socialu-social-u.vercel.app/api/dorm/voice/sweep',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret),
  body:='{}'::jsonb,timeout_milliseconds:=12000) INTO request_id;
 UPDATE dormspace_live.voice_sweep_health SET last_queued_at=clock_timestamp(),last_request_id=request_id WHERE singleton;
END; $$;
REVOKE ALL ON FUNCTION dormspace_live.queue_voice_sweep() FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.socialu_dorm_voice_sweep_ack(p_started_at timestamptz) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_started_at IS NULL OR p_started_at>clock_timestamp() THEN RAISE EXCEPTION 'Invalid sweep time' USING ERRCODE='22023'; END IF;
 -- Only discard leases known expired when this successful provider sweep began.
 DELETE FROM dormspace_live.voice_leases WHERE expires_at<=p_started_at;
 UPDATE dormspace_live.voice_sweep_health SET last_success_at=clock_timestamp() WHERE singleton;
END; $$;
REVOKE ALL ON FUNCTION public.socialu_dorm_voice_sweep_ack(timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_dorm_voice_sweep_ack(timestamptz) TO service_role;
SELECT cron.schedule('socialu-dormspace-voice-sweep','5 seconds','SELECT dormspace_live.queue_voice_sweep()');
NOTIFY pgrst,'reload schema';
COMMIT;
