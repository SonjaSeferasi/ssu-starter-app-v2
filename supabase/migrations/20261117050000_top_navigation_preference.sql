-- Add Top navigation without replacing other deployed account/avatar logic.
BEGIN;
ALTER TABLE socialu.student_preferences
  DROP CONSTRAINT student_preferences_navigation_position_check;
ALTER TABLE socialu.student_preferences
  ADD CONSTRAINT student_preferences_navigation_position_check
  CHECK (navigation_position IN ('side', 'bottom', 'top'));

-- Preserve the deployed function body, settings and grants. Fail atomically if its
-- validation rule is unfamiliar instead of overwriting it with an older copy.
DO $migration$
DECLARE
  definition TEXT := pg_get_functiondef('public.socialu_game_room(text,uuid,text,text,text)'::regprocedure);
  old_rule TEXT := $rule$p_position NOT IN ('side', 'bottom')$rule$;
  new_rule TEXT := $rule$p_position NOT IN ('side', 'bottom', 'top')$rule$;
BEGIN
  IF strpos(definition, old_rule) > 0 THEN
    EXECUTE replace(definition, old_rule, new_rule);
  ELSIF strpos(definition, new_rule) = 0 THEN
    RAISE EXCEPTION 'Unknown navigation validation rule; inspect socialu_game_room before migrating';
  END IF;
END;
$migration$;
NOTIFY pgrst, 'reload schema';
COMMIT;
