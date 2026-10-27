-- Extend the saved decoration library. Existing looks, notes and permissions are preserved.
CREATE TABLE IF NOT EXISTS socialu.profile_decoration_catalog (
  decoration_type TEXT NOT NULL CHECK (decoration_type IN ('frame','sticker')),
  decoration_key TEXT NOT NULL,
  PRIMARY KEY(decoration_type,decoration_key)
);
ALTER TABLE socialu.profile_decoration_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON socialu.profile_decoration_catalog FROM PUBLIC,anon,authenticated;
INSERT INTO socialu.profile_decoration_catalog(decoration_type,decoration_key) VALUES
('frame','daisy_wreath'),
('frame','lavender_wreath'),
('frame','sage_stamp'),
('frame','moon_stars'),
('frame','scrapbook'),
('frame','laurel_wreath'),
('frame','cherry_blossom'),
('frame','pixel_hearts'),
('frame','space_orbit'),
('frame','cat_paws'),
('frame','bookish'),
('frame','music_garden'),
('frame','ocean_waves'),
('frame','sunshine'),
('frame','pink_hearts'),
('frame','ivy'),
('frame','rainbow_clouds'),
('frame','daisy_polaroid'),
('frame','butterfly'),
('frame','graduation_laurel'),
('frame','varsity_ring'),
('frame','retro_gamer'),
('frame','space_explorer'),
('frame','code_notebook'),
('frame','courtside'),
('frame','mountain_trail'),
('frame','headphone_ring'),
('frame','denim_lightning'),
('frame','rounded'),
('frame','circle'),
('frame','postcard'),
('sticker','star'),
('sticker','coffee'),
('sticker','headphones'),
('sticker','books'),
('sticker','flower'),
('sticker','gamepad'),
('sticker','laptop'),
('sticker','planet'),
('sticker','smile'),
('sticker','graduation_cap'),
('sticker','cat'),
('sticker','puppy'),
('sticker','frog'),
('sticker','bunny'),
('sticker','ghost'),
('sticker','bubble_tea'),
('sticker','strawberry_milk'),
('sticker','ramen'),
('sticker','pizza'),
('sticker','croissant'),
('sticker','avocado'),
('sticker','cherries'),
('sticker','strawberry'),
('sticker','peach'),
('sticker','egg'),
('sticker','backpack'),
('sticker','pencil'),
('sticker','notebook'),
('sticker','highlighters'),
('sticker','calculator'),
('sticker','basketball'),
('sticker','soccer'),
('sticker','skateboard'),
('sticker','roller_skate'),
('sticker','sneaker'),
('sticker','camera'),
('sticker','vinyl'),
('sticker','music_player'),
('sticker','art_palette'),
('sticker','guitar'),
('sticker','moon'),
('sticker','sun'),
('sticker','rainbow'),
('sticker','succulent'),
('sticker','mushroom'),
('sticker','robot'),
('sticker','paper_plane'),
('sticker','heart'),
('sticker','sprout_book'),
('sticker','campus'),
('sticker','hoodie'),
('sticker','varsity_jacket'),
('sticker','hiking_boots'),
('sticker','wristwatch'),
('sticker','sunglasses'),
('sticker','sports_car'),
('sticker','motorcycle'),
('sticker','offroad_jeep'),
('sticker','mountain_bike'),
('sticker','racing_helmet'),
('sticker','dumbbell'),
('sticker','kettlebell'),
('sticker','boxing_gloves'),
('sticker','football'),
('sticker','baseball_glove'),
('sticker','gaming_pc'),
('sticker','keyboard'),
('sticker','gaming_mouse'),
('sticker','microphone'),
('sticker','handheld_console'),
('sticker','astronaut'),
('sticker','ufo'),
('sticker','dragon'),
('sticker','dinosaur'),
('sticker','wolf'),
('sticker','compass'),
('sticker','water_bottle'),
('sticker','campfire'),
('sticker','fishing'),
('sticker','sailboat'),
('sticker','retro_basketball'),
('sticker','retro_soccer'),
('sticker','navy_controller'),
('sticker','coding_laptop'),
('sticker','studio_headphones'),
('sticker','high_top'),
('sticker','retro_skateboard'),
('sticker','rocket'),
('sticker','baseball_cap'),
('sticker','camping_tent'),
('sticker','leaf')
ON CONFLICT DO NOTHING;

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
