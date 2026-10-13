-- DormSpace application bridge: UR-500, UR-503, UR-504, UR-505, UR-507, UR-508, UR-509.
-- Uses the existing socialu DormSpace tables; their triggers stay the integrity authority.
-- Apply once after the earlier SocialU migrations (it only adds DormSpace objects).

-- PROVISIONAL release data. Room geometry, footprints and overlap compatibility (SRS Appendix B
-- B-05), starter assets (B-16) and the free wall/floor appearances (B-04) are open team decisions.
-- These rows exist so DormSpace is playable; replace them through a later migration once approved.
INSERT INTO socialu.room_surfaces (surface_code, width_cells, height_cells) VALUES
  ('floor', 10, 7),
  ('wall', 10, 5);

-- SRS-500.9: the two cells in front of the room's entrance/exit stay clear.
INSERT INTO socialu.reserved_room_cells (surface_code, x, y) VALUES
  ('floor', 4, 6), ('floor', 5, 6);

-- SRS-503.1: one bed, one window, one desk and one chair as free starter items.
INSERT INTO socialu.catalog_items (kind, name, preview_key, starter_slot) VALUES
  ('furniture', 'Bed', 'bed', 'bed'),
  ('decoration', 'Window', 'window', 'window'),
  ('furniture', 'Desk', 'desk', 'desk'),
  ('furniture', 'Chair', 'chair', 'chair');

INSERT INTO socialu.catalog_items (kind, name, preview_key) VALUES
  ('wall', 'Sage walls', 'wall-sage'),
  ('wall', 'Sky walls', 'wall-sky'),
  ('wall', 'Cream walls', 'wall-cream'),
  ('floor', 'Oak floor', 'floor-oak'),
  ('floor', 'Tile floor', 'floor-tile'),
  ('floor', 'Carpet floor', 'floor-carpet');

INSERT INTO socialu.item_footprints (item_id, surface_code, width_cells, height_cells, overlap_category)
SELECT item_id, f.surface_code, f.w, f.h, f.category
FROM socialu.catalog_items c
JOIN (VALUES ('bed', 'floor', 2, 3, 'bed'), ('window', 'wall', 4, 4, 'window'),
             ('desk', 'floor', 3, 1, 'desk'), ('chair', 'floor', 1, 1, 'seat'))
  AS f(slot, surface_code, w, h, category) ON f.slot = c.starter_slot;

-- SRS-500.10: a chair may be tucked under the desk; no other overlap is permitted.
INSERT INTO socialu.compatible_item_overlaps (item_low, item_high)
SELECT LEAST(d.item_id, c.item_id), GREATEST(d.item_id, c.item_id)
FROM socialu.catalog_items d, socialu.catalog_items c
WHERE d.starter_slot = 'desk' AND c.starter_slot = 'chair';

