-- #1217 (SRS-212.9): photo messages were invisible to the Messages list and to notifications.
-- Both public.socialu_conversation_list and public.socialu_message_notifications still filtered
-- msg.kind IN ('text','emoji'). Neither was updated when photo messages arrived in
-- 20261103120000_chat_send_photo.sql, so a conversation whose newest activity is a photo showed
-- "No messages yet", sorted by its old joined_at instead of the photo's send time, and produced no
-- notification for the recipient.
--
-- Reported by MeriemeSakhs in the CSC 351 Sprint 4 messaging audit (#1236), reproduced by
-- __tests__/database/chat-photo-bugs.test.ts tests 2, 3 and 4.
--
-- A photo carries no text: the messages CHECK constraint requires text_content IS NULL for kind
-- 'photo'. So the preview cannot be a text snippet, and the wording does not belong in the database.
-- last_message therefore gains 'kind', and the page chooses what to show (lib/chat-preview.ts).
-- socialu_message_notifications already returned message_kind, so it needs only the widened filter.
--
-- Nothing else in either function changes. Both are replaced whole because CREATE OR REPLACE
-- FUNCTION cannot patch a body, and both re-apply LN's school-community rule exactly as their
-- original migrations do.
-- Apply once after 20261104120000_chat_delete_photo.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts): unchanged.
--   42501 verified, active account required (from public.socialu_require_student)

