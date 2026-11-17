-- #1213 (The Whisper Wall -- post a confession, additional functionality):
-- two problems in socialu_whisper_create's posting cooldown.
--
-- 1. The message said "a moment" for what is actually a fixed 2-minute
--    wait, with no indication of how long is actually left -- a student
--    reading "a moment" is likely to retry repeatedly and conclude the
--    composer is broken. Fixed by reporting the actual remaining time.
--
-- 2. The cooldown was derived from max(created_at) over the author's
--    EXISTING confessions, and confessions are hard-deleted -- so
--    post -> delete -> post immediately bypassed the limit entirely,
--    while a student who keeps their confession waits the full 2
--    minutes. Fixed by tracking the last-post time on the student record
--    itself (a new column, independent of any row that can be deleted)
--    instead of deriving it from rows that might not exist anymore.
--
-- This is a full CREATE OR REPLACE copy of the function from
-- 20261029000100_whisper_retire_categories.sql with these two changes;
-- every other check, grant, and the category/length validation is
-- unchanged.

ALTER TABLE socialu.students ADD COLUMN last_whisper_posted_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.socialu_whisper_create(p_auth_id UUID, p_category TEXT, p_text TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; clean_text TEXT; new_row socialu.whisper_confessions%ROWTYPE; last_at TIMESTAMPTZ;
  remaining_seconds INTEGER; remaining_minutes INTEGER; wait_message TEXT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_category IS NULL OR p_category NOT IN ('campus_crush','advice','unpopular_opinion') THEN
    RAISE EXCEPTION 'Choose a valid category.' USING ERRCODE = '22023';
  END IF;
  clean_text := btrim(coalesce(p_text, ''));
  IF clean_text = '' OR char_length(clean_text) > 500 THEN
    RAISE EXCEPTION 'Share a confession of up to 500 characters.' USING ERRCODE = '22023';
  END IF;

  SELECT last_whisper_posted_at INTO last_at FROM socialu.students WHERE student_id = me;
  IF last_at IS NOT NULL AND last_at > CURRENT_TIMESTAMP - INTERVAL '2 minutes' THEN
    remaining_seconds := ceil(extract(epoch FROM (last_at + INTERVAL '2 minutes' - CURRENT_TIMESTAMP)));
    remaining_minutes := ceil(remaining_seconds / 60.0);
    wait_message := CASE
      WHEN remaining_seconds <= 30 THEN 'You can post again in less than a minute.'
      WHEN remaining_minutes <= 1 THEN 'You can post again in about a minute.'
      ELSE 'You can post again in about ' || remaining_minutes || ' minutes.'
    END;
    RAISE EXCEPTION '%', wait_message USING ERRCODE = '55000';
  END IF;

  INSERT INTO socialu.whisper_confessions (author_id, category, text_content) VALUES (me, p_category, clean_text)
    RETURNING * INTO new_row;
  UPDATE socialu.students SET last_whisper_posted_at = new_row.created_at WHERE student_id = me;

  SELECT jsonb_build_object(
    'confession_id', new_row.confession_id, 'category', new_row.category, 'text_content', new_row.text_content,
    'created_at', new_row.created_at, 'is_own', TRUE,
    'reaction_counts', jsonb_build_object('like',0,'love',0,'haha',0,'wow',0,'sad',0,'care',0),
    'my_reaction', NULL, 'comment_count', 0
  ) INTO result;
  RETURN result;
END;
$$;
