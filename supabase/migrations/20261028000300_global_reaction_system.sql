-- SocialU | Global Facebook-style reaction system, additional
-- functionality beyond the official SRS.
--
-- Vocabulary: 6 reactions everywhere -- like/love/haha/wow/sad/care,
-- shown as 👍/❤️/😂/😮/😢/🙏, in that exact order (lib/reactions.ts is
-- the single source of truth for the frontend). Previously:
--   - socialu.post_likes only tracked presence (SRS-308/309's plain
--     Like). A reaction column is added here, defaulting existing rows
--     to 'like' so no engagement data is lost -- same table, same
--     (post_id, student_id) primary key, so "one reaction per student
--     per post" is still enforced structurally, not just in app logic.
--   - socialu.post_comments had NO engagement mechanism at all. A new
--     socialu.comment_reactions table mirrors post_likes' exact shape.
--   - The Whisper Wall's reactions (20261028000100/200_*.sql) used a
--     DIFFERENT 6-value vocabulary (funny/support/shocked/love/sad/fire)
--     chosen before this global system existed. Remapped here to the
--     same 6 values as everywhere else, per "reuse shared components
--     rather than implementing separate inconsistent reaction systems":
--     funny->haha (same emoji), shocked->wow (same emoji), love->love
--     and sad->sad (unchanged), support->care (closest conceptual
--     match), fire->like (no direct equivalent in the standard set,
--     falls back to the default reaction). Every existing reaction is
--     remapped in place, never dropped. Whisper Wall anonymity is
--     entirely unaffected -- this only changes which 6 labels exist, not
--     who can see who reacted (still nobody, same as before).
--
-- socialu_like_post/socialu_unlike_post are left completely untouched
-- (not dropped, not redefined) -- socialu_react_post below is the new
-- primary entry point the frontend now calls, so nothing that might
-- still reference the old functions is broken by this migration.

ALTER TABLE socialu.post_likes
  ADD COLUMN reaction TEXT NOT NULL DEFAULT 'like' CHECK (reaction IN ('like','love','haha','wow','sad','care'));

