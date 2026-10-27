-- Additive profile prompts, interests and a public Spotify music link.
-- Local migration only; no changes to existing bios or profile RPC return shapes.
CREATE TABLE IF NOT EXISTS socialu.profile_personality (
  student_id BIGINT PRIMARY KEY REFERENCES socialu.students(student_id) ON DELETE CASCADE,
  prompt TEXT NOT NULL DEFAULT 'building' CHECK (prompt IN ('building', 'up_for', 'ask_me')),
  answer TEXT NOT NULL DEFAULT '' CHECK (length(answer) <= 100),
  interests TEXT[] NOT NULL DEFAULT '{}' CHECK (
    cardinality(interests) <= 5 AND array_position(interests, NULL) IS NULL
    AND interests <@ ARRAY['Coding','Music','Campus life','Coffee','Design','Reading']::TEXT[]),
  spotify_url TEXT NOT NULL DEFAULT '' CHECK (spotify_url = '' OR (
    spotify_url ~ '^https://open[.]spotify[.]com/(track|album|playlist)/[A-Za-z0-9]{22}$'
    AND 'Music' = ANY(interests)))
);
ALTER TABLE socialu.profile_personality ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON socialu.profile_personality FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.socialu_profile_personality(
  p_auth_id UUID, p_action TEXT, p_username TEXT DEFAULT NULL,
  p_prompt TEXT DEFAULT 'building', p_answer TEXT DEFAULT '',
  p_interests TEXT[] DEFAULT '{}', p_spotify_url TEXT DEFAULT ''
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; target BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  target := public.socialu_profile_target(me, p_username);
  IF p_action = 'save' THEN
    IF target <> me THEN RAISE EXCEPTION 'Only edit your own profile.' USING ERRCODE = '42501'; END IF;
    IF p_prompt IS NULL OR p_answer IS NULL OR p_interests IS NULL OR p_spotify_url IS NULL
       OR cardinality(p_interests) <> (SELECT count(DISTINCT x) FROM unnest(p_interests) x) THEN
      RAISE EXCEPTION 'Choose a valid prompt and interests.' USING ERRCODE = '22023';
    END IF;
    INSERT INTO socialu.profile_personality(student_id,prompt,answer,interests,spotify_url)
      VALUES(me,p_prompt,btrim(p_answer),p_interests,p_spotify_url)
      ON CONFLICT(student_id) DO UPDATE SET prompt=excluded.prompt, answer=excluded.answer,
        interests=excluded.interests, spotify_url=excluded.spotify_url;
  ELSIF p_action IS DISTINCT FROM 'read' THEN
    RAISE EXCEPTION 'Choose a valid action.' USING ERRCODE = '22023';
  END IF;
  SELECT jsonb_build_object('prompt',p.prompt,'answer',p.answer,'interests',to_jsonb(p.interests),'spotifyUrl',p.spotify_url)
    INTO result FROM socialu.profile_personality p WHERE p.student_id = target;
  RETURN coalesce(result, jsonb_build_object('prompt','building','answer','','interests','[]'::jsonb,'spotifyUrl',''));
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_profile_personality(UUID,TEXT,TEXT,TEXT,TEXT,TEXT[],TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_profile_personality(UUID,TEXT,TEXT,TEXT,TEXT,TEXT[],TEXT) TO service_role;
