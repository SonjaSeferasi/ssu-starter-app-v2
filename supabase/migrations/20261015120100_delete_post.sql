-- SocialU | SRS-307.1-307.5: deleting a student's own post.
-- Same access pattern as 20261008000200_feed_functions.sql.
--
-- Every child table (post_photos, post_tags, post_likes, post_comments,
-- post_reports, notifications) already has `post_id ... REFERENCES
-- posts(post_id) ON DELETE CASCADE` in schema.sql, so a plain
-- `DELETE FROM socialu.posts` cleans all of those up automatically --
-- no manual cascade needed here. The one thing that does NOT cascade is
-- media_assets (post_photos.asset_id has no ON DELETE action), so this
-- function collects the post's photo asset ids before deleting, then --
-- same defensive "not referenced elsewhere" check as
-- socialu_remove_post_photo -- removes only the now-orphaned ones and
-- returns their storage_keys for the Next.js server to delete from Storage.
--
-- Same SET CONSTRAINTS ALL IMMEDIATE gotcha as every other post
-- insert/update/delete here: the deferred post_photo_content trigger on
-- post_photos (cascaded by this DELETE) needs to be forced immediate.
CREATE FUNCTION public.socialu_delete_post(p_auth_id UUID, p_post_id BIGINT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; asset_ids BIGINT[]; freed_keys TEXT[];
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT author_id INTO owner FROM socialu.posts WHERE post_id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002'; END IF;
  IF owner <> me THEN RAISE EXCEPTION 'Only the post author can delete this post.' USING ERRCODE = '42501'; END IF;

  SELECT array_agg(asset_id) INTO asset_ids FROM socialu.post_photos WHERE post_id = p_post_id;

  DELETE FROM socialu.posts WHERE post_id = p_post_id;
  SET CONSTRAINTS ALL IMMEDIATE;

  IF asset_ids IS NOT NULL THEN
    SELECT array_agg(storage_key) INTO freed_keys FROM socialu.media_assets ma
      WHERE ma.asset_id = ANY(asset_ids)
        AND NOT EXISTS (SELECT 1 FROM socialu.post_photos pp WHERE pp.asset_id = ma.asset_id);
    DELETE FROM socialu.media_assets ma
      WHERE ma.asset_id = ANY(asset_ids)
        AND NOT EXISTS (SELECT 1 FROM socialu.post_photos pp WHERE pp.asset_id = ma.asset_id);
  END IF;

  RETURN to_jsonb(coalesce(freed_keys, ARRAY[]::TEXT[]));
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_delete_post(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_delete_post(UUID, BIGINT) TO service_role;

NOTIFY pgrst, 'reload schema';
