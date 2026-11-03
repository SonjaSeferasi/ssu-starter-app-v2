-- SocialU | The Whisper Wall: a dedicated RPC for the Trending
-- Confessions sidebar. Additional functionality, not in the official SRS.
--
-- Deliberately a NEW function, not a change to socialu_whisper_list's
-- existing p_sort='trending' option -- that option is a separate,
-- unrelated feature (the main feed's own "Sort: Trending" pill, with its
-- own time-decayed formula, used for browsing the whole list) that this
-- request never asked to change. Touching it would also silently change
-- what "Sort: Trending" means for any student mid-session. This migration
-- adds no new table/column -- the sidebar's ranking rules are entirely
-- computable from the same whisper_confessions/whisper_reactions/
-- whisper_comments rows socialu_whisper_list already reads.
--
-- Score = (total active reactions x1) + (total visible comments x2),
-- ranked highest-first, tie-broken by comment count then reaction count
-- then newest. Confessions with zero engagement are excluded entirely
-- (never padded in) and the result is capped at 3 rows -- the empty-state
-- "No trending confessions yet" and "max 3, fewer if fewer qualify" rules
-- are enforced here, not left to the frontend to truncate/filter.
--
-- "Do not let a user artificially increase the score by repeatedly
-- changing their reaction": already structurally guaranteed by
-- whisper_reactions' own PRIMARY KEY (confession_id, student_id) +
-- UPSERT-replace semantics in socialu_whisper_react (see
-- 20261028000300) -- a student can only ever contribute one reaction row
-- per confession no matter how many times they change it, so a plain
-- count(*) here is already correct, nothing extra to enforce.
--
-- Moderated/removed confessions: already hard-deleted from
-- whisper_confessions by apply_whisper_report_threshold (20261028000100),
-- so they're structurally absent here too -- no separate "hidden" status
-- exists for confessions (only comments tombstone). Comments count only
-- those with deleted_at IS NULL, same as every other comment_count in
-- this codebase. Same-school scoping reuses socialu.same_school, the
-- exact function socialu_whisper_list already relies on. Return shape
-- never includes author_id/reporter_id, same discipline as every other
-- Whisper Wall RPC.
CREATE FUNCTION public.socialu_whisper_trending(p_auth_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'confession_id', top.confession_id, 'category', top.category, 'text_content', top.text_content,
      'created_at', top.created_at, 'is_own', top.author_id = me,
      'reaction_counts', jsonb_build_object(
        'like', (SELECT count(*) FROM socialu.whisper_reactions wr WHERE wr.confession_id = top.confession_id AND wr.reaction = 'like'),
        'love', (SELECT count(*) FROM socialu.whisper_reactions wr WHERE wr.confession_id = top.confession_id AND wr.reaction = 'love'),
        'haha', (SELECT count(*) FROM socialu.whisper_reactions wr WHERE wr.confession_id = top.confession_id AND wr.reaction = 'haha'),
        'wow', (SELECT count(*) FROM socialu.whisper_reactions wr WHERE wr.confession_id = top.confession_id AND wr.reaction = 'wow'),
        'sad', (SELECT count(*) FROM socialu.whisper_reactions wr WHERE wr.confession_id = top.confession_id AND wr.reaction = 'sad'),
        'care', (SELECT count(*) FROM socialu.whisper_reactions wr WHERE wr.confession_id = top.confession_id AND wr.reaction = 'care')
      ),
      'my_reaction', (SELECT reaction FROM socialu.whisper_reactions wr WHERE wr.confession_id = top.confession_id AND wr.student_id = me),
      'comment_count', top.comment_count
    ) ORDER BY top.score DESC, top.comment_count DESC, top.reaction_count DESC, top.created_at DESC), '[]'::jsonb)
  INTO result
  FROM (
    SELECT c.confession_id, c.category, c.text_content, c.created_at, c.author_id,
      counts.reaction_count, counts.comment_count, (counts.reaction_count + counts.comment_count * 2) AS score
    FROM socialu.whisper_confessions c
    CROSS JOIN LATERAL (
      SELECT
        (SELECT count(*) FROM socialu.whisper_reactions wr WHERE wr.confession_id = c.confession_id) AS reaction_count,
        (SELECT count(*) FROM socialu.whisper_comments wc WHERE wc.confession_id = c.confession_id AND wc.deleted_at IS NULL) AS comment_count
    ) counts
    WHERE socialu.same_school(me, c.author_id)
      AND counts.reaction_count + counts.comment_count > 0
    ORDER BY score DESC, counts.comment_count DESC, counts.reaction_count DESC, c.created_at DESC
    LIMIT 3
  ) top;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_whisper_trending(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_whisper_trending(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
