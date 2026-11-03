import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { befriend, friendship, testUid } from '../helpers/dormspace-db';
import { SNIPE_REWARDS_MIGRATION, createGroup, createSnipeDatabase, snipeCall, snipeUpload } from '../helpers/snipe-db';

// UR-525 / SRS-525.1 to 525.6, 521.1, 524.4, 527.5, 527.7, NFR-49 against the real schema, triggers, shared
// ledger and bridge, in memory. Approved rate (B-01, DP, 29 October 2026): 25 points per verified friend.
function harness(db: PGlite, conversation: () => string) {
  const call = (student: number, action: string, snipeId: string | null = null, payload: object = {}) =>
    snipeCall(db, student, action, conversation(), snipeId, payload);
  const submit = async (targets: number[], key = randomUUID()) =>
    ({ key, id: (await call(1, 'create', null, { submission_key: key, targets: targets.map(String), ...snipeUpload(1, key) })).snipe.id as string });
  const ledger = async () => (await db.query<any>(`SELECT student_id::int AS student, snipe_id::text AS snipe, reward_rule_id::text AS rule,
    reward_units AS units, points_change::int AS points, action_key::text AS key FROM socialu.point_transactions ORDER BY transaction_id`)).rows;
  const rewards = async (student: number) => (await call(student, 'list')).rewards;
  const view = async (student: number, id: string) => ((await call(student, 'list')).snipes as any[]).find((s) => s.id === id);
  const currentRule = async () => (await db.query<{ id: string }>("SELECT rule_id::text AS id FROM socialu.reward_rules WHERE category = 'snipe' AND is_current")).rows[0]?.id;
  const fails = async (promise: Promise<unknown>, code: string) => {
    const error: any = await promise.then(() => null, (e) => e);
    expect(error?.code, `expected ${code}`).toBe(code);
    return error;
  };
  // Test-only clock travel for terminal requests, bypassing their triggers (as in snipe.test.ts).
  const age = async (hours: number, id: string | null = null) => {
    await db.exec('SET session_replication_role = replica');
    await db.query(`UPDATE socialu.snipe_requests SET submitted_at = submitted_at - $1 * INTERVAL '1 hour',
      expires_at = expires_at - $1 * INTERVAL '1 hour', published_at = published_at - $1 * INTERVAL '1 hour'
      WHERE $2::bigint IS NULL OR snipe_id = $2::bigint`, [hours, id]);
    await db.exec('SET session_replication_role = origin');
  };
  return { call, submit, ledger, rewards, view, currentRule, fails, age };
}

