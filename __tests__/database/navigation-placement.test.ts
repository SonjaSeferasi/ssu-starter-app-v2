import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { createDormDatabase, testUid } from '../helpers/dormspace-db';

it('upgrades existing preferences and persists Top for only the selected account', async () => {
  const db = await createDormDatabase(2);
  try {
    // Reproduce the previously deployed constraint, then migrate actual existing rows.
    await db.exec(`ALTER TABLE socialu.student_preferences DROP CONSTRAINT student_preferences_navigation_position_check;
      ALTER TABLE socialu.student_preferences ADD CONSTRAINT student_preferences_navigation_position_check
        CHECK (navigation_position IN ('side','bottom'));
      INSERT INTO socialu.student_preferences(student_id,navigation_position) VALUES (1,'side'),(2,'bottom');`);
    const call = async (action: string, student: number, position: string | null = null) =>
      (await db.query<{ result: { position: string } }>('SELECT public.socialu_game_room($1,$2,$3) AS result', [action,testUid(student),position])).rows[0].result;
    await db.exec(readFileSync('supabase/migrations/20261117050000_top_navigation_preference.sql','utf8'));
    expect(await call('read_preferences',1)).toEqual({ position: 'side' });
    expect(await call('read_preferences',2)).toEqual({ position: 'bottom' });
    for (const position of ['top','bottom','side','top']) {
      expect(await call('save_preferences',1,position)).toEqual({ position });
      expect(await call('read_preferences',1)).toEqual({ position });
    }
    expect(await call('read_preferences',2)).toEqual({ position: 'bottom' });
    await expect(call('save_preferences',1,'left')).rejects.toThrow(/Invalid navigation position/);
    await expect(db.exec("UPDATE socialu.student_preferences SET navigation_position='left' WHERE student_id=1")).rejects.toThrow(/check constraint/);
    await db.exec('SET ROLE authenticated');
    await expect(call('read_preferences',1)).rejects.toThrow(/permission denied/);
  } finally { await db.close(); }
},30000);
