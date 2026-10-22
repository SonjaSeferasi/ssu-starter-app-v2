-- SRS-203.1 (UR-203), task #460: show the student's group role when a conversation opens.
-- Replaces public.socialu_conversation_messages (from 20261019120000, SRS-201.2) so the same call also returns
-- the conversation kind, the student's current group role, and the group's member count. The message rules are
-- unchanged: same participant check, latest 50 sent text messages the student may read, oldest first.
-- CREATE OR REPLACE keeps the existing grants (service_role only).
-- Apply once after 20261019170000_chat_create_group.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required (from public.socialu_require_student)
--   SC404 conversation not available (missing and forbidden look the same, SRS-213.1)

CREATE OR REPLACE FUNCTION public.socialu_conversation_messages(p_auth_id UUID, p_conversation_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; c socialu.conversations%ROWTYPE; my_role TEXT; members BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- The same participant check as sending (#299).
  IF NOT socialu.is_current_participant(p_conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id;
  -- #460: the role comes from the database, never from the browser.
  IF c.kind = 'group' THEN
    SELECT gm.role INTO my_role FROM socialu.group_memberships gm
     WHERE gm.conversation_id = c.conversation_id AND gm.student_id = me AND gm.left_at IS NULL;
    SELECT count(*) INTO members FROM socialu.group_memberships gm
     WHERE gm.conversation_id = c.conversation_id AND gm.left_at IS NULL;
  END IF;
  -- The latest 50 successfully sent text messages the student may read, returned oldest first.
  -- can_read_message also limits group members to messages from their membership period.
  -- Fields match the live message_created event so the page can merge both without duplicates.
  SELECT jsonb_build_object('student_id', me::text, 'kind', c.kind, 'role', my_role, 'member_count', members,
      'messages', coalesce(jsonb_agg(jsonb_build_object(
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

NOTIFY pgrst, 'reload schema';
