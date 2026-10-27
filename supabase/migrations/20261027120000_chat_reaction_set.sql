-- SRS-210.1 / SRS-210.2 (UR-210) react to messages: the approved reaction set. Tasks #802, #804.
-- Saves the project's fixed reaction set in the existing reaction_options table (it was left empty in
-- schema.sql until the team agreed on it; SRS-210.2 now names it, which settles the Chat part of B-15):
--   👍 ❤️ 😂 😮 😢 🙏
-- Each emoji is written with its Unicode code points so the file stays plain text; ❤️ is U+2764 U+FE0F.
-- It also lets reactions be used in private conversations as well as groups (UR-210 now covers both): the
-- shared validate_message_receipt trigger function from schema.sql allowed reactions only from current group
-- members. Reactions now need a current participant of either kind of conversation who may read the message.
-- Read receipts (message_reads), which use the same function, are checked exactly as before.
-- No table, policy or grant changes. Apply once after 20261026180100_chat_group_invitation_live.sql.

INSERT INTO socialu.reaction_options (emoji) VALUES
  (U&'\+01F44D'), (U&'\2764\FE0F'), (U&'\+01F602'), (U&'\+01F62E'), (U&'\+01F622'), (U&'\+01F64F')
ON CONFLICT (emoji) DO NOTHING;

CREATE OR REPLACE FUNCTION socialu.validate_message_receipt() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = socialu, pg_catalog AS $$
BEGIN
    IF NOT can_read_message(NEW.student_id,NEW.message_id) THEN RAISE EXCEPTION 'No access to this message'; END IF;
    IF TG_TABLE_NAME='message_reactions' AND NOT EXISTS (
        SELECT 1 FROM messages m WHERE m.message_id=NEW.message_id
        AND is_current_participant(m.conversation_id,NEW.student_id))
    THEN RAISE EXCEPTION 'Reaction requires current conversation participation'; END IF;
    RETURN NEW;
END;
$$;
