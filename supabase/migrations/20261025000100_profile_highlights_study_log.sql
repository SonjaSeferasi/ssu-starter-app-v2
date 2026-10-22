-- SocialU | Profile highlights and Study Log (profile UI design), owner LN.
-- Additive only; never resets existing student data. Apply after 20261024000100_unify_notifications.sql.
-- Same access pattern as 20261015180000_profile_social.sql: raw tables stay outside the Data API and the
-- Next.js server calls these SECURITY DEFINER functions via service_role with the verified auth user id.

-- Highlights: named collections of the owner's own posts, shown as circles above the profile tabs.
CREATE TABLE IF NOT EXISTS socialu.profile_highlights (
  highlight_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id BIGINT NOT NULL REFERENCES socialu.students(student_id) ON DELETE CASCADE,
  title VARCHAR(30) NOT NULL CHECK (btrim(title) <> ''),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profile_highlights_owner ON socialu.profile_highlights(owner_id, created_at);
CREATE TABLE IF NOT EXISTS socialu.profile_highlight_posts (
  highlight_id BIGINT NOT NULL REFERENCES socialu.profile_highlights(highlight_id) ON DELETE CASCADE,
  post_id BIGINT NOT NULL REFERENCES socialu.posts(post_id) ON DELETE CASCADE,
  PRIMARY KEY (highlight_id, post_id)
);

-- Study Log: courses with a self-reported progress, and logged focus sessions.
CREATE TABLE IF NOT EXISTS socialu.study_courses (
  course_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES socialu.students(student_id) ON DELETE CASCADE,
  name VARCHAR(60) NOT NULL CHECK (btrim(name) <> ''),
  progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS study_courses_student ON socialu.study_courses(student_id, created_at);
CREATE TABLE IF NOT EXISTS socialu.study_sessions (
  session_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES socialu.students(student_id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES socialu.study_courses(course_id) ON DELETE SET NULL,
  minutes INTEGER NOT NULL CHECK (minutes BETWEEN 1 AND 720),
  -- Campus day (America/New_York), so a streak follows the student's calendar, not UTC.
  studied_on DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/New_York')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS study_sessions_student ON socialu.study_sessions(student_id, studied_on DESC);

ALTER TABLE socialu.profile_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE socialu.profile_highlight_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE socialu.study_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE socialu.study_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON socialu.profile_highlights, socialu.profile_highlight_posts, socialu.study_courses, socialu.study_sessions FROM anon, authenticated;

-- list | create | delete. Viewers only see posts they may see (socialu_profile_visible_post),
-- and a highlight with no visible posts is hidden from everyone but its owner.
CREATE OR REPLACE FUNCTION public.socialu_profile_highlights(
  p_auth_id UUID, p_action TEXT, p_username TEXT DEFAULT NULL,
  p_title TEXT DEFAULT NULL, p_post_ids BIGINT[] DEFAULT NULL, p_highlight_id BIGINT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; target BIGINT; v_id BIGINT; v_title TEXT := btrim(coalesce(p_title, '')); result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  target := public.socialu_profile_target(me, p_username);

  IF p_action = 'create' THEN
    IF target <> me THEN RAISE EXCEPTION 'You can only change your own highlights.' USING ERRCODE = '42501'; END IF;
    IF v_title = '' OR length(v_title) > 30 THEN RAISE EXCEPTION 'Give your highlight a name of up to 30 characters.' USING ERRCODE = '22023'; END IF;
    IF p_post_ids IS NULL OR cardinality(p_post_ids) = 0 OR cardinality(p_post_ids) > 50 THEN
      RAISE EXCEPTION 'Choose between 1 and 50 posts.' USING ERRCODE = '22023';
    END IF;
    IF (SELECT count(DISTINCT p.post_id) FROM socialu.posts p WHERE p.post_id = ANY(p_post_ids) AND p.author_id = me)
       <> (SELECT count(DISTINCT x) FROM unnest(p_post_ids) x) THEN
      RAISE EXCEPTION 'Highlights can only include your own posts.' USING ERRCODE = '22023';
    END IF;
    IF (SELECT count(*) FROM socialu.profile_highlights WHERE owner_id = me) >= 20 THEN
      RAISE EXCEPTION 'You can have up to 20 highlights.' USING ERRCODE = '22023';
    END IF;
    INSERT INTO socialu.profile_highlights (owner_id, title) VALUES (me, v_title) RETURNING highlight_id INTO v_id;
    INSERT INTO socialu.profile_highlight_posts (highlight_id, post_id) SELECT DISTINCT v_id, x FROM unnest(p_post_ids) x;
  ELSIF p_action = 'delete' THEN
    IF target <> me THEN RAISE EXCEPTION 'You can only change your own highlights.' USING ERRCODE = '42501'; END IF;
    DELETE FROM socialu.profile_highlights WHERE highlight_id = p_highlight_id AND owner_id = me;
    IF NOT FOUND THEN RAISE EXCEPTION 'This highlight is not available.' USING ERRCODE = 'P0002'; END IF;
  ELSIF p_action IS DISTINCT FROM 'list' THEN
    RAISE EXCEPTION 'Choose a valid highlight action.' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object('highlight_id', h.highlight_id, 'title', h.title, 'posts', h.posts)
                            ORDER BY h.created_at, h.highlight_id), '[]'::jsonb) INTO result
  FROM (
    SELECT ph.highlight_id, ph.title, ph.created_at,
      coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.published_at DESC) FROM (
        SELECT p.post_id, p.author_id, p.text_content, p.visibility, p.published_at, p.edited_at,
          coalesce(sp.display_name, s.full_name) AS author_name, s.username AS author_username,
          am.storage_key AS author_photo_key,
          coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', pm.asset_id, 'storage_key', pm.storage_key) ORDER BY pm.asset_id)
                    FROM socialu.post_photos pp JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                    WHERE pp.post_id = p.post_id), '[]'::jsonb) AS photos,
          (SELECT count(*) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS like_count,
          EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS is_liked_by_viewer,
          (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = p.post_id) AS comment_count
        FROM socialu.profile_highlight_posts hp
        JOIN socialu.posts p ON p.post_id = hp.post_id
        JOIN socialu.students s ON s.student_id = p.author_id
        LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
        LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
        WHERE hp.highlight_id = ph.highlight_id AND public.socialu_profile_visible_post(me, p.post_id)
      ) c), '[]'::jsonb) AS posts
    FROM socialu.profile_highlights ph
    WHERE ph.owner_id = target
  ) h
  WHERE target = me OR jsonb_array_length(h.posts) > 0;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_profile_highlights(UUID, TEXT, TEXT, TEXT, BIGINT[], BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_profile_highlights(UUID, TEXT, TEXT, TEXT, BIGINT[], BIGINT) TO service_role;

-- summary | add_course | update_course | remove_course | log_session.
-- Anyone who can open the profile sees the summary; only the owner changes it. Every action returns the summary.
CREATE OR REPLACE FUNCTION public.socialu_study_log(
  p_auth_id UUID, p_action TEXT, p_username TEXT DEFAULT NULL,
  p_course_id BIGINT DEFAULT NULL, p_name TEXT DEFAULT NULL, p_progress INTEGER DEFAULT NULL, p_minutes INTEGER DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me BIGINT; target BIGINT;
  v_name TEXT := btrim(coalesce(p_name, ''));
  today DATE := (now() AT TIME ZONE 'America/New_York')::date;
  week_start DATE := date_trunc('week', (now() AT TIME ZONE 'America/New_York'))::date;
  streak_start DATE; streak INTEGER;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  target := public.socialu_profile_target(me, p_username);
  IF p_action <> 'summary' AND target <> me THEN
    RAISE EXCEPTION 'You can only change your own study log.' USING ERRCODE = '42501';
  END IF;
  IF p_action IN ('update_course', 'remove_course') OR (p_action = 'log_session' AND p_course_id IS NOT NULL) THEN
    IF NOT EXISTS (SELECT 1 FROM socialu.study_courses WHERE course_id = p_course_id AND student_id = me) THEN
      RAISE EXCEPTION 'This course is not available.' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  IF p_action = 'add_course' THEN
    IF v_name = '' OR length(v_name) > 60 THEN RAISE EXCEPTION 'Course names can be up to 60 characters.' USING ERRCODE = '22023'; END IF;
    IF (SELECT count(*) FROM socialu.study_courses WHERE student_id = me) >= 12 THEN
      RAISE EXCEPTION 'You can track up to 12 courses.' USING ERRCODE = '22023';
    END IF;
    INSERT INTO socialu.study_courses (student_id, name, progress) VALUES (me, v_name, coalesce(p_progress, 0));
  ELSIF p_action = 'update_course' THEN
    IF p_progress IS NULL OR p_progress NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Progress must be 0 to 100%%.' USING ERRCODE = '22023'; END IF;
    UPDATE socialu.study_courses SET progress = p_progress WHERE course_id = p_course_id;
  ELSIF p_action = 'remove_course' THEN
    DELETE FROM socialu.study_courses WHERE course_id = p_course_id;
  ELSIF p_action = 'log_session' THEN
    IF p_minutes IS NULL OR p_minutes NOT BETWEEN 1 AND 720 THEN RAISE EXCEPTION 'Log between 1 minute and 12 hours.' USING ERRCODE = '22023'; END IF;
    INSERT INTO socialu.study_sessions (student_id, course_id, minutes, studied_on) VALUES (me, p_course_id, p_minutes, today);
  ELSIF p_action IS DISTINCT FROM 'summary' THEN
    RAISE EXCEPTION 'Choose a valid study action.' USING ERRCODE = '22023';
  END IF;

  -- The streak counts back from today, or from yesterday when today has no session yet.
  streak_start := CASE WHEN EXISTS (SELECT 1 FROM socialu.study_sessions WHERE student_id = target AND studied_on = today)
                       THEN today ELSE today - 1 END;
  SELECT count(*) INTO streak FROM (
    SELECT d, row_number() OVER (ORDER BY d DESC) AS rn
    FROM (SELECT DISTINCT studied_on AS d FROM socialu.study_sessions WHERE student_id = target AND studied_on <= streak_start) days
  ) x WHERE x.d = streak_start - (x.rn - 1)::int;

  RETURN jsonb_build_object(
    'is_own', target = me,
    'streak_days', streak,
    'week_minutes', (SELECT coalesce(sum(minutes), 0) FROM socialu.study_sessions WHERE student_id = target AND studied_on >= week_start),
    'courses_going', (SELECT count(*) FROM socialu.study_courses WHERE student_id = target AND progress < 100),
    'courses', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'course_id', c.course_id, 'name', c.name, 'progress', c.progress,
        'week_minutes', (SELECT coalesce(sum(minutes), 0) FROM socialu.study_sessions ss WHERE ss.course_id = c.course_id AND ss.studied_on >= week_start)
      ) ORDER BY c.created_at, c.course_id), '[]'::jsonb) FROM socialu.study_courses c WHERE c.student_id = target)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_study_log(UUID, TEXT, TEXT, BIGINT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_study_log(UUID, TEXT, TEXT, BIGINT, TEXT, INTEGER, INTEGER) TO service_role;

NOTIFY pgrst, 'reload schema';