it('credits only the photographer 25 points per verified friend, once, with publication, and keeps it after removal', async () => {
  const db = await createSnipeDatabase(5);
  try {
    const ended: Record<string, string> = {};
    for (const [a, b] of [[1, 2], [1, 3], [1, 4]]) ended[`${a}-${b}`] = await befriend(db, a, b);
    const G = await createGroup(db, 1, [2, 3, 4, 5]);
    const { call, submit, ledger, rewards, view, currentRule, fails, age } = harness(db, () => G);

    // B-01: exactly one configured rule, Snipe at 25 per verified friend; every other category stays open.
    expect((await db.query<any>('SELECT category, points_per_unit::int AS points, is_current AS current FROM socialu.reward_rules')).rows)
      .toEqual([{ category: 'snipe', points: 25, current: true }]);
    const rule = await currentRule();
    expect(await rewards(1)).toEqual({ points_per_friend: 25, balance: 0 });

    // Private helpers and the award trigger are callable by no API role; browser roles cannot reach the ledger.
    for (const role of ['anon', 'authenticated', 'service_role'])
      for (const fn of ['socialu.snipe_reward(bigint,bigint)', 'socialu.snipe_rewards_summary(bigint)', 'socialu.award_snipe_publication()', 'socialu.freeze_snipe_reward_rule()'])
        expect((await db.query<any>("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok", [role, fn])).rows[0].ok, `${role} ${fn}`).toBe(false);
    const award = (await db.query<any>("SELECT prosecdef, proconfig FROM pg_proc WHERE oid = 'socialu.award_snipe_publication()'::regprocedure")).rows[0];
    expect(award.prosecdef).toBe(true);
    expect(award.proconfig).toHaveLength(1);
    expect(award.proconfig[0]).toMatch(/^search_path=(""|)$/);
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      try {
        await expect(db.query('SELECT * FROM socialu.point_transactions')).rejects.toThrow();
        await expect(db.query('SELECT * FROM socialu.reward_rules')).rejects.toThrow();
      } finally { await db.exec('RESET ROLE'); }
    }

    // SRS-525.2/525.3: two verified friends -> 50, and nothing at all until publication.
    const one = await submit([2, 3]);
    await call(2, 'respond', one.id, { identity: true, sharing: true });
    await call(3, 'respond', one.id, { identity: true });
    expect(await ledger()).toEqual([]);
    expect(await rewards(1)).toEqual({ points_per_friend: 25, balance: 0 });
    // NFR-49: the same publishing answer delivered 100 times at once, each in its own transaction as the server
    // sends them. PGlite has one connection, so it runs them one after another; on hosted Postgres the
    // photographer row lock taken first by the bridge serializes them the same way, and snipe_reward_once
    // backs it up. Exactly one is saved, publishes and credits; the rest see a closed request.
    const deliver = () => db.transaction(async (tx) => {
      await tx.exec('SET LOCAL ROLE service_role');
      return (await tx.query<{ result: any }>('SELECT public.socialu_snipe($1,$2,$3,$4,$5::jsonb) AS result',
        [testUid(3), 'respond', G, one.id, JSON.stringify({ sharing: true })])).rows[0].result;
    });
    const deliveries = await Promise.all(Array.from({ length: 100 }, deliver));
    expect(deliveries.filter((d) => d.result === 'saved')).toHaveLength(1);
    expect(deliveries.filter((d) => d.result === 'closed')).toHaveLength(99);
    expect(deliveries.find((d) => d.result === 'saved').snipe).toMatchObject({ status: 'approved', reward: null });
    // SRS-525.1, 523.8: one immutable ledger entry for the photographer, valued from the rule, keyed by the Snipe.
    expect(await ledger()).toEqual([{ student: 1, snipe: one.id, rule, units: 2, points: 50, key: one.key }]);
    const firstReward = { awarded: true, verified_friends: 2, points_per_friend: 25, points: 50, recorded_at: expect.any(String), balance_after: 50 };
    expect((await view(1, one.id)).reward).toEqual(firstReward);
    expect(await rewards(1)).toEqual({ points_per_friend: 25, balance: 50 });
    // Tagged friends and other members get no points and never see the photographer's reward.
    for (const student of [2, 3, 4]) {
      expect((await rewards(student)).balance).toBe(0);
      expect((await view(student, one.id)).reward).toBeNull();
    }
    // The shared ledger views agree (SRS-520.1, 527.2): one history row and one balance for student 1.
    expect((await db.query<any>("SELECT resulting_balance::int AS after FROM socialu.points_history WHERE student_id = 1")).rows).toEqual([{ after: 50 }]);
    expect((await db.query<any>('SELECT student_id::int AS student, balance::int AS balance FROM socialu.points_balances WHERE balance <> 0')).rows)
      .toEqual([{ student: 1, balance: 50 }]);
    // A second credit for the same Snipe, or a second publication, is refused even when writing as the owner.
    await expect(db.query(`INSERT INTO socialu.point_transactions(student_id, category, points_change, action_key, reward_rule_id, reward_units, snipe_id)
      VALUES (1, 'snipe', 50, gen_random_uuid(), $1, 2, $2)`, [rule, one.id])).rejects.toThrow();
    await expect(db.query("UPDATE socialu.snipe_requests SET status = 'pending' WHERE snipe_id = $1", [one.id])).rejects.toThrow();
    expect(await ledger()).toHaveLength(1);

    // SRS-524.4, 527.7: removal keeps the points and the frozen history entry; the ledger is append-only.
    expect((await call(1, 'remove', one.id)).snipe).toMatchObject({ status: 'removed', photo_available: false, reward: firstReward });
    expect(await rewards(1)).toEqual({ points_per_friend: 25, balance: 50 });
    await expect(db.query('UPDATE socialu.point_transactions SET points_change = 0')).rejects.toThrow(/immutable/);
    await expect(db.query('DELETE FROM socialu.point_transactions')).rejects.toThrow(/immutable/);
    await age(25);

    // SRS-525.4: identity No with sharing Yes is excluded from the count, but that friend's sharing Yes is
    // still required before anything is published or credited.
    const two = await submit([2, 3]);
    await call(2, 'respond', two.id, { identity: true, sharing: true });
    expect((await call(3, 'respond', two.id, { identity: false })).snipe.status).toBe('pending');
    expect(await ledger()).toHaveLength(1);
    expect((await call(3, 'respond', two.id, { sharing: true })).snipe.verified_targets.map((p: any) => p.id)).toEqual(['2']);
    expect((await view(1, two.id)).reward).toMatchObject({ awarded: true, verified_friends: 1, points_per_friend: 25, points: 25, balance_after: 75 });
    await age(25);

    // SRS-525.3: no points for any unpublished outcome. The photographer sees no reward for them.
    const declined = await submit([2, 3]);
    await call(2, 'respond', declined.id, { identity: true, sharing: true });
    expect((await call(3, 'respond', declined.id, { identity: true, sharing: false })).snipe.status).toBe('rejected');
    const noVerified = await submit([4]);
    expect((await call(4, 'respond', noVerified.id, { identity: false, sharing: true })).snipe.status).toBe('closed');
    for (const id of [declined.id, noVerified.id]) expect((await view(1, id)).reward).toBeNull();
    await age(25);
    const expired = await submit([2]);
    await call(2, 'respond', expired.id, { identity: true });
    await age(25, expired.id);
    expect((await call(2, 'respond', expired.id, { sharing: true })).result).toBe('expired');
    const canceled = await submit([3]);
    await call(3, 'respond', canceled.id, { identity: true });
    await friendship(db, 1, 'remove', 3, ended['1-3']);
    expect(await view(1, canceled.id)).toMatchObject({ status: 'canceled', reward: null });
    const withdrawn = await submit([4]);
    await call(4, 'respond', withdrawn.id, { sharing: true });
    expect((await call(4, 'withdraw', withdrawn.id)).snipe.status).toBe('canceled');
    // Missing and hidden Snipes stay indistinguishable; rewards add no new way to probe them.
    await fails(call(5, 'remove', declined.id), 'SN404');

    // SRS-525.5: no photographer-wide cap, only pair cooldowns. Two credits in one day, nothing else.
    expect((await ledger()).map((t) => [t.snipe, t.points])).toEqual([[one.id, 50], [two.id, 25]]);
    expect(await rewards(1)).toEqual({ points_per_friend: 25, balance: 75 });
    // Tagged friends (3 is still a group member after the friendship ended) never received anything.
    for (const student of [2, 3, 4]) expect((await rewards(student)).balance).toBe(0);
    expect((await ledger()).every((t) => t.student === 1)).toBe(true);
  } finally { await db.close(); }
}, 120000);

