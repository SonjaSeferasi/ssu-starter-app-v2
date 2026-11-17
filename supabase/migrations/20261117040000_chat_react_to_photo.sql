-- SRS-210.1 (#1262): a photo message can be reacted to, changed and un-reacted, exactly as a text or
-- emoji message can.
--
-- SRS-210.1 says a participant may select "an existing message" for a reaction and puts no condition on its
-- kind. These two functions were written on 26 October against the two kinds that existed then; photos
-- arrived afterwards under SRS-201.6 and SRS-201.7 and did not revisit them, so reacting to a photo answered
-- SCR04 "Message not available".
--
-- Only the two write paths need widening. The history already returns reactions for photos: its 'reactions'
-- field is built from the same 'recent' rows the messages come from, and that filter was widened to include
-- photos by 20261112120000. The original filter in 20261027120200 has been superseded three times over and
-- is not what runs.
--
-- Neither function calls socialu.is_blocked or realtime.send directly -- broadcasting goes through
-- socialu.chat_send_reactions, which is not replaced here -- so neither the school-community rewrite nor the
-- session-revocation rewrite has anything to lose.

CREATE OR REPLACE FUNCTION public.socialu_react_to_message(p_auth_id UUID, p_conversation_id BIGINT, p_message_id BIGINT, p_emoji TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; c socialu.conversations%ROWTYPE;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- The one participant check every Chat function uses (#299).
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id;
  IF NOT FOUND OR NOT socialu.is_current_participant(c.conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  -- SRS-210.1: only messages the conversation shows (sent text, emoji and photo messages the student may
  -- read). #1262: a photo is an existing message, and SRS-210.1 puts no condition on the kind.
  IF NOT EXISTS (SELECT 1 FROM socialu.messages m WHERE m.message_id = p_message_id AND m.conversation_id = c.conversation_id
      AND m.status = 'sent' AND m.kind IN ('text', 'emoji', 'photo') AND socialu.can_read_message(me, m.message_id)
      -- #1106: a removed photo is a tombstone; there is nothing there to react to.
      AND NOT EXISTS (SELECT 1 FROM socialu.deleted_messages d WHERE d.message_id = m.message_id)) THEN
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

-- SRS-210.5: removing a reaction admits photos on the same terms, but NOT the tombstone rule above.
-- Someone who reacted to a photo before it was removed must still be able to take that reaction back.
CREATE OR REPLACE FUNCTION public.socialu_remove_reaction(p_auth_id UUID, p_conversation_id BIGINT, p_message_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; c socialu.conversations%ROWTYPE;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id;
  IF NOT FOUND OR NOT socialu.is_current_participant(c.conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM socialu.messages m WHERE m.message_id = p_message_id AND m.conversation_id = c.conversation_id
      AND m.status = 'sent' AND m.kind IN ('text', 'emoji', 'photo') AND socialu.can_read_message(me, m.message_id)) THEN
    RAISE EXCEPTION 'Message not available.' USING ERRCODE = 'SCR04';
  END IF;

  -- SRS-210.5: only the student's own reaction. Removing one that is already gone changes nothing and sends nothing.
  DELETE FROM socialu.message_reactions WHERE message_id = p_message_id AND student_id = me;
  IF FOUND THEN PERFORM socialu.chat_send_reactions(c.conversation_id, p_message_id); END IF;

  RETURN jsonb_build_object('conversation_id', c.conversation_id::text, 'message_id', p_message_id::text,
    'reactions', socialu.chat_message_reactions(p_message_id, me));
END;
$$;

-- Server-only, like every other chat function. CREATE OR REPLACE keeps the existing grants; these are
-- restated so the migration stands on its own if replayed against a fresh database.
REVOKE ALL ON FUNCTION public.socialu_react_to_message(UUID, BIGINT, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_react_to_message(UUID, BIGINT, BIGINT, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.socialu_remove_reaction(UUID, BIGINT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_remove_reaction(UUID, BIGINT, BIGINT) TO service_role;

NOTIFY pgrst, 'reload schema';
