-- Fix existing avatar triggers for calls through server-only functions.
-- Keeps trigger validation and all table data intact.
BEGIN;
ALTER FUNCTION socialu.validate_owned_purchase() SET search_path = pg_catalog, socialu, pg_temp;
ALTER FUNCTION socialu.validate_avatar() SET search_path = pg_catalog, socialu, pg_temp;
ALTER FUNCTION public.socialu_game_room(TEXT, UUID, TEXT, TEXT, TEXT) SET search_path = pg_catalog, socialu, pg_temp;
COMMIT;


