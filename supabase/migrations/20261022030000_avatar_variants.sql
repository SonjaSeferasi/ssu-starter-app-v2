-- Expand complete avatars with three hair/wrap choices and two face choices per outfit.
-- All old ids and saved selections remain valid; the existing RPC already stores avatarId.
BEGIN;
ALTER TABLE socialu.student_avatars DROP CONSTRAINT IF EXISTS avatar_customization_options;
ALTER TABLE socialu.student_avatars ADD CONSTRAINT avatar_customization_options CHECK (
   jsonb_typeof(customization)='object'
   AND customization - ARRAY['faceStyle','shirtColor','pantsColor','skinTone','headStyle','topStyle','topColor','bottomStyle','bottomColor','avatarId'] = '{}'::JSONB
   AND (NOT customization ? 'faceStyle' OR (jsonb_typeof(customization->'faceStyle')='string' AND customization->>'faceStyle' IN ('natural','round-glasses','square-glasses','freckles','glasses-freckles')))
   AND (NOT customization ? 'shirtColor' OR (jsonb_typeof(customization->'shirtColor')='string' AND customization->>'shirtColor' IN ('navy','green','burgundy','cream','purple','black')))
   AND (NOT customization ? 'pantsColor' OR (jsonb_typeof(customization->'pantsColor')='string' AND customization->>'pantsColor' IN ('denim','black','slate','khaki','olive','burgundy')))
   AND (NOT customization ? 'skinTone' OR (jsonb_typeof(customization->'skinTone')='string' AND customization->>'skinTone' IN ('tone-1','tone-2','tone-3','tone-4','tone-5','tone-6')))
   AND (NOT customization ? 'headStyle' OR (jsonb_typeof(customization->'headStyle')='string' AND customization->>'headStyle' IN ('short-waves','curls','coils','locs','fade','long-waves','ponytail','curly-bob','bob-bangs','braids','auburn-waves','hijab-black','hijab-navy','hijab-sage','hijab-dusty-rose','hijab-cream','hijab-burgundy')))
   AND (NOT customization ? 'topStyle' OR (jsonb_typeof(customization->'topStyle')='string' AND customization->>'topStyle' IN ('hoodie','crewneck','zip-jacket','cardigan')))
   AND (NOT customization ? 'topColor' OR (jsonb_typeof(customization->'topColor')='string' AND customization->>'topColor' IN ('navy','green','burgundy','cream','purple','charcoal')))
   AND (NOT customization ? 'bottomStyle' OR (jsonb_typeof(customization->'bottomStyle')='string' AND customization->>'bottomStyle' IN ('straight-jeans','wide-leg','chinos')))
   AND (NOT customization ? 'bottomColor' OR (jsonb_typeof(customization->'bottomColor')='string' AND customization->>'bottomColor' IN ('light-denim','dark-denim','black','khaki','olive','brown')))
   AND (NOT customization ? 'avatarId' OR (jsonb_typeof(customization->'avatarId')='string' AND customization->>'avatarId' IN ('campus-male-1','campus-male-2','campus-male-3','campus-male-4','campus-male-5','campus-male-6','campus-female-1','campus-female-2','campus-female-3','campus-female-4','campus-female-5','campus-female-6','campus-hijab-1','campus-hijab-2','campus-hijab-3','campus-hijab-4','campus-hijab-5','campus-hijab-6') OR (jsonb_typeof(customization->'avatarId')='string' AND customization->>'avatarId' ~ '^campus-v4-(male|female|hijab)-[1-6]-[1-3]-(natural|glasses)$')))
);

NOTIFY pgrst,'reload schema';
COMMIT;
