-- Linh runs this personally in SQL Editor for the catalog evidence screenshot.
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'socialu' AND c.relname = 'student_profiles';

SELECT schemaname, tablename, policyname, cmd, roles,
       qual AS using_rule, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'socialu' AND tablename = 'student_profiles'
ORDER BY cmd, policyname;

-- Expected after: rls_enabled=true; three authenticated policies: INSERT,
-- SELECT, UPDATE; UPDATE has USING and WITH CHECK. No DELETE/anon policy.
