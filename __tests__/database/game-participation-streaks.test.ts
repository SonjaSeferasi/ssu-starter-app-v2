import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { createDormDatabase, testUid } from '../helpers/dormspace-db';

it('tracks one shared reward and ranks each game by active consecutive days', async () => {
  const db = await createDormDatabase(3);
  try {
    await db.exec(readFileSync('supabase/migrations/20261117030000_game_participation_streaks.sql', 'utf8'));
    await db.exec(`
      INSERT INTO socialu.participation_settings (student_id, time_zone) VALUES (2, 'UTC'), (3, 'UTC');
      INSERT INTO socialu.participation_events (event_id, student_id, activity_code, occurred_at)
      VALUES
        (gen_random_uuid(), 2, 'explorer', (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date::timestamp AT TIME ZONE 'UTC'),
        (gen_random_uuid(), 2, 'explorer', ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 1)::timestamp AT TIME ZONE 'UTC'),
        (gen_random_uuid(), 3, 'explorer', ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - 2)::timestamp AT TIME ZONE 'UTC');
    `);
    const status = async () => (await db.query<{ result: unknown }>(
      'SELECT public.socialu_game_participation($1) AS result', [testUid(1)],
    )).rows[0].result;
    const record = (activity: string, zone = 'UTC') => db.query(
      'SELECT public.socialu_game_participation($1, $2, $3)', [testUid(1), activity, zone],
    );

    expect(await status()).toMatchObject({ count: 0, qualifiedToday: false, forgivenRemaining: 3, rewardPoints: 5 });
    await record('dormspace');
    await record('explorer', 'America/New_York');
    await record('explorer');
    await record('dormspace');
    expect(await status()).toEqual({
      count: 1, qualifiedToday: true, forgivenRemaining: 3, rewardPoints: 5,
      leaderboards: {
        dormspace: [{ username: 'dorm1', days: 1 }],
        explorer: [{ username: 'dorm2', days: 2 }, { username: 'dorm1', days: 1 }],
      },
    });
    expect((await db.query('SELECT time_zone FROM socialu.participation_settings WHERE student_id=1')).rows)
      .toEqual([{ time_zone: 'UTC' }]);
    expect((await db.query('SELECT points_change FROM socialu.point_transactions WHERE student_id=1')).rows)
      .toEqual([{ points_change: 5 }]);
    await expect(record('explorer', 'invalid/time-zone')).rejects.toThrow(/Invalid participation/);
    await db.exec('SET ROLE authenticated');
    await expect(status()).rejects.toThrow(/permission denied/);
  } finally { await db.close(); }
}, 30000);

it('preserves the shared count through three misses and resets on the fourth', async () => {
  const db = await createDormDatabase(1);
  try {
    await db.exec(readFileSync('supabase/migrations/20261117030000_game_participation_streaks.sql', 'utf8'));
    await db.exec(`
      INSERT INTO socialu.participation_settings (student_id, time_zone) VALUES (1, 'UTC');
      INSERT INTO socialu.streak_instances (student_id, started_on) VALUES (1, DATE '2025-01-05');
      WITH event AS (
        INSERT INTO socialu.participation_events (event_id, student_id, activity_code, occurred_at)
        VALUES (gen_random_uuid(), 1, 'dormspace', TIMESTAMPTZ '2025-01-05 12:00:00+00')
        RETURNING event_id
      )
      INSERT INTO socialu.participation_days (student_id, participation_date, state, streak_id, first_event_id)
      SELECT 1, DATE '2025-01-05', 'played', streak_id, event_id
      FROM socialu.streak_instances CROSS JOIN event WHERE student_id = 1;
      SELECT socialu.settle_participation_days(1, DATE '2025-01-09');
    `);
    expect((await db.query('SELECT reset_on FROM socialu.streak_instances')).rows).toEqual([{ reset_on: null }]);
    await db.exec("SELECT socialu.settle_participation_days(1, DATE '2025-01-10')");
    expect((await db.query('SELECT state FROM socialu.participation_days ORDER BY participation_date')).rows)
      .toEqual(['played', 'forgiven', 'forgiven', 'forgiven', 'reset'].map(state => ({ state })));
  } finally { await db.close(); }
}, 30000);
