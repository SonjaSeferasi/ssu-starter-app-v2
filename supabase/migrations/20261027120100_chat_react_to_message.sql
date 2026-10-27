-- SRS-210.3 / SRS-210.5 / SRS-210.6 (UR-210) apply, remove and change a reaction. Tasks #807, #814, #818.
-- Adds two server-only functions for the conversation page:
--   public.socialu_react_to_message: a current participant reacts to a message with one emoji from the approved
--     set (20261027120000_chat_reaction_set.sql). Each student has at most one reaction per message (the table's
--     primary key), so reacting again with another emoji replaces it (SRS-210.6).
--   public.socialu_remove_reaction: a student removes their own reaction; nobody else's is touched (SRS-210.5).
-- Both return the message's reactions (each emoji, how many, and whether it is the student's own) and send the
-- same live "reaction_updated" event to each participant who can read the message, through their private
-- Realtime channel (student:<auth uid>), the same way new messages are delivered (#304). The existing
-- realtime.messages policy already limits each student to their own channel.
-- Additive only: two new public functions and two small helpers; no table, policy or existing function changes.
-- Apply once after 20261027120000_chat_reaction_set.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required (from public.socialu_require_student)
--   SC404 conversation not available (missing and forbidden look the same, SRS-213.1)
--   SCR04 message not available (not in this conversation, not sent, not readable, or not a text or emoji message)
--   SCR01 not one of the approved reaction emoji
--   SCR03 private messaging not allowed right now (not friends, or a block), so no new reactions there either

-- The reactions on one message, one entry per emoji with its count, marking the given student's own. The order is
-- fixed (by code point), so every copy is the same; the page shows them in the order of the set.
CREATE FUNCTION socialu.chat_message_reactions(p_message_id BIGINT, p_student_id BIGINT)
RETURNS JSONB LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('emoji', r.emoji, 'count', r.total, 'mine', r.mine) ORDER BY r.emoji COLLATE "C"), '[]'::jsonb)
    FROM (SELECT mr.emoji, count(*) AS total, bool_or(mr.student_id = p_student_id) AS mine
            FROM socialu.message_reactions mr WHERE mr.message_id = p_message_id GROUP BY mr.emoji) r;
$$;

-- Live delivery of a message's reactions to each current participant who may read that message, each with their
-- own reaction marked. realtime.send only warns on failure, so a broadcast problem never undoes the saved change.
CREATE FUNCTION socialu.chat_send_reactions(p_conversation_id BIGINT, p_message_id BIGINT)
RETURNS VOID LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE c socialu.conversations%ROWTYPE; recipient RECORD;
BEGIN
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id;
  FOR recipient IN
    SELECT st.student_id, st.auth_user_id FROM socialu.students st
    WHERE st.auth_user_id IS NOT NULL AND socialu.can_read_message(st.student_id, p_message_id) AND (
      (c.kind = 'private' AND st.student_id IN (c.private_student_low, c.private_student_high))
      OR (c.kind = 'group' AND st.student_id IN (
        SELECT gm.student_id FROM socialu.group_memberships gm
        WHERE gm.conversation_id = c.conversation_id AND gm.left_at IS NULL)))
  LOOP
    PERFORM realtime.send(jsonb_build_object('conversation_id', c.conversation_id::text, 'message_id', p_message_id::text,
      'reactions', socialu.chat_message_reactions(p_message_id, recipient.student_id)),
      'reaction_updated', 'student:' || recipient.auth_user_id::text, true);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION socialu.chat_message_reactions(BIGINT, BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION socialu.chat_send_reactions(BIGINT, BIGINT) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.socialu_react_to_message(p_auth_id UUID, p_conversation_id BIGINT, p_message_id BIGINT, p_emoji TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; c socialu.conversations%ROWTYPE;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- The one participant check every Chat function uses (#299).
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id;
  IF NOT FOUND OR NOT socialu.is_current_participant(c.conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  -- SRS-210.1: only messages the conversation shows (sent text and emoji messages the student may read).
  IF NOT EXISTS (SELECT 1 FROM socialu.messages m WHERE m.message_id = p_message_id AND m.conversation_id = c.conversation_id
      AND m.status = 'sent' AND m.kind IN ('text', 'emoji') AND socialu.can_read_message(me, m.message_id)) THEN
    RAISE EXCEPTION 'Message not available.' USING ERRCODE = 'SCR04';
  END IF;
  -- SRS-210.2 / SRS-210.3: one emoji from the approved set.
  IF NOT EXISTS (SELECT 1 FROM socialu.reaction_options o WHERE o.emoji = p_emoji) THEN
    RAISE EXCEPTION 'Choose a reaction from the list.' USING ERRCODE = 'SCR01';
  END IF;
  -- The same rule as sending in a private conversation.
  IF c.kind = 'private' AND NOT socialu.can_send_private(c.private_student_low, c.private_student_high) THEN
    RAISE EXCEPTION 'Reactions are not available for this conversation.' USING ERRCODE = 'SCR03';
  END IF;

  -- SRS-210.3 / SRS-210.6: add the reaction, or replace the student's existing one. Choosing the same emoji again
  -- changes nothing and sends nothing.
  INSERT INTO socialu.message_reactions AS mr (message_id, student_id, emoji) VALUES (p_message_id, me, p_emoji)
  ON CONFLICT (message_id, student_id) DO UPDATE SET emoji = EXCLUDED.emoji WHERE mr.emoji IS DISTINCT FROM EXCLUDED.emoji;
  IF FOUND THEN PERFORM socialu.chat_send_reactions(c.conversation_id, p_message_id); END IF;

  RETURN jsonb_build_object('conversation_id', c.conversation_id::text, 'message_id', p_message_id::text,
    'reactions', socialu.chat_message_reactions(p_message_id, me));
END;
$$;

CREATE FUNCTION public.socialu_remove_reaction(p_auth_id UUID, p_conversation_id BIGINT, p_message_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; c socialu.conversations%ROWTYPE;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id;
  IF NOT FOUND OR NOT socialu.is_current_participant(c.conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM socialu.messages m WHERE m.message_id = p_message_id AND m.conversation_id = c.conversation_id
      AND m.status = 'sent' AND m.kind IN ('text', 'emoji') AND socialu.can_read_message(me, m.message_id)) THEN
    RAISE EXCEPTION 'Message not available.' USING ERRCODE = 'SCR04';
  END IF;

  -- SRS-210.5: only the student's own reaction. Removing one that is already gone changes nothing and sends nothing.
  DELETE FROM socialu.message_reactions WHERE message_id = p_message_id AND student_id = me;
  IF FOUND THEN PERFORM socialu.chat_send_reactions(c.conversation_id, p_message_id); END IF;

  RETURN jsonb_build_object('conversation_id', c.conversation_id::text, 'message_id', p_message_id::text,
    'reactions', socialu.chat_message_reactions(p_message_id, me));
END;
$$;

-- Server-only, like the other chat functions: browsers cannot call them directly.
REVOKE ALL ON FUNCTION public.socialu_react_to_message(UUID, BIGINT, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_react_to_message(UUID, BIGINT, BIGINT, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.socialu_remove_reaction(UUID, BIGINT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_remove_reaction(UUID, BIGINT, BIGINT) TO service_role;

NOTIFY pgrst, 'reload schema';
