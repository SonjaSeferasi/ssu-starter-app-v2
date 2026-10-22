-- SocialU | Profile RPC bridge (SRS-109 through SRS-113), owner LN.
-- Same access pattern as 20261008000100_link_supabase_accounts.sql: raw socialu
-- tables stay outside the Data API; the Next.js server calls these SECURITY
-- DEFINER functions via service_role with the verified auth user id.
-- Apply once after 20261008000200_feed_functions.sql (uses socialu_require_student).
-- Leaves public.socialu_account unchanged, so Feed, Messages and Game Room keep working.

-- Shared lookup for another student's profile. Missing, inactive and blocked
-- profiles fail identically, so a block is never revealed (SRS-113.1, SRS-113.15).
CREATE OR REPLACE FUNCTION public.socialu_profile_target(p_me BIGINT, p_username TEXT) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s socialu.students%ROWTYPE;
BEGIN
  IF p_username IS NULL THEN RETURN p_me; END IF;
  SELECT * INTO s FROM socialu.students WHERE username = btrim(p_username);
  IF NOT FOUND OR NOT s.is_active OR (s.student_id <> p_me AND socialu.is_blocked(p_me, s.student_id)) THEN
    RAISE EXCEPTION 'This profile is not available.' USING ERRCODE = 'P0002';
  END IF;
  RETURN s.student_id;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_profile_target(BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_profile_target(BIGINT, TEXT) TO service_role;

-- SRS-109.1, SRS-111.1-111.8, SRS-113.1-113.10: profile header and activity summary.
-- p_username NULL means the caller's own profile.
CREATE OR REPLACE FUNCTION public.socialu_profile_view(p_auth_id UUID, p_username TEXT DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me BIGINT;
  target BIGINT;
  s socialu.students%ROWTYPE;
  p socialu.student_profiles%ROWTYPE;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  target := public.socialu_profile_target(me, p_username);
  SELECT * INTO s FROM socialu.students WHERE student_id = target;
  SELECT * INTO p FROM socialu.student_profiles WHERE student_id = target;
  RETURN jsonb_build_object(
    'id', s.student_id::text,
    'is_own', s.student_id = me,
    'username', s.username,
    'full_name', s.full_name,
    'display_name', p.display_name,
    'name', coalesce(p.display_name, s.full_name),
    'university', (SELECT u.name FROM socialu.university_domains d
                   JOIN socialu.university u ON u.university_id = d.university_id WHERE d.domain = s.email_domain),
    'major', p.major,
    'class_year', p.class_year,
    'bio', coalesce(p.bio, ''),
    'photo_key', (SELECT m.storage_key FROM socialu.media_assets m WHERE m.asset_id = p.photo_id),
    'setup_completed', coalesce(p.setup_completed, FALSE),
    -- SRS-110.6: only the owner needs to know when the display name may change again.
    'display_name_next_change_at', CASE WHEN s.student_id = me AND p.display_name_changed_at > now() - INTERVAL '7 days'
                                        THEN p.display_name_changed_at + INTERVAL '7 days' END,
    -- SRS-111.2/111.3: posts are separate from Snipes, and deleted posts are removed rows.
    'post_count', (SELECT count(*) FROM socialu.posts WHERE author_id = s.student_id),
    -- SRS-111.4-111.7: current accepted friendships only; ended and pending ones are excluded.
    'friend_count', (SELECT count(*) FROM socialu.current_friendships f WHERE s.student_id IN (f.student_low, f.student_high)),
    'is_friend', s.student_id <> me AND socialu.are_friends(me, s.student_id),
    'friend_request', (SELECT CASE WHEN r.sender_id = me THEN 'sent' ELSE 'received' END FROM socialu.friend_requests r
                       WHERE r.status = 'pending' AND ((r.sender_id = me AND r.recipient_id = s.student_id)
                          OR (r.sender_id = s.student_id AND r.recipient_id = me)) LIMIT 1)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_profile_view(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_profile_view(UUID, TEXT) TO service_role;

-- SRS-112.1-112.7, SRS-113.11-113.14: Posts and Tagged content the viewer may see.
-- Rows match socialu_campus_feed, so lib/posts.ts shapeFeedPosts can sign the photo URLs.
-- Snipes live in snipe_* tables, never in posts, so no category can include one.
CREATE OR REPLACE FUNCTION public.socialu_profile_content(p_auth_id UUID, p_username TEXT, p_category TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; target BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  target := public.socialu_profile_target(me, p_username);
  IF p_category IS NULL OR p_category NOT IN ('posts', 'tagged') THEN
    RAISE EXCEPTION 'Choose Posts or Tagged.' USING ERRCODE = '22023';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.published_at DESC), '[]'::jsonb) INTO result
  FROM (
    SELECT p.post_id, p.author_id, p.text_content, p.visibility, p.published_at, p.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', pm.asset_id, 'storage_key', pm.storage_key))
                FROM socialu.post_photos pp JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                WHERE pp.post_id = p.post_id), '[]'::jsonb) AS photos,
      (SELECT count(*) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS like_count,
      EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS is_liked_by_viewer,
      (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = p.post_id) AS comment_count
    FROM socialu.posts p
    JOIN socialu.students s ON s.student_id = p.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE CASE WHEN p_category = 'posts' THEN p.author_id = target
               ELSE EXISTS (SELECT 1 FROM socialu.post_tags t WHERE t.post_id = p.post_id AND t.student_id = target) END
      -- SRS-113.11/113.12: non-friends see Public posts; current friends also see Friends Only.
      AND (p.author_id = me OR p.visibility = 'public' OR socialu.are_friends(me, p.author_id))
      AND (p.author_id = me OR NOT socialu.is_blocked(me, p.author_id))
  ) c;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_profile_content(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_profile_content(UUID, TEXT, TEXT) TO service_role;

-- SRS-109.2-109.9, SRS-110.1-110.7: save profile setup or edits in one transaction.
-- The server uploads a new photo to Storage first and passes its key; p_photo_key NULL keeps the current photo.
CREATE OR REPLACE FUNCTION public.socialu_save_profile(
  p_auth_id UUID, p_display_name TEXT, p_major TEXT, p_class_year TEXT, p_bio TEXT,
  p_photo_key TEXT DEFAULT NULL, p_photo_mime TEXT DEFAULT NULL, p_photo_bytes BIGINT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me BIGINT;
  p socialu.student_profiles%ROWTYPE;
  v_photo BIGINT;
  v_name TEXT := nullif(btrim(coalesce(p_display_name, '')), '');
  v_major TEXT := nullif(btrim(coalesce(p_major, '')), '');
  v_bio TEXT := btrim(coalesce(p_bio, ''));
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT * INTO p FROM socialu.student_profiles WHERE student_id = me FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Create your SocialU profile first.' USING ERRCODE = 'P0002'; END IF;
  IF length(v_bio) > 250 THEN RAISE EXCEPTION 'Your bio can be at most 250 characters.' USING ERRCODE = '22023'; END IF;
  IF p_class_year IS NOT NULL AND p_class_year NOT IN ('Freshman','Sophomore','Junior','Senior','Graduate') THEN
    RAISE EXCEPTION 'Choose Freshman, Sophomore, Junior, Senior, or Graduate.' USING ERRCODE = '22023';
  END IF;
  -- SRS-110.6: explain the seven-day rule instead of surfacing validate_profile's raw error.
  IF v_name IS DISTINCT FROM p.display_name AND p.display_name_changed_at > now() - INTERVAL '7 days' THEN
    RAISE EXCEPTION 'You can change your display name again on %.',
      to_char(p.display_name_changed_at + INTERVAL '7 days', 'FMMonth FMDD') USING ERRCODE = '22023';
  END IF;
  v_photo := p.photo_id;
  IF p_photo_key IS NOT NULL THEN
    -- validate_media enforces the SRS-109.3 formats and the SRS-109.4 10 MB limit.
    INSERT INTO socialu.media_assets (owner_id, storage_key, upload_context, mime_type, byte_count)
    VALUES (me, p_photo_key, 'profile', p_photo_mime, p_photo_bytes) RETURNING asset_id INTO v_photo;
  END IF;
  -- SRS-109.9: profile photo, major, class year and bio are all required.
  IF v_photo IS NULL OR v_major IS NULL OR p_class_year IS NULL OR v_bio = '' THEN
    RAISE EXCEPTION 'Add a profile photo, major, class year, and bio to finish your profile.' USING ERRCODE = '22023';
  END IF;
  UPDATE socialu.student_profiles
     SET photo_id = v_photo, display_name = v_name, major = v_major, class_year = p_class_year,
         bio = v_bio, setup_completed = TRUE
   WHERE student_id = me;
  RETURN public.socialu_profile_view(p_auth_id, NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_save_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_save_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT) TO service_role;

NOTIFY pgrst, 'reload schema';
