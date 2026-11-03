-- SRS-201.6 (UR-201) send a supported photo.
-- "The system shall allow a conversation participant to send a selected photo after the file satisfies the
--  supported-format and file-size requirements."
--
-- Adds public.socialu_send_photo: one call that records the uploaded photo as a media asset and saves the
-- photo message that shows it. The two belong together -- a message of kind 'photo' is meaningless without its
-- asset, and an asset nobody references is rubbish left in the database -- so they are written in the same
-- transaction and both are rolled back if either fails.
--
-- Most of what makes a photo message legal is already in the schema and is deliberately not repeated here:
--   messages CHECK (kind IN ('photo','gif_upload') AND asset_id IS NOT NULL AND text_content IS NULL ...)
--     - a photo message carries an asset and no text, so a photo and a caption are separate messages;
--   validate_message: IF NEW.kind='photo' THEN PERFORM require_media(NEW.asset_id, NEW.sender_id, 'chat_photo')
--     - the asset must exist, belong to the sender, and have been uploaded for chat;
--   validate_media: refuses a (upload_context, mime_type) pair with no policy row, or byte_count over its limit;
--   media_assets CHECK (byte_count > 0) and UNIQUE (storage_key).
-- What is added is the account, participant and private-messaging check every Chat function makes, and a
-- readable refusal for a format or size the policy does not allow, so the API can explain it rather than
-- returning the trigger's generic message.
--
-- SRS-201.6 (#1026) also stores a smaller copy of the photo for display. The smaller copy is itself a
-- chat_photo asset owned by the same student, and socialu.chat_photo_displays records which original it
-- belongs to. A new table rather than a column on media_assets: that table is shared with the profile, post,
-- avatar and Snipe workflows, and a display copy is a Chat concern, so nothing outside Chat changes shape.
-- The link is optional. A photo already small enough has no second copy and no row here, and SRS-201.7 then
-- shows the original.
-- Apply once after 20261102130000_chat_reply_in_history.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required
--   SC404 conversation not available (missing and forbidden look the same, SRS-213.1)
--   SC403 private messaging not allowed (friendship/consent or block, SRS-200.16)
--   SCF01 the photo's format or size is not allowed for a conversation photo (SRS-201.4, SRS-201.5)
--   SCF02 the upload did not name a stored object

CREATE TABLE IF NOT EXISTS socialu.chat_photo_displays (
    -- The photo as the student sent it. One display copy at most, so this is the key.
    asset_id BIGINT PRIMARY KEY REFERENCES socialu.media_assets(asset_id),
    -- The smaller copy shown in the conversation. UNIQUE so one copy can never be claimed by two originals.
    display_asset_id BIGINT NOT NULL UNIQUE REFERENCES socialu.media_assets(asset_id),
    CHECK (display_asset_id <> asset_id)
);

-- The schema-wide REVOKE in create_socialu ran before this table existed, so it needs its own.
-- Like every socialu table, it is reachable only through SECURITY DEFINER functions.
REVOKE ALL ON TABLE socialu.chat_photo_displays FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.socialu_send_photo(p_auth_id UUID, p_conversation_id BIGINT,
  p_storage_key TEXT, p_mime_type TEXT, p_byte_count BIGINT,
  p_display_storage_key TEXT DEFAULT NULL, p_display_mime_type TEXT DEFAULT NULL,
  p_display_byte_count BIGINT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s socialu.students%ROWTYPE;
  c socialu.conversations%ROWTYPE;
  m socialu.messages%ROWTYPE;
  asset BIGINT;
  display_asset BIGINT;
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
    RAISE EXCEPTION 'The photo was not stored. Please try again.' USING ERRCODE = 'SCF02';
  END IF;

  -- SRS-201.4 and SRS-201.5 as the database keeps them: the accepted formats and the limit are the
  -- upload_policies rows for chat_photo, which is also what lib/chat-photo.ts is tested against. The
  -- validate_media trigger refuses the same thing as the row is written; this says so in words the API can pass
  -- on, instead of letting the trigger's generic 'Unsupported media or upload limit exceeded' reach the student.
  IF NOT EXISTS (SELECT 1 FROM socialu.upload_policies p
                  WHERE p.upload_context = 'chat_photo' AND p.mime_type = p_mime_type
                    AND p_byte_count BETWEEN 1 AND p.max_bytes) THEN
    RAISE EXCEPTION 'That photo cannot be sent in a conversation.' USING ERRCODE = 'SCF01';
  END IF;

  INSERT INTO socialu.media_assets (owner_id, storage_key, upload_context, mime_type, byte_count)
  VALUES (s.student_id, p_storage_key, 'chat_photo', p_mime_type, p_byte_count)
  RETURNING asset_id INTO asset;

  -- SRS-201.6 (#1026): the smaller copy, when the route made one. It is held to the same policy as the
  -- original, because it is stored the same way and SRS-201.7 may show it to anyone who can read the message.
  IF p_display_storage_key IS NOT NULL AND btrim(p_display_storage_key) <> '' THEN
    IF NOT EXISTS (SELECT 1 FROM socialu.upload_policies p
                    WHERE p.upload_context = 'chat_photo' AND p.mime_type = p_display_mime_type
                      AND p_display_byte_count BETWEEN 1 AND p.max_bytes) THEN
      RAISE EXCEPTION 'That photo cannot be sent in a conversation.' USING ERRCODE = 'SCF01';
    END IF;
    INSERT INTO socialu.media_assets (owner_id, storage_key, upload_context, mime_type, byte_count)
    VALUES (s.student_id, p_display_storage_key, 'chat_photo', p_display_mime_type, p_display_byte_count)
    RETURNING asset_id INTO display_asset;
    INSERT INTO socialu.chat_photo_displays (asset_id, display_asset_id) VALUES (asset, display_asset);
  END IF;

  -- The message. validate_message re-checks participation and that the asset is this sender's chat_photo, so a
  -- membership that ends between the check above and this insert fails the write rather than saving the message.
  INSERT INTO socialu.messages (conversation_id, sender_id, kind, asset_id, status, sent_at)
  VALUES (c.conversation_id, s.student_id, 'photo', asset, 'sent', now())
  RETURNING * INTO m;

  -- The same shape as a text or emoji message, plus its kind, so the page can place it in the conversation.
  -- 'text' is the empty string rather than null: a photo message carries no text (the schema forbids it), and
  -- an empty string keeps the one message shape the page already reads. Showing the photo itself is SRS-201.7;
  -- the storage key is deliberately not broadcast, because a key is only useful with a signed URL, which only
  -- the server can make.
  payload := jsonb_build_object('id', m.message_id::text, 'conversation_id', m.conversation_id::text,
    'sender_id', m.sender_id::text, 'text', '', 'sent_at', m.sent_at, 'kind', m.kind,
    'asset_id', m.asset_id::text);

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

-- Server-only, like every other chat function: browsers cannot call it directly.
REVOKE ALL ON FUNCTION public.socialu_send_photo(UUID, BIGINT, TEXT, TEXT, BIGINT, TEXT, TEXT, BIGINT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_send_photo(UUID, BIGINT, TEXT, TEXT, BIGINT, TEXT, TEXT, BIGINT)
  TO service_role;

NOTIFY pgrst, 'reload schema';