it('rolls back a publishing answer whose reward cannot be recorded, then credits once; later rates never rewrite history', async () => {
  const db = await createSnipeDatabase(3);
  try {
    await befriend(db, 1, 2); await befriend(db, 1, 3);
    const G = await createGroup(db, 1, [2, 3]);
    const { call, submit, ledger, rewards, view, currentRule, fails } = harness(db, () => G);
    const approved = await currentRule();

    const first = await submit([2]);
    await call(2, 'respond', first.id, { identity: true });
    // Without a current Snipe rule, publication and its reward fail together: no phantom points, no half state.
    await db.query("UPDATE socialu.reward_rules SET is_current = false WHERE category = 'snipe'");
    expect(await rewards(1)).toEqual({ points_per_friend: null, balance: 0 });
    const error = await fails(call(2, 'respond', first.id, { sharing: true }), 'SN503');
    expect(error.message).toMatch(/answer was not saved/);
    expect(await view(2, first.id)).toMatchObject({ status: 'pending', can_answer: true, my_answers: { identity: true, sharing: null } });
    expect(await ledger()).toEqual([]);
    expect((await db.query<any>('SELECT balance::int AS b FROM socialu.points_balances WHERE student_id = 1')).rows).toEqual([{ b: 0 }]);

    // Rules are retired, never edited, deleted or reactivated (SRS-527.5).
    await expect(db.query('UPDATE socialu.reward_rules SET is_current = true WHERE rule_id = $1', [approved])).rejects.toThrow(/kept for history/);
    await expect(db.query('UPDATE socialu.reward_rules SET points_per_unit = 40 WHERE rule_id = $1', [approved])).rejects.toThrow(/kept for history/);
    await expect(db.query('DELETE FROM socialu.reward_rules WHERE rule_id = $1', [approved])).rejects.toThrow(/kept for history/);
    // B-01 reinstated as a new rule row; the same answer retried now publishes and credits exactly once.
    const reinstated = (await db.query<{ id: string }>(`INSERT INTO socialu.reward_rules(category, points_per_unit, eligibility_text)
      VALUES ('snipe', 25, 'B-01 reinstated') RETURNING rule_id::text AS id`)).rows[0].id;
    expect((await call(2, 'respond', first.id, { sharing: true })).snipe.status).toBe('approved');
    expect((await call(2, 'respond', first.id, { sharing: true })).result).toBe('closed');
    expect(await ledger()).toEqual([{ student: 1, snipe: first.id, rule: reinstated, units: 1, points: 25, key: first.key }]);

    // TEST-ONLY rate (not a product value) to prove history is frozen: later rewards use the new rule,
    // the earlier entry keeps its rule, count, rate and amount.
    await db.query('UPDATE socialu.reward_rules SET is_current = false WHERE rule_id = $1', [reinstated]);
    const testRule = (await db.query<{ id: string }>(`INSERT INTO socialu.reward_rules(category, points_per_unit, eligibility_text)
      VALUES ('snipe', 30, 'Test-only rate') RETURNING rule_id::text AS id`)).rows[0].id;
    const second = await submit([3]);
    expect((await call(3, 'respond', second.id, { identity: true, sharing: true })).snipe.status).toBe('approved');
    expect((await ledger()).map((t) => [t.snipe, t.rule, t.units, t.points])).toEqual([[first.id, reinstated, 1, 25], [second.id, testRule, 1, 30]]);
    expect((await view(1, first.id)).reward).toMatchObject({ verified_friends: 1, points_per_friend: 25, points: 25, balance_after: 25 });
    expect((await view(1, second.id)).reward).toMatchObject({ verified_friends: 1, points_per_friend: 30, points: 30, balance_after: 55 });
    expect(await rewards(1)).toEqual({ points_per_friend: 30, balance: 55 });
  } finally { await db.close(); }
}, 120000);

