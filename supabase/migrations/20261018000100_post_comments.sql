-- SocialU | SRS-310.1-310.3: commenting on posts (plus edit/delete, which
-- aren't numbered SRS requirements but mirror SRS-306/307's Edit/Delete Post
-- pattern for parity -- see the implementation report for that distinction).
--
-- socialu.post_comments has no triggers (unlike posts/post_photos), so no
-- SET CONSTRAINTS ALL IMMEDIATE workaround is needed for inserts/updates here.
--
-- edited_at doesn't exist on post_comments yet (base table is schema.sql /
-- 20260929164656_create_socialu.sql). Adding it here the same way
-- 20261008000100_link_supabase_accounts.sql added auth_user_id to students --
-- schema.sql stays the static Sprint-1 baseline; this ALTER is the live
-- record of the change.
ALTER TABLE socialu.post_comments
  ADD COLUMN edited_at TIMESTAMPTZ,
  ADD CONSTRAINT post_comments_edited_after_created CHECK (edited_at IS NULL OR edited_at >= created_at);

-- Also upgrades socialu_campus_feed/socialu_friends_feed/socialu_create_post/
-- socialu_update_post/socialu_profile_content (already live) to add
-- comment_count, the same way 20261016000100_like_post.sql added like_count/
-- is_liked_by_viewer. See 20261008000200_feed_functions.sql /
-- 20261015000100_edit_post.sql / 20261013200000_srs_109_113_profile.sql for
-- the updated source-of-truth bodies this mirrors -- this file is what
-- actually needs to run against the already-deployed database.

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
      EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS is_liked_by_viewer,
      (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = p.post_id) AS comment_count
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
      EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS is_liked_by_viewer,
      (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = p.post_id) AS comment_count
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
      FALSE AS is_liked_by_viewer,
      0 AS comment_count
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
      EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = updated_post.post_id AND pl.student_id = me) AS is_liked_by_viewer,
      (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = updated_post.post_id) AS comment_count
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

