-- SRS-401.1-.6: a signed-in student discovers upcoming campus events.
-- Additive only: one new server-only function; no existing table changes.
-- Apply once after 20261013150000_create_event.sql.

-- Error codes returned to the API (mapped in app/api/events/route.ts):
--   42501 verified, active account required

CREATE FUNCTION public.socialu_list_events(p_auth_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s socialu.students%ROWTYPE;
BEGIN
  -- The API derives p_auth_id from the verified token, never from the request.
  SELECT * INTO s FROM socialu.students
    WHERE auth_user_id = p_auth_id AND is_active AND NOT reverification_required
      AND email_verified_at IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'A verified, active university account is required.' USING ERRCODE = '42501';
  END IF;

  -- Active events from the same university that have not started more than a day ago, soonest first.
  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object('event_id', e.event_id::text, 'creator_id', e.creator_id::text,
        'creator_username', c.username, 'title', e.title, 'description', e.description,
        'location', e.location, 'starts_at', e.starts_at, 'status', e.status) ORDER BY e.starts_at, e.event_id)
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

NOTIFY pgrst, 'reload schema';
