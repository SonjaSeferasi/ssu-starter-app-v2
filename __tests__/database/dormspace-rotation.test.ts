import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { befriend, createDormDatabase, dormCall } from '../helpers/dormspace-db';

it('persists rotated furniture through the real restricted bridge and validates both sides of every footprint', async () => {
  const db = await createDormDatabase();
  try {
    await db.exec(readFileSync('supabase/migrations/20261020013144_dormspace_furnishings.sql', 'utf8'));
    let room = await dormCall(db, 1, 'open');
    const id = (key: string) => room.catalog.find((item: any) => item.previewKey === key).id;
    room = await dormCall(db, 1, 'save', null, { ...room, placements: [{ itemId: id('bed'), x: 0, y: 0 }] });
    const legacy = room;
    const migration = readFileSync('supabase/migrations/20261020021507_dormspace_rotation.sql', 'utf8');
    // Migration files and pg_get_functiondef can have different line endings.
    // Exercise a Windows deployment, followed by an idempotent Unix rerun.
    const unixMigration = migration.replace(/\r\n/g, '\n');
    await db.exec(unixMigration.replace(/\n/g, '\r\n'));
    await db.exec(unixMigration);
    room = await dormCall(db, 1, 'open');
    expect(room.version).toBe(legacy.version);
    expect(room.placements).toEqual([{ ...legacy.placements[0], rotation: 0 }]);
    await db.exec('SET ROLE service_role');
    const save = async (placements: any[], version = room.version) => {
      room = await dormCall(db, 1, 'save', null, { ...room, version, placements });
      return room;
    };
    for (const key of ['bed', 'chair', 'desk', 'dorm-sofa', 'dorm-armchair', 'dorm-bookshelf', 'dorm-wardrobe',
      'dorm-coffee-table', 'dorm-nightstand', 'dorm-plant', 'dorm-rug']) {
      for (const rotation of [0, 90, 180, 270]) {
        const placement = { itemId: id(key), x: 1, y: 1, rotation };
        await save([placement]);
        expect((await dormCall(db, 1, 'open')).placements).toEqual([placement]);
      }
    }
    const invalid = async (placements: any[]) => {
      const previous = room;
      await expect(save(placements)).rejects.toThrow();
      expect(await dormCall(db, 1, 'open')).toEqual(previous);
    };
    for (const rotation of [-90, 45, 360, 90.5, '90', null, true]) {
      await invalid([{ itemId: id('bed'), x: 1, y: 1, rotation }]);
    }
    await invalid([{ itemId: id('window'), x: 0, y: 0, rotation: 90 }]);
    await invalid([{ itemId: id('bed'), x: 8, y: 0, rotation: 90 }]);
    await invalid([{ itemId: id('desk'), x: 4, y: 4, rotation: 90 }]);
    const desk = { itemId: id('desk'), x: 1, y: 1, rotation: 90 };
    const plant = { itemId: id('dorm-plant'), x: 1, y: 3, rotation: 0 };
    await invalid([desk, plant]);
    await invalid([plant, desk]);
    await save([desk, { itemId: id('dorm-rug'), x: 1, y: 1, rotation: 90 }]);
    const stored = room;
    await expect(save([], room.version - 1)).rejects.toThrow(/changed somewhere else/);
    expect((await dormCall(db, 1, 'open')).placements).toEqual(stored.placements);
    await db.exec('RESET ROLE');
    await befriend(db, 1, 3);
    expect((await dormCall(db, 3, 'open', 'dorm1')).placements).toEqual(stored.placements);
    await expect(dormCall(db, 3, 'save', 'dorm1', { ...room, placements: [] })).rejects.toThrow(/owner/);
    expect((await db.query<{ allowed: boolean }>("SELECT has_function_privilege('authenticated','public.socialu_dorm(text,uuid,text,jsonb)','EXECUTE') AS allowed")).rows[0].allowed).toBe(false);
  } finally { await db.close(); }
}, 25000);
