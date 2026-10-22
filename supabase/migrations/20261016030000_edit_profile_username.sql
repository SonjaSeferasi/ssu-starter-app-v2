-- Save the username and profile together: a failed save leaves both unchanged.
-- Relationships and messages reference student_id, so changing a handle preserves them.
CREATE OR REPLACE FUNCTION public.socialu_save_profile_identity(
  p_auth_id UUID, p_username TEXT, p_full_name TEXT, p_display_name TEXT,
  p_major TEXT, p_class_year TEXT, p_bio TEXT,
  p_photo_key TEXT DEFAULT NULL, p_photo_mime TEXT DEFAULT NULL, p_photo_bytes BIGINT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; value TEXT := btrim(p_username);
BEGIN
  me := public.socialu_require_student(p_auth_id);
  PERFORM student_id FROM socialu.students WHERE student_id=me FOR UPDATE;
  PERFORM public.socialu_require_student(p_auth_id);
  IF value IS NULL OR value !~ '^[A-Za-z0-9_.-]{1,50}$' THEN
    RAISE EXCEPTION 'Use 1–50 letters, numbers, periods, underscores, or hyphens for your username (without @).' USING ERRCODE='22023';
  END IF;
  -- The existing unique index is authoritative, including simultaneous claims.
  UPDATE socialu.students SET username=value WHERE student_id=me;
  RETURN public.socialu_save_profile_details(p_auth_id,p_full_name,p_display_name,p_major,p_class_year,p_bio,p_photo_key,p_photo_mime,p_photo_bytes);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_save_profile_identity(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,BIGINT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_save_profile_identity(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,BIGINT) TO service_role;
NOTIFY pgrst,'reload schema';
