import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createDormDatabase, testUid } from '../helpers/dormspace-db';
import { completeAvatars } from '../../lib/avatar-collection';

it('preserves legacy selections and saves all 126 complete avatar ids with account isolation', async () => {
  const db = await createDormDatabase(2);
  const avatar = async (student: number, selection?: Record<string, unknown>) => (await db.query<{ data: any }>(
    'SELECT public.socialu_avatar_customization($1,$2::jsonb) AS data', [testUid(student), selection ? JSON.stringify(selection) : null])).rows[0].data;
  try {
    const before = await avatar(1);
    await db.exec(readFileSync('supabase/migrations/20261022020000_complete_avatars.sql', 'utf8'));
    await db.exec(readFileSync('supabase/migrations/20261022030000_avatar_variants.sql', 'utf8'));
    await db.exec('SET ROLE service_role');
    expect((await avatar(1)).appearance).toEqual(before.appearance);
    const classic = { ...before.appearance, faceStyle: 'natural', shirtColor: 'navy', pantsColor: 'denim' };
    for (const option of completeAvatars) {
      const selected = { ...classic, avatarId: option.id };
      expect((await avatar(1, selected)).appearance).toMatchObject(selected);
      expect((await avatar(1)).appearance).toMatchObject(selected);
    }
    expect((await avatar(2)).appearance).not.toHaveProperty('avatarId');
    await expect(avatar(1, { ...classic, avatarId: 'unknown' })).rejects.toThrow();
    await expect(avatar(1, { ...classic, avatarId: 'campus-male-1', outfitId: '999999' })).rejects.toThrow();
    expect((await avatar(1, classic)).appearance).not.toHaveProperty('avatarId');
  } finally { await db.close(); }
}, 25000);