-- Regular (non-anonymous) comment/reply reactions: brand new, same shape
-- as post_likes. No REVOKE needed, matching post_likes/post_comments'
-- own precedent -- Postgres doesn't auto-grant table access to PUBLIC,
-- so the explicit REVOKE is reserved for identity-adjacent anonymous
-- tables elsewhere in this codebase (e.g. whisper_participants).
CREATE TABLE socialu.comment_reactions (
    comment_id BIGINT NOT NULL REFERENCES socialu.post_comments(comment_id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES socialu.students(student_id),
    reaction TEXT NOT NULL CHECK (reaction IN ('like','love','haha','wow','sad','care')),
    PRIMARY KEY (comment_id, student_id)
);

-- Whisper Wall reaction remap (see header). PK is (confession_id/
-- comment_id, student_id), so remapping values in place can never
-- collide or duplicate a row. The old CHECK constraints (from
-- 20261028000200, still only allowing funny/support/shocked/love/sad/fire
-- at this point) must be dropped BEFORE the renaming UPDATEs below --
-- otherwise setting reaction='haha' while the old constraint is still
-- active violates it immediately. Drop first, rename values, then add
-- the new constraint once every row already holds an allowed value.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'socialu.whisper_reactions'::regclass AND contype = 'c'
  LOOP EXECUTE format('ALTER TABLE socialu.whisper_reactions DROP CONSTRAINT %I', r.conname); END LOOP;
END $$;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'socialu.whisper_comment_reactions'::regclass AND contype = 'c'
  LOOP EXECUTE format('ALTER TABLE socialu.whisper_comment_reactions DROP CONSTRAINT %I', r.conname); END LOOP;
END $$;

UPDATE socialu.whisper_reactions SET reaction = CASE reaction
  WHEN 'funny' THEN 'haha' WHEN 'shocked' THEN 'wow' WHEN 'support' THEN 'care' WHEN 'fire' THEN 'like'
  ELSE reaction END;
UPDATE socialu.whisper_comment_reactions SET reaction = CASE reaction
  WHEN 'funny' THEN 'haha' WHEN 'shocked' THEN 'wow' WHEN 'support' THEN 'care' WHEN 'fire' THEN 'like'
  ELSE reaction END;

ALTER TABLE socialu.whisper_reactions
  ADD CONSTRAINT whisper_reactions_reaction_check CHECK (reaction IN ('like','love','haha','wow','sad','care'));
ALTER TABLE socialu.whisper_comment_reactions
  ADD CONSTRAINT whisper_comment_reactions_reaction_check CHECK (reaction IN ('like','love','haha','wow','sad','care'));

-- Facebook-style react on a post the caller is authorized to view. NULL
-- p_reaction removes; a non-null value sets or replaces. Notification
-- semantics match the existing post_like behavior exactly: only a
-- genuinely NEW reaction (the student had none before) notifies the
-- post author -- never a change between reaction types, never a
-- self-react -- and removing a reaction retracts it, same as
-- socialu_unlike_post already does. The 'post_like' notification kind
-- itself is unchanged (it now means "reacted," not just "liked" --
-- no schema change needed since it was never reaction-type-specific).
CREATE FUNCTION public.socialu_react_post(p_auth_id UUID, p_post_id BIGINT, p_reaction TEXT DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; vis TEXT; had_reaction BOOLEAN; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT author_id, visibility INTO owner, vis FROM socialu.posts WHERE post_id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002'; END IF;
  IF vis = 'friends_only' AND owner <> me AND NOT socialu.are_friends(me, owner) THEN
    RAISE EXCEPTION 'You are not authorized to view this post.' USING ERRCODE = '42501';
  END IF;

  had_reaction := EXISTS (SELECT 1 FROM socialu.post_likes WHERE post_id = p_post_id AND student_id = me);

  IF p_reaction IS NULL THEN
    DELETE FROM socialu.post_likes WHERE post_id = p_post_id AND student_id = me;
    DELETE FROM socialu.notifications
    WHERE recipient_id = owner AND actor_id = me AND kind = 'post_like' AND post_id = p_post_id;
  ELSE
    IF p_reaction NOT IN ('like','love','haha','wow','sad','care') THEN
      RAISE EXCEPTION 'Choose a valid reaction.' USING ERRCODE = '22023';
    END IF;
    INSERT INTO socialu.post_likes (post_id, student_id, reaction) VALUES (p_post_id, me, p_reaction)
      ON CONFLICT (post_id, student_id) DO UPDATE SET reaction = EXCLUDED.reaction;
    IF NOT had_reaction AND owner <> me THEN
      INSERT INTO socialu.notifications (recipient_id, actor_id, kind, post_id)
      VALUES (owner, me, 'post_like', p_post_id);
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'like_count', (SELECT count(*) FROM socialu.post_likes WHERE post_id = p_post_id),
    'is_liked_by_viewer', p_reaction IS NOT NULL,
    'reaction_counts', (SELECT jsonb_build_object(
      'like', count(*) FILTER (WHERE reaction = 'like'), 'love', count(*) FILTER (WHERE reaction = 'love'),
      'haha', count(*) FILTER (WHERE reaction = 'haha'), 'wow', count(*) FILTER (WHERE reaction = 'wow'),
      'sad', count(*) FILTER (WHERE reaction = 'sad'), 'care', count(*) FILTER (WHERE reaction = 'care')
    ) FROM socialu.post_likes WHERE post_id = p_post_id),
    'my_reaction', p_reaction
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_react_post(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_react_post(UUID, BIGINT, TEXT) TO service_role;

-- Facebook-style react on a regular (non-anonymous) comment or reply --
-- brand new, since post_comments had no engagement mechanism before
-- this. Same visibility re-check as commenting itself (via the owning
-- post), and refuses to react to a tombstoned (soft-deleted) comment.
-- No new notification kind -- out of scope here, same as the Whisper
-- Wall's comment reactions never notifying either.
CREATE FUNCTION public.socialu_react_comment(p_auth_id UUID, p_comment_id BIGINT, p_reaction TEXT DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; target_post_id BIGINT; tombstoned TIMESTAMPTZ; owner BIGINT; vis TEXT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT post_id, deleted_at INTO target_post_id, tombstoned FROM socialu.post_comments WHERE comment_id = p_comment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
  IF tombstoned IS NOT NULL THEN RAISE EXCEPTION 'This comment is no longer available.' USING ERRCODE = 'P0002'; END IF;
  PERFORM socialu.require_school_post(p_auth_id, target_post_id);
  SELECT author_id, visibility INTO owner, vis FROM socialu.posts WHERE post_id = target_post_id;
  IF vis = 'friends_only' AND owner <> me AND NOT socialu.are_friends(me, owner) THEN
    RAISE EXCEPTION 'You are not authorized to view this post.' USING ERRCODE = '42501';
  END IF;

  IF p_reaction IS NULL THEN
    DELETE FROM socialu.comment_reactions WHERE comment_id = p_comment_id AND student_id = me;
  ELSE
    IF p_reaction NOT IN ('like','love','haha','wow','sad','care') THEN
      RAISE EXCEPTION 'Choose a valid reaction.' USING ERRCODE = '22023';
    END IF;
    INSERT INTO socialu.comment_reactions (comment_id, student_id, reaction) VALUES (p_comment_id, me, p_reaction)
      ON CONFLICT (comment_id, student_id) DO UPDATE SET reaction = EXCLUDED.reaction;
  END IF;

  SELECT jsonb_build_object(
    'reaction_counts', jsonb_build_object(
      'like', count(*) FILTER (WHERE reaction = 'like'), 'love', count(*) FILTER (WHERE reaction = 'love'),
      'haha', count(*) FILTER (WHERE reaction = 'haha'), 'wow', count(*) FILTER (WHERE reaction = 'wow'),
      'sad', count(*) FILTER (WHERE reaction = 'sad'), 'care', count(*) FILTER (WHERE reaction = 'care')
    ),
    'my_reaction', p_reaction
  ) INTO result FROM socialu.comment_reactions WHERE comment_id = p_comment_id;
  RETURN coalesce(result, jsonb_build_object('reaction_counts',
    jsonb_build_object('like',0,'love',0,'haha',0,'wow',0,'sad',0,'care',0), 'my_reaction', NULL));
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_react_comment(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_react_comment(UUID, BIGINT, TEXT) TO service_role;

-- Every post-listing/comment-listing RPC below gains `reaction_counts`
-- (a 6-key breakdown) and `my_reaction` (the viewer's specific reaction,
-- not just a boolean) alongside the EXISTING `like_count`/
-- `is_liked_by_viewer` fields, which are left fully intact and still
-- mean exactly what they meant before ("total engagement" / "viewer has
-- any reaction") -- nothing that already reads those two fields breaks.
-- Bodies are otherwise byte-for-byte identical to the current source of
-- truth (20261027000300_restore_school_isolation.sql).

CREATE OR REPLACE FUNCTION public.socialu_campus_feed(p_auth_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT coalesce(jsonb_agg(to_jsonb(feed) ORDER BY feed.published_at DESC), '[]'::jsonb) INTO result
  FROM (
    SELECT p.post_id, p.author_id, p.text_content, p.visibility, p.published_at, p.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name, s.username AS author_username,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', pm.asset_id, 'storage_key', pm.storage_key))
                FROM socialu.post_photos pp JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                WHERE pp.post_id = p.post_id), '[]'::jsonb) AS photos,
      coalesce((SELECT jsonb_agg(jsonb_build_object('student_id', men.student_id, 'matched_username', men.matched_username,
                  'username', ms.username, 'name', coalesce(msp.display_name, ms.full_name), 'photo_key', mam.storage_key))
                FROM socialu.post_mentions men
                JOIN socialu.students ms ON ms.student_id = men.student_id AND ms.is_active
                LEFT JOIN socialu.student_profiles msp ON msp.student_id = ms.student_id
                LEFT JOIN socialu.media_assets mam ON mam.asset_id = msp.photo_id
                WHERE men.post_id = p.post_id), '[]'::jsonb) AS mentions,
      p.is_repost AS is_repost,
      CASE WHEN p.repost_of_post_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'post_id', op.post_id, 'author_id', op.author_id,
          'author_name', coalesce(osp.display_name, os.full_name), 'author_username', os.username,
          'author_photo_key', oam.storage_key, 'published_at', op.published_at, 'text_content', op.text_content,
          'photos', coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', opm.asset_id, 'storage_key', opm.storage_key))
                    FROM socialu.post_photos opp JOIN socialu.media_assets opm ON opm.asset_id = opp.asset_id
                    WHERE opp.post_id = op.post_id), '[]'::jsonb)
        )
        FROM socialu.posts op
        JOIN socialu.students os ON os.student_id = op.author_id AND os.is_active
        LEFT JOIN socialu.student_profiles osp ON osp.student_id = os.student_id
        LEFT JOIN socialu.media_assets oam ON oam.asset_id = osp.photo_id
        WHERE op.post_id = p.repost_of_post_id
          AND (op.visibility = 'public' OR op.author_id = me OR socialu.are_friends(me, op.author_id))
          AND NOT socialu.is_blocked(me, op.author_id)
          AND socialu.same_school(me, op.author_id)
      ) ELSE NULL END AS repost_of,
      (SELECT count(*) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS like_count,
      EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS is_liked_by_viewer,
      (SELECT jsonb_build_object(
        'like', count(*) FILTER (WHERE reaction = 'like'), 'love', count(*) FILTER (WHERE reaction = 'love'),
        'haha', count(*) FILTER (WHERE reaction = 'haha'), 'wow', count(*) FILTER (WHERE reaction = 'wow'),
        'sad', count(*) FILTER (WHERE reaction = 'sad'), 'care', count(*) FILTER (WHERE reaction = 'care')
      ) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS reaction_counts,
      (SELECT reaction FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS my_reaction,
      (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = p.post_id AND pc.deleted_at IS NULL) AS comment_count
    FROM socialu.posts p
    JOIN socialu.students s ON s.student_id = p.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE p.visibility = 'public' AND s.is_active AND NOT socialu.is_blocked(me,p.author_id)
      AND socialu.same_school(me, p.author_id)
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
      coalesce(sp.display_name, s.full_name) AS author_name, s.username AS author_username,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', pm.asset_id, 'storage_key', pm.storage_key))
                FROM socialu.post_photos pp JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                WHERE pp.post_id = p.post_id), '[]'::jsonb) AS photos,
      coalesce((SELECT jsonb_agg(jsonb_build_object('student_id', men.student_id, 'matched_username', men.matched_username,
                  'username', ms.username, 'name', coalesce(msp.display_name, ms.full_name), 'photo_key', mam.storage_key))
                FROM socialu.post_mentions men
                JOIN socialu.students ms ON ms.student_id = men.student_id AND ms.is_active
                LEFT JOIN socialu.student_profiles msp ON msp.student_id = ms.student_id
                LEFT JOIN socialu.media_assets mam ON mam.asset_id = msp.photo_id
                WHERE men.post_id = p.post_id), '[]'::jsonb) AS mentions,
      p.is_repost AS is_repost,
      CASE WHEN p.repost_of_post_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'post_id', op.post_id, 'author_id', op.author_id,
          'author_name', coalesce(osp.display_name, os.full_name), 'author_username', os.username,
          'author_photo_key', oam.storage_key, 'published_at', op.published_at, 'text_content', op.text_content,
          'photos', coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', opm.asset_id, 'storage_key', opm.storage_key))
                    FROM socialu.post_photos opp JOIN socialu.media_assets opm ON opm.asset_id = opp.asset_id
                    WHERE opp.post_id = op.post_id), '[]'::jsonb)
        )
        FROM socialu.posts op
        JOIN socialu.students os ON os.student_id = op.author_id AND os.is_active
        LEFT JOIN socialu.student_profiles osp ON osp.student_id = os.student_id
        LEFT JOIN socialu.media_assets oam ON oam.asset_id = osp.photo_id
        WHERE op.post_id = p.repost_of_post_id
          AND (op.visibility = 'public' OR op.author_id = me OR socialu.are_friends(me, op.author_id))
          AND NOT socialu.is_blocked(me, op.author_id)
          AND socialu.same_school(me, op.author_id)
      ) ELSE NULL END AS repost_of,
      (SELECT count(*) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS like_count,
      EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS is_liked_by_viewer,
      (SELECT jsonb_build_object(
        'like', count(*) FILTER (WHERE reaction = 'like'), 'love', count(*) FILTER (WHERE reaction = 'love'),
        'haha', count(*) FILTER (WHERE reaction = 'haha'), 'wow', count(*) FILTER (WHERE reaction = 'wow'),
        'sad', count(*) FILTER (WHERE reaction = 'sad'), 'care', count(*) FILTER (WHERE reaction = 'care')
      ) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS reaction_counts,
      (SELECT reaction FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS my_reaction,
      (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = p.post_id AND pc.deleted_at IS NULL) AS comment_count
    FROM socialu.posts p
    JOIN socialu.students s ON s.student_id = p.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE p.visibility = 'friends_only' AND (p.author_id = me OR socialu.are_friends(me, p.author_id))
      AND socialu.same_school(me, p.author_id)
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
      coalesce(sp.display_name, s.full_name) AS author_name, s.username AS author_username,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', pm.asset_id, 'storage_key', pm.storage_key))
                FROM socialu.post_photos pp JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                WHERE pp.post_id = p.post_id), '[]'::jsonb) AS photos,
      coalesce((SELECT jsonb_agg(jsonb_build_object('student_id', men.student_id, 'matched_username', men.matched_username,
                  'username', ms.username, 'name', coalesce(msp.display_name, ms.full_name), 'photo_key', mam.storage_key))
                FROM socialu.post_mentions men
                JOIN socialu.students ms ON ms.student_id = men.student_id AND ms.is_active
                LEFT JOIN socialu.student_profiles msp ON msp.student_id = ms.student_id
                LEFT JOIN socialu.media_assets mam ON mam.asset_id = msp.photo_id
                WHERE men.post_id = p.post_id), '[]'::jsonb) AS mentions,
      p.is_repost AS is_repost,
      CASE WHEN p.repost_of_post_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'post_id', op.post_id, 'author_id', op.author_id,
          'author_name', coalesce(osp.display_name, os.full_name), 'author_username', os.username,
          'author_photo_key', oam.storage_key, 'published_at', op.published_at, 'text_content', op.text_content,
          'photos', coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', opm.asset_id, 'storage_key', opm.storage_key))
                    FROM socialu.post_photos opp JOIN socialu.media_assets opm ON opm.asset_id = opp.asset_id
                    WHERE opp.post_id = op.post_id), '[]'::jsonb)
        )
        FROM socialu.posts op
        JOIN socialu.students os ON os.student_id = op.author_id AND os.is_active
        LEFT JOIN socialu.student_profiles osp ON osp.student_id = os.student_id
        LEFT JOIN socialu.media_assets oam ON oam.asset_id = osp.photo_id
        WHERE op.post_id = p.repost_of_post_id
          AND (op.visibility = 'public' OR op.author_id = me OR socialu.are_friends(me, op.author_id))
          AND NOT socialu.is_blocked(me, op.author_id)
          AND socialu.same_school(me, op.author_id)
      ) ELSE NULL END AS repost_of,
      (SELECT count(*) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS like_count,
      EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS is_liked_by_viewer,
      (SELECT jsonb_build_object(
        'like', count(*) FILTER (WHERE reaction = 'like'), 'love', count(*) FILTER (WHERE reaction = 'love'),
        'haha', count(*) FILTER (WHERE reaction = 'haha'), 'wow', count(*) FILTER (WHERE reaction = 'wow'),
        'sad', count(*) FILTER (WHERE reaction = 'sad'), 'care', count(*) FILTER (WHERE reaction = 'care')
      ) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS reaction_counts,
      (SELECT reaction FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS my_reaction,
      (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = p.post_id AND pc.deleted_at IS NULL) AS comment_count
    FROM socialu.posts p
    JOIN socialu.students s ON s.student_id = p.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE CASE WHEN p_category = 'posts' THEN p.author_id = target
               ELSE EXISTS (SELECT 1 FROM socialu.post_tags t WHERE t.post_id = p.post_id AND t.student_id = target) END
      AND (p.author_id = me OR p.visibility = 'public' OR socialu.are_friends(me, p.author_id))
      AND (p.author_id = me OR NOT socialu.is_blocked(me, p.author_id))
      AND socialu.same_school(me, p.author_id)
  ) c;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.socialu_get_post(p_auth_id UUID, p_post_id BIGINT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT to_jsonb(feed) INTO result FROM (
    SELECT p.post_id, p.author_id, p.text_content, p.visibility, p.published_at, p.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name, s.username AS author_username,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', pm.asset_id, 'storage_key', pm.storage_key))
                FROM socialu.post_photos pp JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                WHERE pp.post_id = p.post_id), '[]'::jsonb) AS photos,
      coalesce((SELECT jsonb_agg(jsonb_build_object('student_id', men.student_id, 'matched_username', men.matched_username,
                  'username', ms.username, 'name', coalesce(msp.display_name, ms.full_name), 'photo_key', mam.storage_key))
                FROM socialu.post_mentions men
                JOIN socialu.students ms ON ms.student_id = men.student_id AND ms.is_active
                LEFT JOIN socialu.student_profiles msp ON msp.student_id = ms.student_id
                LEFT JOIN socialu.media_assets mam ON mam.asset_id = msp.photo_id
                WHERE men.post_id = p.post_id), '[]'::jsonb) AS mentions,
      p.is_repost AS is_repost,
      CASE WHEN p.repost_of_post_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'post_id', op.post_id, 'author_id', op.author_id,
          'author_name', coalesce(osp.display_name, os.full_name), 'author_username', os.username,
          'author_photo_key', oam.storage_key, 'published_at', op.published_at, 'text_content', op.text_content,
          'photos', coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', opm.asset_id, 'storage_key', opm.storage_key))
                    FROM socialu.post_photos opp JOIN socialu.media_assets opm ON opm.asset_id = opp.asset_id
                    WHERE opp.post_id = op.post_id), '[]'::jsonb)
        )
        FROM socialu.posts op
        JOIN socialu.students os ON os.student_id = op.author_id AND os.is_active
        LEFT JOIN socialu.student_profiles osp ON osp.student_id = os.student_id
        LEFT JOIN socialu.media_assets oam ON oam.asset_id = osp.photo_id
        WHERE op.post_id = p.repost_of_post_id
          AND (op.visibility = 'public' OR op.author_id = me OR socialu.are_friends(me, op.author_id))
          AND NOT socialu.is_blocked(me, op.author_id)
          AND socialu.same_school(me, op.author_id)
      ) ELSE NULL END AS repost_of,
      (SELECT count(*) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS like_count,
      EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS is_liked_by_viewer,
      (SELECT jsonb_build_object(
        'like', count(*) FILTER (WHERE reaction = 'like'), 'love', count(*) FILTER (WHERE reaction = 'love'),
        'haha', count(*) FILTER (WHERE reaction = 'haha'), 'wow', count(*) FILTER (WHERE reaction = 'wow'),
        'sad', count(*) FILTER (WHERE reaction = 'sad'), 'care', count(*) FILTER (WHERE reaction = 'care')
      ) FROM socialu.post_likes pl WHERE pl.post_id = p.post_id) AS reaction_counts,
      (SELECT reaction FROM socialu.post_likes pl WHERE pl.post_id = p.post_id AND pl.student_id = me) AS my_reaction,
      (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = p.post_id AND pc.deleted_at IS NULL) AS comment_count
    FROM socialu.posts p
    JOIN socialu.students s ON s.student_id = p.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE p.post_id = p_post_id AND s.is_active
      AND (p.visibility = 'public' OR p.author_id = me OR socialu.are_friends(me, p.author_id))
      AND NOT socialu.is_blocked(me, p.author_id)
      AND socialu.same_school(me, p.author_id)
  ) feed;

  IF result IS NULL THEN
    RAISE EXCEPTION 'This post isn''t available.' USING ERRCODE = 'P0002';
  END IF;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.socialu_create_post(
  p_auth_id UUID, p_text TEXT, p_visibility TEXT, p_repost_of_post_id BIGINT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me BIGINT; clean_text TEXT; new_post socialu.posts%ROWTYPE; result JSONB;
  orig_author BIGINT; orig_vis TEXT; orig_chain BIGINT; effective_repost_of BIGINT;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  clean_text := NULLIF(btrim(coalesce(p_text, '')), '');

  IF p_repost_of_post_id IS NOT NULL THEN
    SELECT author_id, visibility, repost_of_post_id INTO orig_author, orig_vis, orig_chain
    FROM socialu.posts WHERE post_id = p_repost_of_post_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'This post isn''t available.' USING ERRCODE = 'P0002'; END IF;
    effective_repost_of := coalesce(orig_chain, p_repost_of_post_id);
    IF orig_chain IS NOT NULL THEN
      SELECT author_id, visibility INTO orig_author, orig_vis FROM socialu.posts WHERE post_id = orig_chain;
      IF NOT FOUND THEN RAISE EXCEPTION 'This post isn''t available.' USING ERRCODE = 'P0002'; END IF;
    END IF;
    IF orig_vis = 'friends_only' AND orig_author <> me AND NOT socialu.are_friends(me, orig_author) THEN
      RAISE EXCEPTION 'This post isn''t available.' USING ERRCODE = 'P0002';
    END IF;
    IF socialu.is_blocked(me, orig_author) THEN
      RAISE EXCEPTION 'This post isn''t available.' USING ERRCODE = 'P0002';
    END IF;
    IF NOT socialu.same_school(me, orig_author) THEN
      RAISE EXCEPTION 'This post isn''t available.' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  IF p_visibility IS NULL OR p_visibility NOT IN ('public', 'friends_only') THEN
    RAISE EXCEPTION 'Choose a visibility option: Public or Friends Only.' USING ERRCODE = '22023';
  END IF;
  IF effective_repost_of IS NOT NULL AND orig_vis = 'friends_only' THEN
    p_visibility := 'friends_only';
  END IF;

  INSERT INTO socialu.posts (author_id, text_content, visibility, repost_of_post_id, is_repost)
  VALUES (me, clean_text, p_visibility, effective_repost_of, effective_repost_of IS NOT NULL) RETURNING * INTO new_post;
  SET CONSTRAINTS ALL IMMEDIATE;
  PERFORM socialu.sync_post_mentions(new_post.post_id, me, clean_text);

  IF effective_repost_of IS NOT NULL AND orig_author <> me THEN
    INSERT INTO socialu.notifications (recipient_id, actor_id, kind, post_id)
    VALUES (orig_author, me, 'repost', new_post.post_id);
  END IF;

  SELECT to_jsonb(feed) INTO result FROM (
    SELECT new_post.post_id, new_post.author_id, new_post.text_content, new_post.visibility,
      new_post.published_at, new_post.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name, s.username AS author_username,
      am.storage_key AS author_photo_key,
      '[]'::jsonb AS photos,
      '[]'::jsonb AS mentions,
      new_post.is_repost AS is_repost,
      CASE WHEN new_post.repost_of_post_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'post_id', op.post_id, 'author_id', op.author_id,
          'author_name', coalesce(osp.display_name, os.full_name), 'author_username', os.username,
          'author_photo_key', oam.storage_key, 'published_at', op.published_at, 'text_content', op.text_content,
          'photos', coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', opm.asset_id, 'storage_key', opm.storage_key))
                    FROM socialu.post_photos opp JOIN socialu.media_assets opm ON opm.asset_id = opp.asset_id
                    WHERE opp.post_id = op.post_id), '[]'::jsonb)
        )
        FROM socialu.posts op
        JOIN socialu.students os ON os.student_id = op.author_id AND os.is_active
        LEFT JOIN socialu.student_profiles osp ON osp.student_id = os.student_id
        LEFT JOIN socialu.media_assets oam ON oam.asset_id = osp.photo_id
        WHERE op.post_id = new_post.repost_of_post_id
          AND (op.visibility = 'public' OR op.author_id = me OR socialu.are_friends(me, op.author_id))
          AND NOT socialu.is_blocked(me, op.author_id)
          AND socialu.same_school(me, op.author_id)
      ) ELSE NULL END AS repost_of,
      0 AS like_count,
      FALSE AS is_liked_by_viewer,
      jsonb_build_object('like',0,'love',0,'haha',0,'wow',0,'sad',0,'care',0) AS reaction_counts,
      NULL::TEXT AS my_reaction,
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
  PERFORM socialu.require_school_post(p_auth_id, p_post_id);
  me := public.socialu_require_student(p_auth_id);
  clean_text := NULLIF(btrim(coalesce(p_text, '')), '');
  SELECT author_id INTO owner FROM socialu.posts WHERE post_id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002'; END IF;
  IF owner <> me THEN RAISE EXCEPTION 'Only the post author can edit this post.' USING ERRCODE = '42501'; END IF;

  UPDATE socialu.posts SET text_content = clean_text, edited_at = CURRENT_TIMESTAMP
  WHERE post_id = p_post_id RETURNING * INTO updated_post;
  SET CONSTRAINTS ALL IMMEDIATE;
  PERFORM socialu.sync_post_mentions(p_post_id, me, clean_text);

  SELECT to_jsonb(feed) INTO result FROM (
    SELECT updated_post.post_id, updated_post.author_id, updated_post.text_content, updated_post.visibility,
      updated_post.published_at, updated_post.edited_at,
      coalesce(sp.display_name, s.full_name) AS author_name,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', pm.asset_id, 'storage_key', pm.storage_key))
                FROM socialu.post_photos pp JOIN socialu.media_assets pm ON pm.asset_id = pp.asset_id
                WHERE pp.post_id = updated_post.post_id), '[]'::jsonb) AS photos,
      coalesce((SELECT jsonb_agg(jsonb_build_object('student_id', men.student_id, 'matched_username', men.matched_username,
                  'username', ms.username, 'name', coalesce(msp.display_name, ms.full_name), 'photo_key', mam.storage_key))
                FROM socialu.post_mentions men
                JOIN socialu.students ms ON ms.student_id = men.student_id AND ms.is_active
                LEFT JOIN socialu.student_profiles msp ON msp.student_id = ms.student_id
                LEFT JOIN socialu.media_assets mam ON mam.asset_id = msp.photo_id
                WHERE men.post_id = updated_post.post_id), '[]'::jsonb) AS mentions,
      updated_post.is_repost AS is_repost,
      CASE WHEN updated_post.repost_of_post_id IS NOT NULL THEN (
        SELECT jsonb_build_object(
          'post_id', op.post_id, 'author_id', op.author_id,
          'author_name', coalesce(osp.display_name, os.full_name), 'author_username', os.username,
          'author_photo_key', oam.storage_key, 'published_at', op.published_at, 'text_content', op.text_content,
          'photos', coalesce((SELECT jsonb_agg(jsonb_build_object('asset_id', opm.asset_id, 'storage_key', opm.storage_key))
                    FROM socialu.post_photos opp JOIN socialu.media_assets opm ON opm.asset_id = opp.asset_id
                    WHERE opp.post_id = op.post_id), '[]'::jsonb)
        )
        FROM socialu.posts op
        JOIN socialu.students os ON os.student_id = op.author_id AND os.is_active
        LEFT JOIN socialu.student_profiles osp ON osp.student_id = os.student_id
        LEFT JOIN socialu.media_assets oam ON oam.asset_id = osp.photo_id
        WHERE op.post_id = updated_post.repost_of_post_id
          AND (op.visibility = 'public' OR op.author_id = me OR socialu.are_friends(me, op.author_id))
          AND NOT socialu.is_blocked(me, op.author_id)
          AND socialu.same_school(me, op.author_id)
      ) ELSE NULL END AS repost_of,
      (SELECT count(*) FROM socialu.post_likes pl WHERE pl.post_id = updated_post.post_id) AS like_count,
      EXISTS (SELECT 1 FROM socialu.post_likes pl WHERE pl.post_id = updated_post.post_id AND pl.student_id = me) AS is_liked_by_viewer,
      (SELECT jsonb_build_object(
        'like', count(*) FILTER (WHERE reaction = 'like'), 'love', count(*) FILTER (WHERE reaction = 'love'),
        'haha', count(*) FILTER (WHERE reaction = 'haha'), 'wow', count(*) FILTER (WHERE reaction = 'wow'),
        'sad', count(*) FILTER (WHERE reaction = 'sad'), 'care', count(*) FILTER (WHERE reaction = 'care')
      ) FROM socialu.post_likes pl WHERE pl.post_id = updated_post.post_id) AS reaction_counts,
      (SELECT reaction FROM socialu.post_likes pl WHERE pl.post_id = updated_post.post_id AND pl.student_id = me) AS my_reaction,
      (SELECT count(*) FROM socialu.post_comments pc WHERE pc.post_id = updated_post.post_id AND pc.deleted_at IS NULL) AS comment_count
    FROM socialu.students s
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE s.student_id = me
  ) feed;
  RETURN result;
