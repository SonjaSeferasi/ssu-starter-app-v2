-- Snipe, DormSpace and shared points. See supabase/security/game-feature-rls.md.
-- Keep the existing server-only API. Policies are a second boundary, not a grant
-- of raw Data API access. In particular, consent and reward writes stay server-only.
BEGIN;

CREATE SCHEMA IF NOT EXISTS socialu_rls;
REVOKE ALL ON SCHEMA socialu_rls FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA socialu_rls TO authenticated;

-- owner_id/student_id are BIGINT, whereas auth.uid() is UUID. Resolve only the
-- signed-in caller through the private account mapping; never accept a caller ID.
-- Definer rights are needed solely to read private authorization dependencies.
CREATE OR REPLACE FUNCTION socialu_rls.student_id() RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT s.student_id FROM socialu.students s
  WHERE s.auth_user_id = (SELECT auth.uid()) AND s.is_active
    AND NOT s.reverification_required AND s.email_verified_at IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION socialu_rls.dorm_access(p_owner bigint) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM socialu.students s
    WHERE s.student_id = p_owner AND s.is_active
      AND socialu_rls.student_id() IS NOT NULL
      AND (p_owner = socialu_rls.student_id()
        OR socialu.are_friends(socialu_rls.student_id(), p_owner)));
$$;

CREATE OR REPLACE FUNCTION socialu_rls.snipe_role(p_snipe bigint) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT socialu.snipe_viewer_role(r.snipe_id, socialu_rls.student_id())
  FROM socialu.snipe_requests r
  JOIN socialu.conversations c USING (conversation_id)
  WHERE r.snipe_id = p_snipe AND c.kind = 'group'
    AND socialu_rls.student_id() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION socialu_rls.snipe_manager(p_snipe bigint) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM socialu.snipe_requests r
    WHERE r.snipe_id = p_snipe AND socialu_rls.student_id() IS NOT NULL
      AND socialu.snipe_group_manager(r.conversation_id, socialu_rls.student_id()));
$$;

CREATE OR REPLACE FUNCTION socialu_rls.owns_attempt(p_attempt uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM socialu.participation_events e
    WHERE e.event_id = p_attempt AND e.student_id = socialu_rls.student_id());
$$;

REVOKE ALL ON FUNCTION socialu_rls.student_id(), socialu_rls.dorm_access(bigint),
  socialu_rls.snipe_role(bigint), socialu_rls.snipe_manager(bigint),
  socialu_rls.owns_attempt(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION socialu_rls.student_id(), socialu_rls.dorm_access(bigint),
  socialu_rls.snipe_role(bigint), socialu_rls.snipe_manager(bigint),
  socialu_rls.owns_attempt(uuid) TO authenticated;

-- Explicit scope: never enable/grant/revoke unrelated account, feed or chat tables.
-- Reject unexpected policies instead of silently OR-ing with a permissive rule.
DO $security$
DECLARE target text; relation regclass; allowed_names text[];
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'socialu.activities', 'socialu.catalog_items', 'socialu.owned_items',
    'socialu.room_surfaces', 'socialu.reserved_room_cells', 'socialu.item_footprints',
    'socialu.compatible_item_overlaps', 'socialu.dorms', 'socialu.dorm_placements',
    'socialu.guestbook_notes', 'socialu.counted_dorm_visits', 'socialu.game_levels',
    'socialu.participation_settings', 'socialu.participation_events', 'socialu.streak_instances',
    'socialu.participation_days', 'socialu.reminder_dismissals', 'socialu.level_completions',
    'socialu.snipe_requests', 'socialu.snipe_tags', 'socialu.snipe_reports',
    'socialu.snipe_photo_stages', 'socialu.reward_rules', 'socialu.point_transactions',
    'dormspace_directory.room_assignments', 'dormspace_live.players',
    'dormspace_live.messages', 'dormspace_live.voice_leases',
    'dormspace_live.voice_sweep_health', 'dormspace_music.tracks'
  ] LOOP
    relation := target::regclass; -- Fail if the required feature migrations are missing.
    allowed_names := CASE
      WHEN target = 'socialu.dorms' THEN ARRAY['game_rls_read','game_rls_insert','game_rls_update']
      WHEN target IN ('socialu.dorm_placements','socialu.guestbook_notes') THEN
        ARRAY['game_rls_read','game_rls_insert','game_rls_update','game_rls_delete']
      WHEN target = 'socialu.snipe_photo_stages' OR target LIKE 'dormspace%' THEN ARRAY[]::text[]
      ELSE ARRAY['game_rls_read'] END;
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_policy
      WHERE polrelid = relation AND NOT (polname = ANY(allowed_names))) THEN
      RAISE EXCEPTION 'Review unexpected policies on % before installing feature RLS', target;
    END IF;
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', relation);
    EXECUTE format('REVOKE ALL ON TABLE %s FROM PUBLIC, anon, authenticated', relation);
  END LOOP;
