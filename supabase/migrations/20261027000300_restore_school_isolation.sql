-- SocialU | Fix: restore cross-school isolation lost by this session's
-- mentions/share_post/reposts migrations.
--
-- 20261026000100_school_communities.sql enforces that Campus/Friends feeds,
-- friendships, blocking, messaging, etc. only ever operate within a
-- student's own school. It does this by live-patching whatever function
-- source existed in the database AT THE MOMENT IT RAN (pg_get_functiondef +
-- text replace + re-EXECUTE), not by editing later migration files. Every
-- later migration this session (mentions.sql, share_post.sql, reposts.sql)
-- did plain `CREATE OR REPLACE FUNCTION` with hand-written SQL that had no
-- knowledge of that patch -- so each one silently overwrote the
-- school-isolation guard on every function it touched with a version that
-- doesn't have it. Confirmed against the live database: 10 of 11 affected
-- functions lost their guard (only socialu_delete_post, never redefined
-- after the patch ran, kept it).
--
-- This migration restores the guard explicitly and permanently in the SQL
-- source itself (rather than relying on the fragile live-patch trick again),
-- so it can never be silently lost by a future CREATE OR REPLACE the way it
-- was this time. socialu.require_school_post and socialu.same_school
-- already exist (created by school_communities.sql) and are reused as-is.
--
-- Severity notes per function:
--  - socialu_campus_feed / socialu_get_post: directly exploitable today --
--    any authenticated student can see another school's public posts in
--    Campus Feed, or via a direct /posts/:id link.
--  - socialu_create_post (repost branch): a student could repost a public
--    post from a different school, republishing its content into their own
--    school's feed without the original author's school ever authorizing it.
--  - socialu_create_comment / socialu_update_comment / socialu_list_comments
--    / socialu_update_post: exploitable only in combination with the above
--    (you need a reachable cross-school post_id first) -- fixed as
--    defense-in-depth, matching this codebase's existing belt-and-suspenders
--    style (e.g. is_blocked checked both directly and transitively elsewhere).
--  - socialu_friends_feed / socialu_profile_content: friends_feed is already
--    protected transitively (are_friends() itself was patched and was never
--    touched by this session's migrations, so it already enforces
--    same_school); socialu_profile_content's own cross-school reachability
--    is already blocked upstream by socialu_profile_target (also untouched
--    by this session, also still patched). Both get the explicit check
--    added anyway for defense-in-depth and to not depend on a reader
--    tracing through a second function to see why they're safe.
--  - socialu_notifications: the re-check CTEs that already re-verify
--    visibility on every read (post_mention_items, comment_mention_items,
--    repost_items) get same_school added too, so a notification created
--    during the vulnerable window can't still surface cross-school content.
--    (like_items/comment_items have no such re-check at all, school-related
--    or otherwise -- a pre-existing, separate gap, out of scope here.)
--  - socialu_delete_comment: a broader sweep (every public.socialu_* function
--    touching posts/comments/mentions/likes/reports/notifications, not just
--    the ones this session's migrations happened to redefine) found this one
--    also missing the guard -- it predates school_communities.sql but takes
--    p_comment_id, not the literal p_post_id the original blanket patch
--    matched on, so it was never covered even before this session. Low risk
--    in practice (you can only delete your own comment, which is already
--    same-school as you by construction), fixed anyway for consistency.
--    The same sweep confirmed socialu_friend_notification_event (only fires
--    on friend_requests rows, which a separate trigger already blocks from
--    ever being cross-school) and socialu_mark_notifications_read (only ever
--    touches the caller's own rows) need no changes, and that
--    socialu_profile_highlights / socialu_profile_view are already safe
--    transitively -- both resolve the target student via
--    socialu_profile_target first (untouched by this session, still
--    patched), and profile_highlights also re-checks each post via
--    socialu_profile_visible_post (likewise untouched, still patched).

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
          AND socialu.same_school(me, op.author_id)
      ) ELSE NULL END AS repost_of,
      (SELECT count(*) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS like_count,
      EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS is_liked_by_viewer,
      (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = p.post_id AND pc.deleted_at IS NULL) AS comment_count
    FROM socialu.posts p
    JOIN socialu.students s ON s.student_id = p.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE p.visibility = 'public' AND s.is_active AND NOT socialu.is_blocked(me,p.author_id)
      AND socialu.same_school(me, p.author_id)
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
          AND socialu.same_school(me, op.author_id)
      ) ELSE NULL END AS repost_of,
      (SELECT count(*) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS like_count,
      EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS is_liked_by_viewer,
      (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = p.post_id AND pc.deleted_at IS NULL) AS comment_count
    FROM socialu.posts p
    JOIN socialu.students s ON s.student_id = p.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE p.visibility = 'friends_only' AND (p.author_id = me OR socialu.are_friends(me, p.author_id))
      AND socialu.same_school(me, p.author_id)
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
          AND socialu.same_school(me, op.author_id)
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
      AND socialu.same_school(me, p.author_id)
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
          AND socialu.same_school(me, op.author_id)
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
      AND socialu.same_school(me, p.author_id)
  ) feed;

  IF result IS NULL THEN
    RAISE EXCEPTION 'This post isn''t available.' USING ERRCODE = 'P0002';
  END IF;

  RETURN result;
END;
$$;

-- socialu_create_post: the repost branch gains a same_school check against
-- the TRUE original's author (after flattening), raising the same generic
-- collapsed error every other authorization failure here already uses, so
-- "different school" is indistinguishable from "doesn't exist"/"blocked"
-- to the client, same as everywhere else in this codebase.
CREATE OR REPLACE FUNCTION public.socialu_create_post(
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
    effective_repost_of := coalesce(orig_chain, p_repost_of_post_id);
    IF orig_chain IS NOT NULL THEN
      SELECT author_id, visibility INTO orig_author, orig_vis FROM socialu.posts WHERE post_id = orig_chain;
      IF NOT FOUND THEN RAISE EXCEPTION 'This post isn''t available.' USING ERRCODE = 'P0002'; END IF;
    END IF;
    IF orig_vis = 'friends_only' AND orig_author <> me AND NOT socialu.are_friends(me, orig_author) THEN
      RAISE EXCEPTION 'This post isn''t available.' USING ERRCODE = 'P0002';
    END IF;
    IF socialu.is_blocked(me, orig_author) THEN
      RAISE EXCEPTION 'This post isn''t available.' USING ERRCODE = 'P0002';
    END IF;
    IF NOT socialu.same_school(me, orig_author) THEN
      RAISE EXCEPTION 'This post isn''t available.' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  IF p_visibility IS NULL OR p_visibility NOT IN ('public', 'friends_only') THEN
    RAISE EXCEPTION 'Choose a visibility option: Public or Friends Only.' USING ERRCODE = '22023';
  END IF;
  IF effective_repost_of IS NOT NULL AND orig_vis = 'friends_only' THEN
    p_visibility := 'friends_only';
  END IF;

  INSERT INTO socialu.posts (author_id, text_content, visibility, repost_of_post_id, is_repost)
  VALUES (me, clean_text, p_visibility, effective_repost_of, effective_repost_of IS NOT NULL) RETURNING * INTO new_post;
  SET CONSTRAINTS ALL IMMEDIATE;
  PERFORM socialu.sync_post_mentions(new_post.post_id, me, clean_text);

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
          AND socialu.same_school(me, op.author_id)
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

-- socialu_update_post / socialu_create_comment / socialu_update_comment /
-- socialu_list_comments: each gets a leading school-boundary check, same as
-- the blanket pattern school_communities.sql originally applied to every
-- p_auth_id+p_post_id function. socialu_update_comment doesn't take
-- p_post_id directly (only p_comment_id), so its check resolves the
-- comment's post_id first, before the guard.

CREATE OR REPLACE FUNCTION public.socialu_update_post(p_auth_id UUID, p_post_id BIGINT, p_text TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; clean_text TEXT; updated_post socialu.posts%ROWTYPE; result JSONB;
BEGIN
  PERFORM socialu.require_school_post(p_auth_id, p_post_id);
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
          AND socialu.same_school(me, op.author_id)
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

CREATE OR REPLACE FUNCTION public.socialu_list_comments(p_auth_id UUID, p_post_id BIGINT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; vis TEXT; result JSONB;
BEGIN
  PERFORM socialu.require_school_post(p_auth_id, p_post_id);
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
  PERFORM socialu.require_school_post(p_auth_id, p_post_id);
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
DECLARE me BIGINT; author BIGINT; tombstoned TIMESTAMPTZ; clean_text TEXT; target_post_id BIGINT;
  updated_comment socialu.post_comments%ROWTYPE; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_text IS NULL OR btrim(p_text) = '' THEN
    RAISE EXCEPTION 'Comment text is required.' USING ERRCODE = '22023';
  END IF;
  clean_text := btrim(p_text);
  SELECT author_id, deleted_at, post_id INTO author, tombstoned, target_post_id
  FROM socialu.post_comments WHERE comment_id = p_comment_id;
  IF NOT FOUND OR tombstoned IS NOT NULL THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
  PERFORM socialu.require_school_post(p_auth_id, target_post_id);
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

-- socialu_notifications: same_school added to the CTEs that already
-- re-verify visibility on every read (mentions, reposts), so a notification
-- created during the vulnerable window can't still surface cross-school
-- content. like_items/comment_items have no such re-check at all today,
-- school-related or otherwise -- a separate, pre-existing gap, unchanged
-- here and out of scope for this fix.
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
      AND socialu.same_school(me, p.author_id)
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
      AND socialu.same_school(me, p.author_id)
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
    JOIN socialu.posts p ON p.post_id = n.post_id
      AND (p.visibility = 'public' OR p.author_id = me OR socialu.are_friends(me, p.author_id))
      AND NOT socialu.is_blocked(me, p.author_id)
      AND socialu.same_school(me, p.author_id)
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

-- socialu.sync_post_mentions / socialu.sync_comment_mentions: these
-- postdate school_communities.sql entirely, so they never had a same_school
-- check at all (not a regression -- a gap in this session's own mentions
-- work, caught by the same audit). Without this, a student could @mention
-- someone from a different school and it would resolve, creating a
-- post_mentions/comment_mentions row and a notification for them. The
-- content itself was never actually reachable by that student (get_post/
-- campus_feed/notifications are all fixed above to require same_school), so
-- this was never a live content leak -- but the orphaned row and wasted
-- notification insert are still wrong, fixed here at the source, the same
-- way the existing friends_only check already gates mention validity.
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
    IF NOT same_school(target, owner) THEN CONTINUE; END IF;
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
    IF NOT same_school(target, owner) THEN CONTINUE; END IF;
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

-- socialu_delete_comment: found by the broader function sweep, not the
-- original 11 -- see the header comment above.
CREATE OR REPLACE FUNCTION public.socialu_delete_comment(p_auth_id UUID, p_comment_id BIGINT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; author BIGINT; tombstoned TIMESTAMPTZ; has_replies BOOLEAN; target_post_id BIGINT;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT author_id, deleted_at, post_id INTO author, tombstoned, target_post_id FROM socialu.post_comments WHERE comment_id = p_comment_id;
  IF NOT FOUND OR tombstoned IS NOT NULL THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
  PERFORM socialu.require_school_post(p_auth_id, target_post_id);
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
