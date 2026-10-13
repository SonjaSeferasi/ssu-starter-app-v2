-- Requested by Sonja on 13 October 2026: separate face details and shirt/pants colors.
-- Hair and body style remain derived from the existing provided face asset ID.
-- No extra outfits, purchases, rewards, accounts, or tables are created.
BEGIN;
ALTER TABLE socialu.student_avatars ADD COLUMN IF NOT EXISTS customization JSONB NOT NULL DEFAULT '{}'::JSONB;
DO $constraints$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='socialu.student_avatars'::regclass AND conname='avatar_customization_options') THEN
  ALTER TABLE socialu.student_avatars ADD CONSTRAINT avatar_customization_options CHECK (
   jsonb_typeof(customization)='object'
   AND customization - ARRAY['faceStyle','shirtColor','pantsColor'] = '{}'::JSONB
   AND (NOT customization ? 'faceStyle' OR (jsonb_typeof(customization->'faceStyle')='string' AND customization->>'faceStyle' IN ('natural','round-glasses','square-glasses','freckles','glasses-freckles')))
   AND (NOT customization ? 'shirtColor' OR (jsonb_typeof(customization->'shirtColor')='string' AND customization->>'shirtColor' IN ('navy','green','burgundy','cream','purple','black')))
   AND (NOT customization ? 'pantsColor' OR (jsonb_typeof(customization->'pantsColor')='string' AND customization->>'pantsColor' IN ('denim','black','slate','khaki','olive','burgundy')))
  );
 END IF;
END;
$constraints$;

CREATE OR REPLACE FUNCTION public.socialu_avatar_customization(p_auth_id UUID, p_appearance JSONB DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, socialu, pg_temp AS $avatar$
DECLARE result JSONB; profile JSONB; student BIGINT; details JSONB;
BEGIN
 -- Same verified active account/identity lock as the existing Game Room bridge.
 profile := public.socialu_account('read',p_auth_id);
 IF profile IS NULL THEN RAISE EXCEPTION 'Linked account required' USING ERRCODE='42501'; END IF;
 student := (profile->>'id')::BIGINT;
 IF p_appearance IS NULL THEN
  result := public.socialu_game_room('read',p_auth_id);
 ELSE
  IF jsonb_typeof(p_appearance) <> 'object'
     OR jsonb_typeof(p_appearance->'outfitId') IS DISTINCT FROM 'string'
     OR NOT p_appearance ? 'faceId'
     OR jsonb_typeof(p_appearance->'faceId') NOT IN ('string','null')
     OR p_appearance - ARRAY['outfitId','faceId','faceStyle','shirtColor','pantsColor'] <> '{}'::JSONB
     OR jsonb_typeof(p_appearance->'faceStyle') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_appearance->'shirtColor') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_appearance->'pantsColor') IS DISTINCT FROM 'string' THEN
   RAISE EXCEPTION 'Invalid avatar selection' USING ERRCODE='22023';
  END IF;
  -- Ownership and provided face validation remain in the original bridge.
  result := public.socialu_game_room('save_avatar',p_auth_id,NULL,p_appearance->>'outfitId',p_appearance->>'faceId');
  details := jsonb_build_object('faceStyle',p_appearance->>'faceStyle','shirtColor',p_appearance->>'shirtColor','pantsColor',p_appearance->>'pantsColor');
  UPDATE socialu.student_avatars SET customization=details WHERE student_id=student;
 END IF;
 SELECT customization INTO details FROM socialu.student_avatars WHERE student_id=student;
 IF result->'appearance' IS NOT NULL AND result->'appearance' <> 'null'::JSONB THEN
  result := jsonb_set(result,'{appearance}',(result->'appearance') || COALESCE(details,'{}'::JSONB));
 END IF;
 RETURN result;
END;
$avatar$;
REVOKE ALL ON FUNCTION public.socialu_avatar_customization(UUID,JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_avatar_customization(UUID,JSONB) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
