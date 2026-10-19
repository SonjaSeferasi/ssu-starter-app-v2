-- SRS-212.5 (UR-212) mark existing messages as read when opening a conversation.
-- Records a socialu.message_reads row for every sent message from another participant that the student may
-- read in this conversation and has not read yet. Calling it again is safe (already-read messages are skipped).
-- The existing validate_read trigger also checks socialu.can_read_message for every row.
-- Additive only: one new server-only function; no table, policy, or existing function changes.
-- Apply once after 20261019190000_chat_unread_status.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required (from public.socialu_require_student)
--   SC404 conversation not available (missing and forbidden look the same, SRS-213.1)

CREATE FUNCTION public.socialu_mark_conversation_read(p_auth_id UUID, p_conversation_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; marked INTEGER;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- The same participant check as sending and reading (#299, SRS-213.1).
  IF NOT socialu.is_current_participant(p_conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  INSERT INTO socialu.message_reads (message_id, student_id)
  SELECT msg.message_id, me FROM socialu.messages msg
   WHERE msg.conversation_id = p_conversation_id AND msg.status = 'sent' AND msg.sender_id <> me
     AND socialu.can_read_message(me, msg.message_id)
     AND NOT EXISTS (SELECT 1 FROM socialu.message_reads r WHERE r.message_id = msg.message_id AND r.student_id = me)
  ON CONFLICT (message_id, student_id) DO NOTHING;
  GET DIAGNOSTICS marked = ROW_COUNT;
  RETURN jsonb_build_object('marked', marked);
END;
$$;

-- Server-only, like the other chat functions: browsers cannot call it directly.
REVOKE ALL ON FUNCTION public.socialu_mark_conversation_read(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_mark_conversation_read(UUID, BIGINT) TO service_role;

NOTIFY pgrst, 'reload schema';
