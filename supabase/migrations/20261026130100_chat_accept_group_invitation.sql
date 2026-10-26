-- SRS-205.6 (UR-205) accept a group invitation, and SRS-205.7 add the accepted invitee. Tasks #493 and #791.
-- The invited student accepts their own pending invitation and joins the group's current membership in the
-- same all-or-nothing step (like SRS-202.1 and SRS-203.1 share socialu_create_group).
-- Additive only: one new server-only function; no table, policy, or existing function changes.
-- The existing group-membership checks (and LN's same-school check, where applied) still run on the new member.
-- Apply once after 20261026130000_chat_pending_group_invitations.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required (from public.socialu_require_student)
--   SCI05 invitation not available (missing, someone else's, already answered, or a block exists)

CREATE FUNCTION public.socialu_accept_group_invitation(p_auth_id UUID, p_invitation_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; inv socialu.group_invitations%ROWTYPE; members BIGINT;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- Lock the invitation so accepting and declining at the same moment cannot both happen.
  SELECT * INTO inv FROM socialu.group_invitations WHERE invitation_id = p_invitation_id FOR UPDATE;
  -- Only the invited student answers, and only while it is pending; every other case gets the same answer.
  IF NOT FOUND OR inv.invitee_id <> me OR inv.status <> 'pending' OR socialu.is_blocked(me, inv.inviter_id) THEN
    RAISE EXCEPTION 'This invitation is no longer available.' USING ERRCODE = 'SCI05';
  END IF;
  -- SRS-205.6: record the acceptance.
  UPDATE socialu.group_invitations SET status = 'accepted' WHERE invitation_id = inv.invitation_id;
  -- SRS-205.7: the student becomes a current (regular) member of the group.
  IF NOT EXISTS (SELECT 1 FROM socialu.group_memberships gm WHERE gm.conversation_id = inv.conversation_id
                  AND gm.student_id = me AND gm.left_at IS NULL) THEN
    INSERT INTO socialu.group_memberships (conversation_id, student_id, role) VALUES (inv.conversation_id, me, 'member');
  END IF;
  -- Run the group structure checks now, so any problem is reported from here and nothing is saved.
  SET CONSTRAINTS ALL IMMEDIATE;
  SELECT count(*) INTO members FROM socialu.group_memberships gm
   WHERE gm.conversation_id = inv.conversation_id AND gm.left_at IS NULL;
  RETURN jsonb_build_object('conversation_id', inv.conversation_id::text, 'member_count', members);
END;
$$;

-- Server-only, like the other chat functions: browsers cannot call it directly.
REVOKE ALL ON FUNCTION public.socialu_accept_group_invitation(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_accept_group_invitation(UUID, BIGINT) TO service_role;

NOTIFY pgrst, 'reload schema';
