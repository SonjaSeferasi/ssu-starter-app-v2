-- SocialU | Friend requests and friend notifications (SRS-114, SRS-116, SRS-313), owner LN.
-- Same access pattern as 20261013200000_srs_109_113_profile.sql: the Next.js server
-- calls these SECURITY DEFINER functions via service_role with the verified auth user id.
-- Apply once after 20261013200000_srs_109_113_profile.sql.
-- Also adds author_username to every feed-shaped row so a post author links to /students/<username>.

-- Feed rows gain author_username; otherwise unchanged from 20261008000200_feed_functions.sql.
CREATE OR REPLACE FUNCTION public.socialu_campus_feed(p_auth_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result JSONB;
BEGIN
  PERFORM public.socialu_require_student(p_auth_id);
  SELECT coalesce(jsonb_agg(to_jsonb(feed) ORDER BY feed.published_at DESC), '[]'::jsonb) INTO result
  FROM (
    SELECT p.post_id, p.author_id, p.text_content, p.visibility, p.published_at, p.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name,
      s.username AS author_username,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(pm.storage_key) FROM socialu.post_photos pp
                JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                WHERE pp.post_id = p.post_id), '[]'::jsonb) AS photo_keys
    FROM socialu.posts p
    JOIN socialu.students s ON s.student_id = p.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE p.visibility = 'public'
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
      coalesce(sp.display_name, s.full_name) AS author_name,
      s.username AS author_username,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(pm.storage_key) FROM socialu.post_photos pp
                JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                WHERE pp.post_id = p.post_id), '[]'::jsonb) AS photo_keys
    FROM socialu.posts p
    JOIN socialu.students s ON s.student_id = p.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE p.visibility = 'friends_only' AND socialu.are_friends(me, p.author_id)
  ) feed;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.socialu_create_post(p_auth_id UUID, p_text TEXT, p_visibility TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; new_post socialu.posts%ROWTYPE; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_text IS NULL OR btrim(p_text) = '' THEN
    RAISE EXCEPTION 'Post text is required.' USING ERRCODE = '22023';
  END IF;
  IF p_visibility NOT IN ('public', 'friends_only') THEN
    RAISE EXCEPTION 'Visibility must be "public" or "friends_only".' USING ERRCODE = '22023';
  END IF;
  INSERT INTO socialu.posts (author_id, text_content, visibility)
  VALUES (me, btrim(p_text), p_visibility) RETURNING * INTO new_post;
  SET CONSTRAINTS ALL IMMEDIATE;
  SELECT to_jsonb(feed) INTO result FROM (
    SELECT new_post.post_id, new_post.author_id, new_post.text_content, new_post.visibility,
      new_post.published_at, new_post.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name,
      s.username AS author_username,
      am.storage_key AS author_photo_key,
      '[]'::jsonb AS photo_keys
    FROM socialu.students s
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE s.student_id = me
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
      coalesce(sp.display_name, s.full_name) AS author_name,
      s.username AS author_username,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(pm.storage_key) FROM socialu.post_photos pp
                JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                WHERE pp.post_id = p.post_id), '[]'::jsonb) AS photo_keys
    FROM socialu.posts p
    JOIN socialu.students s ON s.student_id = p.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE CASE WHEN p_category = 'posts' THEN p.author_id = target
               ELSE EXISTS (SELECT 1 FROM socialu.post_tags t WHERE t.post_id = p.post_id AND t.student_id = target) END
      AND (p.author_id = me OR p.visibility = 'public' OR socialu.are_friends(me, p.author_id))
      AND (p.author_id = me OR NOT socialu.is_blocked(me, p.author_id))
  ) c;
  RETURN result;
END;
$$;

