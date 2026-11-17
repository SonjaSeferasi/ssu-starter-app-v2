-- SRS-630.1--630.4: opt-in, accepted-friend-only, short-lived presence.
BEGIN;
CREATE TABLE socialu.game_presence_preferences (
  student_id BIGINT PRIMARY KEY REFERENCES socialu.students(student_id) ON DELETE CASCADE,
  visible BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE socialu.game_presence_sessions (
  student_id BIGINT NOT NULL REFERENCES socialu.students(student_id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  location TEXT NOT NULL CHECK(location IN ('game-room','jumpyland','dormspace','world-explorer')),
  seen_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(student_id,session_id)
);
ALTER TABLE socialu.game_presence_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE socialu.game_presence_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON socialu.game_presence_preferences,socialu.game_presence_sessions FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.socialu_game_presence(p_auth_id UUID, p_action TEXT DEFAULT 'read', p_session UUID DEFAULT NULL, p_location TEXT DEFAULT NULL, p_visible BOOLEAN DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, socialu, pg_temp AS $presence$
DECLARE me BIGINT; enabled BOOLEAN; stamp TIMESTAMPTZ; friends JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_action NOT IN ('read','visibility','heartbeat','leave') OR p_action IS NULL THEN
    RAISE EXCEPTION 'Invalid presence action' USING ERRCODE='22023';
  END IF;
  -- Serialize privacy changes and heartbeats for this account, including other tabs.
  PERFORM 1 FROM socialu.students WHERE student_id=me FOR UPDATE;
  stamp := clock_timestamp();
  SELECT visible INTO enabled FROM socialu.game_presence_preferences WHERE student_id=me;
  enabled := coalesce(enabled,false);
  DELETE FROM socialu.game_presence_sessions WHERE student_id=me AND seen_at <= stamp - interval '60 seconds';
  IF p_action='visibility' THEN
    IF p_visible IS NULL THEN RAISE EXCEPTION 'Visibility required' USING ERRCODE='22023'; END IF;
    INSERT INTO socialu.game_presence_preferences VALUES(me,p_visible)
      ON CONFLICT(student_id) DO UPDATE SET visible=EXCLUDED.visible;
    enabled := p_visible;
    IF NOT enabled THEN DELETE FROM socialu.game_presence_sessions WHERE student_id=me; END IF;
  ELSIF p_action IN ('heartbeat','leave') THEN
    IF p_session IS NULL THEN RAISE EXCEPTION 'Session required' USING ERRCODE='22023'; END IF;
    IF p_action='leave' THEN
      DELETE FROM socialu.game_presence_sessions WHERE student_id=me AND session_id=p_session;
    ELSE
      IF p_location IS NULL OR p_location NOT IN ('game-room','jumpyland','dormspace','world-explorer') THEN
        RAISE EXCEPTION 'Invalid game' USING ERRCODE='22023';
      END IF;
      IF enabled THEN
        INSERT INTO socialu.game_presence_sessions VALUES(me,p_session,p_location,stamp)
          ON CONFLICT(student_id,session_id) DO UPDATE SET location=EXCLUDED.location,seen_at=EXCLUDED.seen_at;
        DELETE FROM socialu.game_presence_sessions WHERE student_id=me AND session_id IN (
          SELECT session_id FROM socialu.game_presence_sessions WHERE student_id=me ORDER BY seen_at DESC,session_id OFFSET 32
        );
      END IF;
    END IF;
  END IF;
  -- Do not return other students' presence from mutation requests.
  IF p_action <> 'read' THEN RETURN jsonb_build_object('visible',enabled); END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('username',s.username,'name',coalesce(sp.display_name,s.full_name),
      'location',live.location,'expiresAt',live.seen_at+interval '60 seconds') ORDER BY lower(coalesce(sp.display_name,s.full_name)),s.student_id),'[]'::jsonb)
  INTO friends FROM socialu.students s
  JOIN socialu.game_presence_preferences pref ON pref.student_id=s.student_id AND pref.visible
  LEFT JOIN socialu.student_profiles sp ON sp.student_id=s.student_id
  JOIN LATERAL (SELECT location,seen_at FROM socialu.game_presence_sessions gs
    WHERE gs.student_id=s.student_id AND gs.seen_at>stamp-interval '60 seconds'
    ORDER BY seen_at DESC,session_id LIMIT 1) live ON true
  WHERE s.student_id<>me AND s.is_active AND s.email_verified_at IS NOT NULL AND NOT s.reverification_required
    AND socialu.are_friends(me,s.student_id) AND NOT socialu.is_blocked(me,s.student_id);
  RETURN jsonb_build_object('visible',enabled,'serverTime',stamp,'friends',friends);
END;
$presence$;
REVOKE ALL ON FUNCTION public.socialu_game_presence(UUID,TEXT,UUID,TEXT,BOOLEAN) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_game_presence(UUID,TEXT,UUID,TEXT,BOOLEAN) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
