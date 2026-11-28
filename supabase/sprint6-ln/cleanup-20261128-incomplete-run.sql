-- Linh runs this PERSONALLY, ONLY in socialu-rls-sprint6-test SQL Editor.
-- Exact six Auth ids reported by the schema-exposure setup failure.
-- This is fixture cleanup, NOT the RLS fix and NOT before/after evidence.
-- Never delete unrelated accounts. Existing missing rows are safe to skip.
BEGIN;
DO $$
BEGIN
  IF public.ln_student_profiles_rls_test_manifest()->>'fixture' IS DISTINCT FROM 'ln-student-profiles-v1' THEN
    RAISE EXCEPTION 'Missing disposable LN test-project marker. Stop.';
  END IF;
END;
$$;

CREATE TEMP TABLE ln_incomplete_run_ids(id UUID PRIMARY KEY) ON COMMIT DROP;
INSERT INTO ln_incomplete_run_ids VALUES
 ('1f53277a-2177-42f5-b025-d4e6f2b53ea2'),
 ('cdcb4692-9e8c-40f8-9b2b-1c4e9efbdb83'),
 ('f542cd5d-63c5-4887-a173-bb86d2be4bbe'),
 ('5c78af37-0316-4c7c-a825-0b6e9c15b13c'),
 ('f52fb432-4e98-4dec-886f-371c07dc706b'),
 ('6e191b0d-71a4-4f3b-b72a-bd78cf4e3707');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users a JOIN ln_incomplete_run_ids x ON x.id = a.id
             WHERE a.email IS NULL OR left(a.email, 7) <> 'rls-ln-')
     OR EXISTS (SELECT 1 FROM socialu.students s JOIN ln_incomplete_run_ids x ON x.id = s.auth_user_id
                WHERE left(s.username, 7) <> 'rls_ln_') THEN
    RAISE EXCEPTION 'An id does not belong to the generated RLS LN fixtures. Nothing deleted.';
  END IF;
END;
$$;

DELETE FROM socialu.student_blocks b
USING socialu.students s, ln_incomplete_run_ids x
WHERE s.auth_user_id = x.id AND (b.blocker_id = s.student_id OR b.blocked_id = s.student_id);
DELETE FROM socialu.student_profiles p USING socialu.students s, ln_incomplete_run_ids x
WHERE p.student_id = s.student_id AND s.auth_user_id = x.id;
DELETE FROM socialu.students s USING ln_incomplete_run_ids x WHERE s.auth_user_id = x.id;
DELETE FROM auth.users a USING ln_incomplete_run_ids x WHERE a.id = x.id;

SELECT count(*) AS remaining_test_auth_users
FROM auth.users a JOIN ln_incomplete_run_ids x ON x.id = a.id;
COMMIT;
