-- SRS-500.13 / SRS-500.14 / #1215: omission keeps the saved choice;
-- explicit JSON null continues to request the existing default/reset behavior.
DO $patch$
DECLARE
  definition text := replace(pg_get_functiondef('public.socialu_dorm(text,uuid,text,jsonb)'::regprocedure),chr(13),'');
  old_update text := $old$UPDATE dorms SET wall_item_id = (p_payload->>'wallItemId')::BIGINT,
                       floor_item_id = (p_payload->>'floorItemId')::BIGINT$old$;
  new_update text := $new$UPDATE dorms SET wall_item_id = CASE WHEN p_payload ? 'wallItemId' THEN (p_payload->>'wallItemId')::BIGINT ELSE d.wall_item_id END,
                       floor_item_id = CASE WHEN p_payload ? 'floorItemId' THEN (p_payload->>'floorItemId')::BIGINT ELSE d.floor_item_id END$new$;
BEGIN
  IF strpos(definition,old_update)>0 THEN EXECUTE replace(definition,old_update,new_update);
  ELSIF strpos(definition,new_update)=0 THEN
    RAISE EXCEPTION 'Dorm appearance save changed; review the omitted appearance migration';
  END IF;
END;
$patch$;
