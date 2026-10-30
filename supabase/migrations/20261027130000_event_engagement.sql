-- Events engagement: like events, comment on them, say "I'm going", see who's attending, and trending events.
-- Supports UR-401 (discover), UR-403 (attend) and UR-405 (trending, ranked here by event likes).
-- Additive: three new tables and server-only functions; socialu_list_events is replaced to add the counts.
-- Apply once after 20261027125000_event_dress_code.sql. Safe to re-run.

-- Error codes returned to the API (mapped in lib/event-engagement.ts):
--   42501 verified, active account required     SE404 event not available (missing, cancelled or another university)
--   SE409 attendance changes closed (event has started)     22023 comment must be 1-500 characters / unknown action

CREATE TABLE IF NOT EXISTS socialu.event_likes (
  event_id BIGINT NOT NULL REFERENCES socialu.events(event_id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES socialu.students(student_id),
  liked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, student_id)
);

CREATE TABLE IF NOT EXISTS socialu.event_comments (
  comment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES socialu.events(event_id) ON DELETE CASCADE,
  author_id BIGINT NOT NULL REFERENCES socialu.students(student_id),
  text_content TEXT NOT NULL CHECK (btrim(text_content) <> '' AND length(text_content) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS event_comments_event_created ON socialu.event_comments (event_id, created_at);

-- Open "I'm going" attendance, separate from invitation RSVPs in event_invitations (UR-402/UR-403).
CREATE TABLE IF NOT EXISTS socialu.event_attendees (
  event_id BIGINT NOT NULL REFERENCES socialu.events(event_id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES socialu.students(student_id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, student_id)
);

-- Like the other socialu tables, no direct browser access: only the server-only functions below read and write them.
ALTER TABLE socialu.event_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE socialu.event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE socialu.event_attendees ENABLE ROW LEVEL SECURITY;

-- The verified, active student behind a Supabase Auth user (same rule as the other event functions).
CREATE OR REPLACE FUNCTION socialu.event_student(p_auth_id UUID) RETURNS socialu.students
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE s socialu.students%ROWTYPE;
BEGIN
  SELECT * INTO s FROM socialu.students
    WHERE auth_user_id = p_auth_id AND is_active AND NOT reverification_required AND email_verified_at IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'A verified, active university account is required.' USING ERRCODE = '42501';
  END IF;
  RETURN s;
END;
$$;

-- The same events the list shows: active, created by a student at the viewer's university.
CREATE OR REPLACE FUNCTION socialu.event_visible_to(p_event_id BIGINT, p_viewer socialu.students) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM socialu.events ev
    JOIN socialu.students cr ON cr.student_id = ev.creator_id
    WHERE ev.event_id = p_event_id AND ev.status = 'active'
      AND cr.email_domain IN (SELECT d.domain FROM socialu.university_domains d
        WHERE d.university_id = (SELECT university_id FROM socialu.university_domains WHERE domain = p_viewer.email_domain))
  );
$$;

-- Counts and the viewer's own choices for one event.
CREATE OR REPLACE FUNCTION socialu.event_engagement(p_event_id BIGINT, p_viewer_id BIGINT) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'like_count', (SELECT count(*) FROM socialu.event_likes WHERE event_id = p_event_id),
    'liked_by_me', EXISTS (SELECT 1 FROM socialu.event_likes WHERE event_id = p_event_id AND student_id = p_viewer_id),
    'comment_count', (SELECT count(*) FROM socialu.event_comments WHERE event_id = p_event_id),
    'going_count', (SELECT count(*) FROM socialu.event_attendees WHERE event_id = p_event_id),
    'going_by_me', EXISTS (SELECT 1 FROM socialu.event_attendees WHERE event_id = p_event_id AND student_id = p_viewer_id),
    'attendee_preview', coalesce((
      SELECT jsonb_agg(username ORDER BY joined_at, student_id) FROM (
        SELECT st.username, a.joined_at, a.student_id FROM socialu.event_attendees a
        JOIN socialu.students st ON st.student_id = a.student_id
        WHERE a.event_id = p_event_id ORDER BY a.joined_at, a.student_id LIMIT 3) preview), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION socialu.event_student(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION socialu.event_visible_to(BIGINT, socialu.students) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION socialu.event_engagement(BIGINT, BIGINT) FROM PUBLIC, anon, authenticated;

-- SRS-401.1-.6: the event list now also carries likes, comments and attendance for each event.
CREATE OR REPLACE FUNCTION public.socialu_list_events(p_auth_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s socialu.students%ROWTYPE;
BEGIN
  s := socialu.event_student(p_auth_id);

  -- Active events from the same university that have not started more than a day ago, soonest first.
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object('event_id', e.event_id::text, 'creator_id', e.creator_id::text,
        'creator_username', c.username, 'title', e.title, 'description', e.description,
        'location', e.location, 'starts_at', e.starts_at, 'status', e.status, 'dress_code', e.dress_code)
        || socialu.event_engagement(e.event_id, s.student_id) ORDER BY e.starts_at, e.event_id)
    FROM (
      SELECT ev.* FROM socialu.events ev
      JOIN socialu.students cr ON cr.student_id = ev.creator_id
      WHERE ev.status = 'active' AND ev.starts_at >= now() - interval '1 day'
        AND cr.email_domain IN (SELECT d.domain FROM socialu.university_domains d
          WHERE d.university_id = (SELECT university_id FROM socialu.university_domains WHERE domain = s.email_domain))
      ORDER BY ev.starts_at, ev.event_id
      LIMIT 100
    ) e
    JOIN socialu.students c ON c.student_id = e.creator_id
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_list_events(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_list_events(UUID) TO service_role;

-- One event with everyone who is going and every comment, oldest first.
CREATE OR REPLACE FUNCTION public.socialu_event_detail(p_auth_id UUID, p_event_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s socialu.students%ROWTYPE;
  result JSONB;
BEGIN
  s := socialu.event_student(p_auth_id);
  IF NOT socialu.event_visible_to(p_event_id, s) THEN
    RAISE EXCEPTION 'Event not available.' USING ERRCODE = 'SE404';
  END IF;

  SELECT jsonb_build_object('event_id', e.event_id::text, 'creator_id', e.creator_id::text,
      'creator_username', c.username, 'title', e.title, 'description', e.description,
      'location', e.location, 'starts_at', e.starts_at, 'status', e.status, 'dress_code', e.dress_code)
    || socialu.event_engagement(e.event_id, s.student_id)
    || jsonb_build_object(
      'attendees', coalesce((SELECT jsonb_agg(jsonb_build_object('student_id', st.student_id::text,
          'username', st.username, 'full_name', st.full_name) ORDER BY a.joined_at, a.student_id)
        FROM socialu.event_attendees a JOIN socialu.students st ON st.student_id = a.student_id
        WHERE a.event_id = e.event_id), '[]'::jsonb),
      'comments', coalesce((SELECT jsonb_agg(jsonb_build_object('comment_id', ec.comment_id::text,
          'author_username', st.username, 'text', ec.text_content, 'created_at', ec.created_at)
          ORDER BY ec.created_at, ec.comment_id)
        FROM socialu.event_comments ec JOIN socialu.students st ON st.student_id = ec.author_id
        WHERE ec.event_id = e.event_id), '[]'::jsonb))
  INTO result
  FROM socialu.events e JOIN socialu.students c ON c.student_id = e.creator_id
  WHERE e.event_id = p_event_id;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_event_detail(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_event_detail(UUID, BIGINT) TO service_role;

-- Like / unlike and going / not going. Repeating an action is harmless. Returns the updated counts.
CREATE OR REPLACE FUNCTION public.socialu_event_react(p_auth_id UUID, p_event_id BIGINT, p_action TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s socialu.students%ROWTYPE;
BEGIN
  s := socialu.event_student(p_auth_id);
  IF NOT socialu.event_visible_to(p_event_id, s) THEN
    RAISE EXCEPTION 'Event not available.' USING ERRCODE = 'SE404';
  END IF;

  IF p_action IN ('going', 'not_going')
      AND EXISTS (SELECT 1 FROM socialu.events WHERE event_id = p_event_id AND starts_at <= now()) THEN
    -- Same rule as invitation RSVPs (SRS-403.4): attendance closes when the event begins.
    RAISE EXCEPTION 'Attendance changes close when the event begins.' USING ERRCODE = 'SE409';
  END IF;

  IF p_action = 'like' THEN
    INSERT INTO socialu.event_likes (event_id, student_id) VALUES (p_event_id, s.student_id) ON CONFLICT DO NOTHING;
  ELSIF p_action = 'unlike' THEN
    DELETE FROM socialu.event_likes WHERE event_id = p_event_id AND student_id = s.student_id;
  ELSIF p_action = 'going' THEN
    INSERT INTO socialu.event_attendees (event_id, student_id) VALUES (p_event_id, s.student_id) ON CONFLICT DO NOTHING;
  ELSIF p_action = 'not_going' THEN
    DELETE FROM socialu.event_attendees WHERE event_id = p_event_id AND student_id = s.student_id;
  ELSE
    RAISE EXCEPTION 'Unsupported event action.' USING ERRCODE = '22023';
  END IF;

  RETURN socialu.event_engagement(p_event_id, s.student_id);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_event_react(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_event_react(UUID, BIGINT, TEXT) TO service_role;

-- Add a comment (1-500 characters) to an event.
CREATE OR REPLACE FUNCTION public.socialu_event_comment(p_auth_id UUID, p_event_id BIGINT, p_text TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s socialu.students%ROWTYPE;
  c socialu.event_comments%ROWTYPE;
BEGIN
  s := socialu.event_student(p_auth_id);
  IF NOT socialu.event_visible_to(p_event_id, s) THEN
    RAISE EXCEPTION 'Event not available.' USING ERRCODE = 'SE404';
  END IF;
  IF p_text IS NULL OR btrim(p_text) = '' OR length(btrim(p_text)) > 500 THEN
    RAISE EXCEPTION 'Comments must contain 1 to 500 characters.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO socialu.event_comments (event_id, author_id, text_content)
  VALUES (p_event_id, s.student_id, btrim(p_text)) RETURNING * INTO c;

  RETURN jsonb_build_object('comment_id', c.comment_id::text, 'author_username', s.username,
    'text', c.text_content, 'created_at', c.created_at);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_event_comment(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_event_comment(UUID, BIGINT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