END;
$security$;

-- Read-only configuration has no per-student owner. Require an eligible account.
DO $configuration$
DECLARE target text;
BEGIN
  FOREACH target IN ARRAY ARRAY['activities','catalog_items','room_surfaces',
    'reserved_room_cells','item_footprints','compatible_item_overlaps','game_levels','reward_rules'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS game_rls_read ON socialu.%I', target);
    EXECUTE format('CREATE POLICY game_rls_read ON socialu.%I FOR SELECT TO authenticated
      USING ((SELECT socialu_rls.student_id()) IS NOT NULL)', target);
  END LOOP;
END;
$configuration$;

-- The server grants inventory, records visits/completions and calculates rewards.
-- An owner may read their history but cannot manufacture or rewrite it.
DO $history$
DECLARE target text;
BEGIN
  FOREACH target IN ARRAY ARRAY['owned_items','participation_settings','participation_events',
    'streak_instances','participation_days','reminder_dismissals','point_transactions'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS game_rls_read ON socialu.%I', target);
    EXECUTE format('CREATE POLICY game_rls_read ON socialu.%I FOR SELECT TO authenticated
      USING (student_id = (SELECT socialu_rls.student_id()))', target);
  END LOOP;
END;
$history$;

DROP POLICY IF EXISTS game_rls_read ON socialu.level_completions;
CREATE POLICY game_rls_read ON socialu.level_completions FOR SELECT TO authenticated
  USING (socialu_rls.owns_attempt(attempt_id));
DROP POLICY IF EXISTS game_rls_read ON socialu.counted_dorm_visits;
CREATE POLICY game_rls_read ON socialu.counted_dorm_visits FOR SELECT TO authenticated
  USING (dorm_owner_id = (SELECT socialu_rls.student_id())
    OR visitor_id = (SELECT socialu_rls.student_id()));

DROP POLICY IF EXISTS game_rls_read ON socialu.dorms;
CREATE POLICY game_rls_read ON socialu.dorms FOR SELECT TO authenticated
  USING (socialu_rls.dorm_access(owner_id));
DROP POLICY IF EXISTS game_rls_insert ON socialu.dorms;
CREATE POLICY game_rls_insert ON socialu.dorms FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT socialu_rls.student_id()));
DROP POLICY IF EXISTS game_rls_update ON socialu.dorms;
CREATE POLICY game_rls_update ON socialu.dorms FOR UPDATE TO authenticated
  USING (owner_id = (SELECT socialu_rls.student_id()))
  WITH CHECK (owner_id = (SELECT socialu_rls.student_id()));
-- No dorm DELETE: one persistent room (SRS-505.1).

DROP POLICY IF EXISTS game_rls_read ON socialu.dorm_placements;
CREATE POLICY game_rls_read ON socialu.dorm_placements FOR SELECT TO authenticated
  USING (socialu_rls.dorm_access(owner_id));
DROP POLICY IF EXISTS game_rls_insert ON socialu.dorm_placements;
CREATE POLICY game_rls_insert ON socialu.dorm_placements FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT socialu_rls.student_id()));
DROP POLICY IF EXISTS game_rls_update ON socialu.dorm_placements;
CREATE POLICY game_rls_update ON socialu.dorm_placements FOR UPDATE TO authenticated
  USING (owner_id = (SELECT socialu_rls.student_id()))
  WITH CHECK (owner_id = (SELECT socialu_rls.student_id()));
