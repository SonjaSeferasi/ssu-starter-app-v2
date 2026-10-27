-- SocialU | Allow a photo-only post: neither SRS-303 (text posts) nor
-- SRS-304 (photo attachment) requires text to accompany a photo -- SRS-304's
-- own user requirement already frames photos as something a student
-- attaches "along with my written message", not something that requires
-- one. Product decision (not SRS-numbered either way): students may now
-- publish a post with photos and no text at all.
--
-- schema.sql already has a DEFERRABLE INITIALLY DEFERRED constraint
-- trigger (check_post_content) enforcing "text or at least one photo" on
-- posts AND post_photos -- that's the correct, single source of truth for
-- this rule and is NOT being removed. The one problem: it fires on INSERT
-- too, and socialu_create_post calls SET CONSTRAINTS ALL IMMEDIATE right
-- after inserting the post row -- before a photo can possibly exist yet,
-- since photos are attached in a SEPARATE follow-up call
-- (POST /api/posts/:id/photos) once the post already has an id. That
-- ordering means a blank-text, photo-only post could never be created at
-- all, no matter what the application code does.
--
-- Fix: the posts-table trigger now only fires on UPDATE, not INSERT --
-- a post can start blank for the moment between creation and its photo
-- attaching, but can never be EDITED down to empty (every UPDATE to
-- text_content is still checked), and the post_photos trigger is
-- untouched, so removing a post's only remaining photo is still blocked
-- exactly as before. A post that's created blank and never gets a photo
-- (e.g. a failed upload) just sits inertly -- the same risk class as the
-- "post published, but attaching photos failed" case this app already
-- surfaces today; PostComposer.tsx is what actually guards against
-- publishing with neither text nor a photo in the first place.
DROP TRIGGER post_content ON socialu.posts;
CREATE CONSTRAINT TRIGGER post_content AFTER UPDATE ON socialu.posts DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION socialu.check_post_content();

-- Both functions below simply stop requiring non-blank text themselves --
-- the trigger above is the single enforcer now, so there's no duplicate
-- validation to keep in sync (and no custom message to maintain: a RAISE
-- EXCEPTION with no explicit ERRCODE defaults to P0001, which feedRpc
-- already maps to 400, exactly like the old explicit 22023 check did).

CREATE OR REPLACE FUNCTION public.socialu_create_post(p_auth_id UUID, p_text TEXT, p_visibility TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; clean_text TEXT; new_post socialu.posts%ROWTYPE; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  clean_text := NULLIF(btrim(coalesce(p_text, '')), '');
  IF p_visibility NOT IN ('public', 'friends_only') THEN
    RAISE EXCEPTION 'Visibility must be "public" or "friends_only".' USING ERRCODE = '22023';
  END IF;
  INSERT INTO socialu.posts (author_id, text_content, visibility)
  VALUES (me, clean_text, p_visibility) RETURNING * INTO new_post;
  SET CONSTRAINTS ALL IMMEDIATE;
  SELECT to_jsonb(feed) INTO result FROM (
    SELECT new_post.post_id, new_post.author_id, new_post.text_content, new_post.visibility,
      new_post.published_at, new_post.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name, s.username AS author_username,
      am.storage_key AS author_photo_key,
      '[]'::jsonb AS photos,
      0 AS like_count,
      FALSE AS is_liked_by_viewer,
      0 AS comment_count
    FROM socialu.students s
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE s.student_id = me
  ) feed;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.socialu_update_post(p_auth_id UUID, p_post_id BIGINT, p_text TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; clean_text TEXT; updated_post socialu.posts%ROWTYPE; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  clean_text := NULLIF(btrim(coalesce(p_text, '')), '');
  SELECT author_id INTO owner FROM socialu.posts WHERE post_id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002'; END IF;
  IF owner <> me THEN RAISE EXCEPTION 'Only the post author can edit this post.' USING ERRCODE = '42501'; END IF;

  UPDATE socialu.posts SET text_content = clean_text, edited_at = CURRENT_TIMESTAMP
  WHERE post_id = p_post_id RETURNING * INTO updated_post;
  SET CONSTRAINTS ALL IMMEDIATE;

  SELECT to_jsonb(feed) INTO result FROM (
    SELECT updated_post.post_id, updated_post.author_id, updated_post.text_content, updated_post.visibility,
      updated_post.published_at, updated_post.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', pm.asset_id, 'storage_key', pm.storage_key))
                FROM socialu.post_photos pp JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                WHERE pp.post_id = updated_post.post_id), '[]'::jsonb) AS photos,
      (SELECT count(*) FROM socialu.post_likes pl WHERE pl.post_id = updated_post.post_id) AS like_count,
      EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = updated_post.post_id AND pl.student_id = me) AS is_liked_by_viewer,
      (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = updated_post.post_id AND pc.deleted_at IS NULL) AS comment_count
    FROM socialu.students s
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE s.student_id = me
  ) feed;
  RETURN result;
END;
$$;

NOTIFY pgrst, 'reload schema';
