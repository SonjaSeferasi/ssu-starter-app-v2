-- #1106: the student who sent a photo removes it from the conversation.
-- Only the sender. An administrator removing someone else's photo is SRS-514 and is deliberately not this.
--
-- The deletion is recorded in its own table rather than written onto the message, for two reasons:
--
--   1. The message row cannot be emptied. socialu.messages has
--        CHECK (kind IN ('photo','gif_upload') AND asset_id IS NOT NULL AND text_content IS NULL ...)
--      so clearing asset_id on a photo message would violate the constraint, and changing that CHECK would
--      reach into every other kind of message. The row stays exactly as it was.
--   2. A reply may point at it. messages.reply_to_id has a composite foreign key to
--      (message_id, conversation_id), so a hard DELETE is refused with 23503 whenever anyone has replied --
--      which __tests__/database/reply-preserved.test.ts already asserts. Leaving the row keeps every reply
--      valid.
--
-- What actually goes away is the photograph: the API removes both stored objects (the original and the
-- -display copy from SRS-201.6) once this function commits. The rows that remain are a tombstone, and the
-- history stops handing out the storage keys, so no new signed link can be made for them.
--
-- Also replaces public.socialu_conversation_messages (from 20261103130000_chat_photo_in_history.sql) so a
-- deleted photo comes back marked rather than disappearing, and carries no keys:
--   - the message gains "deleted": true, so the page can say the photo was deleted where it used to be;
--   - the 'photos' map leaves it out entirely, so the API has nothing to sign;
--   - the 'replies' map leaves it out too, so a reply that answered it shows "Original message unavailable"
--     (SRS-209.6), which the page already handles without any new code.
-- Apply once after 20261103130000_chat_photo_in_history.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required
--   SC404 conversation not available (missing and forbidden look the same, SRS-213.1)
--   SCD01 only the student who sent a photo may delete it
--   SCD02 that photo is no longer available (missing, not a photo, or not a sent message)

