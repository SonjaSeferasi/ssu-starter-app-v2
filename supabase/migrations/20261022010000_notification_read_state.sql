-- SocialU | Unread notification badge (SRS-313), owner LN.
-- Apply once after 20261022000000_friend_requests_notifications.sql.
-- The header bell shows unread notifications; opening the Notifications page marks them read.

ALTER TABLE socialu.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Same list as before; the badge count is now unread notifications instead of pending requests.
CREATE OR REPLACE FUNCTION public.socialu_notifications(p_auth_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; items JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT coalesce(jsonb_agg(to_jsonb(n) ORDER BY n.created_at DESC, n.notification_id DESC), '[]'::jsonb) INTO items
  FROM (
    SELECT n.notification_id, n.kind, n.created_at, n.read_at,
      s.username AS actor_username,
      coalesce(sp.display_name, s.full_name) AS actor_name,
      am.storage_key AS actor_photo_key,
      r.status AS request_status
    FROM socialu.notifications n
    JOIN socialu.students s ON s.student_id = n.actor_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    LEFT JOIN socialu.friend_requests r ON r.request_id = n.friend_request_id
    WHERE n.recipient_id = me AND n.kind IN ('friend_request', 'friendship_accepted')
      AND s.is_active AND NOT socialu.is_blocked(me, n.actor_id)
    ORDER BY n.created_at DESC, n.notification_id DESC
    LIMIT 50
  ) n;
  RETURN jsonb_build_object(
    'unread', (SELECT count(*) FROM socialu.notifications n
                JOIN socialu.students s ON s.student_id = n.actor_id
                WHERE n.recipient_id = me AND n.read_at IS NULL AND n.kind IN ('friend_request', 'friendship_accepted')
                  AND s.is_active AND NOT socialu.is_blocked(me, n.actor_id)),
    'notifications', items
  );
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_notifications(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_notifications(UUID) TO service_role;

-- Marks every notification for the caller as read (called when the Notifications page opens).
CREATE OR REPLACE FUNCTION public.socialu_mark_notifications_read(p_auth_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  UPDATE socialu.notifications SET read_at = CURRENT_TIMESTAMP WHERE recipient_id = me AND read_at IS NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_mark_notifications_read(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_mark_notifications_read(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
