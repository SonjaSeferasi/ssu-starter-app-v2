-- TEST PROJECT ONLY. Linh must personally select a DISPOSABLE Supabase project
-- with the real SocialU schema/migrations installed, and notify teammates.
-- This intentionally exposes ONE real table to test RLS independently of grants.
-- DO NOT RUN ON THE SHARED/PRODUCTION PROJECT. Does NOT disable any RLS.
-- Add socialu to the test project's Data API exposed schemas in its dashboard.
BEGIN;
DO $$
BEGIN
  IF (SELECT relrowsecurity FROM pg_catalog.pg_class
      WHERE oid = 'socialu.student_profiles'::regclass) THEN
    RAISE EXCEPTION 'RLS is already enabled. Do not weaken it: use a fresh disposable baseline for BEFORE.';
  END IF;
END;
$$;

GRANT USAGE ON SCHEMA socialu TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON socialu.student_profiles TO anon, authenticated;
-- Fixture administration only; attackers never receive these grants.
GRANT SELECT, INSERT, UPDATE, DELETE ON socialu.student_profiles,
  socialu.students, socialu.student_blocks TO service_role;
-- apply_block() runs as its caller and updates friend_requests, even when
-- these freshly created fixtures have no requests. Never grant this to attackers.
GRANT SELECT, UPDATE ON socialu.friend_requests TO service_role;

CREATE OR REPLACE FUNCTION public.ln_student_profiles_rls_test_manifest() RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT pg_catalog.jsonb_build_object(
    'fixture', 'ln-student-profiles-v1',
    'grants_ok', (
      SELECT pg_catalog.bool_and(pg_catalog.has_table_privilege(r.name::name,
        'socialu.student_profiles', op.name) AND pg_catalog.has_schema_privilege(r.name::name, 'socialu', 'USAGE'))
      FROM (VALUES ('anon'), ('authenticated')) r(name)
      CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) op(name)
    ),
    'anon_bypass', (SELECT r.rolsuper OR r.rolbypassrls OR pg_catalog.pg_has_role(r.oid, c.relowner, 'USAGE')
      FROM pg_catalog.pg_roles r WHERE r.rolname = 'anon'),
    'authenticated_bypass', (SELECT r.rolsuper OR r.rolbypassrls OR pg_catalog.pg_has_role(r.oid, c.relowner, 'USAGE')
      FROM pg_catalog.pg_roles r WHERE r.rolname = 'authenticated'),
    'rls_enabled', c.relrowsecurity
  ) FROM pg_catalog.pg_class c WHERE c.oid = 'socialu.student_profiles'::regclass;
$$;
REVOKE ALL ON FUNCTION public.ln_student_profiles_rls_test_manifest() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ln_student_profiles_rls_test_manifest() TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
