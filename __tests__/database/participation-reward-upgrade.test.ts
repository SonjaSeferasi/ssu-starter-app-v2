import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { createDormDatabase, testUid } from '../helpers/dormspace-db';

it('upgrades an installed five-point rule without rewriting or duplicating earned rewards', async () => {
  const db = await createDormDatabase(2);
  try {
    await db.exec(readFileSync('supabase/migrations/20261117030000_game_participation_streaks.sql', 'utf8'));
    await db.exec(`UPDATE socialu.reward_rules SET is_current=false WHERE category='daily_participation' AND is_current;
      INSERT INTO socialu.reward_rules(category,points_per_unit,eligibility_text) VALUES('daily_participation',5,'Previous daily rule');`);
    await db.query('SELECT public.socialu_game_participation($1,$2,$3)', [testUid(1), 'explorer', 'UTC']);
    const before = (await db.query('SELECT * FROM socialu.point_transactions WHERE student_id=1')).rows;
    expect(before).toHaveLength(1);
    expect(before[0]).toMatchObject({ points_change: 5 });
    const upgrade = readFileSync('supabase/migrations/20261117150000_daily_participation_reward_update.sql', 'utf8');
    await db.exec(upgrade);
    await db.exec(upgrade);
    expect((await db.query('SELECT * FROM socialu.point_transactions WHERE student_id=1')).rows).toEqual(before);
    for (const student of [1, 2, 2]) {
      await db.query('SELECT public.socialu_game_participation($1,$2,$3)', [testUid(student), 'dormspace', 'UTC']);
    }
    expect((await db.query('SELECT student_id,points_change FROM socialu.point_transactions ORDER BY student_id')).rows)
      .toEqual([{ student_id: 1, points_change: 5 }, { student_id: 2, points_change: 10 }]);
    expect((await db.query<{ status: unknown }>('SELECT public.socialu_game_participation($1) AS status', [testUid(1)])).rows[0].status)
      .toMatchObject({ rewardPoints: 10, earnedPointsToday: 5 });
    expect((await db.query("SELECT count(*)::int AS count FROM socialu.reward_rules WHERE category='daily_participation' AND is_current")).rows)
      .toEqual([{ count: 1 }]);
    await db.exec('SET ROLE authenticated');
    await expect(db.query('SELECT public.socialu_game_participation($1)', [testUid(1)])).rejects.toThrow(/permission denied/);
  } finally { await db.close(); }
}, 30000);
