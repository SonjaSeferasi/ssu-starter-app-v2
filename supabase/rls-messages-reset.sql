-- RLS, LP, Secure the messages table -- undo everything, if the demo has to start over.
-- This puts socialu.messages back to the state it was in before rls-messages-00-expose.sql.
BEGIN;
DROP POLICY IF EXISTS "Participants read messages they are allowed to see" ON socialu.messages;
DROP POLICY IF EXISTS "Participants send messages as themselves" ON socialu.messages;
ALTER TABLE socialu.messages DISABLE ROW LEVEL SECURITY;
REVOKE ALL ON socialu.messages FROM anon, authenticated;
REVOKE USAGE ON SCHEMA socialu FROM anon, authenticated;
DROP FUNCTION IF EXISTS socialu.rls_may_read_in(BIGINT, BIGINT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS socialu.rls_is_current_member(BIGINT, BIGINT);
DROP FUNCTION IF EXISTS socialu.rls_current_student();
COMMIT;
-- Also remove `socialu` from Project Settings -> API -> Exposed schemas.
NOTIFY pgrst, 'reload schema';
