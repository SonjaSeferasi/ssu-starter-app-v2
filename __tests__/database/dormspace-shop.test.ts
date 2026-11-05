import { afterEach, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { dormCall } from '../helpers/dormspace-db';
import { applyMigration, balance, createDorm3dDatabase as create, credit, itemId, openDorm, shopCall, SHOP_MIGRATION, SHOP_ONLY } from '../helpers/dormspace-3d-db';

// Real PostgreSQL (PGlite) tests for the furniture shop on the existing shared points ledger.
// Only the shop migration is applied (the directory migration is independent and tested separately).
const createDorm3dDatabase = (students: number, beforeShop?: (db: PGlite) => Promise<void>) => create(students, { ...SHOP_ONLY, beforeShop });
// PGlite has one connection: "concurrent" calls are delivered together but run one after another;
// hosted concurrency relies on the account row lock and the ledger's unique keys exercised here.
let db: PGlite | null = null;
afterEach(async () => { await db?.close(); db = null; });
const KEY = (n: number) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, '0')}`;
const EXTRAS = ['dorm-plant', 'dorm-armchair', 'dorm-sofa', 'dorm-rug', 'dorm-coffee-table', 'dorm-bookshelf', 'dorm-wardrobe', 'dorm-nightstand'];
const purchases = async (student: number) => Number((await db!.query<{ n: string }>(`SELECT count(*) AS n FROM socialu.point_transactions WHERE student_id=$1 AND category='purchase'`, [student])).rows[0].n);
const owns = async (student: number, key: string) => (await db!.query(`SELECT 1 FROM socialu.owned_items o JOIN socialu.catalog_items c USING(item_id) WHERE o.student_id=$1 AND c.preview_key=$2`, [student, key])).rows.length === 1;
const offer = (catalog: any, key: string) => catalog.offers.find((o: any) => o.previewKey === key);

describe('DormSpace furniture shop', () => {
  it('prices the eight extras, keeps starters free and keeps every existing grant and layout', async () => {
    let layout: any;
    db = await createDorm3dDatabase(4, async d => {
      await openDorm(d, 1);
      const sofa = (await d.query<{ item_id: string }>(`SELECT item_id FROM socialu.catalog_items WHERE preview_key='dorm-sofa'`)).rows[0].item_id;
      const dorm = await dormCall(d, 1, 'open');
      layout = await dormCall(d, 1, 'save', null, { version: dorm.version, placements: [{ itemId: String(sofa), x: 1, y: 1, rotation: 90 }], wallItemId: dorm.wallItemId, floorItemId: dorm.floorItemId });
    });
    const prices = (await db.query<{ preview_key: string; price_points: string; purchasable: boolean }>(`SELECT preview_key, price_points, purchasable FROM socialu.catalog_items WHERE preview_key = ANY($1) ORDER BY preview_key`, [EXTRAS])).rows;
    expect(Object.fromEntries(prices.map(r => [r.preview_key, Number(r.price_points)]))).toEqual({
      'dorm-armchair': 300, 'dorm-bookshelf': 450, 'dorm-coffee-table': 250, 'dorm-nightstand': 150, 'dorm-plant': 150, 'dorm-rug': 200, 'dorm-sofa': 1500, 'dorm-wardrobe': 600,
    });
    expect((await db.query(`SELECT 1 FROM socialu.catalog_items WHERE starter_slot IS NOT NULL AND (purchasable OR price_points IS NOT NULL)`)).rows).toHaveLength(0);
    // Existing owner: all eight extras still owned without any charge; layout and version unchanged.
    for (const key of EXTRAS) expect(await owns(1, key)).toBe(true);
    expect(await purchases(1)).toBe(0);
    const reopened = await dormCall(db, 1, 'open');
    expect(reopened.version).toBe(layout.version);
    expect(reopened.placements).toEqual(layout.placements);
    const catalog = await shopCall(db, 1, 'catalog');
    for (const key of EXTRAS) expect(offer(catalog, key).state).toBe('owned');
    // New owner after the migration: starters free, extras offered for points.
    await openDorm(db, 2);
    for (const key of ['bed', 'desk', 'chair', 'window']) expect(await owns(2, key)).toBe(true);
    for (const key of EXTRAS) expect(await owns(2, key)).toBe(false);
    const fresh = await shopCall(db, 2, 'catalog');
    expect(fresh.balance).toBe(0);
    expect(offer(fresh, 'bed').state).toBe('owned');
    expect(offer(fresh, 'dorm-sofa')).toMatchObject({ state: 'insufficient', price: 1500, width: 3, height: 2, surface: 'floor', overlapCategory: 'seat' });
    // A priced item cannot become owned without its purchase row.
    await expect(db.query(`INSERT INTO socialu.owned_items(student_id,item_id) VALUES(2,$1)`, [await itemId(db, 'dorm-plant')])).rejects.toThrow(/must be purchased/);
  }, 40000);

  it('charges once per key, grants ownership atomically and allows placing at once', async () => {
    db = await createDorm3dDatabase(3);
    await openDorm(db, 2); await credit(db, 2, 2000);
    const plant = await itemId(db, 'dorm-plant');
    const first = await shopCall(db, 2, 'purchase', { itemId: plant, expectedPrice: 150, actionKey: KEY(1) });
    expect(first).toMatchObject({ status: 'completed', replayed: false, itemId: plant, charged: 150, balance: 1850 });
    expect(first.owned).toContain(plant);
    // One debit row, linked to exactly one ownership grant (driver may return BIGINT as number or string).
    const rows = (await db.query<{ points_change: number | string; linked: boolean }>(`SELECT t.points_change, o.purchase_transaction_id = t.transaction_id AS linked FROM socialu.point_transactions t
      JOIN socialu.owned_items o ON o.student_id=t.student_id AND o.item_id=t.purchased_item_id WHERE t.student_id=2 AND t.category='purchase'`)).rows;
    expect(rows.map(r => ({ debit: Number(r.points_change), linked: r.linked }))).toEqual([{ debit: -150, linked: true }]);
    // Same key again: original outcome, no new charge or grant (SRS-523.4).
    expect(await shopCall(db, 2, 'purchase', { itemId: plant, expectedPrice: 150, actionKey: KEY(1) })).toMatchObject({ status: 'completed', replayed: true, charged: 150, balance: 1850 });
    expect(await shopCall(db, 2, 'status', { actionKey: KEY(1) })).toMatchObject({ status: 'completed', replayed: true });
    expect(await shopCall(db, 2, 'status', { actionKey: KEY(9) })).toMatchObject({ status: 'not_found', balance: 1850 });
    // Same key for another item is refused and charges nothing.
    expect(await shopCall(db, 2, 'purchase', { itemId: await itemId(db, 'dorm-rug'), expectedPrice: 200, actionKey: KEY(1) })).toMatchObject({ status: 'rejected', reason: 'key_mismatch' });
    expect(await purchases(2)).toBe(1);
    expect(await shopCall(db, 2, 'purchase', { itemId: plant, expectedPrice: 150, actionKey: KEY(2) })).toMatchObject({ status: 'rejected', reason: 'owned' });
    // Placeable immediately through the normal save.
    const dorm = await dormCall(db, 2, 'open');
    const saved = await dormCall(db, 2, 'save', null, { version: dorm.version, placements: [{ itemId: plant, x: 0, y: 0, rotation: 0 }], wallItemId: dorm.wallItemId, floorItemId: dorm.floorItemId });
    expect(saved.placements).toEqual([{ itemId: plant, x: 0, y: 0, rotation: 0 }]);
    expect(await balance(db, 2)).toBe(1850);
  }, 40000);

  it('rejects changed prices, insufficient balances and unavailable items without charging', async () => {
    db = await createDorm3dDatabase(3);
    await openDorm(db, 2); await credit(db, 2, 400);
    const rug = await itemId(db, 'dorm-rug');
    await db.query(`UPDATE socialu.catalog_items SET price_points=260 WHERE item_id=$1`, [rug]);
    expect(await shopCall(db, 2, 'purchase', { itemId: rug, expectedPrice: 200, actionKey: KEY(3) })).toMatchObject({ status: 'rejected', reason: 'price_changed', price: 260, balance: 400 });
    const bought = await shopCall(db, 2, 'purchase', { itemId: rug, expectedPrice: 260, actionKey: KEY(4) });
    expect(bought).toMatchObject({ status: 'completed', charged: 260, balance: 140 });
    // The completed key keeps its original charge after a later price change.
    await db.query(`UPDATE socialu.catalog_items SET price_points=999 WHERE item_id=$1`, [rug]);
    expect(await shopCall(db, 2, 'purchase', { itemId: rug, expectedPrice: 999, actionKey: KEY(4) })).toMatchObject({ status: 'completed', replayed: true, charged: 260 });
    expect(await shopCall(db, 2, 'purchase', { itemId: await itemId(db, 'dorm-sofa'), expectedPrice: 1500, actionKey: KEY(5) })).toMatchObject({ status: 'rejected', reason: 'insufficient' });
    expect(await shopCall(db, 2, 'purchase', { itemId: await itemId(db, 'bed'), expectedPrice: 0, actionKey: KEY(6) })).toMatchObject({ status: 'rejected', reason: 'owned' });
    const wardrobe = await itemId(db, 'dorm-wardrobe');
    await db.query(`UPDATE socialu.catalog_items SET purchasable=false, unavailable_reason='Seasonal item' WHERE item_id=$1`, [wardrobe]);
    expect(await shopCall(db, 2, 'purchase', { itemId: wardrobe, expectedPrice: 600, actionKey: KEY(7) })).toMatchObject({ status: 'rejected', reason: 'unavailable' });
    expect(offer(await shopCall(db, 2, 'catalog'), 'dorm-wardrobe')).toMatchObject({ state: 'unavailable', reason: 'Seasonal item' });
    expect(await purchases(2)).toBe(1);
    expect(await balance(db, 2)).toBe(140);
    await expect(shopCall(db, 2, 'purchase', { itemId: rug, expectedPrice: 1, actionKey: 'not-a-key' })).rejects.toThrow(/Start the purchase again/);
  }, 40000);

  it('never overspends or double-grants under competing deliveries', async () => {
    db = await createDorm3dDatabase(3);
    await openDorm(db, 2); await credit(db, 2, 300);
    const table = await itemId(db, 'dorm-coffee-table'), rug = await itemId(db, 'dorm-rug');
    const results = await Promise.all([
      shopCall(db, 2, 'purchase', { itemId: table, expectedPrice: 250, actionKey: KEY(10) }),
      shopCall(db, 2, 'purchase', { itemId: table, expectedPrice: 250, actionKey: KEY(10) }),
      shopCall(db, 2, 'purchase', { itemId: table, expectedPrice: 250, actionKey: KEY(11) }),
      shopCall(db, 2, 'purchase', { itemId: rug, expectedPrice: 200, actionKey: KEY(12) }),
    ]);
    expect(results.filter(r => r.status === 'completed' && !r.replayed)).toHaveLength(1);
    expect(await purchases(2)).toBe(1);
    expect(await balance(db, 2)).toBe(50);
    expect(results.find(r => r.status === 'rejected' && r.reason === 'insufficient')).toBeTruthy();
  }, 40000);

  it('uses only the verified buyer, stays service-only and is safe to rerun', async () => {
    db = await createDorm3dDatabase(3);
    await openDorm(db, 2); await openDorm(db, 3); await credit(db, 3, 500);
    const plant = await itemId(db, 'dorm-plant');
    // An injected student id is ignored: student 3 pays for their own purchase.
    expect(await shopCall(db, 3, 'purchase', { itemId: plant, expectedPrice: 150, actionKey: KEY(20), studentId: 2 })).toMatchObject({ status: 'completed', balance: 350 });
    expect(await owns(2, 'dorm-plant')).toBe(false);
    await db.query(`UPDATE socialu.catalog_items SET price_points=175 WHERE item_id=$1`, [plant]);
    await applyMigration(db, SHOP_MIGRATION);
    expect(Number((await db.query<{ p: string }>(`SELECT price_points AS p FROM socialu.catalog_items WHERE item_id=$1`, [plant])).rows[0].p)).toBe(175);
    expect(await owns(3, 'dorm-plant')).toBe(true);
    const can = async (role: string, fn: string) => (await db!.query<{ ok: boolean }>(`SELECT has_function_privilege($1,$2,'EXECUTE') AS ok`, [role, fn])).rows[0].ok;
    for (const role of ['anon', 'authenticated']) {
      expect(await can(role, 'public.socialu_dorm_shop(uuid,text,jsonb)')).toBe(false);
      expect(await can(role, 'dormspace_shop.operate(uuid,text,jsonb)')).toBe(false);
    }
    expect(await can('service_role', 'public.socialu_dorm_shop(uuid,text,jsonb)')).toBe(true);
    await expect(shopCall(db, 3, 'refund', {})).rejects.toThrow(/valid shop action/);
  }, 40000);
});
