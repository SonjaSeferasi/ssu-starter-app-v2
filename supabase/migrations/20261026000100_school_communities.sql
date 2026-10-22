-- Automatic academic-domain communities. Apply after the existing migrations.
-- No student, post, friendship, or message data is reset.
BEGIN;
ALTER TABLE socialu.university DROP CONSTRAINT IF EXISTS university_university_id_check;
CREATE SEQUENCE IF NOT EXISTS socialu.university_id_seq AS SMALLINT;
SELECT setval('socialu.university_id_seq', greatest(1, (SELECT coalesce(max(university_id), 1) FROM socialu.university)), true);
ALTER TABLE socialu.university ALTER COLUMN university_id SET DEFAULT nextval('socialu.university_id_seq');
-- Missing domain mappings must never silently place students in Salem State.
ALTER TABLE socialu.university_domains ALTER COLUMN university_id DROP DEFAULT;

CREATE OR REPLACE FUNCTION socialu.academic_school_domain(p_email TEXT) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE d TEXT; labels TEXT[]; n INTEGER;
BEGIN
  IF p_email IS NULL OR length(p_email) > 254 OR p_email !~ '^[^@[:space:]]+@[^@[:space:]]+$' THEN RETURN NULL; END IF;
  d := lower(split_part(p_email, '@', 2)); labels := string_to_array(d, '.'); n := cardinality(labels);
  IF EXISTS (SELECT 1 FROM unnest(labels) label WHERE label !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$') THEN RETURN NULL; END IF;
  IF n >= 2 AND labels[n] = 'edu' THEN RETURN array_to_string(labels[n-1:n], '.'); END IF;
  IF n >= 3 AND labels[n-1] IN ('edu', 'ac') AND labels[n] ~ '^[a-z]{2}$' THEN RETURN array_to_string(labels[n-2:n], '.'); END IF;
  RETURN NULL;
END;
$$;

-- Called only while registering/onboarding, never from an untrusted school-id field.
CREATE OR REPLACE FUNCTION socialu.ensure_school(p_email TEXT) RETURNS SMALLINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE school_domain TEXT; email_domain TEXT; school_id SMALLINT;
BEGIN
  school_domain := socialu.academic_school_domain(p_email);
  IF school_domain IS NULL THEN RAISE EXCEPTION 'Use a supported school email.' USING ERRCODE = '22023'; END IF;
  email_domain := lower(split_part(p_email, '@', 2));
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('school:' || school_domain, 0));
  SELECT university_id INTO school_id FROM socialu.university_domains WHERE domain = school_domain;
  IF school_id IS NULL THEN
    INSERT INTO socialu.university(name) VALUES(school_domain) RETURNING university_id INTO school_id;
    INSERT INTO socialu.university_domains(domain, university_id) VALUES(school_domain, school_id);
  END IF;
  INSERT INTO socialu.university_domains(domain, university_id) VALUES(email_domain, school_id) ON CONFLICT DO NOTHING;
  SELECT university_id INTO school_id FROM socialu.university_domains WHERE domain = email_domain;
  RETURN school_id;
