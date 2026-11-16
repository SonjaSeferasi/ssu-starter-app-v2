-- DormSpace furniture shop on the existing shared points ledger (SRS-522, SRS-523, SRS-529).
-- Additive and rerunnable. Apply after 20261104050601_dormspace_3d_directory.sql (independent of it)
-- and after the DormSpace furnishings migration.
--
-- Reuses socialu.catalog_items, socialu.owned_items, socialu.point_transactions with its
-- validate_points_transaction (account lock, current price, ownership, balance) and grant_purchase
-- (ownership in the same insert) triggers, and the socialu.points_balances view. There is no second
-- balance, wallet or counter. No existing ownership, placement, layout or ledger row is changed.
BEGIN;

-- Initial adjustable catalog prices in shared points (not money), applied only to items that have
-- never been priced, so a rerun never overrides a later price decision. The bed, desk, chair and
-- window starters keep starter_slot and stay free (the catalog CHECK forbids pricing a starter).
-- Every student who already owns these eight items keeps them: they were granted without a
-- purchase, and nothing here touches owned_items. Future dorm owners no longer receive them free,
-- because socialu.grant_included_dorm_furnishings only grants unpriced, non-purchasable items.
UPDATE socialu.catalog_items c
   SET price_points = p.price, purchasable = TRUE, unavailable_reason = NULL
  FROM (VALUES ('dorm-plant', 150), ('dorm-armchair', 300), ('dorm-sofa', 1500), ('dorm-rug', 200),
               ('dorm-coffee-table', 250), ('dorm-bookshelf', 450), ('dorm-wardrobe', 600), ('dorm-nightstand', 150))
       AS p(preview_key, price)
 WHERE c.preview_key = p.preview_key AND c.price_points IS NULL AND c.starter_slot IS NULL
   AND c.kind IN ('furniture', 'decoration');

-- A priced DormSpace item can only become newly owned through its purchase ledger row. Existing
-- ownership rows are never re-validated (INSERT only), so current grants are preserved.
CREATE OR REPLACE FUNCTION socialu.require_paid_dorm_item() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.purchase_transaction_id IS NULL AND EXISTS (
       SELECT 1 FROM socialu.catalog_items c WHERE c.item_id = NEW.item_id
          AND c.kind IN ('furniture', 'decoration') AND c.starter_slot IS NULL
          AND (c.purchasable OR c.price_points IS NOT NULL)) THEN
    RAISE EXCEPTION 'This DormSpace item must be purchased.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION socialu.require_paid_dorm_item() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS require_paid_dorm_item ON socialu.owned_items;
CREATE TRIGGER require_paid_dorm_item BEFORE INSERT ON socialu.owned_items
  FOR EACH ROW EXECUTE FUNCTION socialu.require_paid_dorm_item();

CREATE SCHEMA IF NOT EXISTS dormspace_shop;
REVOKE ALL ON SCHEMA dormspace_shop FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA dormspace_shop TO service_role;

CREATE OR REPLACE FUNCTION dormspace_shop.balance(p_student BIGINT) RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce((SELECT b.balance FROM socialu.points_balances b WHERE b.student_id = p_student), 0)::BIGINT;
$$;

-- One catalog offer as the student sees it now (SRS-529.1 to SRS-529.5, SRS-529.7).
CREATE OR REPLACE FUNCTION dormspace_shop.offer(p_student BIGINT, p_item BIGINT, p_balance BIGINT) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('id', c.item_id::TEXT, 'name', c.name, 'previewKey', c.preview_key, 'kind', c.kind,
    'surface', f.surface_code, 'width', f.width_cells, 'height', f.height_cells, 'overlapCategory', f.overlap_category,
    'price', c.price_points, 'state', s.state,
    'reason', CASE WHEN s.state = 'unavailable' THEN coalesce(c.unavailable_reason, 'Not offered in the shop.') END)
    FROM socialu.catalog_items c
    LEFT JOIN socialu.item_footprints f ON f.item_id = c.item_id
    CROSS JOIN LATERAL (SELECT CASE
      WHEN EXISTS (SELECT 1 FROM socialu.owned_items o WHERE o.student_id = p_student AND o.item_id = c.item_id) THEN 'owned'
      WHEN c.starter_slot IS NOT NULL THEN 'included'
      WHEN NOT c.purchasable OR c.price_points IS NULL OR c.unavailable_reason IS NOT NULL THEN 'unavailable'
      WHEN p_balance < c.price_points THEN 'insufficient'
      ELSE 'available' END AS state) s
   WHERE c.item_id = p_item;
