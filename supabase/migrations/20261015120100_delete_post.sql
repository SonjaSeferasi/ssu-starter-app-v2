-- SocialU | SRS-307.1-307.5: deleting a student's own post.
-- Same access pattern as 20261008000200_feed_functions.sql.
--
-- Every child table (post_photos, post_tags, post_likes, post_comments,
-- post_reports, notifications) already has `post_id ... REFERENCES
-- posts(post_id) ON DELETE CASCADE` in schema.sql, so a plain
-- `DELETE FROM socialu.posts` cleans all of those up automatically --
-- no manual cascade needed here. The one thing that does NOT cascade is
-- media_assets (post_photos.asset_id has no ON DELETE action) -- as of
-- 20261023000100_report_post.sql, a media_asset_cleanup trigger on
-- post_photos deletes each now-unreferenced media_assets row automatically
-- once this DELETE's cascade removes its last post_photos reference, so
-- this function only needs to capture storage_keys BEFORE that cascade
-- happens (reading them after, like it used to, would now race against
-- the trigger and come back empty) and let the trigger handle the actual
-- row cleanup.
--
-- Same SET CONSTRAINTS ALL IMMEDIATE gotcha as every other post
-- insert/update/delete here: the deferred post_photo_content trigger on
-- post_photos (cascaded by this DELETE) needs to be forced immediate.
CREATE FUNCTION public.socialu_delete_post(p_auth_id UUID, p_post_id BIGINT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; freed_keys TEXT[];
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT author_id INTO owner FROM socialu.posts WHERE post_id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002'; END IF;
  IF owner <> me THEN RAISE EXCEPTION 'Only the post author can delete this post.' USING ERRCODE = '42501'; END IF;

  -- An asset only counts as freed if no OTHER post's post_photos row also
  -- uses it (this post's own rows are about to be removed regardless).
  SELECT array_agg(ma.storage_key) INTO freed_keys
    FROM socialu.post_photos pp JOIN socialu.media_assets ma ON ma.asset_id = pp.asset_id
    WHERE pp.post_id = p_post_id
      AND NOT EXISTS (SELECT 1 FROM socialu.post_photos pp2 WHERE pp2.asset_id = pp.asset_id AND pp2.post_id <> p_post_id);

  DELETE FROM socialu.posts WHERE post_id = p_post_id;
  SET CONSTRAINTS ALL IMMEDIATE;

  RETURN to_jsonb(coalesce(freed_keys, ARRAY[]::TEXT[]));
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_delete_post(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_delete_post(UUID, BIGINT) TO service_role;

NOTIFY pgrst, 'reload schema';
