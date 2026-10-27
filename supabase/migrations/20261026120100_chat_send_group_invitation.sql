-- SRS-205.3 (UR-205) send a group invitation, with SRS-205.2 (friends only) and SRS-205.4 (not a member yet).
-- Task #485: save a pending invitation from the group's owner or administrator to one current friend.
-- Additive only: one new server-only function; no table, policy, or existing function changes.
-- The existing validate_group_invitation trigger still checks friendship, blocks and the inviter's role.
-- Apply once after 20261026120000_chat_group_invite_friends.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required (from public.socialu_require_student)
--   SC404 conversation not available (missing and forbidden look the same, SRS-213.1)
--   SCI01 only the group's owner or an administrator can invite people
--   SCI02 the student is not a current friend (or a block exists, or the account is not active)
--   SCI03 the friend is already a current member of the group

CREATE FUNCTION public.socialu_send_group_invitation(p_auth_id UUID, p_conversation_id BIGINT, p_username TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; friend socialu.students%ROWTYPE; c socialu.conversations%ROWTYPE;
  inv socialu.group_invitations%ROWTYPE; created BOOLEAN := false;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- Lock the group so two sends for the same friend at the same moment cannot both save an invitation.
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id FOR UPDATE;
  IF NOT FOUND OR NOT socialu.is_current_participant(p_conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  IF c.kind <> 'group' OR NOT EXISTS (SELECT 1 FROM socialu.group_memberships gm
       WHERE gm.conversation_id = c.conversation_id AND gm.student_id = me AND gm.left_at IS NULL
         AND gm.role IN ('owner', 'administrator')) THEN
    RAISE EXCEPTION 'Only the group owner or an administrator can invite people.' USING ERRCODE = 'SCI01';
  END IF;
  SELECT * INTO friend FROM socialu.students WHERE username = btrim(coalesce(p_username, '')) AND is_active;
  -- SRS-205.2: only a current friend with no block either way. Unknown usernames get the same answer.
  IF friend.student_id IS NULL OR friend.student_id = me OR NOT socialu.are_friends(me, friend.student_id)
     OR socialu.is_blocked(me, friend.student_id) THEN
    RAISE EXCEPTION 'You can only invite your current friends.' USING ERRCODE = 'SCI02';
  END IF;
  IF EXISTS (SELECT 1 FROM socialu.group_memberships gm WHERE gm.conversation_id = c.conversation_id
              AND gm.student_id = friend.student_id AND gm.left_at IS NULL) THEN
    RAISE EXCEPTION 'This friend is already in the group.' USING ERRCODE = 'SCI03';
  END IF;
  -- Sending again returns the invitation that is already waiting instead of saving a second one.
  SELECT * INTO inv FROM socialu.group_invitations
   WHERE conversation_id = c.conversation_id AND invitee_id = friend.student_id AND status = 'pending'
   ORDER BY invitation_id LIMIT 1;
  IF NOT FOUND THEN
    -- SRS-205.3 / SRS-205.4: only a pending request is saved; the friend joins the group only after accepting.
    INSERT INTO socialu.group_invitations (conversation_id, inviter_id, invitee_id)
      VALUES (c.conversation_id, me, friend.student_id) RETURNING * INTO inv;
    created := true;
  END IF;
  RETURN jsonb_build_object('created', created, 'invitation', jsonb_build_object(
    'id', inv.invitation_id::text, 'conversation_id', inv.conversation_id::text,
    'username', friend.username, 'status', inv.status));
END;
$$;

-- Server-only, like the other chat functions: browsers cannot call it directly.
REVOKE ALL ON FUNCTION public.socialu_send_group_invitation(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_send_group_invitation(UUID, BIGINT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
