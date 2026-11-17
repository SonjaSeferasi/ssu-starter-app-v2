import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { createDormDatabase, testUid } from '../helpers/dormspace-db';

it('SRS-627: defaults, account isolation, persistence, independent placement and execution permissions', async () => {
  const db = await createDormDatabase(2);
  const call = async (student: number, theme: string | null = null) =>
    (await db.query<{ result: { theme: string } }>('SELECT public.socialu_appearance($1,$2) AS result', [testUid(student), theme])).rows[0].result;
  try {
    await db.exec(readFileSync('supabase/migrations/20261117070000_appearance_preferences.sql', 'utf8'));
    expect(await call(1)).toEqual({ theme: 'light' });
    await db.query("SELECT public.socialu_game_room('save_preferences',$1,'bottom')", [testUid(1)]);
    expect(await call(1, 'dark')).toEqual({ theme: 'dark' });
    expect(await call(1)).toEqual({ theme: 'dark' });
    expect(await call(2)).toEqual({ theme: 'light' });
    expect((await db.query('SELECT navigation_position FROM socialu.student_preferences WHERE student_id=1')).rows[0]).toEqual({ navigation_position: 'bottom' });
    await db.query("SELECT public.socialu_game_room('save_preferences',$1,'side')", [testUid(1)]);
    expect(await call(1)).toEqual({ theme: 'dark' });
    await expect(call(1, 'system')).rejects.toThrow(/Invalid appearance/);
    expect(await call(1)).toEqual({ theme: 'dark' });
    await expect(call(999, 'dark')).rejects.toThrow();
    expect(await call(1, 'light')).toEqual({ theme: 'light' });
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      await expect(call(1)).rejects.toThrow(/permission denied/);
      await db.exec('RESET ROLE');
    }
    await db.exec('SET ROLE service_role');
    expect(await call(1, 'dark')).toEqual({ theme: 'dark' });
  } finally { await db.close(); }
}, 30000);
