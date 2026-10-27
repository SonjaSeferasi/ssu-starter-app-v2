-- SocialU | Tagging/Mentioning Students (@username), additional functionality
-- -- not present anywhere in the official SRS (confirmed by a full-text
-- search of documentation/SocialU_SRS_Editable.md before writing this).
--
-- Deliberately separate from socialu.post_tags: that table belongs to the
-- unbuilt Snipe photo-tagging/consent feature (SRS-510.x) a teammate owns.
-- Mentions get their own post_mentions/comment_mentions tables and do NOT
-- populate the Tagged profile category (SRS-113.13) -- per-decision, text
-- mentions are a different concept from photo tags.
--
-- Stable references: a mention row is keyed by student_id (permanent), not
-- by the literal "@text" the author typed. matched_username records
-- exactly what substring was found in the text at the time of the last
-- create/edit, so the renderer can find that EXACT substring again and
-- replace it with a link to the mentioned student's CURRENT profile --
-- resolved fresh via student_id every time the post/comment is read. A
-- renamed student's historical mentions keep working (correct destination);
-- only the literal old handle stays frozen in old text, same as real
-- platforms. A deactivated student's mentions are filtered out of what's
-- returned to clients (see the SELECTs below), so they quietly stop being
-- clickable without any row needing to change.

