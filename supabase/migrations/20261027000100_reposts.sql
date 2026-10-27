-- SocialU | Facebook-style reposting inside SocialU, additional
-- functionality not in the official SRS. Depends on and is compatible
-- with 20261026000400_mentions.sql and 20261026000500_share_post.sql
-- (this file's timestamp sorts after both).
--
-- Design: a repost is just a normal row in socialu.posts (authored by the
-- reposter, with their own optional caption as text_content) that
-- additionally points at the original via one new nullable column. This
-- is deliberate: socialu.post_likes/post_comments already key off
-- posts.post_id, so likes/comments on a repost are independent of the
-- original for free, with zero new tables or duplicated infrastructure.
--
-- Privacy (two independent gates, both re-checked live on every read,
-- never cached):
--   1. The repost's OWN visibility/author gates whether the repost itself
--      appears in a feed -- unchanged, existing logic.
--   2. The embedded original's content is re-resolved fresh on every read
--      against the CURRENT viewer (visibility/friendship/block/author
--      active) -- if that check fails now, for any reason, the embed is
--      simply NULL ("Original post unavailable"), independent of whether
--      the repost itself is visible. Nothing about the original is ever
--      copied into the repost row, so there's nothing to leak.
-- A Friends Only original forces the new repost's own visibility to
-- friends_only too, at creation time, regardless of what was requested --
-- a Friends Only original can never end up wrapped in a Public repost.
-- Reposting a repost flattens to the TRUE original (one level only),
-- mirroring the exact pattern already used for comment-reply flattening.

ALTER TABLE socialu.posts ADD COLUMN repost_of_post_id BIGINT REFERENCES socialu.posts(post_id) ON DELETE SET NULL;

-- Persisted independently of the live FK above. repost_of_post_id gets
-- SET NULL by Postgres when the original is deleted (ON DELETE SET
-- NULL), but a repost must keep showing "Original post unavailable" --
-- and keep its own likes/comments -- instead of disappearing, so
-- "this row is a repost" has to survive that nulling. Set once at
-- creation, never updated afterward.
ALTER TABLE socialu.posts ADD COLUMN is_repost BOOLEAN NOT NULL DEFAULT FALSE;

-- A repost with no caption and no photo of its own still has content (the
-- embedded original, or -- once the original is deleted -- the "Original
-- post unavailable" placeholder) -- the deferred posts-table trigger
-- (UPDATE only, see 20261026000300_srs_315_fixes.sql) must not reject
-- editing a repost's caption down to blank, or reject it once its
-- original is gone and repost_of_post_id has been SET NULL.
CREATE OR REPLACE FUNCTION socialu.check_post_content() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
DECLARE p BIGINT;
BEGIN
    p := COALESCE(NEW.post_id,OLD.post_id);
    IF EXISTS (SELECT 1 FROM posts WHERE post_id=p AND COALESCE(btrim(text_content),'')='' AND NOT is_repost)
        AND NOT EXISTS (SELECT 1 FROM post_photos WHERE post_id=p)
    THEN RAISE EXCEPTION 'A published post must contain text or a photo'; END IF;
    RETURN NULL;
END;
$$;

-- socialu_delete_post itself needs no changes: a repost of the post being
-- deleted simply has repost_of_post_id SET NULL by the FK (Postgres
-- implements this as an UPDATE, which fires the content trigger above --
-- harmless now that is_repost, not the live FK, is what keeps a
-- captionless/photoless repost valid) and survives in its own feed with
-- "Original post unavailable", its likes/comments untouched.

-- Extend the shared notifications constraints for the new 'repost' kind
-- (same DROP-and-recreate-with-explicit-names pattern as
-- 20261026000400_mentions.sql). Shape: like post_like, always post_id only
-- -- the repost's OWN post_id (a stable reference to the repost itself),
-- never the original's, so clicking the notification always opens the
-- repost, consistent with 20261026000500_share_post.sql's existing
-- single-post link.
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
    CHECK (kind IN ('friend_request','friendship_accepted','post_like','post_comment','comment_reply','mention','repost')),
  ADD CONSTRAINT notifications_shape_check
    CHECK ((kind IN ('friend_request','friendship_accepted') AND friend_request_id IS NOT NULL AND post_id IS NULL AND comment_id IS NULL)
        OR (kind IN ('post_like','repost') AND post_id IS NOT NULL AND friend_request_id IS NULL AND comment_id IS NULL)
        OR (kind IN ('post_comment','comment_reply') AND comment_id IS NOT NULL AND post_id IS NULL AND friend_request_id IS NULL)
        OR (kind = 'mention' AND friend_request_id IS NULL
            AND ((post_id IS NOT NULL AND comment_id IS NULL) OR (comment_id IS NOT NULL AND post_id IS NULL))));

-- socialu_create_post gains ONE new optional parameter. Postgres does NOT
-- treat an added DEFAULT-valued parameter as replacing the existing 3-arg
-- function -- it creates a second overload, and every existing 3-arg
-- caller (app/api/posts/route.ts and every PGlite test) would keep
-- resolving to the OLD one. The explicit DROP below is required, exactly
-- the same gotcha already documented and fixed once for
-- socialu_create_comment in 20261021000100_comment_replies.sql.
DROP FUNCTION IF EXISTS public.socialu_create_post(UUID, TEXT, TEXT);

CREATE FUNCTION public.socialu_create_post(
  p_auth_id UUID, p_text TEXT, p_visibility TEXT, p_repost_of_post_id BIGINT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me BIGINT; clean_text TEXT; new_post socialu.posts%ROWTYPE; result JSONB;
  orig_author BIGINT; orig_vis TEXT; orig_chain BIGINT; effective_repost_of BIGINT;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  clean_text := NULLIF(btrim(coalesce(p_text, '')), '');

  IF p_repost_of_post_id IS NOT NULL THEN
    SELECT author_id, visibility, repost_of_post_id INTO orig_author, orig_vis, orig_chain
    FROM socialu.posts WHERE post_id = p_repost_of_post_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'This post isn''t available.' USING ERRCODE = 'P0002'; END IF;
    -- Flatten: reposting a repost always attaches to the TRUE original,
    -- never creates a chain. Re-resolve author/visibility against the
    -- real target so the authorization check below is against the actual
    -- original, not the intermediate repost.
    effective_repost_of := coalesce(orig_chain, p_repost_of_post_id);
    IF orig_chain IS NOT NULL THEN
      SELECT author_id, visibility INTO orig_author, orig_vis FROM socialu.posts WHERE post_id = orig_chain;
      IF NOT FOUND THEN RAISE EXCEPTION 'This post isn''t available.' USING ERRCODE = 'P0002'; END IF;
    END IF;
    -- Must be currently authorized to view the original to repost it at all.
    IF orig_vis = 'friends_only' AND orig_author <> me AND NOT socialu.are_friends(me, orig_author) THEN
      RAISE EXCEPTION 'This post isn''t available.' USING ERRCODE = 'P0002';
    END IF;
    IF socialu.is_blocked(me, orig_author) THEN
      RAISE EXCEPTION 'This post isn''t available.' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  IF p_visibility IS NULL OR p_visibility NOT IN ('public', 'friends_only') THEN
    RAISE EXCEPTION 'Choose a visibility option: Public or Friends Only.' USING ERRCODE = '22023';
  END IF;
  -- A Friends Only original forces the repost's own visibility too --
  -- never trust the client's requested value when this applies.
  IF effective_repost_of IS NOT NULL AND orig_vis = 'friends_only' THEN
    p_visibility := 'friends_only';
  END IF;

  INSERT INTO socialu.posts (author_id, text_content, visibility, repost_of_post_id, is_repost)
  VALUES (me, clean_text, p_visibility, effective_repost_of, effective_repost_of IS NOT NULL) RETURNING * INTO new_post;
  SET CONSTRAINTS ALL IMMEDIATE;
  PERFORM socialu.sync_post_mentions(new_post.post_id, me, clean_text);

  -- Notify the original author, unless they're reposting themselves.
  -- A stable reference: this is the REPOST's own post_id, so clicking the
  -- notification opens the repost (which embeds the original), the same
  -- link shape post_like notifications already use.
  IF effective_repost_of IS NOT NULL AND orig_author <> me THEN
    INSERT INTO socialu.notifications (recipient_id, actor_id, kind, post_id)
    VALUES (orig_author, me, 'repost', new_post.post_id);
  END IF;

  SELECT to_jsonb(feed) INTO result FROM (
    SELECT new_post.post_id, new_post.author_id, new_post.text_content, new_post.visibility,
      new_post.published_at, new_post.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name, s.username AS author_username,
      am.storage_key AS author_photo_key,
      '[]'::jsonb AS photos,
      '[]'::jsonb AS mentions,
      new_post.is_repost AS is_repost,
      CASE WHEN new_post.repost_of_post_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'post_id', op.post_id, 'author_id', op.author_id,
          'author_name', coalesce(osp.display_name, os.full_name), 'author_username', os.username,
          'author_photo_key', oam.storage_key, 'published_at', op.published_at, 'text_content', op.text_content,
          'photos', coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', opm.asset_id, 'storage_key', opm.storage_key))
                    FROM socialu.post_photos opp JOIN socialu.media_assets opm ON opm.asset_id = opp.asset_id
                    WHERE opp.post_id = op.post_id), '[]'::jsonb)
        )
        FROM socialu.posts op
        JOIN socialu.students os ON os.student_id = op.author_id AND os.is_active
        LEFT JOIN socialu.student_profiles osp ON osp.student_id = os.student_id
        LEFT JOIN socialu.media_assets oam ON oam.asset_id = osp.photo_id
        WHERE op.post_id = new_post.repost_of_post_id
          AND (op.visibility = 'public' OR op.author_id = me OR socialu.are_friends(me, op.author_id))
          AND NOT socialu.is_blocked(me, op.author_id)
      ) ELSE NULL END AS repost_of,
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
REVOKE ALL ON FUNCTION public.socialu_create_post(UUID, TEXT, TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_create_post(UUID, TEXT, TEXT, BIGINT) TO service_role;

-- socialu_update_post, socialu_campus_feed, socialu_friends_feed,
-- socialu_profile_content, socialu_get_post: unchanged apart from adding
-- `is_repost`/`repost_of` (same coalesce-to-null-or-'[]' pattern already
-- used for `mentions`/`photos`). Editing a repost's caption already works
-- through socialu_update_post completely unchanged -- it only ever
-- touches text_content, never repost_of_post_id, so "the original
-- embedded post must remain unchanged" holds structurally, not just by
-- convention.

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
      updated_post.is_repost AS is_repost,
      CASE WHEN updated_post.repost_of_post_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'post_id', op.post_id, 'author_id', op.author_id,
          'author_name', coalesce(osp.display_name, os.full_name), 'author_username', os.username,
          'author_photo_key', oam.storage_key, 'published_at', op.published_at, 'text_content', op.text_content,
          'photos', coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', opm.asset_id, 'storage_key', opm.storage_key))
                    FROM socialu.post_photos opp JOIN socialu.media_assets opm ON opm.asset_id = opp.asset_id
                    WHERE opp.post_id = op.post_id), '[]'::jsonb)
        )
        FROM socialu.posts op
        JOIN socialu.students os ON os.student_id = op.author_id AND os.is_active
        LEFT JOIN socialu.student_profiles osp ON osp.student_id = os.student_id
        LEFT JOIN socialu.media_assets oam ON oam.asset_id = osp.photo_id
        WHERE op.post_id = updated_post.repost_of_post_id
          AND (op.visibility = 'public' OR op.author_id = me OR socialu.are_friends(me, op.author_id))
          AND NOT socialu.is_blocked(me, op.author_id)
      ) ELSE NULL END AS repost_of,
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
      p.is_repost AS is_repost,
      CASE WHEN p.repost_of_post_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'post_id', op.post_id, 'author_id', op.author_id,
          'author_name', coalesce(osp.display_name, os.full_name), 'author_username', os.username,
          'author_photo_key', oam.storage_key, 'published_at', op.published_at, 'text_content', op.text_content,
          'photos', coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', opm.asset_id, 'storage_key', opm.storage_key))
                    FROM socialu.post_photos opp JOIN socialu.media_assets opm ON opm.asset_id = opp.asset_id
                    WHERE opp.post_id = op.post_id), '[]'::jsonb)
        )
        FROM socialu.posts op
        JOIN socialu.students os ON os.student_id = op.author_id AND os.is_active
        LEFT JOIN socialu.student_profiles osp ON osp.student_id = os.student_id
        LEFT JOIN socialu.media_assets oam ON oam.asset_id = osp.photo_id
        WHERE op.post_id = p.repost_of_post_id
          AND (op.visibility = 'public' OR op.author_id = me OR socialu.are_friends(me, op.author_id))
          AND NOT socialu.is_blocked(me, op.author_id)
      ) ELSE NULL END AS repost_of,
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
      p.is_repost AS is_repost,
      CASE WHEN p.repost_of_post_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'post_id', op.post_id, 'author_id', op.author_id,
          'author_name', coalesce(osp.display_name, os.full_name), 'author_username', os.username,
          'author_photo_key', oam.storage_key, 'published_at', op.published_at, 'text_content', op.text_content,
          'photos', coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', opm.asset_id, 'storage_key', opm.storage_key))
                    FROM socialu.post_photos opp JOIN socialu.media_assets opm ON opm.asset_id = opp.asset_id
                    WHERE opp.post_id = op.post_id), '[]'::jsonb)
        )
        FROM socialu.posts op
        JOIN socialu.students os ON os.student_id = op.author_id AND os.is_active
        LEFT JOIN socialu.student_profiles osp ON osp.student_id = os.student_id
        LEFT JOIN socialu.media_assets oam ON oam.asset_id = osp.photo_id
        WHERE op.post_id = p.repost_of_post_id
          AND (op.visibility = 'public' OR op.author_id = me OR socialu.are_friends(me, op.author_id))
          AND NOT socialu.is_blocked(me, op.author_id)
      ) ELSE NULL END AS repost_of,
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
      p.is_repost AS is_repost,
      CASE WHEN p.repost_of_post_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'post_id', op.post_id, 'author_id', op.author_id,
          'author_name', coalesce(osp.display_name, os.full_name), 'author_username', os.username,
          'author_photo_key', oam.storage_key, 'published_at', op.published_at, 'text_content', op.text_content,
          'photos', coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', opm.asset_id, 'storage_key', opm.storage_key))
                    FROM socialu.post_photos opp JOIN socialu.media_assets opm ON opm.asset_id = opp.asset_id
                    WHERE opp.post_id = op.post_id), '[]'::jsonb)
        )
        FROM socialu.posts op
        JOIN socialu.students os ON os.student_id = op.author_id AND os.is_active
        LEFT JOIN socialu.student_profiles osp ON osp.student_id = os.student_id
        LEFT JOIN socialu.media_assets oam ON oam.asset_id = osp.photo_id
        WHERE op.post_id = p.repost_of_post_id
          AND (op.visibility = 'public' OR op.author_id = me OR socialu.are_friends(me, op.author_id))
          AND NOT socialu.is_blocked(me, op.author_id)
      ) ELSE NULL END AS repost_of,
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

