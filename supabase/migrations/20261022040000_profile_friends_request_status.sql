-- SocialU | Friend request status in a profile's friends list (SRS-113.16-113.18), owner LN.
-- Apply once after 20261022030000_profile_friends_list.sql.
-- Adds friend_request ('sent' | 'received' | null) for each listed student, seen from the viewer,
-- so the list can show Add Friend, Requested, or Accept/Decline next to each name.

CREATE OR REPLACE FUNCTION public.socialu_profile_friends(p_auth_id UUID, p_username TEXT DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; target BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  target := public.socialu_profile_target(me, p_username);
  SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY lower(f.name), f.username), '[]'::jsonb) INTO result
  FROM (
    SELECT s.username,
      coalesce(sp.display_name, s.full_name) AS name,
      am.storage_key AS photo_key,
      s.student_id = me AS is_me,
      s.student_id <> me AND socialu.are_friends(me, s.student_id) AS is_friend,
      (SELECT CASE WHEN r.sender_id = me THEN 'sent' ELSE 'received' END FROM socialu.friend_requests r
        WHERE r.status = 'pending' AND ((r.sender_id = me AND r.recipient_id = s.student_id)
           OR (r.sender_id = s.student_id AND r.recipient_id = me)) LIMIT 1) AS friend_request
    FROM socialu.current_friendships cf
    JOIN socialu.students s ON s.student_id = CASE WHEN cf.student_low = target THEN cf.student_high ELSE cf.student_low END
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE target IN (cf.student_low, cf.student_high)
      AND s.is_active
      AND (s.student_id = me OR NOT socialu.is_blocked(me, s.student_id))
  ) f;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_profile_friends(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_profile_friends(UUID, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
