-- SRS-205.5 (UR-205) present a pending invitation. Task #489.
-- Returns the group invitations waiting for the signed-in student's answer, with who sent each one.
-- Additive only: one new server-only function; no table, policy, or existing function changes.
-- Apply once after 20261026120100_chat_send_group_invitation.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required (from public.socialu_require_student)

CREATE FUNCTION public.socialu_pending_group_invitations(p_auth_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; invitations JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- Only this student's own pending invitations, newest first. Accepted and declined ones are not returned,
  -- and neither are invitations from a student either of them has blocked since it was sent.
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', gi.invitation_id::text, 'conversation_id', gi.conversation_id::text,
      'inviter', jsonb_build_object('username', s.username, 'name', coalesce(sp.display_name, s.full_name)),
      'member_count', (SELECT count(*) FROM socialu.group_memberships gm
                        WHERE gm.conversation_id = gi.conversation_id AND gm.left_at IS NULL))
      ORDER BY gi.invitation_id DESC), '[]'::jsonb)
    INTO invitations
    FROM socialu.group_invitations gi
    JOIN socialu.students s ON s.student_id = gi.inviter_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
   WHERE gi.invitee_id = me AND gi.status = 'pending' AND NOT socialu.is_blocked(me, gi.inviter_id)
     AND NOT EXISTS (SELECT 1 FROM socialu.group_memberships gm WHERE gm.conversation_id = gi.conversation_id
                      AND gm.student_id = me AND gm.left_at IS NULL);
  RETURN jsonb_build_object('invitations', invitations);
END;
$$;

-- Server-only, like the other chat functions: browsers cannot call it directly.
REVOKE ALL ON FUNCTION public.socialu_pending_group_invitations(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_pending_group_invitations(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
