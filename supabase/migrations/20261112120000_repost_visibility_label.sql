-- #1180 (SRS: Reposting, additional functionality): a repost's embedded
-- original was labelled with the REPOST's own visibility, not the original
-- post's. PostCard.tsx:179 passes post.visibility (the repost) into the
-- embedded PostAuthor because RepostOf never carried the original's
-- visibility at all -- there was nothing else it could pass. This migration
-- replaces the six read/write RPCs that build a repost_of payload
-- (socialu_campus_feed, socialu_friends_feed, socialu_profile_content,
-- socialu_get_post, socialu_create_post, socialu_update_post) so each one
-- also returns the original post's own visibility. Everything else about
-- these functions, including every other field, access check, and grant,
-- is unchanged -- this is a full CREATE OR REPLACE copy of each function
-- from 20261028000300_global_reaction_system.sql (the latest prior
-- definition of all six) with one JSON key added to the repost_of object.

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
          'author_photo_key', oam.storage_key, 'visibility', op.visibility, 'published_at', op.published_at, 'text_content', op.text_content,
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
      (SELECT jsonb_build_object(
        'like', count(*) FILTER (WHERE reaction = 'like'), 'love', count(*) FILTER (WHERE reaction = 'love'),
        'haha', count(*) FILTER (WHERE reaction = 'haha'), 'wow', count(*) FILTER (WHERE reaction = 'wow'),
        'sad', count(*) FILTER (WHERE reaction = 'sad'), 'care', count(*) FILTER (WHERE reaction = 'care')
      ) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS reaction_counts,
      (SELECT reaction FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS my_reaction,
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
          'author_photo_key', oam.storage_key, 'visibility', op.visibility, 'published_at', op.published_at, 'text_content', op.text_content,
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
      (SELECT jsonb_build_object(
        'like', count(*) FILTER (WHERE reaction = 'like'), 'love', count(*) FILTER (WHERE reaction = 'love'),
        'haha', count(*) FILTER (WHERE reaction = 'haha'), 'wow', count(*) FILTER (WHERE reaction = 'wow'),
        'sad', count(*) FILTER (WHERE reaction = 'sad'), 'care', count(*) FILTER (WHERE reaction = 'care')
      ) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS reaction_counts,
      (SELECT reaction FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS my_reaction,
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
          'author_photo_key', oam.storage_key, 'visibility', op.visibility, 'published_at', op.published_at, 'text_content', op.text_content,
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
      (SELECT jsonb_build_object(
        'like', count(*) FILTER (WHERE reaction = 'like'), 'love', count(*) FILTER (WHERE reaction = 'love'),
        'haha', count(*) FILTER (WHERE reaction = 'haha'), 'wow', count(*) FILTER (WHERE reaction = 'wow'),
        'sad', count(*) FILTER (WHERE reaction = 'sad'), 'care', count(*) FILTER (WHERE reaction = 'care')
      ) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS reaction_counts,
      (SELECT reaction FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS my_reaction,
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
          'author_photo_key', oam.storage_key, 'visibility', op.visibility, 'published_at', op.published_at, 'text_content', op.text_content,
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
      (SELECT jsonb_build_object(
        'like', count(*) FILTER (WHERE reaction = 'like'), 'love', count(*) FILTER (WHERE reaction = 'love'),
        'haha', count(*) FILTER (WHERE reaction = 'haha'), 'wow', count(*) FILTER (WHERE reaction = 'wow'),
        'sad', count(*) FILTER (WHERE reaction = 'sad'), 'care', count(*) FILTER (WHERE reaction = 'care')
      ) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS reaction_counts,
      (SELECT reaction FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS my_reaction,
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
          'author_photo_key', oam.storage_key, 'visibility', op.visibility, 'published_at', op.published_at, 'text_content', op.text_content,
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
      jsonb_build_object('like',0,'love',0,'haha',0,'wow',0,'sad',0,'care',0) AS reaction_counts,
      NULL::TEXT AS my_reaction,
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
          'author_photo_key', oam.storage_key, 'visibility', op.visibility, 'published_at', op.published_at, 'text_content', op.text_content,
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
      (SELECT jsonb_build_object(
        'like', count(*) FILTER (WHERE reaction = 'like'), 'love', count(*) FILTER (WHERE reaction = 'love'),
        'haha', count(*) FILTER (WHERE reaction = 'haha'), 'wow', count(*) FILTER (WHERE reaction = 'wow'),
        'sad', count(*) FILTER (WHERE reaction = 'sad'), 'care', count(*) FILTER (WHERE reaction = 'care')
      ) FROM socialu.post_likes pl WHERE pl.post_id = updated_post.post_id) AS reaction_counts,
      (SELECT reaction FROM socialu.post_likes pl WHERE pl.post_id = updated_post.post_id AND pl.student_id = me) AS my_reaction,
      (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = updated_post.post_id AND pc.deleted_at IS NULL) AS comment_count
    FROM socialu.students s
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE s.student_id = me
  ) feed;
  RETURN result;
END;
$$;
