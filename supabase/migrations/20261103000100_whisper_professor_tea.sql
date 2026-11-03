-- SocialU | The Whisper Wall: add a fourth active category, Professor
-- Tea (professor_tea) -- funny/relatable/interesting experiences about
-- professors and classes. Additional functionality, not in the official
-- SRS, same spirit as 20261029000100's category retirement.
--
-- Deliberately a pure ADDITION, not a reopening of the three already-
-- retired categories (funny/embarrassing/rant stay exactly as retired as
-- 20261029000100 left them) -- this migration only ever appends
-- 'professor_tea' to value lists, never removes or reorders an existing
-- one, so every historical confession/comment/reaction/report keeps
-- working completely unchanged.
--
-- Unlike the earlier retirement (which only had to narrow
-- socialu_whisper_create's own validation, since the table's CHECK
-- constraint already accepted all 6 original values), professor_tea is a
-- genuinely NEW value that doesn't exist in the original CHECK at all --
-- so this migration widens that constraint too, using the same
-- find-and-drop-by-introspection DO-block pattern already used for
-- header_theme (20261029000300) and the reaction vocabulary expansions,
-- never hardcoding the Postgres-generated constraint name.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'socialu.whisper_confessions'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%category%'
  LOOP
    EXECUTE format('ALTER TABLE socialu.whisper_confessions DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE socialu.whisper_confessions
  ADD CONSTRAINT whisper_confessions_category_check CHECK (category IN
    ('funny','campus_crush','embarrassing','rant','advice','unpopular_opinion','professor_tea'));

-- socialu_whisper_list: only the p_category filter-validation list widens,
-- to let students filter the feed BY professor_tea. Everything else in
-- this function is byte-for-byte identical to its current live definition
-- (20261028000300_global_reaction_system.sql) -- not re-deriving any of
-- the reaction/sort/pagination logic, just widening the one allow-list.
CREATE OR REPLACE FUNCTION public.socialu_whisper_list(p_auth_id UUID, p_category TEXT DEFAULT NULL, p_sort TEXT DEFAULT 'latest', p_offset INTEGER DEFAULT 0) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_category IS NOT NULL AND p_category NOT IN ('funny','campus_crush','embarrassing','rant','advice','unpopular_opinion','professor_tea') THEN
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

-- socialu_whisper_create: the creatable-category list widens from the
-- three active categories (campus_crush/unpopular_opinion/advice, set by
-- 20261029000100) to include professor_tea as a fourth. funny/
-- embarrassing/rant stay exactly as excluded as they already were --
-- this migration does not reopen them. Everything else in this function
-- (text length, posting cooldown, return shape) is unchanged.
CREATE OR REPLACE FUNCTION public.socialu_whisper_create(p_auth_id UUID, p_category TEXT, p_text TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; clean_text TEXT; new_row socialu.whisper_confessions%ROWTYPE; last_at TIMESTAMPTZ; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_category IS NULL OR p_category NOT IN ('campus_crush','advice','unpopular_opinion','professor_tea') THEN
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

NOTIFY pgrst, 'reload schema';
