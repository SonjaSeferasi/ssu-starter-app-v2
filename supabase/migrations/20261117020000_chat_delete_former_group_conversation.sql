-- SRS-207.7 (#888), with SRS-207.6 (#1264) to follow: a former group member deletes the conversation from
-- their own view, and only from their own view.
--
-- #1222 is what makes this requirement real. While leaving a group removed it from the list immediately there
-- was nothing left to delete; now a former member keeps the conversation, marked, and can read their own
-- history. This gives them a way to put it away for good.
--
-- "Remove from that student's conversation history" is taken to mean everywhere, not only the list: once a
-- former member deletes the conversation it is also refused if they open it by a direct link, so a bookmark
-- cannot resurrect what they chose to delete. Nothing changes for anyone still in the group.
--
-- hidden_conversations has been in schema.sql since the beginning, unused, carrying LP's own note:
-- "Supports: SRS-207.6, SRS-207.7". This is what it was shaped for.
--
-- The one addition is hidden_at. Without it, a student who deleted a group, was invited back, and later left
-- again would find the conversation already gone without asking: the old row would still be there. Comparing
-- the deletion against the newest membership's joined_at makes the row expire the moment they rejoin, so no
-- cleanup is needed anywhere else and the join path is left untouched.

ALTER TABLE socialu.hidden_conversations
  ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- True when this student has deleted this conversation from their view and has not rejoined since.
-- A student with no membership row at all (a private conversation) compares against -infinity, so a deletion
-- simply stands.
CREATE OR REPLACE FUNCTION socialu.conversation_hidden(c BIGINT, s BIGINT) RETURNS BOOLEAN
LANGUAGE sql STABLE SET search_path = socialu, pg_catalog AS $$
    SELECT EXISTS (
      SELECT 1 FROM hidden_conversations h
       WHERE h.conversation_id = c AND h.student_id = s
         AND h.hidden_at > COALESCE((SELECT max(g.joined_at) FROM group_memberships g
                                      WHERE g.conversation_id = c AND g.student_id = s),
                                    '-infinity'::timestamptz));
$$;
REVOKE ALL ON FUNCTION socialu.conversation_hidden(BIGINT, BIGINT) FROM PUBLIC, anon, authenticated;

-- SRS-207.7: the deletion itself. It writes one row for this student and touches nothing shared, so the
-- conversation and its messages are untouched for everyone still in the group.
--   SC404  never a participant, or already deleted -- the same answer an outsider gets (SRS-213.1)
--   SCH01  a private conversation: SRS-207.6 and SRS-207.7 are about groups a student has left
--   SCH02  still in the group; leaving comes first (SRS-207.1)
CREATE OR REPLACE FUNCTION public.socialu_delete_conversation(p_auth_id UUID, p_conversation_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; c socialu.conversations%ROWTYPE;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- Deleting one that is already deleted answers SC404 as well: from this student's side it is gone.
  IF NOT socialu.was_participant(p_conversation_id, me)
     OR socialu.conversation_hidden(p_conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id;
  IF c.kind <> 'group' THEN
    RAISE EXCEPTION 'Only a group you have left can be deleted.' USING ERRCODE = 'SCH01';
  END IF;
  IF socialu.is_current_participant(p_conversation_id, me) THEN
    RAISE EXCEPTION 'Leave the group before deleting this conversation.' USING ERRCODE = 'SCH02';
  END IF;
  INSERT INTO socialu.hidden_conversations (conversation_id, student_id, hidden_at)
  VALUES (p_conversation_id, me, clock_timestamp())
  ON CONFLICT (conversation_id, student_id) DO UPDATE SET hidden_at = EXCLUDED.hidden_at;
  RETURN jsonb_build_object('conversation_id', p_conversation_id::text, 'deleted', true);
END;
$$;

-- The history. Unchanged from 20261116130000 except that a conversation this student deleted is refused
-- exactly as one they were never in.
CREATE OR REPLACE FUNCTION public.socialu_conversation_messages(p_auth_id UUID, p_conversation_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; c socialu.conversations%ROWTYPE; my_role TEXT; members BIGINT; current_member BOOLEAN; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- #1222: admits a former member as well, so can_read_message below decides what they see. Someone who
  -- was never a participant still gets the same answer as a conversation that does not exist (SRS-213.1).
  IF NOT socialu.was_participant(p_conversation_id, me)
     OR socialu.conversation_hidden(p_conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  current_member := socialu.is_current_participant(p_conversation_id, me);
  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id;
  IF c.kind = 'group' THEN
    -- NULL for a former member, which is what keeps the administrator controls hidden.
    SELECT gm.role INTO my_role FROM socialu.group_memberships gm
     WHERE gm.conversation_id = c.conversation_id AND gm.student_id = me AND gm.left_at IS NULL;
    -- #1222: how many people are in the group now is current information about a group a former member has
    -- left, so they are told nothing.
    IF current_member THEN
      SELECT count(*) INTO members FROM socialu.group_memberships gm
       WHERE gm.conversation_id = c.conversation_id AND gm.left_at IS NULL;
    END IF;
  END IF;
  WITH recent AS (
    SELECT msg.message_id, msg.conversation_id, msg.sender_id, msg.kind, msg.text_content, msg.sent_at,
           msg.reply_to_id, msg.asset_id,
           EXISTS (SELECT 1 FROM socialu.deleted_messages d WHERE d.message_id = msg.message_id) AS is_deleted
      FROM socialu.messages msg
     WHERE msg.conversation_id = p_conversation_id AND msg.kind IN ('text', 'emoji', 'photo')
       AND msg.status = 'sent' AND socialu.can_read_message(me, msg.message_id)
     ORDER BY msg.sent_at DESC, msg.message_id DESC LIMIT 50
  )
  SELECT jsonb_build_object('student_id', me::text, 'kind', c.kind, 'name', c.group_name, 'role', my_role, 'member_count', members,
      -- #1222: the page renders the conversation read-only when this is true.
      'former', CASE WHEN c.kind = 'group' THEN NOT current_member END,
      'messages', (SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', m.message_id::text, 'conversation_id', m.conversation_id::text, 'sender_id', m.sender_id::text,
          'text', coalesce(m.text_content, ''), 'sent_at', m.sent_at)
          || CASE WHEN m.kind = 'text' THEN '{}'::jsonb ELSE jsonb_build_object('kind', m.kind) END
          || CASE WHEN m.reply_to_id IS NULL THEN '{}'::jsonb
                  ELSE jsonb_build_object('reply_to_id', m.reply_to_id::text) END
          || CASE WHEN m.asset_id IS NULL THEN '{}'::jsonb
                  ELSE jsonb_build_object('asset_id', m.asset_id::text) END
          -- #1106: the photo is gone but the message stays in its place, so the conversation still reads
          -- in order and a reply that answered it still has something to point at.
          || CASE WHEN m.is_deleted THEN jsonb_build_object('deleted', true) ELSE '{}'::jsonb END
          ORDER BY m.sent_at, m.message_id), '[]'::jsonb) FROM recent m),
      -- #1222: for a former member this is only the people whose messages they can still read. The current
      -- membership list is current information about the group and is not folded in for them.
      'senders', (SELECT coalesce(jsonb_object_agg(s.student_id::text, jsonb_build_object(
          'name', coalesce(sp.display_name, s.full_name), 'username', s.username)), '{}'::jsonb)
        FROM socialu.students s LEFT JOIN socialu.student_profiles sp ON sp.student_id = s.student_id
        WHERE s.student_id IN (SELECT r.sender_id FROM recent r)
           OR (c.kind = 'private' AND s.student_id IN (c.private_student_low, c.private_student_high))
           OR (c.kind = 'group' AND current_member
               AND s.student_id IN (SELECT gm.student_id FROM socialu.group_memberships gm
                                     WHERE gm.conversation_id = c.conversation_id AND gm.left_at IS NULL))),
      'reactions', (SELECT coalesce(jsonb_object_agg(rm.message_id::text, socialu.chat_message_reactions(rm.message_id, me)), '{}'::jsonb)
        FROM recent rm WHERE EXISTS (SELECT 1 FROM socialu.message_reactions mr WHERE mr.message_id = rm.message_id)),
      -- A reply whose target was deleted is left out, so the page shows "Original message unavailable"
      -- (SRS-209.6) rather than quoting a photo that is no longer there.
      'replies', (SELECT coalesce(jsonb_object_agg(rr.message_id::text, jsonb_build_object(
            'id', t.message_id::text, 'sender_id', t.sender_id::text,
            'sender_name', coalesce(tp.display_name, ts.full_name),
            'text', coalesce(t.text_content, ''))
          || CASE WHEN t.kind = 'text' THEN '{}'::jsonb ELSE jsonb_build_object('kind', t.kind) END), '{}'::jsonb)
        FROM recent rr
        JOIN socialu.messages t ON t.message_id = rr.reply_to_id
        JOIN socialu.students ts ON ts.student_id = t.sender_id
        LEFT JOIN socialu.student_profiles tp ON tp.student_id = t.sender_id
        WHERE rr.reply_to_id IS NOT NULL AND socialu.can_read_message(me, t.message_id)
          AND NOT EXISTS (SELECT 1 FROM socialu.deleted_messages d WHERE d.message_id = t.message_id)),
      -- A deleted photo names no stored objects, so the API has nothing to sign and no new link can be made.
      'photos', (SELECT coalesce(jsonb_object_agg(pm.message_id::text, jsonb_build_object(
            'storage_key', a.storage_key, 'mime_type', a.mime_type)
          || CASE WHEN d.storage_key IS NULL THEN '{}'::jsonb
                  ELSE jsonb_build_object('display_storage_key', d.storage_key) END), '{}'::jsonb)
        FROM recent pm
        JOIN socialu.media_assets a ON a.asset_id = pm.asset_id
        LEFT JOIN socialu.chat_photo_displays l ON l.asset_id = a.asset_id
        LEFT JOIN socialu.media_assets d ON d.asset_id = l.display_asset_id
        WHERE pm.kind = 'photo' AND NOT pm.is_deleted))
    INTO result;
  RETURN result;
END;
$$;

-- Marking read. A deleted conversation is refused here too, so nothing can be written against it.
CREATE OR REPLACE FUNCTION public.socialu_mark_conversation_read(p_auth_id UUID, p_conversation_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; marked INTEGER;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  IF NOT socialu.was_participant(p_conversation_id, me)
     OR socialu.conversation_hidden(p_conversation_id, me) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;
  INSERT INTO socialu.message_reads (message_id, student_id)
  SELECT msg.message_id, me FROM socialu.messages msg
   WHERE msg.conversation_id = p_conversation_id AND msg.status = 'sent' AND msg.sender_id <> me
     AND socialu.can_read_message(me, msg.message_id)
     AND NOT EXISTS (SELECT 1 FROM socialu.message_reads r WHERE r.message_id = msg.message_id AND r.student_id = me)
  ON CONFLICT (message_id, student_id) DO NOTHING;
  GET DIAGNOSTICS marked = ROW_COUNT;
  RETURN jsonb_build_object('marked', marked);
END;
$$;

-- The Messages list. A conversation this student deleted is left out; the check sits outside the group and
-- private branches because a deletion stands whatever the conversation is.
CREATE OR REPLACE FUNCTION public.socialu_conversation_list(p_auth_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me BIGINT; result JSONB;
BEGIN
  me := public.socialu_require_student(p_auth_id);
  -- #1222: groups the student belongs to OR belonged to. A student who left and was invited back has more
  -- than one membership row, so the most recent one is the one that counts -- without that, the same
  -- conversation would be listed once per row.
  WITH mine AS (
    SELECT c.conversation_id, c.kind, c.group_name, gm.joined_at, gm.left_at,
           CASE WHEN c.kind = 'private' THEN
             CASE WHEN c.private_student_low = me THEN c.private_student_high ELSE c.private_student_low END
           END AS peer_id
      FROM socialu.conversations c
      LEFT JOIN LATERAL (
        SELECT g.membership_id, g.joined_at, g.left_at
          FROM socialu.group_memberships g
         WHERE g.conversation_id = c.conversation_id AND g.student_id = me
         ORDER BY g.joined_at DESC, g.membership_id DESC LIMIT 1
      ) gm ON c.kind = 'group'
     WHERE (c.kind = 'private' AND me IN (c.private_student_low, c.private_student_high))
        OR (c.kind = 'group' AND gm.membership_id IS NOT NULL)
  ),
  -- Like the conversation header, DMs with a blocked or deactivated student are not shown. Groups follow the
  -- shared participant check (LN's school-community rule, where applied).
  visible AS (
    SELECT m.* FROM mine m LEFT JOIN socialu.students p ON p.student_id = m.peer_id
     WHERE NOT socialu.conversation_hidden(m.conversation_id, me)
       AND ((m.kind = 'group' AND socialu.was_participant(m.conversation_id, me))
         OR (p.is_active AND NOT socialu.is_blocked(me, m.peer_id)))
  ),
  -- #1217: the latest successfully sent text, emoji OR photo message the student may read in each
  -- conversation, and (#327) whether any message from another participant is still unread for this student.
  -- For a former member can_read_message confines both to their own membership period.
  items AS (
    SELECT v.*, last.sender_id AS last_sender, last.text_content AS last_text, last.sent_at AS last_sent,
           last.kind AS last_kind,
           EXISTS (SELECT 1 FROM socialu.messages um
                    WHERE um.conversation_id = v.conversation_id AND um.status = 'sent' AND um.sender_id <> me
                      AND socialu.can_read_message(me, um.message_id)
                      AND NOT EXISTS (SELECT 1 FROM socialu.message_reads r
                                       WHERE r.message_id = um.message_id AND r.student_id = me)) AS unread
      FROM visible v
      LEFT JOIN LATERAL (
        SELECT msg.sender_id, msg.text_content, msg.sent_at, msg.kind FROM socialu.messages msg
         WHERE msg.conversation_id = v.conversation_id AND msg.kind IN ('text', 'emoji', 'photo')
           AND msg.status = 'sent' AND socialu.can_read_message(me, msg.message_id)
         ORDER BY msg.sent_at DESC, msg.message_id DESC LIMIT 1
      ) last ON true
  )
  -- Most recent activity first; conversations without messages follow, newest first.
  SELECT jsonb_build_object('student_id', me::text, 'conversations', coalesce(jsonb_agg(jsonb_build_object(
      'id', i.conversation_id::text,
      'kind', i.kind,
      -- SRS-202.6: DMs show the friend's name; named groups show their group name.
      'name', CASE WHEN i.kind = 'private' THEN coalesce(sp.display_name, s.full_name) ELSE i.group_name END,
      'username', s.username,
      -- #1222: NULL for a group the student has left, for the same reason as in the history.
      'member_count', CASE WHEN i.kind = 'group' AND i.left_at IS NULL
                           THEN (SELECT count(*) FROM socialu.group_memberships g
                                  WHERE g.conversation_id = i.conversation_id AND g.left_at IS NULL) END,
      -- #1222: the list marks it, and the page opens it read-only.
      'former', CASE WHEN i.kind = 'group' THEN (i.left_at IS NOT NULL) END,
      'unread', i.unread,
      -- #1217: 'text' is NULL for a photo, which the schema requires; 'kind' tells the page what to show.
      'last_message', CASE WHEN i.last_sent IS NULL THEN NULL
                           ELSE jsonb_build_object('text', i.last_text, 'sender_id', i.last_sender::text,
                                                   'sent_at', i.last_sent, 'kind', i.last_kind) END)
    ORDER BY coalesce(i.last_sent, i.joined_at) DESC NULLS LAST, i.conversation_id DESC), '[]'::jsonb))
    INTO result
    FROM items i
    LEFT JOIN socialu.students s ON s.student_id = i.peer_id
    LEFT JOIN socialu.student_profiles sp ON sp.student_id = i.peer_id;
  RETURN result;
END;
$$;

-- Server-only, like every other chat function. CREATE OR REPLACE keeps the existing grants; these are
-- restated so the migration stands on its own if replayed against a fresh database.
REVOKE ALL ON FUNCTION public.socialu_delete_conversation(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_delete_conversation(UUID, BIGINT) TO service_role;
REVOKE ALL ON FUNCTION public.socialu_conversation_messages(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_conversation_messages(UUID, BIGINT) TO service_role;
REVOKE ALL ON FUNCTION public.socialu_mark_conversation_read(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_mark_conversation_read(UUID, BIGINT) TO service_role;
REVOKE ALL ON FUNCTION public.socialu_conversation_list(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_conversation_list(UUID) TO service_role;

-- LN's school communities makes the public.socialu_* functions treat a student from another school like a
-- blocked one (socialu.community_unavailable). Replacing a function drops that rewrite, so where the rule is
-- installed it is applied again here. Only the list uses socialu.is_blocked; the other two never did.
DO $$
BEGIN
  IF to_regprocedure('socialu.community_unavailable(bigint,bigint)') IS NOT NULL THEN
    EXECUTE replace(pg_get_functiondef('public.socialu_conversation_list(uuid)'::regprocedure),
      'socialu.is_blocked(', 'socialu.community_unavailable(');
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
