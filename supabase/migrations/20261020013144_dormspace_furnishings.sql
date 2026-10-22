-- Eight included DormSpace furnishings. Existing rooms keep their layout and save version.
-- Apply after the DormSpace and starter ownership validation migrations.
BEGIN;

-- Take account locks before room locks, matching the application, so the backfill's ownership
-- foreign keys cannot deadlock with a concurrent room save holding an account row lock.
LOCK TABLE socialu.students IN EXCLUSIVE MODE;
-- Serialize reruns (preview_key is not unique) and first room creation during the backfill.
LOCK TABLE socialu.dorms, socialu.catalog_items IN SHARE ROW EXCLUSIVE MODE;

INSERT INTO socialu.catalog_items (kind, name, preview_key)
SELECT additions.kind, additions.name, additions.preview_key
FROM (VALUES
  ('furniture', 'Sofa', 'dorm-sofa'),
  ('furniture', 'Armchair', 'dorm-armchair'),
  ('furniture', 'Bookshelf', 'dorm-bookshelf'),
  ('furniture', 'Wardrobe', 'dorm-wardrobe'),
  ('furniture', 'Coffee table', 'dorm-coffee-table'),
  ('furniture', 'Nightstand', 'dorm-nightstand'),
  ('decoration', 'Plant', 'dorm-plant'),
  ('decoration', 'Rug', 'dorm-rug')
) AS additions(kind, name, preview_key)
WHERE NOT EXISTS (SELECT 1 FROM socialu.catalog_items c WHERE c.preview_key = additions.preview_key);

INSERT INTO socialu.item_footprints (item_id, surface_code, width_cells, height_cells, overlap_category)
SELECT c.item_id, 'floor', f.width_cells, f.height_cells, f.category
FROM socialu.catalog_items c JOIN (VALUES
  ('dorm-sofa', 3, 2, 'seat'),
  ('dorm-armchair', 2, 1, 'seat'),
  ('dorm-bookshelf', 2, 1, 'storage'),
  ('dorm-wardrobe', 2, 1, 'storage'),
  ('dorm-coffee-table', 2, 1, 'table'),
  ('dorm-nightstand', 1, 1, 'table'),
  ('dorm-plant', 1, 1, 'plant'),
  ('dorm-rug', 3, 2, 'rug')
) AS f(preview_key, width_cells, height_cells, category) ON f.preview_key = c.preview_key
ON CONFLICT (item_id) DO NOTHING;

-- A rug goes under floor furniture. All other overlap and doorway rules remain authoritative.
INSERT INTO socialu.compatible_item_overlaps (item_low, item_high)
SELECT LEAST(rug.item_id, other.item_id), GREATEST(rug.item_id, other.item_id)
FROM socialu.item_footprints rug
JOIN socialu.catalog_items c ON c.item_id = rug.item_id AND c.preview_key = 'dorm-rug'
JOIN socialu.item_footprints other ON other.surface_code = 'floor' AND other.item_id <> rug.item_id
ON CONFLICT DO NOTHING;

-- Existing owners receive the collection once without purchases or point transactions.
INSERT INTO socialu.owned_items (student_id, item_id)
SELECT d.owner_id, c.item_id FROM socialu.dorms d CROSS JOIN socialu.catalog_items c
WHERE c.preview_key IN ('dorm-sofa', 'dorm-armchair', 'dorm-bookshelf', 'dorm-wardrobe',
  'dorm-coffee-table', 'dorm-nightstand', 'dorm-plant', 'dorm-rug')
  AND NOT c.purchasable AND c.price_points IS NULL
ON CONFLICT DO NOTHING;

-- New owners get the same collection in the transaction that creates their first dorm.
-- This internal trigger introduces no client-callable grant endpoint.
CREATE OR REPLACE FUNCTION socialu.grant_included_dorm_furnishings() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, socialu, pg_temp AS $body$
BEGIN
  INSERT INTO socialu.owned_items (student_id, item_id)
  SELECT NEW.owner_id, c.item_id FROM socialu.catalog_items c
  WHERE c.preview_key IN ('dorm-sofa', 'dorm-armchair', 'dorm-bookshelf', 'dorm-wardrobe',
    'dorm-coffee-table', 'dorm-nightstand', 'dorm-plant', 'dorm-rug')
    AND NOT c.purchasable AND c.price_points IS NULL
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$body$;
REVOKE ALL ON FUNCTION socialu.grant_included_dorm_furnishings() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS grant_included_dorm_furnishings ON socialu.dorms;
CREATE TRIGGER grant_included_dorm_furnishings AFTER INSERT ON socialu.dorms
FOR EACH ROW EXECUTE FUNCTION socialu.grant_included_dorm_furnishings();

COMMIT;
