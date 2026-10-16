-- Save real/full names separately from optional, rate-limited display names.
-- A wrapper keeps the existing profile RPC available for older clients.
CREATE OR REPLACE FUNCTION public.socialu_save_profile_details(
  p_auth_id UUID, p_full_name TEXT, p_display_name TEXT, p_major TEXT, p_class_year TEXT, p_bio TEXT,
  p_photo_key TEXT DEFAULT NULL, p_photo_mime TEXT DEFAULT NULL, p_photo_bytes BIGINT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; full_name_value TEXT := btrim(p_full_name);
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF full_name_value IS NULL OR length(full_name_value) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Enter your full name (1–100 characters).' USING ERRCODE = '22023';
  END IF;
  -- The existing validation and photo update run in the same transaction.
  -- A rejected display-name change or invalid profile rolls back every change.
  PERFORM public.socialu_save_profile(p_auth_id, p_display_name, p_major, p_class_year, p_bio,
    p_photo_key, p_photo_mime, p_photo_bytes);
  UPDATE socialu.students SET full_name = full_name_value WHERE student_id = me;
  RETURN public.socialu_profile_view(p_auth_id, NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_save_profile_details(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_save_profile_details(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT) TO service_role;
NOTIFY pgrst, 'reload schema';
