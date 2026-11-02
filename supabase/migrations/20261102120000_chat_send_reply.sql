-- SRS-209.3 (UR-209) send a reply.
-- "The system shall allow the participant to send the composed reply to the group conversation."
-- Replaces public.socialu_send_message (from 20261012120000_chat_send_text_message.sql) with a fourth
-- parameter, p_reply_to_id, naming the message the reply answers. Everything else about sending is unchanged:
-- the same account check, participant check, length rule, private-messaging rule, insert and broadcast.
--
-- No table change is needed. socialu.messages already has reply_to_id, and the schema already guarantees the
-- hard part of SRS-209.4:
--   FOREIGN KEY (reply_to_id, conversation_id) REFERENCES messages(message_id, conversation_id)
--     - the target must be a message in the SAME conversation; a reply can never point across conversations;
--   CHECK (reply_to_id IS NULL OR reply_to_id <> message_id)
--     - a message can never reply to itself.
-- The checks added here are the ones the schema cannot make: that the sender may actually read the target, and
-- that replies are offered only where UR-209 asks for them.
--
-- The parameter has a DEFAULT, so a caller that sends no reply target still works and an ordinary message is
-- unaffected. The old three-argument function is dropped at the end: leaving both would make a three-argument
-- call ambiguous.
-- Apply once after 20261028120400_chat_transfer_group_ownership.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required       22023 message must be 1-500 characters
--   SC404 conversation not available (missing and forbidden look the same, SRS-213.1)
--   SC403 private messaging not allowed (friendship/consent or block, SRS-200.16)
--   SCP01 the message being replied to is not available to this student
--   SCP02 replies are only available in group conversations (SRS-209.1)

CREATE OR REPLACE FUNCTION public.socialu_send_message(p_auth_id UUID, p_conversation_id BIGINT, p_text TEXT,
  p_reply_to_id BIGINT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s socialu.students%ROWTYPE;
  c socialu.conversations%ROWTYPE;
  m socialu.messages%ROWTYPE;
  payload JSONB;
  recipient UUID;
BEGIN
  -- The API derives p_auth_id from the verified token, never from the request body.
  SELECT * INTO s FROM socialu.students
    WHERE auth_user_id = p_auth_id AND is_active AND NOT reverification_required
      AND email_verified_at IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'A verified, active university account is required.' USING ERRCODE = '42501';
  END IF;

  -- #299: the one participant check every Chat function uses.
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id;
  IF NOT FOUND OR NOT socialu.is_current_participant(c.conversation_id, s.student_id) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;

  IF p_text IS NULL OR btrim(p_text) = '' OR length(p_text) > 500 THEN
    RAISE EXCEPTION 'Messages must contain 1 to 500 characters.' USING ERRCODE = '22023';
  END IF;

  -- Same rule as the validate_message trigger, checked first so the API can explain it.
  IF c.kind = 'private' AND NOT socialu.can_send_private(c.private_student_low, c.private_student_high) THEN
    RAISE EXCEPTION 'Messaging is not available for this conversation.' USING ERRCODE = 'SC403';
  END IF;

  IF p_reply_to_id IS NOT NULL THEN
    -- SRS-209.1: UR-209 asks for replies between group participants, so a private conversation is refused here
    -- as well as in the page, keeping the rule in one place rather than only in the interface.
    IF c.kind <> 'group' THEN
      RAISE EXCEPTION 'Replies are only available in group conversations.' USING ERRCODE = 'SCP02';
    END IF;
    -- The target must be a sent message of this conversation that this student is allowed to read.
    -- can_read_message also limits a group member to messages from their own membership period, so a student
    -- cannot reply to something sent before they joined or after they left. A target that is missing, in
    -- another conversation, or unreadable all give the same answer, as SRS-213.1 asks.
    IF NOT EXISTS (SELECT 1 FROM socialu.messages t
                    WHERE t.message_id = p_reply_to_id AND t.conversation_id = c.conversation_id
                      AND t.status = 'sent')
       OR NOT socialu.can_read_message(s.student_id, p_reply_to_id) THEN
      RAISE EXCEPTION 'That message is no longer available.' USING ERRCODE = 'SCP01';
    END IF;
  END IF;

  -- SRS-209.3 / SRS-209.4: the reply is saved with the message it answers. The composite foreign key above
  -- re-checks the same-conversation rule as the row is written, so a target that disappears between the check
  -- and the insert fails the write rather than saving a dangling reply.
  INSERT INTO socialu.messages (conversation_id, sender_id, kind, text_content, reply_to_id, status, sent_at)
  VALUES (c.conversation_id, s.student_id, 'text', p_text, p_reply_to_id, 'sent', now())
  RETURNING * INTO m;

  payload := jsonb_build_object('id', m.message_id::text, 'conversation_id', m.conversation_id::text,
    'sender_id', m.sender_id::text, 'text', m.text_content, 'sent_at', m.sent_at,
    'reply_to_id', CASE WHEN m.reply_to_id IS NULL THEN NULL ELSE m.reply_to_id::text END);

  -- #304: push the saved message to each current participant's private channel (student:<auth uid>).
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

-- Server-only, like the other chat functions: browsers cannot call it directly. The new signature needs its own
-- grants; they do not carry over from the function being replaced.
REVOKE ALL ON FUNCTION public.socialu_send_message(UUID, BIGINT, TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_send_message(UUID, BIGINT, TEXT, BIGINT) TO service_role;

-- The three-argument version is now redundant: p_reply_to_id defaults to NULL, so an ordinary send still works.
-- Leaving both would make a three-argument call ambiguous and PostgREST would refuse it.
DROP FUNCTION IF EXISTS public.socialu_send_message(UUID, BIGINT, TEXT);

NOTIFY pgrst, 'reload schema';
