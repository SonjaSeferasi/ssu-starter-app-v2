-- LN / Sprint 6 / #1432. Rules published on the card BEFORE this script.
-- Apply MANUALLY after Linh personally captures the failing BEFORE tests.
-- Real target table; no demo clone. No schema exposure or table grants changed.
-- Keep existing server-side authorization: service_role/owner bypass RLS.
BEGIN;

-- Do not silently combine this design with unknown permissive policies (OR).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'socialu' AND tablename = 'student_profiles'
      AND policyname NOT IN ('ln_profiles_read', 'ln_profiles_insert', 'ln_profiles_update')
  ) THEN
    RAISE EXCEPTION 'Unexpected student_profiles policies. Review them before applying LN rules.';
  END IF;
END;
$$;

-- Separate LN helpers: do not replace teammates' shared rls_student_id().
-- No helper reads student_profiles, so its SELECT policy cannot recurse.
CREATE OR REPLACE FUNCTION socialu.ln_profile_actor() RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT s.student_id
  FROM socialu.students s JOIN auth.users a ON a.id = s.auth_user_id
  WHERE s.auth_user_id = auth.uid()
    AND s.is_active AND NOT s.reverification_required
    AND s.email_verified_at IS NOT NULL AND a.email_confirmed_at IS NOT NULL
    AND pg_catalog.lower(a.email) = pg_catalog.lower(s.university_email);
$$;

CREATE OR REPLACE FUNCTION socialu.ln_profile_visible(p_target BIGINT) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT := socialu.ln_profile_actor();
BEGIN
  IF me IS NULL THEN RETURN FALSE; END IF;
  IF p_target = me THEN RETURN TRUE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM socialu.students s
    JOIN auth.users a ON a.id = s.auth_user_id
    JOIN socialu.university_domains theirs ON theirs.domain = s.email_domain
    JOIN socialu.students caller ON caller.student_id = me
    JOIN socialu.university_domains mine
      ON mine.domain = caller.email_domain AND mine.university_id = theirs.university_id
    WHERE s.student_id = p_target AND s.is_active AND NOT s.reverification_required
      AND s.email_verified_at IS NOT NULL AND a.email_confirmed_at IS NOT NULL
      AND pg_catalog.lower(a.email) = pg_catalog.lower(s.university_email)
      AND NOT EXISTS (
        SELECT 1 FROM socialu.student_blocks b
        WHERE (b.blocker_id = me AND b.blocked_id = p_target)
           OR (b.blocker_id = p_target AND b.blocked_id = me)
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION socialu.ln_profile_photo_owned(p_photo BIGINT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p_photo IS NULL OR EXISTS (
    SELECT 1 FROM socialu.media_assets m
    WHERE m.asset_id = p_photo AND m.owner_id = socialu.ln_profile_actor()
      AND m.upload_context = 'profile'
  );
$$;

REVOKE ALL ON FUNCTION socialu.ln_profile_actor() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION socialu.ln_profile_visible(BIGINT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION socialu.ln_profile_photo_owned(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION socialu.ln_profile_actor(), socialu.ln_profile_visible(BIGINT),
  socialu.ln_profile_photo_owned(BIGINT) TO authenticated, service_role;

ALTER TABLE socialu.student_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ln_profiles_read ON socialu.student_profiles;
DROP POLICY IF EXISTS ln_profiles_insert ON socialu.student_profiles;
DROP POLICY IF EXISTS ln_profiles_update ON socialu.student_profiles;

CREATE POLICY ln_profiles_read ON socialu.student_profiles
  FOR SELECT TO authenticated USING (socialu.ln_profile_visible(student_id));

CREATE POLICY ln_profiles_insert ON socialu.student_profiles
  FOR INSERT TO authenticated
  WITH CHECK (student_id = (SELECT socialu.ln_profile_actor())
    AND socialu.ln_profile_photo_owned(photo_id));

CREATE POLICY ln_profiles_update ON socialu.student_profiles
  FOR UPDATE TO authenticated
  USING (student_id = (SELECT socialu.ln_profile_actor()))
  WITH CHECK (student_id = (SELECT socialu.ln_profile_actor())
    AND socialu.ln_profile_photo_owned(photo_id));

-- No DELETE policy, and no anon policy: default deny, even for the owner.
-- Existing column validation, 7-day name rules and media triggers remain.
NOTIFY pgrst, 'reload schema';
COMMIT;
