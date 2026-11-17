-- SRS-609: reuse private media and photographic-face tables; commit the face atomically.
BEGIN;
CREATE OR REPLACE FUNCTION public.socialu_avatar_photo(
 p_auth_id UUID, p_key TEXT DEFAULT NULL, p_bytes BIGINT DEFAULT NULL, p_crop JSONB DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, socialu, pg_temp AS $photo$
DECLARE profile JSONB; student BIGINT; asset BIGINT; face BIGINT; result JSONB;
BEGIN
 profile := public.socialu_account('read',p_auth_id);
 IF profile IS NULL THEN RAISE EXCEPTION 'Linked account required' USING ERRCODE='42501'; END IF;
 student := (profile->>'id')::BIGINT;
 IF p_key IS NOT NULL THEN
  IF p_key !~ ('^avatar-face/' || p_auth_id::TEXT || '/[0-9a-f-]{36}\.jpg$')
    OR p_bytes IS NULL OR p_bytes NOT BETWEEN 1 AND 500000
    OR p_crop IS NULL OR jsonb_typeof(p_crop) <> 'object'
    OR jsonb_typeof(p_crop->'x') IS DISTINCT FROM 'number' OR jsonb_typeof(p_crop->'y') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_crop->'width') IS DISTINCT FROM 'number' OR jsonb_typeof(p_crop->'height') IS DISTINCT FROM 'number'
    OR (p_crop->>'x')::NUMERIC < 0 OR (p_crop->>'y')::NUMERIC < 0
    OR (p_crop->>'width')::NUMERIC <= 0 OR (p_crop->>'height')::NUMERIC <= 0
    OR (p_crop->>'x')::NUMERIC + (p_crop->>'width')::NUMERIC > 1
    OR (p_crop->>'y')::NUMERIC + (p_crop->>'height')::NUMERIC > 1
  THEN RAISE EXCEPTION 'Invalid photograph' USING ERRCODE='22023'; END IF;
  PERFORM public.socialu_game_room('read',p_auth_id);
  IF NOT EXISTS (SELECT 1 FROM socialu.student_avatars WHERE student_id=student) THEN
    RAISE EXCEPTION 'Choose an available outfit first' USING ERRCODE='22023'; END IF;
  INSERT INTO socialu.media_assets(owner_id,storage_key,upload_context,mime_type,byte_count)
    VALUES(student,p_key,'avatar_face','image/jpeg',p_bytes) RETURNING asset_id INTO asset;
  INSERT INTO socialu.avatar_photo_faces(student_id,photo_id,crop_x,crop_y,crop_width,crop_height)
    VALUES(student,asset,(p_crop->>'x')::NUMERIC,(p_crop->>'y')::NUMERIC,(p_crop->>'width')::NUMERIC,(p_crop->>'height')::NUMERIC)
    RETURNING face_id INTO face;
  UPDATE socialu.student_avatars SET default_face_id=NULL,photo_face_id=face WHERE student_id=student;
 END IF;
 SELECT jsonb_build_object('id',f.face_id::TEXT,'key',m.storage_key) INTO result
 FROM socialu.student_avatars a JOIN socialu.avatar_photo_faces f ON f.face_id=a.photo_face_id AND f.student_id=a.student_id
 JOIN socialu.media_assets m ON m.asset_id=f.photo_id AND m.owner_id=a.student_id WHERE a.student_id=student;
 RETURN result;
END;
$photo$;
REVOKE ALL ON FUNCTION public.socialu_avatar_photo(UUID,TEXT,BIGINT,JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_avatar_photo(UUID,TEXT,BIGINT,JSONB) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
