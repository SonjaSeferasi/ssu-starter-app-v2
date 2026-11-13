-- UR-403: an invited student answers an event invitation.
-- Accept records the RSVP 'attending' (the student plans to attend); decline records 'not_attending'.
-- Uses the existing socialu.event_invitations.rsvp column; the validate_rsvp trigger (SRS-403.4) already
-- refuses changes once the event has started. Additive: one server-only function.
-- Apply once after 20261113120000_event_cancellation.sql. Safe to re-run.

-- Error codes returned to the API (mapped in lib/event-engagement.ts):
--   42501 verified, active account required     SE404 event not available (missing, cancelled or another university)
--   SE403 the student was not invited     SE409 the event has already started     22023 unknown response

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
  IF NOT EXISTS (SELECT 1 FROM socialu.event_invitations WHERE event_id = p_event_id AND invitee_id = me.student_id) THEN
    RAISE EXCEPTION 'Only invited students can answer this invitation.' USING ERRCODE = 'SE403';
  END IF;
  IF EXISTS (SELECT 1 FROM socialu.events WHERE event_id = p_event_id AND starts_at <= now()) THEN
    RAISE EXCEPTION 'RSVP changes close when the event begins.' USING ERRCODE = 'SE409';
  END IF;

  UPDATE socialu.event_invitations SET rsvp = p_response
    WHERE event_id = p_event_id AND invitee_id = me.student_id
    RETURNING rsvp INTO answer;
  RETURN jsonb_build_object('event_id', p_event_id::text, 'rsvp', answer);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_event_rsvp(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_event_rsvp(UUID, BIGINT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
