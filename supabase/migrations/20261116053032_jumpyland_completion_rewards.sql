-- SRS-533.1 / SRS-533.2. DP approved 25 shared points per completed attempt on 2026-11-16.
-- Credits only new completions; no historical backfill. Uses the existing ledger and account lock.
BEGIN;
UPDATE socialu.reward_rules SET is_current=false WHERE category='level_completion' AND is_current AND points_per_unit<>25;
INSERT INTO socialu.reward_rules(category,points_per_unit,eligibility_text)
SELECT 'level_completion',25,'25 points for each newly saved Jumpyland level completion; once per started attempt.'
WHERE NOT EXISTS (SELECT 1 FROM socialu.reward_rules WHERE category='level_completion' AND is_current);
CREATE OR REPLACE FUNCTION socialu.credit_jumpyland_completion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE student bigint; rule bigint;
BEGIN
 SELECT student_id INTO student FROM socialu.participation_events WHERE event_id=NEW.attempt_id AND activity_code='game1';
 IF student IS NULL THEN RAISE EXCEPTION 'A started Jumpyland attempt is required' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM socialu.students WHERE student_id=student FOR UPDATE;
 SELECT rule_id INTO rule FROM socialu.reward_rules WHERE category='level_completion' AND is_current AND points_per_unit=25 FOR SHARE;
 IF rule IS NULL THEN RAISE EXCEPTION 'The completion reward is unavailable' USING ERRCODE='22023'; END IF;
 INSERT INTO socialu.point_transactions(student_id,category,points_change,action_key,reward_rule_id,reward_units,attempt_id)
 VALUES(student,'level_completion',25,NEW.attempt_id,rule,1,NEW.attempt_id);
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION socialu.credit_jumpyland_completion() FROM PUBLIC,anon,authenticated,service_role;
DROP TRIGGER IF EXISTS credit_jumpyland_completion ON socialu.level_completions;
CREATE TRIGGER credit_jumpyland_completion AFTER INSERT ON socialu.level_completions
 FOR EACH ROW EXECUTE FUNCTION socialu.credit_jumpyland_completion();
CREATE OR REPLACE FUNCTION public.socialu_jumpyland(
 p_action TEXT,p_auth_id UUID,p_attempt UUID DEFAULT NULL,p_level INTEGER DEFAULT NULL,
 p_coins INTEGER DEFAULT NULL,p_zone TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,socialu,pg_temp AS $$
DECLARE
 profile JSONB; student BIGINT; event socialu.participation_events%ROWTYPE;
 zone TEXT; today DATE; prior DATE; day DATE; active_streak BIGINT; misses INTEGER;
 saved_coins INTEGER; result JSONB; reward_points BIGINT;
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
   IF NOT EXISTS(SELECT 1 FROM socialu.level_completions WHERE attempt_id=p_attempt)
      AND clock_timestamp()<event.occurred_at+interval '10 seconds'
   THEN RAISE EXCEPTION 'Complete the course before saving a result' USING ERRCODE='22023'; END IF;
   INSERT INTO socialu.level_completions(attempt_id,completed_at,collected_coins)
     VALUES(p_attempt,CURRENT_TIMESTAMP,p_coins) ON CONFLICT DO NOTHING;
 END IF;
 SELECT jsonb_build_object('completed',COALESCE(jsonb_agg(n ORDER BY n),'[]'::jsonb)) INTO result
 FROM (SELECT DISTINCT e.game_level AS n FROM socialu.level_completions c
   JOIN socialu.participation_events e ON e.event_id=c.attempt_id WHERE e.student_id=student AND e.game_level BETWEEN 1 AND 3) levels;
 SELECT coalesce(t.points_change,0) INTO reward_points FROM socialu.point_transactions t
 WHERE t.category='level_completion' AND t.attempt_id=p_attempt AND t.student_id=student;
 RETURN result || jsonb_build_object(
   'balance', coalesce((SELECT balance FROM socialu.points_balances WHERE student_id=student),0),
   'reward', CASE WHEN p_action='complete' THEN jsonb_build_object('points',coalesce(reward_points,0),'attemptId',p_attempt) ELSE NULL END);
END;
$$;

REVOKE ALL ON FUNCTION public.socialu_jumpyland(TEXT,UUID,UUID,INTEGER,INTEGER,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_jumpyland(TEXT,UUID,UUID,INTEGER,INTEGER,TEXT) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