CREATE TABLE socialu.post_mentions (
    post_id BIGINT NOT NULL REFERENCES socialu.posts(post_id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES socialu.students(student_id) ON DELETE CASCADE,
    matched_username TEXT NOT NULL,
    PRIMARY KEY (post_id, student_id)
);

CREATE TABLE socialu.comment_mentions (
    comment_id BIGINT NOT NULL REFERENCES socialu.post_comments(comment_id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES socialu.students(student_id) ON DELETE CASCADE,
    matched_username TEXT NOT NULL,
    PRIMARY KEY (comment_id, student_id)
);

REVOKE ALL ON socialu.post_mentions, socialu.comment_mentions FROM PUBLIC, anon, authenticated;

-- Extend the shared notifications table for the new 'mention' kind. Same
-- DROP-and-recreate-with-explicit-names pattern as
-- 20261022000100_comment_notifications.sql, for the same reason (the
-- original constraints in schema.sql are unnamed). Shape: a mention
-- notification has EITHER post_id (mentioned directly in a post) OR
-- comment_id (mentioned in a comment/reply) set, mirroring how post_like
-- vs post_comment/comment_reply already work.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'socialu.notifications'::regclass AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE socialu.notifications DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE socialu.notifications
  ADD CONSTRAINT notifications_kind_check
    CHECK (kind IN ('friend_request','friendship_accepted','post_like','post_comment','comment_reply','mention')),
  ADD CONSTRAINT notifications_shape_check
    CHECK ((kind IN ('friend_request','friendship_accepted') AND friend_request_id IS NOT NULL AND post_id IS NULL AND comment_id IS NULL)
        OR (kind = 'post_like' AND post_id IS NOT NULL AND friend_request_id IS NULL AND comment_id IS NULL)
        OR (kind IN ('post_comment','comment_reply') AND comment_id IS NOT NULL AND post_id IS NULL AND friend_request_id IS NULL)
        OR (kind = 'mention' AND friend_request_id IS NULL
            AND ((post_id IS NOT NULL AND comment_id IS NULL) OR (comment_id IS NOT NULL AND post_id IS NULL))));

-- Parses @candidates out of text, resolves each to a real active student,
-- applies the SAME Friends Only authorization rule used everywhere else in
-- this codebase (public -> anyone; friends_only -> the post's author or an
-- accepted friend of the author), and reconciles post_mentions against the
-- CURRENT text: new authorized mentions get a row + a notification; an
-- already-mentioned student's matched_username is refreshed (no new
-- notification -- this is what prevents duplicate notifications when
-- editing without actually changing who's mentioned); anyone no longer
-- validly mentioned (removed from the text, or no longer authorized) has
-- their row AND their mention notification removed. Self-mentions are
-- skipped entirely, never stored, never notified.
CREATE OR REPLACE FUNCTION socialu.sync_post_mentions(p_post_id BIGINT, p_actor_id BIGINT, p_text TEXT) RETURNS VOID
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
DECLARE
  owner BIGINT; vis TEXT;
  candidate TEXT; target BIGINT;
  current_targets BIGINT[] := ARRAY[]::BIGINT[];
  already_mentioned BOOLEAN;
BEGIN
  SELECT author_id, visibility INTO owner, vis FROM posts WHERE post_id = p_post_id;

  FOR candidate IN
    SELECT DISTINCT lower(m[1]) FROM regexp_matches(coalesce(p_text, ''), '@([A-Za-z0-9_.-]{1,50})', 'g') AS m
  LOOP
    SELECT student_id INTO target FROM students WHERE lower(username) = candidate AND is_active;
    IF target IS NULL OR target = p_actor_id THEN CONTINUE; END IF;
    IF vis = 'friends_only' AND target <> owner AND NOT are_friends(target, owner) THEN CONTINUE; END IF;

    current_targets := array_append(current_targets, target);
    SELECT EXISTS(SELECT 1 FROM post_mentions WHERE post_id = p_post_id AND student_id = target) INTO already_mentioned;
    IF already_mentioned THEN
      UPDATE post_mentions SET matched_username = candidate WHERE post_id = p_post_id AND student_id = target;
    ELSE
      INSERT INTO post_mentions (post_id, student_id, matched_username) VALUES (p_post_id, target, candidate);
      INSERT INTO notifications (recipient_id, actor_id, kind, post_id) VALUES (target, p_actor_id, 'mention', p_post_id);
    END IF;
  END LOOP;

  DELETE FROM notifications WHERE kind = 'mention' AND post_id = p_post_id
    AND recipient_id IN (SELECT student_id FROM post_mentions WHERE post_id = p_post_id AND NOT (student_id = ANY(current_targets)));
  DELETE FROM post_mentions WHERE post_id = p_post_id AND NOT (student_id = ANY(current_targets));
END;
$$;

-- Same logic for a comment, authorized against its PARENT POST's visibility
-- and author (comments have no visibility of their own) -- the exact same
-- rule socialu_create_comment itself already uses to decide whether the
-- commenter is even allowed to comment at all.
CREATE OR REPLACE FUNCTION socialu.sync_comment_mentions(p_comment_id BIGINT, p_post_id BIGINT, p_actor_id BIGINT, p_text TEXT) RETURNS VOID
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
DECLARE
  owner BIGINT; vis TEXT;
  candidate TEXT; target BIGINT;
  current_targets BIGINT[] := ARRAY[]::BIGINT[];
  already_mentioned BOOLEAN;
BEGIN
  SELECT author_id, visibility INTO owner, vis FROM posts WHERE post_id = p_post_id;

  FOR candidate IN
    SELECT DISTINCT lower(m[1]) FROM regexp_matches(coalesce(p_text, ''), '@([A-Za-z0-9_.-]{1,50})', 'g') AS m
  LOOP
    SELECT student_id INTO target FROM students WHERE lower(username) = candidate AND is_active;
    IF target IS NULL OR target = p_actor_id THEN CONTINUE; END IF;
    IF vis = 'friends_only' AND target <> owner AND NOT are_friends(target, owner) THEN CONTINUE; END IF;

    current_targets := array_append(current_targets, target);
    SELECT EXISTS(SELECT 1 FROM comment_mentions WHERE comment_id = p_comment_id AND student_id = target) INTO already_mentioned;
    IF already_mentioned THEN
      UPDATE comment_mentions SET matched_username = candidate WHERE comment_id = p_comment_id AND student_id = target;
    ELSE
      INSERT INTO comment_mentions (comment_id, student_id, matched_username) VALUES (p_comment_id, target, candidate);
      INSERT INTO notifications (recipient_id, actor_id, kind, comment_id) VALUES (target, p_actor_id, 'mention', p_comment_id);
    END IF;
  END LOOP;

  DELETE FROM notifications WHERE kind = 'mention' AND comment_id = p_comment_id
    AND recipient_id IN (SELECT student_id FROM comment_mentions WHERE comment_id = p_comment_id AND NOT (student_id = ANY(current_targets)));
  DELETE FROM comment_mentions WHERE comment_id = p_comment_id AND NOT (student_id = ANY(current_targets));
END;
$$;

-- socialu_campus_feed / socialu_friends_feed / socialu_profile_content /
-- socialu_create_post / socialu_update_post: unchanged apart from adding
-- the `mentions` field (same coalesce-to-'[]' pattern already used for
-- `photos`) and, for create/update, calling the sync helper above.

CREATE OR REPLACE FUNCTION public.socialu_campus_feed(p_auth_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT coalesce(jsonb_agg(to_jsonb(feed) ORDER BY feed.published_at DESC), '[]'::jsonb) INTO result
  FROM (
    SELECT p.post_id, p.author_id, p.text_content, p.visibility, p.published_at, p.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name, s.username AS author_username,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', pm.asset_id, 'storage_key', pm.storage_key))
                FROM socialu.post_photos pp JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                WHERE pp.post_id = p.post_id), '[]'::jsonb) AS photos,
      coalesce((SELECT jsonb_agg(jsonb_build_object('student_id', men.student_id, 'matched_username', men.matched_username,
                  'username', ms.username, 'name', coalesce(msp.display_name, ms.full_name), 'photo_key', mam.storage_key))
                FROM socialu.post_mentions men
                JOIN socialu.students ms ON ms.student_id = men.student_id AND ms.is_active
                LEFT JOIN socialu.student_profiles msp ON msp.student_id = ms.student_id
                LEFT JOIN socialu.media_assets mam ON mam.asset_id = msp.photo_id
                WHERE men.post_id = p.post_id), '[]'::jsonb) AS mentions,
      (SELECT count(*) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS like_count,
      EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS is_liked_by_viewer,
      (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = p.post_id AND pc.deleted_at IS NULL) AS comment_count
    FROM socialu.posts p
    JOIN socialu.students s ON s.student_id = p.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE p.visibility = 'public' AND s.is_active AND NOT socialu.is_blocked(me,p.author_id)
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
      coalesce(sp.display_name, s.full_name) AS author_name, s.username AS author_username,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', pm.asset_id, 'storage_key', pm.storage_key))
                FROM socialu.post_photos pp JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                WHERE pp.post_id = p.post_id), '[]'::jsonb) AS photos,
      coalesce((SELECT jsonb_agg(jsonb_build_object('student_id', men.student_id, 'matched_username', men.matched_username,
                  'username', ms.username, 'name', coalesce(msp.display_name, ms.full_name), 'photo_key', mam.storage_key))
                FROM socialu.post_mentions men
                JOIN socialu.students ms ON ms.student_id = men.student_id AND ms.is_active
                LEFT JOIN socialu.student_profiles msp ON msp.student_id = ms.student_id
                LEFT JOIN socialu.media_assets mam ON mam.asset_id = msp.photo_id
                WHERE men.post_id = p.post_id), '[]'::jsonb) AS mentions,
      (SELECT count(*) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS like_count,
      EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS is_liked_by_viewer,
      (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = p.post_id AND pc.deleted_at IS NULL) AS comment_count
    FROM socialu.posts p
    JOIN socialu.students s ON s.student_id = p.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE p.visibility = 'friends_only' AND (p.author_id = me OR socialu.are_friends(me, p.author_id))
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
      coalesce(sp.display_name, s.full_name) AS author_name, s.username AS author_username,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', pm.asset_id, 'storage_key', pm.storage_key))
                FROM socialu.post_photos pp JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                WHERE pp.post_id = p.post_id), '[]'::jsonb) AS photos,
      coalesce((SELECT jsonb_agg(jsonb_build_object('student_id', men.student_id, 'matched_username', men.matched_username,
                  'username', ms.username, 'name', coalesce(msp.display_name, ms.full_name), 'photo_key', mam.storage_key))
                FROM socialu.post_mentions men
                JOIN socialu.students ms ON ms.student_id = men.student_id AND ms.is_active
                LEFT JOIN socialu.student_profiles msp ON msp.student_id = ms.student_id
                LEFT JOIN socialu.media_assets mam ON mam.asset_id = msp.photo_id
                WHERE men.post_id = p.post_id), '[]'::jsonb) AS mentions,
      (SELECT count(*) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS like_count,
      EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS is_liked_by_viewer,
      (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = p.post_id AND pc.deleted_at IS NULL) AS comment_count
    FROM socialu.posts p
    JOIN socialu.students s ON s.student_id = p.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE CASE WHEN p_category = 'posts' THEN p.author_id = target
               ELSE EXISTS (SELECT 1 FROM socialu.post_tags t WHERE t.post_id = p.post_id AND t.student_id = target) END
      AND (p.author_id = me OR p.visibility = 'public' OR socialu.are_friends(me, p.author_id))
      AND (p.author_id = me OR NOT socialu.is_blocked(me, p.author_id))
  ) c;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.socialu_create_post(p_auth_id UUID, p_text TEXT, p_visibility TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; clean_text TEXT; new_post socialu.posts%ROWTYPE; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  clean_text := NULLIF(btrim(coalesce(p_text, '')), '');
  IF p_visibility IS NULL OR p_visibility NOT IN ('public', 'friends_only') THEN
    RAISE EXCEPTION 'Choose a visibility option: Public or Friends Only.' USING ERRCODE = '22023';
  END IF;
  INSERT INTO socialu.posts (author_id, text_content, visibility)
  VALUES (me, clean_text, p_visibility) RETURNING * INTO new_post;
  SET CONSTRAINTS ALL IMMEDIATE;
  PERFORM socialu.sync_post_mentions(new_post.post_id, me, clean_text);
  SELECT to_jsonb(feed) INTO result FROM (
    SELECT new_post.post_id, new_post.author_id, new_post.text_content, new_post.visibility,
      new_post.published_at, new_post.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name, s.username AS author_username,
      am.storage_key AS author_photo_key,
      '[]'::jsonb AS photos,
      '[]'::jsonb AS mentions,
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
DECLARE me BIGINT; owner BIGINT; clean_text TEXT; updated_post socialu.posts%ROWTYPE; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  clean_text := NULLIF(btrim(coalesce(p_text, '')), '');
  SELECT author_id INTO owner FROM socialu.posts WHERE post_id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002'; END IF;
  IF owner <> me THEN RAISE EXCEPTION 'Only the post author can edit this post.' USING ERRCODE = '42501'; END IF;

  UPDATE socialu.posts SET text_content = clean_text, edited_at = CURRENT_TIMESTAMP
  WHERE post_id = p_post_id RETURNING * INTO updated_post;
  SET CONSTRAINTS ALL IMMEDIATE;
  PERFORM socialu.sync_post_mentions(p_post_id, me, clean_text);

  SELECT to_jsonb(feed) INTO result FROM (
    SELECT updated_post.post_id, updated_post.author_id, updated_post.text_content, updated_post.visibility,
      updated_post.published_at, updated_post.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', pm.asset_id, 'storage_key', pm.storage_key))
                FROM socialu.post_photos pp JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                WHERE pp.post_id = updated_post.post_id), '[]'::jsonb) AS photos,
      coalesce((SELECT jsonb_agg(jsonb_build_object('student_id', men.student_id, 'matched_username', men.matched_username,
                  'username', ms.username, 'name', coalesce(msp.display_name, ms.full_name), 'photo_key', mam.storage_key))
                FROM socialu.post_mentions men
                JOIN socialu.students ms ON ms.student_id = men.student_id AND ms.is_active
                LEFT JOIN socialu.student_profiles msp ON msp.student_id = ms.student_id
                LEFT JOIN socialu.media_assets mam ON mam.asset_id = msp.photo_id
                WHERE men.post_id = updated_post.post_id), '[]'::jsonb) AS mentions,
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

-- socialu_list_comments / socialu_create_comment / socialu_update_comment:
-- same `mentions` addition for comments, using comment_mentions.

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
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(jsonb_build_object('student_id', men.student_id, 'matched_username', men.matched_username,
                  'username', ms.username, 'name', coalesce(msp.display_name, ms.full_name), 'photo_key', mam.storage_key))
                FROM socialu.comment_mentions men
                JOIN socialu.students ms ON ms.student_id = men.student_id AND ms.is_active
                LEFT JOIN socialu.student_profiles msp ON msp.student_id = ms.student_id
                LEFT JOIN socialu.media_assets mam ON mam.asset_id = msp.photo_id
                WHERE men.comment_id = pc.comment_id), '[]'::jsonb) AS mentions
    FROM socialu.post_comments pc
    JOIN socialu.students s ON s.student_id = pc.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE pc.post_id = p_post_id
  ) c;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.socialu_create_comment(
  p_auth_id UUID, p_post_id BIGINT, p_text TEXT, p_parent_comment_id BIGINT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; vis TEXT; target_post BIGINT; target_parent BIGINT; target_author BIGINT;
  actual_parent BIGINT; clean_text TEXT; new_comment socialu.post_comments%ROWTYPE; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_text IS NULL OR btrim(p_text) = '' THEN
    RAISE EXCEPTION 'Comment text is required.' USING ERRCODE = '22023';
  END IF;
  clean_text := btrim(p_text);
  SELECT author_id, visibility INTO owner, vis FROM socialu.posts WHERE post_id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002'; END IF;
  IF vis = 'friends_only' AND owner <> me AND NOT socialu.are_friends(me, owner) THEN
    RAISE EXCEPTION 'You are not authorized to view this post.' USING ERRCODE = '42501';
  END IF;

  IF p_parent_comment_id IS NOT NULL THEN
    SELECT post_id, parent_comment_id, author_id INTO target_post, target_parent, target_author
    FROM socialu.post_comments WHERE comment_id = p_parent_comment_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
    IF target_post <> p_post_id THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
    actual_parent := coalesce(target_parent, p_parent_comment_id);
  END IF;

  INSERT INTO socialu.post_comments (post_id, author_id, text_content, parent_comment_id)
  VALUES (p_post_id, me, clean_text, actual_parent) RETURNING * INTO new_comment;

  IF p_parent_comment_id IS NOT NULL AND target_author <> me THEN
    INSERT INTO socialu.notifications (recipient_id, actor_id, kind, comment_id)
    VALUES (target_author, me, 'comment_reply', new_comment.comment_id);
  END IF;
  IF owner <> me AND (p_parent_comment_id IS NULL OR owner <> target_author) THEN
    INSERT INTO socialu.notifications (recipient_id, actor_id, kind, comment_id)
    VALUES (owner, me, 'post_comment', new_comment.comment_id);
  END IF;
  PERFORM socialu.sync_comment_mentions(new_comment.comment_id, p_post_id, me, clean_text);

  SELECT to_jsonb(c) INTO result FROM (
    SELECT new_comment.comment_id, new_comment.post_id, new_comment.author_id,
      new_comment.text_content, new_comment.created_at, new_comment.edited_at,
      new_comment.parent_comment_id, new_comment.deleted_at,
      coalesce(sp.display_name, s.full_name) AS author_name,
      am.storage_key AS author_photo_key,
      '[]'::jsonb AS mentions
    FROM socialu.students s
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE s.student_id = me
  ) c;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.socialu_update_comment(p_auth_id UUID, p_comment_id BIGINT, p_text TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; author BIGINT; tombstoned TIMESTAMPTZ; clean_text TEXT;
  updated_comment socialu.post_comments%ROWTYPE; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_text IS NULL OR btrim(p_text) = '' THEN
    RAISE EXCEPTION 'Comment text is required.' USING ERRCODE = '22023';
  END IF;
  clean_text := btrim(p_text);
  SELECT author_id, deleted_at INTO author, tombstoned FROM socialu.post_comments WHERE comment_id = p_comment_id;
  IF NOT FOUND OR tombstoned IS NOT NULL THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
  IF author <> me THEN RAISE EXCEPTION 'Only the comment author can edit this comment.' USING ERRCODE = '42501'; END IF;

  UPDATE socialu.post_comments SET text_content = clean_text, edited_at = CURRENT_TIMESTAMP
  WHERE comment_id = p_comment_id RETURNING * INTO updated_comment;
  PERFORM socialu.sync_comment_mentions(p_comment_id, updated_comment.post_id, me, clean_text);

  SELECT to_jsonb(c) INTO result FROM (
    SELECT updated_comment.comment_id, updated_comment.post_id, updated_comment.author_id,
      updated_comment.text_content, updated_comment.created_at, updated_comment.edited_at,
      updated_comment.parent_comment_id, updated_comment.deleted_at,
      coalesce(sp.display_name, s.full_name) AS author_name,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(jsonb_build_object('student_id', men.student_id, 'matched_username', men.matched_username,
                  'username', ms.username, 'name', coalesce(msp.display_name, ms.full_name), 'photo_key', mam.storage_key))
                FROM socialu.comment_mentions men
                JOIN socialu.students ms ON ms.student_id = men.student_id AND ms.is_active
                LEFT JOIN socialu.student_profiles msp ON msp.student_id = ms.student_id
                LEFT JOIN socialu.media_assets mam ON mam.asset_id = msp.photo_id
                WHERE men.comment_id = updated_comment.comment_id), '[]'::jsonb) AS mentions
    FROM socialu.students s
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE s.student_id = me
  ) c;
  RETURN result;
