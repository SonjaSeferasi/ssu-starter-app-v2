-- SRS-201.14 (UR-201, #1405) send a GIF.
-- "The system shall allow a conversation participant to send a GIF selected from the GIF library or
--  uploaded from the participant's device."
--
-- This covers the UPLOADED half only. The library half needs SRS-201.10 and SRS-201.11, which need a
-- provider to be chosen first, so a 'gif_library' message (kind = 'gif_library', gif_reference set) is
-- still not written by anything. The schema already allows it; nothing here does.
--
-- Adds public.socialu_send_gif: one call that records the uploaded GIF as a media asset and saves the
-- message that shows it. The two belong together -- a message of kind 'gif_upload' is meaningless without
-- its asset, and an asset nobody references is rubbish left in the database -- so they are written in the
-- same transaction and both are rolled back if either fails.
--
-- Most of what makes a GIF message legal is already in the schema and is deliberately not repeated here:
--   messages CHECK (kind IN ('photo','gif_upload') AND asset_id IS NOT NULL AND text_content IS NULL ...)
--     - a GIF message carries an asset and no text, so a GIF and a caption are separate messages;
--   validate_message: IF NEW.kind='gif_upload' THEN PERFORM require_media(NEW.asset_id, NEW.sender_id, 'chat_gif')
--     - the asset must exist, belong to the sender, and have been uploaded for chat;
--   validate_media: refuses a (upload_context, mime_type) pair with no policy row, or byte_count over its limit;
--   media_assets CHECK (byte_count > 0) and UNIQUE (storage_key);
--   upload_policies already holds ('chat_gif','image/gif',15000000), so SRS-201.13's limit is the
--     database's own and nothing here restates the number.
-- What is added is the account, participant and private-messaging check every Chat function makes, and a
-- readable refusal for a format or size the policy does not allow, so the API can explain it rather than
-- returning the trigger's generic message.
--
-- TWO DELIBERATE DIFFERENCES FROM socialu_send_photo, both easy to lose by copying it:
--
-- 1. No display copy. SRS-201.6 (#1026) stores a smaller re-encoded copy of a photo and records it in
--    socialu.chat_photo_displays. Re-encoding a GIF would flatten it to a single frame, so a GIF is stored
--    exactly as the student chose it and there is no second asset, no chat_photo_displays row, and no
--    p_display_* arguments. SRS-201.15 shows the one stored object.
--
-- 2. The broadcast goes through socialu.send_to_active_sessions, NOT realtime.send. The migration file for
--    socialu_send_photo still reads realtime.send, but 20261117010000_realtime_session_revocation.sql
--    (SRS-107.8, #1228) rewrote every deployed producer in a DO block to call send_to_active_sessions, so
--    that a revoked login session stops receiving broadcasts. A fresh function copied from that file would
--    bypass the per-send session check and reintroduce the bug.
--
-- Apply once after 20261119130000_messages_rls.sql. Safe to re-run.
--
-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required
--   SC404 conversation not available (missing and forbidden look the same, SRS-213.1)
--   SC403 private messaging not allowed (friendship/consent or block, SRS-200.16)
--   SCF03 the GIF's format or size is not allowed for a conversation GIF (SRS-201.12, SRS-201.13)
--   SCF04 the upload did not name a stored object

CREATE OR REPLACE FUNCTION public.socialu_send_gif(p_auth_id UUID, p_conversation_id BIGINT,
  p_storage_key TEXT, p_mime_type TEXT, p_byte_count BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s socialu.students%ROWTYPE;
  c socialu.conversations%ROWTYPE;
  m socialu.messages%ROWTYPE;
  asset BIGINT;
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

  -- Same rule as the validate_message trigger, checked first so the API can explain it.
  IF c.kind = 'private' AND NOT socialu.can_send_private(c.private_student_low, c.private_student_high) THEN
    RAISE EXCEPTION 'Messaging is not available for this conversation.' USING ERRCODE = 'SC403';
  END IF;

  IF p_storage_key IS NULL OR btrim(p_storage_key) = '' THEN
    RAISE EXCEPTION 'The GIF was not stored. Please try again.' USING ERRCODE = 'SCF04';
  END IF;

  -- SRS-201.12 and SRS-201.13 as the database keeps them: the accepted format and the limit are the
  -- upload_policies rows for chat_gif, which is also what lib/chat-gif.ts is tested against. The
  -- validate_media trigger refuses the same thing as the row is written; this says so in words the API can
  -- pass on, instead of letting the trigger's generic message reach the student.
  IF NOT EXISTS (SELECT 1 FROM socialu.upload_policies p
                  WHERE p.upload_context = 'chat_gif' AND p.mime_type = p_mime_type
                    AND p_byte_count BETWEEN 1 AND p.max_bytes) THEN
    RAISE EXCEPTION 'That GIF cannot be sent in a conversation.' USING ERRCODE = 'SCF03';
  END IF;

  INSERT INTO socialu.media_assets (owner_id, storage_key, upload_context, mime_type, byte_count)
  VALUES (s.student_id, p_storage_key, 'chat_gif', p_mime_type, p_byte_count)
  RETURNING asset_id INTO asset;

  -- No second asset: see note 1 at the top. The GIF the student chose is the GIF everyone sees.

  -- The message. validate_message re-checks participation and that the asset is this sender's chat_gif, so
  -- a membership that ends between the check above and this insert fails the write rather than saving it.
  INSERT INTO socialu.messages (conversation_id, sender_id, kind, asset_id, status, sent_at)
  VALUES (c.conversation_id, s.student_id, 'gif_upload', asset, 'sent', now())
  RETURNING * INTO m;

  -- The same shape as a text, emoji or photo message, plus its kind, so the page can place it in the
  -- conversation. 'text' is the empty string rather than null: a GIF message carries no text (the schema
  -- forbids it), and an empty string keeps the one message shape the page already reads. Showing the GIF
  -- itself is SRS-201.15; the storage key is deliberately not broadcast, because a key is only useful with
  -- a signed URL, which only the server can make.
  payload := jsonb_build_object('id', m.message_id::text, 'conversation_id', m.conversation_id::text,
    'sender_id', m.sender_id::text, 'text', '', 'sent_at', m.sent_at, 'kind', m.kind,
    'asset_id', m.asset_id::text);

  -- #304 and SRS-107.8 (#1228): push the saved message to each current participant, through the per-send
  -- session check. See note 2 at the top: realtime.send here would reach revoked sessions.
  FOR recipient IN
    SELECT st.auth_user_id FROM socialu.students st
    WHERE st.auth_user_id IS NOT NULL AND (
      (c.kind = 'private' AND st.student_id IN (c.private_student_low, c.private_student_high))
      OR (c.kind = 'group' AND st.student_id IN (
        SELECT gm.student_id FROM socialu.group_memberships gm
        WHERE gm.conversation_id = c.conversation_id AND gm.left_at IS NULL)))
  LOOP
    PERFORM socialu.send_to_active_sessions(payload, 'message_created', 'student:' || recipient::text, true);
  END LOOP;

  RETURN payload;
END;
$$;

-- Server-only, like every other chat function: browsers cannot call it directly.
REVOKE ALL ON FUNCTION public.socialu_send_gif(UUID, BIGINT, TEXT, TEXT, BIGINT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_send_gif(UUID, BIGINT, TEXT, TEXT, BIGINT) TO service_role;

NOTIFY pgrst, 'reload schema';