it('does not backfill Snipes approved before rewards existed, and shows them as not awarded', async () => {
  const db = await createSnipeDatabase(2, { rewards: false });
  try {
    await befriend(db, 1, 2);
    const G = await createGroup(db, 1, [2]);
    const { call, submit, ledger, rewards, view } = harness(db, () => G);
    const before = await submit([2]);
    expect((await call(2, 'respond', before.id, { identity: true, sharing: true })).snipe.status).toBe('approved');

    await db.exec(readFileSync(SNIPE_REWARDS_MIGRATION, 'utf8'));
    expect(await ledger()).toEqual([]);
    expect(await rewards(1)).toEqual({ points_per_friend: 25, balance: 0 });
    // Reading, refreshing and removing it never credits anything.
    expect((await view(1, before.id)).reward).toEqual({ awarded: false });
    expect((await call(1, 'remove', before.id)).snipe).toMatchObject({ status: 'removed', reward: { awarded: false } });
    expect(await ledger()).toEqual([]);
    expect(await rewards(1)).toEqual({ points_per_friend: 25, balance: 0 });
  } finally { await db.close(); }
}, 60000);

it('refuses to apply over a different current Snipe rate, leaving nothing half-applied', async () => {
  const db = await createSnipeDatabase(1, { rewards: false });
  try {
    await db.query("INSERT INTO socialu.reward_rules(category, points_per_unit, eligibility_text) VALUES ('snipe', 10, 'Unreviewed rate')");
    await expect(db.exec(readFileSync(SNIPE_REWARDS_MIGRATION, 'utf8'))).rejects.toThrow(/Appendix B-01/);
    await db.exec('ROLLBACK');
    expect((await db.query<any>("SELECT to_regprocedure('socialu.snipe_reward(bigint,bigint)') IS NULL AS missing")).rows[0].missing).toBe(true);
    expect((await db.query<any>("SELECT points_per_unit::int AS points FROM socialu.reward_rules WHERE category = 'snipe'")).rows).toEqual([{ points: 10 }]);
  } finally { await db.close(); }
}, 60000);