END;
$$;

-- Comment-listing/creating/editing RPCs: gain `reaction_counts`/
-- `my_reaction` keyed off the new comment_reactions table. A freshly
-- created comment has nothing to react to yet (literal zeros, same
-- established convention as every other "create" RPC in this codebase);
-- editing preserves and returns the comment's CURRENT reaction state,
-- never resets it.

CREATE OR REPLACE FUNCTION public.socialu_list_comments(p_auth_id UUID, p_post_id BIGINT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; vis TEXT; result JSONB;
BEGIN
  PERFORM socialu.require_school_post(p_auth_id, p_post_id);
  me := public.socialu_require_student(p_auth_id);
  SELECT author_id, visibility INTO owner, vis FROM socialu.posts WHERE post_id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002'; END IF;
  IF vis = 'friends_only' AND owner <> me AND NOT socialu.are_friends(me, owner) THEN
    RAISE EXCEPTION 'You are not authorized to view this post.' USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.created_at ASC), '[]'::jsonb) INTO result
  FROM (
    SELECT pc.comment_id, pc.post_id, pc.author_id, pc.text_content, pc.created_at, pc.edited_at,
      pc.parent_comment_id, pc.deleted_at,
      coalesce(sp.display_name, s.full_name) AS author_name,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(jsonb_build_object('student_id', men.student_id, 'matched_username', men.matched_username,
                  'username', ms.username, 'name', coalesce(msp.display_name, ms.full_name), 'photo_key', mam.storage_key))
                FROM socialu.comment_mentions men
                JOIN socialu.students ms ON ms.student_id = men.student_id AND ms.is_active
                LEFT JOIN socialu.student_profiles msp ON msp.student_id = ms.student_id
                LEFT JOIN socialu.media_assets mam ON mam.asset_id = msp.photo_id
                WHERE men.comment_id = pc.comment_id), '[]'::jsonb) AS mentions,
      (SELECT jsonb_build_object(
        'like', count(*) FILTER (WHERE reaction = 'like'), 'love', count(*) FILTER (WHERE reaction = 'love'),
        'haha', count(*) FILTER (WHERE reaction = 'haha'), 'wow', count(*) FILTER (WHERE reaction = 'wow'),
        'sad', count(*) FILTER (WHERE reaction = 'sad'), 'care', count(*) FILTER (WHERE reaction = 'care')
      ) FROM socialu.comment_reactions cr WHERE cr.comment_id = pc.comment_id) AS reaction_counts,
      (SELECT reaction FROM socialu.comment_reactions cr WHERE cr.comment_id = pc.comment_id AND cr.student_id = me) AS my_reaction
    FROM socialu.post_comments pc
    JOIN socialu.students s ON s.student_id = pc.author_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE pc.post_id = p_post_id
  ) c;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.socialu_create_comment(
  p_auth_id UUID, p_post_id BIGINT, p_text TEXT, p_parent_comment_id BIGINT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; vis TEXT; target_post BIGINT; target_parent BIGINT; target_author BIGINT;
  actual_parent BIGINT; clean_text TEXT; new_comment socialu.post_comments%ROWTYPE; result JSONB;
BEGIN
  PERFORM socialu.require_school_post(p_auth_id, p_post_id);
  me := public.socialu_require_student(p_auth_id);
  IF p_text IS NULL OR btrim(p_text) = '' THEN
    RAISE EXCEPTION 'Comment text is required.' USING ERRCODE = '22023';
  END IF;
  clean_text := btrim(p_text);
  SELECT author_id, visibility INTO owner, vis FROM socialu.posts WHERE post_id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found.' USING ERRCODE = 'P0002'; END IF;
  IF vis = 'friends_only' AND owner <> me AND NOT socialu.are_friends(me, owner) THEN
    RAISE EXCEPTION 'You are not authorized to view this post.' USING ERRCODE = '42501';
  END IF;

  IF p_parent_comment_id IS NOT NULL THEN
    SELECT post_id, parent_comment_id, author_id INTO target_post, target_parent, target_author
    FROM socialu.post_comments WHERE comment_id = p_parent_comment_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
    IF target_post <> p_post_id THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
    actual_parent := coalesce(target_parent, p_parent_comment_id);
  END IF;

  INSERT INTO socialu.post_comments (post_id, author_id, text_content, parent_comment_id)
  VALUES (p_post_id, me, clean_text, actual_parent) RETURNING * INTO new_comment;

  IF p_parent_comment_id IS NOT NULL AND target_author <> me THEN
    INSERT INTO socialu.notifications (recipient_id, actor_id, kind, comment_id)
    VALUES (target_author, me, 'comment_reply', new_comment.comment_id);
  END IF;
  IF owner <> me AND (p_parent_comment_id IS NULL OR owner <> target_author) THEN
    INSERT INTO socialu.notifications (recipient_id, actor_id, kind, comment_id)
    VALUES (owner, me, 'post_comment', new_comment.comment_id);
  END IF;
  PERFORM socialu.sync_comment_mentions(new_comment.comment_id, p_post_id, me, clean_text);

  SELECT to_jsonb(c) INTO result FROM (
    SELECT new_comment.comment_id, new_comment.post_id, new_comment.author_id,
      new_comment.text_content, new_comment.created_at, new_comment.edited_at,
      new_comment.parent_comment_id, new_comment.deleted_at,
      coalesce(sp.display_name, s.full_name) AS author_name,
      am.storage_key AS author_photo_key,
      '[]'::jsonb AS mentions,
      jsonb_build_object('like',0,'love',0,'haha',0,'wow',0,'sad',0,'care',0) AS reaction_counts,
      NULL::TEXT AS my_reaction
    FROM socialu.students s
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE s.student_id = me
  ) c;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.socialu_update_comment(p_auth_id UUID, p_comment_id BIGINT, p_text TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; author BIGINT; tombstoned TIMESTAMPTZ; clean_text TEXT; target_post_id BIGINT;
  updated_comment socialu.post_comments%ROWTYPE; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_text IS NULL OR btrim(p_text) = '' THEN
    RAISE EXCEPTION 'Comment text is required.' USING ERRCODE = '22023';
  END IF;
  clean_text := btrim(p_text);
  SELECT author_id, deleted_at, post_id INTO author, tombstoned, target_post_id
  FROM socialu.post_comments WHERE comment_id = p_comment_id;
  IF NOT FOUND OR tombstoned IS NOT NULL THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
  PERFORM socialu.require_school_post(p_auth_id, target_post_id);
  IF author <> me THEN RAISE EXCEPTION 'Only the comment author can edit this comment.' USING ERRCODE = '42501'; END IF;

  UPDATE socialu.post_comments SET text_content = clean_text, edited_at = CURRENT_TIMESTAMP
  WHERE comment_id = p_comment_id RETURNING * INTO updated_comment;
  PERFORM socialu.sync_comment_mentions(p_comment_id, updated_comment.post_id, me, clean_text);

  SELECT to_jsonb(c) INTO result FROM (
    SELECT updated_comment.comment_id, updated_comment.post_id, updated_comment.author_id,
      updated_comment.text_content, updated_comment.created_at, updated_comment.edited_at,
      updated_comment.parent_comment_id, updated_comment.deleted_at,
      coalesce(sp.display_name, s.full_name) AS author_name,
      am.storage_key AS author_photo_key,
      coalesce((SELECT jsonb_agg(jsonb_build_object('student_id', men.student_id, 'matched_username', men.matched_username,
                  'username', ms.username, 'name', coalesce(msp.display_name, ms.full_name), 'photo_key', mam.storage_key))
                FROM socialu.comment_mentions men
                JOIN socialu.students ms ON ms.student_id = men.student_id AND ms.is_active
                LEFT JOIN socialu.student_profiles msp ON msp.student_id = ms.student_id
                LEFT JOIN socialu.media_assets mam ON mam.asset_id = msp.photo_id
                WHERE men.comment_id = updated_comment.comment_id), '[]'::jsonb) AS mentions,
      (SELECT jsonb_build_object(
        'like', count(*) FILTER (WHERE reaction = 'like'), 'love', count(*) FILTER (WHERE reaction = 'love'),
        'haha', count(*) FILTER (WHERE reaction = 'haha'), 'wow', count(*) FILTER (WHERE reaction = 'wow'),
        'sad', count(*) FILTER (WHERE reaction = 'sad'), 'care', count(*) FILTER (WHERE reaction = 'care')
      ) FROM socialu.comment_reactions cr WHERE cr.comment_id = updated_comment.comment_id) AS reaction_counts,
      (SELECT reaction FROM socialu.comment_reactions cr WHERE cr.comment_id = updated_comment.comment_id AND cr.student_id = me) AS my_reaction
    FROM socialu.students s
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE s.student_id = me
  ) c;
  RETURN result;
END;
$$;

-- Whisper Wall reaction RPCs: bodies unchanged apart from the renamed
-- 6-key vocabulary (see header) -- logic, authorization, and the
-- anonymity guarantees are identical to 20261028000200_whisper_reactions_expansion.sql.

CREATE OR REPLACE FUNCTION public.socialu_whisper_react(p_auth_id UUID, p_confession_id BIGINT, p_reaction TEXT DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  PERFORM socialu.require_school_confession(p_auth_id, p_confession_id);
  me := public.socialu_require_student(p_auth_id);
  IF p_reaction IS NULL THEN
    DELETE FROM socialu.whisper_reactions WHERE confession_id = p_confession_id AND student_id = me;
  ELSE
    IF p_reaction NOT IN ('like','love','haha','wow','sad','care') THEN
      RAISE EXCEPTION 'Choose a valid reaction.' USING ERRCODE = '22023';
    END IF;
    INSERT INTO socialu.whisper_reactions (confession_id, student_id, reaction) VALUES (p_confession_id, me, p_reaction)
      ON CONFLICT (confession_id, student_id) DO UPDATE SET reaction = EXCLUDED.reaction;
  END IF;

  SELECT jsonb_build_object(
    'reaction_counts', jsonb_build_object(
      'like', count(*) FILTER (WHERE reaction = 'like'), 'love', count(*) FILTER (WHERE reaction = 'love'),
      'haha', count(*) FILTER (WHERE reaction = 'haha'), 'wow', count(*) FILTER (WHERE reaction = 'wow'),
      'sad', count(*) FILTER (WHERE reaction = 'sad'), 'care', count(*) FILTER (WHERE reaction = 'care')
    ),
    'my_reaction', p_reaction
  ) INTO result FROM socialu.whisper_reactions WHERE confession_id = p_confession_id;
  RETURN coalesce(result, jsonb_build_object('reaction_counts',
    jsonb_build_object('like',0,'love',0,'haha',0,'wow',0,'sad',0,'care',0), 'my_reaction', NULL));
END;
$$;

CREATE OR REPLACE FUNCTION public.socialu_whisper_react_comment(p_auth_id UUID, p_comment_id BIGINT, p_reaction TEXT DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; target_confession_id BIGINT; tombstoned TIMESTAMPTZ; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT confession_id, deleted_at INTO target_confession_id, tombstoned FROM socialu.whisper_comments WHERE comment_id = p_comment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
  PERFORM socialu.require_school_confession(p_auth_id, target_confession_id);
  IF tombstoned IS NOT NULL THEN RAISE EXCEPTION 'This comment is no longer available.' USING ERRCODE = 'P0002'; END IF;

  IF p_reaction IS NULL THEN
    DELETE FROM socialu.whisper_comment_reactions WHERE comment_id = p_comment_id AND student_id = me;
  ELSE
    IF p_reaction NOT IN ('like','love','haha','wow','sad','care') THEN
      RAISE EXCEPTION 'Choose a valid reaction.' USING ERRCODE = '22023';
    END IF;
    INSERT INTO socialu.whisper_comment_reactions (comment_id, student_id, reaction) VALUES (p_comment_id, me, p_reaction)
      ON CONFLICT (comment_id, student_id) DO UPDATE SET reaction = EXCLUDED.reaction;
  END IF;

  SELECT jsonb_build_object(
    'reaction_counts', jsonb_build_object(
      'like', count(*) FILTER (WHERE reaction = 'like'), 'love', count(*) FILTER (WHERE reaction = 'love'),
      'haha', count(*) FILTER (WHERE reaction = 'haha'), 'wow', count(*) FILTER (WHERE reaction = 'wow'),
      'sad', count(*) FILTER (WHERE reaction = 'sad'), 'care', count(*) FILTER (WHERE reaction = 'care')
    ),
    'my_reaction', p_reaction
  ) INTO result FROM socialu.whisper_comment_reactions WHERE comment_id = p_comment_id;
  RETURN coalesce(result, jsonb_build_object('reaction_counts',
    jsonb_build_object('like',0,'love',0,'haha',0,'wow',0,'sad',0,'care',0), 'my_reaction', NULL));
END;
$$;

CREATE OR REPLACE FUNCTION public.socialu_whisper_list(p_auth_id UUID, p_category TEXT DEFAULT NULL, p_sort TEXT DEFAULT 'latest', p_offset INTEGER DEFAULT 0) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_category IS NOT NULL AND p_category NOT IN ('funny','campus_crush','embarrassing','rant','advice','unpopular_opinion') THEN
    RAISE EXCEPTION 'Choose a valid category.' USING ERRCODE = '22023';
  END IF;
  IF p_sort NOT IN ('latest','trending','most_discussed') THEN
    RAISE EXCEPTION 'Choose a valid sort.' USING ERRCODE = '22023';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(ranked) ORDER BY ranked.sort_key DESC), '[]'::jsonb) INTO result FROM (
    SELECT c.confession_id, c.category, c.text_content, c.created_at,
      c.author_id = me AS is_own,
      (SELECT jsonb_build_object(
        'like', count(*) FILTER (WHERE reaction = 'like'), 'love', count(*) FILTER (WHERE reaction = 'love'),
        'haha', count(*) FILTER (WHERE reaction = 'haha'), 'wow', count(*) FILTER (WHERE reaction = 'wow'),
        'sad', count(*) FILTER (WHERE reaction = 'sad'), 'care', count(*) FILTER (WHERE reaction = 'care')
      ) FROM socialu.whisper_reactions wr WHERE wr.confession_id = c.confession_id) AS reaction_counts,
      (SELECT reaction FROM socialu.whisper_reactions wr WHERE wr.confession_id = c.confession_id AND wr.student_id = me) AS my_reaction,
      (SELECT count(*) FROM socialu.whisper_comments wc WHERE wc.confession_id = c.confession_id AND wc.deleted_at IS NULL) AS comment_count,
      (CASE p_sort
        WHEN 'trending' THEN
          ((SELECT count(*) FROM socialu.whisper_reactions wr WHERE wr.confession_id = c.confession_id) * 2
           + (SELECT count(*) FROM socialu.whisper_comments wc WHERE wc.confession_id = c.confession_id AND wc.deleted_at IS NULL))::DOUBLE PRECISION
          - extract(epoch FROM (CURRENT_TIMESTAMP - c.created_at)) / 3600 * 0.5
        WHEN 'most_discussed' THEN
          (SELECT count(*) FROM socialu.whisper_comments wc WHERE wc.confession_id = c.confession_id AND wc.deleted_at IS NULL)::DOUBLE PRECISION
        ELSE extract(epoch FROM c.created_at)
      END) AS sort_key
    FROM socialu.whisper_confessions c
    WHERE socialu.same_school(me, c.author_id)
      AND (p_category IS NULL OR c.category = p_category)
    ORDER BY sort_key DESC
    LIMIT 20 OFFSET p_offset
  ) ranked;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.socialu_whisper_create(p_auth_id UUID, p_category TEXT, p_text TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; clean_text TEXT; new_row socialu.whisper_confessions%ROWTYPE; last_at TIMESTAMPTZ; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_category IS NULL OR p_category NOT IN ('funny','campus_crush','embarrassing','rant','advice','unpopular_opinion') THEN
    RAISE EXCEPTION 'Choose a valid category.' USING ERRCODE = '22023';
  END IF;
  clean_text := btrim(coalesce(p_text, ''));
  IF clean_text = '' OR char_length(clean_text) > 500 THEN
    RAISE EXCEPTION 'Share a confession of up to 500 characters.' USING ERRCODE = '22023';
  END IF;

  SELECT max(created_at) INTO last_at FROM socialu.whisper_confessions WHERE author_id = me;
  IF last_at IS NOT NULL AND last_at > CURRENT_TIMESTAMP - INTERVAL '2 minutes' THEN
    RAISE EXCEPTION 'Please wait a moment before posting another confession.' USING ERRCODE = '55000';
  END IF;

  INSERT INTO socialu.whisper_confessions (author_id, category, text_content) VALUES (me, p_category, clean_text)
    RETURNING * INTO new_row;

  SELECT jsonb_build_object(
    'confession_id', new_row.confession_id, 'category', new_row.category, 'text_content', new_row.text_content,
    'created_at', new_row.created_at, 'is_own', TRUE,
    'reaction_counts', jsonb_build_object('like',0,'love',0,'haha',0,'wow',0,'sad',0,'care',0),
    'my_reaction', NULL, 'comment_count', 0
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.socialu_whisper_list_comments(p_auth_id UUID, p_confession_id BIGINT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; confession_author BIGINT; result JSONB;
BEGIN
  PERFORM socialu.require_school_confession(p_auth_id, p_confession_id);
  me := public.socialu_require_student(p_auth_id);
  SELECT author_id INTO confession_author FROM socialu.whisper_confessions WHERE confession_id = p_confession_id;

  SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.created_at ASC), '[]'::jsonb) INTO result FROM (
    SELECT wc.comment_id, wc.confession_id, wc.parent_comment_id, wc.text_content, wc.created_at, wc.edited_at,
      (wc.deleted_at IS NOT NULL) AS is_deleted,
      wc.author_id = me AS is_own,
      wc.author_id = confession_author AS is_op,
      CASE WHEN wc.author_id = confession_author THEN 'Original Poster'
           ELSE 'Anonymous Student ' || (SELECT wp.alias_number FROM socialu.whisper_participants wp
                  WHERE wp.confession_id = p_confession_id AND wp.student_id = wc.author_id)
      END AS alias_label,
      (SELECT jsonb_build_object(
        'like', count(*) FILTER (WHERE reaction = 'like'), 'love', count(*) FILTER (WHERE reaction = 'love'),
        'haha', count(*) FILTER (WHERE reaction = 'haha'), 'wow', count(*) FILTER (WHERE reaction = 'wow'),
        'sad', count(*) FILTER (WHERE reaction = 'sad'), 'care', count(*) FILTER (WHERE reaction = 'care')
      ) FROM socialu.whisper_comment_reactions wcr WHERE wcr.comment_id = wc.comment_id) AS reaction_counts,
      (SELECT reaction FROM socialu.whisper_comment_reactions wcr WHERE wcr.comment_id = wc.comment_id AND wcr.student_id = me) AS my_reaction,
      coalesce((SELECT jsonb_agg(jsonb_build_object('student_id', men.student_id, 'matched_username', men.matched_username,
                  'username', ms.username, 'name', coalesce(msp.display_name, ms.full_name), 'photo_key', mam.storage_key))
                FROM socialu.whisper_comment_mentions men
                JOIN socialu.students ms ON ms.student_id = men.student_id AND ms.is_active
                LEFT JOIN socialu.student_profiles msp ON msp.student_id = ms.student_id
                LEFT JOIN socialu.media_assets mam ON mam.asset_id = msp.photo_id
                WHERE men.comment_id = wc.comment_id), '[]'::jsonb) AS mentions
    FROM socialu.whisper_comments wc
    WHERE wc.confession_id = p_confession_id
  ) c;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.socialu_whisper_create_comment(
  p_auth_id UUID, p_confession_id BIGINT, p_text TEXT, p_parent_comment_id BIGINT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me BIGINT; confession_author BIGINT; clean_text TEXT; last_at TIMESTAMPTZ;
  target_confession BIGINT; target_parent BIGINT; actual_parent BIGINT;
  new_comment socialu.whisper_comments%ROWTYPE; alias INTEGER; label TEXT; result JSONB;
BEGIN
  PERFORM socialu.require_school_confession(p_auth_id, p_confession_id);
  me := public.socialu_require_student(p_auth_id);
  clean_text := btrim(coalesce(p_text, ''));
  IF clean_text = '' OR char_length(clean_text) > 300 THEN
    RAISE EXCEPTION 'Share a comment of up to 300 characters.' USING ERRCODE = '22023';
  END IF;

  SELECT max(created_at) INTO last_at FROM socialu.whisper_comments WHERE author_id = me;
  IF last_at IS NOT NULL AND last_at > CURRENT_TIMESTAMP - INTERVAL '15 seconds' THEN
    RAISE EXCEPTION 'Please wait a moment before commenting again.' USING ERRCODE = '55000';
  END IF;

  SELECT author_id INTO confession_author FROM socialu.whisper_confessions WHERE confession_id = p_confession_id;

  IF p_parent_comment_id IS NOT NULL THEN
    SELECT confession_id, parent_comment_id INTO target_confession, target_parent
    FROM socialu.whisper_comments WHERE comment_id = p_parent_comment_id;
    IF NOT FOUND OR target_confession <> p_confession_id THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
    actual_parent := coalesce(target_parent, p_parent_comment_id);
  END IF;

  PERFORM 1 FROM socialu.whisper_confessions WHERE confession_id = p_confession_id FOR UPDATE;
  IF me <> confession_author THEN
    SELECT alias_number INTO alias FROM socialu.whisper_participants WHERE confession_id = p_confession_id AND student_id = me;
    IF alias IS NULL THEN
      INSERT INTO socialu.whisper_participants (confession_id, student_id, alias_number)
        VALUES (p_confession_id, me, coalesce((SELECT max(alias_number) FROM socialu.whisper_participants WHERE confession_id = p_confession_id), 0) + 1)
        RETURNING alias_number INTO alias;
    END IF;
  END IF;

  INSERT INTO socialu.whisper_comments (confession_id, author_id, parent_comment_id, text_content)
    VALUES (p_confession_id, me, actual_parent, clean_text) RETURNING * INTO new_comment;

  PERFORM socialu.sync_whisper_mentions(new_comment.comment_id, p_confession_id, me, clean_text);

  IF me <> confession_author THEN
    INSERT INTO socialu.notifications (recipient_id, actor_id, kind, whisper_comment_id)
    VALUES (confession_author, me, 'whisper_comment', new_comment.comment_id);
  END IF;

  label := CASE WHEN me = confession_author THEN 'Original Poster' ELSE 'Anonymous Student ' || alias END;
  SELECT jsonb_build_object(
    'comment_id', new_comment.comment_id, 'confession_id', new_comment.confession_id,
    'parent_comment_id', new_comment.parent_comment_id, 'text_content', new_comment.text_content,
    'created_at', new_comment.created_at, 'edited_at', new_comment.edited_at, 'is_deleted', FALSE,
    'is_own', TRUE, 'is_op', me = confession_author, 'alias_label', label, 'mentions', '[]'::jsonb,
    'reaction_counts', jsonb_build_object('like',0,'love',0,'haha',0,'wow',0,'sad',0,'care',0), 'my_reaction', NULL
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.socialu_whisper_update_comment(p_auth_id UUID, p_comment_id BIGINT, p_text TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me BIGINT; author BIGINT; tombstoned TIMESTAMPTZ; target_confession_id BIGINT; confession_author BIGINT;
  clean_text TEXT; updated_comment socialu.whisper_comments%ROWTYPE; alias INTEGER; label TEXT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  clean_text := btrim(coalesce(p_text, ''));
  IF clean_text = '' OR char_length(clean_text) > 300 THEN
    RAISE EXCEPTION 'Share a comment of up to 300 characters.' USING ERRCODE = '22023';
  END IF;
  SELECT author_id, deleted_at, confession_id INTO author, tombstoned, target_confession_id
  FROM socialu.whisper_comments WHERE comment_id = p_comment_id;
  IF NOT FOUND OR tombstoned IS NOT NULL THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
  PERFORM socialu.require_school_confession(p_auth_id, target_confession_id);
  IF author <> me THEN RAISE EXCEPTION 'Only the comment author can edit this comment.' USING ERRCODE = '42501'; END IF;

  UPDATE socialu.whisper_comments SET text_content = clean_text, edited_at = CURRENT_TIMESTAMP
    WHERE comment_id = p_comment_id RETURNING * INTO updated_comment;
  PERFORM socialu.sync_whisper_mentions(p_comment_id, target_confession_id, me, clean_text);

  SELECT author_id INTO confession_author FROM socialu.whisper_confessions WHERE confession_id = target_confession_id;
  SELECT alias_number INTO alias FROM socialu.whisper_participants WHERE confession_id = target_confession_id AND student_id = me;
  label := CASE WHEN me = confession_author THEN 'Original Poster' ELSE 'Anonymous Student ' || alias END;

  SELECT jsonb_build_object(
    'comment_id', updated_comment.comment_id, 'confession_id', updated_comment.confession_id,
    'parent_comment_id', updated_comment.parent_comment_id, 'text_content', updated_comment.text_content,
    'created_at', updated_comment.created_at, 'edited_at', updated_comment.edited_at, 'is_deleted', FALSE,
    'is_own', TRUE, 'is_op', me = confession_author, 'alias_label', label,
    'mentions', coalesce((SELECT jsonb_agg(jsonb_build_object('student_id', men.student_id, 'matched_username', men.matched_username,
                  'username', ms.username, 'name', coalesce(msp.display_name, ms.full_name), 'photo_key', mam.storage_key))
                FROM socialu.whisper_comment_mentions men
                JOIN socialu.students ms ON ms.student_id = men.student_id AND ms.is_active
                LEFT JOIN socialu.student_profiles msp ON msp.student_id = ms.student_id
                LEFT JOIN socialu.media_assets mam ON mam.asset_id = msp.photo_id
                WHERE men.comment_id = updated_comment.comment_id), '[]'::jsonb),
    'reaction_counts', (SELECT jsonb_build_object(
        'like', count(*) FILTER (WHERE reaction = 'like'), 'love', count(*) FILTER (WHERE reaction = 'love'),
        'haha', count(*) FILTER (WHERE reaction = 'haha'), 'wow', count(*) FILTER (WHERE reaction = 'wow'),
        'sad', count(*) FILTER (WHERE reaction = 'sad'), 'care', count(*) FILTER (WHERE reaction = 'care')
      ) FROM socialu.whisper_comment_reactions wcr WHERE wcr.comment_id = updated_comment.comment_id),
    'my_reaction', (SELECT reaction FROM socialu.whisper_comment_reactions wcr WHERE wcr.comment_id = updated_comment.comment_id AND wcr.student_id = me)
  ) INTO result;
  RETURN result;
END;
$$;

NOTIFY pgrst, 'reload schema';
