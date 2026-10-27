-- SRS-205.8 (UR-205) decline a group invitation, with SRS-205.9 (the student is not added). Task #497.
-- Additive only: one new server-only function; no table, policy, or existing function changes.
-- Apply once after 20261026130100_chat_accept_group_invitation.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required (from public.socialu_require_student)
--   SCI05 invitation not available (missing, someone else's, or already answered)

CREATE FUNCTION public.socialu_decline_group_invitation(p_auth_id UUID, p_invitation_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; inv socialu.group_invitations%ROWTYPE;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- Lock the invitation so accepting and declining at the same moment cannot both happen.
  SELECT * INTO inv FROM socialu.group_invitations WHERE invitation_id = p_invitation_id FOR UPDATE;
  IF NOT FOUND OR inv.invitee_id <> me OR inv.status <> 'pending' THEN
    RAISE EXCEPTION 'This invitation is no longer available.' USING ERRCODE = 'SCI05';
  END IF;
  -- SRS-205.8 / SRS-205.9: record the decline; no membership is ever added.
  UPDATE socialu.group_invitations SET status = 'declined' WHERE invitation_id = inv.invitation_id;
  RETURN jsonb_build_object('id', inv.invitation_id::text, 'status', 'declined');
END;
$$;

-- Server-only, like the other chat functions: browsers cannot call it directly.
REVOKE ALL ON FUNCTION public.socialu_decline_group_invitation(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_decline_group_invitation(UUID, BIGINT) TO service_role;

NOTIFY pgrst, 'reload schema';
