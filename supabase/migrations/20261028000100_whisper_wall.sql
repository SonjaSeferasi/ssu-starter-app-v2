-- SocialU | The Whisper Wall: anonymous campus confessions, additional
-- functionality not in the official SRS. Approved plan on file
-- (sharded-stirring-riddle). Fully parallel to posts/post_comments --
-- deliberately not reusing them -- with real identities only ever used
-- inside a function to compute a boolean, never returned to a non-owner
-- viewer. Every student-boundary-crossing RPC here includes an explicit
-- same_school check from the start, learned directly from
-- 20261027000300_restore_school_isolation.sql.

-- Campus Crush opt-out: a student who sets this can never be suggested or
-- validated as a mention target in Campus Crush comments, regardless of
-- whether the composer's own suggestion list is bypassed by typing the
-- handle manually (enforced server-side in sync_whisper_mentions below,
-- not just in the candidate-search RPC).
ALTER TABLE socialu.students ADD COLUMN campus_crush_opt_out BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE socialu.whisper_confessions (
    confession_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    author_id BIGINT NOT NULL REFERENCES socialu.students(student_id),
    category TEXT NOT NULL CHECK (category IN ('funny','campus_crush','embarrassing','rant','advice','unpopular_opinion')),
    text_content TEXT NOT NULL CHECK (btrim(text_content) <> '' AND char_length(text_content) <= 500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE socialu.whisper_comments (
    comment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    confession_id BIGINT NOT NULL REFERENCES socialu.whisper_confessions(confession_id) ON DELETE CASCADE,
    author_id BIGINT NOT NULL REFERENCES socialu.students(student_id),
    parent_comment_id BIGINT REFERENCES socialu.whisper_comments(comment_id),
    text_content TEXT NOT NULL CHECK (btrim(text_content) <> '' AND char_length(text_content) <= 300),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- The anonymity mechanism: a per-confession, per-student alias number,
-- assigned once on a student's first comment in that thread and reused for
-- every later comment/reply by the same student there. Independently
-- seeded per confession (never a global formula), so the same student's
-- alias numbers in two different confessions are unrelated -- there is no
-- way to correlate "Anonymous Student 3" across threads. The confession's
-- own author never gets a row here; they're labeled "Original Poster"
-- instead, computed by comparing author_id at read time.
CREATE TABLE socialu.whisper_participants (
    confession_id BIGINT NOT NULL REFERENCES socialu.whisper_confessions(confession_id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES socialu.students(student_id),
    alias_number INTEGER NOT NULL CHECK (alias_number > 0),
    PRIMARY KEY (confession_id, student_id),
    UNIQUE (confession_id, alias_number)
);
REVOKE ALL ON socialu.whisper_participants FROM PUBLIC, anon, authenticated;

CREATE TABLE socialu.whisper_reactions (
    confession_id BIGINT NOT NULL REFERENCES socialu.whisper_confessions(confession_id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES socialu.students(student_id),
    reaction TEXT NOT NULL CHECK (reaction IN ('relatable','support','no_way')),
    PRIMARY KEY (confession_id, student_id)
);
REVOKE ALL ON socialu.whisper_reactions FROM PUBLIC, anon, authenticated;

CREATE TABLE socialu.whisper_confession_reports (
    report_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    confession_id BIGINT NOT NULL REFERENCES socialu.whisper_confessions(confession_id) ON DELETE CASCADE,
    reporter_id BIGINT NOT NULL REFERENCES socialu.students(student_id),
    reason TEXT NOT NULL CHECK (reason IN ('harassment','private_info','threats','spam','inappropriate','other')),
    UNIQUE (confession_id, reporter_id)
);
REVOKE ALL ON socialu.whisper_confession_reports FROM PUBLIC, anon, authenticated;

CREATE TABLE socialu.whisper_comment_reports (
    report_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    comment_id BIGINT NOT NULL REFERENCES socialu.whisper_comments(comment_id) ON DELETE CASCADE,
    reporter_id BIGINT NOT NULL REFERENCES socialu.students(student_id),
    reason TEXT NOT NULL CHECK (reason IN ('harassment','private_info','threats','spam','inappropriate','other')),
    UNIQUE (comment_id, reporter_id)
);
REVOKE ALL ON socialu.whisper_comment_reports FROM PUBLIC, anon, authenticated;

CREATE TABLE socialu.whisper_comment_mentions (
    comment_id BIGINT NOT NULL REFERENCES socialu.whisper_comments(comment_id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES socialu.students(student_id) ON DELETE CASCADE,
    matched_username TEXT NOT NULL,
    PRIMARY KEY (comment_id, student_id)
);
REVOKE ALL ON socialu.whisper_comment_mentions FROM PUBLIC, anon, authenticated;

-- Severity-tiered auto-removal, mirroring apply_report_threshold() exactly
-- (same PERFORM ... FOR UPDATE then count-and-delete shape), but with two
-- thresholds: 2 distinct reporters for a severe reason (harassment/threats/
-- private_info) removes immediately; 5 distinct reporters for any reason
-- removes regardless. Confessions hard-delete (CASCADE clears comments/
-- reactions/participants, same model as posts); comments tombstone instead
-- (preserves replies, same as socialu_whisper_delete_comment below).
CREATE FUNCTION socialu.apply_whisper_confession_report_threshold() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
  PERFORM 1 FROM whisper_confessions WHERE confession_id = NEW.confession_id FOR UPDATE;
  IF (SELECT count(*) FROM whisper_confession_reports WHERE confession_id = NEW.confession_id
        AND reason IN ('harassment','threats','private_info')) >= 2
     OR (SELECT count(*) FROM whisper_confession_reports WHERE confession_id = NEW.confession_id) >= 5
  THEN DELETE FROM whisper_confessions WHERE confession_id = NEW.confession_id; END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER whisper_confession_report_threshold AFTER INSERT ON socialu.whisper_confession_reports
  FOR EACH ROW EXECUTE FUNCTION socialu.apply_whisper_confession_report_threshold();

CREATE FUNCTION socialu.apply_whisper_comment_report_threshold() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
  PERFORM 1 FROM whisper_comments WHERE comment_id = NEW.comment_id FOR UPDATE;
  IF ((SELECT count(*) FROM whisper_comment_reports WHERE comment_id = NEW.comment_id
        AND reason IN ('harassment','threats','private_info')) >= 2
     OR (SELECT count(*) FROM whisper_comment_reports WHERE comment_id = NEW.comment_id) >= 5)
     AND NOT EXISTS (SELECT 1 FROM whisper_comments WHERE comment_id = NEW.comment_id AND deleted_at IS NOT NULL)
  THEN UPDATE whisper_comments SET text_content = '[removed]', deleted_at = CURRENT_TIMESTAMP WHERE comment_id = NEW.comment_id; END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER whisper_comment_report_threshold AFTER INSERT ON socialu.whisper_comment_reports
  FOR EACH ROW EXECUTE FUNCTION socialu.apply_whisper_comment_report_threshold();

-- Boundary check for every RPC below that takes a confession_id, mirroring
-- socialu.require_school_post exactly: same_school is the first thing
-- checked, raising the same generic "not available" message so a
-- different-school confession is indistinguishable from a deleted one.
CREATE FUNCTION socialu.require_school_confession(p_auth_id UUID, p_confession_id BIGINT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT;
BEGIN
  IF p_confession_id IS NULL THEN RETURN; END IF;
  me := public.socialu_require_student(p_auth_id);
  IF NOT EXISTS (SELECT 1 FROM socialu.whisper_confessions c WHERE c.confession_id = p_confession_id AND socialu.same_school(me, c.author_id)) THEN
    RAISE EXCEPTION 'This confession isn''t available.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION socialu.require_school_confession(UUID, BIGINT) FROM PUBLIC, anon, authenticated;

-- Campus Crush mention resolution: only ever runs for the campus_crush
-- category (mentions are inert plain text in every other category), skips
-- any opted-out student, and -- critically -- is enforced here on the raw
-- text server-side, so typing @handle manually (bypassing the opt-out-aware
-- suggestion dropdown entirely) still produces nothing. No notification is
-- ever inserted for a Whisper mention, per the approved plan: the mentioned
-- student's identity is intentionally shown (the "guess" itself), but
-- finding out about it isn't proactively pushed to them in this version.
CREATE FUNCTION socialu.sync_whisper_mentions(p_comment_id BIGINT, p_confession_id BIGINT, p_actor_id BIGINT, p_text TEXT) RETURNS VOID
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
DECLARE
  confession_category TEXT; confession_author BIGINT;
  candidate TEXT; target BIGINT;
  current_targets BIGINT[] := ARRAY[]::BIGINT[];
BEGIN
  SELECT category, author_id INTO confession_category, confession_author FROM whisper_confessions WHERE confession_id = p_confession_id;
  IF confession_category IS DISTINCT FROM 'campus_crush' THEN RETURN; END IF;

  FOR candidate IN
    SELECT DISTINCT lower(m[1]) FROM regexp_matches(coalesce(p_text, ''), '@([A-Za-z0-9_.-]{1,50})', 'g') AS m
  LOOP
    SELECT student_id INTO target FROM students WHERE lower(username) = candidate AND is_active AND NOT campus_crush_opt_out;
    IF target IS NULL OR target = p_actor_id THEN CONTINUE; END IF;
    IF NOT same_school(target, confession_author) THEN CONTINUE; END IF;

    current_targets := array_append(current_targets, target);
    INSERT INTO whisper_comment_mentions (comment_id, student_id, matched_username) VALUES (p_comment_id, target, candidate)
      ON CONFLICT (comment_id, student_id) DO UPDATE SET matched_username = EXCLUDED.matched_username;
  END LOOP;

  DELETE FROM whisper_comment_mentions WHERE comment_id = p_comment_id AND NOT (student_id = ANY(current_targets));
END;
$$;

-- Opt-out-aware mention-candidate search for the Campus Crush composer --
-- a fork of socialu_campus_members (same same_school/active/verified/
-- not-blocked scoping) with campus_crush_opt_out excluded, so an opted-out
-- student never appears in the suggestion dropdown either.
-- Matches socialu_campus_members' exact convention: a plain JSONB array,
-- LIMIT 21, "is there more" computed by the caller from whether a 21st row
-- came back (see app/api/campus/members/route.ts) -- not a wrapped object.
CREATE FUNCTION public.socialu_whisper_mention_candidates(p_auth_id UUID, p_query TEXT DEFAULT '', p_offset INTEGER DEFAULT 0) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_offset IS NULL OR p_offset < 0 OR p_offset > 1000000 OR length(coalesce(p_query, '')) > 100 THEN
    RAISE EXCEPTION 'Invalid member search.' USING ERRCODE = '22023';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(member) ORDER BY lower(member.name), member.username), '[]'::jsonb)
  INTO result FROM (
    SELECT s.username, coalesce(p.display_name, s.full_name) AS name, m.storage_key AS photo_key, s.student_id = me AS is_me
    FROM socialu.students s
    JOIN auth.users a ON a.id = s.auth_user_id
    LEFT JOIN socialu.student_profiles p ON p.student_id = s.student_id
    LEFT JOIN socialu.media_assets m ON m.asset_id = p.photo_id
    WHERE socialu.same_school(me, s.student_id) AND s.is_active AND NOT s.reverification_required
      AND s.email_verified_at IS NOT NULL AND a.email_confirmed_at IS NOT NULL
      AND lower(a.email) = lower(s.university_email)
      AND NOT socialu.is_blocked(me, s.student_id)
      AND NOT s.campus_crush_opt_out
      AND (coalesce(btrim(p_query), '') = '' OR strpos(lower(s.username), lower(btrim(p_query))) > 0
        OR strpos(lower(coalesce(p.display_name, s.full_name)), lower(btrim(p_query))) > 0)
    ORDER BY lower(coalesce(p.display_name, s.full_name)), s.username
    LIMIT 21 OFFSET p_offset
  ) member;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_whisper_mention_candidates(UUID, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_whisper_mention_candidates(UUID, TEXT, INTEGER) TO service_role;

-- List confessions: same_school-scoped, optional category filter, three
-- sort modes. "trending" uses a simple, tunable, read-time-computed score
-- (no background job infrastructure, matching this app's existing
-- convention): (total reactions * 2 + comment_count) decayed by age in
-- hours. "most_discussed" is a pure comment-count sort. Never exposes
-- author_id or reporter_id anywhere in the shape.
CREATE FUNCTION public.socialu_whisper_list(p_auth_id UUID, p_category TEXT DEFAULT NULL, p_sort TEXT DEFAULT 'latest', p_offset INTEGER DEFAULT 0) RETURNS JSONB
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

  -- sort_key/LIMIT/OFFSET must apply at the row level, inside this inner
  -- subquery -- an outer ORDER BY/LIMIT on the jsonb_agg itself would only
  -- limit the single aggregated row, not the confessions going into it.
  SELECT coalesce(jsonb_agg(to_jsonb(ranked) ORDER BY ranked.sort_key DESC), '[]'::jsonb) INTO result FROM (
    SELECT c.confession_id, c.category, c.text_content, c.created_at,
      c.author_id = me AS is_own,
      (SELECT jsonb_build_object(
        'relatable', count(*) FILTER (WHERE reaction = 'relatable'),
        'support', count(*) FILTER (WHERE reaction = 'support'),
        'no_way', count(*) FILTER (WHERE reaction = 'no_way')
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
REVOKE ALL ON FUNCTION public.socialu_whisper_list(UUID, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_whisper_list(UUID, TEXT, TEXT, INTEGER) TO service_role;


CREATE FUNCTION public.socialu_whisper_create(p_auth_id UUID, p_category TEXT, p_text TEXT) RETURNS JSONB
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
    'reaction_counts', jsonb_build_object('relatable', 0, 'support', 0, 'no_way', 0),
    'my_reaction', NULL, 'comment_count', 0
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_whisper_create(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_whisper_create(UUID, TEXT, TEXT) TO service_role;

-- Ownership alone already makes this safe (you can only ever own a
-- same-school confession, since creating one has no cross-student vector
-- to begin with) -- the explicit check is added anyway for consistency
-- with every other confession_id-taking RPC here, and with
-- 20261027000300_restore_school_isolation.sql's established standard.
CREATE FUNCTION public.socialu_whisper_delete(p_auth_id UUID, p_confession_id BIGINT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT;
BEGIN
  PERFORM socialu.require_school_confession(p_auth_id, p_confession_id);
  me := public.socialu_require_student(p_auth_id);
  SELECT author_id INTO owner FROM socialu.whisper_confessions WHERE confession_id = p_confession_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Confession not found.' USING ERRCODE = 'P0002'; END IF;
  IF owner <> me THEN RAISE EXCEPTION 'Only the author can delete this confession.' USING ERRCODE = '42501'; END IF;
  DELETE FROM socialu.whisper_confessions WHERE confession_id = p_confession_id;
  RETURN jsonb_build_object('deleted', TRUE);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_whisper_delete(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_whisper_delete(UUID, BIGINT) TO service_role;

-- List comments: resolves every participant's stable per-confession alias
-- (or "Original Poster" for the confession's own author) without ever
-- returning author_id itself.
CREATE FUNCTION public.socialu_whisper_list_comments(p_auth_id UUID, p_confession_id BIGINT) RETURNS JSONB
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
REVOKE ALL ON FUNCTION public.socialu_whisper_list_comments(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_whisper_list_comments(UUID, BIGINT) TO service_role;

CREATE FUNCTION public.socialu_whisper_create_comment(
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

  -- Alias assignment: lock the confession row to serialize concurrent
  -- first-time commenters, same locking idiom as apply_report_threshold.
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

  -- Notify the real confession author that someone commented -- this is
  -- the author's OWN notification about their OWN content, so it reveals
  -- nothing to anyone else; it never identifies who commented.
  IF me <> confession_author THEN
    INSERT INTO socialu.notifications (recipient_id, actor_id, kind, whisper_comment_id)
    VALUES (confession_author, me, 'whisper_comment', new_comment.comment_id);
  END IF;

  label := CASE WHEN me = confession_author THEN 'Original Poster' ELSE 'Anonymous Student ' || alias END;
  SELECT jsonb_build_object(
    'comment_id', new_comment.comment_id, 'confession_id', new_comment.confession_id,
    'parent_comment_id', new_comment.parent_comment_id, 'text_content', new_comment.text_content,
    'created_at', new_comment.created_at, 'edited_at', new_comment.edited_at, 'is_deleted', FALSE,
    'is_own', TRUE, 'is_op', me = confession_author, 'alias_label', label, 'mentions', '[]'::jsonb
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_whisper_create_comment(UUID, BIGINT, TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_whisper_create_comment(UUID, BIGINT, TEXT, BIGINT) TO service_role;

CREATE FUNCTION public.socialu_whisper_update_comment(p_auth_id UUID, p_comment_id BIGINT, p_text TEXT) RETURNS JSONB
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
                WHERE men.comment_id = updated_comment.comment_id), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_whisper_update_comment(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_whisper_update_comment(UUID, BIGINT, TEXT) TO service_role;

-- Deletion tombstones (same shape as socialu_delete_comment) so replies
-- survive; a captionless placeholder is fine since Whisper comments have
-- no photo attachments to preserve.
CREATE FUNCTION public.socialu_whisper_delete_comment(p_auth_id UUID, p_comment_id BIGINT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; author BIGINT; tombstoned TIMESTAMPTZ; target_confession_id BIGINT; has_replies BOOLEAN;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  SELECT author_id, deleted_at, confession_id INTO author, tombstoned, target_confession_id
  FROM socialu.whisper_comments WHERE comment_id = p_comment_id;
  IF NOT FOUND OR tombstoned IS NOT NULL THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
  PERFORM socialu.require_school_confession(p_auth_id, target_confession_id);
  IF author <> me THEN RAISE EXCEPTION 'Only the comment author can delete this comment.' USING ERRCODE = '42501'; END IF;

  SELECT EXISTS (SELECT 1 FROM socialu.whisper_comments WHERE parent_comment_id = p_comment_id) INTO has_replies;
  IF has_replies THEN
    UPDATE socialu.whisper_comments SET text_content = '[deleted]', deleted_at = CURRENT_TIMESTAMP WHERE comment_id = p_comment_id;
    RETURN jsonb_build_object('deleted', TRUE, 'tombstoned', TRUE);
  ELSE
    DELETE FROM socialu.whisper_comments WHERE comment_id = p_comment_id;
    RETURN jsonb_build_object('deleted', TRUE, 'tombstoned', FALSE);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_whisper_delete_comment(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_whisper_delete_comment(UUID, BIGINT) TO service_role;

-- Reactions: UPSERT to set/change, NULL p_reaction removes. Counts only,
-- never who reacted.
CREATE FUNCTION public.socialu_whisper_react(p_auth_id UUID, p_confession_id BIGINT, p_reaction TEXT DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  PERFORM socialu.require_school_confession(p_auth_id, p_confession_id);
  me := public.socialu_require_student(p_auth_id);
  IF p_reaction IS NULL THEN
    DELETE FROM socialu.whisper_reactions WHERE confession_id = p_confession_id AND student_id = me;
  ELSE
    IF p_reaction NOT IN ('relatable','support','no_way') THEN
      RAISE EXCEPTION 'Choose a valid reaction.' USING ERRCODE = '22023';
    END IF;
    INSERT INTO socialu.whisper_reactions (confession_id, student_id, reaction) VALUES (p_confession_id, me, p_reaction)
      ON CONFLICT (confession_id, student_id) DO UPDATE SET reaction = EXCLUDED.reaction;
  END IF;

  SELECT jsonb_build_object(
    'reaction_counts', jsonb_build_object(
      'relatable', count(*) FILTER (WHERE reaction = 'relatable'),
      'support', count(*) FILTER (WHERE reaction = 'support'),
      'no_way', count(*) FILTER (WHERE reaction = 'no_way')
    ),
    'my_reaction', p_reaction
  ) INTO result FROM socialu.whisper_reactions WHERE confession_id = p_confession_id;
  RETURN coalesce(result, jsonb_build_object('reaction_counts', jsonb_build_object('relatable',0,'support',0,'no_way',0), 'my_reaction', NULL));
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_whisper_react(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_whisper_react(UUID, BIGINT, TEXT) TO service_role;

-- Reporting: self-reports blocked, repeat reports a harmless no-op
-- (ON CONFLICT DO NOTHING), identical pattern to socialu_report_post.
-- reporter_id is never selected into any return value.
CREATE FUNCTION public.socialu_whisper_report_confession(p_auth_id UUID, p_confession_id BIGINT, p_reason TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; inserted_count INT; confession_removed BOOLEAN;
BEGIN
  PERFORM socialu.require_school_confession(p_auth_id, p_confession_id);
  me := public.socialu_require_student(p_auth_id);
  IF p_reason IS NULL OR p_reason NOT IN ('harassment','private_info','threats','spam','inappropriate','other') THEN
    RAISE EXCEPTION 'Choose a valid report reason.' USING ERRCODE = '22023';
  END IF;
  SELECT author_id INTO owner FROM socialu.whisper_confessions WHERE confession_id = p_confession_id;
  IF owner = me THEN RAISE EXCEPTION 'You cannot report your own confession.' USING ERRCODE = '42501'; END IF;

  INSERT INTO socialu.whisper_confession_reports (confession_id, reporter_id, reason) VALUES (p_confession_id, me, p_reason)
    ON CONFLICT (confession_id, reporter_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  confession_removed := NOT EXISTS (SELECT 1 FROM socialu.whisper_confessions WHERE confession_id = p_confession_id);
  RETURN jsonb_build_object('reported', inserted_count > 0, 'confession_removed', confession_removed);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_whisper_report_confession(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_whisper_report_confession(UUID, BIGINT, TEXT) TO service_role;

CREATE FUNCTION public.socialu_whisper_report_comment(p_auth_id UUID, p_comment_id BIGINT, p_reason TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; owner BIGINT; target_confession_id BIGINT; inserted_count INT; comment_removed BOOLEAN;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_reason IS NULL OR p_reason NOT IN ('harassment','private_info','threats','spam','inappropriate','other') THEN
    RAISE EXCEPTION 'Choose a valid report reason.' USING ERRCODE = '22023';
  END IF;
  SELECT author_id, confession_id INTO owner, target_confession_id FROM socialu.whisper_comments WHERE comment_id = p_comment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comment not found.' USING ERRCODE = 'P0002'; END IF;
  PERFORM socialu.require_school_confession(p_auth_id, target_confession_id);
  IF owner = me THEN RAISE EXCEPTION 'You cannot report your own comment.' USING ERRCODE = '42501'; END IF;

  INSERT INTO socialu.whisper_comment_reports (comment_id, reporter_id, reason) VALUES (p_comment_id, me, p_reason)
    ON CONFLICT (comment_id, reporter_id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  comment_removed := EXISTS (SELECT 1 FROM socialu.whisper_comments WHERE comment_id = p_comment_id AND deleted_at IS NOT NULL);
  RETURN jsonb_build_object('reported', inserted_count > 0, 'comment_removed', comment_removed);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_whisper_report_comment(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_whisper_report_comment(UUID, BIGINT, TEXT) TO service_role;

-- Opt-out toggle itself: a plain account setting, no new RPC family needed.
-- p_opt_out IS NULL just reads the current value without changing it (the
-- UI uses this to show the toggle's initial state on load); a TRUE/FALSE
-- value sets it.
CREATE FUNCTION public.socialu_whisper_set_opt_out(p_auth_id UUID, p_opt_out BOOLEAN DEFAULT NULL) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; current_value BOOLEAN;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_opt_out IS NULL THEN
    SELECT campus_crush_opt_out INTO current_value FROM socialu.students WHERE student_id = me;
  ELSE
    UPDATE socialu.students SET campus_crush_opt_out = p_opt_out WHERE student_id = me RETURNING campus_crush_opt_out INTO current_value;
  END IF;
  RETURN jsonb_build_object('campus_crush_opt_out', current_value);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_whisper_set_opt_out(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_whisper_set_opt_out(UUID, BOOLEAN) TO service_role;

-- New notification kind: 'whisper_comment'. The existing comment_id column
-- is a foreign key into socialu.post_comments -- a completely separate
-- table/id-space from socialu.whisper_comments -- so reusing it for a
-- whisper comment id would violate that FK. A dedicated whisper_comment_id
-- column avoids that, keeping Whisper notifications structurally separate
-- from regular-post notifications. Same DROP-all-constraints-then-recreate
-- pattern used by every prior kind-adding migration this session.
ALTER TABLE socialu.notifications
  ADD COLUMN whisper_comment_id BIGINT REFERENCES socialu.whisper_comments(comment_id) ON DELETE CASCADE;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'socialu.notifications'::regclass AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE socialu.notifications DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE socialu.notifications
  ADD CONSTRAINT notifications_kind_check
    CHECK (kind IN ('friend_request','friendship_accepted','post_like','post_comment','comment_reply','mention','repost','whisper_comment')),
  ADD CONSTRAINT notifications_shape_check
    CHECK ((kind IN ('friend_request','friendship_accepted') AND friend_request_id IS NOT NULL AND post_id IS NULL AND comment_id IS NULL AND whisper_comment_id IS NULL)
        OR (kind IN ('post_like','repost') AND post_id IS NOT NULL AND friend_request_id IS NULL AND comment_id IS NULL AND whisper_comment_id IS NULL)
        OR (kind IN ('post_comment','comment_reply') AND comment_id IS NOT NULL AND post_id IS NULL AND friend_request_id IS NULL AND whisper_comment_id IS NULL)
        OR (kind = 'whisper_comment' AND whisper_comment_id IS NOT NULL AND post_id IS NULL AND friend_request_id IS NULL AND comment_id IS NULL)
        OR (kind = 'mention' AND friend_request_id IS NULL AND whisper_comment_id IS NULL
            AND ((post_id IS NOT NULL AND comment_id IS NULL) OR (comment_id IS NOT NULL AND post_id IS NULL))));

-- whisper_comment notifications reference socialu.whisper_comments, a
-- table socialu_notifications' existing comment_items CTE knows nothing
-- about (it joins socialu.post_comments). Kept as its own CTE rather than
-- widening comment_items, since whisper comments have no "post" or
-- "visibility" of their own.
CREATE OR REPLACE FUNCTION public.socialu_notifications(p_auth_id UUID) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);

  WITH friend_items AS (
    SELECT n.notification_id, n.kind::TEXT AS kind, n.created_at, n.read_at,
      s.username AS actor_username, coalesce(sp.display_name, s.full_name) AS actor_name,
      am.storage_key AS actor_photo_key, r.status::TEXT AS request_status,
      NULL::BIGINT AS post_id, NULL::BIGINT AS comment_id, NULL::TEXT AS visibility,
      1::BIGINT AS actor_count, jsonb_build_array(coalesce(sp.display_name, s.full_name)) AS actor_names,
      (n.read_at IS NULL) AS is_unread
    FROM socialu.notifications n
    JOIN socialu.students s ON s.student_id = n.actor_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    LEFT JOIN socialu.friend_requests r ON r.request_id = n.friend_request_id
    WHERE n.recipient_id = me AND n.kind IN ('friend_request', 'friendship_accepted')
      AND s.is_active AND NOT socialu.is_blocked(me, n.actor_id)
  ),
  likes AS (
    SELECT n.notification_id, n.post_id, n.actor_id, n.created_at, n.read_at,
      lag(n.created_at) OVER (PARTITION BY n.post_id ORDER BY n.created_at) AS prev_at
    FROM socialu.notifications n
    WHERE n.recipient_id = me AND n.kind = 'post_like'
  ),
  flagged AS (
    SELECT *, CASE WHEN prev_at IS NULL OR created_at - prev_at > INTERVAL '24 hours' THEN 1 ELSE 0 END AS starts_group
    FROM likes
  ),
  grouped AS (
    SELECT *, sum(starts_group) OVER (PARTITION BY post_id ORDER BY created_at) AS group_id
    FROM flagged
  ),
  like_groups AS (
    SELECT post_id, group_id,
      max(notification_id) AS notification_id,
      max(created_at) AS latest_at,
      bool_and(read_at IS NOT NULL) AS all_read,
      count(*) AS actor_count,
      array_agg(actor_id ORDER BY created_at DESC) AS actor_ids
    FROM grouped
    GROUP BY post_id, group_id
  ),
  like_items AS (
    SELECT g.notification_id, 'post_like'::TEXT AS kind, g.latest_at AS created_at,
      CASE WHEN g.all_read THEN g.latest_at ELSE NULL END AS read_at,
      first_actor.username AS actor_username, coalesce(first_sp.display_name, first_actor.full_name) AS actor_name,
      first_am.storage_key AS actor_photo_key, NULL::TEXT AS request_status,
      g.post_id, NULL::BIGINT AS comment_id, p.visibility::TEXT AS visibility,
      g.actor_count,
      (SELECT jsonb_agg(coalesce(sp2.display_name, s2.full_name) ORDER BY ord.ord)
       FROM unnest(g.actor_ids) WITH ORDINALITY AS ord(actor_id, ord)
       JOIN socialu.students s2 ON s2.student_id = ord.actor_id
       LEFT JOIN socialu.student_profiles sp2 ON sp2.student_id = s2.student_id
      ) AS actor_names,
      NOT g.all_read AS is_unread
    FROM like_groups g
    JOIN socialu.posts p ON p.post_id = g.post_id
    JOIN socialu.students first_actor ON first_actor.student_id = g.actor_ids[1]
    LEFT JOIN socialu.student_profiles first_sp ON first_sp.student_id = first_actor.student_id
    LEFT JOIN socialu.media_assets first_am ON first_am.asset_id = first_sp.photo_id
  ),
  comment_items AS (
    SELECT n.notification_id, n.kind::TEXT AS kind, n.created_at, n.read_at,
      s.username AS actor_username, coalesce(sp.display_name, s.full_name) AS actor_name,
      am.storage_key AS actor_photo_key, NULL::TEXT AS request_status,
      pc.post_id, n.comment_id, p.visibility::TEXT AS visibility,
      1::BIGINT AS actor_count, jsonb_build_array(coalesce(sp.display_name, s.full_name)) AS actor_names,
      (n.read_at IS NULL) AS is_unread
    FROM socialu.notifications n
    JOIN socialu.post_comments pc ON pc.comment_id = n.comment_id
    JOIN socialu.posts p ON p.post_id = pc.post_id
    JOIN socialu.students s ON s.student_id = n.actor_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE n.recipient_id = me AND n.kind IN ('post_comment', 'comment_reply')
  ),
  post_mention_items AS (
    SELECT n.notification_id, n.kind::TEXT AS kind, n.created_at, n.read_at,
      s.username AS actor_username, coalesce(sp.display_name, s.full_name) AS actor_name,
      am.storage_key AS actor_photo_key, NULL::TEXT AS request_status,
      n.post_id, NULL::BIGINT AS comment_id, p.visibility::TEXT AS visibility,
      1::BIGINT AS actor_count, jsonb_build_array(coalesce(sp.display_name, s.full_name)) AS actor_names,
      (n.read_at IS NULL) AS is_unread
    FROM socialu.notifications n
    JOIN socialu.posts p ON p.post_id = n.post_id
      AND (p.visibility = 'public' OR p.author_id = me OR socialu.are_friends(me, p.author_id))
      AND NOT socialu.is_blocked(me, p.author_id)
      AND socialu.same_school(me, p.author_id)
    JOIN socialu.students s ON s.student_id = n.actor_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE n.recipient_id = me AND n.kind = 'mention' AND n.post_id IS NOT NULL
  ),
  comment_mention_items AS (
    SELECT n.notification_id, n.kind::TEXT AS kind, n.created_at, n.read_at,
      s.username AS actor_username, coalesce(sp.display_name, s.full_name) AS actor_name,
      am.storage_key AS actor_photo_key, NULL::TEXT AS request_status,
      pc.post_id, n.comment_id, p.visibility::TEXT AS visibility,
      1::BIGINT AS actor_count, jsonb_build_array(coalesce(sp.display_name, s.full_name)) AS actor_names,
      (n.read_at IS NULL) AS is_unread
    FROM socialu.notifications n
    JOIN socialu.post_comments pc ON pc.comment_id = n.comment_id
    JOIN socialu.posts p ON p.post_id = pc.post_id
      AND (p.visibility = 'public' OR p.author_id = me OR socialu.are_friends(me, p.author_id))
      AND NOT socialu.is_blocked(me, p.author_id)
      AND socialu.same_school(me, p.author_id)
    JOIN socialu.students s ON s.student_id = n.actor_id AND NOT socialu.is_blocked(me, s.student_id)
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE n.recipient_id = me AND n.kind = 'mention' AND n.comment_id IS NOT NULL
  ),
  repost_items AS (
    SELECT n.notification_id, n.kind::TEXT AS kind, n.created_at, n.read_at,
      s.username AS actor_username, coalesce(sp.display_name, s.full_name) AS actor_name,
      am.storage_key AS actor_photo_key, NULL::TEXT AS request_status,
      n.post_id, NULL::BIGINT AS comment_id, p.visibility::TEXT AS visibility,
      1::BIGINT AS actor_count, jsonb_build_array(coalesce(sp.display_name, s.full_name)) AS actor_names,
      (n.read_at IS NULL) AS is_unread
    FROM socialu.notifications n
    JOIN socialu.posts p ON p.post_id = n.post_id
      AND (p.visibility = 'public' OR p.author_id = me OR socialu.are_friends(me, p.author_id))
      AND NOT socialu.is_blocked(me, p.author_id)
      AND socialu.same_school(me, p.author_id)
    JOIN socialu.students s ON s.student_id = n.actor_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
    LEFT JOIN socialu.media_assets am ON am.asset_id = sp.photo_id
    WHERE n.recipient_id = me AND n.kind = 'repost' AND n.post_id IS NOT NULL
  ),
  -- Confession authorship stays hidden even here: the actor shown is never
  -- surfaced (there is no real identity to show -- this notification kind
  -- intentionally omits actor_name/actor_username, matching "comment count
  -- went up on my confession," not "X commented").
  -- Reuses the generic post_id output slot to carry the CONFESSION id
  -- (there's no individual whisper-comment deep link in this version, so
  -- "which confession to open" is the only thing worth surfacing) --
  -- comment_id stays NULL here since it would point into a different
  -- table (whisper_comments) than every other kind's comment_id does
  -- (post_comments); the underlying storage column is whisper_comment_id,
  -- never comment_id, to avoid the FK mismatch that forced this column's
  -- existence in the first place.
  whisper_comment_items AS (
    SELECT n.notification_id, n.kind::TEXT AS kind, n.created_at, n.read_at,
      NULL::TEXT AS actor_username, NULL::TEXT AS actor_name,
      NULL::TEXT AS actor_photo_key, NULL::TEXT AS request_status,
      wc.confession_id AS post_id, NULL::BIGINT AS comment_id, NULL::TEXT AS visibility,
      1::BIGINT AS actor_count, '[]'::jsonb AS actor_names,
      (n.read_at IS NULL) AS is_unread
    FROM socialu.notifications n
    JOIN socialu.whisper_comments wc ON wc.comment_id = n.whisper_comment_id
    WHERE n.recipient_id = me AND n.kind = 'whisper_comment' AND n.whisper_comment_id IS NOT NULL
  ),
  all_items AS (
    SELECT * FROM friend_items
    UNION ALL SELECT * FROM like_items
    UNION ALL SELECT * FROM comment_items
    UNION ALL SELECT * FROM post_mention_items
    UNION ALL SELECT * FROM comment_mention_items
    UNION ALL SELECT * FROM repost_items
    UNION ALL SELECT * FROM whisper_comment_items
  )
  SELECT jsonb_build_object(
    'unread', (SELECT count(*) FROM all_items WHERE is_unread),
    'notifications', (SELECT coalesce(jsonb_agg((to_jsonb(ai) - 'is_unread') ORDER BY ai.created_at DESC), '[]'::jsonb)
                       FROM all_items ai)
  ) INTO result;

  RETURN result;
END;
$$;

NOTIFY pgrst, 'reload schema';
