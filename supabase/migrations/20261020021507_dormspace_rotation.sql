-- Persist quarter turns, with old placements retaining their original orientation.
BEGIN;
ALTER TABLE socialu.dorm_placements ADD COLUMN IF NOT EXISTS rotation SMALLINT NOT NULL DEFAULT 0;
DO $constraint$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='socialu.dorm_placements'::regclass AND conname='dorm_placements_rotation_check') THEN
    ALTER TABLE socialu.dorm_placements ADD CONSTRAINT dorm_placements_rotation_check CHECK (rotation IN (0,90,180,270));
  END IF;
END;
$constraint$;

CREATE OR REPLACE FUNCTION socialu.validate_placement() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, socialu, pg_temp AS $body$
DECLARE f socialu.item_footprints%ROWTYPE; s socialu.room_surfaces%ROWTYPE; w INTEGER; h INTEGER;
BEGIN
  PERFORM 1 FROM socialu.dorms WHERE owner_id=NEW.owner_id FOR UPDATE;
  SELECT * INTO f FROM socialu.item_footprints WHERE item_id=NEW.item_id;
  SELECT * INTO s FROM socialu.room_surfaces WHERE surface_code=f.surface_code;
  IF NEW.rotation NOT IN (0,90,180,270) THEN
    RAISE EXCEPTION 'Choose a rotation of 0, 90, 180 or 270 degrees';
  END IF;
  IF f.surface_code <> 'floor' AND NEW.rotation <> 0 THEN
    RAISE EXCEPTION 'Only floor furniture can rotate';
  END IF;
  w := CASE WHEN NEW.rotation IN (90,270) THEN f.height_cells ELSE f.width_cells END;
  h := CASE WHEN NEW.rotation IN (90,270) THEN f.width_cells ELSE f.height_cells END;
  IF NEW.x+w>s.width_cells OR NEW.y+h>s.height_cells THEN
    RAISE EXCEPTION 'Placement exceeds room bounds';
  END IF;
  IF EXISTS (SELECT 1 FROM socialu.reserved_room_cells WHERE surface_code=f.surface_code
    AND x>=NEW.x AND x<NEW.x+w AND y>=NEW.y AND y<NEW.y+h) THEN
    RAISE EXCEPTION 'Placement blocks a reserved entrance or exit';
  END IF;
  IF EXISTS (SELECT 1 FROM socialu.dorm_placements p JOIN socialu.item_footprints q USING(item_id)
    WHERE p.owner_id=NEW.owner_id AND p.item_id<>NEW.item_id AND q.surface_code=f.surface_code
      AND p.x<NEW.x+w AND NEW.x<p.x+CASE WHEN p.rotation IN (90,270) THEN q.height_cells ELSE q.width_cells END
      AND p.y<NEW.y+h AND NEW.y<p.y+CASE WHEN p.rotation IN (90,270) THEN q.width_cells ELSE q.height_cells END
      AND NOT EXISTS (SELECT 1 FROM socialu.compatible_item_overlaps
        WHERE item_low=LEAST(p.item_id,NEW.item_id) AND item_high=GREATEST(p.item_id,NEW.item_id))) THEN
    RAISE EXCEPTION 'Items are not permitted to overlap';
  END IF;
  RETURN NEW;
END;
$body$;

-- Patch only placement input/output in the existing bridge. Keep the current account, friendship,
-- visit, guestbook and save-conflict logic and its existing execution permissions intact.
-- Fail clearly if the expected bridge has changed, rather than replacing unrelated live work.
DO $patch$
DECLARE
  definition TEXT := replace(pg_get_functiondef('public.socialu_dorm(text,uuid,text,jsonb)'::regprocedure),chr(13),'');
  old_insert TEXT := $old$INSERT INTO dorm_placements (owner_id, item_id, x, y)
          VALUES (v_owner, (p->>'itemId')::BIGINT, (p->>'x')::INTEGER, (p->>'y')::INTEGER);$old$;
  new_insert TEXT := $new$IF p ? 'rotation' THEN
          IF jsonb_typeof(p->'rotation') IS DISTINCT FROM 'number' THEN
            RAISE EXCEPTION 'Choose a rotation of 0, 90, 180 or 270 degrees' USING ERRCODE='22023';
          END IF;
          IF (p->>'rotation')::NUMERIC NOT IN (0,90,180,270) THEN
            RAISE EXCEPTION 'Choose a rotation of 0, 90, 180 or 270 degrees' USING ERRCODE='22023';
          END IF;
        END IF;
        INSERT INTO dorm_placements (owner_id, item_id, x, y, rotation)
          VALUES (v_owner, (p->>'itemId')::BIGINT, (p->>'x')::INTEGER, (p->>'y')::INTEGER,
            COALESCE((p->>'rotation')::NUMERIC::SMALLINT,0));$new$;
  old_output TEXT := $old$jsonb_build_object('itemId', item_id::TEXT, 'x', x, 'y', y)$old$;
  new_output TEXT := $new$jsonb_build_object('itemId', item_id::TEXT, 'x', x, 'y', y, 'rotation', rotation)$new$;
BEGIN
  -- Match the normalized function body on both Windows and Unix checkouts.
  old_insert := replace(old_insert,chr(13),'');
  new_insert := replace(new_insert,chr(13),'');
  IF strpos(definition,old_insert)>0 THEN definition:=replace(definition,old_insert,new_insert);
  ELSIF strpos(definition,new_insert)=0 THEN RAISE EXCEPTION 'DormSpace bridge input changed; review the rotation migration';
  END IF;
  IF strpos(definition,old_output)>0 THEN definition:=replace(definition,old_output,new_output);
  ELSIF strpos(definition,new_output)=0 THEN RAISE EXCEPTION 'DormSpace bridge output changed; review the rotation migration';
  END IF;
  EXECUTE definition;
END;
$patch$;
COMMIT;
