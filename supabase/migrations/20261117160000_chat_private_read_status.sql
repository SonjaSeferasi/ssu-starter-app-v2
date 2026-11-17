-- SRS-211.8 (#1283): a student can see whether their own private message has been read.
-- SRS-211.9: and a group message never carries a read receipt.
--
-- The data has been there all along. message_reads records who has read what, socialu_mark_conversation_read
-- writes it when a conversation is opened (SRS-212.5) and while it is being watched (SRS-212.6), and the
-- unread indicator (SRS-212.4) reads from it. What was missing is the other direction: the sender was never
-- told. This adds that, and only that.
--
-- WHAT IT DOES NOT DO. It says nothing about WHEN the message was read, only whether. read_at is on the row
-- and is deliberately left behind: "read at 11:42pm" is a different and much more exposing claim than
-- "read", and SRS-211.8 asks only for the status.
--
-- It is also confined to the sender's own messages. A student learns whether the person they wrote to has
-- read them; nobody learns anything about what anyone else has read.
--
-- SRS-211.9 falls out of the same clause rather than needing one of its own: a group conversation never
-- satisfies c.kind = 'private', so a group message carries no 'read' field at all. Absent and false are
-- different answers and only absent is honest for a group, where "has it been read" has no single answer.
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
          -- SRS-211.8 (#1283): whether the other student has read this message. Only on the student's OWN
          -- messages, and only in a private conversation.
          -- SRS-211.9 is the same clause read the other way: a group never reaches it, so a group message
          -- carries no 'read' field at all rather than one set to false. Absent and false are different
          -- answers, and only absent is true of a group.
          -- A private conversation has exactly two participants, so a read by anyone who is not the sender
          -- is a read by the recipient.
          || CASE WHEN c.kind = 'private' AND m.sender_id = me
                  THEN jsonb_build_object('read', EXISTS (SELECT 1 FROM socialu.message_reads r
                                                           WHERE r.message_id = m.message_id
                                                             AND r.student_id <> me))
                  ELSE '{}'::jsonb END
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
