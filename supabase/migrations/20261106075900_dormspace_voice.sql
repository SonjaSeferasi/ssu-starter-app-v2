-- Voice reuses the authoritative, ephemeral DormSpace presence. No voice content is stored.
CREATE INDEX dormspace_live_players_voice_connection ON dormspace_live.players(connection_id);

CREATE FUNCTION dormspace_live.voice_scope(p dormspace_live.players) RETURNS text
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN NOT dormspace_live.valid_player(p) THEN NULL
    WHEN p.room_owner_id IS NULL AND p.space ~ '^hall:[1-9][0-9]{0,2}$'
      THEN 'socialu-voice-hall-' || md5(dormspace_directory.school_of(p.student_id)::text)
    WHEN p.space = 'room:' || p.room_owner_id::text
      AND dormspace_directory.school_of(p.student_id) = dormspace_directory.school_of(p.room_owner_id)
      THEN 'socialu-voice-room-' || md5(p.room_owner_id::text)
  END;
$$;

-- A short admission lease prevents simultaneous blocked joins and limits stale sessions.
CREATE TABLE dormspace_live.voice_leases (
  connection_id uuid PRIMARY KEY,
  attempt_id uuid NOT NULL,
  auth_id uuid NOT NULL,
  session_id uuid NOT NULL REFERENCES auth.sessions(id) ON DELETE CASCADE,
  channel text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX dormspace_voice_leases_channel ON dormspace_live.voice_leases(channel, expires_at);
ALTER TABLE dormspace_live.voice_leases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE dormspace_live.voice_leases FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION dormspace_live.voice_lease(
  p_auth_id uuid, p_session uuid, p_connection uuid, p_attempt uuid, p_action text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  member dormspace_live.players%ROWTYPE;
  username text;
  channel_name text;
  n integer;
  blocked boolean;
BEGIN
  IF p_action = 'leave' THEN
    DELETE FROM dormspace_live.voice_leases
    WHERE connection_id = p_connection AND attempt_id = p_attempt
      AND auth_id = p_auth_id AND session_id = p_session;
    RETURN NULL;
  END IF;
  SELECT p.* INTO member
  FROM dormspace_live.players p JOIN socialu.students s ON s.student_id = p.student_id
  WHERE s.auth_user_id = p_auth_id AND p.session_id = p_session AND p.connection_id = p_connection;
  IF NOT FOUND THEN RETURN NULL; END IF;
  channel_name := dormspace_live.voice_scope(member);
  IF channel_name IS NULL THEN RETURN NULL; END IF;

  IF p_action = 'renew' THEN
    UPDATE dormspace_live.voice_leases SET expires_at = clock_timestamp() + interval '15 seconds'
    WHERE connection_id = p_connection AND attempt_id = p_attempt
      AND auth_id = p_auth_id AND session_id = p_session AND channel = channel_name
      AND expires_at > clock_timestamp();
    IF NOT FOUND THEN RETURN NULL; END IF;
  ELSIF p_action = 'join' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(channel_name, 0));
    DELETE FROM dormspace_live.voice_leases WHERE expires_at <= clock_timestamp();
    IF EXISTS (
      SELECT 1 FROM dormspace_live.voice_leases WHERE connection_id = p_connection AND attempt_id <> p_attempt
    ) THEN RETURN jsonb_build_object('error', 'active'); END IF;
    SELECT count(*), coalesce(bool_or(socialu.is_blocked(member.student_id, p.student_id)), false)
    INTO n, blocked
    FROM dormspace_live.voice_leases v
    JOIN dormspace_live.players p ON p.connection_id = v.connection_id AND p.session_id = v.session_id
    WHERE v.channel = channel_name AND v.expires_at > clock_timestamp()
      AND p.connection_id <> p_connection AND dormspace_live.voice_scope(p) = channel_name;
    IF blocked THEN RETURN jsonb_build_object('error', 'blocked'); END IF;
    IF n >= 24 THEN RETURN jsonb_build_object('error', 'full'); END IF;
    INSERT INTO dormspace_live.voice_leases VALUES (
      p_connection, p_attempt, p_auth_id, p_session, channel_name, clock_timestamp() + interval '30 seconds'
    ) ON CONFLICT (connection_id) DO UPDATE SET expires_at = EXCLUDED.expires_at
      WHERE dormspace_live.voice_leases.attempt_id = EXCLUDED.attempt_id
        AND dormspace_live.voice_leases.auth_id = EXCLUDED.auth_id
        AND dormspace_live.voice_leases.session_id = EXCLUDED.session_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'active'); END IF;
  ELSE
    RETURN NULL;
  END IF;

  SELECT s.username INTO username FROM socialu.students s WHERE s.student_id = member.student_id;
  RETURN jsonb_build_object('channel', channel_name, 'username', username);
END;
$$;

CREATE FUNCTION dormspace_live.voice_members(p_channel text, p_connections uuid[]) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH members AS MATERIALIZED (
    SELECT p.student_id, p.connection_id, p.connection_id::text || '.' || v.attempt_id::text AS identity
    FROM dormspace_live.players p
    JOIN dormspace_live.voice_leases v ON v.connection_id = p.connection_id AND v.session_id = p.session_id
    WHERE cardinality(p_connections) <= 64 AND p.connection_id = ANY(p_connections)
      AND v.channel = p_channel AND v.expires_at > clock_timestamp() AND dormspace_live.voice_scope(p) = p_channel
  )
  SELECT coalesce(jsonb_object_agg(member.identity, ARRAY(
    SELECT other.identity FROM members other
    WHERE other.student_id <> member.student_id AND socialu.is_blocked(member.student_id, other.student_id)
  )), '{}'::jsonb)
  FROM members member;
$$;

REVOKE ALL ON FUNCTION dormspace_live.voice_scope(dormspace_live.players) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION dormspace_live.voice_lease(uuid, uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION dormspace_live.voice_members(text, uuid[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION dormspace_live.voice_lease(uuid, uuid, uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION dormspace_live.voice_members(text, uuid[]) TO service_role;

CREATE FUNCTION public.socialu_dorm_voice_lease(
  p_auth_id uuid, p_session uuid, p_connection uuid, p_attempt uuid, p_action text
) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT dormspace_live.voice_lease(p_auth_id, p_session, p_connection, p_attempt, p_action);
$$;
CREATE FUNCTION public.socialu_dorm_voice_members(p_channel text, p_connections uuid[]) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT dormspace_live.voice_members(p_channel, p_connections);
$$;

REVOKE ALL ON FUNCTION public.socialu_dorm_voice_lease(uuid, uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.socialu_dorm_voice_members(text, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_dorm_voice_lease(uuid, uuid, uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.socialu_dorm_voice_members(text, uuid[]) TO service_role;

NOTIFY pgrst, 'reload schema';
