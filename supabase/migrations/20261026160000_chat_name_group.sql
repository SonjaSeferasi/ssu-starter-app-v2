-- SRS-202.5 (UR-202) name a group chat. Task #834.
-- Adds an optional name to group chats and a server-only function that lets the group's owner or administrator
-- set or change it. Additive: one new nullable column on socialu.conversations (groups only) and one new function.
-- Existing rows keep no name (the page shows "Group chat"), and no existing function changes.
-- Apply once after 20261026150000_chat_sender_names.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required (from public.socialu_require_student)
--   SC404 conversation not available (missing and forbidden look the same, SRS-213.1)
--   SCG01 not the group's owner or administrator (or not a group)
--   SCG02 the name is not 1 to 50 characters

-- Groups only; 1 to 50 characters, stored without extra spaces at the ends and without control characters.
ALTER TABLE socialu.conversations ADD COLUMN group_name VARCHAR(50);
ALTER TABLE socialu.conversations ADD CONSTRAINT conversations_group_name_check CHECK (group_name IS NULL OR (
  kind = 'group' AND group_name = btrim(group_name) AND char_length(group_name) BETWEEN 1 AND 50
  AND group_name !~ '[[:cntrl:]]'));

CREATE FUNCTION public.socialu_rename_group(p_auth_id UUID, p_conversation_id BIGINT, p_name TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; c socialu.conversations%ROWTYPE;
  -- Runs of spaces, tabs and line breaks become one space, so names stay on one line.
  clean TEXT := btrim(regexp_replace(coalesce(p_name, ''), '[[:space:]]+', ' ', 'g'));
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- The one participant check every Chat function uses (#299).
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id FOR UPDATE;
  IF NOT FOUND OR NOT socialu.is_current_participant(c.conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  -- Group management belongs to the owner and the administrator (SRS-203.2), as for invitations.
  IF c.kind <> 'group' OR NOT EXISTS (SELECT 1 FROM socialu.group_memberships gm
      WHERE gm.conversation_id = c.conversation_id AND gm.student_id = me AND gm.left_at IS NULL
        AND gm.role IN ('owner', 'administrator')) THEN
    RAISE EXCEPTION 'Only the group owner or an administrator can name the group.' USING ERRCODE = 'SCG01';
  END IF;
  IF char_length(clean) NOT BETWEEN 1 AND 50 OR clean ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Group names must be 1 to 50 characters.' USING ERRCODE = 'SCG02';
  END IF;

  UPDATE socialu.conversations SET group_name = clean WHERE conversation_id = c.conversation_id;
  -- Report any group-structure problem from inside the function, as when creating a group.
  SET CONSTRAINTS ALL IMMEDIATE;
  RETURN jsonb_build_object('id', c.conversation_id::text, 'name', clean);
END;
$$;

-- Server-only, like the other chat functions: browsers cannot call it directly.
REVOKE ALL ON FUNCTION public.socialu_rename_group(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_rename_group(UUID, BIGINT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
