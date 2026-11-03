-- SocialU | "Customize Your Screen" -- illustrated background/header
-- personalization, additional functionality not in the official SRS.
--
-- Deliberately NOT the same feature as SRS-627 (Light/Dark appearance
-- mode, owned by SS) -- that's socialu.student_preferences.theme, left
-- completely untouched here. This adds two new, independent, nullable
-- columns to the SAME table (already the established home for per-student
-- interface preferences, same upsert pattern socialu_game_room already
-- uses for navigation_position) rather than inventing a new table or
-- touching socialu_game_room's existing body at all -- a brand new pair
-- of RPCs owns these two columns exclusively.
--
-- NULL means "Default" for that slot -- today's existing plain look,
-- completely unchanged -- so a student who never opens this feature sees
-- exactly what they see today. Background and header are chosen fully
-- independently of each other.
ALTER TABLE socialu.student_preferences
  ADD COLUMN background_theme TEXT CHECK (background_theme IN
    ('emerald_campus','cherry_blossom','campus_illustration','dreamy_sky','enchanted_garden','golden_sunset','ocean_breeze','midnight_stars','coquette')),
  ADD COLUMN header_theme TEXT CHECK (header_theme IN
    ('emerald_campus','cherry_blossom','campus_illustration','dreamy_sky','enchanted_garden','golden_sunset','ocean_breeze','midnight_stars','coquette'));

-- Read the caller's own screen theme preferences only -- there is no
-- cross-student read path here at all (nothing ever looks up another
-- student's preference row), so cross-school isolation is structurally
-- guaranteed, the same reasoning already used for socialu_whisper_delete.
CREATE FUNCTION public.socialu_get_screen_theme(p_auth_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT jsonb_build_object('background_theme', background_theme, 'header_theme', header_theme)
  INTO result FROM socialu.student_preferences WHERE student_id = me;
  RETURN coalesce(result, jsonb_build_object('background_theme', NULL, 'header_theme', NULL));
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_get_screen_theme(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_get_screen_theme(UUID) TO service_role;

-- Save both at once -- matches the UI's single "Save Changes"/"Reset to
-- Default" action covering whatever's currently selected across both the
-- Background Style and Header Style tabs. NULL for either explicitly
-- resets that slot to Default; this always SETS both to exactly what's
-- passed (not a partial/merge update), so Reset to Default is just a call
-- with both arguments NULL.
CREATE FUNCTION public.socialu_set_screen_theme(p_auth_id UUID, p_background_theme TEXT DEFAULT NULL, p_header_theme TEXT DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT;
  valid TEXT[] := ARRAY['emerald_campus','cherry_blossom','campus_illustration','dreamy_sky','enchanted_garden','golden_sunset','ocean_breeze','midnight_stars','coquette'];
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_background_theme IS NOT NULL AND NOT (p_background_theme = ANY(valid)) THEN
    RAISE EXCEPTION 'Choose a valid background theme.' USING ERRCODE = '22023';
  END IF;
  IF p_header_theme IS NOT NULL AND NOT (p_header_theme = ANY(valid)) THEN
    RAISE EXCEPTION 'Choose a valid header theme.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO socialu.student_preferences (student_id, background_theme, header_theme)
  VALUES (me, p_background_theme, p_header_theme)
  ON CONFLICT (student_id) DO UPDATE SET background_theme = EXCLUDED.background_theme, header_theme = EXCLUDED.header_theme;

  RETURN jsonb_build_object('background_theme', p_background_theme, 'header_theme', p_header_theme);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_set_screen_theme(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_set_screen_theme(UUID, TEXT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
