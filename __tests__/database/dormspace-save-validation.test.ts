import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createDorm3dDatabase, SHOP_ONLY } from '../helpers/dormspace-3d-db';
import { dormCall } from '../helpers/dormspace-db';

const duplicateMigration = 'supabase/migrations/20261117050031_dormspace_duplicate_item_ids.sql';

it('rejects numeric aliases as one item and keeps the previous arrangement atomically (#1214)', async () => {
  const db = await createDorm3dDatabase(1, SHOP_ONLY);
  try {
    await db.exec(readFileSync(duplicateMigration, 'utf8'));
    await db.exec(readFileSync(duplicateMigration, 'utf8')); // Safe reapplication.
    let room = await dormCall(db, 1, 'open');
    const bed = room.catalog.find((item: any) => item.previewKey === 'bed').id;
    room = await dormCall(db, 1, 'save', null, { ...room, placements: [{ itemId: bed, x: 1, y: 1 }] });
    await db.exec('SET ROLE service_role');
    for (const alias of [bed, `0${bed}`, `000${bed}`, `+${bed}`]) {
      await expect(dormCall(db, 1, 'save', null, { ...room, placements: [
        { itemId: bed, x: 1, y: 1 }, { itemId: alias, x: 5, y: 1 },
      ] })).rejects.toMatchObject({ code: '22023', message: 'Each item can only be placed once.' });
      expect(await dormCall(db, 1, 'open')).toEqual(room);
    }
    for (const malformed of ['not-an-id', '999999999999999999999999999']) {
      await expect(dormCall(db, 1, 'save', null, { ...room, placements: [{ itemId: malformed, x: 1, y: 1 }] }))
        .rejects.toMatchObject({ code: '22023', message: 'Enter a valid dorm arrangement.' });
      expect(await dormCall(db, 1, 'open')).toEqual(room);
    }
    const moved = await dormCall(db, 1, 'save', null, { ...room, placements: [{ itemId: `0${bed}`, x: 2, y: 1 }] });
    expect(moved.placements).toEqual([{ itemId: bed, x: 2, y: 1, rotation: 0 }]);
  } finally { await db.close(); }
}, 25000);
