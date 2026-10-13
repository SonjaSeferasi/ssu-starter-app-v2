-- Approved starter assets; apply after the Game Room bridge.
BEGIN;

-- Approved starter collection: one Campus hoodie and nine provided faces.
-- Preserve existing initial selections, catalog prices and saved avatars.
LOCK TABLE socialu.catalog_items, socialu.default_faces IN SHARE ROW EXCLUSIVE MODE;
DO $starter$
DECLARE selected BIGINT;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM socialu.catalog_items WHERE is_initial_outfit) THEN
   SELECT item_id INTO selected FROM socialu.catalog_items WHERE preview_key='sample-campus' AND kind='outfit' AND NOT purchasable ORDER BY item_id LIMIT 1;
   IF selected IS NULL THEN
     INSERT INTO socialu.catalog_items(kind,name,preview_key,purchasable,is_initial_outfit) VALUES ('outfit','Campus hoodie','sample-campus',false,true);
   ELSE
     UPDATE socialu.catalog_items SET is_initial_outfit=true WHERE item_id=selected;
   END IF;
 END IF;
 INSERT INTO socialu.default_faces(asset_key)
 SELECT k FROM unnest(ARRAY['sample-smile','sample-curls','sample-glasses','sample-crew-cut','sample-side-part','sample-locs','sample-long-waves','sample-ponytail','sample-curly-bob']) AS approved(k)
 WHERE NOT EXISTS (SELECT 1 FROM socialu.default_faces f WHERE f.asset_key=k);
 IF NOT EXISTS (SELECT 1 FROM socialu.default_faces WHERE is_initial) THEN
   SELECT face_id INTO selected FROM socialu.default_faces WHERE asset_key='sample-smile' ORDER BY face_id LIMIT 1;
   UPDATE socialu.default_faces SET is_initial=true WHERE face_id=selected;
 END IF;
END;
$starter$;

COMMIT;
