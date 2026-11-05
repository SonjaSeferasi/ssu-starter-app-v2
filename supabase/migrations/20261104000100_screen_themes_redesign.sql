-- SocialU | "Customize Your Screen": second-generation background theme
-- redesign (CSS/SVG gradients instead of bitmap images -- see
-- lib/screen-themes.ts). NOT YET APPLIED -- prepared for review per
-- explicit instruction, additional functionality not in the official SRS.
--
-- The 9 theme ids themselves changed (old photographic themes ->
-- new CSS/SVG themes), so every EXISTING saved background_theme/
-- header_theme value that names one of the old 9 ids is remapped to its
-- closest new equivalent. Critical ordering, learned directly from this
-- session's own earlier migration bug (20261028000200/20261028000300's
-- reaction vocabulary expansion): the CHECK constraints must be DROPPED
-- FIRST, before the data-renaming UPDATEs run -- renaming data while the
-- OLD constraint is still active fails immediately, since the NEW id
-- values aren't valid under it yet. Drop -> rename data -> add the new,
-- widened constraints, in that exact order. No student's saved choice is
-- silently invalidated or reset to Default -- every old id maps to
-- exactly one new id below.
--
-- Mapping (old -> new), chosen by closest visual/conceptual match:
--   emerald_campus      -> emerald_gradient     (both emerald/campus green)
--   cherry_blossom      -> sunset_gradient      (closest pink/warm tone)
--   campus_illustration -> campus_illustration  (same id, art redone)
--   dreamy_sky          -> sky_clouds           (direct match)
--   enchanted_garden    -> leaves               (both botanical/garden)
--   golden_sunset       -> sunset_gradient      (direct match)
--   ocean_breeze        -> abstract_bubbles     (closest cool/aqua tone)
--   midnight_stars      -> night_mode           (direct match)
--   coquette             -> watercolor          (closest soft/pastel tone)
--
-- header_theme can ALSO hold a solid_*/gradient_* value (from
-- 20261029000300) -- this migration only ever touches rows whose current
-- value is one of the 9 OLD illustrated ids; solid colors and gradients
-- are completely untouched, and their own CHECK sub-list is unchanged.
-- background_theme stays illustrated-only, 9 values, as always.

-- Drop both existing CHECK constraints by introspection (never hardcoding
-- the Postgres-generated name), same DO-block pattern used throughout
-- this session (e.g. 20261029000300, 20261103000100) -- done FIRST, so
-- the renaming UPDATEs below are never evaluated against the old,
-- now-too-narrow constraint.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'socialu.student_preferences'::regclass AND contype = 'c'
      AND (pg_get_constraintdef(oid) LIKE '%background_theme%' OR pg_get_constraintdef(oid) LIKE '%header_theme%')
  LOOP
    EXECUTE format('ALTER TABLE socialu.student_preferences DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

UPDATE socialu.student_preferences SET background_theme = CASE background_theme
  WHEN 'emerald_campus' THEN 'emerald_gradient'
  WHEN 'cherry_blossom' THEN 'sunset_gradient'
  WHEN 'campus_illustration' THEN 'campus_illustration'
  WHEN 'dreamy_sky' THEN 'sky_clouds'
  WHEN 'enchanted_garden' THEN 'leaves'
  WHEN 'golden_sunset' THEN 'sunset_gradient'
  WHEN 'ocean_breeze' THEN 'abstract_bubbles'
  WHEN 'midnight_stars' THEN 'night_mode'
  WHEN 'coquette' THEN 'watercolor'
  ELSE background_theme
END
WHERE background_theme IS NOT NULL;

UPDATE socialu.student_preferences SET header_theme = CASE header_theme
  WHEN 'emerald_campus' THEN 'emerald_gradient'
  WHEN 'cherry_blossom' THEN 'sunset_gradient'
  WHEN 'campus_illustration' THEN 'campus_illustration'
  WHEN 'dreamy_sky' THEN 'sky_clouds'
  WHEN 'enchanted_garden' THEN 'leaves'
  WHEN 'golden_sunset' THEN 'sunset_gradient'
  WHEN 'ocean_breeze' THEN 'abstract_bubbles'
  WHEN 'midnight_stars' THEN 'night_mode'
  WHEN 'coquette' THEN 'watercolor'
  ELSE header_theme
END
WHERE header_theme IS NOT NULL;

ALTER TABLE socialu.student_preferences
  ADD CONSTRAINT student_preferences_background_theme_check CHECK (background_theme IN (
    'emerald_gradient','campus_illustration','minimal_wave','sky_clouds','leaves','sunset_gradient','abstract_bubbles','night_mode','watercolor'
  )),
  ADD CONSTRAINT student_preferences_header_theme_check CHECK (header_theme IN (
    -- Illustrated (redesigned)
    'emerald_gradient','campus_illustration','minimal_wave','sky_clouds','leaves','sunset_gradient','abstract_bubbles','night_mode','watercolor',
    -- Solid colors (unchanged from 20261029000300)
    'solid_emerald','solid_sage_green','solid_blush_pink','solid_lavender','solid_navy_blue','solid_cream','solid_burgundy','solid_sky_blue',
    -- Gradients (unchanged from 20261029000300)
    'gradient_emerald_forest','gradient_pink_sunset','gradient_ocean_dream','gradient_purple_haze','gradient_golden_hour','gradient_midnight'
  ));

-- socialu_set_screen_theme: both allow-lists updated to the new 9
-- illustrated ids; solid/gradient lists and every other line unchanged.
CREATE OR REPLACE FUNCTION public.socialu_set_screen_theme(p_auth_id UUID, p_background_theme TEXT DEFAULT NULL, p_header_theme TEXT DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT;
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
  ON CONFLICT (student_id) DO UPDATE SET background_theme = EXCLUDED.background_theme, header_theme = EXCLUDED.header_theme;

  RETURN jsonb_build_object('background_theme', p_background_theme, 'header_theme', p_header_theme);
END;
$$;

NOTIFY pgrst, 'reload schema';
