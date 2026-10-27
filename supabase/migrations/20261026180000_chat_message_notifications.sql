-- SRS-212.9 (UR-212) notify participants of a new message. Tasks #822, #823.
-- Adds the server-only public.socialu_message_notifications(p_auth_id) for the Messages tab on the Notifications
-- page. It returns one notification per conversation that has messages from other participants the student
-- hasn't seen yet, naming the latest sender and the conversation, with how many are new. A message the student
-- watched arrive in an open conversation is marked read right away (SRS-212.5), so it never shows here, and
-- opening a conversation clears its notification.
-- Built from the existing messages and message_reads tables: no new table, and the shared notifications table,
-- its functions and its API (LN / MS) are unchanged.
-- Visibility follows the Messages list: DMs with a blocked or deactivated student are hidden, and groups use the
-- shared participant check. LN's school-community rule is re-applied below where installed, as in 20261026140100.
-- Apply once after 20261026170000_chat_group_name_live.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required (from public.socialu_require_student)

CREATE FUNCTION public.socialu_message_notifications(p_auth_id UUID)
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
  -- Messages from others the student may read and has not read yet, newest first in each conversation.
  unread AS (
    SELECT um.conversation_id, um.message_id, um.sender_id, um.kind, um.text_content, um.sent_at,
           count(*) OVER (PARTITION BY um.conversation_id) AS unread_count,
           row_number() OVER (PARTITION BY um.conversation_id ORDER BY um.sent_at DESC, um.message_id DESC) AS rn
      FROM socialu.messages um JOIN visible v ON v.conversation_id = um.conversation_id
     WHERE um.status = 'sent' AND um.sender_id <> me AND um.kind IN ('text', 'emoji')
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

-- Server-only, like the other chat functions: browsers cannot call it directly.
REVOKE ALL ON FUNCTION public.socialu_message_notifications(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_message_notifications(UUID) TO service_role;

-- LN's school communities makes the public.socialu_* functions treat a student from another school like a blocked
-- one (socialu.community_unavailable). Where that rule is installed, apply it here the same way her migration does.
DO $$
BEGIN
  IF to_regprocedure('socialu.community_unavailable(bigint,bigint)') IS NOT NULL THEN
    EXECUTE replace(pg_get_functiondef('public.socialu_message_notifications(uuid)'::regprocedure),
      'socialu.is_blocked(', 'socialu.community_unavailable(');
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
