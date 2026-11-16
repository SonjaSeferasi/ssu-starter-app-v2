-- SRS-124.1 / #1223: merge the board into the latest look in one transaction.
CREATE OR REPLACE FUNCTION public.socialu_save_profile_board(p_auth_id UUID, p_board JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; latest JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_board IS NULL OR jsonb_typeof(p_board) <> 'object'
    OR jsonb_typeof(p_board->'items') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Choose a valid board.' USING ERRCODE='22023';
  END IF;
  -- Ensure there is a row to lock even for a student's first board save.
  INSERT INTO socialu.profile_spaces(student_id,look)
    VALUES(me,'{"palette":"sage","frame":"rounded","cover":"meadow","layout":"about-first","stickers":[]}'::jsonb)
    ON CONFLICT(student_id) DO NOTHING;
  SELECT look INTO latest FROM socialu.profile_spaces WHERE student_id=me FOR UPDATE;
  -- Reuse existing look validation and the owner-only save contract. The lock
  -- remains held until this RPC transaction ends, including this nested call.
  RETURN public.socialu_profile_space(p_auth_id,'save_look',NULL,
    jsonb_set(latest,'{board}',p_board));
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_save_profile_board(UUID,JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_save_profile_board(UUID,JSONB) TO service_role;
