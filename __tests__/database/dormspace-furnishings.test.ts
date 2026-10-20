import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { befriend, createDormDatabase, dormCall } from '../helpers/dormspace-db';

it('grants included furniture to existing and future dorms without changing saved rooms, points or access rules', async () => {
  const db = await createDormDatabase();
  try {
    let old = await dormCall(db, 1, 'open');
    const original = old.catalog.find((item: any) => item.previewKey === 'bed');
    old = await dormCall(db, 1, 'save', null, { ...old, placements: [{ itemId: original.id, x: 0, y: 0 }] });
    const ledger = (await db.query('SELECT * FROM socialu.point_transactions ORDER BY transaction_id')).rows;
    const migration = readFileSync(join(process.cwd(), 'supabase/migrations/20261020013144_dormspace_furnishings.sql'), 'utf8');
    await db.exec(migration);
    const current = await dormCall(db, 1, 'open');
    expect(current.version).toBe(old.version);
    expect(current.placements).toEqual(old.placements);
    expect(current.wallItemId).toBe(old.wallItemId);
    expect(current.floorItemId).toBe(old.floorItemId);
    const additions = current.catalog.filter((item: any) => item.previewKey.startsWith('dorm-'));
    expect(additions.map((item: any) => item.name).sort()).toEqual(['Armchair', 'Bookshelf', 'Coffee table', 'Nightstand', 'Plant', 'Rug', 'Sofa', 'Wardrobe']);
    expect(additions.every((item: any) => current.owned.includes(item.id))).toBe(true);
    // The real API calls the restricted bridge as service_role; the trigger needs no extra powers.
    await db.exec('SET ROLE service_role');
    const fresh = await dormCall(db, 2, 'open');
    await db.exec('RESET ROLE');
    expect(additions.every((item: any) => fresh.owned.includes(item.id))).toBe(true);
    expect((await db.query<{prosecdef: boolean}>("SELECT prosecdef FROM pg_proc WHERE oid='socialu.grant_included_dorm_furnishings()'::regprocedure")).rows[0].prosecdef).toBe(false);
    const transactions = (await db.query('SELECT * FROM socialu.point_transactions ORDER BY transaction_id')).rows;
    expect(transactions).toEqual(ledger);
    expect((await db.query('SELECT * FROM socialu.catalog_items WHERE preview_key LIKE $1 AND (purchasable OR price_points IS NOT NULL)', ['dorm-%'])).rows).toEqual([]);

    // Rerunning is safe for owners whose rooms existed before or after the first application.
    await db.exec(migration);
    expect((await dormCall(db, 1, 'open')).owned).toEqual(current.owned);
    expect((await dormCall(db, 2, 'open')).owned).toEqual(fresh.owned);
    expect((await db.query('SELECT * FROM socialu.catalog_items WHERE preview_key LIKE $1', ['dorm-%'])).rows).toHaveLength(8);

    const id = (key: string) => current.catalog.find((item: any) => item.previewKey === `dorm-${key}`).id;
    const placements = [{ itemId: id('rug'), x: 2, y: 2 }, { itemId: id('sofa'), x: 2, y: 2 },
      { itemId: id('armchair'), x: 7, y: 4 }, { itemId: id('plant'), x: 0, y: 0 }];
    const saved = await dormCall(db, 1, 'save', null, { ...current, placements });
    expect((await dormCall(db, 1, 'open')).placements).toEqual(expect.arrayContaining(placements));
    const trySave = (next: any[]) => dormCall(db, 1, 'save', null, { ...saved, placements: next });
    // Rug compatibility does not permit two raised items to overlap or bypass the entrance/bounds.
    await expect(trySave([...placements, { itemId: id('coffee-table'), x: 2, y: 2 }])).rejects.toThrow();
    await expect(trySave([{ itemId: id('rug'), x: 4, y: 5 }])).rejects.toThrow();
    await expect(trySave([{ itemId: id('sofa'), x: 8, y: 0 }])).rejects.toThrow();
    await expect(trySave([{ itemId: id('plant'), x: 0, y: 0 }, { itemId: id('plant'), x: 1, y: 0 }])).rejects.toThrow();
    await befriend(db, 1, 3);
    const visited = await dormCall(db, 3, 'open', 'dorm1');
    expect(visited.owned).toEqual([]);
    await expect(dormCall(db, 3, 'save', 'dorm1', { ...saved, placements: [] })).rejects.toThrow(/owner/i);
    expect((await dormCall(db, 1, 'open')).version).toBe(saved.version);
    await db.exec('SET ROLE authenticated');
    await expect(db.exec('SELECT socialu.grant_included_dorm_furnishings()')).rejects.toThrow();
    await db.exec('RESET ROLE');
  } finally { await db.close(); }
}, 20000);
