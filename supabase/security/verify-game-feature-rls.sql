-- Run AFTER the feature RLS migration, as the database administrator.
-- Uses real PostgreSQL roles + JWT claim settings, not service_role attacks.
-- All temporary grants and no-op updates are rolled back. Requires existing
-- owner and unrelated-user fixtures; missing fixtures fail instead of skipping.
BEGIN;
CREATE TEMP TABLE game_rls_context AS
SELECT d.owner_id, s.auth_user_id AS owner_uid, outsider.student_id AS other_id,
  outsider.auth_user_id AS other_uid
FROM socialu.dorms d JOIN socialu.students s ON s.student_id=d.owner_id
CROSS JOIN LATERAL (
  SELECT x.student_id,x.auth_user_id FROM socialu.students x
  WHERE x.student_id<>d.owner_id AND x.auth_user_id IS NOT NULL AND x.is_active
    AND NOT x.reverification_required AND x.email_verified_at IS NOT NULL
    AND NOT socialu.are_friends(d.owner_id,x.student_id)
  ORDER BY x.student_id LIMIT 1
) outsider
WHERE s.auth_user_id IS NOT NULL AND s.is_active AND NOT s.reverification_required
  AND s.email_verified_at IS NOT NULL
  AND EXISTS(SELECT 1 FROM socialu.point_transactions t WHERE t.student_id=d.owner_id)
ORDER BY d.owner_id LIMIT 1;
DO $$ BEGIN
  IF (SELECT count(*) FROM game_rls_context)<>1 THEN
    RAISE EXCEPTION 'Need a dorm owner with point history and a verified unrelated user';
  END IF;
END $$;
CREATE TEMP TABLE game_rls_targets(name text PRIMARY KEY);
INSERT INTO game_rls_targets VALUES
 ('socialu.activities'),('socialu.catalog_items'),('socialu.owned_items'),
 ('socialu.room_surfaces'),('socialu.reserved_room_cells'),('socialu.item_footprints'),
 ('socialu.compatible_item_overlaps'),('socialu.dorms'),('socialu.dorm_placements'),
 ('socialu.guestbook_notes'),('socialu.counted_dorm_visits'),('socialu.game_levels'),
 ('socialu.participation_settings'),('socialu.participation_events'),('socialu.streak_instances'),
 ('socialu.participation_days'),('socialu.reminder_dismissals'),('socialu.level_completions'),
 ('socialu.snipe_requests'),('socialu.snipe_tags'),('socialu.snipe_reports'),
 ('socialu.snipe_photo_stages'),('socialu.reward_rules'),('socialu.point_transactions'),
 ('dormspace_directory.room_assignments'),('dormspace_live.players'),('dormspace_live.messages'),
 ('dormspace_live.voice_leases'),('dormspace_live.voice_sweep_health'),('dormspace_music.tracks');
CREATE TEMP TABLE game_rls_results(label text PRIMARY KEY, passed boolean NOT NULL);
GRANT SELECT ON game_rls_context, game_rls_targets TO anon,authenticated;
GRANT SELECT,INSERT ON game_rls_results TO anon,authenticated;