CREATE OR REPLACE FUNCTION public.socialu_conversation_list(p_auth_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- Conversations the student currently belongs to: either side of a private pair, or a current group member.
  WITH mine AS (
    SELECT c.conversation_id, c.kind, c.group_name, gm.joined_at,
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
  -- #1217: the latest successfully sent text, emoji OR photo message the student may read in each
  -- conversation, and (#327) whether any message from another participant is still unread for this student.
  items AS (
    SELECT v.*, last.sender_id AS last_sender, last.text_content AS last_text, last.sent_at AS last_sent,
           last.kind AS last_kind,
           EXISTS (SELECT 1 FROM socialu.messages um
                    WHERE um.conversation_id = v.conversation_id AND um.status = 'sent' AND um.sender_id <> me
                      AND socialu.can_read_message(me, um.message_id)
                      AND NOT EXISTS (SELECT 1 FROM socialu.message_reads r
                                       WHERE r.message_id = um.message_id AND r.student_id = me)) AS unread
      FROM visible v
      LEFT JOIN LATERAL (
        SELECT msg.sender_id, msg.text_content, msg.sent_at, msg.kind FROM socialu.messages msg
         WHERE msg.conversation_id = v.conversation_id AND msg.kind IN ('text', 'emoji', 'photo')
           AND msg.status = 'sent' AND socialu.can_read_message(me, msg.message_id)
         ORDER BY msg.sent_at DESC, msg.message_id DESC LIMIT 1
      ) last ON true
  )
  -- Most recent activity first; conversations without messages follow, newest first.
  SELECT jsonb_build_object('student_id', me::text, 'conversations', coalesce(jsonb_agg(jsonb_build_object(
      'id', i.conversation_id::text,
      'kind', i.kind,
      -- SRS-202.6: DMs show the friend's name; named groups show their group name.
      'name', CASE WHEN i.kind = 'private' THEN coalesce(sp.display_name, s.full_name) ELSE i.group_name END,
      'username', s.username,
      'member_count', CASE WHEN i.kind = 'group' THEN (SELECT count(*) FROM socialu.group_memberships g
                                                        WHERE g.conversation_id = i.conversation_id AND g.left_at IS NULL) END,
      'unread', i.unread,
      -- #1217: 'text' is NULL for a photo, which the schema requires; 'kind' tells the page what to show.
      'last_message', CASE WHEN i.last_sent IS NULL THEN NULL
                           ELSE jsonb_build_object('text', i.last_text, 'sender_id', i.last_sender::text,
                                                   'sent_at', i.last_sent, 'kind', i.last_kind) END)
    ORDER BY coalesce(i.last_sent, i.joined_at) DESC NULLS LAST, i.conversation_id DESC), '[]'::jsonb))
    INTO result
    FROM items i
    LEFT JOIN socialu.students s ON s.student_id = i.peer_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = i.peer_id;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.socialu_message_notifications(p_auth_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- The student's conversations: either side of a private pair, or a current group member.
  WITH mine AS (
    SELECT c.conversation_id, c.kind, c.group_name,
           CASE WHEN c.kind = 'private' THEN
             CASE WHEN c.private_student_low = me THEN c.private_student_high ELSE c.private_student_low END
           END AS peer_id
      FROM socialu.conversations c
     WHERE (c.kind = 'private' AND me IN (c.private_student_low, c.private_student_high))
        OR (c.kind = 'group' AND EXISTS (SELECT 1 FROM socialu.group_memberships gm
              WHERE gm.conversation_id = c.conversation_id AND gm.student_id = me AND gm.left_at IS NULL))
  ),
  visible AS (
    SELECT m.* FROM mine m LEFT JOIN socialu.students p ON p.student_id = m.peer_id
     WHERE (m.kind = 'group' AND socialu.is_current_participant(m.conversation_id, me))
        OR (p.is_active AND NOT socialu.is_blocked(me, m.peer_id))
  ),
  -- #1217: messages from others the student may read and has not read yet, newest first in each
  -- conversation. A photo counts the same as a text or emoji message: SRS-212.9 says each other current
  -- participant is notified of a new message, and a photo is one.
  unread AS (
    SELECT um.conversation_id, um.message_id, um.sender_id, um.kind, um.text_content, um.sent_at,
           count(*) OVER (PARTITION BY um.conversation_id) AS unread_count,
           row_number() OVER (PARTITION BY um.conversation_id ORDER BY um.sent_at DESC, um.message_id DESC) AS rn
      FROM socialu.messages um JOIN visible v ON v.conversation_id = um.conversation_id
     WHERE um.status = 'sent' AND um.sender_id <> me AND um.kind IN ('text', 'emoji', 'photo')
       AND socialu.can_read_message(me, um.message_id)
       AND NOT EXISTS (SELECT 1 FROM socialu.message_reads r WHERE r.message_id = um.message_id AND r.student_id = me)
  )
  SELECT jsonb_build_object('notifications', coalesce(jsonb_agg(jsonb_build_object(
      'conversation_id', u.conversation_id::text,
      'kind', v.kind,
      -- DMs: the friend's name. Groups: the group's name (NULL until it is named; the page shows "a group chat").
      'name', CASE WHEN v.kind = 'private' THEN coalesce(pp.display_name, ps.full_name) ELSE v.group_name END,
      'sender', jsonb_build_object('username', s.username, 'name', coalesce(sp.display_name, s.full_name),
                                   'photo_key', am.storage_key),
      -- 'text' is NULL for a photo; message_kind already told the page which it is.
      'text', u.text_content, 'message_kind', u.kind,
      'unread_count', u.unread_count, 'sent_at', u.sent_at)
      ORDER BY u.sent_at DESC, u.message_id DESC), '[]'::jsonb))
    INTO result
    FROM unread u
    JOIN visible v ON v.conversation_id = u.conversation_id
    JOIN socialu.students s ON s.student_id = u.sender_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    LEFT JOIN socialu.students ps ON ps.student_id = v.peer_id
    LEFT JOIN socialu.student_profiles pp ON pp.student_id = v.peer_id
   WHERE u.rn = 1;
  RETURN result;
END;
$$;

-- Both functions are server-only, like every other chat function. CREATE OR REPLACE keeps the existing
-- grants, but these are restated so this migration stands on its own if replayed against a fresh database.
REVOKE ALL ON FUNCTION public.socialu_conversation_list(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_conversation_list(UUID) TO service_role;
REVOKE ALL ON FUNCTION public.socialu_message_notifications(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_message_notifications(UUID) TO service_role;

-- LN's school communities makes the public.socialu_* functions treat a student from another school like a
-- blocked one (socialu.community_unavailable). Replacing a function drops that rewrite, so where the rule is
-- installed it is applied again here, exactly as 20261026160100 and 20261026180000 do.
DO $$
BEGIN
  IF to_regprocedure('socialu.community_unavailable(bigint,bigint)') IS NOT NULL THEN
    EXECUTE replace(pg_get_functiondef('public.socialu_conversation_list(uuid)'::regprocedure),
      'socialu.is_blocked(', 'socialu.community_unavailable(');
    EXECUTE replace(pg_get_functiondef('public.socialu_message_notifications(uuid)'::regprocedure),
      'socialu.is_blocked(', 'socialu.community_unavailable(');
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
