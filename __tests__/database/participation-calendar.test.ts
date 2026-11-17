import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { createDormDatabase, testUid } from '../helpers/dormspace-db';

const migration = readFileSync('supabase/migrations/20261117080000_participation_calendar_reminders.sql', 'utf8');
async function fixture() {
  const db = await createDormDatabase(2);
  await db.exec(readFileSync('supabase/migrations/20261117030000_game_participation_streaks.sql', 'utf8'));
  // Test-only clock substitution; production RPC accepts no caller-supplied clock.
  const at = (instant: string) => db.exec(migration.replace('clock_timestamp()', `TIMESTAMPTZ '${instant}'`));
  const call = async (student = 1, date: string | null = null) => (await db.query<{ value: any }>(
    'SELECT public.socialu_participation_calendar($1,$2) AS value', [testUid(student), date],
  )).rows[0].value;
  async function play(student: number, date: string, zone = 'UTC') {
    await db.query('INSERT INTO socialu.participation_settings VALUES($1,$2) ON CONFLICT DO NOTHING', [student, zone]);
    await db.query('INSERT INTO socialu.streak_instances(student_id,started_on) SELECT $1,$2 WHERE NOT EXISTS(SELECT 1 FROM socialu.streak_instances WHERE student_id=$1 AND reset_on IS NULL)', [student, date]);
    await db.query(`WITH event AS (
      INSERT INTO socialu.participation_events(event_id,student_id,activity_code,occurred_at)
      VALUES(gen_random_uuid(),$1,'dormspace',($2::date + TIME '12:00') AT TIME ZONE $3) RETURNING event_id
    ) INSERT INTO socialu.participation_days(student_id,participation_date,state,streak_id,first_event_id)
      SELECT $1,$2,'played',(SELECT streak_id FROM socialu.streak_instances WHERE student_id=$1 AND reset_on IS NULL ORDER BY started_on LIMIT 1),event_id FROM event`, [student, date, zone]);
  }
  return { db, at, call, play };
}

it('612.4: Sunday-Saturday states settle three misses, then identify a reset and inactive dates', async () => {
  const { db, at, call, play } = await fixture();
  try {
    await play(1, '2025-01-05');
    await at('2025-01-09 12:00:00+00');
    const result = await call();
    expect(result).toMatchObject({ today: '2025-01-09', timeZone: 'UTC', count: 1, forgivenRemaining: 0, atRisk: true, qualifiedToday: false });
    expect(result.days.map((day: any) => day.state)).toEqual(['played', 'forgiven', 'forgiven', 'forgiven', 'today-unqualified', 'upcoming', 'upcoming']);
    expect(result.days.map((day: any) => day.date)).toEqual(['2025-01-05','2025-01-06','2025-01-07','2025-01-08','2025-01-09','2025-01-10','2025-01-11']);
    await at('2025-01-11 12:00:00+00');
    const after = await call();
    expect(after).toMatchObject({ count: 0, atRisk: false });
    expect(after.days.map((day: any) => day.state)).toEqual(['played', 'forgiven', 'forgiven', 'forgiven', 'reset', 'inactive', 'today-unqualified']);
    // Reading/settling does not create a qualifying day or grant another reward.
    expect((await db.query('SELECT count(*) AS n FROM socialu.participation_events')).rows[0].n).toBe(1);
    expect((await db.query('SELECT sum(points_change) AS n FROM socialu.point_transactions')).rows[0].n).toBe('10');
  } finally { await db.close(); }
}, 30000);

it('614: dismissal persists per account/day, is idempotent, and cannot dismiss a different day', async () => {
  const { db, at, call, play } = await fixture();
  try {
    await play(1, '2025-01-05'); await play(2, '2025-01-05'); await at('2025-01-09 12:00:00+00');
    expect((await call()).atRisk).toBe(true);
    expect(await call(1, '2025-01-09')).toMatchObject({ dismissedToday: true, atRisk: false, count: 1, qualifiedToday: false });
    await call(1, '2025-01-09');
    expect(await call()).toMatchObject({ dismissedToday: true, atRisk: false });
    expect(await call(2)).toMatchObject({ dismissedToday: false, atRisk: true });
    expect((await db.query('SELECT count(*) AS n FROM socialu.reminder_dismissals')).rows[0].n).toBe(1);
    await expect(call(1, '2025-01-10')).rejects.toThrow(/Participation day changed/);
    await play(1, '2025-01-09');
    await at('2025-01-10 12:00:00+00');
    expect(await call()).toMatchObject({ dismissedToday: false, atRisk: true, count: 2 });
    await expect(call(1, '2025-01-09')).rejects.toThrow(/Participation day changed/);
  } finally { await db.close(); }
}, 30000);

it('uses the saved zone, a DST-aware deadline, and never establishes a zone on a read', async () => {
  const { db, at, call, play } = await fixture();
  try {
    await at('2025-03-09 05:00:00+00');
    expect(await call()).toMatchObject({ timeZone: null, count: 0, atRisk: false });
    expect((await db.query('SELECT count(*) AS n FROM socialu.participation_settings')).rows[0].n).toBe(0);
    await play(1, '2025-03-08', 'America/New_York');
    const result = await call();
    expect(result.today).toBe('2025-03-09');
    expect(Date.parse(result.deadline) - Date.parse(result.serverTime)).toBe(23 * 3600000);
    await at('2025-03-10 03:59:59+00');
    expect((await call()).today).toBe('2025-03-09');
    await at('2025-03-10 04:00:00+00');
    expect((await call()).today).toBe('2025-03-10');
  } finally { await db.close(); }
}, 30000);

it('suppresses reminders after qualification or allowance renewal and restricts execution', async () => {
  const { db, at, call, play } = await fixture();
  try {
    await play(1, '2025-01-05'); await at('2025-01-09 12:00:00+00'); await call();
    await play(1, '2025-01-09');
    expect(await call()).toMatchObject({ atRisk: false, qualifiedToday: true, forgivenRemaining: 0 });
    await at('2025-01-12 12:00:00+00');
    expect(await call()).toMatchObject({ atRisk: false, forgivenRemaining: 3 });
    await expect(call(999)).rejects.toThrow();
    for (const role of ['anon','authenticated']) {
      await db.exec(`SET ROLE ${role}`); await expect(call()).rejects.toThrow(/permission denied/); await db.exec('RESET ROLE');
    }
    await db.exec('SET ROLE service_role'); expect((await call()).days).toHaveLength(7);
  } finally { await db.close(); }
}, 30000);
