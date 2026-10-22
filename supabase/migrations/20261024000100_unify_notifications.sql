-- SocialU | Unify the two notification systems built independently on the
-- shared `notifications` table (schema.sql already reviewed/designed it to
-- support both: "Supports: SRS-114.7, SRS-116.4, SRS-116.5, SRS-312.*,
-- SRS-313.*"). Main already has socialu_notifications (friend_request /
-- friendship_accepted, with read-state tracking and a /notifications page)
-- -- this migration is the one place that needed to change: it extends
-- that SAME function to also return post_like / post_comment /
-- comment_reply items (previously only available via this branch's
-- separate, now-retired socialu_list_notifications), rather than keeping
-- two competing notification surfaces. One function, one API route, one
-- page, one bell -- main's, extended.
--
-- Likes stay grouped with the existing 24-hour rolling window (unchanged
-- grouping logic from 20261020000100_like_notifications.sql); friend and
-- comment/reply items are ungrouped, same as before on both sides. A
-- grouped like item is "unread" if ANY underlying row in the group is
-- still unread, and counts as exactly one unread item (not one per row)
-- so the header badge matches what the dropdown/page actually displays.

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
    -- Most recently-liked actor's name/avatar represents the group, matching
    -- "Sarah, Adam and 3 others liked your post" (Sarah is actor_ids[1]).
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
  all_items AS (
    SELECT * FROM friend_items
    UNION ALL SELECT * FROM like_items
    UNION ALL SELECT * FROM comment_items
  )
  SELECT jsonb_build_object(
    'unread', (SELECT count(*) FROM all_items WHERE is_unread),
    'notifications', (SELECT coalesce(jsonb_agg((to_jsonb(ai) - 'is_unread') ORDER BY ai.created_at DESC), '[]'::jsonb)
                       FROM all_items ai)
  ) INTO result;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_notifications(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_notifications(UUID) TO service_role;

-- Superseded by the unified socialu_notifications above; nothing calls this anymore.
DROP FUNCTION IF EXISTS public.socialu_list_notifications(UUID);

NOTIFY pgrst, 'reload schema';
