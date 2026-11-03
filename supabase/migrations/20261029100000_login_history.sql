-- SRS-107.1: retain real provider sign-ins, including after provider session cleanup.
-- Run after the account/session-guard migrations. No passwords or tokens are stored.
CREATE TABLE IF NOT EXISTS socialu.login_history (
  history_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL UNIQUE,
  signed_in_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS login_history_owner_order
  ON socialu.login_history(auth_user_id, signed_in_at DESC, history_id DESC);
ALTER TABLE socialu.login_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON socialu.login_history FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.socialu_record_login_history() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE socialu.login_history SET ended_at = clock_timestamp() WHERE session_id = OLD.id;
    RETURN OLD;
  END IF;
  INSERT INTO socialu.login_history(auth_user_id,session_id,signed_in_at)
  VALUES(NEW.user_id,NEW.id,NEW.created_at) ON CONFLICT(session_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_record_login_history() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS socialu_login_history_record ON auth.sessions;
CREATE TRIGGER socialu_login_history_record AFTER INSERT OR DELETE ON auth.sessions
FOR EACH ROW EXECUTE FUNCTION public.socialu_record_login_history();
-- Import only records that actually exist. Deleted pre-installation sessions cannot be recovered.
INSERT INTO socialu.login_history(auth_user_id,session_id,signed_in_at)
SELECT user_id,id,created_at FROM auth.sessions ON CONFLICT(session_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.socialu_login_history(p_auth_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result JSONB;
BEGIN
  PERFORM public.socialu_require_student(p_auth_id);
  SELECT coalesce(jsonb_agg(to_jsonb(h) ORDER BY h.signed_in_at DESC,h.id DESC),'[]'::jsonb)
  INTO result FROM (
    SELECT history_id::TEXT AS id,signed_in_at FROM socialu.login_history
    WHERE auth_user_id=p_auth_id ORDER BY signed_in_at DESC,history_id DESC LIMIT 25
  ) h;
  RETURN jsonb_build_object('entries',result);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_login_history(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_login_history(UUID) TO service_role;
NOTIFY pgrst, 'reload schema';
