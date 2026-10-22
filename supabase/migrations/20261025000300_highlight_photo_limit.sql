-- Photo-only highlights, maximum 30 pictures across all selected posts.
-- Existing collections and posts are preserved. Apply after 20261025000100.
CREATE OR REPLACE FUNCTION public.socialu_profile_highlights(
  p_auth_id UUID, p_action TEXT, p_username TEXT DEFAULT NULL,
  p_title TEXT DEFAULT NULL, p_post_ids BIGINT[] DEFAULT NULL, p_highlight_id BIGINT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; target BIGINT; v_id BIGINT; v_title TEXT := btrim(coalesce(p_title, '')); result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  target := public.socialu_profile_target(me, p_username);

  IF p_action = 'create' THEN
    IF target <> me THEN RAISE EXCEPTION 'You can only change your own highlights.' USING ERRCODE = '42501'; END IF;
    IF v_title = '' OR length(v_title) > 30 THEN RAISE EXCEPTION 'Give your highlight a name of up to 30 characters.' USING ERRCODE = '22023'; END IF;
    IF p_post_ids IS NULL OR cardinality(p_post_ids) = 0 OR cardinality(p_post_ids) > 30 THEN
      RAISE EXCEPTION 'Choose photo posts containing between 1 and 30 pictures.' USING ERRCODE = '22023';
    END IF;
    IF (SELECT count(DISTINCT p.post_id) FROM socialu.posts p WHERE p.post_id = ANY(p_post_ids) AND p.author_id = me)
       <> (SELECT count(DISTINCT x) FROM unnest(p_post_ids) x) THEN
      RAISE EXCEPTION 'Highlights can only include your own posts.' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM unnest(p_post_ids) selected(post_id)
      WHERE NOT EXISTS (SELECT 1 FROM socialu.post_photos pp WHERE pp.post_id = selected.post_id)) THEN
      RAISE EXCEPTION 'Highlights can only include photo posts.' USING ERRCODE = '22023';
    END IF;
    IF (SELECT count(*) FROM socialu.post_photos pp WHERE pp.post_id = ANY(p_post_ids)) > 30 THEN
      RAISE EXCEPTION 'Each highlight can contain up to 30 pictures.' USING ERRCODE = '22023';
    END IF;
    IF (SELECT count(*) FROM socialu.profile_highlights WHERE owner_id = me) >= 20 THEN
      RAISE EXCEPTION 'You can have up to 20 highlights.' USING ERRCODE = '22023';
    END IF;
    INSERT INTO socialu.profile_highlights (owner_id, title) VALUES (me, v_title) RETURNING highlight_id INTO v_id;
    INSERT INTO socialu.profile_highlight_posts (highlight_id, post_id) SELECT DISTINCT v_id, x FROM unnest(p_post_ids) x;
  ELSIF p_action = 'delete' THEN
    IF target <> me THEN RAISE EXCEPTION 'You can only change your own highlights.' USING ERRCODE = '42501'; END IF;
    DELETE FROM socialu.profile_highlights WHERE highlight_id = p_highlight_id AND owner_id = me;
    IF NOT FOUND THEN RAISE EXCEPTION 'This highlight is not available.' USING ERRCODE = 'P0002'; END IF;
  ELSIF p_action IS DISTINCT FROM 'list' THEN
    RAISE EXCEPTION 'Choose a valid highlight action.' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object('highlight_id', h.highlight_id, 'title', h.title, 'posts', h.posts)
                            ORDER BY h.created_at, h.highlight_id), '[]'::jsonb) INTO result
  FROM (
    SELECT ph.highlight_id, ph.title, ph.created_at,
      coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.published_at DESC) FROM (
        SELECT p.post_id, p.author_id, p.text_content, p.visibility, p.published_at, p.edited_at,
          coalesce(sp.display_name, s.full_name) AS author_name, s.username AS author_username,
          am.storage_key AS author_photo_key,
          coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', pm.asset_id, 'storage_key', pm.storage_key) ORDER BY pm.asset_id)
                    FROM socialu.post_photos pp JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                    WHERE pp.post_id = p.post_id), '[]'::jsonb) AS photos,
          (SELECT count(*) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS like_count,
          EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS is_liked_by_viewer,
          (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = p.post_id) AS comment_count
        FROM socialu.profile_highlight_posts hp
        JOIN socialu.posts p ON p.post_id = hp.post_id
        JOIN socialu.students s ON s.student_id = p.author_id
        LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
        LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
        WHERE hp.highlight_id = ph.highlight_id AND public.socialu_profile_visible_post(me, p.post_id)
          AND EXISTS (SELECT 1 FROM socialu.post_photos photo WHERE photo.post_id = p.post_id)
      ) c), '[]'::jsonb) AS posts
    FROM socialu.profile_highlights ph
    WHERE ph.owner_id = target
  ) h
  WHERE target = me OR jsonb_array_length(h.posts) > 0;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_profile_highlights(UUID, TEXT, TEXT, TEXT, BIGINT[], BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_profile_highlights(UUID, TEXT, TEXT, TEXT, BIGINT[], BIGINT) TO service_role;


NOTIFY pgrst, 'reload schema';
