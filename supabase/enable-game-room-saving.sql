-- Game Room account saving. Preserves tables, accounts, avatars and catalog prices.
-- Apply after the account integration.
BEGIN;
-- SRS-601.1-.7, 607.1, 608.1-.6, 610.1, 611.1.
-- Uses existing tables; no catalog prices, face seeds, rewards or new tables.
-- Apply after the account integration. This file is not a database reset.
CREATE OR REPLACE FUNCTION public.socialu_game_room(
  p_action TEXT, p_auth_id UUID, p_position TEXT DEFAULT NULL,
  p_outfit_id TEXT DEFAULT NULL, p_face_id TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, socialu, pg_temp AS $$
DECLARE
  profile JSONB;
  student BIGINT;
  initial_outfit BIGINT;
  initial_face BIGINT;
  avatar socialu.student_avatars%ROWTYPE;
BEGIN
  -- Reuses provider verification, approved university, active-account and linkage checks.
  -- socialu_account locks the provider and student rows for concurrent operations.
  profile := public.socialu_account('read', p_auth_id);
  IF profile IS NULL THEN RAISE EXCEPTION 'Linked account required' USING ERRCODE = '42501'; END IF;
  student := (profile->>'id')::BIGINT;
  IF p_action IN ('read_preferences', 'save_preferences') THEN
    IF p_action = 'save_preferences' THEN
      IF p_position IS NULL OR p_position NOT IN ('side', 'bottom') THEN
        RAISE EXCEPTION 'Invalid navigation position' USING ERRCODE = '22023';
      END IF;
      INSERT INTO socialu.student_preferences(student_id, navigation_position) VALUES (student, p_position)
      ON CONFLICT (student_id) DO UPDATE SET navigation_position = EXCLUDED.navigation_position;
    END IF;
    RETURN jsonb_build_object('position', COALESCE((SELECT navigation_position FROM socialu.student_preferences WHERE student_id = student), 'side'));
  END IF;
  IF p_action NOT IN ('read', 'save_avatar') THEN RAISE EXCEPTION 'Invalid operation' USING ERRCODE = '22023'; END IF;

  -- Only an explicitly configured initial complete outfit can be granted without a purchase.
  SELECT item_id INTO initial_outfit FROM socialu.catalog_items WHERE is_initial_outfit AND kind = 'outfit';
  SELECT face_id INTO initial_face FROM socialu.default_faces WHERE is_initial;
  IF initial_outfit IS NOT NULL THEN
    INSERT INTO socialu.owned_items(student_id, item_id) VALUES (student, initial_outfit) ON CONFLICT DO NOTHING;
  END IF;
  IF initial_outfit IS NOT NULL AND initial_face IS NOT NULL THEN
    INSERT INTO socialu.student_avatars(student_id, outfit_id, default_face_id)
    VALUES (student, initial_outfit, initial_face) ON CONFLICT DO NOTHING;
  END IF;
  SELECT * INTO avatar FROM socialu.student_avatars WHERE student_id = student;
  IF p_action = 'save_avatar' THEN
    IF p_outfit_id IS NULL OR p_outfit_id !~ '^[0-9]+$' OR (p_face_id IS NOT NULL AND p_face_id !~ '^[0-9]+$') THEN
      RAISE EXCEPTION 'Invalid appearance' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM socialu.owned_items o JOIN socialu.catalog_items c USING(item_id)
        WHERE o.student_id = student AND o.item_id = p_outfit_id::BIGINT AND c.kind = 'outfit') THEN
      RAISE EXCEPTION 'Outfit not owned' USING ERRCODE = '42501';
    END IF;
    IF p_face_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM socialu.default_faces WHERE face_id = p_face_id::BIGINT) THEN
      RAISE EXCEPTION 'Face not available' USING ERRCODE = '42501';
    END IF;
    IF p_face_id IS NULL AND avatar.photo_face_id IS NULL THEN
      RAISE EXCEPTION 'Choose a face' USING ERRCODE = '22023';
    END IF;
    INSERT INTO socialu.student_avatars(student_id, outfit_id, default_face_id, photo_face_id)
    VALUES (student, p_outfit_id::BIGINT, p_face_id::BIGINT, CASE WHEN p_face_id IS NULL THEN avatar.photo_face_id ELSE NULL END)
    ON CONFLICT (student_id) DO UPDATE SET outfit_id = EXCLUDED.outfit_id,
      default_face_id = EXCLUDED.default_face_id, photo_face_id = EXCLUDED.photo_face_id;
  END IF;
  RETURN jsonb_build_object(
    'appearance', (SELECT jsonb_build_object('outfitId', outfit_id::TEXT, 'faceId', default_face_id::TEXT) FROM socialu.student_avatars WHERE student_id = student),
    'outfits', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', c.item_id::TEXT, 'name', c.name, 'assetKey', c.preview_key) ORDER BY c.item_id)
      FROM socialu.owned_items o JOIN socialu.catalog_items c USING(item_id) WHERE o.student_id = student AND c.kind = 'outfit'), '[]'::JSONB),
    'faces', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', face_id::TEXT, 'assetKey', asset_key, 'initial', is_initial) ORDER BY face_id)
      FROM socialu.default_faces), '[]'::JSONB),
    'activities', COALESCE((SELECT jsonb_agg(jsonb_build_object('code', activity_code, 'name', name, 'description', description, 'included', included) ORDER BY activity_code)
      FROM socialu.activities), '[]'::JSONB));
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_game_room(TEXT, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_game_room(TEXT, UUID, TEXT, TEXT, TEXT) TO service_role;
NOTIFY pgrst, 'reload schema';


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