END;
$$;
REVOKE ALL ON FUNCTION socialu.ensure_school(TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION socialu.same_school(a BIGINT, b BIGINT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM socialu.students x JOIN socialu.university_domains dx ON dx.domain = x.email_domain
    JOIN socialu.students y ON y.student_id = b JOIN socialu.university_domains dy ON dy.domain = y.email_domain
    WHERE x.student_id = a AND dx.university_id = dy.university_id);
$$;
CREATE OR REPLACE FUNCTION socialu.community_unavailable(a BIGINT, b BIGINT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT NOT socialu.same_school(a,b) OR socialu.is_blocked(a,b);
$$;
REVOKE ALL ON FUNCTION socialu.same_school(BIGINT,BIGINT), socialu.community_unavailable(BIGINT,BIGINT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.socialu_account(
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
    PERFORM socialu.ensure_school(p_identifier);
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
  IF p_action = 'onboard' THEN PERFORM socialu.ensure_school(a.email); END IF;
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
    'setup_completed', p.setup_completed,
    'university', (SELECT jsonb_build_object('id', u.university_id, 'name', u.name) FROM socialu.university_domains d
      JOIN socialu.university u USING(university_id) WHERE d.domain = s.email_domain))
  INTO result FROM socialu.student_profiles p WHERE p.student_id = s.student_id;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_account(TEXT, UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_account(TEXT, UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.socialu_auth_guard(p_action TEXT, p_email TEXT, p_purpose TEXT DEFAULT 'signup')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  r socialu.auth_flow_limits%ROWTYPE;
  sent TIMESTAMPTZ;
  wait_seconds INTEGER;
BEGIN
  p_email := lower(btrim(p_email));
  IF socialu.academic_school_domain(p_email) IS NULL THEN
    RAISE EXCEPTION 'Invalid university email' USING ERRCODE = '22023';
  END IF;
  INSERT INTO socialu.auth_flow_limits(email) VALUES(p_email) ON CONFLICT DO NOTHING;
  SELECT * INTO r FROM socialu.auth_flow_limits WHERE email = p_email FOR UPDATE;
  IF p_action = 'failure' THEN
    UPDATE socialu.auth_flow_limits SET failures = failures + 1,
      verification_required = verification_required OR failures + 1 >= 5 WHERE email = p_email RETURNING * INTO r;
    UPDATE socialu.students SET failed_login_count = r.failures,
      reverification_required = r.verification_required WHERE lower(university_email) = p_email;
  ELSIF p_action IN ('success', 'verified') THEN
    UPDATE socialu.auth_flow_limits SET failures = 0,
      verification_required = CASE WHEN p_action = 'verified' THEN FALSE ELSE verification_required END
      WHERE email = p_email RETURNING * INTO r;
    UPDATE socialu.students SET failed_login_count = 0,
      reverification_required = r.verification_required WHERE lower(university_email) = p_email;
  ELSIF p_action = 'send' THEN
    IF p_purpose NOT IN ('signup','recovery','reverification') THEN
      RAISE EXCEPTION 'Invalid code purpose' USING ERRCODE = '22023';
    END IF;
    sent := CASE p_purpose WHEN 'signup' THEN r.signup_sent_at WHEN 'recovery' THEN r.recovery_sent_at ELSE r.reverification_sent_at END;
    wait_seconds := greatest(0, ceil(30 - extract(epoch FROM (clock_timestamp() - sent)))::INTEGER);
    IF wait_seconds > 0 THEN RETURN jsonb_build_object('retry_after',wait_seconds); END IF;
    UPDATE socialu.auth_flow_limits SET
      signup_sent_at = CASE WHEN p_purpose = 'signup' THEN clock_timestamp() ELSE signup_sent_at END,
      recovery_sent_at = CASE WHEN p_purpose = 'recovery' THEN clock_timestamp() ELSE recovery_sent_at END,
      reverification_sent_at = CASE WHEN p_purpose = 'reverification' THEN clock_timestamp() ELSE reverification_sent_at END
      WHERE email = p_email;
  ELSIF p_action <> 'status' THEN
    RAISE EXCEPTION 'Invalid action' USING ERRCODE = '22023';
  END IF;
  RETURN jsonb_build_object('verification_required',r.verification_required,'retry_after',0);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_auth_guard(TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_auth_guard(TEXT,TEXT,TEXT) TO service_role;


-- Keep existing block behavior distinct: a campus boundary is an additional access rule.
-- Recompile the installed source, retaining team changes and existing function grants.
DO $$
DECLARE fn RECORD; definition TEXT;
BEGIN
  FOR fn IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE (n.nspname='public' AND p.proname LIKE 'socialu_%' OR n.nspname='dormspace_live')
      AND p.prokind='f' AND strpos(p.prosrc, 'socialu.is_blocked(')>0
  LOOP
    definition := pg_get_functiondef(fn.oid);
    EXECUTE replace(definition, 'socialu.is_blocked(', 'socialu.community_unavailable(');
  END LOOP;
  FOR fn IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='socialu' AND p.proname IN ('are_friends','can_send_private')
  LOOP
    EXECUTE replace(pg_get_functiondef(fn.oid), 'NOT is_blocked(a,b)', 'same_school(a,b) AND NOT is_blocked(a,b)');
  END LOOP;
END;
$$;

-- Scope feed queries explicitly, including installations with an older feed body.
DO $$
DECLARE fn RECORD; d TEXT;
BEGIN
  FOR fn IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('socialu_campus_feed','socialu_friends_feed')
  LOOP
    d := pg_get_functiondef(fn.oid);
    IF strpos(d, 'WHERE p.visibility') = 0 THEN RAISE EXCEPTION 'Unsupported feed version: apply current feed migrations first.'; END IF;
    EXECUTE replace(d, 'WHERE p.visibility', 'WHERE socialu.same_school(me,p.author_id) AND p.visibility');
  END LOOP;
END;
$$;

-- Public post IDs do not bypass campus boundaries (likes, comments, reports, photo reads).
CREATE OR REPLACE FUNCTION socialu.require_school_post(p_auth_id UUID, p_post_id BIGINT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT;
BEGIN
  IF p_post_id IS NULL THEN RETURN; END IF;
  me := public.socialu_require_student(p_auth_id);
  IF NOT EXISTS (SELECT 1 FROM socialu.posts p WHERE p.post_id=p_post_id AND socialu.same_school(me,p.author_id)) THEN
    RAISE EXCEPTION 'This post is not available.' USING ERRCODE='P0002';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION socialu.require_school_post(UUID,BIGINT) FROM PUBLIC, anon, authenticated;
DO $$
DECLARE fn RECORD;
BEGIN
  FOR fn IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    JOIN pg_language l ON l.oid=p.prolang
    WHERE n.nspname='public' AND p.proname LIKE 'socialu_%' AND l.lanname='plpgsql'
      AND p.proargnames @> ARRAY['p_auth_id','p_post_id']::text[]
  LOOP
    EXECUTE regexp_replace(pg_get_functiondef(fn.oid), '\mBEGIN\M',
      E'BEGIN\n  PERFORM socialu.require_school_post(p_auth_id,p_post_id);', 'i');
  END LOOP;
END;
$$;

-- A group belongs to its creator's school; membership alone is never a cross-campus grant.
CREATE OR REPLACE FUNCTION socialu.is_current_participant(c BIGINT, s BIGINT) RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path=socialu,pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM conversations cv WHERE cv.conversation_id=c AND same_school(s,cv.created_by) AND
    ((cv.kind='private' AND s IN(cv.private_student_low,cv.private_student_high)
       AND same_school(s,cv.private_student_low) AND same_school(s,cv.private_student_high))
     OR (cv.kind='group' AND EXISTS (SELECT 1 FROM group_memberships gm WHERE gm.conversation_id=c AND gm.student_id=s AND gm.left_at IS NULL))));
$$;
DO $$
DECLARE d TEXT;
BEGIN
  SELECT pg_get_functiondef('socialu.can_read_message(bigint,bigint)'::regprocedure) INTO d;
  EXECUTE replace(d, 'WHERE msg.message_id=m AND', 'WHERE socialu.same_school(s,c.created_by) AND socialu.same_school(s,msg.sender_id) AND msg.message_id=m AND');
  IF to_regprocedure('public.socialu_conversation_list(uuid)') IS NOT NULL THEN
    SELECT pg_get_functiondef('public.socialu_conversation_list(uuid)'::regprocedure) INTO d;
    EXECUTE replace(d, 'WHERE m.kind = ''group'' OR', 'WHERE (m.kind = ''group'' AND socialu.is_current_participant(m.conversation_id,me)) OR');
  END IF;
END;
$$;

-- Defense in depth: no cross-school relationships/tags/group memberships can be inserted.
CREATE OR REPLACE FUNCTION socialu.require_same_school_pair() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a BIGINT; b BIGINT; row_data JSONB := to_jsonb(NEW);
BEGIN
  a := (row_data->>TG_ARGV[0])::BIGINT;
  b := (row_data->>TG_ARGV[1])::BIGINT;
  IF TG_ARGV[2] = 'post' THEN SELECT author_id INTO b FROM socialu.posts WHERE post_id=b; END IF;
  IF TG_ARGV[2] = 'conversation' THEN SELECT created_by INTO b FROM socialu.conversations WHERE conversation_id=b; END IF;
  IF NOT socialu.same_school(a,b) THEN RAISE EXCEPTION 'This action is limited to your school community.' USING ERRCODE='42501'; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION socialu.require_same_school_pair() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER community_boundary BEFORE INSERT OR UPDATE ON socialu.friend_requests FOR EACH ROW EXECUTE FUNCTION socialu.require_same_school_pair('sender_id','recipient_id','student');
CREATE TRIGGER community_boundary BEFORE INSERT OR UPDATE ON socialu.student_follows FOR EACH ROW EXECUTE FUNCTION socialu.require_same_school_pair('follower_id','followed_id','student');
CREATE TRIGGER community_boundary BEFORE INSERT OR UPDATE ON socialu.message_requests FOR EACH ROW EXECUTE FUNCTION socialu.require_same_school_pair('sender_id','recipient_id','student');
CREATE TRIGGER community_boundary BEFORE INSERT OR UPDATE ON socialu.post_tags FOR EACH ROW EXECUTE FUNCTION socialu.require_same_school_pair('student_id','post_id','post');
CREATE TRIGGER community_boundary BEFORE INSERT OR UPDATE ON socialu.post_likes FOR EACH ROW EXECUTE FUNCTION socialu.require_same_school_pair('student_id','post_id','post');
CREATE TRIGGER community_boundary BEFORE INSERT OR UPDATE ON socialu.saved_posts FOR EACH ROW EXECUTE FUNCTION socialu.require_same_school_pair('student_id','post_id','post');
CREATE TRIGGER community_boundary BEFORE INSERT OR UPDATE ON socialu.post_comments FOR EACH ROW EXECUTE FUNCTION socialu.require_same_school_pair('author_id','post_id','post');
CREATE TRIGGER community_boundary BEFORE INSERT OR UPDATE ON socialu.group_memberships FOR EACH ROW EXECUTE FUNCTION socialu.require_same_school_pair('student_id','conversation_id','conversation');

NOTIFY pgrst, 'reload schema';
COMMIT;
