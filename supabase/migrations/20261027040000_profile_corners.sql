-- Saved campus cards. No existing profile, friendship or follow rows are changed.
CREATE TABLE IF NOT EXISTS socialu.profile_corners (
  student_id BIGINT PRIMARY KEY REFERENCES socialu.students(student_id) ON DELETE CASCADE,
  vibe JSONB,
  goals JSONB NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS socialu.profile_corner_polls (
  poll_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id BIGINT NOT NULL REFERENCES socialu.students(student_id) ON DELETE CASCADE,
  question TEXT NOT NULL CHECK (length(btrim(question)) BETWEEN 1 AND 120),
  option_a TEXT NOT NULL CHECK (length(btrim(option_a)) BETWEEN 1 AND 60),
  option_b TEXT NOT NULL CHECK (length(btrim(option_b)) BETWEEN 1 AND 60),
  ends_at TIMESTAMPTZ NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT true,
  CHECK (lower(btrim(option_a)) <> lower(btrim(option_b)))
);
CREATE UNIQUE INDEX IF NOT EXISTS profile_corner_current_poll ON socialu.profile_corner_polls(owner_id) WHERE is_current;
CREATE TABLE IF NOT EXISTS socialu.profile_corner_votes (
  poll_id BIGINT NOT NULL REFERENCES socialu.profile_corner_polls(poll_id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES socialu.students(student_id) ON DELETE CASCADE,
  choice SMALLINT NOT NULL CHECK (choice IN (0,1)),
  PRIMARY KEY(poll_id,student_id)
);
CREATE TABLE IF NOT EXISTS socialu.profile_corner_plans (
  plan_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id BIGINT NOT NULL REFERENCES socialu.students(student_id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 100),
  location TEXT NOT NULL CHECK (length(btrim(location)) BETWEEN 1 AND 100),
  starts_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity BETWEEN 2 AND 20),
  is_current BOOLEAN NOT NULL DEFAULT true,
  cancelled BOOLEAN NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS profile_corner_current_plan ON socialu.profile_corner_plans(owner_id) WHERE is_current;
CREATE TABLE IF NOT EXISTS socialu.profile_corner_guests (
  plan_id BIGINT NOT NULL REFERENCES socialu.profile_corner_plans(plan_id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES socialu.students(student_id) ON DELETE CASCADE,
  PRIMARY KEY(plan_id,student_id)
);
ALTER TABLE socialu.profile_corners ENABLE ROW LEVEL SECURITY;
ALTER TABLE socialu.profile_corner_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE socialu.profile_corner_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE socialu.profile_corner_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE socialu.profile_corner_guests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON socialu.profile_corners,socialu.profile_corner_polls,socialu.profile_corner_votes,socialu.profile_corner_plans,socialu.profile_corner_guests FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.socialu_profile_corner(
  p_auth_id UUID, p_action TEXT, p_username TEXT DEFAULT NULL, p_payload JSONB DEFAULT '{}'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me BIGINT; target BIGINT; item JSONB; ids TEXT[] := '{}'; card_id BIGINT;
  vibe JSONB; goals JSONB; poll_json JSONB := 'null'; plan_json JSONB := 'null';
  poll socialu.profile_corner_polls%ROWTYPE; plan socialu.profile_corner_plans%ROWTYPE;
  until_at TIMESTAMPTZ; seats INTEGER; a INTEGER; b INTEGER; my_choice INTEGER; people JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  target := public.socialu_profile_target(me,p_username);
  IF p_action IS NULL OR p_action NOT IN ('read','save_vibe','save_goals','create_poll','close_poll','vote','create_plan','cancel_plan','join_plan','leave_plan') THEN
    RAISE EXCEPTION 'Choose a valid action.' USING ERRCODE='22023';
  END IF;
  IF p_action <> 'read' THEN
    IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN RAISE EXCEPTION 'Enter valid card details.' USING ERRCODE='22023'; END IF;
    IF p_action IN ('save_vibe','save_goals','create_poll','close_poll','create_plan','cancel_plan') AND target <> me THEN
      RAISE EXCEPTION 'Only edit your own cards.' USING ERRCODE='42501';
    END IF;
    -- Every mutation of a profile's cards takes the same row lock, including votes,
    -- joins, replacement and cancellation. Simultaneous joins cannot overbook.
    PERFORM 1 FROM socialu.students WHERE student_id=target FOR UPDATE;
  END IF;
  IF p_action='save_vibe' THEN
    IF p_payload->'clear' = 'true'::jsonb THEN vibe := NULL;
    ELSE
      IF jsonb_typeof(p_payload->'text') IS DISTINCT FROM 'string' OR length(btrim(p_payload->>'text')) NOT BETWEEN 1 AND 60
        OR coalesce(p_payload->>'icon','') NOT IN ('sun','coffee','books','headphones','smile','moon') THEN
        RAISE EXCEPTION 'Add a vibe of 1–60 characters and choose an illustration.' USING ERRCODE='22023';
      END IF;
      vibe := jsonb_build_object('text',btrim(p_payload->>'text'),'icon',p_payload->>'icon','updatedAt',now());
    END IF;
    INSERT INTO socialu.profile_corners(student_id,vibe) VALUES(me,vibe) ON CONFLICT(student_id) DO UPDATE SET vibe=excluded.vibe;
  ELSIF p_action='save_goals' THEN
    IF jsonb_typeof(p_payload->'goals') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Enter valid goals.' USING ERRCODE='22023'; END IF;
    IF jsonb_array_length(p_payload->'goals') > 8 THEN RAISE EXCEPTION 'Add up to eight goals.' USING ERRCODE='22023'; END IF;
    goals := '[]';
    FOR item IN SELECT value FROM jsonb_array_elements(p_payload->'goals') LOOP
      IF jsonb_typeof(item) <> 'object' OR coalesce(item->>'id','') !~ '^[a-zA-Z0-9-]{1,40}$' OR item->>'id'=ANY(ids)
        OR jsonb_typeof(item->'text') IS DISTINCT FROM 'string' OR length(btrim(item->>'text')) NOT BETWEEN 1 AND 80
        OR jsonb_typeof(item->'done') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Enter valid goals.' USING ERRCODE='22023'; END IF;
      ids := array_append(ids,item->>'id');
      goals := goals || jsonb_build_array(jsonb_build_object('id',item->>'id','text',btrim(item->>'text'),'done',item->'done'));
    END LOOP;
    INSERT INTO socialu.profile_corners(student_id,goals) VALUES(me,goals) ON CONFLICT(student_id) DO UPDATE SET goals=excluded.goals;
  ELSIF p_action='create_poll' THEN
    IF jsonb_typeof(p_payload->'question') IS DISTINCT FROM 'string' OR length(btrim(p_payload->>'question')) NOT BETWEEN 1 AND 120
      OR jsonb_typeof(p_payload->'options') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Add a question and two different options.' USING ERRCODE='22023'; END IF;
    IF jsonb_array_length(p_payload->'options') <> 2 OR jsonb_typeof(p_payload->'options'->0) <> 'string' OR jsonb_typeof(p_payload->'options'->1) <> 'string'
      OR length(btrim(p_payload->'options'->>0)) NOT BETWEEN 1 AND 60 OR length(btrim(p_payload->'options'->>1)) NOT BETWEEN 1 AND 60
      OR lower(btrim(p_payload->'options'->>0))=lower(btrim(p_payload->'options'->>1)) THEN RAISE EXCEPTION 'Add two different options of 1–60 characters.' USING ERRCODE='22023'; END IF;
    until_at := (p_payload->>'endsAt')::timestamptz;
    IF until_at IS NULL OR until_at <= now() OR until_at > now()+INTERVAL '30 days' THEN RAISE EXCEPTION 'Choose an end date within 30 days.' USING ERRCODE='22023'; END IF;
    UPDATE socialu.profile_corner_polls SET is_current=false WHERE owner_id=me AND is_current;
    INSERT INTO socialu.profile_corner_polls(owner_id,question,option_a,option_b,ends_at)
      VALUES(me,btrim(p_payload->>'question'),btrim(p_payload->'options'->>0),btrim(p_payload->'options'->>1),until_at);
  ELSIF p_action='create_plan' THEN
    IF jsonb_typeof(p_payload->'title') IS DISTINCT FROM 'string' OR length(btrim(p_payload->>'title')) NOT BETWEEN 1 AND 100
      OR jsonb_typeof(p_payload->'location') IS DISTINCT FROM 'string' OR length(btrim(p_payload->>'location')) NOT BETWEEN 1 AND 100
      OR jsonb_typeof(p_payload->'capacity') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Add a title, location and capacity.' USING ERRCODE='22023'; END IF;
    IF (p_payload->>'capacity')::numeric <> trunc((p_payload->>'capacity')::numeric) OR (p_payload->>'capacity')::numeric NOT BETWEEN 2 AND 20 THEN RAISE EXCEPTION 'Choose 2–20 people including you.' USING ERRCODE='22023'; END IF;
    until_at := (p_payload->>'startsAt')::timestamptz;
    IF until_at IS NULL OR until_at <= now() OR until_at > now()+INTERVAL '90 days' THEN RAISE EXCEPTION 'Choose a future plan within 90 days.' USING ERRCODE='22023'; END IF;
    UPDATE socialu.profile_corner_plans SET is_current=false,cancelled=true WHERE owner_id=me AND is_current;
    INSERT INTO socialu.profile_corner_plans(owner_id,title,location,starts_at,capacity)
      VALUES(me,btrim(p_payload->>'title'),btrim(p_payload->>'location'),until_at,(p_payload->>'capacity')::integer);
  ELSIF p_action IN ('vote','close_poll','join_plan','leave_plan','cancel_plan') THEN
    IF jsonb_typeof(p_payload->'id') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Choose a valid card.' USING ERRCODE='22023'; END IF;
    IF (p_payload->>'id')::numeric <> trunc((p_payload->>'id')::numeric) OR (p_payload->>'id')::numeric NOT BETWEEN 1 AND 9007199254740991 THEN
      RAISE EXCEPTION 'Choose a valid card.' USING ERRCODE='22023';
    END IF;
    card_id := (p_payload->>'id')::bigint;
    IF p_action IN ('vote','close_poll') THEN
      SELECT * INTO poll FROM socialu.profile_corner_polls WHERE owner_id=target AND is_current AND poll_id=card_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'This poll is no longer available.' USING ERRCODE='P0002'; END IF;
      IF p_action='close_poll' THEN UPDATE socialu.profile_corner_polls SET ends_at=least(ends_at,now()) WHERE poll_id=card_id;
      ELSE
        IF target=me THEN RAISE EXCEPTION 'Classmates can vote on your poll.' USING ERRCODE='22023'; END IF;
        IF poll.ends_at <= now() THEN RAISE EXCEPTION 'This poll has ended.' USING ERRCODE='P0001'; END IF;
        IF p_payload->'choice' NOT IN ('0'::jsonb,'1'::jsonb) OR p_payload->'choice' IS NULL THEN RAISE EXCEPTION 'Choose one option.' USING ERRCODE='22023'; END IF;
        INSERT INTO socialu.profile_corner_votes(poll_id,student_id,choice) VALUES(card_id,me,(p_payload->>'choice')::smallint)
          ON CONFLICT(poll_id,student_id) DO UPDATE SET choice=excluded.choice;
      END IF;
    ELSE
      SELECT * INTO plan FROM socialu.profile_corner_plans WHERE owner_id=target AND is_current AND plan_id=card_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'This plan is no longer available.' USING ERRCODE='P0002'; END IF;
      IF p_action='cancel_plan' THEN UPDATE socialu.profile_corner_plans SET cancelled=true WHERE plan_id=card_id;
      ELSIF p_action='leave_plan' THEN DELETE FROM socialu.profile_corner_guests WHERE plan_id=card_id AND student_id=me;
      ELSE
        IF target=me THEN RAISE EXCEPTION 'You are already hosting this plan.' USING ERRCODE='22023'; END IF;
        IF plan.cancelled OR plan.starts_at <= now() THEN RAISE EXCEPTION 'This plan is no longer open.' USING ERRCODE='P0001'; END IF;
        -- Release unavailable guests before filling a spot. Count all remaining
        -- reservations so later unblocking/reactivation cannot overbook the plan.
        DELETE FROM socialu.profile_corner_guests g USING socialu.students s
          WHERE g.plan_id=card_id AND s.student_id=g.student_id AND (NOT s.is_active OR socialu.is_blocked(target,g.student_id));
        SELECT 1+count(*) INTO seats FROM socialu.profile_corner_guests WHERE plan_id=card_id;
        IF NOT EXISTS(SELECT 1 FROM socialu.profile_corner_guests WHERE plan_id=card_id AND student_id=me) AND seats >= plan.capacity THEN
          RAISE EXCEPTION 'This plan is full. Try another study break.' USING ERRCODE='P0001';
        END IF;
        INSERT INTO socialu.profile_corner_guests(plan_id,student_id) VALUES(card_id,me) ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;
  SELECT c.vibe,c.goals INTO vibe,goals FROM socialu.profile_corners c WHERE student_id=target;
  SELECT * INTO poll FROM socialu.profile_corner_polls WHERE owner_id=target AND is_current;
  IF FOUND THEN
    SELECT count(*) FILTER(WHERE v.choice=0),count(*) FILTER(WHERE v.choice=1) INTO a,b FROM socialu.profile_corner_votes v
      JOIN socialu.students s ON s.student_id=v.student_id WHERE v.poll_id=poll.poll_id AND s.is_active AND NOT socialu.is_blocked(target,v.student_id);
    SELECT choice INTO my_choice FROM socialu.profile_corner_votes WHERE poll_id=poll.poll_id AND student_id=me;
    poll_json := jsonb_build_object('id',poll.poll_id,'question',poll.question,'options',jsonb_build_array(
      jsonb_build_object('text',poll.option_a,'votes',a),jsonb_build_object('text',poll.option_b,'votes',b)),
      'totalVotes',a+b,'choice',my_choice,'endsAt',poll.ends_at,'closed',poll.ends_at<=now());
  END IF;
  SELECT * INTO plan FROM socialu.profile_corner_plans WHERE owner_id=target AND is_current;
  IF FOUND AND NOT plan.cancelled THEN
    SELECT 1+count(*) INTO seats FROM socialu.profile_corner_guests g JOIN socialu.students s ON s.student_id=g.student_id
      WHERE g.plan_id=plan.plan_id AND s.is_active AND NOT socialu.is_blocked(target,g.student_id);
    SELECT coalesce(jsonb_agg(jsonb_build_object('username',s.username,'name',coalesce(p.display_name,s.full_name)) ORDER BY s.student_id),'[]'::jsonb) INTO people
      FROM socialu.profile_corner_guests g JOIN socialu.students s ON s.student_id=g.student_id LEFT JOIN socialu.student_profiles p ON p.student_id=s.student_id
      WHERE g.plan_id=plan.plan_id AND s.is_active AND NOT socialu.is_blocked(target,g.student_id) AND NOT socialu.is_blocked(me,g.student_id);
    plan_json := jsonb_build_object('id',plan.plan_id,'title',plan.title,'location',plan.location,'startsAt',plan.starts_at,'capacity',plan.capacity,
      'joinedCount',seats,'joined',me=target OR EXISTS(SELECT 1 FROM socialu.profile_corner_guests WHERE plan_id=plan.plan_id AND student_id=me),
      'ended',plan.starts_at<=now(),'people',people);
  END IF;
  RETURN jsonb_build_object('vibe',vibe,'goals',coalesce(goals,'[]'::jsonb),'poll',poll_json,'plan',plan_json);
END;
$$;
REVOKE ALL ON FUNCTION public.socialu_profile_corner(UUID,TEXT,TEXT,JSONB) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_profile_corner(UUID,TEXT,TEXT,JSONB) TO service_role;
