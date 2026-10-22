-- SocialU | SRS-313.1-313.3: Comment Notifications.
--
-- SRS-313's official text ("create a notification for a POST AUTHOR when
-- another student successfully submits a comment on that author's post")
-- covers top-level comments AND replies identically -- a reply is still
-- "a comment... submitted on that author's post". This migration adds
-- that notification inside socialu_create_comment (SRS-312's same
-- same-transaction pattern), notifying the post's author every time.
--
-- Reply notifications ("Adam replied to your comment") are NOT numbered in
-- SRS-313 -- the SRS text only ever mentions the post author, never a
-- parent comment's author -- so this is additional functionality, built
-- alongside but kept logically distinguishable (its own `kind`). Since
-- replies flatten to one level in storage (parent_comment_id always points
-- at the top-level comment, never another reply), using the STORED parent
-- to decide who gets the reply notification would be wrong for a reply to
-- a reply -- it would notify the top-level comment's author instead of the
-- person actually being replied to. This uses p_parent_comment_id's own
-- author (resolved BEFORE flattening) instead, which is always correct.
--
-- DEDUP RULE: when the comment being replied to was written by the post's
-- own author, that's ONE person, not two recipients -- they get only the
-- more specific comment_reply notification, not also a post_comment for
-- the same event. post_comment only fires when the post author is a
-- DIFFERENT person from whoever was actually replied to (including the
-- ordinary case of a top-level comment, which has no reply target at
-- all). Self-actions never notify anyone, same as before.

-- kind and the shape CHECK are both unnamed in schema.sql
-- (20260929164656_create_socialu.sql), so their names are whatever
-- Postgres auto-generated -- looked up here rather than guessed, then
-- replaced with explicitly-named constraints so future migrations don't
-- have this problem again.
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
    CHECK (kind IN ('friend_request','friendship_accepted','post_like','post_comment','comment_reply')),
  ADD CONSTRAINT notifications_shape_check
    CHECK ((kind IN ('friend_request','friendship_accepted') AND friend_request_id IS NOT NULL AND post_id IS NULL AND comment_id IS NULL)
        OR (kind = 'post_like' AND post_id IS NOT NULL AND friend_request_id IS NULL AND comment_id IS NULL)
        OR (kind IN ('post_comment','comment_reply') AND comment_id IS NOT NULL AND post_id IS NULL AND friend_request_id IS NULL));

-- Upgrades socialu_create_comment (already live, 4-arg signature from
-- 20261021000100_comment_replies.sql) to create these notifications in the
-- same transaction as the comment itself, and socialu_list_notifications
-- to include them alongside the existing grouped Like notifications. See
-- 20261018000100_post_comments.sql / 20261021000100_comment_replies.sql /
-- 20261020000100_like_notifications.sql for the updated source-of-truth
-- bodies this mirrors -- this file is what actually needs to run against
-- the already-deployed database.

CREATE OR REPLACE FUNCTION public.socialu_create_comment(
  p_auth_id UUID, p_post_id BIGINT, p_text TEXT, p_parent_comment_id BIGINT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; vis TEXT; target_post BIGINT; target_parent BIGINT; target_author BIGINT;
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
    SELECT post_id, parent_comment_id, author_id INTO target_post, target_parent, target_author
    FROM socialu.post_comments WHERE comment_id = p_parent_comment_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
    IF target_post <> p_post_id THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
    actual_parent := coalesce(target_parent, p_parent_comment_id);
  END IF;

  INSERT INTO socialu.post_comments (post_id, author_id, text_content, parent_comment_id)
  VALUES (p_post_id, me, btrim(p_text), actual_parent) RETURNING * INTO new_comment;

  -- SRS-313.1-313.3 + reply notifications (additional, not SRS-313-numbered),
  -- deduplicated: a reply notifies whoever was actually replied to
  -- (target_author, resolved from p_parent_comment_id BEFORE flattening --
  -- never the flattened actual_parent's author, which would be wrong for a
  -- reply to a reply). The post author ALSO gets a post_comment
  -- notification, but only when they're a different person from the reply
  -- target -- otherwise that's the same person getting notified twice for
  -- one event, so only the more specific comment_reply fires. A top-level
  -- comment (p_parent_comment_id IS NULL) has no reply target at all, so
  -- this always reduces to the plain post_comment case. Self-actions never
  -- notify anyone, in either branch.
  IF p_parent_comment_id IS NOT NULL AND target_author <> me THEN
    INSERT INTO socialu.notifications (recipient_id, actor_id, kind, comment_id)
    VALUES (target_author, me, 'comment_reply', new_comment.comment_id);
  END IF;
  IF owner <> me AND (p_parent_comment_id IS NULL OR owner <> target_author) THEN
    INSERT INTO socialu.notifications (recipient_id, actor_id, kind, comment_id)
    VALUES (owner, me, 'post_comment', new_comment.comment_id);
  END IF;

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

-- Extends socialu_list_notifications (20261020000100_like_notifications.sql)
-- with ungrouped post_comment/comment_reply notifications -- SRS-313 has no
-- grouping requirement (unlike SRS-312.4's explicit one), so each comment/
-- reply notification is its own entry. comment_id lets the client navigate
-- to and highlight the exact comment or reply; post_id/visibility are
-- resolved via the comment's own post the same way SRS-312's like grouping
-- already resolves them. A notification whose comment_id no longer exists
-- (hard-deleted, no replies) is already gone via ON DELETE CASCADE -- the
-- JOIN to post_comments here just naturally excludes it, same reasoning as
-- SRS-312's "deleted posts can't produce broken navigation." A tombstoned
-- comment's notification still resolves fine -- the comment_id row still
-- exists, it just renders as "[deleted]" client-side, same as the feed
-- already does.
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

NOTIFY pgrst, 'reload schema';
