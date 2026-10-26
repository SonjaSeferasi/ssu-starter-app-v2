-- SRS-201.8 (UR-201) send an emoji. Task #795.
-- A conversation participant sends one emoji as its own message (kind 'emoji'), with the same participant,
-- friendship/consent and block checks as text messages, and the same live delivery.
-- Additive only: one new server-only function; no table, policy, or existing function changes.
-- Apply once after 20261026130200_chat_decline_group_invitation.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required (from public.socialu_require_student)
--   SC404 conversation not available (missing and forbidden look the same, SRS-213.1)
--   SC403 private messaging not allowed right now (not friends, or a block)
--   SCE01 not a single emoji (the API checks the exact emoji; the database refuses text, spaces and long values)

CREATE FUNCTION public.socialu_send_emoji(p_auth_id UUID, p_conversation_id BIGINT, p_emoji TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; c socialu.conversations%ROWTYPE; m socialu.messages%ROWTYPE; payload JSONB; recipient UUID;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- The one participant check every Chat function uses (#299).
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id;
  IF NOT FOUND OR NOT socialu.is_current_participant(c.conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  IF p_emoji IS NULL OR p_emoji = '' OR char_length(p_emoji) > 16 OR p_emoji ~ '[[:space:]]' OR p_emoji ~ '[A-Za-z0-9]' THEN
    RAISE EXCEPTION 'Choose an emoji to send.' USING ERRCODE = 'SCE01';
  END IF;
  -- Same rule as the validate_message trigger, checked first so the API can explain it.
  IF c.kind = 'private' AND NOT socialu.can_send_private(c.private_student_low, c.private_student_high) THEN
    RAISE EXCEPTION 'Messaging is not available for this conversation.' USING ERRCODE = 'SC403';
  END IF;

  INSERT INTO socialu.messages (conversation_id, sender_id, kind, text_content, status, sent_at)
  VALUES (c.conversation_id, me, 'emoji', p_emoji, 'sent', now())
  RETURNING * INTO m;

  -- The same shape as a text message, plus its kind, so the page shows it as an emoji (SRS-201.9).
  payload := jsonb_build_object('id', m.message_id::text, 'conversation_id', m.conversation_id::text,
    'sender_id', m.sender_id::text, 'text', m.text_content, 'sent_at', m.sent_at, 'kind', m.kind);

  -- Live delivery to each current participant's private channel (student:<auth uid>), as for text (#304).
  -- realtime.send only warns on failure, so a broadcast problem never undoes the saved message.
  FOR recipient IN
    SELECT st.auth_user_id FROM socialu.students st
    WHERE st.auth_user_id IS NOT NULL AND (
      (c.kind = 'private' AND st.student_id IN (c.private_student_low, c.private_student_high))
      OR (c.kind = 'group' AND st.student_id IN (
        SELECT gm.student_id FROM socialu.group_memberships gm
        WHERE gm.conversation_id = c.conversation_id AND gm.left_at IS NULL)))
  LOOP
    PERFORM realtime.send(payload, 'message_created', 'student:' || recipient::text, true);
  END LOOP;

  RETURN payload;
END;
$$;

-- Server-only, like the other chat functions: browsers cannot call it directly.
REVOKE ALL ON FUNCTION public.socialu_send_emoji(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_send_emoji(UUID, BIGINT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
