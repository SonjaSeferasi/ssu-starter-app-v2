-- SRS-201.15 (UR-201, #1409, #1410) display a sent GIF.
-- "After a GIF is successfully sent, the system shall display the GIF within the conversation."
--
-- socialu_send_gif (20261124120000) writes a message of kind 'gif_upload', but the history never returns
-- one: socialu_conversation_messages selects `msg.kind IN ('text', 'emoji', 'photo')` and builds its
-- 'photos' map from `pm.kind = 'photo'`. So a sent GIF is visible to its sender, from the link the send
-- returned, and disappears on the next reload. This makes the history return it.
--
-- Two small changes, made by rewriting the deployed function rather than restating it:
--   1. 'gif_upload' joins the kinds the history returns;
--   2. a 'gif_upload' message joins the 'photos' map, so its storage key reaches lib/chat-photo-urls.ts
--      and is signed with everything else. A GIF has no display copy, so the LEFT JOIN on
--      chat_photo_displays simply finds nothing and photoKeyToShow falls back to the original -- which is
--      the only object there is.
--
-- Why pg_get_functiondef and replace, rather than a fresh CREATE OR REPLACE with the whole body:
-- socialu_conversation_messages has been redefined by six migrations (most recently
-- 20261117160000_chat_private_read_status.sql), and each one carries rules from the ones before it --
-- the former-member window from #1222, the read status, the sender photos, the deleted-photo flag.
-- Copying the body here would freeze today's version into this file and quietly undo anything that lands
-- between writing this and applying it. The same idiom is used by 20261026000100_school_communities.sql
-- and 20261116130000_chat_former_member_history.sql.
--
-- Both replacements are checked: if a future refactor changes either phrase, this migration fails loudly
-- rather than applying nothing and leaving GIFs invisible.
--
-- Apply once after 20261124120000_chat_send_gif.sql. Safe to re-run.
-- Nothing else changes: no new table, no new column, no change to what a photo message returns.

DO $patch$
DECLARE
  d TEXT;
  kinds_before CONSTANT TEXT := 'msg.kind IN (''text'', ''emoji'', ''photo'')';
  kinds_after  CONSTANT TEXT := 'msg.kind IN (''text'', ''emoji'', ''photo'', ''gif_upload'')';
  map_before   CONSTANT TEXT := 'WHERE pm.kind = ''photo'' AND NOT pm.is_deleted';
  map_after    CONSTANT TEXT := 'WHERE pm.kind IN (''photo'', ''gif_upload'') AND NOT pm.is_deleted';
BEGIN
  SELECT pg_get_functiondef('public.socialu_conversation_messages(uuid,bigint)'::regprocedure) INTO d;

  IF position(kinds_after IN d) > 0 AND position(map_after IN d) > 0 THEN
    RAISE NOTICE 'socialu_conversation_messages already returns gif_upload; nothing to do.';
    RETURN;
  END IF;

  IF position(kinds_before IN d) = 0 THEN
    RAISE EXCEPTION 'socialu_conversation_messages no longer filters kinds with %. Update this migration.', kinds_before;
  END IF;
  IF position(map_before IN d) = 0 THEN
    RAISE EXCEPTION 'socialu_conversation_messages no longer builds its photo map with %. Update this migration.', map_before;
  END IF;

  d := replace(d, kinds_before, kinds_after);
  d := replace(d, map_before, map_after);
  EXECUTE d;
END;
$patch$;

NOTIFY pgrst, 'reload schema';
