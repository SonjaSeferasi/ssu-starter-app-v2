-- SRS-124.1 / #1229: enforce pinned-photo ownership on every board persistence path.
CREATE OR REPLACE FUNCTION socialu.validate_board_photo_references()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE photo jsonb; memory text;
BEGIN
 IF NOT (NEW.look ? 'board') THEN RETURN NEW; END IF;
 IF jsonb_typeof(NEW.look->'board'->'items') IS DISTINCT FROM 'array' THEN
  RAISE EXCEPTION 'Choose a valid board.' USING ERRCODE='22023';
 END IF;
 FOR photo IN SELECT value FROM jsonb_array_elements(NEW.look->'board'->'items') WHERE value->>'kind'='photo'
 LOOP
  memory:=photo->>'memoryId';
  IF jsonb_typeof(photo->'memoryId') IS DISTINCT FROM 'number' OR memory IS NULL OR memory !~ '^[1-9][0-9]*$' THEN
   RAISE EXCEPTION 'Choose an existing photo from your pinned memories, or remove unavailable photo cards.' USING ERRCODE='22023';
  END IF;
  IF memory::numeric>9007199254740991 THEN
   RAISE EXCEPTION 'Choose an existing photo from your pinned memories, or remove unavailable photo cards.' USING ERRCODE='22023';
  END IF;
  -- Hold each referenced row through commit so concurrent removal cannot race validation.
  PERFORM 1 FROM socialu.profile_memories WHERE memory_id=memory::bigint AND student_id=NEW.student_id FOR KEY SHARE;
  IF NOT FOUND THEN
   RAISE EXCEPTION 'Choose an existing photo from your pinned memories, or remove unavailable photo cards.' USING ERRCODE='22023';
  END IF;
 END LOOP;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION socialu.validate_board_photo_references() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS validate_board_photo_references ON socialu.profile_spaces;
CREATE TRIGGER validate_board_photo_references BEFORE INSERT OR UPDATE OF look ON socialu.profile_spaces
 FOR EACH ROW EXECUTE FUNCTION socialu.validate_board_photo_references();
NOTIFY pgrst,'reload schema';
