-- RLS, LP, Secure the messages table -- STEP 1 of 3: the fix.
--
-- Table:        socialu.messages
-- Owner column: sender_id (BIGINT -> socialu.students.student_id)
--
-- THE RULES (the same table that is on the card)
--   select  authenticated  messages of a conversation this student belongs to; for a group,
--                          only those sent inside their own membership window. A student also
--                          always sees their own message, sent or failed.
--   insert  authenticated  only rows where sender_id is this student AND they are a current
--                          participant of that conversation.
--   update  nobody         no policy. The app never updates a message (checked: the four
--                          INSERT sites in supabase/migrations are the only writes).
--   delete  nobody         no policy. The app hides messages (socialu.deleted_messages,
--                          socialu.hidden_messages); it never deletes a row.
--   anon    nothing        no policy at all, so a logged-out visitor matches no row.
--
-- The select rule is the SRS-213.5 rule the app already enforces in socialu.can_read_message,
-- including the former-member history window from #1222. It is restated here against the row's
-- own columns rather than by calling that function, because can_read_message selects FROM
-- messages and a policy on messages that queries messages recurses forever.
--
-- WHY THE HELPERS ARE SECURITY DEFINER
-- A policy is evaluated as the caller. `authenticated` has no rights on socialu.conversations or
-- socialu.group_memberships (step 0 granted it nothing but socialu.messages), so an inline
-- subquery would fail with "permission denied". SECURITY DEFINER runs the lookup as the function
-- owner instead. Each one is STABLE, takes only ids, and returns only true/false, so it leaks
-- nothing beyond the answer the policy needs. SET search_path = '' keeps them from resolving
-- names through a caller-controlled path.
--
-- Run in the Supabase SQL Editor after rls-messages-00-expose.sql.
-- Expected: "Success. No rows returned." Then run rls-messages-verify.sql (screenshot 2 of 3)
-- and re-run npm run test:security (screenshot 3 of 3).

BEGIN;

-- Which student is calling? NULL for a logged-out visitor, and NULL for an account that is
-- suspended, unverified or awaiting reverification -- the same gate as socialu_require_student.
CREATE OR REPLACE FUNCTION socialu.rls_current_student() RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
  SELECT s.student_id FROM socialu.students s
   WHERE s.auth_user_id = (SELECT auth.uid())
     AND s.is_active
     AND NOT s.reverification_required
     AND s.email_verified_at IS NOT NULL;
$fn$;

-- May student s be shown a message that was posted in conversation c at time t?
-- Private: either side of the pair. Group: a membership row whose window contains t, which is
-- what lets a former member keep the history they could read while they were in the group.
CREATE OR REPLACE FUNCTION socialu.rls_may_read_in(c BIGINT, s BIGINT, t TIMESTAMPTZ)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM socialu.conversations cv
     WHERE cv.conversation_id = c
       AND ((cv.kind = 'private' AND s IN (cv.private_student_low, cv.private_student_high))
         OR (cv.kind = 'group' AND EXISTS (
               SELECT 1 FROM socialu.group_memberships gm
                WHERE gm.conversation_id = c
                  AND gm.student_id = s
                  AND t >= gm.joined_at
                  AND (gm.left_at IS NULL OR t < gm.left_at)))));
$fn$;

-- May student s still act in conversation c right now? The app's own send-side gate.
CREATE OR REPLACE FUNCTION socialu.rls_is_current_member(c BIGINT, s BIGINT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $fn$
  SELECT socialu.is_current_participant(c, s);
$fn$;

-- Only a signed-in student ever evaluates these.
REVOKE ALL ON FUNCTION socialu.rls_current_student() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION socialu.rls_may_read_in(BIGINT, BIGINT, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION socialu.rls_is_current_member(BIGINT, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION socialu.rls_current_student() TO authenticated;
GRANT EXECUTE ON FUNCTION socialu.rls_may_read_in(BIGINT, BIGINT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION socialu.rls_is_current_member(BIGINT, BIGINT) TO authenticated;

-- From here on every row of socialu.messages must be allowed by a policy below.
-- With RLS on and no matching policy, a read returns no rows and a write is refused.
ALTER TABLE socialu.messages ENABLE ROW LEVEL SECURITY;

-- Safe to re-run.
DROP POLICY IF EXISTS "Participants read messages they are allowed to see" ON socialu.messages;
DROP POLICY IF EXISTS "Participants send messages as themselves" ON socialu.messages;

CREATE POLICY "Participants read messages they are allowed to see"
  ON socialu.messages
  FOR SELECT
  TO authenticated
  USING (
    (status = 'sent' OR sender_id = socialu.rls_current_student())
    AND socialu.rls_may_read_in(conversation_id,
                                socialu.rls_current_student(),
                                COALESCE(sent_at, created_at))
  );

CREATE POLICY "Participants send messages as themselves"
  ON socialu.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = socialu.rls_current_student()
    AND socialu.rls_is_current_member(conversation_id, socialu.rls_current_student())
  );

-- No UPDATE policy and no DELETE policy, on purpose: the app does neither, so nothing is
-- allowed to. No policy mentions anon, so a logged-out visitor matches nothing at all.

COMMIT;

NOTIFY pgrst, 'reload schema';