-- SRS-310.1/310.2/310.3 -- list the comments on a post the caller is
-- authorized to view. Same visibility rule as socialu_like_post/
-- socialu_unlike_post (Public is open to any verified student at this
-- single-university release; Friends Only requires the caller to be the
-- author or a current accepted friend). Oldest first, matching UR-311's
-- "follow the conversation" framing.
CREATE FUNCTION public.socialu_list_comments(p_auth_id UUID, p_post_id BIGINT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; vis TEXT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT author_id, visibility INTO owner, vis FROM socialu.posts WHERE post_id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002'; END IF;
  IF vis = 'friends_only' AND owner <> me AND NOT socialu.are_friends(me, owner) THEN
    RAISE EXCEPTION 'You are not authorized to view this post.' USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.created_at ASC), '[]'::jsonb) INTO result
  FROM (
    SELECT pc.comment_id, pc.post_id, pc.author_id, pc.text_content, pc.created_at, pc.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name,
      am.storage_key AS author_photo_key
    FROM socialu.post_comments pc
    JOIN socialu.students s ON s.student_id = pc.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE pc.post_id = p_post_id
  ) c;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_list_comments(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_list_comments(UUID, BIGINT) TO service_role;

-- SRS-310.1/310.2/310.3 -- submit a comment on a post the caller is
-- authorized to view. author_id always comes from the verified session,
-- never a client-supplied value; same visibility check as the list above.
CREATE FUNCTION public.socialu_create_comment(p_auth_id UUID, p_post_id BIGINT, p_text TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; vis TEXT; new_comment socialu.post_comments%ROWTYPE; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_text IS NULL OR btrim(p_text) = '' THEN
    RAISE EXCEPTION 'Comment text is required.' USING ERRCODE = '22023';
  END IF;
  SELECT author_id, visibility INTO owner, vis FROM socialu.posts WHERE post_id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002'; END IF;
  IF vis = 'friends_only' AND owner <> me AND NOT socialu.are_friends(me, owner) THEN
    RAISE EXCEPTION 'You are not authorized to view this post.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO socialu.post_comments (post_id, author_id, text_content)
  VALUES (p_post_id, me, btrim(p_text)) RETURNING * INTO new_comment;

  SELECT to_jsonb(c) INTO result FROM (
    SELECT new_comment.comment_id, new_comment.post_id, new_comment.author_id,
      new_comment.text_content, new_comment.created_at, new_comment.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name,
      am.storage_key AS author_photo_key
    FROM socialu.students s
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE s.student_id = me
  ) c;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_create_comment(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_create_comment(UUID, BIGINT, TEXT) TO service_role;

-- Not an SRS-310 requirement (no numbered sub-requirement covers editing a
-- comment -- see the implementation report), built for parity with
-- SRS-306's Edit Post. Ownership alone (author_id = me) is the full
-- authorization check, matching socialu_update_post's own precedent -- a
-- deliberate choice, not an oversight. A commenter who gets unfriended by
-- the post's author after commenting loses the ability to VIEW the post
-- again (socialu_list_comments/the feed still enforce that independently),
-- but this function never returns anything about the post itself -- only
-- the caller's own comment, which they already fully possess. There is
-- nothing for a stricter check to protect here, and requiring continued
-- visibility would only block someone from correcting their own words,
-- which is a usability regression with no corresponding security benefit.
CREATE FUNCTION public.socialu_update_comment(p_auth_id UUID, p_comment_id BIGINT, p_text TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; author BIGINT; updated_comment socialu.post_comments%ROWTYPE; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_text IS NULL OR btrim(p_text) = '' THEN
    RAISE EXCEPTION 'Comment text is required.' USING ERRCODE = '22023';
  END IF;
  SELECT author_id INTO author FROM socialu.post_comments WHERE comment_id = p_comment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
  IF author <> me THEN RAISE EXCEPTION 'Only the comment author can edit this comment.' USING ERRCODE = '42501'; END IF;

  UPDATE socialu.post_comments SET text_content = btrim(p_text), edited_at = CURRENT_TIMESTAMP
  WHERE comment_id = p_comment_id RETURNING * INTO updated_comment;

  SELECT to_jsonb(c) INTO result FROM (
    SELECT updated_comment.comment_id, updated_comment.post_id, updated_comment.author_id,
      updated_comment.text_content, updated_comment.created_at, updated_comment.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name,
      am.storage_key AS author_photo_key
    FROM socialu.students s
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE s.student_id = me
  ) c;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_update_comment(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_update_comment(UUID, BIGINT, TEXT) TO service_role;

-- Not an SRS-310 requirement either (see socialu_update_comment's comment
-- above) -- built for parity with SRS-307's Delete Post. Ownership alone is
-- the authorization check, for the same reason: DELETE returns nothing
-- about the post, only {deleted: true}, so there is no post-level access to
-- gate. A student should always be able to remove their own words, even
-- from a post they can no longer view (e.g. after being unfriended) --
-- that is a deliberate choice, not a hole, since it discloses nothing new.
-- notifications.comment_id already cascades (schema.sql) so a future
-- SRS-313 notification tied to this comment is cleaned up automatically,
-- no extra code needed here.
CREATE FUNCTION public.socialu_delete_comment(p_auth_id UUID, p_comment_id BIGINT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; author BIGINT;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT author_id INTO author FROM socialu.post_comments WHERE comment_id = p_comment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
  IF author <> me THEN RAISE EXCEPTION 'Only the comment author can delete this comment.' USING ERRCODE = '42501'; END IF;

  DELETE FROM socialu.post_comments WHERE comment_id = p_comment_id;
  RETURN jsonb_build_object('deleted', true);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_delete_comment(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_delete_comment(UUID, BIGINT) TO service_role;

NOTIFY pgrst, 'reload schema';
