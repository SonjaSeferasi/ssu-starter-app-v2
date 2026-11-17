-- UR-404: cancelled events get their own list (the Cancelled tab, and History under Trending on Events and Trending).
-- A cancelled event leaves every active list (SRS-404.7) but is kept, not erased, so invited students still see its
-- cancellation notice. This lists the cancelled events the signed-in student is part of: ones they created, were
-- invited to or said they were going to (the same people socialu.event_viewable_by lets open a cancelled event),
-- most recently cancelled first.
-- Additive: one server-only function. Apply once after 20261113160000_event_input_limits.sql. Safe to re-run.

CREATE OR REPLACE FUNCTION public.socialu_cancelled_events(p_auth_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s socialu.students%ROWTYPE;
BEGIN
  s := socialu.event_student(p_auth_id);
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object('event_id', e.event_id::text, 'creator_id', e.creator_id::text,
        'creator_username', c.username, 'title', e.title, 'description', e.description,
        'location', e.location, 'starts_at', e.starts_at, 'status', e.status, 'dress_code', e.dress_code,
        'cancelled_at', e.cancelled_at, 'cancellation_note', e.cancellation_note,
        'hosted_by_me', e.creator_id = s.student_id) ORDER BY e.cancelled_at DESC NULLS LAST, e.event_id DESC)
    FROM (
      SELECT ev.* FROM socialu.events ev
      WHERE ev.status = 'cancelled' AND socialu.event_viewable_by(ev.event_id, s)
      ORDER BY ev.cancelled_at DESC NULLS LAST, ev.event_id DESC
      LIMIT 100
    ) e
    JOIN socialu.students c ON c.student_id = e.creator_id
  ), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_cancelled_events(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_cancelled_events(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
