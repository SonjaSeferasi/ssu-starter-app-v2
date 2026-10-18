-- Jumpyland / SS: SRS-613.1-.13, 618.1-.6, 619.1-.11, 620.4.
-- Non-destructive: uses existing tables, preserves all saved avatars and completions.
-- No points amounts or rewards are invented here; the shared participation event
-- and level completion remain the source for the points owner's reward processing.
BEGIN;
INSERT INTO socialu.game_levels(level_number,course_asset_key) VALUES
 (1,'jumpyland-gardens-v1'),(2,'jumpyland-cloudwalk-v1'),(3,'jumpyland-golden-hour-v1')
ON CONFLICT(level_number) DO NOTHING;

CREATE OR REPLACE FUNCTION public.socialu_jumpyland(
 p_action TEXT,p_auth_id UUID,p_attempt UUID DEFAULT NULL,p_level INTEGER DEFAULT NULL,
 p_coins INTEGER DEFAULT NULL,p_zone TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,socialu,pg_temp AS $$
DECLARE
 profile JSONB; student BIGINT; event socialu.participation_events%ROWTYPE;
 zone TEXT; today DATE; prior DATE; day DATE; active_streak BIGINT; misses INTEGER;
 saved_coins INTEGER; result JSONB;
BEGIN
 profile:=public.socialu_account('read',p_auth_id);
 IF profile IS NULL THEN RAISE EXCEPTION 'Linked account required' USING ERRCODE='42501'; END IF;
 student:=(profile->>'id')::BIGINT;
 -- Serializes starts/completions for this account, including concurrent tabs.
 PERFORM 1 FROM socialu.students s WHERE s.student_id=student FOR UPDATE;
 IF p_action NOT IN ('read','start','complete') OR p_action IS NULL THEN
   RAISE EXCEPTION 'Unknown operation' USING ERRCODE='22023';
 END IF;
 IF p_action='start' THEN
   IF p_attempt IS NULL OR p_level IS NULL OR p_level NOT BETWEEN 1 AND 3
     OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=p_zone)
   THEN RAISE EXCEPTION 'Invalid start' USING ERRCODE='22023'; END IF;
   IF NOT EXISTS(SELECT 1 FROM socialu.activities WHERE activity_code='game1' AND included)
   THEN RAISE EXCEPTION 'Game unavailable' USING ERRCODE='42501'; END IF;
   SELECT * INTO event FROM socialu.participation_events WHERE event_id=p_attempt;
   IF FOUND THEN
     IF event.student_id<>student OR event.game_level IS DISTINCT FROM p_level OR event.activity_code<>'game1'
     THEN RAISE EXCEPTION 'Attempt unavailable' USING ERRCODE='42501'; END IF;
   ELSE
     IF p_level>1 AND NOT EXISTS(SELECT 1 FROM socialu.level_completions c JOIN socialu.participation_events e ON e.event_id=c.attempt_id
       WHERE e.student_id=student AND e.game_level=p_level-1)
     THEN RAISE EXCEPTION 'Previous level required' USING ERRCODE='42501'; END IF;
     INSERT INTO socialu.participation_settings(student_id,time_zone) VALUES(student,p_zone) ON CONFLICT DO NOTHING;
     SELECT time_zone INTO zone FROM socialu.participation_settings WHERE student_id=student;
     today:=(CURRENT_TIMESTAMP AT TIME ZONE zone)::DATE;
     SELECT max(participation_date) INTO prior FROM socialu.participation_days WHERE student_id=student;
     SELECT streak_id INTO active_streak FROM socialu.streak_instances WHERE student_id=student AND reset_on IS NULL ORDER BY started_on DESC LIMIT 1;
     -- Close missed *past* days; today never becomes a miss before its deadline.
     IF prior IS NOT NULL AND prior<today THEN
       day:=prior+1;
       WHILE day<today LOOP
         IF active_streak IS NULL THEN
           INSERT INTO socialu.participation_days VALUES(student,day,'inactive',NULL,NULL) ON CONFLICT DO NOTHING;
         ELSE
           SELECT count(*) INTO misses FROM socialu.participation_days
             WHERE student_id=student AND state='forgiven' AND participation_date>=day-extract(dow FROM day)::INTEGER AND participation_date<day;
           IF misses<3 THEN
             INSERT INTO socialu.participation_days VALUES(student,day,'forgiven',active_streak,NULL) ON CONFLICT DO NOTHING;
           ELSE
             INSERT INTO socialu.participation_days VALUES(student,day,'reset',active_streak,NULL) ON CONFLICT DO NOTHING;
             UPDATE socialu.streak_instances SET reset_on=day WHERE streak_id=active_streak;
             active_streak:=NULL;
           END IF;
         END IF;
         day:=day+1;
       END LOOP;
     END IF;
     IF active_streak IS NULL THEN
       INSERT INTO socialu.streak_instances(student_id,started_on) VALUES(student,today) RETURNING streak_id INTO active_streak;
     END IF;
     INSERT INTO socialu.participation_events(event_id,student_id,activity_code,occurred_at,game_level)
       VALUES(p_attempt,student,'game1',CURRENT_TIMESTAMP,p_level);
     INSERT INTO socialu.participation_days(student_id,participation_date,state,streak_id,first_event_id)
       VALUES(student,today,'played',active_streak,p_attempt) ON CONFLICT DO NOTHING;
   END IF;
 ELSIF p_action='complete' THEN
   SELECT * INTO event FROM socialu.participation_events WHERE event_id=p_attempt AND student_id=student AND activity_code='game1';
   IF NOT FOUND THEN RAISE EXCEPTION 'Started attempt required' USING ERRCODE='42501'; END IF;
   IF p_coins IS NULL OR p_coins<0 OR p_coins>(CASE event.game_level WHEN 1 THEN 6 WHEN 2 THEN 7 WHEN 3 THEN 8 ELSE -1 END)
   THEN RAISE EXCEPTION 'Invalid coin result' USING ERRCODE='22023'; END IF;
   SELECT collected_coins INTO saved_coins FROM socialu.level_completions WHERE attempt_id=p_attempt;
   IF FOUND AND saved_coins<>p_coins THEN RAISE EXCEPTION 'Saved result is immutable' USING ERRCODE='22023'; END IF;
   INSERT INTO socialu.level_completions(attempt_id,completed_at,collected_coins)
     VALUES(p_attempt,CURRENT_TIMESTAMP,p_coins) ON CONFLICT DO NOTHING;
 END IF;
 SELECT jsonb_build_object('completed',COALESCE(jsonb_agg(n ORDER BY n),'[]'::jsonb)) INTO result
 FROM (SELECT DISTINCT e.game_level AS n FROM socialu.level_completions c
   JOIN socialu.participation_events e ON e.event_id=c.attempt_id WHERE e.student_id=student AND e.game_level BETWEEN 1 AND 3) levels;
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_jumpyland(TEXT,UUID,UUID,INTEGER,INTEGER,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_jumpyland(TEXT,UUID,UUID,INTEGER,INTEGER,TEXT) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
