-- SRS-204.6 (UR-204) revoke administrator privileges.
-- "The system shall allow the group owner to revoke administrator privileges from the currently assigned
-- administrator."
-- Adds one server-only function, public.socialu_revoke_group_admin, which returns the group's current
-- administrator to regular-member status (SRS-204.7). The surrounding UR-204 rules are enforced here because the
-- role change cannot be correct without them: only the owner may revoke (SRS-204.8), and the current owner is
-- never changed (SRS-204.9). Once the position is vacant, the owner can assign a new administrator
-- (20261028120000_chat_assign_group_admin.sql, SRS-204.4).
-- Additive only: one new function; no table, policy, or existing function changes.
-- Apply once after 20261028120000_chat_assign_group_admin.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required (from public.socialu_require_student)
--   SC404 conversation not available (missing and forbidden look the same, SRS-213.1)
--   SCA04 not the group's owner
--   SCA05 that student is not this group's current administrator

CREATE FUNCTION public.socialu_revoke_group_admin(p_auth_id UUID, p_conversation_id BIGINT, p_username TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; c socialu.conversations%ROWTYPE; chosen socialu.students%ROWTYPE;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- Lock the conversation so revoking and assigning at the same moment cannot interleave.
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id FOR UPDATE;
  IF NOT FOUND OR NOT socialu.is_current_participant(c.conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  -- SRS-204.8: only the group's current owner revokes the administrator.
  IF c.kind <> 'group' OR NOT EXISTS (SELECT 1 FROM socialu.group_memberships gm
      WHERE gm.conversation_id = c.conversation_id AND gm.student_id = me AND gm.left_at IS NULL
        AND gm.role = 'owner') THEN
    RAISE EXCEPTION 'Only the group owner can revoke administrator privileges.' USING ERRCODE = 'SCA04';
  END IF;
  -- The named student must be this group's current administrator. A group with no administrator, a student who
  -- is a regular member, and a student outside the group all get the same answer.
  SELECT * INTO chosen FROM socialu.students WHERE username = btrim(coalesce(p_username, '')) AND is_active;
  IF chosen.student_id IS NULL OR NOT EXISTS (SELECT 1 FROM socialu.group_memberships gm
      WHERE gm.conversation_id = c.conversation_id AND gm.student_id = chosen.student_id
        AND gm.left_at IS NULL AND gm.role = 'administrator') THEN
    RAISE EXCEPTION 'Choose this group''s current administrator.' USING ERRCODE = 'SCA05';
  END IF;

  -- SRS-204.6 / SRS-204.7: the administrator returns to regular-member status. SRS-204.9: the owner is untouched.
  UPDATE socialu.group_memberships SET role = 'member'
   WHERE conversation_id = c.conversation_id AND student_id = chosen.student_id AND left_at IS NULL;
  -- Report any group-structure problem from inside the function, as when creating a group.
  SET CONSTRAINTS ALL IMMEDIATE;

  RETURN jsonb_build_object('conversation_id', c.conversation_id::text,
    'member', jsonb_build_object('student_id', chosen.student_id::text, 'username', chosen.username,
      'name', coalesce((SELECT sp.display_name FROM socialu.student_profiles sp
                          WHERE sp.student_id = chosen.student_id), chosen.full_name),
      'role', 'member'));
END;
$$;

-- Server-only, like the other chat functions: browsers cannot call it directly.
REVOKE ALL ON FUNCTION public.socialu_revoke_group_admin(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_revoke_group_admin(UUID, BIGINT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
