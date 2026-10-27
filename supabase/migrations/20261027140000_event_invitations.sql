-- UR-402: an event creator invites registered students at the same university (friends or not).
-- SRS-402.1/402.2 select one or more students, SRS-402.3 send an invitation to each, without duplicates,
-- SRS-402.4 show invitations to the invited student, SRS-402.5 show the creator who was invited.
-- Uses the existing socialu.event_invitations table (one row per event and student). Additive: server-only functions.
-- Apply once after 20261027130000_event_engagement.sql. Safe to re-run.

-- Error codes returned to the API (mapped in lib/event-engagement.ts):
--   42501 verified, active account required     SE404 event not available     SE403 only the event's creator can invite
--   SE409 invitations close when the event begins     SE422 a selected student cannot be invited (nothing is saved)
--   22023 select 1-50 students

-- Registered students who can be invited: verified, active, at the creator's university, and not the creator.
CREATE OR REPLACE FUNCTION socialu.event_invitable(p_creator socialu.students, p_student socialu.students) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p_student.student_id <> p_creator.student_id AND p_student.is_active AND NOT p_student.reverification_required
    AND p_student.email_verified_at IS NOT NULL
    AND p_student.email_domain IN (SELECT d.domain FROM socialu.university_domains d
      WHERE d.university_id = (SELECT university_id FROM socialu.university_domains WHERE domain = p_creator.email_domain));
$$;
REVOKE ALL ON FUNCTION socialu.event_invitable(socialu.students, socialu.students) FROM PUBLIC, anon, authenticated;

-- The signed-in creator of a visible event; anyone else is refused.
CREATE OR REPLACE FUNCTION socialu.event_creator(p_auth_id UUID, p_event_id BIGINT) RETURNS socialu.students
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE s socialu.students%ROWTYPE;
BEGIN
  s := socialu.event_student(p_auth_id);
  IF NOT socialu.event_visible_to(p_event_id, s) THEN
    RAISE EXCEPTION 'Event not available.' USING ERRCODE = 'SE404';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM socialu.events WHERE event_id = p_event_id AND creator_id = s.student_id) THEN
    RAISE EXCEPTION 'Only the event''s creator can invite students.' USING ERRCODE = 'SE403';
  END IF;
  RETURN s;
END;
$$;
REVOKE ALL ON FUNCTION socialu.event_creator(UUID, BIGINT) FROM PUBLIC, anon, authenticated;

