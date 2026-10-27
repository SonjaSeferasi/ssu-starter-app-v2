-- SocialU | Share: a direct, shareable link to a single post (/posts/:id).
-- Additional functionality, not in the official SRS.
--
-- No new table -- socialu_get_post reuses the exact same post shape
-- socialu_campus_feed/socialu_friends_feed/socialu_create_post already
-- build (including the `mentions` subquery from
-- 20261026000400_mentions.sql, which this migration depends on and must
-- run after -- its filename timestamp already sorts correctly for that).
--
-- Authorization is the same rule used everywhere else: public -> any
-- authenticated, active, unblocked student; friends_only -> the author or
-- a current accepted friend. "Doesn't exist", "deleted", "not authorized",
-- and "blocked" are all deliberately collapsed into the SAME generic
-- error -- directly modeled on socialu_profile_target
-- (20261013200000_srs_109_113_profile.sql), which already does exactly
-- this for profile visibility, so a shared link can never be used to
-- distinguish "this post doesn't exist" from "this post exists but you
-- can't see it" (that distinction alone would leak which friends_only
-- post IDs are real to someone probing links).

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
REVOKE ALL ON FUNCTION public.socialu_get_post(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_get_post(UUID, BIGINT) TO service_role;

NOTIFY pgrst, 'reload schema';
