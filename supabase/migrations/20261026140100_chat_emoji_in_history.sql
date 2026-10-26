-- SRS-201.9 (UR-201) display a sent emoji. Task #799.
-- Replaces two existing Chat functions so emoji messages are returned wherever messages are loaded:
--   public.socialu_conversation_messages (from 20261019170100): history now includes 'emoji' messages; they carry
--     "kind": "emoji" (text messages keep exactly the same fields as before, matching the live event).
--   public.socialu_conversation_list (from 20261019190000): the preview of the latest message includes emoji.
--     It also keeps LN's school-community rule from 20261026000100_school_communities.sql (a group is listed only
--     while socialu.is_current_participant allows it), so applying this before or after that migration gives the
--     same result. Without that migration, the check matches the group membership already required here.
-- CREATE OR REPLACE keeps the existing grants (service_role only). Nothing else changes.
-- Apply once after 20261026140000_chat_send_emoji.sql.

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
  -- The latest 50 successfully sent text and emoji messages the student may read, returned oldest first.
  -- can_read_message also limits group members to messages from their membership period.
  -- Fields match the live message_created event so the page can merge both without duplicates.
  SELECT jsonb_build_object('student_id', me::text, 'kind', c.kind, 'role', my_role, 'member_count', members,
      'messages', coalesce(jsonb_agg(jsonb_build_object(
        'id', m.message_id::text, 'conversation_id', m.conversation_id::text, 'sender_id', m.sender_id::text,
        'text', m.text_content, 'sent_at', m.sent_at)
        || CASE WHEN m.kind = 'text' THEN '{}'::jsonb ELSE jsonb_build_object('kind', m.kind) END
        ORDER BY m.sent_at, m.message_id), '[]'::jsonb))
    INTO result
    FROM (SELECT msg.message_id, msg.conversation_id, msg.sender_id, msg.kind, msg.text_content, msg.sent_at
            FROM socialu.messages msg
           WHERE msg.conversation_id = p_conversation_id AND msg.kind IN ('text', 'emoji') AND msg.status = 'sent'
             AND socialu.can_read_message(me, msg.message_id)
           ORDER BY msg.sent_at DESC, msg.message_id DESC LIMIT 50) m;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.socialu_conversation_list(p_auth_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- Conversations the student currently belongs to: either side of a private pair, or a current group member.
  WITH mine AS (
    SELECT c.conversation_id, c.kind, gm.joined_at,
           CASE WHEN c.kind = 'private' THEN
             CASE WHEN c.private_student_low = me THEN c.private_student_high ELSE c.private_student_low END
           END AS peer_id
      FROM socialu.conversations c
      LEFT JOIN socialu.group_memberships gm
        ON gm.conversation_id = c.conversation_id AND gm.student_id = me AND gm.left_at IS NULL
     WHERE (c.kind = 'private' AND me IN (c.private_student_low, c.private_student_high))
        OR (c.kind = 'group' AND gm.membership_id IS NOT NULL)
  ),
  -- Like the conversation header, DMs with a blocked or deactivated student are not shown. Groups follow the
  -- shared participant check (LN's school-community rule, where applied).
  visible AS (
    SELECT m.* FROM mine m LEFT JOIN socialu.students p ON p.student_id = m.peer_id
     WHERE (m.kind = 'group' AND socialu.is_current_participant(m.conversation_id, me))
        OR (p.is_active AND NOT socialu.is_blocked(me, m.peer_id))
  ),
  -- The latest successfully sent text or emoji message the student may read in each conversation, and (#327)
  -- whether any message from another participant is still unread for this student.
  items AS (
    SELECT v.*, last.sender_id AS last_sender, last.text_content AS last_text, last.sent_at AS last_sent,
           EXISTS (SELECT 1 FROM socialu.messages um
                    WHERE um.conversation_id = v.conversation_id AND um.status = 'sent' AND um.sender_id <> me
                      AND socialu.can_read_message(me, um.message_id)
                      AND NOT EXISTS (SELECT 1 FROM socialu.message_reads r
                                       WHERE r.message_id = um.message_id AND r.student_id = me)) AS unread
      FROM visible v
      LEFT JOIN LATERAL (
        SELECT msg.sender_id, msg.text_content, msg.sent_at FROM socialu.messages msg
         WHERE msg.conversation_id = v.conversation_id AND msg.kind IN ('text', 'emoji') AND msg.status = 'sent'
           AND socialu.can_read_message(me, msg.message_id)
         ORDER BY msg.sent_at DESC, msg.message_id DESC LIMIT 1
      ) last ON true
  )
  -- Most recent activity first; conversations without messages follow, newest first.
  SELECT jsonb_build_object('student_id', me::text, 'conversations', coalesce(jsonb_agg(jsonb_build_object(
      'id', i.conversation_id::text,
      'kind', i.kind,
      'name', CASE WHEN i.kind = 'private' THEN coalesce(sp.display_name, s.full_name) END,
      'username', s.username,
      'member_count', CASE WHEN i.kind = 'group' THEN (SELECT count(*) FROM socialu.group_memberships g
                                                        WHERE g.conversation_id = i.conversation_id AND g.left_at IS NULL) END,
      'unread', i.unread,
      'last_message', CASE WHEN i.last_sent IS NULL THEN NULL
                           ELSE jsonb_build_object('text', i.last_text, 'sender_id', i.last_sender::text, 'sent_at', i.last_sent) END)
    ORDER BY coalesce(i.last_sent, i.joined_at) DESC NULLS LAST, i.conversation_id DESC), '[]'::jsonb))
    INTO result
    FROM items i
    LEFT JOIN socialu.students s ON s.student_id = i.peer_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = i.peer_id;
  RETURN result;
END;
$$;

NOTIFY pgrst, 'reload schema';
