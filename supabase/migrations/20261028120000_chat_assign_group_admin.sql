-- SRS-204.2 (UR-204) assign administrator privileges.
-- "When the group owner assigns administrator privileges to a selected member, the system shall change that
-- member's group role to administrator."
-- Adds two server-only functions:
--   public.socialu_group_members: the group's current members with their names and roles, so the owner can
--     select one (SRS-204.1). Any current member may read it; it is the same membership the header already counts.
--   public.socialu_assign_group_admin: the owner gives one selected current regular member the administrator role.
-- The surrounding rules in UR-204 are enforced here because the role change cannot be correct without them:
--   SRS-204.3 / SRS-204.4 a group has at most one administrator, so a second assignment is refused;
--   SRS-204.5 only the owner may assign; SRS-204.9 the current owner is never changed.
-- Additive only: two new functions; no table, policy, or existing function changes.
-- Apply once after 20261027120200_chat_reactions_in_history.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required (from public.socialu_require_student)
--   SC404 conversation not available (missing and forbidden look the same, SRS-213.1)
--   SCA01 not the group's owner
--   SCA02 the group already has an administrator
--   SCA03 that student is not a current regular member of this group

CREATE FUNCTION public.socialu_group_members(p_auth_id UUID, p_conversation_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; c socialu.conversations%ROWTYPE; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- The one participant check every Chat function uses (#299).
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id;
  IF NOT FOUND OR c.kind <> 'group' OR NOT socialu.is_current_participant(c.conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  -- Current members only, owner first, then the administrator, then regular members by name.
  SELECT jsonb_build_object('student_id', me::text, 'members', coalesce(jsonb_agg(jsonb_build_object(
      'student_id', m.student_id::text, 'username', m.username, 'name', m.name, 'role', m.role)
      ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'administrator' THEN 1 ELSE 2 END, m.name, m.student_id), '[]'::jsonb))
    INTO result
    FROM (SELECT gm.student_id, gm.role, s.username, coalesce(sp.display_name, s.full_name) AS name
            FROM socialu.group_memberships gm
            JOIN socialu.students s ON s.student_id = gm.student_id
            LEFT JOIN socialu.student_profiles sp ON sp.student_id = gm.student_id
           WHERE gm.conversation_id = c.conversation_id AND gm.left_at IS NULL) m;
  RETURN result;
END;
$$;

CREATE FUNCTION public.socialu_assign_group_admin(p_auth_id UUID, p_conversation_id BIGINT, p_username TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; c socialu.conversations%ROWTYPE; chosen socialu.students%ROWTYPE;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- Lock the conversation so two assignments at the same moment cannot both pass the one-administrator check.
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id FOR UPDATE;
  IF NOT FOUND OR NOT socialu.is_current_participant(c.conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  -- SRS-204.5: only the group's current owner assigns the administrator.
  IF c.kind <> 'group' OR NOT EXISTS (SELECT 1 FROM socialu.group_memberships gm
      WHERE gm.conversation_id = c.conversation_id AND gm.student_id = me AND gm.left_at IS NULL
        AND gm.role = 'owner') THEN
    RAISE EXCEPTION 'Only the group owner can assign an administrator.' USING ERRCODE = 'SCA01';
  END IF;
  -- SRS-204.3 / SRS-204.4: one administrator at a time; the position must be vacant.
  IF EXISTS (SELECT 1 FROM socialu.group_memberships gm WHERE gm.conversation_id = c.conversation_id
      AND gm.left_at IS NULL AND gm.role = 'administrator') THEN
    RAISE EXCEPTION 'This group already has an administrator.' USING ERRCODE = 'SCA02';
  END IF;
  -- SRS-204.1: the chosen student must be a current regular member of this group (never the owner).
  SELECT * INTO chosen FROM socialu.students WHERE username = btrim(coalesce(p_username, '')) AND is_active;
  IF chosen.student_id IS NULL OR NOT EXISTS (SELECT 1 FROM socialu.group_memberships gm
      WHERE gm.conversation_id = c.conversation_id AND gm.student_id = chosen.student_id
        AND gm.left_at IS NULL AND gm.role = 'member') THEN
    RAISE EXCEPTION 'Choose a current member of this group.' USING ERRCODE = 'SCA03';
  END IF;

  -- SRS-204.2: the selected member's role becomes administrator. SRS-204.9: the owner's row is untouched.
  UPDATE socialu.group_memberships SET role = 'administrator'
   WHERE conversation_id = c.conversation_id AND student_id = chosen.student_id AND left_at IS NULL;
  -- Report any group-structure problem from inside the function, as when creating a group.
  SET CONSTRAINTS ALL IMMEDIATE;

  RETURN jsonb_build_object('conversation_id', c.conversation_id::text,
    'member', jsonb_build_object('student_id', chosen.student_id::text, 'username', chosen.username,
      'name', coalesce((SELECT sp.display_name FROM socialu.student_profiles sp
                          WHERE sp.student_id = chosen.student_id), chosen.full_name),
      'role', 'administrator'));
END;
$$;

-- Server-only, like the other chat functions: browsers cannot call them directly.
REVOKE ALL ON FUNCTION public.socialu_group_members(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_group_members(UUID, BIGINT) TO service_role;
REVOKE ALL ON FUNCTION public.socialu_assign_group_admin(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_assign_group_admin(UUID, BIGINT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
