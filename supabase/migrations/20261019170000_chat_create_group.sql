-- SRS-202.1 (UR-202) create a group chat, with SRS-202.2/202.3/202.4 and SRS-203.1 (UR-203) initial ownership.
-- Tasks: #454 save a new group with its creator as the first member; #459 the creator is the owner (same function).
-- Additive only: one new server-only function; no table, policy, or existing function changes.
-- Apply once after 20261019150000_chat_conversation_list.sql (and after 20261019120100, which lets the group
-- structure check run when the app saves through service_role).

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required (from public.socialu_require_student)

CREATE FUNCTION public.socialu_create_group(p_auth_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; c socialu.conversations%ROWTYPE; m socialu.group_memberships%ROWTYPE;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- SRS-202.2 / SRS-202.4: the group exists on its own, before any invitation and without other members.
  INSERT INTO socialu.conversations (kind, created_by) VALUES ('group', me) RETURNING * INTO c;
  -- SRS-202.3 / SRS-203.1: the creator is the first member and the owner, saved in the same step.
  INSERT INTO socialu.group_memberships (conversation_id, student_id, role)
    VALUES (c.conversation_id, me, 'owner') RETURNING * INTO m;
  -- Run the "exactly one current owner" check (SRS-203.4) now, so any problem is reported from here
  -- and nothing is saved (the same pattern as 20261008000300 for posts).
  SET CONSTRAINTS ALL IMMEDIATE;
  RETURN jsonb_build_object('id', c.conversation_id::text, 'kind', c.kind, 'role', m.role, 'member_count', 1);
END;
$$;

-- Server-only, like the other chat functions: browsers cannot call it directly.
REVOKE ALL ON FUNCTION public.socialu_create_group(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_create_group(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
