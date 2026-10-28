-- SRS-205.10 (UR-205) remove a regular group member.
-- "The system shall allow the group owner or administrator to remove a regular member from the group."
-- Adds one server-only function, public.socialu_remove_group_member, which ends that student's current
-- membership by stamping left_at (SRS-205.11). The membership row itself is kept, which is what makes the rest
-- of UR-205 true without any extra work:
--   SRS-205.12 the shared is_current_participant check already excludes a student whose membership has ended,
--     so they receive and send nothing after removal;
--   SRS-205.13 can_read_message still matches messages sent during their membership period, so the history they
--     could already see stays readable.
-- The surrounding rules are enforced here because the removal cannot be correct without them: only the owner or
-- the administrator may remove (SRS-206.2), and only a regular member can be removed, which protects the owner
-- from the administrator (SRS-206.6) and lets the administrator remove members (SRS-206.9).
-- Additive only: one new function; no table, policy, or existing function changes.
-- Apply once after 20261028120100_chat_revoke_group_admin.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required (from public.socialu_require_student)
--   SC404 conversation not available (missing and forbidden look the same, SRS-213.1)
--   SCM01 not the group's owner or administrator
--   SCM02 that student is not a current regular member of this group

CREATE FUNCTION public.socialu_remove_group_member(p_auth_id UUID, p_conversation_id BIGINT, p_username TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; c socialu.conversations%ROWTYPE; chosen socialu.students%ROWTYPE; members BIGINT;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- Lock the conversation so two managers removing at the same moment cannot interleave.
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id FOR UPDATE;
  IF NOT FOUND OR NOT socialu.is_current_participant(c.conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  -- SRS-205.10 / SRS-206.2 / SRS-206.9: group management belongs to the owner and the administrator.
  IF c.kind <> 'group' OR NOT EXISTS (SELECT 1 FROM socialu.group_memberships gm
      WHERE gm.conversation_id = c.conversation_id AND gm.student_id = me AND gm.left_at IS NULL
        AND gm.role IN ('owner', 'administrator')) THEN
    RAISE EXCEPTION 'Only the group owner or an administrator can remove members.' USING ERRCODE = 'SCM01';
  END IF;
  -- Only a current regular member can be removed. This is what protects the owner from the administrator
  -- (SRS-206.6); the administrator is removed by revoking the role first (SRS-204.6) and a manager who wants out
  -- leaves instead (SRS-207.1, SRS-207.2).
  SELECT * INTO chosen FROM socialu.students WHERE username = btrim(coalesce(p_username, '')) AND is_active;
  IF chosen.student_id IS NULL OR chosen.student_id = me OR NOT EXISTS (SELECT 1 FROM socialu.group_memberships gm
      WHERE gm.conversation_id = c.conversation_id AND gm.student_id = chosen.student_id
        AND gm.left_at IS NULL AND gm.role = 'member') THEN
    RAISE EXCEPTION 'Choose a current member of this group.' USING ERRCODE = 'SCM02';
  END IF;

  -- SRS-205.11: the student leaves the group's current membership. The row stays, so their history is preserved.
  UPDATE socialu.group_memberships SET left_at = now()
   WHERE conversation_id = c.conversation_id AND student_id = chosen.student_id AND left_at IS NULL;
  -- Report any group-structure problem from inside the function, as when creating a group.
  SET CONSTRAINTS ALL IMMEDIATE;
  SELECT count(*) INTO members FROM socialu.group_memberships gm
   WHERE gm.conversation_id = c.conversation_id AND gm.left_at IS NULL;

  RETURN jsonb_build_object('conversation_id', c.conversation_id::text, 'member_count', members,
    'removed', jsonb_build_object('student_id', chosen.student_id::text, 'username', chosen.username,
      'name', coalesce((SELECT sp.display_name FROM socialu.student_profiles sp
                          WHERE sp.student_id = chosen.student_id), chosen.full_name)));
END;
$$;

-- Server-only, like the other chat functions: browsers cannot call it directly.
REVOKE ALL ON FUNCTION public.socialu_remove_group_member(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_remove_group_member(UUID, BIGINT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
