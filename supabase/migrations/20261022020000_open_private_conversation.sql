-- SocialU | Message a friend from their profile (SRS-113.17, SRS-200.3), owner LN.
-- Apply once after 20261012120000_chat_send_text_message.sql.
-- Returns the private conversation for the caller and a current friend, creating it the first time.
-- Error codes match lib/chat-access.ts: SC403 not friends (or blocked), 42501 account required.

CREATE OR REPLACE FUNCTION public.socialu_open_private_conversation(p_auth_id UUID, p_username TEXT) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; target BIGINT; v_id BIGINT;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  target := public.socialu_profile_target(me, p_username);
  IF target = me OR NOT socialu.are_friends(me, target) THEN
    RAISE EXCEPTION 'You can message a student after they accept your friend request.' USING ERRCODE = 'SC403';
  END IF;
  SELECT conversation_id INTO v_id FROM socialu.conversations
   WHERE kind = 'private' AND private_student_low = LEAST(me, target) AND private_student_high = GREATEST(me, target);
  IF NOT FOUND THEN
    INSERT INTO socialu.conversations (kind, created_by, private_student_low, private_student_high)
    VALUES ('private', me, LEAST(me, target), GREATEST(me, target))
    ON CONFLICT (private_student_low, private_student_high) DO NOTHING
    RETURNING conversation_id INTO v_id;
    -- Another tab created it at the same moment.
    IF v_id IS NULL THEN
      SELECT conversation_id INTO v_id FROM socialu.conversations
       WHERE private_student_low = LEAST(me, target) AND private_student_high = GREATEST(me, target);
    END IF;
    -- See the GOTCHA in 20261008000200_feed_functions.sql: deferred constraint triggers must fire now.
    SET CONSTRAINTS ALL IMMEDIATE;
  END IF;
  RETURN v_id::text;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_open_private_conversation(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_open_private_conversation(UUID, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
