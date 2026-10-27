-- SRS-202.6 (UR-202) display the group name: show a new name to the group's members right away. Task #844.
-- Replaces public.socialu_rename_group (from 20261026160000_chat_name_group.sql) so that, after saving the name,
-- it also sends a live "conversation_updated" event with the group's ID and new name to each current member's
-- private Realtime channel (student:<auth uid>), the same way new messages are delivered. The existing
-- realtime.messages policy already limits each student to their own channel, so no policy changes are needed.
-- Everything else, including the checks, the error codes and the grants (service_role only), is unchanged.
-- Apply once after 20261026160100_chat_group_name_display.sql.

-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required (from public.socialu_require_student)
--   SC404 conversation not available (missing and forbidden look the same, SRS-213.1)
--   SCG01 not the group's owner or administrator (or not a group)
--   SCG02 the name is not 1 to 50 characters

CREATE OR REPLACE FUNCTION public.socialu_rename_group(p_auth_id UUID, p_conversation_id BIGINT, p_name TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; c socialu.conversations%ROWTYPE; payload JSONB; recipient UUID;
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
  payload := jsonb_build_object('conversation_id', c.conversation_id::text, 'name', clean);

  -- #844: live delivery to each current member's private channel (student:<auth uid>), as for messages (#304).
  -- Invited students who haven't joined, former members and outsiders receive nothing.
  -- realtime.send only warns on failure, so a broadcast problem never undoes the saved name.
  FOR recipient IN
    SELECT st.auth_user_id FROM socialu.students st
      JOIN socialu.group_memberships gm ON gm.student_id = st.student_id
     WHERE gm.conversation_id = c.conversation_id AND gm.left_at IS NULL AND st.auth_user_id IS NOT NULL
  LOOP
    PERFORM realtime.send(payload, 'conversation_updated', 'student:' || recipient::text, true);
  END LOOP;

  RETURN jsonb_build_object('id', c.conversation_id::text, 'name', clean);
END;
$$;

NOTIFY pgrst, 'reload schema';
