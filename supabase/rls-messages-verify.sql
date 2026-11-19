-- RLS, LP, Secure the messages table -- STEP 2 of 3: prove the fix is really there.
-- Run both queries in the SQL Editor after rls-messages.sql. This output is screenshot 2 of 3:
-- RLS on, and the policies listed.

-- 1. Is row level security switched on for the table?
--    Expect one row: socialu | messages | rls_enabled = true
SELECT n.nspname  AS schema,
       c.relname  AS table,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS forced_for_owner
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'socialu' AND c.relname = 'messages';

-- 2. Which policies exist, for which command, for which role?
--    Expect exactly two rows, both for {authenticated}:
--      "Participants read messages they are allowed to see"  SELECT  (qual set, with_check null)
--      "Participants send messages as themselves"            INSERT  (qual null, with_check set)
--    No UPDATE row, no DELETE row, nothing for anon -- that absence is the point.
SELECT policyname,
       cmd,
       roles,
       qual       AS using_expression,
       with_check AS with_check_expression
  FROM pg_policies
 WHERE schemaname = 'socialu' AND tablename = 'messages'
 ORDER BY cmd, policyname;
