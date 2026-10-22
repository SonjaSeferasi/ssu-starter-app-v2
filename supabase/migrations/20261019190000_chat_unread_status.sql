-- SRS-212.4 (UR-212) display an unread-conversation indicator. Tasks #327 (determine unread), #328 (return it).
-- Replaces public.socialu_conversation_list (from 20261019150000, task #457) so each conversation also says
-- whether it has unread messages for the signed-in student. Everything else in the list is unchanged.
-- A message is unread for a student when it was sent by another participant, the student may read it
-- (socialu.can_read_message, so group members only count messages from their membership period), and
-- socialu.message_reads has no row for that message and student (SRS-212.1: read state is per student).
-- CREATE OR REPLACE keeps the existing grants (service_role only).
-- Apply once after 20261019170100_chat_conversation_role.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required (from public.socialu_require_student)

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
  -- Like the conversation header, DMs with a blocked or deactivated student are not shown.
  visible AS (
    SELECT m.* FROM mine m LEFT JOIN socialu.students p ON p.student_id = m.peer_id
     WHERE m.kind = 'group' OR (p.is_active AND NOT socialu.is_blocked(me, m.peer_id))
  ),
  -- The latest successfully sent text message the student may read in each conversation, and (#327) whether
  -- any message from another participant is still unread for this student.
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
         WHERE msg.conversation_id = v.conversation_id AND msg.kind = 'text' AND msg.status = 'sent'
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
