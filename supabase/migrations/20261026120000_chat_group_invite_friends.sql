-- SRS-205.1 (UR-205) select a friend for a group invitation. Task #481.
-- The group's current owner or administrator gets their current friends who are not already members,
-- with an optional name search, so they can choose one to invite (sending is SRS-205.3).
-- Additive only: one new server-only function; no table, policy, or existing function changes.
-- Apply once after 20261019170100_chat_conversation_role.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required (from public.socialu_require_student)
--   SC404 conversation not available (missing and forbidden look the same, SRS-213.1)
--   SCI01 only the group's owner or an administrator can invite people
--   SCI04 search longer than 100 characters

CREATE FUNCTION public.socialu_group_invite_friends(p_auth_id UUID, p_conversation_id BIGINT, p_query TEXT DEFAULT '')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; q TEXT := btrim(coalesce(p_query, '')); friends JSONB; more BOOLEAN;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- The same participant check as the rest of Chat: outsiders cannot tell whether the group exists.
  IF NOT socialu.is_current_participant(p_conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  -- SRS-205.1: only the group's current owner or administrator chooses friends to invite.
  IF NOT EXISTS (SELECT 1 FROM socialu.group_memberships gm JOIN socialu.conversations c USING (conversation_id)
                  WHERE gm.conversation_id = p_conversation_id AND gm.student_id = me AND gm.left_at IS NULL
                    AND c.kind = 'group' AND gm.role IN ('owner', 'administrator')) THEN
    RAISE EXCEPTION 'Only the group owner or an administrator can invite people.' USING ERRCODE = 'SCI01';
  END IF;
  IF length(q) > 100 THEN
    RAISE EXCEPTION 'Search must be 100 characters or fewer.' USING ERRCODE = 'SCI04';
  END IF;
  -- Current friends only (SRS-205.2): active, not blocked either way, and not already a current member.
  -- "invited" marks friends who already have a pending invitation to this group.
  SELECT coalesce(jsonb_agg(jsonb_build_object('username', f.username, 'name', f.name, 'invited', f.invited)
           ORDER BY f.rn) FILTER (WHERE f.rn <= 20), '[]'::jsonb), count(*) > 20
    INTO friends, more
    FROM (SELECT s.username, coalesce(sp.display_name, s.full_name) AS name,
                 EXISTS (SELECT 1 FROM socialu.group_invitations gi WHERE gi.conversation_id = p_conversation_id
                          AND gi.invitee_id = s.student_id AND gi.status = 'pending') AS invited,
                 row_number() OVER (ORDER BY lower(coalesce(sp.display_name, s.full_name)), s.username) AS rn
            FROM socialu.students s LEFT JOIN socialu.student_profiles sp USING (student_id)
           WHERE s.student_id <> me AND s.is_active
             AND socialu.are_friends(me, s.student_id) AND NOT socialu.is_blocked(me, s.student_id)
             AND NOT EXISTS (SELECT 1 FROM socialu.group_memberships gm WHERE gm.conversation_id = p_conversation_id
                              AND gm.student_id = s.student_id AND gm.left_at IS NULL)
             AND (q = '' OR strpos(lower(s.full_name), lower(q)) > 0
                  OR strpos(lower(coalesce(sp.display_name, '')), lower(q)) > 0
                  OR strpos(lower(s.username), lower(q)) > 0)
           ORDER BY rn LIMIT 21) f;
  RETURN jsonb_build_object('friends', friends, 'has_more', more);
END;
$$;

-- Server-only, like the other chat functions: browsers cannot call it directly.
REVOKE ALL ON FUNCTION public.socialu_group_invite_friends(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_group_invite_friends(UUID, BIGINT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
