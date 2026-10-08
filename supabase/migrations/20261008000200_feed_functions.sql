-- SocialU | Feed/post RPC bridge (SRS-301 through SRS-304).
-- Mirrors the access pattern established in 20261008000100_link_supabase_accounts.sql:
-- raw socialu tables stay outside the Data API; the Next.js server calls these
-- SECURITY DEFINER functions via service_role, passing the verified auth user id
-- from auth.getUser(token) -- never a client-supplied student id.
-- Apply once after 20261008000100_link_supabase_accounts.sql.
--
-- GOTCHA (found 2026-10-08, confirmed empirically against the live DB): the
-- DEFERRABLE INITIALLY DEFERRED constraint triggers on socialu.posts/post_photos
-- (post_content, post_photo_content -- schema.sql's "must have text or a photo"
-- check) fail to resolve their own unqualified table references when they fire
-- at the natural transaction-commit boundary, even though their function has
-- SET search_path = socialu, pg_catalog correctly stored (verified via
-- pg_proc.proconfig). They work fine when forced to fire immediately instead.
-- Functions here that INSERT into posts/post_photos call
-- `SET CONSTRAINTS ALL IMMEDIATE` right after, to sidestep this.

-- Shared helper: resolve + verify the acting student from a Supabase Auth user id.
CREATE FUNCTION public.socialu_require_student(p_auth_id UUID) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s socialu.students%ROWTYPE;
BEGIN
  SELECT * INTO s FROM socialu.students WHERE auth_user_id = p_auth_id;
  IF NOT FOUND OR NOT s.is_active OR s.reverification_required OR s.email_verified_at IS NULL THEN
    RAISE EXCEPTION 'A verified, active university account is required.' USING ERRCODE = '42501';
  END IF;
  RETURN s.student_id;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_require_student(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_require_student(UUID) TO service_role;

-- SRS-301.1-301.3: every published Public post (single-university release, so
-- SRS-301.2's "same university" scoping is automatically satisfied).
CREATE FUNCTION public.socialu_campus_feed(p_auth_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result JSONB;
BEGIN
  PERFORM public.socialu_require_student(p_auth_id);
  SELECT coalesce(jsonb_agg(to_jsonb(feed) ORDER BY feed.published_at DESC), '[]'::jsonb) INTO result
  FROM (
    SELECT p.post_id, p.author_id, p.text_content, p.visibility, p.published_at, p.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(pm.storage_key) FROM socialu.post_photos pp
                JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                WHERE pp.post_id = p.post_id), '[]'::jsonb) AS photo_keys
    FROM socialu.posts p
    JOIN socialu.students s ON s.student_id = p.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE p.visibility = 'public'
  ) feed;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_campus_feed(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_campus_feed(UUID) TO service_role;

-- SRS-302.1-302.3: Friends Only posts from the caller's accepted friends.
CREATE FUNCTION public.socialu_friends_feed(p_auth_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT coalesce(jsonb_agg(to_jsonb(feed) ORDER BY feed.published_at DESC), '[]'::jsonb) INTO result
  FROM (
    SELECT p.post_id, p.author_id, p.text_content, p.visibility, p.published_at, p.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(pm.storage_key) FROM socialu.post_photos pp
                JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                WHERE pp.post_id = p.post_id), '[]'::jsonb) AS photo_keys
    FROM socialu.posts p
    JOIN socialu.students s ON s.student_id = p.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE p.visibility = 'friends_only' AND socialu.are_friends(me, p.author_id)
  ) feed;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_friends_feed(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_friends_feed(UUID) TO service_role;

-- SRS-303.1-303.3, SRS-315.1-315.3: create a text post. author_id always comes
-- from the verified session, never a client-supplied value.
CREATE OR REPLACE FUNCTION public.socialu_create_post(p_auth_id UUID, p_text TEXT, p_visibility TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; new_post socialu.posts%ROWTYPE; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_text IS NULL OR btrim(p_text) = '' THEN
    RAISE EXCEPTION 'Post text is required.' USING ERRCODE = '22023';
  END IF;
  IF p_visibility NOT IN ('public', 'friends_only') THEN
    RAISE EXCEPTION 'Visibility must be "public" or "friends_only".' USING ERRCODE = '22023';
  END IF;
  INSERT INTO socialu.posts (author_id, text_content, visibility)
  VALUES (me, btrim(p_text), p_visibility) RETURNING * INTO new_post;
  SET CONSTRAINTS ALL IMMEDIATE;
  SELECT to_jsonb(feed) INTO result FROM (
    SELECT new_post.post_id, new_post.author_id, new_post.text_content, new_post.visibility,
      new_post.published_at, new_post.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name,
      am.storage_key AS author_photo_key,
      '[]'::jsonb AS photo_keys
    FROM socialu.students s
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE s.student_id = me
  ) feed;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_create_post(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_create_post(UUID, TEXT, TEXT) TO service_role;

-- SRS-304.1, SRS-304.3: associate one already-uploaded Storage object with a
-- post the caller authored. The actual file upload happens via the Storage
-- API from the Next.js server; this links the resulting object to the post.
CREATE OR REPLACE FUNCTION public.socialu_attach_post_photo(
  p_auth_id UUID, p_post_id BIGINT, p_storage_key TEXT, p_mime_type TEXT, p_byte_count BIGINT
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; new_asset_id BIGINT;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT author_id INTO owner FROM socialu.posts WHERE post_id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002'; END IF;
  IF owner <> me THEN RAISE EXCEPTION 'Only the post author can attach photos.' USING ERRCODE = '42501'; END IF;
  INSERT INTO socialu.media_assets (owner_id, storage_key, upload_context, mime_type, byte_count)
  VALUES (me, p_storage_key, 'post_photo', p_mime_type, p_byte_count)
  RETURNING asset_id INTO new_asset_id;
  INSERT INTO socialu.post_photos (post_id, asset_id) VALUES (p_post_id, new_asset_id);
  SET CONSTRAINTS ALL IMMEDIATE;
  RETURN new_asset_id;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_attach_post_photo(UUID, BIGINT, TEXT, TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_attach_post_photo(UUID, BIGINT, TEXT, TEXT, BIGINT) TO service_role;

NOTIFY pgrst, 'reload schema';
