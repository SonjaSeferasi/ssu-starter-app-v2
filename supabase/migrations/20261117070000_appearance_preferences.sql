-- SRS-627: one account-level preference, separate from decorative backgrounds.
BEGIN;
CREATE OR REPLACE FUNCTION public.socialu_appearance(p_auth_id UUID, p_theme TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, socialu, pg_temp AS $appearance$
DECLARE profile JSONB; student BIGINT; selected TEXT;
BEGIN
  profile := public.socialu_account('read', p_auth_id);
  IF profile IS NULL THEN RAISE EXCEPTION 'Active account required' USING ERRCODE = '42501'; END IF;
  student := (profile->>'id')::BIGINT;
  IF p_theme IS NOT NULL THEN
    IF p_theme NOT IN ('light', 'dark') THEN RAISE EXCEPTION 'Invalid appearance' USING ERRCODE = '22023'; END IF;
    INSERT INTO socialu.student_preferences(student_id, theme) VALUES(student, p_theme)
    ON CONFLICT(student_id) DO UPDATE SET theme = EXCLUDED.theme;
  END IF;
  SELECT theme INTO selected FROM socialu.student_preferences WHERE student_id = student;
  RETURN jsonb_build_object('theme', coalesce(selected, 'light'));
END;
$appearance$;
REVOKE ALL ON FUNCTION public.socialu_appearance(UUID,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_appearance(UUID,TEXT) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
