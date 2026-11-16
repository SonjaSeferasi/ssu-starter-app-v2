-- Event bug fixes found in white-box testing, enforced in the database as well as the API (lib/event-input.ts):
--   #1186 events are created only for a start time that has not passed yet (SRS-400.6);
--   #1187 title and location are at most 255 characters and the description at most 2000, the same limits as the
--         event form (SRS-400.1, SRS-400.2), for both creating and editing.
-- (#1185, impossible dates such as Feb 30, is refused by the API before a timestamp exists.)
-- Same signatures: socialu_create_event and socialu_event_update are replaced in place.
-- Apply once after 20261113150000_trending_posts.sql. Safe to re-run.

CREATE OR REPLACE FUNCTION public.socialu_create_event(
  p_auth_id UUID, p_title TEXT, p_description TEXT, p_location TEXT, p_starts_at TIMESTAMPTZ, p_dress_code TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s socialu.students%ROWTYPE;
  e socialu.events%ROWTYPE;
  dress TEXT := nullif(btrim(coalesce(p_dress_code, '')), '');
BEGIN
  -- The API derives p_auth_id from the verified token, never from the request body.
  SELECT * INTO s FROM socialu.students
    WHERE auth_user_id = p_auth_id AND is_active AND NOT reverification_required
      AND email_verified_at IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'A verified, active university account is required.' USING ERRCODE = '42501';
  END IF;

  IF p_title IS NULL OR btrim(p_title) = '' OR p_description IS NULL OR btrim(p_description) = ''
      OR p_location IS NULL OR btrim(p_location) = '' OR p_starts_at IS NULL OR length(dress) > 100 THEN
    RAISE EXCEPTION 'Title, description, location, date, and time are required.' USING ERRCODE = '22023';
  END IF;
  -- #1187: the same limits as the event form; #1186: only times that have not passed yet.
  IF length(btrim(p_title)) > 255 OR length(btrim(p_description)) > 2000 OR length(btrim(p_location)) > 255 THEN
    RAISE EXCEPTION 'Title and location must be 255 characters or fewer, and the description 2000 or fewer.' USING ERRCODE = '22023';
  END IF;
  IF p_starts_at <= now() THEN
    RAISE EXCEPTION 'Choose a date and time in the future.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO socialu.events (creator_id, title, description, location, starts_at, status, dress_code)
  VALUES (s.student_id, btrim(p_title), btrim(p_description), btrim(p_location), p_starts_at, 'active', dress)
  RETURNING * INTO e;

  RETURN jsonb_build_object('event_id', e.event_id::text, 'creator_id', e.creator_id::text,
    'title', e.title, 'description', e.description, 'location', e.location,
    'starts_at', e.starts_at, 'status', e.status, 'dress_code', e.dress_code);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_create_event(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_create_event(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT) TO service_role;

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
  -- #1187: the same limits as the event form.
  IF length(btrim(p_title)) > 255 OR length(btrim(p_description)) > 2000 OR length(btrim(p_location)) > 255 THEN
    RAISE EXCEPTION 'Title and location must be 255 characters or fewer, and the description 2000 or fewer.' USING ERRCODE = '22023';
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
