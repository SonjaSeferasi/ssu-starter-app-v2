-- #1208 (The Whisper Wall -- sorting, additional functionality): two bugs
-- in socialu_whisper_list (previously defined in
-- 20261103000100_whisper_professor_tea.sql):
--
-- 1. No tiebreaker. Rows with an identical sort_key (e.g. the common case
--    of several zero-comment confessions under Most Discussed) had no
--    secondary ordering, so their relative order was whatever the planner
--    happened to return and could change between loads -- and once
--    pagination exists (p_offset is already accepted here), an unstable
--    order can repeat or skip a confession across pages.
--
-- 2. `to_jsonb(ranked)` serializes every column of the ranking subquery,
--    including the internal `sort_key` (for p_sort='trending', the raw
--    time-decayed ranking score), into the API response. Nothing reads
--    it today, but it's an internal implementation detail leaking into a
--    response that doesn't need it.
--
-- Fix: add a stable tiebreaker (created_at, then confession_id) to both
-- the inner subquery's ORDER BY (what LIMIT/OFFSET actually page over)
-- and the outer aggregation's ORDER BY, and build the JSON object
-- explicitly instead of to_jsonb(ranked) -- matching the discipline
-- socialu_whisper_trending (20261103000200) already uses. Every other
-- field, check, and grant is unchanged; this is a full CREATE OR REPLACE
-- copy of the function from 20261103000100_whisper_professor_tea.sql.

CREATE OR REPLACE FUNCTION public.socialu_whisper_list(p_auth_id UUID, p_category TEXT DEFAULT NULL, p_sort TEXT DEFAULT 'latest', p_offset INTEGER DEFAULT 0) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_category IS NOT NULL AND p_category NOT IN ('funny','campus_crush','embarrassing','rant','advice','unpopular_opinion','professor_tea') THEN
    RAISE EXCEPTION 'Choose a valid category.' USING ERRCODE = '22023';
  END IF;
  IF p_sort NOT IN ('latest','trending','most_discussed') THEN
    RAISE EXCEPTION 'Choose a valid sort.' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'confession_id', ranked.confession_id, 'category', ranked.category, 'text_content', ranked.text_content,
      'created_at', ranked.created_at, 'is_own', ranked.is_own,
      'reaction_counts', ranked.reaction_counts, 'my_reaction', ranked.my_reaction, 'comment_count', ranked.comment_count
    ) ORDER BY ranked.sort_key DESC, ranked.created_at DESC, ranked.confession_id DESC), '[]'::jsonb) INTO result FROM (
    SELECT c.confession_id, c.category, c.text_content, c.created_at,
      c.author_id = me AS is_own,
      (SELECT jsonb_build_object(
        'like', count(*) FILTER (WHERE reaction = 'like'), 'love', count(*) FILTER (WHERE reaction = 'love'),
        'haha', count(*) FILTER (WHERE reaction = 'haha'), 'wow', count(*) FILTER (WHERE reaction = 'wow'),
        'sad', count(*) FILTER (WHERE reaction = 'sad'), 'care', count(*) FILTER (WHERE reaction = 'care')
      ) FROM socialu.whisper_reactions wr WHERE wr.confession_id = c.confession_id) AS reaction_counts,
      (SELECT reaction FROM socialu.whisper_reactions wr WHERE wr.confession_id = c.confession_id AND wr.student_id = me) AS my_reaction,
      (SELECT count(*) FROM socialu.whisper_comments wc WHERE wc.confession_id = c.confession_id AND wc.deleted_at IS NULL) AS comment_count,
      (CASE p_sort
        WHEN 'trending' THEN
          ((SELECT count(*) FROM socialu.whisper_reactions wr WHERE wr.confession_id = c.confession_id) * 2
           + (SELECT count(*) FROM socialu.whisper_comments wc WHERE wc.confession_id = c.confession_id AND wc.deleted_at IS NULL))::DOUBLE PRECISION
          - extract(epoch FROM (CURRENT_TIMESTAMP - c.created_at)) / 3600 * 0.5
        WHEN 'most_discussed' THEN
          (SELECT count(*) FROM socialu.whisper_comments wc WHERE wc.confession_id = c.confession_id AND wc.deleted_at IS NULL)::DOUBLE PRECISION
        ELSE extract(epoch FROM c.created_at)
      END) AS sort_key
    FROM socialu.whisper_confessions c
    WHERE socialu.same_school(me, c.author_id)
      AND (p_category IS NULL OR c.category = p_category)
    ORDER BY sort_key DESC, c.created_at DESC, c.confession_id DESC
    LIMIT 20 OFFSET p_offset
  ) ranked;

  RETURN result;
END;
$$;