CREATE OR REPLACE FUNCTION public.socialu_get_post(p_auth_id UUID, p_post_id BIGINT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT to_jsonb(feed) INTO result FROM (
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
      p.is_repost AS is_repost,
      CASE WHEN p.repost_of_post_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'post_id', op.post_id, 'author_id', op.author_id,
          'author_name', coalesce(osp.display_name, os.full_name), 'author_username', os.username,
          'author_photo_key', oam.storage_key, 'published_at', op.published_at, 'text_content', op.text_content,
          'photos', coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', opm.asset_id, 'storage_key', opm.storage_key))
                    FROM socialu.post_photos opp JOIN socialu.media_assets opm ON opm.asset_id = opp.asset_id
                    WHERE opp.post_id = op.post_id), '[]'::jsonb)
        )
        FROM socialu.posts op
        JOIN socialu.students os ON os.student_id = op.author_id AND os.is_active
        LEFT JOIN socialu.student_profiles osp ON osp.student_id = os.student_id
        LEFT JOIN socialu.media_assets oam ON oam.asset_id = osp.photo_id
        WHERE op.post_id = p.repost_of_post_id
          AND (op.visibility = 'public' OR op.author_id = me OR socialu.are_friends(me, op.author_id))
          AND NOT socialu.is_blocked(me, op.author_id)
      ) ELSE NULL END AS repost_of,
      (SELECT count(*) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS like_count,
      EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS is_liked_by_viewer,
      (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = p.post_id AND pc.deleted_at IS NULL) AS comment_count
    FROM socialu.posts p
    JOIN socialu.students s ON s.student_id = p.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE p.post_id = p_post_id AND s.is_active
      AND (p.visibility = 'public' OR p.author_id = me OR socialu.are_friends(me, p.author_id))
      AND NOT socialu.is_blocked(me, p.author_id)
  ) feed;

  IF result IS NULL THEN
    RAISE EXCEPTION 'This post isn''t available.' USING ERRCODE = 'P0002';
  END IF;

  RETURN result;