-- SRS-402.1: up to 20 students the creator can invite, matching a name or username, each marked if already invited.
CREATE OR REPLACE FUNCTION public.socialu_event_invite_candidates(p_auth_id UUID, p_event_id BIGINT, p_query TEXT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me socialu.students%ROWTYPE;
  pattern TEXT := '%' || replace(replace(replace(coalesce(btrim(p_query), ''), '\', '\\'), '%', '\%'), '_', '\_') || '%';
BEGIN
  me := socialu.event_creator(p_auth_id, p_event_id);
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object('student_id', st.student_id::text, 'username', st.username,
        'full_name', st.full_name, 'invited', EXISTS (SELECT 1 FROM socialu.event_invitations i
          WHERE i.event_id = p_event_id AND i.invitee_id = st.student_id)) ORDER BY st.username)
    FROM (SELECT * FROM socialu.students c
      WHERE socialu.event_invitable(me, c) AND (c.username ILIKE pattern OR c.full_name ILIKE pattern)
      ORDER BY c.username LIMIT 20) st
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_event_invite_candidates(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_event_invite_candidates(UUID, BIGINT, TEXT) TO service_role;

-- SRS-402.2/402.3: invite every selected student in one all-or-nothing step. A student who is already invited
-- is never invited twice (the table's primary key, plus ON CONFLICT DO NOTHING); they are reported back instead.
CREATE OR REPLACE FUNCTION public.socialu_event_invite(p_auth_id UUID, p_event_id BIGINT, p_student_ids JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me socialu.students%ROWTYPE;
  ids BIGINT[];
  newly BIGINT[];
BEGIN
  me := socialu.event_creator(p_auth_id, p_event_id);
  IF EXISTS (SELECT 1 FROM socialu.events WHERE event_id = p_event_id AND starts_at <= now()) THEN
    RAISE EXCEPTION 'Invitations close when the event begins.' USING ERRCODE = 'SE409';
  END IF;

  IF p_student_ids IS NULL OR jsonb_typeof(p_student_ids) <> 'array'
      OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_student_ids) v WHERE jsonb_typeof(v) <> 'string' OR v #>> '{}' !~ '^[1-9][0-9]{0,17}$') THEN
    RAISE EXCEPTION 'Select 1 to 50 students to invite.' USING ERRCODE = '22023';
  END IF;
  SELECT array_agg(DISTINCT (v #>> '{}')::BIGINT) INTO ids FROM jsonb_array_elements(p_student_ids) v;
  IF ids IS NULL OR cardinality(ids) > 50 THEN
    RAISE EXCEPTION 'Select 1 to 50 students to invite.' USING ERRCODE = '22023';
  END IF;

  -- Every selected student must be invitable; otherwise nothing is saved.
  IF (SELECT count(*) FROM socialu.students st WHERE st.student_id = ANY (ids) AND socialu.event_invitable(me, st)) <> cardinality(ids) THEN
    RAISE EXCEPTION 'One or more selected students cannot be invited.' USING ERRCODE = 'SE422';
  END IF;

  WITH inserted AS (
    INSERT INTO socialu.event_invitations (event_id, invitee_id)
    SELECT p_event_id, unnest(ids) ON CONFLICT (event_id, invitee_id) DO NOTHING
    RETURNING invitee_id
  ) SELECT coalesce(array_agg(invitee_id), '{}') INTO newly FROM inserted;

  RETURN jsonb_build_object(
    'invited', coalesce((SELECT jsonb_agg(jsonb_build_object('student_id', st.student_id::text, 'username', st.username,
        'full_name', st.full_name) ORDER BY st.username) FROM socialu.students st WHERE st.student_id = ANY (newly)), '[]'::jsonb),
    'already_invited', coalesce((SELECT jsonb_agg(jsonb_build_object('student_id', st.student_id::text, 'username', st.username,
        'full_name', st.full_name) ORDER BY st.username) FROM socialu.students st
        WHERE st.student_id = ANY (ids) AND NOT st.student_id = ANY (newly)), '[]'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_event_invite(UUID, BIGINT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_event_invite(UUID, BIGINT, JSONB) TO service_role;

-- SRS-402.5: the creator sees every invited student and their current response.
CREATE OR REPLACE FUNCTION public.socialu_event_invitations(p_auth_id UUID, p_event_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM socialu.event_creator(p_auth_id, p_event_id);
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object('student_id', st.student_id::text, 'username', st.username,
        'full_name', st.full_name, 'rsvp', i.rsvp) ORDER BY st.username)
    FROM socialu.event_invitations i JOIN socialu.students st ON st.student_id = i.invitee_id
    WHERE i.event_id = p_event_id
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_event_invitations(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_event_invitations(UUID, BIGINT) TO service_role;

-- SRS-402.4: the signed-in student's invitations to active events that have not started more than a day ago.
CREATE OR REPLACE FUNCTION public.socialu_my_event_invitations(p_auth_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me socialu.students%ROWTYPE;
BEGIN
  me := socialu.event_student(p_auth_id);
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object('event_id', e.event_id::text, 'title', e.title, 'location', e.location,
        'starts_at', e.starts_at, 'creator_username', c.username, 'rsvp', i.rsvp) ORDER BY e.starts_at, e.event_id)
    FROM socialu.event_invitations i
    JOIN socialu.events e ON e.event_id = i.event_id
    JOIN socialu.students c ON c.student_id = e.creator_id
    WHERE i.invitee_id = me.student_id AND e.status = 'active' AND e.starts_at >= now() - interval '1 day'
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_my_event_invitations(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_my_event_invitations(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
