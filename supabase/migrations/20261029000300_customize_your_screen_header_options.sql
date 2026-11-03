-- SocialU | "Customize Your Screen": widen header_theme to also accept
-- 8 solid colors and 6 gradients, alongside the 9 existing illustrated
-- themes (23 total). Additional functionality, not in the official SRS,
-- not SRS-627's Light/Dark mode (untouched here, as always).
--
-- background_theme is completely untouched -- backgrounds stay
-- illustrated-only, 9 values, same CHECK as 20261029000200 set it to.
-- Every existing saved header_theme value (one of the original 9
-- illustrated ids) is still a member of the widened list below, so no
-- student's saved choice is invalidated or needs migrating -- this is
-- purely additive, same spirit as every other CHECK-widening migration
-- in this codebase (e.g. 20261028000200's reaction vocabulary expansion).
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'socialu.student_preferences'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%header_theme%'
  LOOP
    EXECUTE format('ALTER TABLE socialu.student_preferences DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE socialu.student_preferences
  ADD CONSTRAINT student_preferences_header_theme_check CHECK (header_theme IN (
    -- Illustrated (unchanged from 20261029000200)
    'emerald_campus','cherry_blossom','campus_illustration','dreamy_sky','enchanted_garden','golden_sunset','ocean_breeze','midnight_stars','coquette',
    -- Solid colors (new)
    'solid_emerald','solid_sage_green','solid_blush_pink','solid_lavender','solid_navy_blue','solid_cream','solid_burgundy','solid_sky_blue',
    -- Gradients (new)
    'gradient_emerald_forest','gradient_pink_sunset','gradient_ocean_dream','gradient_purple_haze','gradient_golden_hour','gradient_midnight'
  ));

-- socialu_set_screen_theme: only p_header_theme's valid-value list widens
-- to the 23 values above. p_background_theme's own check is completely
-- unchanged (still the 9-value `valid` list) -- backgrounds were never
-- part of this request.
CREATE OR REPLACE FUNCTION public.socialu_set_screen_theme(p_auth_id UUID, p_background_theme TEXT DEFAULT NULL, p_header_theme TEXT DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT;
  valid_background TEXT[] := ARRAY['emerald_campus','cherry_blossom','campus_illustration','dreamy_sky','enchanted_garden','golden_sunset','ocean_breeze','midnight_stars','coquette'];
  valid_header TEXT[] := ARRAY[
    'emerald_campus','cherry_blossom','campus_illustration','dreamy_sky','enchanted_garden','golden_sunset','ocean_breeze','midnight_stars','coquette',
    'solid_emerald','solid_sage_green','solid_blush_pink','solid_lavender','solid_navy_blue','solid_cream','solid_burgundy','solid_sky_blue',
    'gradient_emerald_forest','gradient_pink_sunset','gradient_ocean_dream','gradient_purple_haze','gradient_golden_hour','gradient_midnight'
  ];
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_background_theme IS NOT NULL AND NOT (p_background_theme = ANY(valid_background)) THEN
    RAISE EXCEPTION 'Choose a valid background theme.' USING ERRCODE = '22023';
  END IF;
  IF p_header_theme IS NOT NULL AND NOT (p_header_theme = ANY(valid_header)) THEN
    RAISE EXCEPTION 'Choose a valid header theme.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO socialu.student_preferences (student_id, background_theme, header_theme)
  VALUES (me, p_background_theme, p_header_theme)
  ON CONFLICT (student_id) DO UPDATE SET background_theme = EXCLUDED.background_theme, header_theme = EXCLUDED.header_theme;

  RETURN jsonb_build_object('background_theme', p_background_theme, 'header_theme', p_header_theme);
END;
$$;

NOTIFY pgrst, 'reload schema';
