/**
 * RLS attack tests for socialu.events (issue #1382), following the course's five-attack pattern
 * (brockenbrough/security-starter-rls-v1, __tests__/security/rls-suite.ts), adapted to events.
 *
 * The tests run on a real Postgres engine (PGlite) built from the real schema and event migrations, and they
 * attack the table the way a browser would: as the `anon` role (not signed in) or as the `authenticated`
 * role with a signed-in user's id (`auth.uid()`). No production data is touched.
 *
 * They assume the worst case: the table is exposed to browsers the way a table in Supabase's `public`
 * schema is (the Data API roles can select, insert, update and delete). So they prove that RLS alone keeps
 * each student to the rows they are allowed, whatever else is exposed.
 *
 * Each test asserts what SHOULD happen. Without RLS, the attack tests FAIL and say what leaked. Once
 * supabase/migrations/*_events_rls.sql is in place, they all PASS.
 *
 * Run with:  npm run test:security
 */
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const root = process.cwd();
const migrations = root + '/supabase/migrations/';
const EVENT_MIGRATIONS = [
  '20261008000100_link_supabase_accounts.sql', '20261013150000_create_event.sql', '20261015120000_list_events.sql',
  '20261027125000_event_dress_code.sql', '20261027130000_event_engagement.sql', '20261027140000_event_invitations.sql',
  '20261113120000_event_cancellation.sql', '20261113130000_event_rsvp.sql', '20261113140000_event_update.sql',
  '20261113160000_event_input_limits.sql', '20261117170000_cancelled_events.sql', '20261117180000_open_event_invitations.sql',
];
// The fix. Before it exists, the table has no RLS and the attacks below succeed.
const RLS_FIX = existsSync(migrations) ? readdirSync(migrations).find((file) => file.endsWith('_events_rls.sql')) : undefined;

const uid = (n: number) => `00000000-0000-0000-0000-00000000000${n}`;
const ALICE = uid(1); // the victim, who hosts events
const BOB = uid(2); // the attacker, a verified student at the same university
const CAROL = uid(3); // signed in, but has not verified her university email

const db = new PGlite();
const ids: Record<string, string> = {};

type Caller = 'anon' | string;
/** Runs `sql` the way the Data API would for this caller: as `anon`, or as `authenticated` with their auth.uid(). */
async function as<T = any>(caller: Caller, sql: string, params: unknown[] = []) {
  return db.transaction(async (tx) => {
    await tx.exec(caller === 'anon' ? 'SET LOCAL ROLE anon' : 'SET LOCAL ROLE authenticated');
    await tx.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [caller === 'anon' ? '' : caller]);
    return (await tx.query<T>(sql, params)).rows;
  });
}
/** Tries an attack; a refusal from the database counts as "blocked", so the test then checks the real data. */
const attempt = (caller: Caller, sql: string, params: unknown[] = []) => as(caller, sql, params).catch(() => []);
/** What is really in the table (the test runs as the database owner here, which RLS does not apply to). */
const event = async (id: string) => (await db.query<any>('SELECT * FROM socialu.events WHERE event_id = $1', [id])).rows[0];
const future = (days: number) => new Date(Date.now() + days * 86400000).toISOString();

beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);
    -- Supabase's auth.uid(): the signed-in user's id from their login token, or null for a visitor.
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;`);
  await db.exec(readFileSync(root + '/supabase/schema.sql', 'utf8'));
  for (const file of EVENT_MIGRATIONS) await db.exec(readFileSync(migrations + file, 'utf8'));

  for (const [n, verified] of [[1, true], [2, true], [3, false]] as const) {
    const email = `student${n}@salemstate.edu`;
    await db.query('INSERT INTO auth.users VALUES ($1, $2, now())', [uid(n), email]);
    await db.query(
      'INSERT INTO socialu.students (full_name, username, university_email, auth_user_id, email_verified_at) VALUES ($1, $2, $3, $4, $5)',
      [`Student ${n}`, `student${n}`, email, uid(n), verified ? new Date() : null],
    );
  }
  const create = async (host: string, title: string) =>
    (await db.query<any>("SELECT public.socialu_create_event($1, $2, 'Details.', 'Quad', $3) AS r", [host, title, future(3)])).rows[0].r.event_id;
  ids.bonfire = await create(ALICE, "Alice's Bonfire");
  ids.picnic = await create(ALICE, "Alice's Picnic"); // left alone by the attacks, for the checks of what still works
  ids.private = await create(ALICE, "Alice's Study Night");
  await db.query("SELECT public.socialu_event_cancel($1, $2, 'Moved online, details by message.')", [ALICE, ids.private]);
  ids.gameNight = await create(BOB, "Bob's Game Night");

  // The worst case: the table is reachable from the browser like a public-schema table.
  await db.exec(`GRANT USAGE ON SCHEMA socialu TO anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON socialu.events TO anon, authenticated;
    GRANT USAGE ON SEQUENCE socialu.events_event_id_seq TO anon, authenticated;`);

  if (RLS_FIX) await db.exec(readFileSync(migrations + RLS_FIX, 'utf8'));
}, 60_000);

describe('RLS on "socialu.events": students must not be able to touch events they are not allowed to', () => {
  it('an anonymous visitor (not logged in) cannot list events', async () => {
    const rows = await attempt('anon', 'SELECT event_id, title FROM socialu.events');
    expect(rows, `LEAK: someone who isn't logged in read ${rows.length} event(s): ${JSON.stringify(rows)}`).toHaveLength(0);
  });

  it("Bob cannot read Alice's cancelled event he was not invited to", async () => {
    const rows = await attempt(BOB, 'SELECT title, cancellation_note FROM socialu.events WHERE event_id = $1', [ids.private]);
    expect(rows, `LEAK: Bob read Alice's private cancelled event: ${JSON.stringify(rows[0])}`).toHaveLength(0);
  });

  it("Bob cannot change the title of Alice's event", async () => {
    await attempt(BOB, "UPDATE socialu.events SET title = 'HACKED BY BOB' WHERE event_id = $1", [ids.bonfire]);
    expect((await event(ids.bonfire)).title, "TAMPERING: Bob overwrote the title of Alice's event.").toBe("Alice's Bonfire");
  });

  it('Bob cannot create an event on behalf of Alice', async () => {
    const alice = (await db.query<any>('SELECT student_id FROM socialu.students WHERE auth_user_id = $1', [ALICE])).rows[0].student_id;
    await attempt(BOB, "INSERT INTO socialu.events (creator_id, title, description, location, starts_at) VALUES ($1, 'Free pizza', 'Fake.', 'Quad', $2)", [alice, future(2)]);
    const fake = (await db.query("SELECT 1 FROM socialu.events WHERE title = 'Free pizza'")).rows;
    expect(fake, 'IMPERSONATION: Bob created an event with Alice as its creator.').toHaveLength(0);
  });

  it('Bob cannot hand his own event over to Alice', async () => {
    const before = (await event(ids.gameNight)).creator_id;
    await attempt(BOB, 'UPDATE socialu.events SET creator_id = (SELECT creator_id FROM socialu.events WHERE event_id = $1) WHERE event_id = $2', [ids.bonfire, ids.gameNight]);
    expect((await event(ids.gameNight)).creator_id, "IMPERSONATION: Bob made Alice the creator of his event.").toBe(before);
  });

  it('a student who has not verified their university email cannot read events', async () => {
    const rows = await attempt(CAROL, 'SELECT title FROM socialu.events');
    expect(rows, `LEAK: an unverified account read ${rows.length} event(s).`).toHaveLength(0);
  });

  it('a host cannot post an event that has already started', async () => {
    const alice = (await db.query<any>('SELECT student_id FROM socialu.students WHERE auth_user_id = $1', [ALICE])).rows[0].student_id;
    await attempt(ALICE, "INSERT INTO socialu.events (creator_id, title, description, location, starts_at) VALUES ($1, 'Yesterday', 'Late.', 'Quad', now() - interval '1 day')", [alice]);
    expect((await db.query("SELECT 1 FROM socialu.events WHERE title = 'Yesterday'")).rows, 'Alice posted an event in the past.').toHaveLength(0);
  });

  // Runs last because, while the table is vulnerable, it really deletes Alice's event.
  it("Bob cannot delete Alice's event", async () => {
    await attempt(BOB, 'DELETE FROM socialu.events WHERE event_id = $1', [ids.bonfire]);
    expect(await event(ids.bonfire), "DESTRUCTION: Bob deleted Alice's event.").toBeDefined();
  });
});

describe('RLS on "socialu.events": students can still do what the app allows', () => {
  it('a verified student sees active campus events, including other students\'', async () => {
    const titles = (await as<any>(BOB, 'SELECT title FROM socialu.events')).map((row) => row.title);
    expect(titles).toEqual(expect.arrayContaining(["Alice's Picnic", "Bob's Game Night"]));
  });

  it('a host still sees their own cancelled event', async () => {
    expect(await as(ALICE, 'SELECT title FROM socialu.events WHERE event_id = $1', [ids.private])).toEqual([{ title: "Alice's Study Night" }]);
  });

  it('a host can create and edit their own event', async () => {
    const alice = (await db.query<any>('SELECT student_id FROM socialu.students WHERE auth_user_id = $1', [ALICE])).rows[0].student_id;
    const [created] = await as<any>(ALICE, "INSERT INTO socialu.events (creator_id, title, description, location, starts_at) VALUES ($1, 'Pumpkin Carving', 'Bring a pumpkin.', 'Quad', $2) RETURNING event_id", [alice, future(5)]);
    expect(created.event_id).toBeDefined();
    await as(ALICE, "UPDATE socialu.events SET location = 'North Hall' WHERE event_id = $1", [ids.picnic]);
    expect((await event(ids.picnic)).location).toBe('North Hall');
  });
});
