-- Several "about me" prompts, more interests, colorful hello notes with a doodle, and resizable stickers.
-- Additive: existing single prompt answers are copied into the new list; notes keep the default look.
ALTER TABLE socialu.profile_personality ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '[]'::jsonb;
UPDATE socialu.profile_personality SET answers=jsonb_build_array(jsonb_build_object('prompt',prompt,'answer',answer)), answer=''
  WHERE answer <> '' AND answers = '[]'::jsonb;
ALTER TABLE socialu.profile_personality DROP CONSTRAINT IF EXISTS profile_personality_interests_check;
ALTER TABLE socialu.profile_personality ADD CONSTRAINT profile_personality_interests_check CHECK (
  cardinality(interests) <= 5 AND array_position(interests, NULL) IS NULL
  AND interests <@ ARRAY['Coding','Music','Campus life','Coffee','Design','Reading','Gaming','Sports','Art','Photography','Movies','Travel','Fitness','Food']::TEXT[]);

DROP FUNCTION IF EXISTS public.socialu_profile_personality(UUID,TEXT,TEXT,TEXT,TEXT,TEXT[],TEXT);
CREATE OR REPLACE FUNCTION public.socialu_profile_personality(
  p_auth_id UUID, p_action TEXT, p_username TEXT DEFAULT NULL,
  p_answers JSONB DEFAULT '[]'::jsonb, p_interests TEXT[] DEFAULT '{}', p_spotify_url TEXT DEFAULT ''
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; target BIGINT; result JSONB; item JSONB; clean JSONB := '[]'::jsonb; prompts TEXT[] := '{}';
BEGIN
  me := public.socialu_require_student(p_auth_id);
  target := public.socialu_profile_target(me, p_username);
  IF p_action = 'save' THEN
    IF target <> me THEN RAISE EXCEPTION 'Only edit your own profile.' USING ERRCODE = '42501'; END IF;
    IF p_answers IS NULL OR jsonb_typeof(p_answers) <> 'array' OR jsonb_array_length(p_answers) > 3
       OR p_interests IS NULL OR p_spotify_url IS NULL
       OR cardinality(p_interests) <> (SELECT count(DISTINCT x) FROM unnest(p_interests) x) THEN
      RAISE EXCEPTION 'Choose a valid prompt and interests.' USING ERRCODE = '22023';
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(p_answers) LOOP
      IF jsonb_typeof(item) <> 'object' OR jsonb_typeof(item->'answer') IS DISTINCT FROM 'string'
         OR coalesce(item->>'prompt','') NOT IN ('building','up_for','ask_me','find_me','fun_fact')
         OR item->>'prompt' = ANY(prompts) OR btrim(item->>'answer') = '' OR length(item->>'answer') > 100 THEN
        RAISE EXCEPTION 'Choose a valid prompt and interests.' USING ERRCODE = '22023';
      END IF;
      prompts := array_append(prompts, item->>'prompt');
      clean := clean || jsonb_build_array(jsonb_build_object('prompt',item->>'prompt','answer',btrim(item->>'answer')));
    END LOOP;
    INSERT INTO socialu.profile_personality(student_id,answers,answer,interests,spotify_url)
      VALUES(me,clean,'',p_interests,p_spotify_url)
      ON CONFLICT(student_id) DO UPDATE SET answers=excluded.answers, answer='',
        interests=excluded.interests, spotify_url=excluded.spotify_url;
  ELSIF p_action IS DISTINCT FROM 'read' THEN
    RAISE EXCEPTION 'Choose a valid action.' USING ERRCODE = '22023';
  END IF;
  SELECT jsonb_build_object('answers',p.answers,'interests',to_jsonb(p.interests),'spotifyUrl',p.spotify_url)
    INTO result FROM socialu.profile_personality p WHERE p.student_id = target;
  RETURN coalesce(result, jsonb_build_object('answers','[]'::jsonb,'interests','[]'::jsonb,'spotifyUrl',''));
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_profile_personality(UUID,TEXT,TEXT,JSONB,TEXT[],TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_profile_personality(UUID,TEXT,TEXT,JSONB,TEXT[],TEXT) TO service_role;

ALTER TABLE socialu.profile_hellos ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT 'yellow'
  CHECK (color IN ('yellow','pink','green','blue','lavender'));
ALTER TABLE socialu.profile_hellos ADD COLUMN IF NOT EXISTS doodle TEXT NOT NULL DEFAULT 'none'
  CHECK (doodle IN ('none','heart','smile','star','sun','flower','coffee'));

DROP FUNCTION IF EXISTS public.socialu_profile_space(UUID,TEXT,TEXT,JSONB,TEXT,BIGINT);
CREATE OR REPLACE FUNCTION public.socialu_profile_space(
  p_auth_id UUID, p_action TEXT, p_username TEXT DEFAULT NULL,
  p_look JSONB DEFAULT NULL, p_text TEXT DEFAULT NULL, p_note_id BIGINT DEFAULT NULL,
  p_color TEXT DEFAULT 'yellow', p_doodle TEXT DEFAULT 'none'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; target BIGINT; item JSONB; ids TEXT[] := '{}'; notes JSONB; look JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  target := public.socialu_profile_target(me,p_username);
  IF p_action = 'save_look' THEN
    IF target <> me THEN RAISE EXCEPTION 'Only edit your own space.' USING ERRCODE='42501'; END IF;
    IF p_look IS NULL OR jsonb_typeof(p_look) <> 'object'
      OR coalesce(p_look->>'palette','') NOT IN ('sage','lavender','peach','sky','rose')
      OR NOT EXISTS(SELECT 1 FROM socialu.profile_decoration_catalog WHERE decoration_type='frame' AND decoration_key=(p_look->>'frame'))
      OR coalesce(p_look->>'cover','') NOT IN ('meadow','lines','plain')
      OR coalesce(p_look->>'layout','') NOT IN ('about-first','campus-first')
      OR jsonb_typeof(p_look->'stickers') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Choose a valid profile look.' USING ERRCODE='22023';
    END IF;
    IF jsonb_array_length(p_look->'stickers') > 8 THEN RAISE EXCEPTION 'Use up to eight stickers.' USING ERRCODE='22023'; END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(p_look->'stickers') LOOP
      IF jsonb_typeof(item) <> 'object' OR coalesce(item->>'id','') !~ '^[a-zA-Z0-9-]{1,40}$'
        OR item->>'id' = ANY(ids) OR NOT EXISTS(SELECT 1 FROM socialu.profile_decoration_catalog WHERE decoration_type='sticker' AND decoration_key=(item->>'kind'))
        OR jsonb_typeof(item->'x') IS DISTINCT FROM 'number' OR jsonb_typeof(item->'y') IS DISTINCT FROM 'number'
        OR jsonb_typeof(item->'rotation') IS DISTINCT FROM 'number'
        OR (item ? 'scale' AND jsonb_typeof(item->'scale') IS DISTINCT FROM 'number') THEN
        RAISE EXCEPTION 'Choose a valid sticker.' USING ERRCODE='22023';
      END IF;
      IF (item->>'x')::NUMERIC NOT BETWEEN 10 AND 90 OR (item->>'y')::NUMERIC NOT BETWEEN 20 AND 80
        OR (item->>'rotation')::NUMERIC NOT BETWEEN -180 AND 180
        OR coalesce((item->>'scale')::NUMERIC,1) NOT BETWEEN 0.5 AND 2 THEN
        RAISE EXCEPTION 'Keep stickers inside the cover.' USING ERRCODE='22023';
      END IF;
      ids := array_append(ids,item->>'id');
    END LOOP;
    INSERT INTO socialu.profile_spaces(student_id,look) VALUES(me,p_look)
      ON CONFLICT(student_id) DO UPDATE SET look=excluded.look;
  ELSIF p_action = 'add_note' THEN
    IF target = me THEN RAISE EXCEPTION 'Leave a hello on a classmate’s profile.' USING ERRCODE='22023'; END IF;
    IF p_text IS NULL OR btrim(p_text) = '' OR length(p_text) > 160 THEN RAISE EXCEPTION 'Write a hello of 1–160 characters.' USING ERRCODE='22023'; END IF;
    IF coalesce(p_color,'') NOT IN ('yellow','pink','green','blue','lavender')
      OR coalesce(p_doodle,'') NOT IN ('none','heart','smile','star','sun','flower','coffee') THEN
      RAISE EXCEPTION 'Choose a note color and doodle.' USING ERRCODE='22023';
    END IF;
    -- Serialize per author, so simultaneous requests cannot bypass the one-minute limit.
    PERFORM 1 FROM socialu.students WHERE student_id=me FOR UPDATE;
    IF EXISTS(SELECT 1 FROM socialu.profile_hellos WHERE author_id=me AND created_at > now()-INTERVAL '1 minute') THEN
      RAISE EXCEPTION 'Please wait before leaving another note.' USING ERRCODE='P0001';
    END IF;
    INSERT INTO socialu.profile_hellos(owner_id,author_id,text_content,color,doodle) VALUES(target,me,btrim(p_text),p_color,p_doodle);
  ELSIF p_action = 'remove_note' THEN
    UPDATE socialu.profile_hellos SET removed_at=now()
      WHERE note_id=p_note_id AND owner_id=target AND removed_at IS NULL AND (owner_id=me OR author_id=me);
    IF NOT FOUND THEN RAISE EXCEPTION 'This note is not available.' USING ERRCODE='P0002'; END IF;
  ELSIF p_action IS DISTINCT FROM 'read' THEN
    RAISE EXCEPTION 'Choose a valid action.' USING ERRCODE='22023';
  END IF;
  SELECT s.look INTO look FROM socialu.profile_spaces s WHERE student_id=target;
  SELECT coalesce(jsonb_agg(n.item ORDER BY n.created_at DESC,n.note_id DESC),'[]'::jsonb) INTO notes FROM (
    SELECT h.note_id,h.created_at,jsonb_build_object('id',h.note_id,'text',h.text_content,'color',h.color,'doodle',h.doodle,'username',s.username,
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
REVOKE ALL ON FUNCTION public.socialu_profile_space(UUID,TEXT,TEXT,JSONB,TEXT,BIGINT,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_profile_space(UUID,TEXT,TEXT,JSONB,TEXT,BIGINT,TEXT,TEXT) TO service_role;
