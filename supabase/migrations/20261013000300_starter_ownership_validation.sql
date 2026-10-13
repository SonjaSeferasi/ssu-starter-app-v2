-- Preserve the ownership check and skip purchase lookup for free starter grants.
CREATE OR REPLACE FUNCTION socialu.validate_owned_purchase() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, socialu, pg_temp AS $body$
BEGIN
 IF NEW.purchase_transaction_id IS NOT NULL THEN
  IF NOT EXISTS (SELECT 1 FROM socialu.point_transactions WHERE transaction_id=NEW.purchase_transaction_id AND student_id=NEW.student_id AND category='purchase' AND purchased_item_id=NEW.item_id) THEN
   RAISE EXCEPTION 'Ownership must match its purchase';
  END IF;
 END IF;
 RETURN NULL;
END;
$body$;
