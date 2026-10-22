-- SocialU | Friends, followers and following lists on a profile (SRS-111.4, SRS-113.9), owner LN.
-- Apply once after 20261022040000_profile_friends_request_status.sql and 20261015180000_profile_social.sql.
-- p_list is 'friends', 'followers' or 'following'. Each row has the viewer's own friend status toward that
-- student, matching socialu_profile_friends. Followers/following use the same filters as the counts in
-- socialu_profile_social, so a list always matches the number shown on the profile.

CREATE OR REPLACE FUNCTION public.socialu_profile_people(p_auth_id UUID, p_username TEXT DEFAULT NULL, p_list TEXT DEFAULT 'friends') RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; target BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  target := public.socialu_profile_target(me, p_username);
  IF p_list IS NULL OR p_list NOT IN ('friends', 'followers', 'following') THEN
    RAISE EXCEPTION 'Choose friends, followers, or following.' USING ERRCODE = '22023';
  END IF;

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
    FROM socialu.students s
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE s.is_active
      AND (s.student_id = me OR NOT socialu.is_blocked(me, s.student_id))
      AND CASE p_list
        WHEN 'friends' THEN EXISTS (SELECT 1 FROM socialu.current_friendships cf
          WHERE (cf.student_low = target AND cf.student_high = s.student_id) OR (cf.student_high = target AND cf.student_low = s.student_id))
        WHEN 'followers' THEN EXISTS (SELECT 1 FROM socialu.student_follows fo WHERE fo.followed_id = target AND fo.follower_id = s.student_id)
          AND NOT socialu.is_blocked(target, s.student_id)
        ELSE EXISTS (SELECT 1 FROM socialu.student_follows fo WHERE fo.follower_id = target AND fo.followed_id = s.student_id)
          AND NOT socialu.is_blocked(target, s.student_id)
      END
  ) f;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_profile_people(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_profile_people(UUID, TEXT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
