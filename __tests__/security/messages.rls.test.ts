/**
 * RLS attack tests for socialu.messages (issue #1384), following the course's attack pattern
 * (brockenbrough/security-starter-rls-v1, __tests__/security/rls-suite.ts) and the shape of
 * __tests__/security/events.rls.test.ts (#1382), adapted to chat messages.
 *
 * The tests run on a real Postgres engine (PGlite) built from the real schema, and they attack the table the
 * way a browser would: as the `anon` role (not signed in) or as the `authenticated` role with a signed-in
 * user's id (`auth.uid()`). No production data is touched.
 *
 * They assume the worst case: the chat tables are reachable from the browser the way a table in Supabase's
 * `public` schema is. So they prove that RLS alone keeps each student to the messages they are allowed,
 * whatever else is exposed.
 *
 * Each test asserts what SHOULD happen. Without RLS, the attack tests FAIL and say what leaked. Once
 * supabase/migrations/*_messages_rls.sql is in place, they all PASS.
 *
 * Run with:  npm run test:security
 */
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const root = process.cwd();
const migrations = root + '/supabase/migrations/';
// socialu.schema.sql already carries the chat tables, the validate_message trigger and can_read_message;
// the account link adds students.auth_user_id and the launch university, which the students below need.
const CHAT_MIGRATIONS = ['20261008000100_link_supabase_accounts.sql'];
// The fix. Before it exists, the table has no RLS and the attacks below succeed.
const RLS_FIX = existsSync(migrations) ? readdirSync(migrations).find((file) => file.endsWith('_messages_rls.sql')) : undefined;

const uid = (n: number) => `00000000-0000-0000-0000-00000000000${n}`;
const ALICE = uid(1); // the victim, who sends the message under attack
const BOB = uid(2); // a member of the group: may read it, may not touch it
const CAROL = uid(3); // a verified student who is in no conversation at all
const DANA = uid(4); // in the group, but has not verified her university email
const ERIN = uid(5); // was in the group and left before the message was sent

const db = new PGlite();
const ids: Record<string, number> = {};
const students: Record<string, number> = {};

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
const message = async (id: number) =>
  (await db.query<any>('SELECT * FROM socialu.messages WHERE message_id = $1', [id])).rows[0];
