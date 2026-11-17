BEGIN;

ALTER TABLE socialu.activities DROP CONSTRAINT activities_activity_code_check;
ALTER TABLE socialu.activities ADD CONSTRAINT activities_activity_code_check
  CHECK (activity_code IN ('game1', 'wordle', 'dormspace', 'explorer'));
INSERT INTO socialu.activities (activity_code, name, description, instructions, included)
VALUES ('explorer', 'World Explorer', 'Play country adventures.', 'Start a playable country level.', true);

ALTER TABLE socialu.participation_events DROP CONSTRAINT participation_events_check;
ALTER TABLE socialu.participation_events ADD CONSTRAINT participation_events_activity_details_check
  CHECK ((activity_code = 'game1' AND game_level IS NOT NULL AND wordle_guess_id IS NULL)
      OR (activity_code = 'wordle' AND game_level IS NULL AND wordle_guess_id IS NOT NULL)
      OR (activity_code IN ('dormspace', 'explorer') AND game_level IS NULL AND wordle_guess_id IS NULL));

CREATE INDEX game_participation_history ON socialu.participation_events (student_id, activity_code, occurred_at)
  WHERE activity_code IN ('dormspace', 'explorer');

-- Preserve original ledger entries when activating the new daily rate.
UPDATE socialu.reward_rules SET is_current = false
WHERE category = 'daily_participation' AND is_current AND points_per_unit <> 10;

INSERT INTO socialu.reward_rules (category, points_per_unit, eligibility_text)
SELECT 'daily_participation', 10, 'Points for the first qualifying activity of an account participation day.'
WHERE NOT EXISTS (SELECT 1 FROM socialu.reward_rules WHERE category = 'daily_participation' AND is_current);

CREATE FUNCTION socialu.credit_daily_game_participation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO socialu.point_transactions
    (student_id, category, points_change, action_key, reward_rule_id, reward_units, participation_date)
  SELECT NEW.student_id, rule.category, rule.points_per_unit, gen_random_uuid(), rule.rule_id, 1, NEW.participation_date
  FROM socialu.reward_rules rule
  WHERE rule.category = 'daily_participation' AND rule.is_current
  ON CONFLICT (student_id, participation_date) WHERE category = 'daily_participation' DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION socialu.credit_daily_game_participation() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER credit_daily_game_participation
  AFTER INSERT ON socialu.participation_days
  FOR EACH ROW WHEN (NEW.state = 'played')
  EXECUTE FUNCTION socialu.credit_daily_game_participation();

-- The caller holds the student's row lock, shared with the existing Jumpyland path.
CREATE FUNCTION socialu.settle_participation_days(p_student bigint, p_today date) RETURNS bigint
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  active_streak bigint;
  missed_day date;
  forgiven integer;
BEGIN
  SELECT streak_id INTO active_streak
  FROM socialu.streak_instances WHERE student_id = p_student AND reset_on IS NULL;
  IF active_streak IS NULL THEN RETURN NULL; END IF;

  SELECT max(participation_date) + 1 INTO missed_day
  FROM socialu.participation_days WHERE student_id = p_student;
  WHILE missed_day < p_today LOOP
    SELECT count(*) INTO forgiven FROM socialu.participation_days
    WHERE student_id = p_student AND state = 'forgiven'
      AND participation_date BETWEEN missed_day - extract(dow FROM missed_day)::integer AND missed_day - 1;
    IF forgiven = 3 THEN
      INSERT INTO socialu.participation_days (student_id, participation_date, state, streak_id)
      VALUES (p_student, missed_day, 'reset', active_streak);
      UPDATE socialu.streak_instances SET reset_on = missed_day WHERE streak_id = active_streak;
      RETURN NULL;
    END IF;
    INSERT INTO socialu.participation_days (student_id, participation_date, state, streak_id)
    VALUES (p_student, missed_day, 'forgiven', active_streak);
    missed_day := missed_day + 1;
  END LOOP;
  RETURN active_streak;
