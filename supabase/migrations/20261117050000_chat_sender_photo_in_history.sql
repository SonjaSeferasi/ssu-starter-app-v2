-- SRS-211.2 (#1282): the sender's profile photo travels with the conversation history.
--
-- The page has only ever had a name for each sender, so every avatar in a conversation was the same generic
-- placeholder. socialu_conversation_messages already returns a 'senders' map; this adds each one's profile
-- photo to it.
--
-- A KEY, not a link. The media bucket is private, and only the server holds the credentials that can sign a
-- link to it -- the same reason chat photos come back as keys (20261103130000) and are signed by the route.
-- A key in the browser would be useless at best and a leak at worst, so lib/chat-sender-photos.ts swaps each
-- one for a signed link and removes the key before the history leaves the server.
--
-- WHO IS IN 'senders' DOES NOT CHANGE. #1222 confines a former member's map to the people whose messages
-- they may still read, and that WHERE clause is untouched here: this adds a field to the rows that were
-- already being returned, and never a row. The test asserts the boundary still holds.
--
-- socialu_conversation_messages calls neither socialu.is_blocked nor realtime.send, so neither the
-- school-community rewrite nor the session-revocation rewrite has anything to lose by this replacement.

CREATE OR REPLACE FUNCTION public.socialu_conversation_messages(p_auth_id UUID, p_conversation_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; c socialu.conversations%ROWTYPE; my_role TEXT; members BIGINT; current_member BOOLEAN; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- #1222: admits a former member as well, so can_read_message below decides what they see. Someone who
  -- was never a participant still gets the same answer as a conversation that does not exist (SRS-213.1).
  IF NOT socialu.was_participant(p_conversation_id, me)
     OR socialu.conversation_hidden(p_conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  current_member := socialu.is_current_participant(p_conversation_id, me);
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id;
  IF c.kind = 'group' THEN
    -- NULL for a former member, which is what keeps the administrator controls hidden.
    SELECT gm.role INTO my_role FROM socialu.group_memberships gm
     WHERE gm.conversation_id = c.conversation_id AND gm.student_id = me AND gm.left_at IS NULL;
    -- #1222: how many people are in the group now is current information about a group a former member has
    -- left, so they are told nothing.
    IF current_member THEN
      SELECT count(*) INTO members FROM socialu.group_memberships gm
       WHERE gm.conversation_id = c.conversation_id AND gm.left_at IS NULL;
    END IF;
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
      -- #1222: the page renders the conversation read-only when this is true.
      'former', CASE WHEN c.kind = 'group' THEN NOT current_member END,
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
      -- #1222: for a former member this is only the people whose messages they can still read. The current
      -- membership list is current information about the group and is not folded in for them.
      -- SRS-211.2 (#1282): each sender's profile photo travels as a storage key, never as a link. The
      -- bucket is private and only the server holds the credentials to sign it, exactly as the chat photos
      -- in 20261103130000 do. photo_key is NULL for a student who has not set one.
      'senders', (SELECT coalesce(jsonb_object_agg(s.student_id::text, jsonb_build_object(
          'name', coalesce(sp.display_name, s.full_name), 'username', s.username,
          'photo_key', ma.storage_key)), '{}'::jsonb)
        FROM socialu.students s LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
        LEFT JOIN socialu.media_assets ma ON ma.asset_id = sp.photo_id
        WHERE s.student_id IN (SELECT r.sender_id FROM recent r)
           OR (c.kind = 'private' AND s.student_id IN (c.private_student_low, c.private_student_high))
           OR (c.kind = 'group' AND current_member
               AND s.student_id IN (SELECT gm.student_id FROM socialu.group_memberships gm
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

-- Server-only, like every other chat function. CREATE OR REPLACE keeps the existing grants; these are
-- restated so the migration stands on its own if replayed against a fresh database.
REVOKE ALL ON FUNCTION public.socialu_conversation_messages(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_conversation_messages(UUID, BIGINT) TO service_role;

NOTIFY pgrst, 'reload schema';
