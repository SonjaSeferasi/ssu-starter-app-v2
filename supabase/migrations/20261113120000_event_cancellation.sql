-- UR-404: an event's creator cancels an event that will no longer take place.
-- SRS-404 cancel: the creator confirms, the event is marked cancelled (status, time and an optional note),
-- and invited students still see the event and their invitation, with the cancellation notice.
-- Additive: two columns on socialu.events and server-only functions; socialu_event_detail and
-- socialu_my_event_invitations are replaced to show cancelled events to the people they concern.
-- Apply once after 20261027140000_event_invitations.sql. Safe to re-run.

-- Error codes returned to the API (mapped in lib/event-engagement.ts):
--   42501 verified, active account required     SE404 event not available     SE403 only the event's creator can cancel
--   SE409 the event has already started     22023 the note must be 300 characters or fewer

ALTER TABLE socialu.events ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE socialu.events ADD COLUMN IF NOT EXISTS cancellation_note TEXT;
ALTER TABLE socialu.events DROP CONSTRAINT IF EXISTS events_cancellation_state;
ALTER TABLE socialu.events ADD CONSTRAINT events_cancellation_state CHECK (
  (status = 'cancelled') = (cancelled_at IS NOT NULL)
  AND (cancellation_note IS NULL OR (btrim(cancellation_note) <> '' AND length(cancellation_note) <= 300))
) NOT VALID;

-- Who may still open a cancelled event: its creator, invited students and anyone who said they were going,
-- as long as they are at the event's university. Active events follow the usual rule (event_visible_to).
CREATE OR REPLACE FUNCTION socialu.event_viewable_by(p_event_id BIGINT, p_viewer socialu.students) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT socialu.event_visible_to(p_event_id, p_viewer) OR EXISTS (
    SELECT 1 FROM socialu.events ev
    JOIN socialu.students cr ON cr.student_id = ev.creator_id
    WHERE ev.event_id = p_event_id AND ev.status = 'cancelled'
      AND cr.email_domain IN (SELECT d.domain FROM socialu.university_domains d
        WHERE d.university_id = (SELECT university_id FROM socialu.university_domains WHERE domain = p_viewer.email_domain))
      AND (ev.creator_id = p_viewer.student_id
        OR EXISTS (SELECT 1 FROM socialu.event_invitations i WHERE i.event_id = ev.event_id AND i.invitee_id = p_viewer.student_id)
        OR EXISTS (SELECT 1 FROM socialu.event_attendees a WHERE a.event_id = ev.event_id AND a.student_id = p_viewer.student_id))
  );
$$;
REVOKE ALL ON FUNCTION socialu.event_viewable_by(BIGINT, socialu.students) FROM PUBLIC, anon, authenticated;

-- Cancel an upcoming event. Only its creator can; cancelling twice is harmless and keeps the first notice.
CREATE OR REPLACE FUNCTION public.socialu_event_cancel(p_auth_id UUID, p_event_id BIGINT, p_note TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me socialu.students%ROWTYPE;
  ev socialu.events%ROWTYPE;
  note TEXT := nullif(btrim(coalesce(p_note, '')), '');
BEGIN
  me := socialu.event_student(p_auth_id);
  IF NOT socialu.event_viewable_by(p_event_id, me) THEN
    RAISE EXCEPTION 'Event not available.' USING ERRCODE = 'SE404';
  END IF;
  SELECT * INTO ev FROM socialu.events WHERE event_id = p_event_id FOR UPDATE;
  IF ev.creator_id <> me.student_id THEN
    RAISE EXCEPTION 'Only the event''s creator can cancel it.' USING ERRCODE = 'SE403';
  END IF;
  IF length(note) > 300 THEN
    RAISE EXCEPTION 'The cancellation note must be 300 characters or fewer.' USING ERRCODE = '22023';
  END IF;

  IF ev.status = 'active' THEN
    IF ev.starts_at <= now() THEN
      RAISE EXCEPTION 'The event has already started.' USING ERRCODE = 'SE409';
    END IF;
    UPDATE socialu.events SET status = 'cancelled', cancelled_at = now(), cancellation_note = note
      WHERE event_id = p_event_id RETURNING * INTO ev;
  END IF;

  RETURN jsonb_build_object('event_id', ev.event_id::text, 'status', ev.status,
    'cancelled_at', ev.cancelled_at, 'cancellation_note', ev.cancellation_note);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_event_cancel(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_event_cancel(UUID, BIGINT, TEXT) TO service_role;

-- One event with everyone who is going and every comment, oldest first; now also its cancellation, and
-- cancelled events stay open to the people they concern (socialu.event_viewable_by).
CREATE OR REPLACE FUNCTION public.socialu_event_detail(p_auth_id UUID, p_event_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s socialu.students%ROWTYPE;
  result JSONB;
BEGIN
  s := socialu.event_student(p_auth_id);
  IF NOT socialu.event_viewable_by(p_event_id, s) THEN
    RAISE EXCEPTION 'Event not available.' USING ERRCODE = 'SE404';
  END IF;

  SELECT jsonb_build_object('event_id', e.event_id::text, 'creator_id', e.creator_id::text,
      'creator_username', c.username, 'title', e.title, 'description', e.description,
      'location', e.location, 'starts_at', e.starts_at, 'status', e.status, 'dress_code', e.dress_code,
      'cancelled_at', e.cancelled_at, 'cancellation_note', e.cancellation_note)
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

-- SRS-402.4: the signed-in student's invitations, upcoming first, then past. Cancelled events now stay listed
-- with their status and cancellation notice, so the invited student learns the event is off.
CREATE OR REPLACE FUNCTION public.socialu_my_event_invitations(p_auth_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me socialu.students%ROWTYPE;
BEGIN
  me := socialu.event_student(p_auth_id);
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object('event_id', e.event_id::text, 'title', e.title, 'location', e.location,
        'starts_at', e.starts_at, 'creator_username', c.username, 'rsvp', i.rsvp, 'status', e.status,
        'cancelled_at', e.cancelled_at, 'cancellation_note', e.cancellation_note)
        ORDER BY e.starts_at < now(), CASE WHEN e.starts_at >= now() THEN e.starts_at END, e.starts_at DESC, e.event_id)
    FROM socialu.event_invitations i
    JOIN socialu.events e ON e.event_id = i.event_id
    JOIN socialu.students c ON c.student_id = e.creator_id
    WHERE i.invitee_id = me.student_id
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_my_event_invitations(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_my_event_invitations(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
