-- TEST PROJECT ONLY: socialu-rls-sprint6-test, not the shared app project.
-- Linh runs this personally to repair fixture setup; this is NOT the RLS fix.
-- socialu.apply_block() performs SELECT/UPDATE on friend_requests as the caller.
-- Attack clients remain anon-key clients and receive no extra permissions.
BEGIN;
DO $$
BEGIN
  IF public.ln_student_profiles_rls_test_manifest()->>'fixture' IS DISTINCT FROM 'ln-student-profiles-v1' THEN
    RAISE EXCEPTION 'Missing disposable LN test-project marker. Stop.';
  END IF;
END;
$$;
GRANT SELECT, UPDATE ON socialu.friend_requests TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
