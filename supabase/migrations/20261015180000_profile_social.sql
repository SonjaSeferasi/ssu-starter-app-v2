-- Profile collections and following. Additive; never resets existing student data.
CREATE TABLE socialu.student_follows (
  follower_id BIGINT NOT NULL REFERENCES socialu.students(student_id) ON DELETE CASCADE,
  followed_id BIGINT NOT NULL REFERENCES socialu.students(student_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id), CHECK (follower_id <> followed_id)
);
CREATE INDEX student_follows_target ON socialu.student_follows(followed_id);
CREATE TABLE socialu.saved_posts (
  student_id BIGINT NOT NULL REFERENCES socialu.students(student_id) ON DELETE CASCADE,
  post_id BIGINT NOT NULL REFERENCES socialu.posts(post_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(student_id, post_id)
);
ALTER TABLE socialu.student_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE socialu.saved_posts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON socialu.student_follows, socialu.saved_posts FROM anon, authenticated;

-- Following never grants friends-only post access. Recheck visibility on every read.
CREATE FUNCTION public.socialu_profile_visible_post(p_me BIGINT, p_post BIGINT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM socialu.posts p JOIN socialu.students s ON s.student_id = p.author_id
    WHERE p.post_id = p_post AND s.is_active
      AND (p.author_id = p_me OR NOT socialu.is_blocked(p_me, p.author_id))
      AND (p.author_id = p_me OR p.visibility = 'public' OR socialu.are_friends(p_me, p.author_id)));
$$;
REVOKE ALL ON FUNCTION public.socialu_profile_visible_post(BIGINT, BIGINT) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.socialu_profile_social(
  p_auth_id UUID, p_action TEXT, p_username TEXT DEFAULT NULL,
  p_post_id BIGINT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; target BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  target := public.socialu_profile_target(me, p_username);
  IF p_action IN ('follow', 'unfollow') THEN
    IF target = me THEN RAISE EXCEPTION 'You cannot follow yourself.' USING ERRCODE = '22023'; END IF;
    IF p_action = 'follow' THEN
      INSERT INTO socialu.student_follows VALUES (me, target, now()) ON CONFLICT DO NOTHING;
    ELSE DELETE FROM socialu.student_follows WHERE follower_id = me AND followed_id = target;
    END IF;
  ELSIF p_action IN ('save', 'unsave', 'save_status') THEN
    IF p_action = 'unsave' THEN
      DELETE FROM socialu.saved_posts WHERE student_id = me AND post_id = p_post_id;
    ELSE
      IF NOT public.socialu_profile_visible_post(me, p_post_id) THEN
        RAISE EXCEPTION 'This post is not available.' USING ERRCODE = 'P0002';
      END IF;
      IF p_action = 'save' THEN
        INSERT INTO socialu.saved_posts VALUES (me, p_post_id, now()) ON CONFLICT DO NOTHING;
      END IF;
    END IF;
    RETURN jsonb_build_object('saved', EXISTS(SELECT 1 FROM socialu.saved_posts WHERE student_id = me AND post_id = p_post_id));
  ELSIF p_action = 'saved' THEN
    IF target <> me THEN RAISE EXCEPTION 'Saved posts are private.' USING ERRCODE = '42501'; END IF;
    SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.published_at DESC), '[]'::jsonb) INTO result FROM (
      SELECT p.post_id, p.author_id, p.text_content, p.visibility, p.published_at, p.edited_at,
        coalesce(sp.display_name, s.full_name) AS author_name, am.storage_key AS author_photo_key,
        coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', m.asset_id, 'storage_key', m.storage_key) ORDER BY m.asset_id)
          FROM socialu.post_photos pp JOIN socialu.media_assets m ON m.asset_id = pp.asset_id WHERE pp.post_id = p.post_id), '[]'::jsonb) AS photos
      FROM socialu.posts p JOIN socialu.students s ON s.student_id = p.author_id
      LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
      LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
      WHERE public.socialu_profile_visible_post(me, p.post_id) AND
        EXISTS(SELECT 1 FROM socialu.saved_posts x WHERE x.student_id = me AND x.post_id = p.post_id)
    ) c;
    RETURN result;
  ELSIF p_action <> 'summary' THEN
    RAISE EXCEPTION 'Unsupported profile action.' USING ERRCODE = '22023';
  END IF;
  RETURN jsonb_build_object(
    'following', EXISTS(SELECT 1 FROM socialu.student_follows WHERE follower_id = me AND followed_id = target),
    'follower_count', (SELECT count(*) FROM socialu.student_follows f JOIN socialu.students s ON s.student_id = f.follower_id
      WHERE f.followed_id = target AND s.is_active AND NOT socialu.is_blocked(target, s.student_id) AND NOT socialu.is_blocked(me, s.student_id)),
    'following_count', (SELECT count(*) FROM socialu.student_follows f JOIN socialu.students s ON s.student_id = f.followed_id
      WHERE f.follower_id = target AND s.is_active AND NOT socialu.is_blocked(target, s.student_id) AND NOT socialu.is_blocked(me, s.student_id))
  );
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_profile_social(UUID, TEXT, TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_profile_social(UUID, TEXT, TEXT, BIGINT) TO service_role;
NOTIFY pgrst, 'reload schema';
