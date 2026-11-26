-- SRS-201.11 (UR-201) a GIF sent from the library comes back with the conversation.
--
-- 20261126120000_chat_send_gif_library.sql writes a message of kind 'gif_library', but the history does
-- not return one and would not carry its reference if it did: socialu_conversation_messages selects a
-- fixed list of kinds, its CTE never reads msg.gif_reference, and the per-message object it builds has
-- no field for it. Three small edits, made the same way 20261124130000 made its two -- by rewriting the
-- deployed function rather than restating it, so the rules the other six migrations put there survive.
--
--   1. 'gif_library' joins the kinds the history returns;
--   2. the CTE reads msg.gif_reference;
--   3. a message that has one carries it, next to asset_id.
--
-- A library GIF needs nothing signed: the path is served by this app, so the page renders it directly.
-- That is why this migration does not touch the 'photos' map that 20261124130000 had to.
--
-- Each replacement is checked, and a second run is a no-op rather than a second edit.
-- Apply after 20261126120000_chat_send_gif_library.sql. Safe to re-run.

DO $patch$
DECLARE
  d TEXT;
  kinds_before CONSTANT TEXT := 'msg.kind IN (''text'', ''emoji'', ''photo'', ''gif_upload'')';
  kinds_after  CONSTANT TEXT := 'msg.kind IN (''text'', ''emoji'', ''photo'', ''gif_upload'', ''gif_library'')';
  cte_before   CONSTANT TEXT := 'msg.reply_to_id, msg.asset_id,';
  cte_after    CONSTANT TEXT := 'msg.reply_to_id, msg.asset_id, msg.gif_reference,';
  json_before  CONSTANT TEXT := 'ELSE jsonb_build_object(''asset_id'', m.asset_id::text) END';
  json_after   CONSTANT TEXT := 'ELSE jsonb_build_object(''asset_id'', m.asset_id::text) END'
    || ' || CASE WHEN m.gif_reference IS NULL THEN ''{}''::jsonb'
    || ' ELSE jsonb_build_object(''gif_reference'', m.gif_reference) END';
BEGIN
  SELECT pg_get_functiondef('public.socialu_conversation_messages(uuid,bigint)'::regprocedure) INTO d;

  IF position(kinds_after IN d) > 0 AND position(cte_after IN d) > 0 AND position(json_after IN d) > 0 THEN
    RAISE NOTICE 'socialu_conversation_messages already returns gif_library; nothing to do.';
    RETURN;
  END IF;

  IF position(kinds_before IN d) = 0 THEN
    RAISE EXCEPTION 'socialu_conversation_messages no longer filters kinds with %. Apply 20261124130000 first, or update this migration.', kinds_before;
  END IF;
  IF position(cte_before IN d) = 0 THEN
    RAISE EXCEPTION 'socialu_conversation_messages no longer selects %. Update this migration.', cte_before;
  END IF;
  IF position(json_before IN d) = 0 THEN
    RAISE EXCEPTION 'socialu_conversation_messages no longer builds its message object with %. Update this migration.', json_before;
  END IF;

  d := replace(d, kinds_before, kinds_after);
  d := replace(d, cte_before, cte_after);
  d := replace(d, json_before, json_after);
  EXECUTE d;
END;
$patch$;

NOTIFY pgrst, 'reload schema';
