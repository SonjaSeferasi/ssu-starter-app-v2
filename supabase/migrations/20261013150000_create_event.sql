-- SRS-400.6: a signed-in student creates a campus event.
-- Additive only: one new server-only function; no existing table changes.
-- Apply once after 20261008000100_link_supabase_accounts.sql.

-- Error codes returned to the API (mapped in app/api/events/route.ts):
--   42501 verified, active account required       22023 event details are missing or invalid

CREATE FUNCTION public.socialu_create_event(
  p_auth_id UUID, p_title TEXT, p_description TEXT, p_location TEXT, p_starts_at TIMESTAMPTZ
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s socialu.students%ROWTYPE;
  e socialu.events%ROWTYPE;
BEGIN
  -- The API derives p_auth_id from the verified token, never from the request body.
  SELECT * INTO s FROM socialu.students
    WHERE auth_user_id = p_auth_id AND is_active AND NOT reverification_required
      AND email_verified_at IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'A verified, active university account is required.' USING ERRCODE = '42501';
  END IF;

  IF p_title IS NULL OR btrim(p_title) = '' OR p_description IS NULL OR btrim(p_description) = ''
      OR p_location IS NULL OR btrim(p_location) = '' OR p_starts_at IS NULL THEN
    RAISE EXCEPTION 'Title, description, location, date, and time are required.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO socialu.events (creator_id, title, description, location, starts_at, status)
  VALUES (s.student_id, btrim(p_title), btrim(p_description), btrim(p_location), p_starts_at, 'active')
  RETURNING * INTO e;

  RETURN jsonb_build_object('event_id', e.event_id::text, 'creator_id', e.creator_id::text,
    'title', e.title, 'description', e.description, 'location', e.location,
    'starts_at', e.starts_at, 'status', e.status);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_create_event(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_create_event(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;

NOTIFY pgrst, 'reload schema';
