-- #1382 RLS, KB: Secure the events table.
-- Turns on Row Level Security for socialu.events, so the table protects itself even if it is ever reached from
-- the browser through the Data API (the anon key is public). Today socialu is not exposed and the browser roles
-- have no grants on it; this is the second lock. Attack tests: __tests__/security/events.rls.test.ts.
--
-- Rules ("me" = the caller's auth.uid() as a verified, active student, the same account check as the app):
--   SELECT  events at my university that are active, or that I host, or (cancelled) I was invited to or attending
--           -- the same events the Events page shows me (socialu.event_viewable_by).
--   INSERT  only as the event's creator, active, not cancelled, starting in the future.
--   UPDATE  only my own active event, and it must stay mine, active and in the future.
--   DELETE  nobody: events are cancelled, not deleted (SRS-404.7), so invitees keep the notice.
--   anon    nothing.
--
-- The app is unaffected: every events feature runs through SECURITY DEFINER functions owned by the table owner,
-- and the server's service_role has BYPASSRLS. RLS is enabled but not forced, so the owner still bypasses it.
-- Additive. Apply once after 20261117180000_open_event_invitations.sql. Safe to re-run.

-- Who is asking: the signed-in user's student id, or null if they are signed out or not a verified, active student.
CREATE OR REPLACE FUNCTION socialu.rls_student_id() RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT student_id FROM socialu.students
  WHERE auth_user_id = auth.uid() AND is_active AND NOT reverification_required AND email_verified_at IS NOT NULL;
$$;

-- Is this creator at the caller's university? False for anyone who is not a verified, active student.
CREATE OR REPLACE FUNCTION socialu.rls_same_university(p_creator_id BIGINT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM socialu.students me
    JOIN socialu.university_domains md ON md.domain = me.email_domain
    JOIN socialu.students cr ON cr.student_id = p_creator_id
    JOIN socialu.university_domains cd ON cd.domain = cr.email_domain AND cd.university_id = md.university_id
    WHERE me.student_id = socialu.rls_student_id()
  );
$$;

-- Was the caller invited to, or attending, this event? (Who may still see it once it is cancelled.)
CREATE OR REPLACE FUNCTION socialu.rls_involved_in_event(p_event_id BIGINT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM socialu.event_invitations WHERE event_id = p_event_id AND invitee_id = socialu.rls_student_id())
      OR EXISTS (SELECT 1 FROM socialu.event_attendees WHERE event_id = p_event_id AND student_id = socialu.rls_student_id());
$$;

-- The policies run as the caller, so signed-in users need to call these. They only reveal the caller's own id
-- and yes/no answers about rows the policies already guard; signed-out visitors get nothing.
REVOKE ALL ON FUNCTION socialu.rls_student_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION socialu.rls_same_university(BIGINT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION socialu.rls_involved_in_event(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION socialu.rls_student_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION socialu.rls_same_university(BIGINT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION socialu.rls_involved_in_event(BIGINT) TO authenticated, service_role;

-- 1. Turn RLS on. From here, every row is hidden from anon and authenticated until a policy allows it.
ALTER TABLE socialu.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can read the events they are allowed to see" ON socialu.events;
DROP POLICY IF EXISTS "Students can create events as themselves" ON socialu.events;
DROP POLICY IF EXISTS "Hosts can update their own active events" ON socialu.events;

-- 2. READ: active events at my university; my own events; cancelled events I was invited to or attending.
--    Checked on the row's own columns, so a host can read back the event they just created.
CREATE POLICY "Students can read the events they are allowed to see"
  ON socialu.events FOR SELECT TO authenticated
  USING (
    socialu.rls_same_university(creator_id)
    AND (status = 'active' OR creator_id = (SELECT socialu.rls_student_id()) OR socialu.rls_involved_in_event(event_id))
  );

-- 3. CREATE: only with myself as the creator, as an active event that has not started yet.
CREATE POLICY "Students can create events as themselves"
  ON socialu.events FOR INSERT TO authenticated
  WITH CHECK (
    creator_id = (SELECT socialu.rls_student_id())
    AND status = 'active' AND cancelled_at IS NULL AND starts_at > now()
  );

-- 4. UPDATE: only my own active event (USING), and it must still be mine, active and upcoming afterwards
--    (WITH CHECK), so it can't be handed to someone else. Cancelling goes through the app, which notifies invitees.
CREATE POLICY "Hosts can update their own active events"
  ON socialu.events FOR UPDATE TO authenticated
  USING (creator_id = (SELECT socialu.rls_student_id()) AND status = 'active')
  WITH CHECK (
    creator_id = (SELECT socialu.rls_student_id())
    AND status = 'active' AND cancelled_at IS NULL AND starts_at > now()
  );

-- 5. DELETE: intentionally no policy, so nobody can delete events through the API.
-- 6. anon (not signed in): intentionally no policy, so visitors see nothing.

NOTIFY pgrst, 'reload schema';
