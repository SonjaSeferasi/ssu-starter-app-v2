-- SocialU | Fix: creating a post / attaching a photo failed with
-- `relation "posts" does not exist` (42P01). Root cause, confirmed empirically
-- against the live DB: the DEFERRABLE INITIALLY DEFERRED constraint triggers on
-- socialu.posts/post_photos (schema.sql's "must have text or a photo" check,
-- check_post_content) fail to resolve their own unqualified table references
-- when they fire at the natural transaction-commit boundary -- even though
-- their function has SET search_path = socialu, pg_catalog correctly stored
-- (verified via pg_proc.proconfig). They work fine when forced to fire
-- immediately instead. Fix: call `SET CONSTRAINTS ALL IMMEDIATE` right after
-- each INSERT that could fire them. See supabase/migrations/20261008000200_feed_functions.sql
-- for the full, corrected function bodies this replaces.

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

CREATE OR REPLACE FUNCTION public.socialu_attach_post_photo(
  p_auth_id UUID, p_post_id BIGINT, p_storage_key TEXT, p_mime_type TEXT, p_byte_count BIGINT
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; new_asset_id BIGINT;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT author_id INTO owner FROM socialu.posts WHERE post_id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002'; END IF;
  IF owner <> me THEN RAISE EXCEPTION 'Only the post author can attach photos.' USING ERRCODE = '42501'; END IF;
  INSERT INTO socialu.media_assets (owner_id, storage_key, upload_context, mime_type, byte_count)
  VALUES (me, p_storage_key, 'post_photo', p_mime_type, p_byte_count)
  RETURNING asset_id INTO new_asset_id;
  INSERT INTO socialu.post_photos (post_id, asset_id) VALUES (p_post_id, new_asset_id);
  SET CONSTRAINTS ALL IMMEDIATE;
  RETURN new_asset_id;
END;
$$;

-- Cleanup: drop the temporary diagnostic functions used to find this bug, and
-- delete the one test post one of them successfully created along the way.
DELETE FROM socialu.posts WHERE text_content = 'immediate constraint diagnostic';
DROP FUNCTION IF EXISTS public.socialu_debug_posts();
DROP FUNCTION IF EXISTS public.socialu_debug_raw_insert(UUID);
DROP FUNCTION IF EXISTS public.socialu_debug_immediate(UUID);

NOTIFY pgrst, 'reload schema';
