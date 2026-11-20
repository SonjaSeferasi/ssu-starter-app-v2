-- #1384 RLS, LP: Secure the messages table.
-- Turns on Row Level Security for socialu.messages, so the table protects itself even if it is ever reached
-- from the browser through the Data API (the anon key is public). Today socialu is not exposed and the browser
-- roles have no grants on it; this is the second lock. Attack tests: __tests__/security/messages.rls.test.ts.
-- Follows 20261119120000_events_rls.sql (#1382, KB), including its socialu.rls_student_id() helper.
--
-- Rules ("me" = the caller's auth.uid() as a verified, active student, the same account check as the app):
--   SELECT  messages of a conversation I belong to. Private: either side of the pair. Group: only messages
--           sent inside one of my own membership periods, which is what lets someone who left a group keep
--           the history they could read while they were in it (SRS-213.5, #1222). I always see my own
--           message, whether it was sent or failed.
--   INSERT  only as the sender, and only into a conversation I am a current participant of.
--   UPDATE  nobody: the app never edits a message. The four INSERT sites in supabase/migrations are the only
--           writes it makes to this table.
--   DELETE  nobody: the app hides messages (socialu.deleted_messages, socialu.hidden_messages) so a reply
--           still has something to point at (SRS-209.6). It never removes the row.
--   anon    nothing.
--
-- The SELECT rule is the rule the app already enforces in socialu.can_read_message. It is restated here
-- against the row's own columns rather than by calling that function, because can_read_message selects
-- FROM messages, and a policy on messages that queries messages recurses forever.
--
-- Cross-school isolation is not repeated here. A membership or private pair cannot span two schools in the
-- first place: socialu.require_same_school_pair() refuses such a row on the way in (20261026000100), so
-- belonging to the conversation already implies the same school.
--
-- The app is unaffected: every chat feature runs through SECURITY DEFINER functions owned by the table owner,
-- and the server's service_role has BYPASSRLS. RLS is enabled but not forced, so the owner still bypasses it.
-- Additive. Apply once, after the chat migrations. Safe to re-run.

-- Who is asking: the signed-in user's student id, or null if they are signed out or not a verified, active
-- student. Same definition as 20261119120000_events_rls.sql; repeated with CREATE OR REPLACE so this
-- migration can be applied, and tested, on its own.
CREATE OR REPLACE FUNCTION socialu.rls_student_id() RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT student_id FROM socialu.students
  WHERE auth_user_id = auth.uid() AND is_active AND NOT reverification_required AND email_verified_at IS NOT NULL;
$$;

-- Did I belong to this conversation at the moment this message was posted? For a group that means a
-- membership period containing that moment, so a former member keeps what they could already read and gains
-- nothing sent after they left.
CREATE OR REPLACE FUNCTION socialu.rls_in_conversation_at(p_conversation_id BIGINT, p_at TIMESTAMPTZ)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM socialu.conversations c
    WHERE c.conversation_id = p_conversation_id
      AND ((c.kind = 'private'
            AND (SELECT socialu.rls_student_id()) IN (c.private_student_low, c.private_student_high))
        OR (c.kind = 'group' AND EXISTS (
              SELECT 1 FROM socialu.group_memberships gm
              WHERE gm.conversation_id = p_conversation_id
                AND gm.student_id = (SELECT socialu.rls_student_id())
                AND p_at >= gm.joined_at
                AND (gm.left_at IS NULL OR p_at < gm.left_at)))));
$$;

-- Am I a participant right now? The send-side gate: a former member may still read, but may not post.
CREATE OR REPLACE FUNCTION socialu.rls_current_participant(p_conversation_id BIGINT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM socialu.conversations c
    WHERE c.conversation_id = p_conversation_id
      AND ((c.kind = 'private'
            AND (SELECT socialu.rls_student_id()) IN (c.private_student_low, c.private_student_high))
        OR (c.kind = 'group' AND EXISTS (
              SELECT 1 FROM socialu.group_memberships gm
              WHERE gm.conversation_id = p_conversation_id
                AND gm.student_id = (SELECT socialu.rls_student_id())
                AND gm.left_at IS NULL))));
$$;

-- The policies run as the caller, so signed-in users need to call these. They only reveal the caller's own id
-- and yes/no answers about rows the policies already guard; signed-out visitors get nothing.
REVOKE ALL ON FUNCTION socialu.rls_student_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION socialu.rls_in_conversation_at(BIGINT, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION socialu.rls_current_participant(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION socialu.rls_student_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION socialu.rls_in_conversation_at(BIGINT, TIMESTAMPTZ) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION socialu.rls_current_participant(BIGINT) TO authenticated, service_role;

-- 1. Turn RLS on. From here, every row is hidden from anon and authenticated until a policy allows it.
ALTER TABLE socialu.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can read the messages they are allowed to see" ON socialu.messages;
DROP POLICY IF EXISTS "Participants can send messages as themselves" ON socialu.messages;

-- 2. READ: a message of a conversation I belonged to when it was posted. My own message is mine to see even
--    when it failed to send; everyone else's has to have been sent.
CREATE POLICY "Participants can read the messages they are allowed to see"
  ON socialu.messages FOR SELECT TO authenticated
  USING (
    (status = 'sent' OR sender_id = (SELECT socialu.rls_student_id()))
    AND socialu.rls_in_conversation_at(conversation_id, COALESCE(sent_at, created_at))
  );

-- 3. SEND: only with myself as the sender, and only where I am still a participant.
CREATE POLICY "Participants can send messages as themselves"
  ON socialu.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (SELECT socialu.rls_student_id())
    AND socialu.rls_current_participant(conversation_id)
  );

-- 4. UPDATE: intentionally no policy. The app never edits a message, so nothing may.
-- 5. DELETE: intentionally no policy. Messages are hidden, never deleted.
-- 6. anon (not signed in): intentionally no policy, so visitors see nothing.

NOTIFY pgrst, 'reload schema';
