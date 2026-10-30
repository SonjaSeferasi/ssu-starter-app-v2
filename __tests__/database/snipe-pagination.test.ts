import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { befriend, testUid } from '../helpers/dormspace-db';
import { createGroup, createSnipeDatabase, snipeCall, snipeUpload } from '../helpers/snipe-db';

const SHARING_MIGRATION = 'supabase/migrations/20261030040044_snipe_withdrawal_access.sql';
const PAGINATION_MIGRATION = 'supabase/migrations/20261030093802_snipe_request_pagination.sql';
const LIST_START = "  IF p_action = 'list' THEN";
const CORE_START = "  IF p_action IN ('prepare', 'create') THEN";
const PAGE_KEYS = ['kind', 'next_cursor', 'rewards', 'snipes', 'student_id', 'targets'];
const INVALID_PAGE = 'These Snipes could not be loaded. Refresh and try again.';
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, n) => from + n);

// SRS-512.1, 512.3, 512.11 (#647, #649, #657; cards #622, #777 to #780) against the real schema, triggers and
// bridges in memory (nothing hosted). Every migration up to administrator review comes from the shared helper
// (unchanged); the original-actor sharing migration and then the pagination migration are applied on top, in
// filename order. PGlite runs one connection, so nothing here proves behavior under concurrency.
// Students:
//   1 reviewer and owner of group G           2..52 the 51 photographers, each a friend of 1 and of 53
//   53 tagged in requests hidden from 1       54 outsider (not in G)       55 tagged by 2, later leaves G
//   56 photographer in group G2 = {56, 1}     57 member whose account is deactivated
//   58 plain member of G                      59..61 friends of 1 who submit after the first page was read
it('pages a reviewer’s visible Snipe requests so the oldest Pending one stays reachable, with no hidden leak', async () => {
  const db = await createSnipeDatabase(61);
  try {
    await db.exec(readFileSync(SHARING_MIGRATION, 'utf8'));
    const PHOTOGRAPHERS = range(2, 52);
    const LATE = [59, 60, 61];
    for (const p of [...PHOTOGRAPHERS, ...LATE, 56]) await befriend(db, p, 1);
    for (const p of PHOTOGRAPHERS) await befriend(db, p, 53);
    await befriend(db, 2, 55);
    const G = await createGroup(db, 1, [...PHOTOGRAPHERS, 53, 55, 57, 58, ...LATE]);
    const G2 = await createGroup(db, 56, [1]);

    const call = (student: number, conversation: string, payload: object = {}) => snipeCall(db, student, 'list', conversation, null, payload);
    const fails = async (promise: Promise<unknown>, code: string) => {
      const error: any = await promise.then(() => null, (e) => e);
      expect(error?.code, `expected ${code}`).toBe(code);
      return error;
    };
    const submit = async (student: number, conversation: string, targets: number[]) => {
      const key = randomUUID();
      return (await snipeCall(db, student, 'create', conversation, null, { submission_key: key, targets: targets.map(String), ...snipeUpload(student, key) })).snipe.id as string;
    };
    const ids = (page: any) => (page.snipes as any[]).map((s) => s.id as string);
    const metadata = ({ snipes: _snipes, next_cursor: _cursor, ...rest }: any) => rest;
    // Ground truth, read directly as the owner: every request this student can see, in the documented order.
    const visibleOrder = async (student: number, conversation: string) => (await db.query<{ id: string }>(
      `SELECT snipe_id::text AS id FROM socialu.snipe_requests WHERE conversation_id = $1 AND socialu.snipe_viewer_role(snipe_id, $2) IS NOT NULL
        ORDER BY submitted_at DESC, snipe_id DESC`, [conversation, student])).rows.map((r) => r.id);
    const walk = async (student: number, conversation: string) => {
      const pages: any[] = [];
      let before: string | null = null;
      do {
        const page: any = await call(student, conversation, before ? { before } : {});
        pages.push(page);
        before = page.next_cursor;
      } while (before && pages.length < 10);
      return pages;
    };

    // Requests hidden from 1 are interleaved before, between and after the 51 visible ones.
    const hidden: string[] = [];
    hidden.push(await submit(2, G, [55]));
    hidden.push(await submit(52, G, [53]));
    const V: string[] = [];
    for (let i = 0; i <= 50; i++) {
      V.push(await submit(2 + i, G, [1]));
      if (i % 5 === 0 && i > 0 && i < 50) hidden.push(await submit(2 + i, G, [53]));
    }
    hidden.push(await submit(3, G, [53]));
    const tieHidden = hidden[2];
    const X = await submit(56, G2, [1]);

    // Test-only timestamp fixture (session_replication_role bypasses the immutability trigger; the table's own
    // CHECK still holds): V[0], V[1], V[2] and one hidden request share one submitted_at, so the page boundary
    // falls inside a tie and only the Snipe ID can order them.
    await db.exec('SET session_replication_role = replica');
    await db.query(`UPDATE socialu.snipe_requests SET submitted_at = t.at, expires_at = t.at + INTERVAL '24 hours'
      FROM (SELECT submitted_at AS at FROM socialu.snipe_requests WHERE snipe_id = $1) t WHERE snipe_id IN ($1, $2, $3, $4)`, [V[0], V[1], V[2], tieHidden]);
    await db.exec('SET session_replication_role = origin');
    expect((await db.query<any>('SELECT count(DISTINCT submitted_at)::int AS n FROM socialu.snipe_requests WHERE snipe_id IN ($1, $2, $3, $4)',
      [V[0], V[1], V[2], tieHidden])).rows[0].n).toBe(1);

    // Responses from the previous function, and every function, relation, policy and schema grant, before the migration.
    const legacy = { reviewer: await call(1, G), other: await call(1, G2), member: await call(58, G), photographer: await call(2, G) };
    expect(ids(legacy.reviewer)).toEqual([...V].reverse().slice(0, 50));
    const snapshot = async () => {
      const fns = (await db.query<any>(`SELECT n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS name,
          pg_get_functiondef(p.oid) AS def, p.proacl::text AS acl, p.prosecdef, p.proconfig
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname IN ('public', 'socialu') AND p.prokind IN ('f', 'p') ORDER BY 1`)).rows;
      return {
        fns: Object.fromEntries(fns.map((f) => [f.name, f])),
        relations: (await db.query<any>(`SELECT n.nspname || '.' || c.relname AS name, c.relkind, c.relacl::text AS acl FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname IN ('public', 'socialu', 'storage') ORDER BY 1`)).rows,
        policies: (await db.query<any>('SELECT schemaname, tablename, policyname, permissive, roles::text AS roles, qual, with_check FROM pg_policies ORDER BY 1, 2, 3')).rows,
        schemas: (await db.query<any>("SELECT nspname, nspacl::text AS acl FROM pg_namespace WHERE nspname IN ('public', 'socialu', 'storage') ORDER BY 1")).rows,
      };
    };
    const before = await snapshot();
    await db.exec(readFileSync(PAGINATION_MIGRATION, 'utf8'));
    const after = await snapshot();

    // Only public.socialu_snipe changed: no function, table, index, policy or grant was added, removed or altered.
    // That includes snipe_view, the role/settle/target/reward helpers and the report, moderation and sharing bridges.
    expect(Object.keys(after.fns)).toEqual(Object.keys(before.fns));
    const bridge = Object.keys(before.fns).find((name) => name.startsWith('public.socialu_snipe('))!;
    expect(bridge).toBeDefined();
    for (const name of ['socialu.snipe_view(', 'public.socialu_snipe_report(', 'public.socialu_snipe_moderation(', 'public.socialu_snipe_sharing('])
      expect(Object.keys(before.fns).some((fn) => fn.startsWith(name)), name).toBe(true);
    for (const name of Object.keys(before.fns)) if (name !== bridge) expect(after.fns[name], name).toEqual(before.fns[name]);
    expect(after.relations).toEqual(before.relations);
    expect(after.policies).toEqual(before.policies);
    expect(after.schemas).toEqual(before.schemas);
    // Same signature, owner-run with an empty search_path, and the same service_role-only EXECUTE.
    const [old, now] = [before.fns[bridge], after.fns[bridge]];
    expect({ acl: now.acl, prosecdef: now.prosecdef, proconfig: now.proconfig }).toEqual({ acl: old.acl, prosecdef: true, proconfig: ['search_path=""'] });
    for (const role of ['anon', 'authenticated', 'service_role'])
      expect((await db.query<any>("SELECT has_function_privilege($1,'public.socialu_snipe(uuid,text,bigint,bigint,jsonb)','EXECUTE') AS ok", [role])).rows[0].ok, role)
        .toBe(role === 'service_role');
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      try { await expect(db.query("SELECT public.socialu_snipe($1,'list',$2,NULL,'{}'::jsonb)", [testUid(1), G])).rejects.toThrow(); }
      finally { await db.exec('RESET ROLE'); }
    }
    // Byte-for-byte: the header, the declarations it already had, the account and membership checks before the
    // list, and the entire non-list core (prepare, create, respond, withdraw, remove, photo).
    const parts = (def: string) => {
      const declare = def.indexOf('\nDECLARE\n'), begin = def.indexOf('\nBEGIN\n'), list = def.indexOf(LIST_START), core = def.indexOf(CORE_START);
      expect(declare).toBeGreaterThan(0);
      expect(begin).toBeGreaterThan(declare);
      expect(list).toBeGreaterThan(begin);
      expect(core).toBeGreaterThan(list);
      expect(def.indexOf(CORE_START, core + 1)).toBe(-1);
      return { header: def.slice(0, declare), declarations: def.slice(declare, begin), setup: def.slice(begin, list), list: def.slice(list, core), core: def.slice(core) };
    };
    const [was, is] = [parts(old.def), parts(now.def)];
    expect(is.header).toBe(was.header);
    expect(is.declarations.startsWith(was.declarations)).toBe(true);
    expect(is.setup).toBe(was.setup);
    expect(is.core).toBe(was.core);
    expect(is.list).not.toBe(was.list);
    // Settle still runs first in the list, after the account and membership checks.
    expect(is.list.indexOf('PERFORM socialu.snipe_settle(p_conversation_id);')).toBeGreaterThan(0);
    expect(is.list.indexOf('PERFORM socialu.snipe_settle(p_conversation_id);')).toBeLessThan(is.list.indexOf("p_payload ? 'before'"));
    expect(is.setup).toContain('public.socialu_require_student(p_auth_id)');
    expect(is.setup).toContain('socialu.is_current_participant(p_conversation_id, me)');

    // Without a cursor the response is the previous one plus `next_cursor`: same newest 50, metadata and views.
    const first = await call(1, G);
    expect(Object.keys(first).sort()).toEqual(PAGE_KEYS);
    expect(Object.keys(legacy.reviewer)).not.toContain('next_cursor');
    expect(metadata(first)).toEqual(metadata(legacy.reviewer));
    expect(first.snipes).toEqual(legacy.reviewer.snipes);
    for (const [student, conversation, response] of [[1, G2, legacy.other], [58, G, legacy.member], [2, G, legacy.photographer]] as const) {
      const page = await call(student, conversation);
      expect({ ...page, next_cursor: undefined }).toEqual({ ...response, next_cursor: undefined });
      expect(page.next_cursor).toBeNull();
    }

    // 51 independent photographers tagged 1: the newest 50 visible on the first page, and a cursor because a 51st
    // exists. Hidden requests were filtered before the limit: more than 50 rows fall in the first page's range.
    const order = await visibleOrder(1, G);
    expect(order).toEqual([...V].reverse());
    expect(ids(first)).toEqual(order.slice(0, 50));
    expect(first.next_cursor).toBe(V[1]);
    const inRange = (await db.query<any>(`SELECT count(*)::int AS n FROM socialu.snipe_requests r, socialu.snipe_requests a
      WHERE a.snipe_id = $2 AND r.conversation_id = $1 AND (r.submitted_at, r.snipe_id) >= (a.submitted_at, a.snipe_id)`, [G, V[1]])).rows[0].n;
    expect(inRange).toBeGreaterThan(50);
    for (const s of first.snipes) expect(s).toMatchObject({ status: 'pending', viewer_role: 'tagged', can_answer: true });
    // Every entry is exactly the existing snipe_view result for this student.
    for (const s of first.snipes)
      expect(s).toEqual((await db.query<any>('SELECT socialu.snipe_view($1, 1) AS v', [s.id])).rows[0].v);

    // The older page reaches the oldest Pending request: inside the tie, after V[1] and never V[1] or V[2] again.
    const second = await call(1, G, { before: first.next_cursor });
    expect(Object.keys(second).sort()).toEqual(PAGE_KEYS);
    expect(ids(second)).toEqual([V[0]]);
    expect(second.next_cursor).toBeNull();
    expect(metadata(second)).toEqual(metadata(first));
    expect(second.snipes[0]).toMatchObject({ id: V[0], status: 'pending', viewer_role: 'tagged', can_answer: true, photo_available: true,
      photographer: { id: '2' }, my_answers: { identity: null, sharing: null, withdrawn: false } });
    const pages = await walk(1, G);
    expect(pages.flatMap(ids)).toEqual(order);
    expect(new Set(pages.flatMap(ids)).size).toBe(51);

    // No hidden request, count or placeholder in any page; nothing from another conversation.
    const text = JSON.stringify(pages);
    for (const id of [...hidden, X]) expect(pages.flatMap(ids)).not.toContain(id);
    for (const leak of ['total', 'count', 'hidden', 'storage', 'snipe/', '"dorm53"', '"dorm55"']) expect(text, leak).not.toContain(leak);
    expect(await walk(1, G2)).toEqual([expect.objectContaining({ snipes: [expect.objectContaining({ id: X })], next_cursor: null })]);

    // Exactly 50 left after a cursor: no next cursor. A cursor at the oldest request: an empty last page.
    const fifty = await call(1, G, { before: V[50] });
    expect(ids(fifty)).toEqual(order.slice(1));
    expect(fifty.snipes).toHaveLength(50);
    expect(fifty.next_cursor).toBeNull();
    expect(await call(1, G, { before: V[0] })).toMatchObject({ snipes: [], next_cursor: null, student_id: '1', kind: 'group' });

    // The reviewer can still answer the oldest request reached by paging; publishing credits the photographer once.
    expect((await snipeCall(db, 1, 'photo', G, V[0])).storage_key).toMatch(/^snipe\//);
    expect((await snipeCall(db, 1, 'respond', G, V[0], { identity: true })).snipe).toMatchObject({ status: 'pending' });
    expect((await snipeCall(db, 1, 'respond', G, V[0], { sharing: true }))).toMatchObject({ result: 'saved', snipe: { id: V[0], status: 'approved' } });
    const ledger = (await db.query<any>("SELECT student_id::int AS student_id, snipe_id::text AS snipe, points_change::int AS points_change FROM socialu.point_transactions WHERE category = 'snipe'")).rows;
    expect(ledger).toEqual([{ student_id: 2, snipe: V[0], points_change: 25 }]);
    const photographerView = (await call(2, G)).snipes.find((s: any) => s.id === V[0]);
    expect(photographerView).toMatchObject({ status: 'approved', reward: { awarded: true, verified_friends: 1, points: 25 } });

    // New requests between page requests: an existing cursor still continues exactly after its stored row (no
    // duplicate, nothing older skipped); a fresh first page starts over with its own cursor.
    const L = [] as string[];
    for (const p of LATE) L.push(await submit(p, G, [1]));
    const stale = await call(1, G, { before: first.next_cursor });
    expect(ids(stale)).toEqual([V[0]]);
    expect(stale.snipes[0]).toMatchObject({ status: 'approved' });
    const fresh = await walk(1, G);
    expect(fresh).toHaveLength(2);
    expect(ids(fresh[0])).toEqual([...[...L].reverse(), ...[...V].reverse().slice(0, 47)]);
    expect(fresh[0].next_cursor).toBe(V[4]);
    expect(ids(fresh[1])).toEqual([V[3], V[2], V[1], V[0]]);
    expect(fresh.flatMap(ids)).toEqual(await visibleOrder(1, G));
    expect(new Set(fresh.flatMap(ids)).size).toBe(54);
    // Ordering uses the stored, immutable submission time (the approval did not move V[0]).
    expect(fresh[1].snipes[3].submitted_at).toBe(second.snipes[0].submitted_at);

    // Invalid cursors, all with one message: hidden from this student, missing, in another conversation, or not a
    // Snipe ID string (explicit JSON null included). The same request is valid where the anchor is visible.
    const anchorErrors: any[] = [];
    for (const id of [...hidden, '999999999999', X]) anchorErrors.push(await fails(call(1, G, { before: id }), 'SN400'));
    anchorErrors.push(await fails(call(1, G2, { before: V[0] }), 'SN400'));
    expect(await call(1, G2, { before: X })).toMatchObject({ snipes: [], next_cursor: null });
    // Member 58 sees the published V[0] (and may page from it) but not V[5], which is still Pending for 1.
    expect(await walk(58, G)).toEqual([expect.objectContaining({ snipes: [expect.objectContaining({ id: V[0], viewer_role: 'member' })], next_cursor: null })]);
    expect(await call(58, G, { before: V[0] })).toMatchObject({ snipes: [], next_cursor: null });
    anchorErrors.push(await fails(call(58, G, { before: V[5] }), 'SN400'));
    for (const value of [null, Number(V[1]), 0, true, false, [], [V[1]], {}, { id: V[1] }, '', '0', '01', ' 1', '1 ', '1e3', '-1', '+1', '1.0',
      'abc', '1234567890123456789', `${V[1]};`])
      anchorErrors.push(await fails(call(1, G, { before: value }), 'SN400'));
    for (const error of anchorErrors) expect(error.message).toBe(INVALID_PAGE);
    // An absent cursor (or only unrelated keys) is the first page.
    for (const payload of [{}, { before: undefined }, { unrelated: V[1] }]) expect(await call(1, G, payload)).toEqual(fresh[0]);

    // Authorization comes first: an outsider, a departed member and a deactivated account learn nothing about any
    // cursor, valid, hidden or malformed.
    expect(ids(await call(55, G))).toEqual([V[0], hidden[0]]);
    await db.query('UPDATE socialu.group_memberships SET left_at = now() WHERE conversation_id = $1 AND student_id = 55', [G]);
    expect((await db.query<any>('SELECT status FROM socialu.snipe_requests WHERE snipe_id = $1', [hidden[0]])).rows[0].status).toBe('canceled');
    await db.query('UPDATE socialu.students SET is_active = false WHERE student_id = 57');
    for (const payload of [{}, { before: V[1] }, { before: hidden[0] }, { before: null }, { before: 'bad' }]) {
      await fails(call(54, G, payload), 'SC404');
      await fails(call(55, G, payload), 'SC404');
      await fails(call(57, G, payload), '42501');
      await fails(call(1, '999999', payload), 'SC404');
    }
    expect(ids(await call(1, G, { before: V[1] }))).toEqual([V[0]]);
  } finally { await db.close(); }
}, 300000);
