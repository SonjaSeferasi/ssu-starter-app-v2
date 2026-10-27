-- SRS-211.1 (UR-211) display the sender's name with each message. Task #830.
-- Replaces public.socialu_conversation_messages (from 20261026140100_chat_emoji_in_history.sql) so the history also
-- returns "senders": the name (display name, or full name) and username of each sender of the returned messages,
-- of both students in a private conversation, and of each current group member (so live messages from members who
-- have not posted yet can be named too). The messages themselves are returned exactly as before.
-- CREATE OR REPLACE keeps the existing grants (service_role only). Nothing else changes.
-- Apply once after 20261026140100_chat_emoji_in_history.sql.

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
  -- The latest 50 successfully sent text and emoji messages the student may read, returned oldest first.
  -- can_read_message also limits group members to messages from their membership period.
  -- Fields match the live message_created event so the page can merge both without duplicates.
  WITH recent AS (
    SELECT msg.message_id, msg.conversation_id, msg.sender_id, msg.kind, msg.text_content, msg.sent_at
      FROM socialu.messages msg
     WHERE msg.conversation_id = p_conversation_id AND msg.kind IN ('text', 'emoji') AND msg.status = 'sent'
       AND socialu.can_read_message(me, msg.message_id)
     ORDER BY msg.sent_at DESC, msg.message_id DESC LIMIT 50
  )
  SELECT jsonb_build_object('student_id', me::text, 'kind', c.kind, 'role', my_role, 'member_count', members,
      'messages', (SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', m.message_id::text, 'conversation_id', m.conversation_id::text, 'sender_id', m.sender_id::text,
          'text', m.text_content, 'sent_at', m.sent_at)
          || CASE WHEN m.kind = 'text' THEN '{}'::jsonb ELSE jsonb_build_object('kind', m.kind) END
          ORDER BY m.sent_at, m.message_id), '[]'::jsonb) FROM recent m),
      -- SRS-211.1: who sent each message, keyed by student ID.
      'senders', (SELECT coalesce(jsonb_object_agg(s.student_id::text, jsonb_build_object(
          'name', coalesce(sp.display_name, s.full_name), 'username', s.username)), '{}'::jsonb)
        FROM socialu.students s LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
        WHERE s.student_id IN (SELECT r.sender_id FROM recent r)
           OR (c.kind = 'private' AND s.student_id IN (c.private_student_low, c.private_student_high))
           OR (c.kind = 'group' AND s.student_id IN (SELECT gm.student_id FROM socialu.group_memberships gm
                                                      WHERE gm.conversation_id = c.conversation_id AND gm.left_at IS NULL))))
    INTO result;
  RETURN result;
END;
$$;

NOTIFY pgrst, 'reload schema';
