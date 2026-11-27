-- SRS-201.11 (UR-201) select a GIF from the GIF library.
-- "The system shall allow a conversation participant to select a GIF from the available GIF library for
--  sending."
--
-- Adds public.socialu_send_gif_library: the library half of sending a GIF, beside socialu_send_gif
-- (20261124120000), which is the device-upload half.
--
-- The difference is the whole point of having two functions. An uploaded GIF is a file: it is stored,
-- it owns a media_assets row, it counts against the 15 MB limit, and it is shown from a signed URL that
-- expires. A library GIF is a reference: the app already ships the file, so the message stores the path
-- and nothing else. No storage write, no asset row, no signed URL, no size check -- sending the same
-- reaction a hundred times costs a hundred short strings.
--
-- That shape is the schema's, not this migration's:
--   messages CHECK (kind = 'gif_library' AND gif_reference IS NOT NULL AND btrim(gif_reference) <> ''
--                   AND asset_id IS NULL AND text_content IS NULL AND accepted_request_id IS NULL)
--
-- WHICH REFERENCES ARE ALLOWED is decided here as well as in the API, and deliberately twice. The route
-- checks it against lib/chat-gif-library.ts; this checks the shape again, because a reference reaches an
-- <img src> in someone else's conversation and the database is the last place that can say no. Anything
-- that is not '/gif-library/<id>.gif' with a plain id is refused: no '..', no absolute URL, no scheme.
-- A build that drops a GIF from the catalogue leaves older messages pointing at a file that is gone;
-- that is a broken image in one conversation, not a way into anything.
--
-- Apply after 20261124130000_chat_gif_in_history.sql, with 20261126130000_chat_gif_library_in_history.sql
-- straight after it -- until that one runs, a library GIF is written but never read back.
-- Safe to re-run.
--
-- Error codes returned to the API (mapped in lib/chat-access.ts):
--   42501 verified, active account required
--   SC404 conversation not available (missing and forbidden look the same, SRS-213.1)
--   SC403 private messaging not allowed (friendship/consent or block, SRS-200.16)
--   SCF05 that is not a GIF this app ships

CREATE OR REPLACE FUNCTION public.socialu_send_gif_library(p_auth_id UUID, p_conversation_id BIGINT,
  p_reference TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s socialu.students%ROWTYPE;
  c socialu.conversations%ROWTYPE;
  m socialu.messages%ROWTYPE;
  payload JSONB;
  recipient UUID;
BEGIN
  SELECT * INTO s FROM socialu.students
    WHERE auth_user_id = p_auth_id AND is_active AND NOT reverification_required
      AND email_verified_at IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'A verified, active university account is required.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO c FROM socialu.conversations WHERE conversation_id = p_conversation_id;
  IF NOT FOUND OR NOT socialu.is_current_participant(c.conversation_id, s.student_id) THEN
    RAISE EXCEPTION 'Conversation not available.' USING ERRCODE = 'SC404';
  END IF;

  IF c.kind = 'private' AND NOT socialu.can_send_private(c.private_student_low, c.private_student_high) THEN
    RAISE EXCEPTION 'Messaging is not available for this conversation.' USING ERRCODE = 'SC403';
  END IF;

  -- One line, and the only thing standing between a request body and an <img src> in a conversation.
  IF p_reference IS NULL OR p_reference !~ '^/gif-library/[a-z0-9]+(-[a-z0-9]+)*\.gif$' THEN
    RAISE EXCEPTION 'That is not a GIF from the library.' USING ERRCODE = 'SCF05';
  END IF;

  INSERT INTO socialu.messages (conversation_id, sender_id, kind, gif_reference, status, sent_at)
  VALUES (c.conversation_id, s.student_id, 'gif_library', p_reference, 'sent', now())
  RETURNING * INTO m;

  -- The same shape as every other message, plus the reference. Unlike a photo or an uploaded GIF there
  -- is nothing to sign: the recipient's browser can fetch the path as it stands, so the reference goes
  -- out in the broadcast and the GIF appears without a round trip to the history.
  payload := jsonb_build_object('id', m.message_id::text, 'conversation_id', m.conversation_id::text,
    'sender_id', m.sender_id::text, 'text', '', 'sent_at', m.sent_at, 'kind', m.kind,
    'gif_reference', m.gif_reference);

  FOR recipient IN
    SELECT st.auth_user_id FROM socialu.students st
    WHERE st.auth_user_id IS NOT NULL AND (
      (c.kind = 'private' AND st.student_id IN (c.private_student_low, c.private_student_high))
      OR (c.kind = 'group' AND st.student_id IN (
        SELECT gm.student_id FROM socialu.group_memberships gm
        WHERE gm.conversation_id = c.conversation_id AND gm.left_at IS NULL)))
  LOOP
    PERFORM socialu.send_to_active_sessions(payload, 'message_created', 'student:' || recipient::text, true);
  END LOOP;

  RETURN payload;
END;
$$;

REVOKE ALL ON FUNCTION public.socialu_send_gif_library(UUID, BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_send_gif_library(UUID, BIGINT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
