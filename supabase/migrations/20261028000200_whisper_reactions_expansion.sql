-- The Whisper Wall: expand reactions from 3 to 6 (funny/support/shocked/
-- love/sad/fire), rename the two kept-but-relabeled ones in place (old
-- 'relatable' -> 'funny', same emoji 😂; old 'no_way' -> 'shocked', same
-- emoji 😮; 'support' is unchanged), and add the same reaction mechanism
-- to comments/replies, which previously had none at all. One active
-- reaction per student per confession/comment stays enforced the same way
-- as before -- a composite PRIMARY KEY plus UPSERT -- never a trigger or
-- app-layer check that could be bypassed by calling the RPC directly.

UPDATE socialu.whisper_reactions SET reaction = 'funny' WHERE reaction = 'relatable';
UPDATE socialu.whisper_reactions SET reaction = 'shocked' WHERE reaction = 'no_way';

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'socialu.whisper_reactions'::regclass AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE socialu.whisper_reactions DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
ALTER TABLE socialu.whisper_reactions
  ADD CONSTRAINT whisper_reactions_reaction_check CHECK (reaction IN ('funny','support','shocked','love','sad','fire'));

-- Comment/reply reactions: exact structural mirror of whisper_reactions
-- (same PRIMARY KEY shape -> one reaction per student per comment,
-- same REVOKE lockdown as every other identity-adjacent Whisper table).
CREATE TABLE socialu.whisper_comment_reactions (
    comment_id BIGINT NOT NULL REFERENCES socialu.whisper_comments(comment_id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES socialu.students(student_id),
    reaction TEXT NOT NULL CHECK (reaction IN ('funny','support','shocked','love','sad','fire')),
    PRIMARY KEY (comment_id, student_id)
);
REVOKE ALL ON socialu.whisper_comment_reactions FROM PUBLIC, anon, authenticated;

-- Confession reactions: same UPSERT/DELETE shape as before, now widened to
-- 6 reaction keys.
CREATE OR REPLACE FUNCTION public.socialu_whisper_react(p_auth_id UUID, p_confession_id BIGINT, p_reaction TEXT DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  PERFORM socialu.require_school_confession(p_auth_id, p_confession_id);
  me := public.socialu_require_student(p_auth_id);
  IF p_reaction IS NULL THEN
    DELETE FROM socialu.whisper_reactions WHERE confession_id = p_confession_id AND student_id = me;
  ELSE
    IF p_reaction NOT IN ('funny','support','shocked','love','sad','fire') THEN
      RAISE EXCEPTION 'Choose a valid reaction.' USING ERRCODE = '22023';
    END IF;
    INSERT INTO socialu.whisper_reactions (confession_id, student_id, reaction) VALUES (p_confession_id, me, p_reaction)
      ON CONFLICT (confession_id, student_id) DO UPDATE SET reaction = EXCLUDED.reaction;
  END IF;

  SELECT jsonb_build_object(
    'reaction_counts', jsonb_build_object(
      'funny', count(*) FILTER (WHERE reaction = 'funny'),
      'support', count(*) FILTER (WHERE reaction = 'support'),
      'shocked', count(*) FILTER (WHERE reaction = 'shocked'),
      'love', count(*) FILTER (WHERE reaction = 'love'),
      'sad', count(*) FILTER (WHERE reaction = 'sad'),
      'fire', count(*) FILTER (WHERE reaction = 'fire')
    ),
    'my_reaction', p_reaction
  ) INTO result FROM socialu.whisper_reactions WHERE confession_id = p_confession_id;
  RETURN coalesce(result, jsonb_build_object('reaction_counts',
    jsonb_build_object('funny',0,'support',0,'shocked',0,'love',0,'sad',0,'fire',0), 'my_reaction', NULL));
END;
$$;

-- Comment/reply reactions: same shape as socialu_whisper_react, scoped to
-- a comment instead of a confession. Resolves the owning confession first
-- (for the same_school boundary check) and refuses to react to a
-- tombstoned comment, since there's nothing left to react to.
CREATE FUNCTION public.socialu_whisper_react_comment(p_auth_id UUID, p_comment_id BIGINT, p_reaction TEXT DEFAULT NULL) RETURNS JSONB
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
    IF p_reaction NOT IN ('funny','support','shocked','love','sad','fire') THEN
      RAISE EXCEPTION 'Choose a valid reaction.' USING ERRCODE = '22023';
    END IF;
    INSERT INTO socialu.whisper_comment_reactions (comment_id, student_id, reaction) VALUES (p_comment_id, me, p_reaction)
      ON CONFLICT (comment_id, student_id) DO UPDATE SET reaction = EXCLUDED.reaction;
  END IF;

  SELECT jsonb_build_object(
    'reaction_counts', jsonb_build_object(
      'funny', count(*) FILTER (WHERE reaction = 'funny'),
      'support', count(*) FILTER (WHERE reaction = 'support'),
      'shocked', count(*) FILTER (WHERE reaction = 'shocked'),
      'love', count(*) FILTER (WHERE reaction = 'love'),
      'sad', count(*) FILTER (WHERE reaction = 'sad'),
      'fire', count(*) FILTER (WHERE reaction = 'fire')
    ),
    'my_reaction', p_reaction
  ) INTO result FROM socialu.whisper_comment_reactions WHERE comment_id = p_comment_id;
  RETURN coalesce(result, jsonb_build_object('reaction_counts',
    jsonb_build_object('funny',0,'support',0,'shocked',0,'love',0,'sad',0,'fire',0), 'my_reaction', NULL));
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_whisper_react_comment(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_whisper_react_comment(UUID, BIGINT, TEXT) TO service_role;

-- socialu_whisper_list: same ranked-subquery shape as before, reaction_counts
-- widened to 6 keys. Trending's score math is unaffected (it only uses a
-- raw count(*) across all reactions, not per-key).
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
        'funny', count(*) FILTER (WHERE reaction = 'funny'),
        'support', count(*) FILTER (WHERE reaction = 'support'),
        'shocked', count(*) FILTER (WHERE reaction = 'shocked'),
        'love', count(*) FILTER (WHERE reaction = 'love'),
        'sad', count(*) FILTER (WHERE reaction = 'sad'),
        'fire', count(*) FILTER (WHERE reaction = 'fire')
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

-- socialu_whisper_create: default zero reaction_counts widened to 6 keys.
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
    'reaction_counts', jsonb_build_object('funny',0,'support',0,'shocked',0,'love',0,'sad',0,'fire',0),
    'my_reaction', NULL, 'comment_count', 0
  ) INTO result;
  RETURN result;
END;
$$;

-- socialu_whisper_list_comments: now also resolves each comment's own
-- reaction_counts/my_reaction, same per-row subquery shape used for
-- confessions above.
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
        'funny', count(*) FILTER (WHERE reaction = 'funny'),
        'support', count(*) FILTER (WHERE reaction = 'support'),
        'shocked', count(*) FILTER (WHERE reaction = 'shocked'),
        'love', count(*) FILTER (WHERE reaction = 'love'),
        'sad', count(*) FILTER (WHERE reaction = 'sad'),
        'fire', count(*) FILTER (WHERE reaction = 'fire')
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

-- socialu_whisper_create_comment: the create response now also carries a
-- fresh zero reaction_counts/my_reaction (there's nothing to react to yet),
-- matching the shape listComments/update now also return.
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
    'reaction_counts', jsonb_build_object('funny',0,'support',0,'shocked',0,'love',0,'sad',0,'fire',0), 'my_reaction', NULL
  ) INTO result;
  RETURN result;
END;
$$;

-- socialu_whisper_update_comment: the edit response now also carries the
-- comment's CURRENT reaction_counts/my_reaction (editing text never resets
-- reactions, so the response should reflect what's actually still there
-- rather than zeros).
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
        'funny', count(*) FILTER (WHERE reaction = 'funny'),
        'support', count(*) FILTER (WHERE reaction = 'support'),
        'shocked', count(*) FILTER (WHERE reaction = 'shocked'),
        'love', count(*) FILTER (WHERE reaction = 'love'),
        'sad', count(*) FILTER (WHERE reaction = 'sad'),
        'fire', count(*) FILTER (WHERE reaction = 'fire')
      ) FROM socialu.whisper_comment_reactions wcr WHERE wcr.comment_id = updated_comment.comment_id),
    'my_reaction', (SELECT reaction FROM socialu.whisper_comment_reactions wcr WHERE wcr.comment_id = updated_comment.comment_id AND wcr.student_id = me)
  ) INTO result;
  RETURN result;
END;
$$;

NOTIFY pgrst, 'reload schema';