END;
$$;

-- socialu_notifications: add 'mention' items, split into a post-mention
-- sub-CTE (post_id set) and a comment-mention sub-CTE (comment_id set,
-- resolved via its parent post the same way comment_items already does),
-- unioned together. Everything else (friend_items/like_items/comment_items,
-- the unread-count logic) is byte-for-byte unchanged from
-- 20261024000100_unify_notifications.sql.
CREATE OR REPLACE FUNCTION public.socialu_notifications(p_auth_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);

  WITH friend_items AS (
    SELECT n.notification_id, n.kind::TEXT AS kind, n.created_at, n.read_at,
      s.username AS actor_username, coalesce(sp.display_name, s.full_name) AS actor_name,
      am.storage_key AS actor_photo_key, r.status::TEXT AS request_status,
      NULL::BIGINT AS post_id, NULL::BIGINT AS comment_id, NULL::TEXT AS visibility,
      1::BIGINT AS actor_count, jsonb_build_array(coalesce(sp.display_name, s.full_name)) AS actor_names,
      (n.read_at IS NULL) AS is_unread
    FROM socialu.notifications n
    JOIN socialu.students s ON s.student_id = n.actor_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    LEFT JOIN socialu.friend_requests r ON r.request_id = n.friend_request_id
    WHERE n.recipient_id = me AND n.kind IN ('friend_request', 'friendship_accepted')
      AND s.is_active AND NOT socialu.is_blocked(me, n.actor_id)
  ),
  likes AS (
    SELECT n.notification_id, n.post_id, n.actor_id, n.created_at, n.read_at,
      lag(n.created_at) OVER (PARTITION BY n.post_id ORDER BY n.created_at) AS prev_at
    FROM socialu.notifications n
    WHERE n.recipient_id = me AND n.kind = 'post_like'
  ),
  flagged AS (
    SELECT *, CASE WHEN prev_at IS NULL OR created_at - prev_at > INTERVAL '24 hours' THEN 1 ELSE 0 END AS starts_group
    FROM likes
  ),
  grouped AS (
    SELECT *, sum(starts_group) OVER (PARTITION BY post_id ORDER BY created_at) AS group_id
    FROM flagged
  ),
  like_groups AS (
    SELECT post_id, group_id,
      max(notification_id) AS notification_id,
      max(created_at) AS latest_at,
      bool_and(read_at IS NOT NULL) AS all_read,
      count(*) AS actor_count,
      array_agg(actor_id ORDER BY created_at DESC) AS actor_ids
    FROM grouped
    GROUP BY post_id, group_id
  ),
  like_items AS (
    SELECT g.notification_id, 'post_like'::TEXT AS kind, g.latest_at AS created_at,
      CASE WHEN g.all_read THEN g.latest_at ELSE NULL END AS read_at,
      first_actor.username AS actor_username, coalesce(first_sp.display_name, first_actor.full_name) AS actor_name,
      first_am.storage_key AS actor_photo_key, NULL::TEXT AS request_status,
      g.post_id, NULL::BIGINT AS comment_id, p.visibility::TEXT AS visibility,
      g.actor_count,
      (SELECT jsonb_agg(coalesce(sp2.display_name, s2.full_name) ORDER BY ord.ord)
       FROM unnest(g.actor_ids) WITH ORDINALITY AS ord(actor_id, ord)
       JOIN socialu.students s2 ON s2.student_id = ord.actor_id
       LEFT JOIN socialu.student_profiles sp2 ON sp2.student_id = s2.student_id
      ) AS actor_names,
      NOT g.all_read AS is_unread
    FROM like_groups g
    JOIN socialu.posts p ON p.post_id = g.post_id
    JOIN socialu.students first_actor ON first_actor.student_id = g.actor_ids[1]
    LEFT JOIN socialu.student_profiles first_sp ON first_sp.student_id = first_actor.student_id
    LEFT JOIN socialu.media_assets first_am ON first_am.asset_id = first_sp.photo_id
  ),
  comment_items AS (
    SELECT n.notification_id, n.kind::TEXT AS kind, n.created_at, n.read_at,
      s.username AS actor_username, coalesce(sp.display_name, s.full_name) AS actor_name,
      am.storage_key AS actor_photo_key, NULL::TEXT AS request_status,
      pc.post_id, n.comment_id, p.visibility::TEXT AS visibility,
      1::BIGINT AS actor_count, jsonb_build_array(coalesce(sp.display_name, s.full_name)) AS actor_names,
      (n.read_at IS NULL) AS is_unread
    FROM socialu.notifications n
    JOIN socialu.post_comments pc ON pc.comment_id = n.comment_id
    JOIN socialu.posts p ON p.post_id = pc.post_id
    JOIN socialu.students s ON s.student_id = n.actor_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE n.recipient_id = me AND n.kind IN ('post_comment', 'comment_reply')
  ),
  -- Mention notifications are re-authorized at READ time, not just at
  -- creation time -- unlike post_like/post_comment/comment_reply, a
  -- mention's recipient is NOT necessarily the post's own author (the
  -- author can mention anyone), so there genuinely is a post the
  -- recipient might lose access to after the fact: if the friendship that
  -- authorized a Friends Only mention later ends, or either side blocks
  -- the other (which also ends any friendship -- see
  -- 20261016010000_friendships.sql's block_cleanup -- but blocking alone
  -- wouldn't otherwise be caught for an already-Public post), the
  -- notification now disappears from this list entirely, exactly like
  -- socialu_campus_feed/socialu_friends_feed already re-check on every
  -- read. This is the same rule used everywhere else in this codebase:
  -- public -> anyone; friends_only -> the post's author or a current
  -- accepted friend; never someone the viewer has blocked.
  post_mention_items AS (
    SELECT n.notification_id, n.kind::TEXT AS kind, n.created_at, n.read_at,
      s.username AS actor_username, coalesce(sp.display_name, s.full_name) AS actor_name,
      am.storage_key AS actor_photo_key, NULL::TEXT AS request_status,
      n.post_id, NULL::BIGINT AS comment_id, p.visibility::TEXT AS visibility,
      1::BIGINT AS actor_count, jsonb_build_array(coalesce(sp.display_name, s.full_name)) AS actor_names,
      (n.read_at IS NULL) AS is_unread
    FROM socialu.notifications n
    JOIN socialu.posts p ON p.post_id = n.post_id
      AND (p.visibility = 'public' OR p.author_id = me OR socialu.are_friends(me, p.author_id))
      AND NOT socialu.is_blocked(me, p.author_id)
    JOIN socialu.students s ON s.student_id = n.actor_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE n.recipient_id = me AND n.kind = 'mention' AND n.post_id IS NOT NULL
  ),
  -- Same rule, re-checked against the PARENT POST's author -- a comment's
  -- own author (who did the mentioning) is often a different person from
  -- the post's author, so this also independently blocks the case where
  -- the viewer has blocked the commenter specifically, even if the post's
  -- own author is still fine.
  comment_mention_items AS (
    SELECT n.notification_id, n.kind::TEXT AS kind, n.created_at, n.read_at,
      s.username AS actor_username, coalesce(sp.display_name, s.full_name) AS actor_name,
      am.storage_key AS actor_photo_key, NULL::TEXT AS request_status,
      pc.post_id, n.comment_id, p.visibility::TEXT AS visibility,
      1::BIGINT AS actor_count, jsonb_build_array(coalesce(sp.display_name, s.full_name)) AS actor_names,
      (n.read_at IS NULL) AS is_unread
    FROM socialu.notifications n
    JOIN socialu.post_comments pc ON pc.comment_id = n.comment_id
    JOIN socialu.posts p ON p.post_id = pc.post_id
      AND (p.visibility = 'public' OR p.author_id = me OR socialu.are_friends(me, p.author_id))
      AND NOT socialu.is_blocked(me, p.author_id)
    JOIN socialu.students s ON s.student_id = n.actor_id AND NOT socialu.is_blocked(me, s.student_id)
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE n.recipient_id = me AND n.kind = 'mention' AND n.comment_id IS NOT NULL
  ),
  all_items AS (
    SELECT * FROM friend_items
    UNION ALL SELECT * FROM like_items
    UNION ALL SELECT * FROM comment_items
    UNION ALL SELECT * FROM post_mention_items
    UNION ALL SELECT * FROM comment_mention_items
  )
  SELECT jsonb_build_object(
    'unread', (SELECT count(*) FROM all_items WHERE is_unread),
    'notifications', (SELECT coalesce(jsonb_agg((to_jsonb(ai) - 'is_unread') ORDER BY ai.created_at DESC), '[]'::jsonb)
                       FROM all_items ai)
  ) INTO result;

  RETURN result;
END;
$$;

NOTIFY pgrst, 'reload schema';
