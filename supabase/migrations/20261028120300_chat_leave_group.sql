-- SRS-207.1 (UR-207) leave as a regular member.
-- "The system shall allow a regular group member to leave the group."
-- Adds one server-only function, public.socialu_leave_group, which ends the student's own current membership by
-- stamping left_at (SRS-207.3). The membership row is kept, which is what makes the rest of UR-207 true with no
-- extra work: the shared is_current_participant check already excludes a student whose membership has ended, so
-- nothing sent afterwards reaches them (SRS-207.4), while can_read_message still matches the messages from their
-- membership period (SRS-207.5).
-- An administrator who is not the owner leaves the same way, which is SRS-207.2 and needs no separate code path.
-- The owner is refused while the group has no administrator (SRS-208.1); promoting that administrator and
-- letting the owner leave is SRS-208.2's own work.
-- Additive only: one new function; no table, policy, or existing function changes.
-- Apply once after 20261028120200_chat_remove_group_member.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required (from public.socialu_require_student)
--   SC404 conversation not available (missing and forbidden look the same, SRS-213.1)
--   SCL01 the owner cannot leave until the group has an administrator (SRS-208.1)

CREATE FUNCTION public.socialu_leave_group(p_auth_id UUID, p_conversation_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; c socialu.conversations%ROWTYPE; my_role TEXT; members BIGINT;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- Lock the conversation so leaving cannot interleave with a role change or another departure.
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id FOR UPDATE;
  -- Only a current member of a group can leave one. Private conversations are a fixed pair and are not left.
  IF NOT FOUND OR c.kind <> 'group' OR NOT socialu.is_current_participant(c.conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  SELECT gm.role INTO my_role FROM socialu.group_memberships gm
   WHERE gm.conversation_id = c.conversation_id AND gm.student_id = me AND gm.left_at IS NULL;
  -- SRS-208.1 / SRS-208.9: a group is never left without an owner. The owner hands the group to an administrator
  -- on the way out, so they cannot leave until one is assigned.
  IF my_role = 'owner' THEN
    RAISE EXCEPTION 'Assign an administrator before you leave the group.' USING ERRCODE = 'SCL01';
  END IF;

  -- SRS-207.1 / SRS-207.2 / SRS-207.3: the student leaves the group's current membership. The row stays, so the
  -- history they could already see is preserved.
  UPDATE socialu.group_memberships SET left_at = now()
   WHERE conversation_id = c.conversation_id AND student_id = me AND left_at IS NULL;
  -- Report any group-structure problem from inside the function, as when creating a group.
  SET CONSTRAINTS ALL IMMEDIATE;
  SELECT count(*) INTO members FROM socialu.group_memberships gm
   WHERE gm.conversation_id = c.conversation_id AND gm.left_at IS NULL;

  RETURN jsonb_build_object('conversation_id', c.conversation_id::text, 'member_count', members, 'left_role', my_role);
END;
$$;

-- Server-only, like the other chat functions: browsers cannot call it directly.
REVOKE ALL ON FUNCTION public.socialu_leave_group(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_leave_group(UUID, BIGINT) TO service_role;

NOTIFY pgrst, 'reload schema';
