-- Integration only; keeps all 59 SocialU tables and existing data.
-- SRS-100.1-.5, .9-.10, SRS-103.1-.4, .8, SRS-110.5: verified identity/profile linkage.
-- Passwords for linked accounts are owned by Supabase Auth, never copied or fabricated.
-- Apply once after the initial SocialU migration. No reset script is needed.
ALTER TABLE socialu.students
  ADD COLUMN auth_user_id UUID UNIQUE REFERENCES auth.users(id),
  ALTER COLUMN password_digest DROP NOT NULL,
  ADD CONSTRAINT students_credential_source CHECK (auth_user_id IS NOT NULL OR password_digest IS NOT NULL);

-- Launch university/domain explicitly confirmed by Sonja on 2026-10-08.
INSERT INTO socialu.university (university_id, name)
VALUES (1, 'Salem State University') ON CONFLICT (university_id) DO NOTHING;
INSERT INTO socialu.university_domains (domain, university_id)
VALUES ('salemstate.edu', 1) ON CONFLICT (domain) DO NOTHING;

-- Narrow server-only bridge. The API derives p_auth_id from auth.getUser(token),
-- never from a request body. Raw socialu tables remain outside the Data API.
CREATE FUNCTION public.socialu_account(
  p_action TEXT, p_auth_id UUID DEFAULT NULL, p_identifier TEXT DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL, p_username TEXT DEFAULT NULL, p_bio TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  a auth.users%ROWTYPE;
  s socialu.students%ROWTYPE;
  result JSONB;
BEGIN
  IF p_action = 'resolve_login' THEN
    SELECT university_email INTO p_identifier FROM socialu.students
      WHERE username = p_identifier AND auth_user_id IS NOT NULL;
    RETURN jsonb_build_object('email', p_identifier);
  END IF;
  IF p_action = 'check_registration' THEN
    IF NOT EXISTS (SELECT 1 FROM socialu.university_domains WHERE domain = lower(split_part(p_identifier, '@', 2))) THEN
      RAISE EXCEPTION 'Use your approved university email.' USING ERRCODE = '22023';
    END IF;
    IF p_full_name IS NULL OR btrim(p_full_name) = '' OR p_username IS NULL OR btrim(p_username) = '' THEN
      RAISE EXCEPTION 'Full name and username are required.' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM socialu.students WHERE username = btrim(p_username) OR lower(university_email) = lower(p_identifier)) THEN
      RAISE EXCEPTION 'Username or email is already registered.' USING ERRCODE = '23505';
    END IF;
    RETURN '{}'::jsonb;
  END IF;
  -- Serialize onboarding for this provider identity, including concurrent retries.
  SELECT * INTO a FROM auth.users WHERE id = p_auth_id FOR UPDATE;
  IF NOT FOUND OR a.email_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'Verify your university email before continuing.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM socialu.university_domains WHERE domain = lower(split_part(a.email, '@', 2))) THEN
    RAISE EXCEPTION 'Use your approved university email.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO s FROM socialu.students WHERE auth_user_id = a.id FOR UPDATE;
  IF FOUND AND (NOT s.is_active OR s.reverification_required OR s.email_verified_at IS NULL
      OR lower(s.university_email) <> lower(a.email)) THEN
    RAISE EXCEPTION 'Your account requires verification or account support.' USING ERRCODE = '42501';
  END IF;
  IF p_action = 'onboard' AND s.student_id IS NULL THEN
    IF p_full_name IS NULL OR btrim(p_full_name) = '' OR p_username IS NULL OR btrim(p_username) = '' THEN
      RAISE EXCEPTION 'Full name and username are required.' USING ERRCODE = '22023';
    END IF;
    -- Deliberately do not attach an existing student by matching an email alone.
    INSERT INTO socialu.students (auth_user_id, full_name, username, university_email, email_verified_at)
    VALUES (a.id, btrim(p_full_name), btrim(p_username), lower(a.email), a.email_confirmed_at)
    RETURNING * INTO s;
    INSERT INTO socialu.student_profiles(student_id, bio) VALUES (s.student_id, coalesce(p_bio, ''));
  ELSIF p_action NOT IN ('read', 'onboard', 'update_bio') THEN
    RAISE EXCEPTION 'Unsupported account operation.' USING ERRCODE = '22023';
  END IF;
  IF s.student_id IS NULL THEN RETURN NULL; END IF;
  IF p_action = 'update_bio' THEN
    IF p_bio IS NULL OR length(p_bio) > 250 THEN
      RAISE EXCEPTION 'Biography must contain at most 250 characters.' USING ERRCODE = '22023';
    END IF;
    UPDATE socialu.student_profiles SET bio = p_bio WHERE student_id = s.student_id;
  END IF;
  SELECT jsonb_build_object('id', s.student_id::text, 'username', s.username,
    'full_name', s.full_name, 'biography', coalesce(p.bio, ''), 'avatar_url', NULL,
    'setup_completed', p.setup_completed)
  INTO result FROM socialu.student_profiles p WHERE p.student_id = s.student_id;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_account(TEXT, UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_account(TEXT, UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;
NOTIFY pgrst, 'reload schema';