$$;

CREATE OR REPLACE FUNCTION dormspace_shop.completed(p_student BIGINT, t socialu.point_transactions, p_replayed BOOLEAN) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('status', 'completed', 'replayed', p_replayed, 'itemId', t.purchased_item_id::TEXT,
    'charged', -t.points_change, 'balance', dormspace_shop.balance(p_student),
    'owned', coalesce((SELECT jsonb_agg(o.item_id::TEXT ORDER BY o.item_id) FROM socialu.owned_items o
                         JOIN socialu.catalog_items c ON c.item_id = o.item_id
                        WHERE o.student_id = p_student AND c.kind IN ('furniture', 'decoration')), '[]'::jsonb));
$$;

CREATE OR REPLACE FUNCTION dormspace_shop.rejected(p_student BIGINT, p_item BIGINT, p_reason TEXT, p_price BIGINT) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('status', 'rejected', 'reason', p_reason, 'itemId', p_item::TEXT, 'price', p_price,
    'balance', dormspace_shop.balance(p_student));
$$;

-- Actions: 'catalog' {}, 'purchase' {itemId, expectedPrice, actionKey}, 'status' {actionKey}.
-- The buyer is always the verified caller; price, ownership and the charge come from the database.
CREATE OR REPLACE FUNCTION dormspace_shop.operate(p_auth_id UUID, p_action TEXT, p_payload JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me BIGINT; v_item BIGINT; v_expected BIGINT; v_key UUID; v_balance BIGINT;
  existing socialu.point_transactions%ROWTYPE; item socialu.catalog_items%ROWTYPE;
BEGIN
  -- Deferred ownership constraints must run inside this definer context, not at API-role commit.
  SET CONSTRAINTS ALL IMMEDIATE;
  me := public.socialu_require_student(p_auth_id);
  IF p_action IS NULL OR p_action NOT IN ('catalog', 'purchase', 'status') THEN
    RAISE EXCEPTION 'Choose a valid shop action.' USING ERRCODE = '22023';
  END IF;

  IF p_action = 'catalog' THEN
    v_balance := dormspace_shop.balance(me);
    RETURN jsonb_build_object('balance', v_balance, 'offers', coalesce((
      SELECT jsonb_agg(dormspace_shop.offer(me, c.item_id, v_balance) ORDER BY c.item_id)
        FROM socialu.catalog_items c JOIN socialu.item_footprints f ON f.item_id = c.item_id
       WHERE c.kind IN ('furniture', 'decoration')), '[]'::jsonb));
  END IF;

  IF coalesce(p_payload->>'actionKey', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Start the purchase again.' USING ERRCODE = '22023';
  END IF;
  v_key := (p_payload->>'actionKey')::UUID;

  -- SRS-523.5 / SRS-523.6: one account row lock serializes all of this student's spending, so
  -- competing purchases see each other's committed charges and ownership.
  PERFORM 1 FROM socialu.students s WHERE s.student_id = me FOR UPDATE;

  -- SRS-523.4 / SRS-523.11: the same key returns its original outcome, even after a price change.
  SELECT * INTO existing FROM socialu.point_transactions t WHERE t.student_id = me AND t.action_key = v_key;
  IF p_action = 'status' THEN
    -- A key that is unknown or belongs to a non-purchase ledger entry is not a purchase.
    IF existing.transaction_id IS NULL OR existing.category <> 'purchase' THEN
      RETURN jsonb_build_object('status', 'not_found', 'balance', dormspace_shop.balance(me));
    END IF;
    RETURN dormspace_shop.completed(me, existing, true);
  END IF;

  IF coalesce(p_payload->>'itemId', '') !~ '^[1-9][0-9]{0,18}$' OR coalesce(p_payload->>'expectedPrice', '') !~ '^[0-9]{1,15}$' THEN
    RAISE EXCEPTION 'Choose an item and confirm its price.' USING ERRCODE = '22023';
  END IF;
  v_item := (p_payload->>'itemId')::BIGINT;
  v_expected := (p_payload->>'expectedPrice')::BIGINT;
  IF existing.transaction_id IS NOT NULL THEN
    IF existing.category <> 'purchase' OR existing.purchased_item_id IS DISTINCT FROM v_item THEN
      RETURN dormspace_shop.rejected(me, v_item, 'key_mismatch', NULL);
    END IF;
    RETURN dormspace_shop.completed(me, existing, true);
  END IF;

  -- A share lock holds the offer steady until this purchase commits (catalog edits wait).
  SELECT * INTO item FROM socialu.catalog_items c WHERE c.item_id = v_item AND c.kind IN ('furniture', 'decoration') FOR SHARE;
  IF NOT FOUND THEN RETURN dormspace_shop.rejected(me, v_item, 'unavailable', NULL); END IF;
  IF EXISTS (SELECT 1 FROM socialu.owned_items o WHERE o.student_id = me AND o.item_id = v_item) THEN
    RETURN dormspace_shop.rejected(me, v_item, 'owned', item.price_points);
  END IF;
  IF item.starter_slot IS NOT NULL OR NOT item.purchasable OR item.price_points IS NULL OR item.unavailable_reason IS NOT NULL THEN
    RETURN dormspace_shop.rejected(me, v_item, 'unavailable', item.price_points);
  END IF;
  -- SRS-522.7 / SRS-523.9: the charge is the current price, and only if it is the price confirmed.
  IF item.price_points <> v_expected THEN RETURN dormspace_shop.rejected(me, v_item, 'price_changed', item.price_points); END IF;
  IF dormspace_shop.balance(me) < item.price_points THEN RETURN dormspace_shop.rejected(me, v_item, 'insufficient', item.price_points); END IF;

  -- SRS-523.1: one ledger row; validate_points_transaction re-checks price, ownership and balance
  -- under the account lock, and grant_purchase inserts ownership in the same statement.
  BEGIN
    INSERT INTO socialu.point_transactions (student_id, category, points_change, action_key, purchased_item_id)
    VALUES (me, 'purchase', -item.price_points, v_key, v_item)
    RETURNING * INTO existing;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT * INTO existing FROM socialu.point_transactions t WHERE t.student_id = me AND t.action_key = v_key;
      IF FOUND AND existing.category = 'purchase' AND existing.purchased_item_id = v_item THEN
        RETURN dormspace_shop.completed(me, existing, true);
      END IF;
      RETURN dormspace_shop.rejected(me, v_item, CASE WHEN FOUND THEN 'key_mismatch' ELSE 'owned' END, item.price_points);
    WHEN raise_exception THEN
      -- SRS-523.2: the failed insert was rolled back to the savepoint; nothing was charged or granted.
      RETURN dormspace_shop.rejected(me, v_item, CASE
        WHEN SQLERRM LIKE 'Insufficient%' THEN 'insufficient' WHEN SQLERRM LIKE 'Price changed%' THEN 'price_changed'
        WHEN SQLERRM LIKE 'Item already owned%' THEN 'owned' ELSE 'unavailable' END, item.price_points);
  END;
  RETURN dormspace_shop.completed(me, existing, false);
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA dormspace_shop FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION dormspace_shop.operate(UUID, TEXT, JSONB) TO service_role;

-- Service-only invoker bridge called by /api/dorm/shop after verifiedUser(); no client role may call it.
CREATE OR REPLACE FUNCTION public.socialu_dorm_shop(p_auth_id UUID, p_action TEXT, p_payload JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT dormspace_shop.operate(p_auth_id, p_action, p_payload);
$$;
REVOKE ALL ON FUNCTION public.socialu_dorm_shop(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.socialu_dorm_shop(UUID, TEXT, JSONB) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
