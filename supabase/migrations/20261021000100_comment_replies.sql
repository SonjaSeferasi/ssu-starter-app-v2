-- SocialU | Replying to Comments.
-- Not an SRS requirement (no UR covers replies at all -- this is a
-- separate feature, requested directly, kept logically apart from
-- SRS-310/311/312). Mirrors the established comment architecture rather
-- than introducing a parallel one.
--
-- DATA MODEL: one level of nesting, matching the required "reply to a
-- reply, but only one level of visual nesting." parent_comment_id always
-- points at a TOP-LEVEL comment, never at another reply -- socialu_create_
-- comment resolves "reply to a reply" up to its own parent automatically,
-- so storage can never grow more than one level deep regardless of what a
-- student clicks Reply on. A plain CHECK can't express "my parent has no
-- parent" (no subqueries allowed in CHECK), so this is enforced in
-- socialu_create_comment instead.
--
-- SAFE DELETE: deleting a comment that has replies would, under a plain
-- CASCADE, destroy every other student's replies just because the
-- original commenter deleted their own comment -- unacceptable. Instead:
-- a comment with existing replies is soft-deleted (text replaced with a
-- tombstone, deleted_at set, row kept) so replies stay correctly anchored
-- and visible; a comment with no replies is hard-deleted exactly as
-- before. ON DELETE SET NULL on the FK is a second line of defense in case
-- a row is ever removed by some other path -- replies would become
-- orphaned top-level-shaped rows rather than being destroyed.
ALTER TABLE socialu.post_comments
  ADD COLUMN parent_comment_id BIGINT REFERENCES socialu.post_comments(comment_id) ON DELETE SET NULL,
  ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX post_comments_parent ON socialu.post_comments(parent_comment_id);

-- comment_count must exclude tombstoned comments -- "Deleting a comment
-- decreases the count" (SRS-310 DoD) still has to hold now that a delete
-- can be a soft-delete that keeps the row. Upgrades the same 5
-- feed-shaping functions already touched by 20261018000100_post_comments.sql
-- (comment_count) and 20261020000100_like_notifications.sql (no change
-- needed there, like/notification fields are untouched). See
-- 20261008000200_feed_functions.sql / 20261015000100_edit_post.sql /
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
      EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS is_liked_by_viewer,
      (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = p.post_id AND pc.deleted_at IS NULL) AS comment_count
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
      (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = p.post_id AND pc.deleted_at IS NULL) AS comment_count
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
      (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = updated_post.post_id AND pc.deleted_at IS NULL) AS comment_count
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
      (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = p.post_id AND pc.deleted_at IS NULL) AS comment_count
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

-- socialu_list_comments now also returns parent_comment_id (so the client
-- can group replies under their top-level comment) and deleted_at (so a
-- tombstoned comment renders as "[deleted]" instead of silently vanishing
-- out from under its own replies).
CREATE OR REPLACE FUNCTION public.socialu_list_comments(p_auth_id UUID, p_post_id BIGINT) RETURNS JSONB
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
      pc.parent_comment_id, pc.deleted_at,
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

