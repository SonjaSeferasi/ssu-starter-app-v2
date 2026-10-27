-- Pinned memories: up to six captioned photos on a student's profile. Photos live in the private media bucket.
CREATE TABLE IF NOT EXISTS socialu.profile_memories (
  memory_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES socialu.students(student_id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL UNIQUE,
  caption TEXT NOT NULL DEFAULT '' CHECK (length(caption) <= 40),
  doodle TEXT NOT NULL DEFAULT 'none' CHECK (doodle IN ('none','heart','sparkles','star','sun','smile')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profile_memories_student ON socialu.profile_memories(student_id,created_at);
ALTER TABLE socialu.profile_memories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON socialu.profile_memories FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.socialu_profile_memories(
  p_auth_id UUID, p_action TEXT, p_username TEXT DEFAULT NULL,
  p_storage_key TEXT DEFAULT NULL, p_caption TEXT DEFAULT '', p_doodle TEXT DEFAULT 'none', p_memory_id BIGINT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; target BIGINT; removed TEXT; memories JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  target := public.socialu_profile_target(me,p_username);
  IF p_action IN ('add','remove') AND target <> me THEN RAISE EXCEPTION 'Only edit your own memories.' USING ERRCODE='42501'; END IF;
  IF p_action = 'add' THEN
    -- The key must be one the API just uploaded into this student's own folder.
    IF p_storage_key IS NULL OR p_storage_key !~ ('^profile-memories/' || p_auth_id::TEXT || '/[0-9a-f-]{36}\.(jpg|png|webp)$')
      OR p_caption IS NULL OR length(p_caption) > 40
      OR coalesce(p_doodle,'') NOT IN ('none','heart','sparkles','star','sun','smile') THEN
      RAISE EXCEPTION 'Choose a photo, a short caption, and a doodle.' USING ERRCODE='22023';
    END IF;
    PERFORM 1 FROM socialu.students WHERE student_id=me FOR UPDATE;
    IF (SELECT count(*) FROM socialu.profile_memories WHERE student_id=me) >= 6 THEN
      RAISE EXCEPTION 'You can pin up to six memories. Remove one first.' USING ERRCODE='P0001';
    END IF;
    INSERT INTO socialu.profile_memories(student_id,storage_key,caption,doodle) VALUES(me,p_storage_key,btrim(p_caption),p_doodle);
  ELSIF p_action = 'remove' THEN
    DELETE FROM socialu.profile_memories WHERE memory_id=p_memory_id AND student_id=me RETURNING storage_key INTO removed;
    IF removed IS NULL THEN RAISE EXCEPTION 'This memory is not available.' USING ERRCODE='P0002'; END IF;
  ELSIF p_action IS DISTINCT FROM 'read' THEN
    RAISE EXCEPTION 'Choose a valid action.' USING ERRCODE='22023';
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.memory_id,'key',m.storage_key,'caption',m.caption,'doodle',m.doodle,'createdAt',m.created_at)
    ORDER BY m.created_at,m.memory_id),'[]'::jsonb) INTO memories FROM socialu.profile_memories m WHERE m.student_id=target;
  RETURN jsonb_build_object('memories',memories,'removedKey',removed);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_profile_memories(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,BIGINT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_profile_memories(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,BIGINT) TO service_role;
