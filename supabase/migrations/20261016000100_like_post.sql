-- SocialU | SRS-308.1-308.3: liking a post.
-- Same access pattern as 20261008000200_feed_functions.sql. post_likes has
-- no triggers of its own (just an index), so unlike posts/post_photos this
-- needs no SET CONSTRAINTS ALL IMMEDIATE workaround.
--
-- Also upgrades the feed-shaping functions (already live) to add
-- like_count and is_liked_by_viewer, computed per-viewer from post_likes.
-- See 20261008000200_feed_functions.sql / 20261015000100_edit_post.sql /
-- 20261013200000_srs_109_113_profile.sql for the updated source-of-truth
-- bodies this mirrors -- this file is what actually needs to run against
-- the already-deployed database.

CREATE OR REPLACE FUNCTION public.socialu_campus_feed(p_auth_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT coalesce(jsonb_agg(to_jsonb(feed) ORDER BY feed.published_at DESC), '[]'::jsonb) INTO result
  FROM (
    SELECT p.post_id, p.author_id, p.text_content, p.visibility, p.published_at, p.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', pm.asset_id, 'storage_key', pm.storage_key))
                FROM socialu.post_photos pp JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                WHERE pp.post_id = p.post_id), '[]'::jsonb) AS photos,
      (SELECT count(*) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS like_count,
      EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS is_liked_by_viewer
    FROM socialu.posts p
    JOIN socialu.students s ON s.student_id = p.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE p.visibility = 'public'
  ) feed;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.socialu_friends_feed(p_auth_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT coalesce(jsonb_agg(to_jsonb(feed) ORDER BY feed.published_at DESC), '[]'::jsonb) INTO result
  FROM (
    SELECT p.post_id, p.author_id, p.text_content, p.visibility, p.published_at, p.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', pm.asset_id, 'storage_key', pm.storage_key))
                FROM socialu.post_photos pp JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                WHERE pp.post_id = p.post_id), '[]'::jsonb) AS photos,
      (SELECT count(*) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS like_count,
      EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS is_liked_by_viewer
    FROM socialu.posts p
    JOIN socialu.students s ON s.student_id = p.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE p.visibility = 'friends_only' AND socialu.are_friends(me, p.author_id)
  ) feed;
  RETURN result;
END;
$$;

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
      '[]'::jsonb AS photos,
      0 AS like_count,
      FALSE AS is_liked_by_viewer
    FROM socialu.students s
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE s.student_id = me
  ) feed;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.socialu_update_post(p_auth_id UUID, p_post_id BIGINT, p_text TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; updated_post socialu.posts%ROWTYPE; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_text IS NULL OR btrim(p_text) = '' THEN
    RAISE EXCEPTION 'Post text is required.' USING ERRCODE = '22023';
  END IF;
  SELECT author_id INTO owner FROM socialu.posts WHERE post_id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002'; END IF;
  IF owner <> me THEN RAISE EXCEPTION 'Only the post author can edit this post.' USING ERRCODE = '42501'; END IF;

  UPDATE socialu.posts SET text_content = btrim(p_text), edited_at = CURRENT_TIMESTAMP
  WHERE post_id = p_post_id RETURNING * INTO updated_post;
  SET CONSTRAINTS ALL IMMEDIATE;

  SELECT to_jsonb(feed) INTO result FROM (
    SELECT updated_post.post_id, updated_post.author_id, updated_post.text_content, updated_post.visibility,
      updated_post.published_at, updated_post.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', pm.asset_id, 'storage_key', pm.storage_key))
                FROM socialu.post_photos pp JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                WHERE pp.post_id = updated_post.post_id), '[]'::jsonb) AS photos,
      (SELECT count(*) FROM socialu.post_likes pl WHERE pl.post_id = updated_post.post_id) AS like_count,
      EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = updated_post.post_id AND pl.student_id = me) AS is_liked_by_viewer
    FROM socialu.students s
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE s.student_id = me
  ) feed;
  RETURN result;
END;
$$;

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
      EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS is_liked_by_viewer
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

-- SRS-308.1/308.2: like a post the caller is authorized to view. Public
-- posts are open to any authenticated student (single-university release);
-- Friends Only posts require the caller to be the author or a current
-- accepted friend of the author, mirroring exactly the visibility rule
-- socialu_friends_feed already enforces. Idempotent via ON CONFLICT DO
-- NOTHING on post_likes' existing (post_id, student_id) primary key --
-- clicking Like on an already-liked post is a no-op, not an error, and
-- there is deliberately no unlike path here (that is SRS-309).
CREATE FUNCTION public.socialu_like_post(p_auth_id UUID, p_post_id BIGINT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; vis TEXT; likes BIGINT; inserted_count INT;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT author_id, visibility INTO owner, vis FROM socialu.posts WHERE post_id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002'; END IF;
  IF vis = 'friends_only' AND owner <> me AND NOT socialu.are_friends(me, owner) THEN
    RAISE EXCEPTION 'You are not authorized to view this post.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO socialu.post_likes (post_id, student_id) VALUES (p_post_id, me)
  ON CONFLICT (post_id, student_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  -- SRS-312.1-312.3 (20261020000100_like_notifications.sql): notify the
  -- post author only on a genuinely new like, never a duplicate-like
  -- no-op, never a self-like.
  IF inserted_count > 0 AND owner <> me THEN
    INSERT INTO socialu.notifications (recipient_id, actor_id, kind, post_id)
    VALUES (owner, me, 'post_like', p_post_id);
  END IF;

  SELECT count(*) INTO likes FROM socialu.post_likes WHERE post_id = p_post_id;
  RETURN jsonb_build_object('like_count', likes, 'is_liked_by_viewer', true);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_like_post(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_like_post(UUID, BIGINT) TO service_role;

NOTIFY pgrst, 'reload schema';