-- Narrow server-only bridge, like public.socialu_account. The API derives p_auth_id from
-- auth.getUser(token); owners are addressed by username, never by a client-chosen account id.
CREATE FUNCTION public.socialu_dorm(
  p_action TEXT, p_auth_id UUID, p_owner TEXT DEFAULT NULL, p_payload JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = socialu, pg_catalog AS $$
DECLARE
  me BIGINT;
  v_owner BIGINT;
  is_owner BOOLEAN;
  d dorms%ROWTYPE;
  p JSONB;
  note guestbook_notes%ROWTYPE;
  note_text TEXT;
  next_version BIGINT;
BEGIN
  -- Deferred socialu constraint triggers must fire inside this definer context; at commit they
  -- would run as the API role, which has no access to the socialu schema.
  SET CONSTRAINTS ALL IMMEDIATE;
  SELECT s.student_id INTO me FROM students s
    WHERE s.auth_user_id = p_auth_id AND s.is_active AND NOT s.reverification_required;
  IF me IS NULL THEN
    RAISE EXCEPTION 'Create your SocialU profile before opening DormSpace.' USING ERRCODE = '42501';
  END IF;

  -- SRS-507.2 to SRS-507.9: the DormHall lists current friends by mutual acceptance time,
  -- breaking timestamp ties with the stable account identifier. Floors are derived by the client.
  IF p_action = 'hall' THEN
    RETURN jsonb_build_object(
      'me', (SELECT jsonb_build_object('username', username) FROM students WHERE student_id = me),
      'friends', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('username', s.username, 'pictureUrl', NULL)
          ORDER BY f.accepted_at, s.student_id)
        FROM current_friendships f
        JOIN students s ON s.student_id = CASE WHEN f.student_low = me THEN f.student_high ELSE f.student_low END
        WHERE me IN (f.student_low, f.student_high) AND s.is_active), '[]'::jsonb));
  END IF;

  IF p_owner IS NULL OR p_owner = '' THEN
    v_owner := me;
  ELSE
    SELECT student_id INTO v_owner FROM students WHERE username = p_owner AND is_active;
  END IF;
  is_owner := v_owner = me;

  -- SRS-507.13, SRS-507.19, SRS-508.7: owners and current friends only. An unknown username
  -- gets the same denial so the response does not reveal which accounts exist.
  IF v_owner IS NULL OR (NOT is_owner AND NOT are_friends(me, v_owner)) THEN
    IF p_action = 'access' THEN RETURN jsonb_build_object('allowed', false); END IF;
    RAISE EXCEPTION 'You can only visit the dorms of current friends.' USING ERRCODE = '42501';
  END IF;
  IF p_action = 'access' THEN RETURN jsonb_build_object('allowed', true); END IF;

  -- SRS-503.1, SRS-503.4, SRS-505.1, SRS-509.1: first access creates exactly one dorm and grants
  -- the starter items and free appearances once. The account lock serializes concurrent first opens.
  PERFORM 1 FROM students WHERE student_id = v_owner FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM dorms WHERE dorms.owner_id = v_owner) THEN
    INSERT INTO owned_items (student_id, item_id)
      SELECT v_owner, item_id FROM catalog_items
      WHERE starter_slot IS NOT NULL OR (kind IN ('wall', 'floor') AND NOT purchasable AND price_points IS NULL)
      ON CONFLICT DO NOTHING;
    INSERT INTO dorms (owner_id, wall_item_id, floor_item_id)
      VALUES (v_owner,
        (SELECT item_id FROM catalog_items WHERE preview_key = 'wall-sage'),
        (SELECT item_id FROM catalog_items WHERE preview_key = 'floor-oak'));
  END IF;
  SELECT * INTO d FROM dorms WHERE dorms.owner_id = v_owner FOR UPDATE;

  IF p_action = 'open' THEN
    -- SRS-509.2 to SRS-509.5: count a friend's entry once per 24 elapsed hours; never the owner.
    IF NOT is_owner AND NOT EXISTS (SELECT 1 FROM counted_dorm_visits
        WHERE dorm_owner_id = v_owner AND visitor_id = me AND entered_at > clock_timestamp() - INTERVAL '24 hours') THEN
      INSERT INTO counted_dorm_visits (dorm_owner_id, visitor_id, entered_at) VALUES (v_owner, me, clock_timestamp());
    END IF;
  ELSIF p_action = 'save' THEN
    -- SRS-505.8: a save based on a superseded version never overwrites newer saved work.
    IF NOT is_owner THEN
      RAISE EXCEPTION 'Only the dorm owner can change this dorm.' USING ERRCODE = '42501';
    END IF;
    IF (p_payload->>'version')::BIGINT IS DISTINCT FROM d.save_version THEN
      RAISE EXCEPTION 'Your dorm was changed somewhere else. Reload it before decorating again.' USING ERRCODE = 'DS409';
    END IF;
    IF jsonb_typeof(p_payload->'placements') <> 'array' THEN
      RAISE EXCEPTION 'Enter a valid dorm arrangement.' USING ERRCODE = '22023';
    END IF;
    IF (SELECT count(*) <> count(DISTINCT x->>'itemId') FROM jsonb_array_elements(p_payload->'placements') x) THEN
      RAISE EXCEPTION 'Each item can only be placed once.' USING ERRCODE = '22023';
    END IF;
    BEGIN
      UPDATE dorms SET wall_item_id = (p_payload->>'wallItemId')::BIGINT,
                       floor_item_id = (p_payload->>'floorItemId')::BIGINT
        WHERE dorms.owner_id = v_owner;
      DELETE FROM dorm_placements WHERE dorm_placements.owner_id = v_owner;
      FOR p IN SELECT * FROM jsonb_array_elements(p_payload->'placements') LOOP
        INSERT INTO dorm_placements (owner_id, item_id, x, y)
          VALUES (v_owner, (p->>'itemId')::BIGINT, (p->>'x')::INTEGER, (p->>'y')::INTEGER);
      END LOOP;
    EXCEPTION
      WHEN foreign_key_violation THEN
        RAISE EXCEPTION 'You can only use items you own.' USING ERRCODE = '22023';
      WHEN check_violation THEN
        RAISE EXCEPTION 'Placement exceeds room bounds' USING ERRCODE = '22023';
      WHEN invalid_text_representation OR numeric_value_out_of_range THEN
        RAISE EXCEPTION 'Enter a valid dorm arrangement.' USING ERRCODE = '22023';
      WHEN raise_exception THEN
        -- Messages from validate_placement / validate_dorm_appearance name the violated rule.
        RAISE EXCEPTION '%', SQLERRM USING ERRCODE = '22023';
    END;
    UPDATE dorms SET save_version = save_version + 1
      WHERE dorms.owner_id = v_owner RETURNING save_version INTO next_version;
  ELSIF p_action = 'welcome' THEN
    -- SRS-508.4 to SRS-508.6: owner only; at most 500 Unicode code points.
    IF NOT is_owner THEN
      RAISE EXCEPTION 'Only the dorm owner can change the welcome message.' USING ERRCODE = '42501';
    END IF;
    note_text := COALESCE(p_payload->>'text', '');
    IF char_length(note_text) > 500 THEN
      RAISE EXCEPTION 'Welcome messages can contain at most 500 characters.' USING ERRCODE = '22023';
    END IF;
    UPDATE dorms SET welcome_text = CASE WHEN btrim(note_text) = '' THEN 'Welcome! Thanks for coming.' ELSE note_text END
      WHERE dorms.owner_id = v_owner;
  ELSIF p_action IN ('note_add', 'note_edit') THEN
    -- SRS-508.8 to SRS-508.11, SRS-508.16, SRS-508.17.
    note_text := COALESCE(p_payload->>'text', '');
    IF regexp_replace(note_text, '[[:space:]  -​    　﻿]', '', 'g') = '' THEN
      RAISE EXCEPTION 'Write a note before posting.' USING ERRCODE = '22023';
    END IF;
    IF char_length(note_text) > 500 THEN
      RAISE EXCEPTION 'Notes can contain at most 500 characters.' USING ERRCODE = '22023';
    END IF;
    IF p_action = 'note_add' THEN
      IF is_owner THEN
        RAISE EXCEPTION 'Only current friends can leave notes in this guestbook.' USING ERRCODE = '42501';
      END IF;
      INSERT INTO guestbook_notes (dorm_owner_id, author_id, text_content) VALUES (v_owner, me, note_text);
    ELSE
      SELECT * INTO note FROM guestbook_notes WHERE note_id = (p_payload->>'noteId')::BIGINT AND dorm_owner_id = v_owner;
      IF NOT FOUND OR note.author_id <> me THEN
        RAISE EXCEPTION 'Only the note''s author can edit it.' USING ERRCODE = '42501';
      END IF;
      UPDATE guestbook_notes SET text_content = note_text WHERE note_id = note.note_id;
    END IF;
  ELSIF p_action = 'note_delete' THEN
    -- SRS-508.18, SRS-508.19: the dorm owner or the note's author.
    SELECT * INTO note FROM guestbook_notes WHERE note_id = (p_payload->>'noteId')::BIGINT AND dorm_owner_id = v_owner;
    IF NOT FOUND OR (note.author_id <> me AND NOT is_owner) THEN
      RAISE EXCEPTION 'Only the dorm owner or the note''s author can delete it.' USING ERRCODE = '42501';
    END IF;
    DELETE FROM guestbook_notes WHERE note_id = note.note_id;
  ELSIF p_action <> 'guestbook' THEN
    RAISE EXCEPTION 'Unsupported DormSpace operation.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO d FROM dorms WHERE dorms.owner_id = v_owner;

  IF p_action IN ('guestbook', 'welcome', 'note_add', 'note_edit', 'note_delete') THEN
    -- SRS-508.13: newest first; the stable note identifier breaks timestamp ties.
    RETURN jsonb_build_object(
      'isOwner', is_owner, 'canWrite', NOT is_owner,
      'welcome', d.welcome_text,
      'visitCount', (SELECT count(*) FROM counted_dorm_visits WHERE dorm_owner_id = v_owner),
      'notes', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'id', n.note_id::TEXT, 'text', n.text_content, 'author', s.username, 'createdAt', n.created_at,
          'mine', n.author_id = me) ORDER BY n.created_at DESC, n.note_id DESC)
        FROM guestbook_notes n JOIN students s ON s.student_id = n.author_id
        WHERE n.dorm_owner_id = v_owner), '[]'::jsonb));
  END IF;

  RETURN jsonb_build_object(
    'owner', (SELECT username FROM students WHERE student_id = v_owner),
    'isOwner', is_owner,
    'version', d.save_version,
    'wallItemId', d.wall_item_id::TEXT,
    'floorItemId', d.floor_item_id::TEXT,
    'visitCount', (SELECT count(*) FROM counted_dorm_visits WHERE dorm_owner_id = v_owner),
    'placements', COALESCE((SELECT jsonb_agg(jsonb_build_object('itemId', item_id::TEXT, 'x', x, 'y', y) ORDER BY item_id)
      FROM dorm_placements WHERE dorm_placements.owner_id = v_owner), '[]'::jsonb),
    'owned', CASE WHEN is_owner THEN COALESCE((SELECT jsonb_agg(item_id::TEXT ORDER BY item_id)
      FROM owned_items WHERE student_id = v_owner), '[]'::jsonb) ELSE '[]'::jsonb END,
    'catalog', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', c.item_id::TEXT, 'kind', c.kind, 'name', c.name,
        'previewKey', c.preview_key, 'surface', f.surface_code, 'width', f.width_cells, 'height', f.height_cells,
        'overlapCategory', f.overlap_category) ORDER BY c.item_id)
      FROM catalog_items c LEFT JOIN item_footprints f USING (item_id)
      WHERE c.kind <> 'outfit'), '[]'::jsonb),
    'surfaces', COALESCE((SELECT jsonb_agg(jsonb_build_object('code', surface_code, 'width', width_cells, 'height', height_cells))
      FROM room_surfaces), '[]'::jsonb),
    'reserved', COALESCE((SELECT jsonb_agg(jsonb_build_object('surface', surface_code, 'x', x, 'y', y))
      FROM reserved_room_cells), '[]'::jsonb),
    'compatible', COALESCE((SELECT jsonb_agg(jsonb_build_array(item_low::TEXT, item_high::TEXT))
      FROM compatible_item_overlaps), '[]'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_dorm(TEXT, UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_dorm(TEXT, UUID, TEXT, JSONB) TO service_role;
NOTIFY pgrst, 'reload schema';
