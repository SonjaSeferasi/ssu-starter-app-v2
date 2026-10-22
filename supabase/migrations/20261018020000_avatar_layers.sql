-- Layered avatar (documentation/avatar-art/ART_BRIEF.md): skin tone, hair or hijab,
-- top style/colour and trouser style/colour. Adds optional keys to the existing
-- customization JSON; existing avatars and their saved details are unchanged.
BEGIN;
ALTER TABLE socialu.student_avatars DROP CONSTRAINT IF EXISTS avatar_customization_options;
ALTER TABLE socialu.student_avatars ADD CONSTRAINT avatar_customization_options CHECK (
   jsonb_typeof(customization)='object'
   AND customization - ARRAY['faceStyle','shirtColor','pantsColor','skinTone','headStyle','topStyle','topColor','bottomStyle','bottomColor'] = '{}'::JSONB
   AND (NOT customization ? 'faceStyle' OR (jsonb_typeof(customization->'faceStyle')='string' AND customization->>'faceStyle' IN ('natural','round-glasses','square-glasses','freckles','glasses-freckles')))
   AND (NOT customization ? 'shirtColor' OR (jsonb_typeof(customization->'shirtColor')='string' AND customization->>'shirtColor' IN ('navy','green','burgundy','cream','purple','black')))
   AND (NOT customization ? 'pantsColor' OR (jsonb_typeof(customization->'pantsColor')='string' AND customization->>'pantsColor' IN ('denim','black','slate','khaki','olive','burgundy')))
   AND (NOT customization ? 'skinTone' OR (jsonb_typeof(customization->'skinTone')='string' AND customization->>'skinTone' IN ('tone-1','tone-2','tone-3','tone-4','tone-5','tone-6')))
   AND (NOT customization ? 'headStyle' OR (jsonb_typeof(customization->'headStyle')='string' AND customization->>'headStyle' IN ('short-waves','curls','coils','locs','fade','long-waves','ponytail','curly-bob','bob-bangs','braids','auburn-waves','hijab-black','hijab-navy','hijab-sage','hijab-dusty-rose','hijab-cream','hijab-burgundy')))
   AND (NOT customization ? 'topStyle' OR (jsonb_typeof(customization->'topStyle')='string' AND customization->>'topStyle' IN ('hoodie','crewneck','zip-jacket','cardigan')))
   AND (NOT customization ? 'topColor' OR (jsonb_typeof(customization->'topColor')='string' AND customization->>'topColor' IN ('navy','green','burgundy','cream','purple','charcoal')))
   AND (NOT customization ? 'bottomStyle' OR (jsonb_typeof(customization->'bottomStyle')='string' AND customization->>'bottomStyle' IN ('straight-jeans','wide-leg','chinos')))
   AND (NOT customization ? 'bottomColor' OR (jsonb_typeof(customization->'bottomColor')='string' AND customization->>'bottomColor' IN ('light-denim','dark-denim','black','khaki','olive','brown')))
);

CREATE OR REPLACE FUNCTION public.socialu_avatar_customization(p_auth_id UUID, p_appearance JSONB DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, socialu, pg_temp AS $avatar$
DECLARE result JSONB; profile JSONB; student BIGINT; details JSONB; layered TEXT;
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
     OR p_appearance - ARRAY['outfitId','faceId','faceStyle','shirtColor','pantsColor','skinTone','headStyle','topStyle','topColor','bottomStyle','bottomColor'] <> '{}'::JSONB
     OR jsonb_typeof(p_appearance->'faceStyle') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_appearance->'shirtColor') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_appearance->'pantsColor') IS DISTINCT FROM 'string' THEN
   RAISE EXCEPTION 'Invalid avatar selection' USING ERRCODE='22023';
  END IF;
  FOREACH layered IN ARRAY ARRAY['skinTone','headStyle','topStyle','topColor','bottomStyle','bottomColor'] LOOP
   IF p_appearance ? layered AND jsonb_typeof(p_appearance->layered) <> 'string' THEN
    RAISE EXCEPTION 'Invalid avatar selection' USING ERRCODE='22023';
   END IF;
  END LOOP;
  -- Ownership and provided face validation remain in the original bridge.
  result := public.socialu_game_room('save_avatar',p_auth_id,NULL,p_appearance->>'outfitId',p_appearance->>'faceId');
  -- Allowed values are enforced by avatar_customization_options.
  details := jsonb_strip_nulls(jsonb_build_object(
   'faceStyle',p_appearance->>'faceStyle','shirtColor',p_appearance->>'shirtColor','pantsColor',p_appearance->>'pantsColor',
   'skinTone',p_appearance->>'skinTone','headStyle',p_appearance->>'headStyle','topStyle',p_appearance->>'topStyle',
   'topColor',p_appearance->>'topColor','bottomStyle',p_appearance->>'bottomStyle','bottomColor',p_appearance->>'bottomColor'));
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