-- SRS-114, SRS-116: send, cancel, accept, decline a friend request, or unfriend.
-- Returns the target's refreshed profile so the page can redraw its buttons.
CREATE OR REPLACE FUNCTION public.socialu_friend_action(p_auth_id UUID, p_username TEXT, p_action TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me BIGINT;
  target BIGINT;
  r socialu.friend_requests%ROWTYPE;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_username IS NULL OR btrim(p_username) = '' THEN
    RAISE EXCEPTION 'Choose a student.' USING ERRCODE = '22023';
  END IF;
  target := public.socialu_profile_target(me, p_username);
  IF target = me THEN RAISE EXCEPTION 'You cannot add yourself as a friend.' USING ERRCODE = '22023'; END IF;

  -- The pending request or current friendship for this pair, if any (friend_requests_current_pair keeps it unique).
  SELECT * INTO r FROM socialu.friend_requests
   WHERE LEAST(sender_id, recipient_id) = LEAST(me, target) AND GREATEST(sender_id, recipient_id) = GREATEST(me, target)
     AND (status = 'pending' OR (status = 'accepted' AND friendship_ended_at IS NULL))
   FOR UPDATE;

  IF p_action = 'send' THEN
    IF FOUND AND r.status = 'accepted' THEN RAISE EXCEPTION 'You are already friends.' USING ERRCODE = '22023'; END IF;
    IF FOUND AND r.sender_id = me THEN RAISE EXCEPTION 'Your friend request is already pending.' USING ERRCODE = '22023'; END IF;
    IF FOUND THEN
      -- They already asked: sending back accepts their request.
      p_action := 'accept';
    ELSE
      INSERT INTO socialu.friend_requests (sender_id, recipient_id) VALUES (me, target) RETURNING * INTO r;
      INSERT INTO socialu.notifications (recipient_id, actor_id, kind, friend_request_id) VALUES (target, me, 'friend_request', r.request_id);
    END IF;
  END IF;

  IF p_action = 'accept' THEN
    IF NOT FOUND OR r.status <> 'pending' OR r.recipient_id <> me THEN
      RAISE EXCEPTION 'This friend request is no longer available.' USING ERRCODE = '22023';
    END IF;
    UPDATE socialu.friend_requests SET status = 'accepted', decided_at = CURRENT_TIMESTAMP WHERE request_id = r.request_id;
    INSERT INTO socialu.notifications (recipient_id, actor_id, kind, friend_request_id) VALUES (r.sender_id, me, 'friendship_accepted', r.request_id);
  ELSIF p_action IN ('cancel', 'decline') THEN
    IF NOT FOUND OR r.status <> 'pending' OR (p_action = 'cancel' AND r.sender_id <> me) OR (p_action = 'decline' AND r.recipient_id <> me) THEN
      RAISE EXCEPTION 'This friend request is no longer available.' USING ERRCODE = '22023';
    END IF;
    UPDATE socialu.friend_requests SET status = CASE WHEN p_action = 'cancel' THEN 'canceled' ELSE 'declined' END,
           decided_at = CURRENT_TIMESTAMP WHERE request_id = r.request_id;
    -- A request that was withdrawn or declined no longer needs a notice.
    DELETE FROM socialu.notifications WHERE friend_request_id = r.request_id AND kind = 'friend_request';
  ELSIF p_action = 'unfriend' THEN
    IF NOT FOUND OR r.status <> 'accepted' THEN RAISE EXCEPTION 'You are not friends.' USING ERRCODE = '22023'; END IF;
    UPDATE socialu.friend_requests SET friendship_ended_at = CURRENT_TIMESTAMP WHERE request_id = r.request_id;
  ELSIF p_action IS DISTINCT FROM 'send' THEN
    RAISE EXCEPTION 'Unknown friend action.' USING ERRCODE = '22023';
  END IF;

  RETURN public.socialu_profile_view(p_auth_id, p_username);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_friend_action(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_friend_action(UUID, TEXT, TEXT) TO service_role;

-- SRS-114.7, SRS-116.4, SRS-116.5: the caller's friend notifications, newest first.
-- pending_requests counts requests still awaiting the caller, for the header badge.
CREATE OR REPLACE FUNCTION public.socialu_notifications(p_auth_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; items JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT coalesce(jsonb_agg(to_jsonb(n) ORDER BY n.created_at DESC, n.notification_id DESC), '[]'::jsonb) INTO items
  FROM (
    SELECT n.notification_id, n.kind, n.created_at,
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
    'pending_requests', (SELECT count(*) FROM socialu.friend_requests r
                          JOIN socialu.students s ON s.student_id = r.sender_id
                          WHERE r.recipient_id = me AND r.status = 'pending' AND s.is_active),
    'notifications', items
  );
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_notifications(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_notifications(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
