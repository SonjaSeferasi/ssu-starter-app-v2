import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { befriend, friendship, testUid } from '../helpers/dormspace-db';
import { createGroup, createSnipeDatabase, snipeCall, snipeUpload } from '../helpers/snipe-db';

const SHARING_MIGRATION = 'supabase/migrations/20261030040044_snipe_withdrawal_access.sql';
const RECORD_KEYS = ['action', 'id', 'published_at', 'role', 'sharing', 'status', 'submitted_at'];

// SRS-511.12, 514.1 to 514.7, 514.15, 524.4 against the real schema, triggers and bridges in memory (nothing hosted).
// The focused migration is applied on top of the shared Snipe database; the shared helper is unchanged.
// Students: 8 owns group G (members 1, 2, 3, 4, 7). Snipes:
//   A  G   photographer 1, tagged 2 (identity No, sharing Yes) and 3 (identity Yes, sharing Yes) -> Approved
//   C  G   photographer 3, tagged 4 -> Approved                E  G  photographer 8, tagged 4 -> Approved
//   P  G   photographer 1, tagged 7 (sharing Yes only) -> Pending, then Canceled when 7 leaves
//   D  DM  photographer 6, tagged 1 -> Approved                R  DM photographer 1, tagged 6 (sharing No) -> Rejected
//   Q  DM  photographer 1, tagged 6 (sharing Yes only) -> Pending, then Canceled when the 1-6 friendship ends
//   K1..K23 in group K: photographer 9, tagged 10 (pagination).  Student 5 is an outsider.
it('keeps original actors’ Snipe removal controls after leaving or unfriending, without any new photo or chat access', async () => {
  const db = await createSnipeDatabase(10);
  try {
    await db.exec(readFileSync(SHARING_MIGRATION, 'utf8'));
    const friendshipIds: Record<string, string> = {};
    for (const [a, b] of [[1, 2], [1, 3], [3, 4], [1, 7], [1, 6], [8, 4], [9, 10]]) friendshipIds[`${a}-${b}`] = await befriend(db, a, b);
    const G = await createGroup(db, 8, [1, 2, 3, 4, 7]);
    const K = await createGroup(db, 9, [10]);
    const DM = (await friendship(db, 1, 'message', 6)).conversation_id as string;
    const call = (student: number, action: string, conversation: string, snipeId: string | null = null, payload: object = {}) =>
      snipeCall(db, student, action, conversation, snipeId, payload);
    // Calls the new bridge exactly as the hosted server does: as service_role.
    const sharing = async (student: number, action: string | null, snipeId: string | null = null, before: string | null = null) => {
      await db.exec('SET ROLE service_role');
      try {
        return (await db.query<{ result: any }>('SELECT public.socialu_snipe_sharing($1,$2,$3,$4) AS result',
          [testUid(student), action, snipeId, before])).rows[0].result;
      } finally { await db.exec('RESET ROLE'); }
    };
    const fails = async (promise: Promise<unknown>, code: string) => {
      const error: any = await promise.then(() => null, (e) => e);
      expect(error?.code, `expected ${code}`).toBe(code);
      return error;
    };
    const submit = async (student: number, conversation: string, targets: number[]) => {
      const key = randomUUID();
      return (await call(student, 'create', conversation, null, { submission_key: key, targets: targets.map(String), ...snipeUpload(student, key) })).snipe.id as string;
    };
    const publish = async (photographer: number, conversation: string, tags: [number, boolean][]) => {
      const id = await submit(photographer, conversation, tags.map(([student]) => student));
      let status = '';
      for (const [student, identity] of tags) status = (await call(student, 'respond', conversation, id, { identity, sharing: true })).snipe.status;
      expect(status).toBe('approved');
      return id;
    };
    // Test-only clock travel (as in snipe.test.ts): shift a photographer's whole immutable identity, bypassing triggers.
    const age = async (where: string, value: string, hours: number) => {
      await db.exec('SET session_replication_role = replica');
      await db.query(`UPDATE socialu.snipe_requests SET submitted_at = submitted_at - $2 * INTERVAL '1 hour',
        expires_at = expires_at - $2 * INTERVAL '1 hour', published_at = published_at - $2 * INTERVAL '1 hour' WHERE ${where} = $1`, [value, hours]);
      await db.exec('SET session_replication_role = origin');
    };
    const ids = async (student: number) => ((await sharing(student, 'list')).records as any[]).map((r) => r.id);
    const record = async (student: number, id: string) => ((await sharing(student, 'list')).records as any[]).find((r) => r.id === id);
    const stored = async (id: string) => (await db.query<any>('SELECT status, terminal_reason FROM socialu.snipe_requests WHERE snipe_id = $1', [id])).rows[0];
    const withdrawn = async (id: string, student: number) =>
      (await db.query<any>('SELECT sharing_withdrawn AS w FROM socialu.snipe_tags WHERE snipe_id = $1 AND student_id = $2', [id, student])).rows[0].w;
    const ledger = async () => (await db.query<any>('SELECT to_jsonb(p) AS row FROM socialu.point_transactions p ORDER BY transaction_id')).rows.map((r) => r.row);
    const desc = (list: string[]) => [...list].sort((a, b) => Number(b) - Number(a));

    // Server-only bridge; private helpers callable by no API role; browser roles reach neither the bridge nor the tables.
    for (const role of ['anon', 'authenticated', 'service_role']) {
      expect((await db.query<any>("SELECT has_function_privilege($1,'public.socialu_snipe_sharing(uuid,text,bigint,bigint)','EXECUTE') AS ok", [role])).rows[0].ok, role)
        .toBe(role === 'service_role');
      for (const helper of ['socialu.snipe_sharing_role(bigint,bigint)', 'socialu.snipe_sharing_record(bigint,bigint)'])
        expect((await db.query<any>("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok", [role, helper])).rows[0].ok, `${role} ${helper}`).toBe(false);
    }
    expect((await db.query<any>("SELECT prosecdef, proconfig FROM pg_proc WHERE oid = 'public.socialu_snipe_sharing(uuid,text,bigint,bigint)'::regprocedure")).rows[0])
      .toEqual({ prosecdef: true, proconfig: ['search_path=""'] });
    // No PUBLIC entry (`=X/owner`) remains on the bridge or the helpers.
    for (const fn of ['public.socialu_snipe_sharing(uuid,text,bigint,bigint)', 'socialu.snipe_sharing_role(bigint,bigint)', 'socialu.snipe_sharing_record(bigint,bigint)'])
      expect((await db.query<any>('SELECT proacl::text AS acl FROM pg_proc WHERE oid = $1::regprocedure', [fn])).rows[0].acl, fn).not.toMatch(/[{,]=/);
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      try {
        await expect(db.query("SELECT public.socialu_snipe_sharing($1,'list')", [testUid(1)])).rejects.toThrow();
        await expect(db.query('SELECT * FROM socialu.snipe_requests')).rejects.toThrow();
        await expect(db.query('SELECT * FROM socialu.snipe_tags')).rejects.toThrow();
      } finally { await db.exec('RESET ROLE'); }
    }
    // Lock order in the action path: photographer row, then request row, then the scope recheck under both locks.
    // (Source order only. PGlite runs one connection, so this test does not prove behavior under concurrency.)
    const source = (await db.query<any>("SELECT pg_get_functiondef('public.socialu_snipe_sharing(uuid,text,bigint,bigint)'::regprocedure) AS d")).rows[0].d as string;
    const studentLock = source.indexOf('FROM socialu.students WHERE student_id = v_submitter FOR UPDATE');
    const requestLock = source.indexOf('FROM socialu.snipe_requests WHERE snipe_id = p_snipe_id FOR UPDATE');
    expect(studentLock).toBeGreaterThan(0);
    expect(requestLock).toBeGreaterThan(studentLock);
    expect(source.indexOf('v_role := socialu.snipe_sharing_role')).toBeGreaterThan(requestLock);

    // Publications, pending and unpublished requests.
    const A = await publish(1, G, [[2, false], [3, true]]);
    const C = await publish(3, G, [[4, true]]);
    const E = await publish(8, G, [[4, true]]);
    const D = await publish(6, DM, [[1, true]]);
    const P = await submit(1, G, [7]);
    await call(7, 'respond', G, P, { sharing: true });
    const R = await submit(1, DM, [6]);
    expect((await call(6, 'respond', DM, R, { identity: true, sharing: false })).snipe.status).toBe('rejected');
    await age('snipe_id', R, 25);
    const Q = await submit(1, DM, [6]);
    await call(6, 'respond', DM, Q, { sharing: true });
    const KS: string[] = [];
    for (let n = 0; n < 23; n++) {
      if (n) await age('submitter_id', '9', 25);
      KS.push(await publish(9, K, [[10, true]]));
    }
    // SRS-524.4: the exact ledger after publication; nothing below may add, change or remove a row.
    const credited = await ledger();
    expect(credited.map((r: any) => [r.student_id, String(r.snipe_id), r.points_change]).filter(([student]: any) => student !== 9))
      .toEqual([[1, A, 25], [3, C, 25], [8, E, 25], [6, D, 25]]);
    expect(credited.filter((r: any) => r.student_id === 9)).toHaveLength(23);

    // Listing: published Snipes only, where the student is the photographer or a tagged friend with a sharing Yes
    // (identity No included). Pending, Rejected (as photographer or as the tagged No) and unrelated never appear.
    expect(await ids(1)).toEqual(desc([A, D]));
    expect(await ids(2)).toEqual([A]);
    expect(await ids(3)).toEqual(desc([A, C]));
    expect(await ids(4)).toEqual(desc([C, E]));
    expect(await ids(7)).toEqual([]);
    expect(await ids(6)).toEqual([D]);
    expect(await ids(5)).toEqual([]);
    expect(await record(2, A)).toEqual({ id: A, status: 'approved', role: 'tagged', sharing: 'approved', action: 'withdraw',
      submitted_at: expect.any(String), published_at: expect.any(String) });
    expect(await record(1, A)).toEqual({ id: A, status: 'approved', role: 'photographer', sharing: null, action: 'remove',
      submitted_at: expect.any(String), published_at: expect.any(String) });

    // Departures and the friendship end. Group departure / unfriending cancel only the pending P and Q.
    await db.query('UPDATE socialu.group_memberships SET left_at = now() WHERE conversation_id = $1 AND student_id IN (2, 3, 7)', [G]);
    await friendship(db, 1, 'remove', 6, friendshipIds['1-6']);
    await friendship(db, 8, 'remove', 4, friendshipIds['8-4']);
    expect(await stored(P)).toEqual({ status: 'canceled', terminal_reason: 'Required participant left the conversation' });
    expect(await stored(Q)).toEqual({ status: 'canceled', terminal_reason: 'Required friendship ended' });
    for (const id of [A, C, D, E]) expect((await stored(id)).status).toBe('approved');

    // No new photo, Snipe list or chat access for former members: every existing path still refuses them.
    for (const student of [2, 3]) {
      await fails(call(student, 'list', G), 'SC404');
      await fails(call(student, 'photo', G, A), 'SC404');
      await db.exec('SET ROLE service_role');
      try { await fails(db.query('SELECT public.socialu_conversation_messages($1,$2)', [testUid(student), G]), 'SC404'); }
      finally { await db.exec('RESET ROLE'); }
    }

    // Outsiders and an unrelated current member cannot list or act; their refusals match a missing Snipe exactly.
    const missing = await fails(sharing(2, 'withdraw', '999999999'), 'SN404');
    for (const [student, id, action] of [[4, A, 'remove'], [4, A, 'withdraw'], [5, A, 'withdraw'], [5, C, 'remove'], [2, C, 'withdraw'], [10, A, 'withdraw']] as const) {
      const error = await fails(sharing(student, action, id), 'SN404');
      expect(error.message).toBe(missing.message);
    }
    // Pending, canceled and rejected requests are never in scope, so nothing is resurrected.
    for (const [student, id, action] of [[7, P, 'withdraw'], [1, P, 'remove'], [1, Q, 'withdraw'], [6, Q, 'remove'], [6, R, 'withdraw'], [1, R, 'remove']] as const) {
      expect((await fails(sharing(student, action, id), 'SN404')).message).toBe(missing.message);
    }
    await fails(sharing(1, 'withdraw', null), 'SN404');
    expect([await stored(P), await stored(Q), (await stored(R)).status])
      .toEqual([{ status: 'canceled', terminal_reason: 'Required participant left the conversation' }, { status: 'canceled', terminal_reason: 'Required friendship ended' }, 'rejected']);
    // Invalid requests: unsupported or NULL action, invalid cursor, and an action that does not match the actor's
    // role. A NULL action from a server caller must not fall through to the photographer's removal.
    await fails(sharing(1, 'photo', A), 'SN400');
    await fails(sharing(1, null, A), 'SN400');
    await fails(sharing(2, null, A), 'SN400');
    await fails(sharing(1, 'list', null, '0'), 'SN400');
    await fails(sharing(1, 'withdraw', A), 'SN400');
    expect(await stored(A)).toEqual({ status: 'approved', terminal_reason: null });
    expect([await withdrawn(A, 2), await withdrawn(A, 3)]).toEqual([false, false]);

    // SRS-511.12, 514.1: tagged friend 2 (identity No, sharing Yes) left the group and still withdraws. The existing
    // consent trigger removes the published Snipe for everyone; 2 still gets no photo or chat access.
    const withdrawal = await sharing(2, 'withdraw', A);
    expect(withdrawal).toEqual({ changed: true, snipe: { id: A, status: 'removed', role: 'tagged', sharing: 'withdrawn', action: null,
      submitted_at: expect.any(String), published_at: expect.any(String) } });
    expect(await stored(A)).toEqual({ status: 'removed', terminal_reason: 'Sharing permission withdrawn' });
    expect(await withdrawn(A, 2)).toBe(true);
    expect((await call(4, 'list', G)).snipes.find((s: any) => s.id === A)).toMatchObject({ status: 'removed', photo_available: false });
    for (const student of [1, 4, 8]) await fails(call(student, 'photo', G, A), 'SN404');
    await fails(call(2, 'photo', G, A), 'SC404');
    // SRS-514.15: repeats change nothing. Another original actor gets the stored state, without a tag update.
    expect(await sharing(2, 'withdraw', A)).toEqual({ ...withdrawal, changed: false });
    expect(await sharing(2, 'remove', A)).toEqual({ ...withdrawal, changed: false });
    expect(await sharing(3, 'withdraw', A)).toMatchObject({ changed: false, snipe: { status: 'removed', sharing: 'approved', action: null } });
    expect(await withdrawn(A, 3)).toBe(false);
    expect(await sharing(1, 'remove', A)).toMatchObject({ changed: false, snipe: { status: 'removed', role: 'photographer', action: null } });
    expect(await stored(A)).toEqual({ status: 'removed', terminal_reason: 'Sharing permission withdrawn' });

    // SRS-514.1: photographer 3 left the group (owner 8 stays) and still removes C. Repeated deliveries, each in
    // its own transaction as the server sends them, remove it exactly once. PGlite runs them one after another.
    expect(await record(3, C)).toMatchObject({ role: 'photographer', status: 'approved', action: 'remove' });
    const deliver = () => db.transaction(async (tx) => {
      await tx.exec('SET LOCAL ROLE service_role');
      return (await tx.query<{ result: any }>("SELECT public.socialu_snipe_sharing($1,'remove',$2) AS result", [testUid(3), C])).rows[0].result;
    });
    const deliveries = await Promise.all(Array.from({ length: 10 }, deliver));
    expect(deliveries.filter((d) => d.changed)).toHaveLength(1);
    for (const d of deliveries) expect(d.snipe).toMatchObject({ id: C, status: 'removed', role: 'photographer', action: null });
    expect(await stored(C)).toEqual({ status: 'removed', terminal_reason: 'Removed by the photographer' });
    expect(await withdrawn(C, 4)).toBe(false);
    expect(await record(4, C)).toMatchObject({ status: 'removed', sharing: 'approved', action: null });

    // Former DM friends: 1 (tagged in D) withdraws after the friendship ended; photographer 6 sees the stored result.
    expect(await sharing(1, 'withdraw', D)).toMatchObject({ changed: true, snipe: { status: 'removed', role: 'tagged', sharing: 'withdrawn', action: null } });
    expect(await sharing(6, 'remove', D)).toMatchObject({ changed: false, snipe: { status: 'removed', role: 'photographer', action: null } });
    await fails(call(6, 'photo', DM, D), 'SN404');

    // Current group members whose friendship ended: tagged 4 withdraws E; photographer 8's remove is then a no-op.
    expect(await sharing(4, 'remove', E)).toMatchObject({ changed: true, snipe: { status: 'removed', role: 'tagged', sharing: 'withdrawn' } });
    expect(await sharing(8, 'remove', E)).toMatchObject({ changed: false, snipe: { status: 'removed', action: null } });

    // Cursor pagination: 20 per page, stable descending Snipe ID, reaching every record once, for both roles.
    for (const student of [9, 10]) {
      const first = await sharing(student, 'list');
      expect(first.records).toHaveLength(20);
      expect(first.next_cursor).toBe(first.records[19].id);
      const second = await sharing(student, 'list', null, first.next_cursor);
      expect(second).toEqual({ records: expect.any(Array), next_cursor: null });
      const all = [...first.records, ...second.records].map((r: any) => r.id);
      expect(all).toEqual(desc(KS));
      expect(new Set(all).size).toBe(23);
      for (const r of [...first.records, ...second.records]) expect(r).toMatchObject(student === 9 ? { role: 'photographer', action: 'remove' } : { role: 'tagged', action: 'withdraw' });
    }
    expect(await sharing(9, 'list', null, KS[0])).toEqual({ records: [], next_cursor: null });

    // Metadata only: exact keys, and no storage reference, conversation, person, message or reward data anywhere.
    const responses = [await sharing(1, 'list'), await sharing(3, 'list'), await sharing(9, 'list'), withdrawal, ...deliveries];
    for (const page of responses.slice(0, 3)) {
      expect(Object.keys(page).sort()).toEqual(['next_cursor', 'records']);
      for (const r of page.records) expect(Object.keys(r).sort()).toEqual(RECORD_KEYS);
    }
    for (const response of responses.slice(3)) expect(Object.keys(response.snipe).sort()).toEqual(RECORD_KEYS);
    const text = JSON.stringify(responses);
    // Photo fields are checked as JSON keys: the legitimate role value 'photographer' contains the word "photo".
    for (const leak of ['"photo"', '"photo_available"', '"photo_url"', '"photo_path"', 'snipe/', 'storage', 'mime', 'conversation',
      'Dorm Student', 'dorm', '@', 'reason', 'points', 'reward', 'report', 'identity', 'tags', 'targets', testUid(1)])
      expect(text, leak).not.toContain(leak);
    expect(text).toContain('"role":"photographer"');

    // SRS-524.4: removal and withdrawal kept every reward exactly as credited.
    expect(await ledger()).toEqual(credited);

    // Defensive: even a Removed Snipe never counts a tag without a stored sharing Yes. (Test-only data change:
    // consent answers cannot normally change after a request closes, so triggers are bypassed here.)
    await db.exec('SET session_replication_role = replica');
    await db.query('UPDATE socialu.snipe_tags SET sharing_yes = false WHERE snipe_id = $1 AND student_id = 3', [A]);
    await db.exec('SET session_replication_role = origin');
    expect(await ids(3)).toEqual([C]);
    expect((await fails(sharing(3, 'withdraw', A), 'SN404')).message).toBe(missing.message);

    // Fresh account checks on every call.
    await db.query('UPDATE socialu.students SET is_active = false WHERE student_id = 2');
    await fails(sharing(2, 'list'), '42501');
    await fails(sharing(2, 'withdraw', A), '42501');
  } finally { await db.close(); }
}, 180000);