-- Replying to Comments: p_parent_comment_id is optional (NULL = an
-- ordinary top-level comment, unchanged from before). When set, this
-- flattens to one level of nesting automatically: if the target comment is
-- itself a reply (its own parent_comment_id is set), the new row attaches
-- to THAT top-level comment instead -- so "replying to a reply" always
-- lands as a sibling of the reply you clicked, never a deeper level.
--
-- The live socialu_create_comment(UUID, BIGINT, TEXT) (3 args, no default)
-- must be dropped explicitly first: CREATE OR REPLACE with an added
-- parameter does NOT replace a function of a different arity in Postgres
-- -- it creates a second overload, and 3-arg calls would keep resolving to
-- the OLD one (exact-arity match wins over a defaulted parameter), leaving
-- parent_comment_id/deleted_at silently missing from its return shape.
-- OR REPLACE (not a plain CREATE) below so this is also safe to replay on
-- a brand-new database, where 20261018000100_post_comments.sql's own
-- source-of-truth copy already declares the 4-arg signature directly (it
-- was edited in place for documentation, the same convention used
-- throughout this repo) -- the DROP above then finds nothing to drop, and
-- without OR REPLACE this CREATE would collide with that 4-arg function
-- Postgres already has (caught by __tests__/database/comment-notifications.test.ts,
-- which replays every migration from scratch exactly like a fresh install does).
CREATE OR REPLACE FUNCTION public.socialu_create_comment(
  p_auth_id UUID, p_post_id BIGINT, p_text TEXT, p_parent_comment_id BIGINT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; vis TEXT; target_post BIGINT; target_parent BIGINT;
  actual_parent BIGINT; new_comment socialu.post_comments%ROWTYPE; result JSONB;
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

  IF p_parent_comment_id IS NOT NULL THEN
    SELECT post_id, parent_comment_id INTO target_post, target_parent
    FROM socialu.post_comments WHERE comment_id = p_parent_comment_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
    IF target_post <> p_post_id THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
    actual_parent := coalesce(target_parent, p_parent_comment_id);
  END IF;

  INSERT INTO socialu.post_comments (post_id, author_id, text_content, parent_comment_id)
  VALUES (p_post_id, me, btrim(p_text), actual_parent) RETURNING * INTO new_comment;

  SELECT to_jsonb(c) INTO result FROM (
    SELECT new_comment.comment_id, new_comment.post_id, new_comment.author_id,
      new_comment.text_content, new_comment.created_at, new_comment.edited_at,
      new_comment.parent_comment_id, new_comment.deleted_at,
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
REVOKE ALL ON FUNCTION public.socialu_create_comment(UUID, BIGINT, TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_create_comment(UUID, BIGINT, TEXT, BIGINT) TO service_role;

-- Rejects editing a tombstoned comment -- there's nothing left to edit,
-- and the author_id/ownership check alone wouldn't catch that.
CREATE OR REPLACE FUNCTION public.socialu_update_comment(p_auth_id UUID, p_comment_id BIGINT, p_text TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; author BIGINT; tombstoned TIMESTAMPTZ;
  updated_comment socialu.post_comments%ROWTYPE; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_text IS NULL OR btrim(p_text) = '' THEN
    RAISE EXCEPTION 'Comment text is required.' USING ERRCODE = '22023';
  END IF;
  SELECT author_id, deleted_at INTO author, tombstoned FROM socialu.post_comments WHERE comment_id = p_comment_id;
  IF NOT FOUND OR tombstoned IS NOT NULL THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
  IF author <> me THEN RAISE EXCEPTION 'Only the comment author can edit this comment.' USING ERRCODE = '42501'; END IF;

  UPDATE socialu.post_comments SET text_content = btrim(p_text), edited_at = CURRENT_TIMESTAMP
  WHERE comment_id = p_comment_id RETURNING * INTO updated_comment;

  SELECT to_jsonb(c) INTO result FROM (
    SELECT updated_comment.comment_id, updated_comment.post_id, updated_comment.author_id,
      updated_comment.text_content, updated_comment.created_at, updated_comment.edited_at,
      updated_comment.parent_comment_id, updated_comment.deleted_at,
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

-- Safe delete: a comment with existing replies is soft-deleted (tombstoned)
-- instead of removed, so those replies -- written by other students --
-- are never destroyed just because this comment's author deleted it.
-- Returns {deleted: true, tombstoned: bool} so the client knows whether to
-- remove the row entirely or keep it rendered as "[deleted]".
CREATE OR REPLACE FUNCTION public.socialu_delete_comment(p_auth_id UUID, p_comment_id BIGINT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; author BIGINT; tombstoned TIMESTAMPTZ; has_replies BOOLEAN;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT author_id, deleted_at INTO author, tombstoned FROM socialu.post_comments WHERE comment_id = p_comment_id;
  IF NOT FOUND OR tombstoned IS NOT NULL THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
  IF author <> me THEN RAISE EXCEPTION 'Only the comment author can delete this comment.' USING ERRCODE = '42501'; END IF;

  SELECT EXISTS (SELECT 1 FROM socialu.post_comments WHERE parent_comment_id = p_comment_id) INTO has_replies;

  IF has_replies THEN
    UPDATE socialu.post_comments SET text_content = '[deleted]', deleted_at = CURRENT_TIMESTAMP
    WHERE comment_id = p_comment_id;
    RETURN jsonb_build_object('deleted', true, 'tombstoned', true);
  ELSE
    DELETE FROM socialu.post_comments WHERE comment_id = p_comment_id;
    RETURN jsonb_build_object('deleted', true, 'tombstoned', false);
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