DO $probe$
DECLARE target text;
BEGIN
  FOR target IN SELECT name FROM game_rls_targets LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=target::regclass) THEN
      RAISE EXCEPTION 'RLS is disabled on %',target;
    END IF;
    IF has_table_privilege('anon',target,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')
      OR has_table_privilege('authenticated',target,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') THEN
      RAISE EXCEPTION 'Unexpected persistent client grant on %',target;
    END IF;
    -- Transaction-only grants expose policy mistakes rather than hiding them
    -- behind the intentionally private schema and table ACLs.
    EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON %s TO anon,authenticated',target::regclass);
  END LOOP;
END;
$probe$;
GRANT USAGE ON SCHEMA socialu,auth,dormspace_directory,dormspace_live,dormspace_music TO anon,authenticated;

SELECT set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claims','{}',true);
SET LOCAL ROLE anon;
DO $visitor$
DECLARE target text; visible bigint;
BEGIN
  IF current_user<>'anon' OR auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Invalid visitor role'; END IF;
  FOR target IN SELECT name FROM game_rls_targets LOOP
    EXECUTE format('SELECT count(*) FROM %s',target::regclass) INTO visible;
    INSERT INTO game_rls_results VALUES('visitor:'||target,visible=0);
  END LOOP;
END;
$visitor$;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub',owner_uid::text,true),
  set_config('request.jwt.claims',json_build_object('sub',owner_uid,'role','authenticated')::text,true)
FROM game_rls_context;
SET LOCAL ROLE authenticated;
INSERT INTO game_rls_results SELECT 'owner:mapping',socialu_rls.student_id()=owner_id FROM game_rls_context;
INSERT INTO game_rls_results SELECT 'owner:read',count(*)=1
FROM socialu.dorms WHERE owner_id=(SELECT owner_id FROM game_rls_context);
WITH changed AS (UPDATE socialu.dorms SET welcome_text=welcome_text
  WHERE owner_id=(SELECT owner_id FROM game_rls_context) RETURNING owner_id)
INSERT INTO game_rls_results SELECT 'owner:update',count(*)=1 FROM changed;
DO $transfer$
BEGIN
  BEGIN
    UPDATE socialu.dorms SET owner_id=(SELECT other_id FROM game_rls_context)
      WHERE owner_id=(SELECT owner_id FROM game_rls_context);
    RAISE EXCEPTION 'Owner reassignment unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM NOT LIKE '%row-level security%' THEN RAISE; END IF;
    INSERT INTO game_rls_results VALUES('owner:transfer_denied',true);
  END;
END;
$transfer$;
INSERT INTO game_rls_results SELECT 'owner:points_visible',EXISTS(SELECT 1 FROM socialu.point_transactions);
INSERT INTO game_rls_results SELECT 'owner:points_isolated',NOT EXISTS(
  SELECT 1 FROM socialu.point_transactions WHERE student_id<>socialu_rls.student_id());
WITH changed AS (UPDATE socialu.point_transactions SET points_change=points_change RETURNING transaction_id)
INSERT INTO game_rls_results SELECT 'owner:ledger_update_denied',count(*)=0 FROM changed;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub',other_uid::text,true),
  set_config('request.jwt.claims',json_build_object('sub',other_uid,'role','authenticated')::text,true)
FROM game_rls_context;
SET LOCAL ROLE authenticated;
INSERT INTO game_rls_results SELECT 'other:read_denied',NOT EXISTS(
  SELECT 1 FROM socialu.dorms WHERE owner_id=(SELECT owner_id FROM game_rls_context));
WITH changed AS (UPDATE socialu.dorms SET welcome_text=welcome_text
  WHERE owner_id=(SELECT owner_id FROM game_rls_context) RETURNING owner_id)
INSERT INTO game_rls_results SELECT 'other:update_denied',count(*)=0 FROM changed;
INSERT INTO game_rls_results SELECT 'other:points_isolated',NOT EXISTS(
  SELECT 1 FROM socialu.point_transactions WHERE student_id<>socialu_rls.student_id());
RESET ROLE;

DO $assertions$
DECLARE failed text;
BEGIN
  SELECT string_agg(label,', ') INTO failed FROM game_rls_results WHERE NOT passed;
  IF failed IS NOT NULL THEN RAISE EXCEPTION 'RLS probe failures: %',failed; END IF;
  IF (SELECT count(*) FROM game_rls_results)<>40 THEN RAISE EXCEPTION 'Incomplete RLS probes'; END IF;
END;
$assertions$;
SELECT * FROM game_rls_results ORDER BY label;
ROLLBACK;
SELECT '40 live role assertions passed; all grants and writes rolled back' AS result;