CREATE TABLE IF NOT EXISTS socialu.deleted_messages (
    message_id BIGINT PRIMARY KEY REFERENCES socialu.messages(message_id),
    deleted_by BIGINT NOT NULL REFERENCES socialu.students(student_id),
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- The schema-wide REVOKE in create_socialu ran before this table existed, so it needs its own.
REVOKE ALL ON TABLE socialu.deleted_messages FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.socialu_delete_photo(p_auth_id UUID, p_message_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s socialu.students%ROWTYPE;
  c socialu.conversations%ROWTYPE;
  m socialu.messages%ROWTYPE;
  original TEXT;
  display TEXT;
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

  -- Locked, so two taps on the delete button cannot both pass the checks below.
  SELECT * INTO m FROM socialu.messages WHERE message_id = p_message_id FOR UPDATE;
  IF NOT FOUND OR m.kind <> 'photo' OR m.status <> 'sent' THEN
    RAISE EXCEPTION 'That photo is no longer available.' USING ERRCODE = 'SCD02';
  END IF;

  -- #299: the same participant check every Chat function uses. Checked before ownership so that someone who
  -- is not in the conversation cannot learn whether a message id exists (SRS-213.1).
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = m.conversation_id;
  IF NOT FOUND OR NOT socialu.is_current_participant(c.conversation_id, s.student_id) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;

  -- Only the sender. A group owner or administrator gets the same refusal as anyone else here.
  IF m.sender_id <> s.student_id THEN
    RAISE EXCEPTION 'You can only delete photos you sent.' USING ERRCODE = 'SCD01';
  END IF;

  -- Deleting twice is not an error: the second call reports success and names no objects, because the first
  -- call already had them removed. That keeps a retry after a dropped connection harmless.
  IF EXISTS (SELECT 1 FROM socialu.deleted_messages d WHERE d.message_id = m.message_id) THEN
    RETURN jsonb_build_object('id', m.message_id::text, 'conversation_id', m.conversation_id::text,
      'already_deleted', true, 'storage_keys', '[]'::jsonb);
  END IF;

  INSERT INTO socialu.deleted_messages (message_id, deleted_by) VALUES (m.message_id, s.student_id);

  -- The objects the API removes once this commits. The rows stay; the photograph does not.
  SELECT a.storage_key INTO original FROM socialu.media_assets a WHERE a.asset_id = m.asset_id;
  SELECT d.storage_key INTO display
    FROM socialu.chat_photo_displays l JOIN socialu.media_assets d ON d.asset_id = l.display_asset_id
   WHERE l.asset_id = m.asset_id;

  payload := jsonb_build_object('id', m.message_id::text, 'conversation_id', m.conversation_id::text);

  -- #304: tell every current participant, on the same private channels the send used, so the photo leaves
  -- their screen instead of sitting there with a signed link that still works for up to an hour.
  -- realtime.send only warns on failure, so a broadcast problem never undoes the deletion.
  FOR recipient IN
    SELECT st.auth_user_id FROM socialu.students st
    WHERE st.auth_user_id IS NOT NULL AND (
      (c.kind = 'private' AND st.student_id IN (c.private_student_low, c.private_student_high))
      OR (c.kind = 'group' AND st.student_id IN (
        SELECT gm.student_id FROM socialu.group_memberships gm
        WHERE gm.conversation_id = c.conversation_id AND gm.left_at IS NULL)))
  LOOP
    PERFORM realtime.send(payload, 'message_deleted', 'student:' || recipient::text, true);
  END LOOP;

  RETURN payload || jsonb_build_object('already_deleted', false, 'storage_keys',
    to_jsonb(ARRAY(SELECT k FROM unnest(ARRAY[original, display]) AS k WHERE k IS NOT NULL)));
END;
$$;

REVOKE ALL ON FUNCTION public.socialu_delete_photo(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_delete_photo(UUID, BIGINT) TO service_role;

-- The history, with deleted photos marked and their keys withheld. Everything else is unchanged from
-- 20261103130000_chat_photo_in_history.sql.
CREATE OR REPLACE FUNCTION public.socialu_conversation_messages(p_auth_id UUID, p_conversation_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; c socialu.conversations%ROWTYPE; my_role TEXT; members BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF NOT socialu.is_current_participant(p_conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id;
  IF c.kind = 'group' THEN
    SELECT gm.role INTO my_role FROM socialu.group_memberships gm
     WHERE gm.conversation_id = c.conversation_id AND gm.student_id = me AND gm.left_at IS NULL;
    SELECT count(*) INTO members FROM socialu.group_memberships gm
     WHERE gm.conversation_id = c.conversation_id AND gm.left_at IS NULL;
  END IF;
  WITH recent AS (
    SELECT msg.message_id, msg.conversation_id, msg.sender_id, msg.kind, msg.text_content, msg.sent_at,
           msg.reply_to_id, msg.asset_id,
           EXISTS (SELECT 1 FROM socialu.deleted_messages d WHERE d.message_id = msg.message_id) AS is_deleted
      FROM socialu.messages msg
     WHERE msg.conversation_id = p_conversation_id AND msg.kind IN ('text', 'emoji', 'photo')
       AND msg.status = 'sent' AND socialu.can_read_message(me, msg.message_id)
     ORDER BY msg.sent_at DESC, msg.message_id DESC LIMIT 50
  )
  SELECT jsonb_build_object('student_id', me::text, 'kind', c.kind, 'name', c.group_name, 'role', my_role, 'member_count', members,
      'messages', (SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', m.message_id::text, 'conversation_id', m.conversation_id::text, 'sender_id', m.sender_id::text,
          'text', coalesce(m.text_content, ''), 'sent_at', m.sent_at)
          || CASE WHEN m.kind = 'text' THEN '{}'::jsonb ELSE jsonb_build_object('kind', m.kind) END
          || CASE WHEN m.reply_to_id IS NULL THEN '{}'::jsonb
                  ELSE jsonb_build_object('reply_to_id', m.reply_to_id::text) END
          || CASE WHEN m.asset_id IS NULL THEN '{}'::jsonb
                  ELSE jsonb_build_object('asset_id', m.asset_id::text) END
          -- #1106: the photo is gone but the message stays in its place, so the conversation still reads
          -- in order and a reply that answered it still has something to point at.
          || CASE WHEN m.is_deleted THEN jsonb_build_object('deleted', true) ELSE '{}'::jsonb END
          ORDER BY m.sent_at, m.message_id), '[]'::jsonb) FROM recent m),
      'senders', (SELECT coalesce(jsonb_object_agg(s.student_id::text, jsonb_build_object(
          'name', coalesce(sp.display_name, s.full_name), 'username', s.username)), '{}'::jsonb)
        FROM socialu.students s LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
        WHERE s.student_id IN (SELECT r.sender_id FROM recent r)
           OR (c.kind = 'private' AND s.student_id IN (c.private_student_low, c.private_student_high))
           OR (c.kind = 'group' AND s.student_id IN (SELECT gm.student_id FROM socialu.group_memberships gm
                                                      WHERE gm.conversation_id = c.conversation_id AND gm.left_at IS NULL))),
      'reactions', (SELECT coalesce(jsonb_object_agg(rm.message_id::text, socialu.chat_message_reactions(rm.message_id, me)), '{}'::jsonb)
        FROM recent rm WHERE EXISTS (SELECT 1 FROM socialu.message_reactions mr WHERE mr.message_id = rm.message_id)),
      -- A reply whose target was deleted is left out, so the page shows "Original message unavailable"
      -- (SRS-209.6) rather than quoting a photo that is no longer there.
      'replies', (SELECT coalesce(jsonb_object_agg(rr.message_id::text, jsonb_build_object(
            'id', t.message_id::text, 'sender_id', t.sender_id::text,
            'sender_name', coalesce(tp.display_name, ts.full_name),
            'text', coalesce(t.text_content, ''))
          || CASE WHEN t.kind = 'text' THEN '{}'::jsonb ELSE jsonb_build_object('kind', t.kind) END), '{}'::jsonb)
        FROM recent rr
        JOIN socialu.messages t ON t.message_id = rr.reply_to_id
        JOIN socialu.students ts ON ts.student_id = t.sender_id
        LEFT JOIN socialu.student_profiles tp ON tp.student_id = t.sender_id
        WHERE rr.reply_to_id IS NOT NULL AND socialu.can_read_message(me, t.message_id)
          AND NOT EXISTS (SELECT 1 FROM socialu.deleted_messages d WHERE d.message_id = t.message_id)),
      -- A deleted photo names no stored objects, so the API has nothing to sign and no new link can be made.
      'photos', (SELECT coalesce(jsonb_object_agg(pm.message_id::text, jsonb_build_object(
            'storage_key', a.storage_key, 'mime_type', a.mime_type)
          || CASE WHEN d.storage_key IS NULL THEN '{}'::jsonb
                  ELSE jsonb_build_object('display_storage_key', d.storage_key) END), '{}'::jsonb)
        FROM recent pm
        JOIN socialu.media_assets a ON a.asset_id = pm.asset_id
        LEFT JOIN socialu.chat_photo_displays l ON l.asset_id = a.asset_id
        LEFT JOIN socialu.media_assets d ON d.asset_id = l.display_asset_id
        WHERE pm.kind = 'photo' AND NOT pm.is_deleted))
    INTO result;
  RETURN result;
END;
$$;

NOTIFY pgrst, 'reload schema';