const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);
    -- Supabase's auth.uid(): the signed-in user's id from their login token, or null for a visitor.
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;`);
  await db.exec(readFileSync(root + '/supabase/schema.sql', 'utf8'));
  for (const file of CHAT_MIGRATIONS) await db.exec(readFileSync(migrations + file, 'utf8'));

  for (const [n, verified] of [[1, true], [2, true], [3, true], [4, false], [5, true]] as const) {
    const email = `student${n}@salemstate.edu`;
    await db.query('INSERT INTO auth.users VALUES ($1, $2, now())', [uid(n), email]);
    const row = await db.query<any>(
      `INSERT INTO socialu.students (full_name, username, university_email, auth_user_id, email_verified_at)
       VALUES ($1, $2, $3, $4, $5) RETURNING student_id`,
      [`Student ${n}`, `student${n}`, email, uid(n), verified ? new Date() : null],
    );
    students[uid(n)] = Number(row.rows[0].student_id);
  }

  // A group conversation Alice owns. A group needs no friendship or accepted request to seed, but the
  // conversation and its owner membership must land in ONE transaction: check_group_structure is a deferred
  // constraint trigger, so a group that reaches commit without exactly one current owner is refused.
  ids.group = (await db.transaction(async (tx) => {
    const conversation = Number(
      (await tx.query<any>(
        "INSERT INTO socialu.conversations (kind, created_by) VALUES ('group', $1) RETURNING conversation_id",
        [students[ALICE]],
      )).rows[0].conversation_id,
    );
    // Alice, Bob and Dana are in it. Erin left two days ago. Carol was never in it.
    await tx.query(
      `INSERT INTO socialu.group_memberships (conversation_id, student_id, role, joined_at, left_at) VALUES
         ($1, $2, 'owner', $6, NULL), ($1, $3, 'member', $6, NULL),
         ($1, $4, 'member', $6, NULL), ($1, $5, 'member', $6, $7)`,
      [conversation, students[ALICE], students[BOB], students[DANA], students[ERIN], ago(7), ago(2)],
    );
    return conversation;
  })) as number;

  const send = async (sender: string, text: string, at: string) =>
    Number(
      (await db.query<any>(
        `INSERT INTO socialu.messages (conversation_id, sender_id, kind, text_content, status, created_at, sent_at)
         VALUES ($1, $2, 'text', $3, 'sent', $4, $4) RETURNING message_id`,
        [ids.group, students[sender], text, at],
      )).rows[0].message_id,
    );
  ids.old = await send(ALICE, 'Posted while Erin was still here.', ago(5));
  ids.secret = await send(ALICE, 'Private to this group.', ago(0));
  ids.bobs = await send(BOB, 'Bob says hello.', ago(0)); // left alone by the attacks, for the checks of what still works

  // The worst case: the chat tables are reachable from the browser like public-schema tables. The grants on
  // conversations and group_memberships are what the app's own validate_message trigger reads, so without
  // them an attacking INSERT would be refused for the wrong reason and prove nothing.
  await db.exec(`GRANT USAGE ON SCHEMA socialu TO anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON socialu.messages TO anon, authenticated;
    GRANT SELECT, UPDATE ON socialu.conversations TO anon, authenticated;
    GRANT SELECT ON socialu.group_memberships, socialu.students TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION socialu.is_current_participant(BIGINT, BIGINT) TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION socialu.can_send_private(BIGINT, BIGINT) TO anon, authenticated;`);

  if (RLS_FIX) await db.exec(readFileSync(migrations + RLS_FIX, 'utf8'));
}, 60_000);

describe('RLS on "socialu.messages": students must not be able to touch messages they are not allowed to', () => {
  it('an anonymous visitor (not logged in) cannot list messages', async () => {
    const rows = await attempt('anon', 'SELECT message_id, text_content FROM socialu.messages');
    expect(rows, `LEAK: someone who isn't logged in read ${rows.length} message(s): ${JSON.stringify(rows)}`).toHaveLength(0);
  });

  it('a student who is in no conversation cannot read a group message', async () => {
    const rows = await attempt(CAROL, 'SELECT text_content FROM socialu.messages WHERE message_id = $1', [ids.secret]);
    expect(rows, `LEAK: Carol read a group she is not in: ${JSON.stringify(rows[0])}`).toHaveLength(0);
  });

  it('a student who has not verified their university email cannot read the group', async () => {
    const rows = await attempt(DANA, 'SELECT text_content FROM socialu.messages');
    expect(rows, `LEAK: an unverified account read ${rows.length} message(s).`).toHaveLength(0);
  });

  it('a former member cannot read what was said after they left', async () => {
    const rows = await attempt(ERIN, 'SELECT text_content FROM socialu.messages WHERE message_id = $1', [ids.secret]);
    expect(rows, `LEAK: Erin read a message posted after she left the group: ${JSON.stringify(rows[0])}`).toHaveLength(0);
  });

  it("a group member cannot change another student's message", async () => {
    await attempt(BOB, "UPDATE socialu.messages SET text_content = 'HACKED BY BOB' WHERE message_id = $1", [ids.secret]);
    expect((await message(ids.secret)).text_content, "TAMPERING: Bob overwrote Alice's message.").toBe('Private to this group.');
  });

  it('a group member cannot send a message in another student\'s name', async () => {
    await attempt(BOB, `INSERT INTO socialu.messages (conversation_id, sender_id, kind, text_content, status, sent_at)
      VALUES ($1, $2, 'text', 'Alice did not write this.', 'sent', now())`, [ids.group, students[ALICE]]);
    const forged = (await db.query("SELECT 1 FROM socialu.messages WHERE text_content = 'Alice did not write this.'")).rows;
    expect(forged, 'IMPERSONATION: Bob posted a message signed with Alice as the sender.').toHaveLength(0);
  });

  // The next two already pass before the fix: the app's own validate_message trigger refuses a sender who is
  // not a current participant, whatever RLS says. They are kept as regression guards -- the insert policy
  // must not open a second way in -- not as evidence that RLS does the blocking. The impersonation test
  // above is the one that proves the insert policy: there the sender IS a current participant, so only
  // "sender_id = my own student id" stops it, and before the fix it goes through.
  it('a student outside the conversation cannot post into it', async () => {
    await attempt(CAROL, `INSERT INTO socialu.messages (conversation_id, sender_id, kind, text_content, status, sent_at)
      VALUES ($1, $2, 'text', 'Carol walked in.', 'sent', now())`, [ids.group, students[CAROL]]);
    const intruder = (await db.query("SELECT 1 FROM socialu.messages WHERE text_content = 'Carol walked in.'")).rows;
    expect(intruder, 'IMPERSONATION: Carol posted into a group she is not in.').toHaveLength(0);
  });

  it('a former member cannot post into the group they left', async () => {
    await attempt(ERIN, `INSERT INTO socialu.messages (conversation_id, sender_id, kind, text_content, status, sent_at)
      VALUES ($1, $2, 'text', 'Erin is back.', 'sent', now())`, [ids.group, students[ERIN]]);
    const posted = (await db.query("SELECT 1 FROM socialu.messages WHERE text_content = 'Erin is back.'")).rows;
    expect(posted, 'IMPERSONATION: a former member posted into the group after leaving.').toHaveLength(0);
  });

  // Runs last because, while the table is vulnerable, it really deletes Alice's message.
  it("a group member cannot delete another student's message", async () => {
    await attempt(BOB, 'DELETE FROM socialu.messages WHERE message_id = $1', [ids.secret]);
    expect(await message(ids.secret), "DESTRUCTION: Bob deleted Alice's message.").toBeDefined();
  });
});

describe('RLS on "socialu.messages": students can still do what the app allows', () => {
  // Reads the two messages the attacks above leave alone, so this still means something in the run where
  // the table is unprotected and the deletion attack really does remove Alice's message.
  it('a member reads the conversation they are in', async () => {
    const texts = (await as<any>(BOB, 'SELECT text_content FROM socialu.messages WHERE conversation_id = $1', [ids.group]))
      .map((row) => row.text_content);
    expect(texts).toEqual(expect.arrayContaining(['Posted while Erin was still here.', 'Bob says hello.']));
  });

  it('a former member keeps the history from their own membership period', async () => {
    expect(await as(ERIN, 'SELECT text_content FROM socialu.messages WHERE message_id = $1', [ids.old]))
      .toEqual([{ text_content: 'Posted while Erin was still here.' }]);
  });

  it('a member can still send a message as themselves', async () => {
    const [sent] = await as<any>(
      BOB,
      `INSERT INTO socialu.messages (conversation_id, sender_id, kind, text_content, status, sent_at)
       VALUES ($1, $2, 'text', 'Still working.', 'sent', now()) RETURNING message_id`,
      [ids.group, students[BOB]],
    );
    expect(sent.message_id).toBeDefined();
  });
});
