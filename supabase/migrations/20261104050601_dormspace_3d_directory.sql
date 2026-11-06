-- DormSpace 3D shared DormHall directory (SRS-507.2 to SRS-507.9, SRS-507.15 to SRS-507.18 as revised
-- 4 November 2026, SRS-507.20 to SRS-507.24). Additive and rerunnable. Apply after the DormSpace,
-- friendship, multiplayer and school community migrations.
--
-- Every eligible student in a school gets one permanent room number, shared by every viewer in
-- that school. Assignments never move: ending a friendship, blocking or deactivating an account
-- only changes how that door is shown (a locked placeholder), so other door numbers stay stable.
-- The existing personalized hall (socialu_dorm 'hall') is unchanged for the 2D pages, and room
-- entry is still authorized only by socialu_dorm 'open' (owner or current friend).
BEGIN;

CREATE SCHEMA IF NOT EXISTS dormspace_directory;
REVOKE ALL ON SCHEMA dormspace_directory FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA dormspace_directory TO service_role;

CREATE TABLE IF NOT EXISTS dormspace_directory.room_assignments (
  university_id SMALLINT NOT NULL REFERENCES socialu.university(university_id),
  -- floor = room_index / 12 + 1, door slot = room_index % 12 (999 floors at most).
  room_index INTEGER NOT NULL CHECK (room_index BETWEEN 0 AND 11987),
  student_id BIGINT NOT NULL REFERENCES socialu.students(student_id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (university_id, room_index),
  UNIQUE (university_id, student_id)
);
ALTER TABLE dormspace_directory.room_assignments ENABLE ROW LEVEL SECURITY;
-- No policies and no grants: only the definer functions below read or write assignments.
REVOKE ALL ON ALL TABLES IN SCHEMA dormspace_directory FROM PUBLIC, anon, authenticated, service_role;

-- SRS-507.16 (revised): assignments are permanent; nothing compacts or reassigns a door.
CREATE OR REPLACE FUNCTION dormspace_directory.keep_assignment() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'DormHall room assignments are permanent.' USING ERRCODE = '42501';
END;
$$;
DROP TRIGGER IF EXISTS keep_assignment ON dormspace_directory.room_assignments;
CREATE TRIGGER keep_assignment BEFORE UPDATE OR DELETE ON dormspace_directory.room_assignments
  FOR EACH ROW EXECUTE FUNCTION dormspace_directory.keep_assignment();

-- The student's school, from the same domain mapping used by socialu.same_school.
CREATE OR REPLACE FUNCTION dormspace_directory.school_of(p_student BIGINT) RETURNS SMALLINT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT d.university_id FROM socialu.students s
    JOIN socialu.university_domains d ON d.domain = s.email_domain
   WHERE s.student_id = p_student;
$$;

-- Assigns the next free room numbers, in stable account order, to eligible schoolmates who have
-- none yet. The per-school advisory lock serializes concurrent first visits; the unique keys are
-- the final guard. Reads that find nobody missing take no lock.
CREATE OR REPLACE FUNCTION dormspace_directory.assign_school(p_school SMALLINT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE next_index INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM socialu.students s JOIN socialu.university_domains d ON d.domain = s.email_domain
     WHERE d.university_id = p_school AND s.is_active AND NOT s.reverification_required
       AND s.email_verified_at IS NOT NULL AND s.auth_user_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM dormspace_directory.room_assignments r
                        WHERE r.university_id = p_school AND r.student_id = s.student_id)) THEN
    RETURN;
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('dormspace-directory:' || p_school::TEXT, 0));
  SELECT coalesce(max(r.room_index) + 1, 0) INTO next_index
    FROM dormspace_directory.room_assignments r WHERE r.university_id = p_school;
  INSERT INTO dormspace_directory.room_assignments (university_id, room_index, student_id)
  SELECT p_school, next_index + (row_number() OVER (ORDER BY s.student_id))::INTEGER - 1, s.student_id
    FROM socialu.students s JOIN socialu.university_domains d ON d.domain = s.email_domain
   WHERE d.university_id = p_school AND s.is_active AND NOT s.reverification_required
     AND s.email_verified_at IS NOT NULL AND s.auth_user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM dormspace_directory.room_assignments r
                      WHERE r.university_id = p_school AND r.student_id = s.student_id)
   ORDER BY s.student_id;
END;
$$;

