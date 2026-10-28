-- SRS-208.2 (UR-208) promote the administrator to owner.
-- "When the group owner leaves, the system shall assign the current administrator as the new group owner."
-- Replaces public.socialu_leave_group (from 20261028120300_chat_leave_group.sql) so the owner can leave once the
-- group has an administrator. Everything else about leaving, including the checks and the grants
-- (CREATE OR REPLACE keeps them: service_role only), is unchanged.
--
-- The whole handover is one all-or-nothing step (SRS-208.3), so the group is never committed without an owner
-- (SRS-208.9). Inside it the rows are updated in this order:
--   1. the departing owner's role becomes 'member', which frees the owner position;
--   2. the administrator's role becomes 'owner', completing the promotion (SRS-208.2) and leaving the
--      administrator position unassigned (SRS-208.5);
--   3. the departing owner's left_at is stamped, removing them from current membership (SRS-208.4).
-- Step 1 is bookkeeping, not a demotion anyone sees: group_current_owner is a partial unique index, which
-- Postgres checks as each row is written rather than at the end of the transaction, so the old and new owner
-- cannot both hold the role even for one statement. The exactly-one-owner rule is the deferred constraint
-- trigger group_membership_structure, which tolerates the gap and is checked when the function returns. The
-- departing owner's history row is therefore left reading 'member'; role only describes current membership, and
-- nothing reads it for a row whose left_at is set.
--
-- The former owner keeps the history they could already see (SRS-208.7) and receives nothing sent afterwards
-- (SRS-208.8), for the same reason as every other departure: the membership row is kept, so can_read_message
-- still matches their membership period while is_current_participant does not.
-- Apply once after 20261028120300_chat_leave_group.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required (from public.socialu_require_student)
--   SC404 conversation not available (missing and forbidden look the same, SRS-213.1)
--   SCL01 the owner cannot leave until the group has an administrator (SRS-208.1)

CREATE OR REPLACE FUNCTION public.socialu_leave_group(p_auth_id UUID, p_conversation_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; c socialu.conversations%ROWTYPE; my_role TEXT; successor BIGINT; members BIGINT; new_owner JSONB;
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

  IF my_role = 'owner' THEN
    -- SRS-208.1: the owner leaves only when there is an administrator to take the group on.
    SELECT gm.student_id INTO successor FROM socialu.group_memberships gm
     WHERE gm.conversation_id = c.conversation_id AND gm.left_at IS NULL AND gm.role = 'administrator';
    IF successor IS NULL THEN
      RAISE EXCEPTION 'Assign an administrator before you leave the group.' USING ERRCODE = 'SCL01';
    END IF;
    -- 1. Free the owner position (see the note above on why this comes first).
    UPDATE socialu.group_memberships SET role = 'member'
     WHERE conversation_id = c.conversation_id AND student_id = me AND left_at IS NULL;
    -- 2. SRS-208.2 / SRS-208.3 / SRS-208.5: the administrator becomes the owner, and no administrator remains.
    UPDATE socialu.group_memberships SET role = 'owner'
     WHERE conversation_id = c.conversation_id AND student_id = successor AND left_at IS NULL;
    SELECT jsonb_build_object('student_id', s.student_id::text, 'username', s.username,
             'name', coalesce(sp.display_name, s.full_name))
      INTO new_owner
      FROM socialu.students s LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
     WHERE s.student_id = successor;
  END IF;

  -- 3. SRS-207.3 / SRS-208.4: the student leaves the group's current membership. For the owner this happens only
  -- after the promotion above, so the group always has an owner when the transaction is checked.
  UPDATE socialu.group_memberships SET left_at = now()
   WHERE conversation_id = c.conversation_id AND student_id = me AND left_at IS NULL;
  -- Check the group's structure now, so any problem is reported from inside this function and nothing is saved.
  SET CONSTRAINTS ALL IMMEDIATE;
  SELECT count(*) INTO members FROM socialu.group_memberships gm
   WHERE gm.conversation_id = c.conversation_id AND gm.left_at IS NULL;

  RETURN jsonb_build_object('conversation_id', c.conversation_id::text, 'member_count', members,
    'left_role', my_role, 'new_owner', new_owner);
END;
$$;

NOTIFY pgrst, 'reload schema';