END;
$$;

-- socialu_notifications: add 'repost' items. Re-checks the recipient's
-- CURRENT authorization to view the REPOST itself (not the embedded
-- original -- the repost is a real post with its own author/visibility)
-- on every read, the same pattern mention items already use -- "ensure
-- the original author's notification doesn't expose a repost they cannot
-- access" is satisfied by this re-check, not by trusting creation-time
-- state.
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
  repost_items AS (
    SELECT n.notification_id, n.kind::TEXT AS kind, n.created_at, n.read_at,
      s.username AS actor_username, coalesce(sp.display_name, s.full_name) AS actor_name,
      am.storage_key AS actor_photo_key, NULL::TEXT AS request_status,
      n.post_id, NULL::BIGINT AS comment_id, p.visibility::TEXT AS visibility,
      1::BIGINT AS actor_count, jsonb_build_array(coalesce(sp.display_name, s.full_name)) AS actor_names,
      (n.read_at IS NULL) AS is_unread
    FROM socialu.notifications n
    -- The repost itself, not the original: p.author_id = n.actor_id here
    -- always (the reposter), so this re-check covers "am I still
    -- authorized to view the repost" independent of the original's own
    -- current accessibility.
    JOIN socialu.posts p ON p.post_id = n.post_id
      AND (p.visibility = 'public' OR p.author_id = me OR socialu.are_friends(me, p.author_id))
      AND NOT socialu.is_blocked(me, p.author_id)
    JOIN socialu.students s ON s.student_id = n.actor_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE n.recipient_id = me AND n.kind = 'repost' AND n.post_id IS NOT NULL
  ),
  all_items AS (
    SELECT * FROM friend_items
    UNION ALL SELECT * FROM like_items
    UNION ALL SELECT * FROM comment_items
    UNION ALL SELECT * FROM post_mention_items
    UNION ALL SELECT * FROM comment_mention_items
    UNION ALL SELECT * FROM repost_items
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
