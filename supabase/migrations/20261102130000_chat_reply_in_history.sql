-- SRS-209.5 (UR-209) identify the replied-to message.
-- "The system shall display an indication of the original message associated with a reply."
-- Replaces public.socialu_conversation_messages (from 20261027120200_chat_reactions_in_history.sql) so each
-- reply arrives with the message it answers, which is what the page needs in order to show it. Everything else
-- about the history is unchanged: the same participant check, the same 50 messages, the same senders and
-- reactions.
--
-- The new 'replies' map is keyed by the replying message's ID, in the same shape as 'reactions': messages that
-- are not replies are simply absent, so nothing changes for a conversation without any.
--
-- Each entry carries the target's own sender name rather than relying on the 'senders' map, because the target
-- may be older than the 50 messages loaded and its sender may therefore not appear there.
--
-- SRS-209.6: an entry is included only while the student can still read the target. A reply whose target is out
-- of their reach (sent before they joined the group) keeps its stored relationship in the database, but the page
-- is told nothing about it and shows the reply on its own rather than quoting something they may not see.
-- Additive only: one function replaced; no table, policy or other function changes.
-- Apply once after 20261102120000_chat_send_reply.sql.

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
    SELECT msg.message_id, msg.conversation_id, msg.sender_id, msg.kind, msg.text_content, msg.sent_at,
           msg.reply_to_id
      FROM socialu.messages msg
     WHERE msg.conversation_id = p_conversation_id AND msg.kind IN ('text', 'emoji') AND msg.status = 'sent'
       AND socialu.can_read_message(me, msg.message_id)
     ORDER BY msg.sent_at DESC, msg.message_id DESC LIMIT 50
  )
  -- SRS-202.6: a named group's name (NULL for unnamed groups and private conversations).
  SELECT jsonb_build_object('student_id', me::text, 'kind', c.kind, 'name', c.group_name, 'role', my_role, 'member_count', members,
      'messages', (SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', m.message_id::text, 'conversation_id', m.conversation_id::text, 'sender_id', m.sender_id::text,
          'text', m.text_content, 'sent_at', m.sent_at)
          || CASE WHEN m.kind = 'text' THEN '{}'::jsonb ELSE jsonb_build_object('kind', m.kind) END
          || CASE WHEN m.reply_to_id IS NULL THEN '{}'::jsonb
                  ELSE jsonb_build_object('reply_to_id', m.reply_to_id::text) END
          ORDER BY m.sent_at, m.message_id), '[]'::jsonb) FROM recent m),
      -- SRS-211.1: who sent each message, keyed by student ID.
      'senders', (SELECT coalesce(jsonb_object_agg(s.student_id::text, jsonb_build_object(
          'name', coalesce(sp.display_name, s.full_name), 'username', s.username)), '{}'::jsonb)
        FROM socialu.students s LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
        WHERE s.student_id IN (SELECT r.sender_id FROM recent r)
           OR (c.kind = 'private' AND s.student_id IN (c.private_student_low, c.private_student_high))
           OR (c.kind = 'group' AND s.student_id IN (SELECT gm.student_id FROM socialu.group_memberships gm
                                                      WHERE gm.conversation_id = c.conversation_id AND gm.left_at IS NULL))),
      -- SRS-210.4 (#811): the reactions on the messages above, keyed by message ID (each emoji, how many, and
      -- whether it is the student's own). Messages without reactions are left out.
      'reactions', (SELECT coalesce(jsonb_object_agg(rm.message_id::text, socialu.chat_message_reactions(rm.message_id, me)), '{}'::jsonb)
        FROM recent rm WHERE EXISTS (SELECT 1 FROM socialu.message_reactions mr WHERE mr.message_id = rm.message_id)),
      -- SRS-209.5 (#997): the message each reply answers, keyed by the replying message's ID. Only replies
      -- appear, and only while the student can still read the target (SRS-209.6).
      'replies', (SELECT coalesce(jsonb_object_agg(rr.message_id::text, jsonb_build_object(
            'id', t.message_id::text, 'sender_id', t.sender_id::text,
            'sender_name', coalesce(tp.display_name, ts.full_name),
            'text', t.text_content)
          || CASE WHEN t.kind = 'text' THEN '{}'::jsonb ELSE jsonb_build_object('kind', t.kind) END), '{}'::jsonb)
        FROM recent rr
        JOIN socialu.messages t ON t.message_id = rr.reply_to_id
        JOIN socialu.students ts ON ts.student_id = t.sender_id
        LEFT JOIN socialu.student_profiles tp ON tp.student_id = t.sender_id
        WHERE rr.reply_to_id IS NOT NULL AND socialu.can_read_message(me, t.message_id)))
    INTO result;
  RETURN result;
END;
$$;

NOTIFY pgrst, 'reload schema';
