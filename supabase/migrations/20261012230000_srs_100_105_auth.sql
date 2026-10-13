-- Apply after 20261008000100_link_supabase_accounts.sql. No tables are reset.
-- Server-only atomic tracking for five failed logins and the 30-second send interval.
CREATE TABLE IF NOT EXISTS socialu.auth_flow_limits (
  email TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0 CHECK (failures >= 0),
  verification_required BOOLEAN NOT NULL DEFAULT FALSE,
  signup_sent_at TIMESTAMPTZ,
  recovery_sent_at TIMESTAMPTZ,
  reverification_sent_at TIMESTAMPTZ
);
ALTER TABLE socialu.auth_flow_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON socialu.auth_flow_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.socialu_auth_guard(p_action TEXT, p_email TEXT, p_purpose TEXT DEFAULT 'signup')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  r socialu.auth_flow_limits%ROWTYPE;
  sent TIMESTAMPTZ;
  wait_seconds INTEGER;
BEGIN
  p_email := lower(btrim(p_email));
  IF p_email IS NULL OR p_email NOT LIKE '%@salemstate.edu' THEN
    RAISE EXCEPTION 'Invalid university email' USING ERRCODE = '22023';
  END IF;
  INSERT INTO socialu.auth_flow_limits(email) VALUES(p_email) ON CONFLICT DO NOTHING;
  SELECT * INTO r FROM socialu.auth_flow_limits WHERE email = p_email FOR UPDATE;
  IF p_action = 'failure' THEN
    UPDATE socialu.auth_flow_limits SET failures = failures + 1,
      verification_required = verification_required OR failures + 1 >= 5 WHERE email = p_email RETURNING * INTO r;
    UPDATE socialu.students SET failed_login_count = r.failures,
      reverification_required = r.verification_required WHERE lower(university_email) = p_email;
  ELSIF p_action IN ('success', 'verified') THEN
    UPDATE socialu.auth_flow_limits SET failures = 0,
      verification_required = CASE WHEN p_action = 'verified' THEN FALSE ELSE verification_required END
      WHERE email = p_email RETURNING * INTO r;
    UPDATE socialu.students SET failed_login_count = 0,
      reverification_required = r.verification_required WHERE lower(university_email) = p_email;
  ELSIF p_action = 'send' THEN
    IF p_purpose NOT IN ('signup','recovery','reverification') THEN
      RAISE EXCEPTION 'Invalid code purpose' USING ERRCODE = '22023';
    END IF;
    sent := CASE p_purpose WHEN 'signup' THEN r.signup_sent_at WHEN 'recovery' THEN r.recovery_sent_at ELSE r.reverification_sent_at END;
    wait_seconds := greatest(0, ceil(30 - extract(epoch FROM (clock_timestamp() - sent)))::INTEGER);
    IF wait_seconds > 0 THEN RETURN jsonb_build_object('retry_after',wait_seconds); END IF;
    UPDATE socialu.auth_flow_limits SET
      signup_sent_at = CASE WHEN p_purpose = 'signup' THEN clock_timestamp() ELSE signup_sent_at END,
      recovery_sent_at = CASE WHEN p_purpose = 'recovery' THEN clock_timestamp() ELSE recovery_sent_at END,
      reverification_sent_at = CASE WHEN p_purpose = 'reverification' THEN clock_timestamp() ELSE reverification_sent_at END
      WHERE email = p_email;
  ELSIF p_action <> 'status' THEN
    RAISE EXCEPTION 'Invalid action' USING ERRCODE = '22023';
  END IF;
  RETURN jsonb_build_object('verification_required',r.verification_required,'retry_after',0);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_auth_guard(TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_auth_guard(TEXT,TEXT,TEXT) TO service_role;

CREATE TABLE IF NOT EXISTS socialu.recovery_ticket_claims (
  ticket UUID PRIMARY KEY, claimed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE socialu.recovery_ticket_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON socialu.recovery_ticket_claims FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.socialu_claim_recovery(p_ticket UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE inserted INTEGER;
BEGIN
  DELETE FROM socialu.recovery_ticket_claims WHERE claimed_at < clock_timestamp() - INTERVAL '1 day';
  INSERT INTO socialu.recovery_ticket_claims(ticket) VALUES(p_ticket) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_claim_recovery(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_claim_recovery(UUID) TO service_role;

CREATE TABLE IF NOT EXISTS socialu.session_revocations (
  auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  revoked_before TIMESTAMPTZ NOT NULL,
  preserved_session UUID
);
ALTER TABLE socialu.session_revocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON socialu.session_revocations FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.socialu_session_guard(
  p_action TEXT, p_auth_id UUID, p_session UUID, p_issued_at TIMESTAMPTZ
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r socialu.session_revocations%ROWTYPE;
BEGIN
  IF p_action IN ('revoke_all','revoke_others') THEN
    INSERT INTO socialu.session_revocations(auth_user_id,revoked_before,preserved_session)
    VALUES(p_auth_id,clock_timestamp(),CASE WHEN p_action = 'revoke_others' THEN p_session ELSE NULL END)
    ON CONFLICT(auth_user_id) DO UPDATE SET revoked_before = EXCLUDED.revoked_before, preserved_session = EXCLUDED.preserved_session;
    RETURN TRUE;
  ELSIF p_action <> 'check' THEN
    RAISE EXCEPTION 'Invalid session action' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO r FROM socialu.session_revocations WHERE auth_user_id = p_auth_id;
  IF NOT FOUND THEN RETURN TRUE; END IF;
  -- Compare session creation, not JWT refresh time: refreshing a revoked session
  -- must not grant access again. COALESCE prevents a NULL preserved session bypass.
  RETURN coalesce(p_session = r.preserved_session, FALSE) OR EXISTS (
    SELECT 1 FROM auth.sessions WHERE id = p_session AND user_id = p_auth_id AND created_at > r.revoked_before
  );
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_session_guard(TEXT,UUID,UUID,TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_session_guard(TEXT,UUID,UUID,TIMESTAMPTZ) TO service_role;
NOTIFY pgrst, 'reload schema';
