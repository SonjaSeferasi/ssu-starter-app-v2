-- SRS-500.11 / #1216: ownership and furniture eligibility are different rules.
DO $patch$
DECLARE
  definition text := replace(pg_get_functiondef('socialu.validate_placement()'::regprocedure),chr(13),'');
  old_line text := $old$SELECT * INTO f FROM socialu.item_footprints WHERE item_id=NEW.item_id;$old$;
  new_line text := $new$SELECT * INTO f FROM socialu.item_footprints WHERE item_id=NEW.item_id;
  IF NOT FOUND THEN
    IF NOT EXISTS (SELECT 1 FROM socialu.owned_items WHERE student_id=NEW.owner_id AND item_id=NEW.item_id) THEN
      RAISE EXCEPTION 'You can only use items you own.' USING ERRCODE='22023';
    END IF;
    RAISE EXCEPTION 'Wall colors and floor styles cannot be placed as furniture.' USING ERRCODE='22023';
  END IF;$new$;
BEGIN
  IF strpos(definition,new_line)>0 THEN RETURN;
  ELSIF strpos(definition,old_line)>0 THEN EXECUTE replace(definition,old_line,new_line);
  ELSE RAISE EXCEPTION 'Dorm placement trigger changed; review the placement feedback migration';
  END IF;
END;
$patch$;
