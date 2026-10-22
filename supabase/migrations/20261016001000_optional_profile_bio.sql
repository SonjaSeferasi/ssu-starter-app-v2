-- Make profile bios optional while keeping the 250-character limit.
CREATE OR REPLACE FUNCTION public.socialu_save_profile(
  p_auth_id UUID, p_display_name TEXT, p_major TEXT, p_class_year TEXT, p_bio TEXT,
  p_photo_key TEXT DEFAULT NULL, p_photo_mime TEXT DEFAULT NULL, p_photo_bytes BIGINT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me BIGINT;
  p socialu.student_profiles%ROWTYPE;
  v_photo BIGINT;
  v_name TEXT := nullif(btrim(coalesce(p_display_name, '')), '');
  v_major TEXT := nullif(btrim(coalesce(p_major, '')), '');
  v_bio TEXT := btrim(coalesce(p_bio, ''));
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT * INTO p FROM socialu.student_profiles WHERE student_id = me FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Create your SocialU profile first.' USING ERRCODE = 'P0002'; END IF;
  IF length(v_bio) > 250 THEN RAISE EXCEPTION 'Your bio can be at most 250 characters.' USING ERRCODE = '22023'; END IF;
  IF p_class_year IS NOT NULL AND p_class_year NOT IN ('Freshman','Sophomore','Junior','Senior','Graduate') THEN
    RAISE EXCEPTION 'Choose Freshman, Sophomore, Junior, Senior, or Graduate.' USING ERRCODE = '22023';
  END IF;
  -- SRS-110.6: explain the seven-day rule instead of surfacing validate_profile's raw error.
  IF v_name IS DISTINCT FROM p.display_name AND p.display_name_changed_at > now() - INTERVAL '7 days' THEN
    RAISE EXCEPTION 'You can change your display name again on %.',
      to_char(p.display_name_changed_at + INTERVAL '7 days', 'FMMonth FMDD') USING ERRCODE = '22023';
  END IF;
  v_photo := p.photo_id;
  IF p_photo_key IS NOT NULL THEN
    -- validate_media enforces the SRS-109.3 formats and the SRS-109.4 10 MB limit.
    INSERT INTO socialu.media_assets (owner_id, storage_key, upload_context, mime_type, byte_count)
    VALUES (me, p_photo_key, 'profile', p_photo_mime, p_photo_bytes) RETURNING asset_id INTO v_photo;
  END IF;
  -- Profile photo, major and class year are required; bio is optional.
  IF v_photo IS NULL OR v_major IS NULL OR p_class_year IS NULL THEN
    RAISE EXCEPTION 'Add a profile photo, major, and class year to finish your profile.' USING ERRCODE = '22023';
  END IF;
  UPDATE socialu.student_profiles
     SET photo_id = v_photo, display_name = v_name, major = v_major, class_year = p_class_year,
         bio = v_bio, setup_completed = TRUE
   WHERE student_id = me;
  RETURN public.socialu_profile_view(p_auth_id, NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_save_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_save_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT) TO service_role;

NOTIFY pgrst, 'reload schema';

-- The original table CHECK also required a bio for completed profiles.
DO $$ DECLARE c RECORD; BEGIN
  FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='socialu.student_profiles'::regclass
    AND contype='c' AND pg_get_constraintdef(oid) LIKE '%setup_completed%'
  LOOP EXECUTE format('ALTER TABLE socialu.student_profiles DROP CONSTRAINT %I',c.conname); END LOOP;
  ALTER TABLE socialu.student_profiles ADD CONSTRAINT student_profiles_setup_required
    CHECK(NOT setup_completed OR(photo_id IS NOT NULL AND major IS NOT NULL AND btrim(major)<>'' AND class_year IS NOT NULL));
END $$;
