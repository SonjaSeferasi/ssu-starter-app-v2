-- UR-405: Trending ranks Campus Feed posts by their recent likes.
-- SRS-405.1 only published Campus Feed posts the signed-in student can see (public, active author, same school,
--           no block either way) -- the same rules as socialu_campus_feed.
-- SRS-405.2 a post's count is its currently active likes (one per student, any reaction, see post_likes)
--           whose latest like time is within [T - 168 hours, T], inclusive.
-- SRS-405.3 most recent likes first, then newest publication, then lowest post ID.
-- SRS-405.4 posts with no qualifying likes are left out.
-- SRS-405.5 each entry carries the author, a text or photo preview and the recent-like count.
-- SRS-405.8 T is the moment of the request: every call recalculates from the recorded posts and likes.
-- Like the socialu.trending_candidates view (SRS-405.1-405.8, schema.sql), plus the per-student access rules
-- that view leaves to the server. Additive: one server-only function. Apply once after
-- 20261113140000_event_update.sql. Safe to re-run.

CREATE OR REPLACE FUNCTION public.socialu_trending_posts(p_auth_id UUID, p_limit INTEGER DEFAULT 10) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me BIGINT;
  at TIMESTAMPTZ := now();
  result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'Choose between 1 and 50 trending posts.' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(t) - 'sort_published_at' ORDER BY t.recent_like_count DESC, t.sort_published_at DESC, t.post_id ASC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT p.post_id, p.author_id, coalesce(sp.display_name, s.full_name) AS author_name, s.username AS author_username,
      am.storage_key AS author_photo_key, p.published_at, p.published_at AS sort_published_at, p.is_repost,
      -- A repost with nothing of its own is previewed by the post it shares, when the student may see that post.
      coalesce(nullif(btrim(p.text_content), ''), original.text_content) AS text_content,
      coalesce((SELECT pm.storage_key FROM socialu.post_photos pp JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                WHERE pp.post_id = p.post_id ORDER BY pp.asset_id LIMIT 1), original.photo_key) AS photo_key,
      likes.recent_like_count
    FROM socialu.posts p
    JOIN socialu.students s ON s.student_id = p.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    CROSS JOIN LATERAL (
      SELECT count(*) AS recent_like_count FROM socialu.post_likes l
      WHERE l.post_id = p.post_id AND l.liked_at BETWEEN at - INTERVAL '168 hours' AND at
    ) likes
    LEFT JOIN LATERAL (
      SELECT nullif(btrim(op.text_content), '') AS text_content,
        (SELECT opm.storage_key FROM socialu.post_photos opp JOIN socialu.media_assets opm ON opm.asset_id = opp.asset_id
         WHERE opp.post_id = op.post_id ORDER BY opp.asset_id LIMIT 1) AS photo_key
      FROM socialu.posts op
      JOIN socialu.students os ON os.student_id = op.author_id AND os.is_active
      WHERE op.post_id = p.repost_of_post_id
        AND (op.visibility = 'public' OR op.author_id = me OR socialu.are_friends(me, op.author_id))
        AND NOT socialu.is_blocked(me, op.author_id)
        AND socialu.same_school(me, op.author_id)
    ) original ON TRUE
    WHERE p.visibility = 'public' AND s.is_active AND NOT socialu.is_blocked(me, p.author_id)
      AND socialu.same_school(me, p.author_id)
      AND p.published_at <= at
      AND likes.recent_like_count > 0
    ORDER BY likes.recent_like_count DESC, p.published_at DESC, p.post_id ASC
    LIMIT p_limit
  ) t;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_trending_posts(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_trending_posts(UUID, INTEGER) TO service_role;

NOTIFY pgrst, 'reload schema';
