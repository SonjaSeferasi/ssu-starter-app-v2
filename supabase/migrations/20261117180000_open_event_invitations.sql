-- UR-402/UR-403: every upcoming event posted by another student at the same school is an invitation.
-- Students see those events in Invitations alongside the ones a host invited them to, and accept or decline any of
-- them. Accepting keeps the invitation (shown as Accepted); declining removes it from Invitations only -- the event
-- itself stays on Events and Trending and the Campus Feed, like every other event.
--   * Host invitations keep using socialu.event_invitations.rsvp (SRS-403.2-403.5), unchanged.
--   * Answers to events the student was not invited to are saved in the new socialu.event_responses table, so the
--     host's own invitation list (socialu_event_invitations) still shows only the students they invited.
-- socialu_my_event_invitations and socialu_event_rsvp are replaced; same signatures.
-- Apply once after 20261117170000_cancelled_events.sql. Safe to re-run.

-- Error codes returned to the API (mapped in lib/event-engagement.ts):
--   42501 verified, active account required     SE404 event not available (missing, cancelled or another university)
--   SE403 hosts do not answer their own events     SE409 the event has already started     22023 unknown response

CREATE TABLE IF NOT EXISTS socialu.event_responses (
  event_id BIGINT NOT NULL REFERENCES socialu.events(event_id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES socialu.students(student_id),
  response VARCHAR(13) NOT NULL CHECK (response IN ('attending', 'not_attending')),
  responded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, student_id)
);
-- Like the other socialu tables, no direct browser access: only the server-only functions below read and write it.
ALTER TABLE socialu.event_responses ENABLE ROW LEVEL SECURITY;

-- The signed-in student's invitations: every host invitation (as before: upcoming first, then past; cancelled ones
-- keep their notice), plus every upcoming active event another student at the same school posted. Each carries the
-- student's answer ('pending', 'attending' or 'not_attending') and whether the host invited them. Declined ones are
-- returned too, so the event page can still show and change the answer; the lists leave them out.
CREATE OR REPLACE FUNCTION public.socialu_my_event_invitations(p_auth_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me socialu.students%ROWTYPE;
BEGIN
  me := socialu.event_student(p_auth_id);
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object('event_id', x.event_id::text, 'title', x.title, 'location', x.location,
        'starts_at', x.starts_at, 'creator_username', x.creator_username, 'rsvp', x.rsvp, 'status', x.status,
        'cancelled_at', x.cancelled_at, 'cancellation_note', x.cancellation_note, 'invited', x.invited)
        ORDER BY x.starts_at < now(), CASE WHEN x.starts_at >= now() THEN x.starts_at END, x.starts_at DESC, x.event_id)
    FROM (
      SELECT e.event_id, e.title, e.location, e.starts_at, c.username AS creator_username, i.rsvp, e.status,
        e.cancelled_at, e.cancellation_note, TRUE AS invited
      FROM socialu.event_invitations i
      JOIN socialu.events e ON e.event_id = i.event_id
      JOIN socialu.students c ON c.student_id = e.creator_id
      WHERE i.invitee_id = me.student_id
      UNION ALL
      SELECT e.event_id, e.title, e.location, e.starts_at, c.username, coalesce(r.response, 'pending'), e.status,
        e.cancelled_at, e.cancellation_note, FALSE
      FROM socialu.events e
      JOIN socialu.students c ON c.student_id = e.creator_id
      LEFT JOIN socialu.event_responses r ON r.event_id = e.event_id AND r.student_id = me.student_id
      WHERE e.creator_id <> me.student_id AND e.starts_at > now()
        AND socialu.event_visible_to(e.event_id, me)
        AND NOT EXISTS (SELECT 1 FROM socialu.event_invitations i WHERE i.event_id = e.event_id AND i.invitee_id = me.student_id)
    ) x
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_my_event_invitations(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_my_event_invitations(UUID) TO service_role;

-- Accept ('attending') or decline ('not_attending'). A host invitation records the RSVP on it, as before
-- (SRS-403.2-403.4); any other event at the student's school records the answer in event_responses.
-- The host cannot answer their own event; answers close when the event starts or is cancelled.
CREATE OR REPLACE FUNCTION public.socialu_event_rsvp(p_auth_id UUID, p_event_id BIGINT, p_response TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me socialu.students%ROWTYPE;
  answer TEXT;
BEGIN
  me := socialu.event_student(p_auth_id);
  IF NOT socialu.event_visible_to(p_event_id, me) THEN
    RAISE EXCEPTION 'Event not available.' USING ERRCODE = 'SE404';
  END IF;
  IF p_response IS NULL OR p_response NOT IN ('attending', 'not_attending') THEN
    RAISE EXCEPTION 'Choose accept or decline.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM socialu.events WHERE event_id = p_event_id AND creator_id = me.student_id) THEN
    RAISE EXCEPTION 'Hosts do not answer their own event.' USING ERRCODE = 'SE403';
  END IF;
  IF EXISTS (SELECT 1 FROM socialu.events WHERE event_id = p_event_id AND starts_at <= now()) THEN
    RAISE EXCEPTION 'RSVP changes close when the event begins.' USING ERRCODE = 'SE409';
  END IF;

  IF EXISTS (SELECT 1 FROM socialu.event_invitations WHERE event_id = p_event_id AND invitee_id = me.student_id) THEN
    UPDATE socialu.event_invitations SET rsvp = p_response
      WHERE event_id = p_event_id AND invitee_id = me.student_id
      RETURNING rsvp INTO answer;
  ELSE
    INSERT INTO socialu.event_responses (event_id, student_id, response) VALUES (p_event_id, me.student_id, p_response)
      ON CONFLICT (event_id, student_id) DO UPDATE SET response = EXCLUDED.response, responded_at = CURRENT_TIMESTAMP
      RETURNING response INTO answer;
  END IF;
  RETURN jsonb_build_object('event_id', p_event_id::text, 'rsvp', answer);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_event_rsvp(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_event_rsvp(UUID, BIGINT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
