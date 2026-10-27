import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createDormDatabase, testUid } from '../helpers/dormspace-db';

it('lets only the owner pin up to six memories in their own folder, and hides them from blocked students', async () => {
  const db = await createDormDatabase(2);
  try {
    const sql = readFileSync('supabase/migrations/20261027080000_profile_memories.sql', 'utf8');
    await db.exec(sql); await db.exec(sql);
    const call = async (student: number, action: string, username: string | null = null, key: string | null = null, caption = '', doodle = 'none', id: number | null = null) =>
      (await db.query<any>('SELECT public.socialu_profile_memories($1,$2,$3,$4,$5,$6,$7) AS m', [testUid(student), action, username, key, caption, doodle, id])).rows[0].m;
    const key = (student: number, n: number) => `profile-memories/${testUid(student)}/00000000-0000-4000-8000-${String(n).padStart(12, '0')}.jpg`;
    expect(await call(1, 'read')).toEqual({ memories: [], removedKey: null });
    const added = await call(1, 'add', null, key(1, 1), ' Campus days ', 'heart');
    expect(added.memories[0]).toMatchObject({ key: key(1, 1), caption: 'Campus days', doodle: 'heart' });
    expect((await call(2, 'read', 'dorm1')).memories).toHaveLength(1);
    await expect(call(2, 'add', 'dorm1', key(2, 2))).rejects.toThrow(/own memories/);
    await expect(call(2, 'add', null, key(1, 3))).rejects.toThrow(/photo/);
    await expect(call(1, 'add', null, key(1, 4), 'x'.repeat(41))).rejects.toThrow(/photo/);
    await expect(call(1, 'add', null, key(1, 4), '', 'skull')).rejects.toThrow(/photo/);
    for (let n = 2; n <= 6; n++) await call(1, 'add', null, key(1, n));
    await expect(call(1, 'add', null, key(1, 7))).rejects.toThrow(/up to six/);
    const id = added.memories[0].id;
    await expect(call(2, 'remove', 'dorm1', null, '', 'none', id)).rejects.toThrow(/own memories/);
    const removed = await call(1, 'remove', null, null, '', 'none', id);
    expect(removed.removedKey).toBe(key(1, 1));
    expect(removed.memories).toHaveLength(5);
    await db.query('INSERT INTO socialu.student_blocks(blocker_id,blocked_id) VALUES(1,2)');
    await expect(call(2, 'read', 'dorm1')).rejects.toThrow(/not available/);
    await db.exec('SET ROLE authenticated');
    await expect(call(1, 'read')).rejects.toThrow(/permission denied/);
  } finally { await db.close(); }
}, 30000);
