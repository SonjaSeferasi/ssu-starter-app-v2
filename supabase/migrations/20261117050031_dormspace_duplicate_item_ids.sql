-- SRS-500.5 / #1214: compare catalog identity, not its JSON spelling.
-- Preserve the existing bridge's authorization, optimistic locking and rollback.
DO $patch$
DECLARE
  definition text := replace(pg_get_functiondef('public.socialu_dorm(text,uuid,text,jsonb)'::regprocedure),chr(13),'');
  old_block text := $old$IF (SELECT count(*) <> count(DISTINCT x->>'itemId') FROM jsonb_array_elements(p_payload->'placements') x) THEN
      RAISE EXCEPTION 'Each item can only be placed once.' USING ERRCODE = '22023';
    END IF;
    BEGIN$old$;
  new_block text := $new$BEGIN
      IF (SELECT count(*) <> count(DISTINCT (x->>'itemId')::BIGINT) FROM jsonb_array_elements(p_payload->'placements') x) THEN
        RAISE EXCEPTION 'Each item can only be placed once.' USING ERRCODE = '22023';
      END IF;$new$;
BEGIN
  IF strpos(definition,old_block)>0 THEN
    EXECUTE replace(definition,old_block,new_block);
  ELSIF strpos(definition,new_block)=0 THEN
    RAISE EXCEPTION 'Dorm save validation changed; review the duplicate ID migration';
  END IF;
END;
$patch$;