DROP POLICY IF EXISTS game_rls_delete ON socialu.dorm_placements;
CREATE POLICY game_rls_delete ON socialu.dorm_placements FOR DELETE TO authenticated
  USING (owner_id = (SELECT socialu_rls.student_id()));

DROP POLICY IF EXISTS game_rls_read ON socialu.guestbook_notes;
CREATE POLICY game_rls_read ON socialu.guestbook_notes FOR SELECT TO authenticated
  USING (socialu_rls.dorm_access(dorm_owner_id));
DROP POLICY IF EXISTS game_rls_insert ON socialu.guestbook_notes;
CREATE POLICY game_rls_insert ON socialu.guestbook_notes FOR INSERT TO authenticated
  WITH CHECK (author_id = (SELECT socialu_rls.student_id())
    AND dorm_owner_id <> (SELECT socialu_rls.student_id())
    AND socialu_rls.dorm_access(dorm_owner_id));
DROP POLICY IF EXISTS game_rls_update ON socialu.guestbook_notes;
CREATE POLICY game_rls_update ON socialu.guestbook_notes FOR UPDATE TO authenticated
  USING (author_id = (SELECT socialu_rls.student_id()) AND socialu_rls.dorm_access(dorm_owner_id))
  WITH CHECK (author_id = (SELECT socialu_rls.student_id()) AND socialu_rls.dorm_access(dorm_owner_id));
-- Existing immutable-authorship trigger also rejects changes to dorm/author/time.
DROP POLICY IF EXISTS game_rls_delete ON socialu.guestbook_notes;
CREATE POLICY game_rls_delete ON socialu.guestbook_notes FOR DELETE TO authenticated
  USING (dorm_owner_id = (SELECT socialu_rls.student_id())
    OR (author_id = (SELECT socialu_rls.student_id()) AND socialu_rls.dorm_access(dorm_owner_id)));

-- Pending Snipe data is only for its submitter/tagged reviewers in the same group.
-- Other eligible members see published requests, not private consent answers.
DROP POLICY IF EXISTS game_rls_read ON socialu.snipe_requests;
CREATE POLICY game_rls_read ON socialu.snipe_requests FOR SELECT TO authenticated
  USING (socialu_rls.snipe_role(snipe_id) IS NOT NULL);
DROP POLICY IF EXISTS game_rls_read ON socialu.snipe_tags;
CREATE POLICY game_rls_read ON socialu.snipe_tags FOR SELECT TO authenticated
  USING (socialu_rls.snipe_role(snipe_id) IN ('photographer','tagged'));
DROP POLICY IF EXISTS game_rls_read ON socialu.snipe_reports;
CREATE POLICY game_rls_read ON socialu.snipe_reports FOR SELECT TO authenticated
  USING ((reporter_id = (SELECT socialu_rls.student_id()) AND socialu_rls.snipe_role(snipe_id) IS NOT NULL)
    OR socialu_rls.snipe_manager(snipe_id));
-- No raw writes to any Snipe table: the bridges enforce group membership,
-- identity/sharing consent, immutable identities, timeouts, moderation and awards.
-- No policies for photo stages or DormSpace directory/live/voice/music internals:
-- their checked bridges produce redacted responses and authorized signed URLs.

-- Views normally execute with the view owner's rights and could bypass RLS.
ALTER VIEW socialu.points_balances SET (security_invoker = true);
ALTER VIEW socialu.points_history SET (security_invoker = true);
ALTER VIEW socialu.dorm_visit_counts SET (security_invoker = true);
REVOKE ALL ON socialu.points_balances, socialu.points_history, socialu.dorm_visit_counts
  FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
