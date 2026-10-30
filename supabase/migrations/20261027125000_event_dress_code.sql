-- UR-400: an event creator may add an optional dress code (up to 100 characters), shown with the event.
-- Adds one nullable column to socialu.events and replaces socialu_create_event with a version that takes it.
-- Apply once after 20261015120000_list_events.sql and before 20261027130000_event_engagement.sql. Safe to re-run.

ALTER TABLE socialu.events ADD COLUMN IF NOT EXISTS dress_code TEXT;
DO $$ BEGIN
  ALTER TABLE socialu.events ADD CONSTRAINT events_dress_code_length
    CHECK (dress_code IS NULL OR (btrim(dress_code) <> '' AND length(dress_code) <= 100));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- The new optional parameter changes the signature, so the old version is removed first.
DROP FUNCTION IF EXISTS public.socialu_create_event(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ);

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

NOTIFY pgrst, 'reload schema';
