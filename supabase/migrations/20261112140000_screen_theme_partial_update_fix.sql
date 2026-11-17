-- #1209 (Customize Your Screen, additional functionality): a partial save
-- silently destroyed the OTHER saved theme. socialu_set_screen_theme's
-- upsert did `background_theme = EXCLUDED.background_theme, header_theme
-- = EXCLUDED.header_theme` unconditionally -- an omitted parameter
-- arrives as SQL NULL and overwrote the existing value, even though both
-- parameters are declared DEFAULT NULL specifically to invite sending
-- just one. Fix: coalesce each column against the student's current
-- value on conflict, so NULL genuinely means "leave this one alone," not
-- "clear it." Paired with a route-level fix (app/api/preferences/
-- screen-theme/route.ts) that now rejects a recognized-but-invalid id
-- with 400 instead of coercing it to NULL -- without that pairing, this
-- RPC change alone would make an invalid id silently become "leave
-- unchanged" instead of "silently reset to Default," which is better but
-- still not an error. Everything else about the function is unchanged;
-- this is a full CREATE OR REPLACE copy from
-- 20261104000100_screen_themes_redesign.sql.

CREATE OR REPLACE FUNCTION public.socialu_set_screen_theme(p_auth_id UUID, p_background_theme TEXT DEFAULT NULL, p_header_theme TEXT DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; saved socialu.student_preferences%ROWTYPE;
  valid_background TEXT[] := ARRAY['emerald_gradient','campus_illustration','minimal_wave','sky_clouds','leaves','sunset_gradient','abstract_bubbles','night_mode','watercolor'];
  valid_header TEXT[] := ARRAY[
    'emerald_gradient','campus_illustration','minimal_wave','sky_clouds','leaves','sunset_gradient','abstract_bubbles','night_mode','watercolor',
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
  ON CONFLICT (student_id) DO UPDATE SET
    background_theme = coalesce(EXCLUDED.background_theme, socialu.student_preferences.background_theme),
    header_theme = coalesce(EXCLUDED.header_theme, socialu.student_preferences.header_theme)
  RETURNING * INTO saved;

  RETURN jsonb_build_object('background_theme', saved.background_theme, 'header_theme', saved.header_theme);
END;
$$;
