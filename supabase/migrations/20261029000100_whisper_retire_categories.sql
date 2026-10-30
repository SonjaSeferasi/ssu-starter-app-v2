-- SocialU | The Whisper Wall: retire the funny/embarrassing/rant
-- categories, keeping only campus_crush/unpopular_opinion/advice for NEW
-- confessions. Additional functionality, not in the official SRS.
--
-- Deliberately NOT touching socialu.whisper_confessions.category or its
-- CHECK constraint -- that constraint already accepts all 6 original
-- values and stays exactly as-is, so every historical confession already
-- created in a retired category keeps its real category value, keeps
-- showing up in socialu_whisper_list (All Categories, any sort), and
-- keeps working normally for comments/reactions/reports -- none of those
-- RPCs filter or branch on category at all. Only socialu_whisper_create's
-- own validation narrows, so a student can no longer CHOOSE a retired
-- category for a brand-new confession; nothing retroactively changes.
-- There is no socialu_whisper_update (confessions were never editable),
-- so "preserve category unless explicitly changed" doesn't apply here.
CREATE OR REPLACE FUNCTION public.socialu_whisper_create(p_auth_id UUID, p_category TEXT, p_text TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; clean_text TEXT; new_row socialu.whisper_confessions%ROWTYPE; last_at TIMESTAMPTZ; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_category IS NULL OR p_category NOT IN ('campus_crush','advice','unpopular_opinion') THEN
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
