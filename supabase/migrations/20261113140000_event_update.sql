-- UR-404: an event's creator edits an upcoming event.
-- SRS-404.1 title, SRS-404.2 description, SRS-404.3 location, SRS-404.4 date and SRS-404.5 time are saved
-- together from one edit form, replacing the previous values; SRS-404.6 only the creator can change them.
-- Additive: one server-only function. Apply once after 20261113130000_event_rsvp.sql. Safe to re-run.

-- Error codes returned to the API (mapped in lib/event-engagement.ts):
--   42501 verified, active account required     SE404 event not available (missing, cancelled or another university)
--   SE403 only the event's creator can edit it     SE409 the event has already started
--   22023 a required field is missing, the dress code is over 100 characters, or the new time is not in the future

CREATE OR REPLACE FUNCTION public.socialu_event_update(
  p_auth_id UUID, p_event_id BIGINT, p_title TEXT, p_description TEXT, p_location TEXT, p_starts_at TIMESTAMPTZ, p_dress_code TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  e socialu.events%ROWTYPE;
  dress TEXT := nullif(btrim(coalesce(p_dress_code, '')), '');
BEGIN
  -- Refuses anyone but the creator (SE403), and events the creator can no longer see (SE404).
  PERFORM socialu.event_creator(p_auth_id, p_event_id);
  SELECT * INTO e FROM socialu.events WHERE event_id = p_event_id FOR UPDATE;
  IF e.starts_at <= now() THEN
    RAISE EXCEPTION 'The event has already started.' USING ERRCODE = 'SE409';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' OR p_description IS NULL OR btrim(p_description) = ''
      OR p_location IS NULL OR btrim(p_location) = '' OR p_starts_at IS NULL OR length(dress) > 100 THEN
    RAISE EXCEPTION 'Title, description, location, date, and time are required.' USING ERRCODE = '22023';
  END IF;
  IF p_starts_at <= now() THEN
    RAISE EXCEPTION 'Choose a date and time in the future.' USING ERRCODE = '22023';
  END IF;

  UPDATE socialu.events SET title = btrim(p_title), description = btrim(p_description), location = btrim(p_location),
      starts_at = p_starts_at, dress_code = dress
    WHERE event_id = p_event_id RETURNING * INTO e;

  RETURN jsonb_build_object('event_id', e.event_id::text, 'creator_id', e.creator_id::text,
    'title', e.title, 'description', e.description, 'location', e.location,
    'starts_at', e.starts_at, 'status', e.status, 'dress_code', e.dress_code);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_event_update(UUID, BIGINT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_event_update(UUID, BIGINT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
