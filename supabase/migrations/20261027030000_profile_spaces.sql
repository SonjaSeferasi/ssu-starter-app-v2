-- Profile decorations and classmate hello notes. Additive; shared deployment is separate.
CREATE TABLE IF NOT EXISTS socialu.profile_spaces (
  student_id BIGINT PRIMARY KEY REFERENCES socialu.students(student_id) ON DELETE CASCADE,
  look JSONB NOT NULL
);
CREATE TABLE IF NOT EXISTS socialu.profile_hellos (
  note_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id BIGINT NOT NULL REFERENCES socialu.students(student_id),
  author_id BIGINT NOT NULL REFERENCES socialu.students(student_id),
  text_content TEXT NOT NULL CHECK (length(text_content) BETWEEN 1 AND 160 AND btrim(text_content) <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at TIMESTAMPTZ,
  CHECK (owner_id <> author_id)
);
CREATE INDEX IF NOT EXISTS profile_hellos_owner ON socialu.profile_hellos(owner_id,created_at DESC) WHERE removed_at IS NULL;
CREATE INDEX IF NOT EXISTS profile_hellos_author ON socialu.profile_hellos(author_id,created_at DESC);
ALTER TABLE socialu.profile_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE socialu.profile_hellos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON socialu.profile_spaces,socialu.profile_hellos FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.socialu_profile_space(
  p_auth_id UUID, p_action TEXT, p_username TEXT DEFAULT NULL,
  p_look JSONB DEFAULT NULL, p_text TEXT DEFAULT NULL, p_note_id BIGINT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; target BIGINT; item JSONB; ids TEXT[] := '{}'; notes JSONB; look JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  target := public.socialu_profile_target(me,p_username);
  IF p_action = 'save_look' THEN
    IF target <> me THEN RAISE EXCEPTION 'Only edit your own space.' USING ERRCODE='42501'; END IF;
    IF p_look IS NULL OR jsonb_typeof(p_look) <> 'object'
      OR coalesce(p_look->>'palette','') NOT IN ('sage','lavender','peach','sky','rose')
      OR coalesce(p_look->>'frame','') NOT IN ('rounded','circle','postcard')
      OR coalesce(p_look->>'cover','') NOT IN ('meadow','lines','plain')
      OR coalesce(p_look->>'layout','') NOT IN ('about-first','campus-first')
      OR jsonb_typeof(p_look->'stickers') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Choose a valid profile look.' USING ERRCODE='22023';
    END IF;
    IF jsonb_array_length(p_look->'stickers') > 8 THEN RAISE EXCEPTION 'Use up to eight stickers.' USING ERRCODE='22023'; END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(p_look->'stickers') LOOP
      IF jsonb_typeof(item) <> 'object' OR coalesce(item->>'id','') !~ '^[a-zA-Z0-9-]{1,40}$'
        OR item->>'id' = ANY(ids) OR coalesce(item->>'kind','') NOT IN ('star','coffee','headphones','books','flower','gamepad','laptop','planet','smile','graduation_cap','cat','puppy','frog','bunny','ghost','bubble_tea','strawberry_milk','ramen','pizza','croissant','avocado','cherries','strawberry','peach','egg','backpack','pencil','notebook','highlighters','calculator','basketball','soccer','skateboard','roller_skate','sneaker','camera','vinyl','music_player','art_palette','guitar','moon','sun','rainbow','succulent','mushroom','robot','paper_plane','heart','sprout_book','campus','leaf')
        OR jsonb_typeof(item->'x') IS DISTINCT FROM 'number' OR jsonb_typeof(item->'y') IS DISTINCT FROM 'number'
        OR jsonb_typeof(item->'rotation') IS DISTINCT FROM 'number' THEN
        RAISE EXCEPTION 'Choose a valid sticker.' USING ERRCODE='22023';
      END IF;
      IF (item->>'x')::NUMERIC NOT BETWEEN 10 AND 90 OR (item->>'y')::NUMERIC NOT BETWEEN 20 AND 80
        OR (item->>'rotation')::NUMERIC NOT BETWEEN -180 AND 180 THEN
        RAISE EXCEPTION 'Keep stickers inside the cover.' USING ERRCODE='22023';
      END IF;
      ids := array_append(ids,item->>'id');
    END LOOP;
    INSERT INTO socialu.profile_spaces(student_id,look) VALUES(me,p_look)
      ON CONFLICT(student_id) DO UPDATE SET look=excluded.look;
  ELSIF p_action = 'add_note' THEN
    IF target = me THEN RAISE EXCEPTION 'Leave a hello on a classmate’s profile.' USING ERRCODE='22023'; END IF;
    IF p_text IS NULL OR btrim(p_text) = '' OR length(p_text) > 160 THEN RAISE EXCEPTION 'Write a hello of 1–160 characters.' USING ERRCODE='22023'; END IF;
    -- Serialize per author, so simultaneous requests cannot bypass the one-minute limit.
    PERFORM 1 FROM socialu.students WHERE student_id=me FOR UPDATE;
    IF EXISTS(SELECT 1 FROM socialu.profile_hellos WHERE author_id=me AND created_at > now()-INTERVAL '1 minute') THEN
      RAISE EXCEPTION 'Please wait before leaving another note.' USING ERRCODE='P0001';
    END IF;
    INSERT INTO socialu.profile_hellos(owner_id,author_id,text_content) VALUES(target,me,btrim(p_text));
  ELSIF p_action = 'remove_note' THEN
    UPDATE socialu.profile_hellos SET removed_at=now()
      WHERE note_id=p_note_id AND owner_id=target AND removed_at IS NULL AND (owner_id=me OR author_id=me);
    IF NOT FOUND THEN RAISE EXCEPTION 'This note is not available.' USING ERRCODE='P0002'; END IF;
  ELSIF p_action IS DISTINCT FROM 'read' THEN
    RAISE EXCEPTION 'Choose a valid action.' USING ERRCODE='22023';
  END IF;
  SELECT s.look INTO look FROM socialu.profile_spaces s WHERE student_id=target;
  SELECT coalesce(jsonb_agg(n.item ORDER BY n.created_at DESC,n.note_id DESC),'[]'::jsonb) INTO notes FROM (
    SELECT h.note_id,h.created_at,jsonb_build_object('id',h.note_id,'text',h.text_content,'username',s.username,
      'name',coalesce(p.display_name,s.full_name),'createdAt',h.created_at,'canRemove',me IN (h.owner_id,h.author_id)) AS item
      FROM socialu.profile_hellos h JOIN socialu.students s ON s.student_id=h.author_id
      LEFT JOIN socialu.student_profiles p ON p.student_id=s.student_id
      WHERE h.owner_id=target AND h.removed_at IS NULL AND s.is_active
        AND NOT socialu.is_blocked(me,h.author_id) AND NOT socialu.is_blocked(target,h.author_id)
      ORDER BY h.created_at DESC,h.note_id DESC LIMIT 20
  ) n;
  RETURN jsonb_build_object('look',coalesce(look,'{"palette":"sage","frame":"rounded","cover":"meadow","layout":"about-first","stickers":[]}'::jsonb),'notes',notes);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_profile_space(UUID,TEXT,TEXT,JSONB,TEXT,BIGINT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_profile_space(UUID,TEXT,TEXT,JSONB,TEXT,BIGINT) TO service_role;