END;
$$;
REVOKE ALL ON FUNCTION socialu.settle_participation_days(bigint, date) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.socialu_game_participation(
  p_auth_id uuid, p_activity text DEFAULT NULL, p_zone text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  student bigint := public.socialu_require_student(p_auth_id);
  zone text;
  today date;
  week_start date;
  active_streak bigint;
  new_event uuid;
  boards jsonb;
  reward_points bigint;
  -- Capture one instant for the date boundary and the participation event.
  recorded_at timestamptz;
BEGIN
  PERFORM 1 FROM socialu.students WHERE student_id = student FOR UPDATE;
  recorded_at := clock_timestamp();
  IF p_activity IS NOT NULL THEN
    IF p_activity NOT IN ('dormspace', 'explorer')
      OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = p_zone)
    THEN RAISE EXCEPTION 'Invalid participation activity or time zone' USING ERRCODE = '22023'; END IF;
    INSERT INTO socialu.participation_settings (student_id, time_zone)
    VALUES (student, p_zone) ON CONFLICT DO NOTHING;
  END IF;

  SELECT time_zone INTO zone FROM socialu.participation_settings WHERE student_id = student;
  today := (recorded_at AT TIME ZONE coalesce(zone, 'America/New_York'))::date;
  week_start := today - extract(dow FROM today)::integer;
  active_streak := socialu.settle_participation_days(student, today);
  IF p_activity IS NOT NULL THEN
    -- Repeated opens of a game on the same day do not create more activity rows.
    IF NOT EXISTS (
      SELECT 1 FROM socialu.participation_events
      WHERE student_id = student AND activity_code = p_activity
        AND occurred_at >= today::timestamp AT TIME ZONE zone
        AND occurred_at < (today + 1)::timestamp AT TIME ZONE zone
    ) THEN
      new_event := gen_random_uuid();
      INSERT INTO socialu.participation_events (event_id, student_id, activity_code, occurred_at)
      VALUES (new_event, student, p_activity, recorded_at);
      IF active_streak IS NULL THEN
        INSERT INTO socialu.streak_instances (student_id, started_on)
        VALUES (student, today) RETURNING streak_id INTO active_streak;
      END IF;
      INSERT INTO socialu.participation_days (student_id, participation_date, state, streak_id, first_event_id)
      VALUES (student, today, 'played', active_streak, new_event) ON CONFLICT DO NOTHING;
    END IF;
    -- A played day may predate the reward trigger (or come from another game).
    -- Credit it on this real play request; the unique ledger key prevents repeats.
    INSERT INTO socialu.point_transactions
      (student_id, category, points_change, action_key, reward_rule_id, reward_units, participation_date)
    SELECT student, rule.category, rule.points_per_unit, gen_random_uuid(), rule.rule_id, 1, today
    FROM socialu.reward_rules rule
    WHERE rule.category = 'daily_participation' AND rule.is_current
      AND EXISTS (SELECT 1 FROM socialu.participation_days WHERE student_id = student AND participation_date = today AND state = 'played')
    ON CONFLICT (student_id, participation_date) WHERE category = 'daily_participation' DO NOTHING;
    RETURN jsonb_build_object('recorded', true);
  END IF;

  -- Ranking uses distinct dates in each student's saved zone. The current
  -- consecutive run stays active through today until today's deadline passes.
  WITH daily AS (
    SELECT DISTINCT e.student_id, e.activity_code, s.username,
      (e.occurred_at AT TIME ZONE settings.time_zone)::date AS play_date,
      (recorded_at AT TIME ZONE settings.time_zone)::date AS local_today
    FROM socialu.participation_events e
    JOIN socialu.participation_settings settings USING (student_id)
    JOIN socialu.students s USING (student_id)
    WHERE e.activity_code IN ('dormspace', 'explorer')
      AND s.is_active AND s.email_verified_at IS NOT NULL AND NOT s.reverification_required
      AND s.email_domain = (SELECT email_domain FROM socialu.students WHERE student_id = student)
  ), runs AS (
    SELECT *, play_date - (row_number() OVER (PARTITION BY student_id, activity_code ORDER BY play_date))::integer AS run
    FROM daily WHERE play_date <= local_today
  ), current_runs AS (
    SELECT student_id, activity_code, username, count(*) AS days
    FROM runs GROUP BY student_id, activity_code, username, local_today, run
    HAVING max(play_date) >= local_today - 1
  ), ranked AS (
    SELECT *, row_number() OVER (PARTITION BY activity_code ORDER BY days DESC, lower(username), student_id) AS position
    FROM current_runs
  )
  SELECT coalesce(jsonb_object_agg(activity_code, entries), '{}'::jsonb) INTO boards
  FROM (
    SELECT activity_code, jsonb_agg(jsonb_build_object('username', username, 'days', days) ORDER BY position) AS entries
    FROM ranked WHERE position <= 10 GROUP BY activity_code
  ) top_games;

  SELECT points_per_unit INTO reward_points FROM socialu.reward_rules
  WHERE category = 'daily_participation' AND is_current;
  RETURN jsonb_build_object(
    'count', (SELECT count(*) FROM socialu.participation_days WHERE student_id = student AND streak_id = active_streak AND state = 'played'),
    'qualifiedToday', EXISTS (SELECT 1 FROM socialu.participation_days WHERE student_id = student AND participation_date = today AND state = 'played'),
    'forgivenRemaining', 3 - (SELECT count(*) FROM socialu.participation_days WHERE student_id = student AND state = 'forgiven' AND participation_date BETWEEN week_start AND today),
    'rewardPoints', coalesce(reward_points, 0),
    'earnedPointsToday', coalesce((
      SELECT points_change FROM socialu.point_transactions
      WHERE student_id = student AND category = 'daily_participation' AND participation_date = today
    ), 0),
    'leaderboards', boards
  );
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_game_participation(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_game_participation(uuid, text, text) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