-- How a door appears to `p_viewer`. Identity is withheld (locked placeholder) for blocked pairs,
-- other schools and inactive or unverified accounts, following the existing privacy rules.
CREATE OR REPLACE FUNCTION dormspace_directory.door_state(p_viewer BIGINT, p_resident BIGINT) RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE
    WHEN p_resident = p_viewer THEN 'own'
    WHEN NOT EXISTS (SELECT 1 FROM socialu.students s WHERE s.student_id = p_resident AND s.is_active
                      AND NOT s.reverification_required AND s.email_verified_at IS NOT NULL)
      OR socialu.is_blocked(p_viewer, p_resident) OR NOT socialu.same_school(p_viewer, p_resident) THEN 'withheld'
    WHEN socialu.are_friends(p_viewer, p_resident) THEN 'friend'
    ELSE 'locked' END;
$$;

-- Actions: 'directory' {floor?} returns one floor (12 doors at most; never the whole campus) and
-- 'locate' {username} returns the floor of a visible schoolmate's door, for returning from a room.
CREATE OR REPLACE FUNCTION dormspace_directory.operate(p_auth_id UUID, p_action TEXT, p_payload JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me BIGINT; school SMALLINT; mine INTEGER; floors INTEGER; v_floor INTEGER; found_index INTEGER; found_name TEXT;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF p_action IS NULL OR p_action NOT IN ('directory', 'locate') THEN
    RAISE EXCEPTION 'Choose a valid DormHall action.' USING ERRCODE = '22023';
  END IF;
  school := dormspace_directory.school_of(me);
  IF school IS NULL THEN
    RAISE EXCEPTION 'Your school community is not available yet.' USING ERRCODE = '42501';
  END IF;
  PERFORM dormspace_directory.assign_school(school);
  SELECT r.room_index INTO mine FROM dormspace_directory.room_assignments r WHERE r.university_id = school AND r.student_id = me;
  IF mine IS NULL THEN
    RAISE EXCEPTION 'Your DormHall room is not available yet.' USING ERRCODE = '42501';
  END IF;

  IF p_action = 'locate' THEN
    SELECT r.room_index, s.username INTO found_index, found_name
      FROM dormspace_directory.room_assignments r JOIN socialu.students s ON s.student_id = r.student_id
     WHERE r.university_id = school AND s.username = btrim(coalesce(p_payload->>'username', ''))
       AND dormspace_directory.door_state(me, r.student_id) IN ('own', 'friend', 'locked');
    RETURN jsonb_build_object('location', CASE WHEN found_index IS NULL THEN NULL ELSE
      jsonb_build_object('username', found_name, 'floor', found_index / 12 + 1, 'slot', found_index % 12) END);
  END IF;

  SELECT max(r.room_index) / 12 + 1 INTO floors FROM dormspace_directory.room_assignments r WHERE r.university_id = school;
  IF p_payload ? 'floor' AND p_payload->>'floor' IS NOT NULL THEN
    IF p_payload->>'floor' !~ '^[1-9][0-9]{0,2}$' THEN
      RAISE EXCEPTION 'Choose a valid floor.' USING ERRCODE = '22023';
    END IF;
    v_floor := least((p_payload->>'floor')::INTEGER, floors);
  ELSE
    v_floor := mine / 12 + 1;
  END IF;

  RETURN jsonb_build_object(
    'floor', v_floor, 'floorCount', floors, 'roomsPerFloor', 12,
    'me', jsonb_build_object('username', (SELECT s.username FROM socialu.students s WHERE s.student_id = me),
                             'floor', mine / 12 + 1, 'slot', mine % 12),
    'doors', coalesce((
      SELECT jsonb_agg(jsonb_build_object('slot', r.room_index % 12, 'state', d.state,
               'username', CASE WHEN d.state IN ('own', 'friend', 'locked') THEN s.username END) ORDER BY r.room_index)
        FROM dormspace_directory.room_assignments r
        JOIN socialu.students s ON s.student_id = r.student_id
        CROSS JOIN LATERAL (SELECT dormspace_directory.door_state(me, r.student_id) AS state) d
       WHERE r.university_id = school AND r.room_index BETWEEN (v_floor - 1) * 12 AND v_floor * 12 - 1), '[]'::jsonb));
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA dormspace_directory FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION dormspace_directory.operate(UUID, TEXT, JSONB) TO service_role;

-- Service-only invoker bridge called by /api/dorm/hall after verifiedUser(); no client role may call it.
CREATE OR REPLACE FUNCTION public.socialu_dorm_directory(p_auth_id UUID, p_action TEXT, p_payload JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT dormspace_directory.operate(p_auth_id, p_action, p_payload);
$$;
REVOKE ALL ON FUNCTION public.socialu_dorm_directory(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_dorm_directory(UUID, TEXT, JSONB) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
