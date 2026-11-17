-- SRS-612.4 and SRS-614.1–614.5. Requires game_participation_streaks migration.
BEGIN;
CREATE OR REPLACE FUNCTION public.socialu_participation_calendar(p_auth_id UUID, p_dismiss_date DATE DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $calendar$
DECLARE
  student BIGINT := public.socialu_require_student(p_auth_id);
  zone TEXT; today DATE; week_start DATE; instant TIMESTAMPTZ;
  active_streak BIGINT; streak_count INTEGER; remaining INTEGER;
  qualified BOOLEAN; dismissed BOOLEAN; days JSONB;
BEGIN
  -- Shared lock with participation writers: settlement, status and dismissal agree.
  PERFORM 1 FROM socialu.students WHERE student_id = student FOR UPDATE;
  instant := clock_timestamp();
  SELECT time_zone INTO zone FROM socialu.participation_settings WHERE student_id = student;
  today := (instant AT TIME ZONE coalesce(zone, 'America/New_York'))::DATE;
  week_start := today - extract(dow FROM today)::INTEGER;
  active_streak := socialu.settle_participation_days(student, today);
  SELECT count(*) INTO streak_count FROM socialu.participation_days
    WHERE student_id = student AND streak_id = active_streak AND state = 'played';
  SELECT 3 - count(*) INTO remaining FROM socialu.participation_days
    WHERE student_id = student AND state = 'forgiven' AND participation_date BETWEEN week_start AND today;
  SELECT EXISTS(SELECT 1 FROM socialu.participation_days
    WHERE student_id = student AND participation_date = today AND state = 'played') INTO qualified;

  IF p_dismiss_date IS NOT NULL THEN
    -- Never let an old tab accidentally dismiss the next participation day's reminder.
    IF p_dismiss_date <> today THEN RAISE EXCEPTION 'Participation day changed' USING ERRCODE = '22008'; END IF;
    IF zone IS NOT NULL AND streak_count > 0 AND remaining = 0 AND NOT qualified THEN
      INSERT INTO socialu.reminder_dismissals(student_id, participation_date)
      VALUES(student, today) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  SELECT EXISTS(SELECT 1 FROM socialu.reminder_dismissals
    WHERE student_id = student AND participation_date = today) INTO dismissed;

  SELECT jsonb_agg(jsonb_build_object('date', (week_start + offset_day)::TEXT, 'state',
    CASE WHEN week_start + offset_day > today THEN 'upcoming'
         WHEN outcome.state IS NOT NULL THEN outcome.state
         WHEN week_start + offset_day = today THEN 'today-unqualified'
         ELSE 'inactive' END) ORDER BY offset_day)
  INTO days FROM generate_series(0, 6) AS offset_day
  LEFT JOIN socialu.participation_days outcome ON outcome.student_id = student
    AND outcome.participation_date = week_start + offset_day;

  RETURN jsonb_build_object('accountId', p_auth_id, 'today', today::TEXT, 'timeZone', zone,
    'serverTime', instant, 'deadline', (today + 1)::TIMESTAMP AT TIME ZONE coalesce(zone, 'America/New_York'),
    'count', streak_count, 'qualifiedToday', qualified, 'forgivenRemaining', remaining,
    'dismissedToday', dismissed, 'atRisk', streak_count > 0 AND remaining = 0 AND NOT qualified AND NOT dismissed,
    'days', days);
END;
$calendar$;
REVOKE ALL ON FUNCTION public.socialu_participation_calendar(UUID,DATE) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_participation_calendar(UUID,DATE) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
