-- #1218 (SRS-213.1): socialu_delete_photo told a stranger whether a message was a photo.
--
-- 20261104120000_chat_delete_photo.sql checked the message's kind and status BEFORE checking whether the
-- caller is even in the conversation, so a student who has never been a participant got:
--   * SC404 ("conversation not available") when the target happened to be a sent photo, but
--   * SCD02 ("that photo is no longer available") when it was text, an emoji, or already removed.
-- Two different answers for two kinds of message the caller is not allowed to know anything about. The
-- comment in that migration said the opposite was happening; the intent was right and the order was wrong.
--
-- Reported by MeriemeSakhs in the CSC 351 Sprint 4 messaging audit (#1236), reproduced by
-- __tests__/database/chat-photo-bugs.test.ts test 6.
--
-- The fix is the order, not the rules. Nothing about who may delete what changes:
--   1. the row is still locked first, so two taps cannot both pass;
--   2. a message id that does not exist now answers SC404, not SCD02 -- otherwise the leak simply runs the
--      other way, and a stranger learns that an id exists by being told it is "not a photo";
--   3. participancy next, so everything below it is only ever reached by someone already in the conversation;
--   4. kind and status after that, so SCD02 is now only ever seen by a participant;
--   5. ownership last, unchanged.
-- SC404 therefore means exactly one thing to an outsider: no answer. SCD02 and SCD01 are answers a
-- participant has earned.
-- Apply once after 20261112120000_chat_photo_in_list_and_notifications.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required
--   SC404 conversation not available, or no such message (missing and forbidden look the same, SRS-213.1)
--   SCD01 only the student who sent a photo may delete it
--   SCD02 that photo is no longer available (not a photo, or not a sent message) -- participants only

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

  -- Locked, so two taps on the delete button cannot both pass the checks below. #1218: a message id that
  -- does not exist answers exactly as a conversation the caller cannot see does, so neither can be probed.
  SELECT * INTO m FROM socialu.messages WHERE message_id = p_message_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;

  -- #299, #1218: the same participant check every Chat function uses, and now the first thing decided about
  -- the message itself. Someone outside the conversation learns nothing beyond "not available" (SRS-213.1).
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = m.conversation_id;
  IF NOT FOUND OR NOT socialu.is_current_participant(c.conversation_id, s.student_id) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;

  -- #1218: only a participant ever reaches this, so SCD02 no longer tells an outsider what kind of message
  -- they pointed at. The rule is unchanged: this function deletes photographs, nothing else.
  IF m.kind <> 'photo' OR m.status <> 'sent' THEN
    RAISE EXCEPTION 'That photo is no longer available.' USING ERRCODE = 'SCD02';
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

-- Server-only, like every other chat function. CREATE OR REPLACE keeps the existing grants; these are
-- restated so the migration stands on its own if replayed against a fresh database.
REVOKE ALL ON FUNCTION public.socialu_delete_photo(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_delete_photo(UUID, BIGINT) TO service_role;

NOTIFY pgrst, 'reload schema';
