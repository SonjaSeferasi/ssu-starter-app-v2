-- SRS-201.7 (UR-201) display a sent photo.
-- "After a photo is successfully sent, the system shall display the photo within the conversation."
-- Replaces public.socialu_conversation_messages (from 20261102130000_chat_reply_in_history.sql) so photo
-- messages are part of the history at all. Until now the history selected only 'text' and 'emoji', so a photo
-- sent by SRS-201.6 was saved, broadcast and then disappeared on the next reload. Everything else about the
-- history is unchanged: the same participant check, the same 50 messages, the same senders, reactions and
-- replies.
--
-- The new 'photos' map is keyed by message ID, in the same shape as 'reactions' and 'replies': a conversation
-- with no photos gets an empty object and nothing changes for it.
--
-- It carries storage KEYS, not links. A key is useless on its own -- the bucket is private -- and only the
-- server holds the credentials to sign one, so the API turns these into signed URLs and the browser never
-- sees a key. That is also why the live message_created broadcast carries no key: realtime reaches the browser
-- directly, with no server in between to sign anything.
--
-- Each entry names the display copy as well as the original (SRS-201.6, #1026). The API prefers the smaller
-- copy, and falls back to the original for a photo small enough that no copy was stored.
--
-- 'text' is now coalesced to the empty string. A photo message has text_content NULL (the messages CHECK
-- forbids text on a photo), and the live broadcast already sends '', so this keeps one message shape for the
-- page whichever way a photo reaches it. For text and emoji messages the CHECK guarantees a non-null value,
-- so the coalesce changes nothing there.
-- Additive only: one function replaced; no table, policy or other function changes.
-- Apply once after 20261103120000_chat_send_photo.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required (from public.socialu_require_student)
--   SC404 conversation not available (missing and forbidden look the same, SRS-213.1)

CREATE OR REPLACE FUNCTION public.socialu_conversation_messages(p_auth_id UUID, p_conversation_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; c socialu.conversations%ROWTYPE; my_role TEXT; members BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- The same participant check as sending (#299).
  IF NOT socialu.is_current_participant(p_conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id;
  -- #460: the role comes from the database, never from the browser.
  IF c.kind = 'group' THEN
    SELECT gm.role INTO my_role FROM socialu.group_memberships gm
     WHERE gm.conversation_id = c.conversation_id AND gm.student_id = me AND gm.left_at IS NULL;
    SELECT count(*) INTO members FROM socialu.group_memberships gm
     WHERE gm.conversation_id = c.conversation_id AND gm.left_at IS NULL;
  END IF;
  -- The latest 50 successfully sent text, emoji and photo messages the student may read, returned oldest first.
  -- can_read_message also limits group members to messages from their membership period.
  -- Fields match the live message_created event so the page can merge both without duplicates.
  WITH recent AS (
    SELECT msg.message_id, msg.conversation_id, msg.sender_id, msg.kind, msg.text_content, msg.sent_at,
           msg.reply_to_id, msg.asset_id
      FROM socialu.messages msg
     WHERE msg.conversation_id = p_conversation_id AND msg.kind IN ('text', 'emoji', 'photo')
       AND msg.status = 'sent' AND socialu.can_read_message(me, msg.message_id)
     ORDER BY msg.sent_at DESC, msg.message_id DESC LIMIT 50
  )
  -- SRS-202.6: a named group's name (NULL for unnamed groups and private conversations).
  SELECT jsonb_build_object('student_id', me::text, 'kind', c.kind, 'name', c.group_name, 'role', my_role, 'member_count', members,
      'messages', (SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', m.message_id::text, 'conversation_id', m.conversation_id::text, 'sender_id', m.sender_id::text,
          'text', coalesce(m.text_content, ''), 'sent_at', m.sent_at)
          || CASE WHEN m.kind = 'text' THEN '{}'::jsonb ELSE jsonb_build_object('kind', m.kind) END
          || CASE WHEN m.reply_to_id IS NULL THEN '{}'::jsonb
                  ELSE jsonb_build_object('reply_to_id', m.reply_to_id::text) END
          || CASE WHEN m.asset_id IS NULL THEN '{}'::jsonb
                  ELSE jsonb_build_object('asset_id', m.asset_id::text) END
          ORDER BY m.sent_at, m.message_id), '[]'::jsonb) FROM recent m),
      -- SRS-211.1: who sent each message, keyed by student ID.
      'senders', (SELECT coalesce(jsonb_object_agg(s.student_id::text, jsonb_build_object(
          'name', coalesce(sp.display_name, s.full_name), 'username', s.username)), '{}'::jsonb)
        FROM socialu.students s LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
        WHERE s.student_id IN (SELECT r.sender_id FROM recent r)
           OR (c.kind = 'private' AND s.student_id IN (c.private_student_low, c.private_student_high))
           OR (c.kind = 'group' AND s.student_id IN (SELECT gm.student_id FROM socialu.group_memberships gm
                                                      WHERE gm.conversation_id = c.conversation_id AND gm.left_at IS NULL))),
      -- SRS-210.4 (#811): the reactions on the messages above, keyed by message ID (each emoji, how many, and
      -- whether it is the student's own). Messages without reactions are left out.
      'reactions', (SELECT coalesce(jsonb_object_agg(rm.message_id::text, socialu.chat_message_reactions(rm.message_id, me)), '{}'::jsonb)
        FROM recent rm WHERE EXISTS (SELECT 1 FROM socialu.message_reactions mr WHERE mr.message_id = rm.message_id)),
      -- SRS-209.5 (#997): the message each reply answers, keyed by the replying message's ID. Only replies
      -- appear, and only while the student can still read the target (SRS-209.6).
      -- A reply to a photo carries kind 'photo' and an empty text, so the page can say what was answered
      -- without a link: a quote is one line of a bar, and the photo itself is already in the conversation.
      'replies', (SELECT coalesce(jsonb_object_agg(rr.message_id::text, jsonb_build_object(
            'id', t.message_id::text, 'sender_id', t.sender_id::text,
            'sender_name', coalesce(tp.display_name, ts.full_name),
            'text', coalesce(t.text_content, ''))
          || CASE WHEN t.kind = 'text' THEN '{}'::jsonb ELSE jsonb_build_object('kind', t.kind) END), '{}'::jsonb)
        FROM recent rr
        JOIN socialu.messages t ON t.message_id = rr.reply_to_id
        JOIN socialu.students ts ON ts.student_id = t.sender_id
        LEFT JOIN socialu.student_profiles tp ON tp.student_id = t.sender_id
        WHERE rr.reply_to_id IS NOT NULL AND socialu.can_read_message(me, t.message_id)),
      -- SRS-201.7 (#1028): where each photo message's stored objects are, keyed by message ID. Keys only; the
      -- API signs them. The display copy is named when one was stored, and is absent for a photo small enough
      -- that SRS-201.6 kept only the original.
      'photos', (SELECT coalesce(jsonb_object_agg(pm.message_id::text, jsonb_build_object(
            'storage_key', a.storage_key, 'mime_type', a.mime_type)
          || CASE WHEN d.storage_key IS NULL THEN '{}'::jsonb
                  ELSE jsonb_build_object('display_storage_key', d.storage_key) END), '{}'::jsonb)
        FROM recent pm
        JOIN socialu.media_assets a ON a.asset_id = pm.asset_id
        LEFT JOIN socialu.chat_photo_displays l ON l.asset_id = a.asset_id
        LEFT JOIN socialu.media_assets d ON d.asset_id = l.display_asset_id
        WHERE pm.kind = 'photo'))
    INTO result;
  RETURN result;
END;
$$;

NOTIFY pgrst, 'reload schema';
