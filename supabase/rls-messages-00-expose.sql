-- RLS, LP, Secure the messages table -- STEP 0 of 3: make the vulnerability real.
--
-- WHY THIS FILE EXISTS
-- Sprint 6 asks for attack tests that FAIL before the fix. Ours cannot fail yet, because
-- SocialU keeps every table in the private `socialu` schema and the hosted project exposes
-- only `public, graphql_public`:
--     {"code":"PGRST106","hint":"Only the following schemas are exposed: public, graphql_public"}
-- An attack with the anon key is refused by PostgREST before it ever reaches a row, so the
-- tests would pass before the fix and prove nothing (see the assignment: "A test that passes
-- before the fix is not testing anything").
--
-- This script puts socialu.messages into the ordinary Supabase posture the assignment assumes:
-- reachable over the Data API, and - for now - with no row rules at all. That is the real,
-- unsecured "before" state. rls-messages.sql then locks it down.
--
-- SCOPE: exactly one table. anon and authenticated get nothing on any other socialu table, so
-- the rest of the schema still answers "permission denied" even once the schema is exposed.
--
-- BEFORE RUNNING THIS
--   1. Tell the team. This changes the shared hosted project, and the attack tests also create
--      and delete real auth users (assignment, Notes).
--   2. In the Supabase dashboard: Project Settings -> API -> Exposed schemas -> add `socialu`.
--      Without that step PostgREST still refuses every request and nothing below has any effect.
--   3. Run this in the SQL Editor. Expected: "Success. No rows returned."
--   4. Run the attack tests now (npm run test:security). They MUST FAIL. Screenshot 1 of 3.

BEGIN;

-- The two roles PostgREST connects as. USAGE lets them see the schema; it grants no table rights.
GRANT USAGE ON SCHEMA socialu TO anon, authenticated;

-- The unsecured table. All four operations, no row rules: this is the hole the tests prove.
GRANT SELECT, INSERT, UPDATE, DELETE ON socialu.messages TO anon, authenticated;

-- Server-side seeding for the test suite. service_role is never sent to a browser; it is the
-- same key the app's API routes already use, and it bypasses RLS, so it is not an attack path.
GRANT USAGE ON SCHEMA socialu TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON
    socialu.students, socialu.student_profiles, socialu.conversations,
    socialu.group_memberships, socialu.messages
  TO service_role;

COMMIT;

-- Tell PostgREST to re-read the schema, otherwise it keeps serving the old cache.
NOTIFY pgrst, 'reload schema';
