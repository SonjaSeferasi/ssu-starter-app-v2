-- SRS-201.1 (UR-201): a conversation participant sends a text message.
-- Tasks: #299 shared participant check, #304 save and broadcast, #298 Realtime channel policy.
-- Additive only: one new server-only function and one Realtime policy; no existing table changes.
-- Apply once after 20261008000100_link_supabase_accounts.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required       22023 message must be 1-500 characters
--   SC404 conversation not available (missing and forbidden look the same, SRS-213.1)
--   SC403 private messaging not allowed (friendship/consent or block, SRS-200.16)

CREATE FUNCTION public.socialu_send_message(p_auth_id UUID, p_conversation_id BIGINT, p_text TEXT)
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

  INSERT INTO socialu.messages (conversation_id, sender_id, kind, text_content, status, sent_at)
  VALUES (c.conversation_id, s.student_id, 'text', p_text, 'sent', now())
  RETURNING * INTO m;

  payload := jsonb_build_object('id', m.message_id::text, 'conversation_id', m.conversation_id::text,
    'sender_id', m.sender_id::text, 'text', m.text_content, 'sent_at', m.sent_at);

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
REVOKE ALL ON FUNCTION public.socialu_send_message(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_send_message(UUID, BIGINT, TEXT) TO service_role;

-- #298: a signed-in student may receive broadcasts only on their own channel.
-- No INSERT policy: browsers cannot broadcast; only the server-side function above sends.
-- RLS is already enabled on realtime.messages; do not ALTER it here (that aborts the migration).
CREATE POLICY "socialu_students_receive_own_chat_channel"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.messages.extension = 'broadcast'
  AND (SELECT realtime.topic()) = 'student:' || (SELECT auth.uid())::text
);

NOTIFY pgrst, 'reload schema';
