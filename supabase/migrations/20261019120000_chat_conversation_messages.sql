-- SRS-201.2 (UR-201): display a sent text message within the conversation.
-- Task #317: retrieve the saved text messages of a conversation when a participant opens it.
-- Additive only: one new read-only, server-only function; no table, policy, or existing function changes.
-- Apply once after 20261012120000_chat_send_text_message.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required (from public.socialu_require_student)
--   SC404 conversation not available (missing and forbidden look the same, SRS-213.1)

CREATE FUNCTION public.socialu_conversation_messages(p_auth_id UUID, p_conversation_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- The same participant check as sending (#299).
  IF NOT socialu.is_current_participant(p_conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  -- The latest 50 successfully sent text messages the student may read, returned oldest first.
  -- can_read_message also limits group members to messages from their membership period.
  -- Fields match the live message_created event so the page can merge both without duplicates.
  SELECT jsonb_build_object('student_id', me::text, 'messages', coalesce(jsonb_agg(jsonb_build_object(
      'id', m.message_id::text, 'conversation_id', m.conversation_id::text, 'sender_id', m.sender_id::text,
      'text', m.text_content, 'sent_at', m.sent_at) ORDER BY m.sent_at, m.message_id), '[]'::jsonb))
    INTO result
    FROM (SELECT msg.message_id, msg.conversation_id, msg.sender_id, msg.text_content, msg.sent_at
            FROM socialu.messages msg
           WHERE msg.conversation_id = p_conversation_id AND msg.kind = 'text' AND msg.status = 'sent'
             AND socialu.can_read_message(me, msg.message_id)
           ORDER BY msg.sent_at DESC, msg.message_id DESC LIMIT 50) m;
  RETURN result;
END;
$$;

-- Server-only, like socialu_send_message: browsers cannot call it directly.
REVOKE ALL ON FUNCTION public.socialu_conversation_messages(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_conversation_messages(UUID, BIGINT) TO service_role;

NOTIFY pgrst, 'reload schema';
