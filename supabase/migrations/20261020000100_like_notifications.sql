-- SocialU | SRS-312.1-312.4: Like Notifications.
--
-- No notification infrastructure exists anywhere in the codebase yet (no
-- API route, no component, no trigger, no INSERT INTO notifications
-- anywhere) -- confirmed by a full repo search before writing this. This
-- is greenfield, not a duplicate of teammate work.
--
-- BACKLOG ITEM B-13 (documentation/SocialU_SRS_Editable.md, owned by MS):
-- "Define ... the like-notification grouping window" is an explicitly open
-- decision in the SRS, not a value specified elsewhere. Resolving it here:
-- a 24-hour rolling window per post. Consecutive post_like notifications
-- for the same post are considered part of the same group as long as no
-- gap between consecutive likes exceeds 24 hours -- a simple, common,
-- easily-explained choice (roughly "likes from today") given the SRS
-- leaves this open rather than mandating a specific value.
--
-- This upgrades socialu_like_post/socialu_unlike_post (already live) to
-- create/retract notifications, and adds socialu_list_notifications.
-- See 20261016000100_like_post.sql / 20261017000100_unlike_post.sql for the
-- updated source-of-truth bodies this mirrors -- this file is what
-- actually needs to run against the already-deployed database.

CREATE OR REPLACE FUNCTION public.socialu_like_post(p_auth_id UUID, p_post_id BIGINT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; vis TEXT; likes BIGINT; inserted_count INT;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT author_id, visibility INTO owner, vis FROM socialu.posts WHERE post_id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002'; END IF;
  IF vis = 'friends_only' AND owner <> me AND NOT socialu.are_friends(me, owner) THEN
    RAISE EXCEPTION 'You are not authorized to view this post.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO socialu.post_likes (post_id, student_id) VALUES (p_post_id, me)
  ON CONFLICT (post_id, student_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  -- SRS-312.1-312.3: notify the post author on a genuinely new like only --
  -- inserted_count is 0 when ON CONFLICT DO NOTHING skipped a duplicate
  -- like (SRS-308's existing idempotency), so a repeated Like request can
  -- never create a duplicate notification. Never notify on a self-like
  -- (not required by SRS-312.1, and not useful to the author). This lives
  -- in the same function/transaction as the like itself, so the two can
  -- never go out of sync with each other.
  IF inserted_count > 0 AND owner <> me THEN
    INSERT INTO socialu.notifications (recipient_id, actor_id, kind, post_id)
    VALUES (owner, me, 'post_like', p_post_id);
  END IF;

  SELECT count(*) INTO likes FROM socialu.post_likes WHERE post_id = p_post_id;
  RETURN jsonb_build_object('like_count', likes, 'is_liked_by_viewer', true);
END;
$$;

-- Policy for Like -> Unlike -> Like (SRS-312, item 9): a post_like
-- notification exists if and only if the underlying like is currently
-- active. Unliking deletes every post_like notification this actor has
-- generated for this post -- there can be more than one row if the student
-- liked/unliked/liked again before, and all of them are now stale claims
-- ("X liked your post") that are no longer true. Re-liking afterwards goes
-- through socialu_like_post's INSERT again, which creates a fresh
-- notification, since post_likes' row was actually removed, not just
-- flagged -- so SRS-308/309's idempotency contract is unaffected, and a
-- new like after an unlike is correctly treated as a new interaction.
CREATE OR REPLACE FUNCTION public.socialu_unlike_post(p_auth_id UUID, p_post_id BIGINT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; vis TEXT; likes BIGINT;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT author_id, visibility INTO owner, vis FROM socialu.posts WHERE post_id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002'; END IF;
  IF vis = 'friends_only' AND owner <> me AND NOT socialu.are_friends(me, owner) THEN
    RAISE EXCEPTION 'You are not authorized to view this post.' USING ERRCODE = '42501';
  END IF;

  DELETE FROM socialu.post_likes WHERE post_id = p_post_id AND student_id = me;
  DELETE FROM socialu.notifications
  WHERE recipient_id = owner AND actor_id = me AND kind = 'post_like' AND post_id = p_post_id;

  SELECT count(*) INTO likes FROM socialu.post_likes WHERE post_id = p_post_id;
  RETURN jsonb_build_object('like_count', likes, 'is_liked_by_viewer', false);
END;
$$;

-- SRS-312.1-312.4 -- list the caller's Like notifications, grouped per
-- post using the 24-hour window documented above (gaps-and-islands: a new
-- group starts whenever the gap since the previous like notification for
-- that same post exceeds 24 hours). Individual notification rows are never
-- merged or deleted by this query -- they stay exactly as
-- socialu_like_post/socialu_unlike_post wrote them; grouping only happens
-- at read time, so the underlying history is fully preserved (item 11).
-- actor_names is ordered most-recent-first for "Sarah, Adam and 3 others"
-- style rendering. visibility is included so the client can route to the
-- correct feed tab -- the recipient is always the post's own author, so
-- they can always see it regardless of Public/Friends Only, the same way
-- their own posts already appear in both of their own feed views.
-- notifications.post_id cascades on post delete (schema.sql), so a
-- notification for a deleted post simply no longer exists here -- nothing
-- extra needed to keep navigation from ever reaching deleted content.
-- Extended by 20261022000100_comment_notifications.sql to also include
-- ungrouped post_comment/comment_reply notifications (SRS-313 has no
-- grouping requirement, unlike SRS-312.4's explicit one).
CREATE OR REPLACE FUNCTION public.socialu_list_notifications(p_auth_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);

  WITH likes AS (
    SELECT n.notification_id, n.post_id, n.actor_id, n.created_at,
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
      max(created_at) AS latest_at,
      count(*) AS actor_count,
      array_agg(actor_id ORDER BY created_at DESC) AS actor_ids
    FROM grouped
    GROUP BY post_id, group_id
  ),
  like_items AS (
    SELECT 'post_like'::TEXT AS kind, g.post_id, NULL::BIGINT AS comment_id, g.latest_at, g.actor_count,
      p.visibility,
      (SELECT jsonb_agg(coalesce(sp.display_name, s.full_name) ORDER BY ord.ord)
       FROM unnest(g.actor_ids) WITH ORDINALITY AS ord(actor_id, ord)
       JOIN socialu.students s ON s.student_id = ord.actor_id
       LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
      ) AS actor_names
    FROM like_groups g
    JOIN socialu.posts p ON p.post_id = g.post_id
  ),
  comment_items AS (
    SELECT n.kind, pc.post_id, n.comment_id, n.created_at AS latest_at, 1 AS actor_count,
      p.visibility,
      jsonb_build_array(coalesce(sp.display_name, s.full_name)) AS actor_names
    FROM socialu.notifications n
    JOIN socialu.post_comments pc ON pc.comment_id = n.comment_id
    JOIN socialu.posts p ON p.post_id = pc.post_id
    JOIN socialu.students s ON s.student_id = n.actor_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    WHERE n.recipient_id = me AND n.kind IN ('post_comment', 'comment_reply')
  )
  SELECT coalesce(jsonb_agg(to_jsonb(all_items) ORDER BY all_items.latest_at DESC), '[]'::jsonb) INTO result
  FROM (
    SELECT * FROM like_items
    UNION ALL
    SELECT * FROM comment_items
  ) all_items;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_list_notifications(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_list_notifications(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
