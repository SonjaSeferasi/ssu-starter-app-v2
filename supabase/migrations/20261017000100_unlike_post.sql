-- SocialU | SRS-309.1/309.2: removing a like from a post.
-- Mirrors socialu_like_post's auth/visibility checks exactly (same university
-- scoping via socialu_require_student, same Friends Only rule via
-- socialu.are_friends) so unliking can never leak whether an inaccessible
-- post exists or be used to probe/alter another student's like. The DELETE
-- targets (post_id, student_id) together, so it can only ever remove the
-- caller's own row -- post_likes' primary key makes that the only row that
-- could ever match for that student anyway. A DELETE that matches zero rows
-- (already unliked) is not an error -- same idempotency contract as
-- socialu_like_post's ON CONFLICT DO NOTHING, just the mirror image of it.
-- post_likes has no triggers (see 20261016000100_like_post.sql), so no
-- SET CONSTRAINTS ALL IMMEDIATE workaround is needed here either.

CREATE FUNCTION public.socialu_unlike_post(p_auth_id UUID, p_post_id BIGINT) RETURNS JSONB
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

  -- SRS-312 (20261020000100_like_notifications.sql): a post_like
  -- notification exists iff the underlying like is currently active, so
  -- unliking retracts every notification this actor generated for this
  -- post -- any now-stale "X liked your post" claims from a prior
  -- like/unlike cycle on this post.
  DELETE FROM socialu.notifications
  WHERE recipient_id = owner AND actor_id = me AND kind = 'post_like' AND post_id = p_post_id;

  SELECT count(*) INTO likes FROM socialu.post_likes WHERE post_id = p_post_id;
  RETURN jsonb_build_object('like_count', likes, 'is_liked_by_viewer', false);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_unlike_post(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_unlike_post(UUID, BIGINT) TO service_role;

NOTIFY pgrst, 'reload schema';
