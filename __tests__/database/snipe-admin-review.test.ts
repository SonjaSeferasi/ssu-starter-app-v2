import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { befriend, friendship, testUid } from '../helpers/dormspace-db';
import { createGroup, createSnipeDatabase, snipeCall, snipeModerationCall, snipeReportCall, snipeUpload } from '../helpers/snipe-db';

// SRS-514.1, 514.10, 514.12, 514.13, 514.15, 524.4 against the real schema, triggers, existing snipe_reports
// constraints and all three bridges, in memory. Nothing hosted. Group G: 1 owner (photographer of A), 2 and 3
// tagged friends, 4 an untagged member who reports, 5 the administrator (later revoked); 6 joins later as
// administrator; 7 an outsider; 8 a direct-message friend of 1. Group G2: 2 owner, 4 member.
it('lets only current group managers review reports, dismiss or remove, and remove published Snipes', async () => {
  const db = await createSnipeDatabase(8);
  try {
    for (const [a, b] of [[1, 2], [1, 3], [2, 3], [3, 4], [2, 4], [1, 8]]) await befriend(db, a, b);
    const G = await createGroup(db, 1, [2, 3, 4, 5]);
    const DM = (await friendship(db, 1, 'message', 8)).conversation_id as string;
    const setRole = (conversation: string, student: number, role: string) => db.query(
      'UPDATE socialu.group_memberships SET role = $3 WHERE conversation_id = $1 AND student_id = $2 AND left_at IS NULL', [conversation, student, role]);
    await setRole(G, 5, 'administrator');

    const call = (student: number, action: string, conversation: string, snipeId: string | null = null, payload: object = {}) =>
      snipeCall(db, student, action, conversation, snipeId, payload);
    const report = (student: number, conversation: string, snipeId: string, reason: string) =>
      snipeReportCall(db, student, conversation, snipeId, { reason });
    const moderate = (student: number, action: string, conversation: string, target: string | null = null, payload: object = {}) =>
      snipeModerationCall(db, student, action, conversation, target, payload);
    const fails = async (promise: Promise<unknown>, code: string) => {
      const error: any = await promise.then(() => null, (e) => e);
      expect(error?.code, `expected ${code}`).toBe(code);
      return error;
    };
    const submit = async (student: number, conversation: string, targets: number[]) => {
      const key = randomUUID();
      return (await call(student, 'create', conversation, null, { submission_key: key, targets: targets.map(String), ...snipeUpload(student, key) })).snipe.id as string;
    };
    const answer = (student: number, conversation: string, id: string, identity: boolean) => call(student, 'respond', conversation, id, { identity, sharing: true });
    const find = async (student: number, conversation: string, id: string) => ((await call(student, 'list', conversation)).snipes as any[]).find((s) => s.id === id);
    const queueIds = async (student: number, conversation: string) => ((await moderate(student, 'queue', conversation)).reports as any[]).map((r) => r.id);
    const reportRow = async (id: string) => (await db.query<any>('SELECT status, resolved_by::int AS resolved_by FROM socialu.snipe_reports WHERE report_id = $1', [id])).rows[0];
    const snipeRow = async (id: string) => (await db.query<any>('SELECT status, terminal_reason FROM socialu.snipe_requests WHERE snipe_id = $1', [id])).rows[0];
    const ledger = async () => (await db.query<any>('SELECT student_id::int AS student, snipe_id::text AS snipe, points_change::int AS points FROM socialu.point_transactions ORDER BY transaction_id')).rows;
    const removals = async (id: string) => Number((await db.query<any>("SELECT count(*) AS n FROM public.status_audit WHERE snipe_id = $1 AND new_status = 'removed'", [id])).rows[0].n);
    const photo = (student: number, conversation: string, id: string) => call(student, 'photo', conversation, id);

    // Test-only audit of every lifecycle transition, to prove a removal happens exactly once.
    await db.exec(`CREATE TABLE public.status_audit(snipe_id bigint, old_status text, new_status text);
      CREATE FUNCTION public.audit_snipe_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
        BEGIN INSERT INTO public.status_audit VALUES (NEW.snipe_id, OLD.status, NEW.status); RETURN NULL; END $$;
      CREATE TRIGGER audit_snipe_status AFTER UPDATE OF status ON socialu.snipe_requests FOR EACH ROW
        WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION public.audit_snipe_status();`);

    // Server-only bridge; the new private helpers are callable by no API role.
    for (const role of ['anon', 'authenticated', 'service_role']) {
      expect((await db.query<any>("SELECT has_function_privilege($1,'public.socialu_snipe_moderation(uuid,text,bigint,bigint,jsonb)','EXECUTE') AS ok", [role])).rows[0].ok, role)
        .toBe(role === 'service_role');
      for (const helper of ['socialu.snipe_group_manager(bigint,bigint)', 'socialu.snipe_report_item(bigint,bigint)',
        'socialu.snipe_manager_remove(bigint,bigint)', 'socialu.snipe_view(bigint,bigint)'])
        expect((await db.query<any>("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok", [role, helper])).rows[0].ok, `${role} ${helper}`).toBe(false);
    }
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      try { await expect(db.query("SELECT public.socialu_snipe_moderation($1,'queue',$2)", [testUid(1), G])).rejects.toThrow(); }
      finally { await db.exec('RESET ROLE'); }
    }

    // A: 1 tags 2 (identity Yes) and 3 (identity No, sharing Yes). C: 2 tags 3. E: 3 tags 2 (identity No) and 4.
    // P: 4 tags 3 and stays Pending. Each published Snipe credits its photographer 25 points once.
    const A = await submit(1, G, [2, 3]);
    await answer(2, G, A, true);
    expect((await answer(3, G, A, false)).snipe.status).toBe('approved');
    const C = await submit(2, G, [3]);
    expect((await answer(3, G, C, true)).snipe.status).toBe('approved');
    const E = await submit(3, G, [2, 4]);
    await answer(2, G, E, false);
    expect((await answer(4, G, E, true)).snipe.status).toBe('approved');
    const P = await submit(4, G, [3]);
    const credits = [{ student: 1, snipe: A, points: 25 }, { student: 2, snipe: C, points: 25 }, { student: 3, snipe: E, points: 25 }];
    expect(await ledger()).toEqual(credits);

    // SRS-514.10: an empty queue for both managers; everyone else is refused before any report data is read.
    expect(await moderate(1, 'queue', G)).toEqual({ reports: [] });
    expect(await moderate(5, 'queue', G)).toEqual({ reports: [] });
    for (const student of [2, 3, 4]) await fails(moderate(student, 'queue', G), 'SM403');
    await fails(moderate(7, 'queue', G), 'SC404');
    await fails(moderate(1, 'queue', '999999'), 'SC404');
    await fails(moderate(5, 'approve', G), 'SM400');
    await fails(moderate(4, 'approve', G), 'SM403');

    // Reports: 4 on A, 4 on C, then 2 (tagged) on A.
    const r4A = (await report(4, G, A, 'Posted without asking me.')).report.id as string;
    const r4C = (await report(4, G, C, 'Not appropriate')).report.id as string;
    const r2A = (await report(2, G, A, 'I changed my mind')).report.id as string;
    const queue = await moderate(1, 'queue', G);
    expect(queue.reports.map((r: any) => r.id)).toEqual([r4A, r4C, r2A]);
    expect(queue.reports[0]).toEqual({ id: r4A, reason: 'Posted without asking me.', status: 'unresolved', resolved_by: null,
      reporter: { id: '4', name: 'Dorm Student 4', username: 'dorm4' },
      snipe: { id: A, status: 'approved', published_at: expect.any(String), photographer: { id: '1', name: 'Dorm Student 1', username: 'dorm1' }, visible: true, photo_available: true } });
    expect(await queueIds(5, G)).toEqual([r4A, r4C, r2A]);

    // List isolation: another group's report never appears, and cannot be decided through this group.
    const G2 = await createGroup(db, 2, [4]);
    const Q = await submit(2, G2, [4]);
    expect((await answer(4, G2, Q, true)).snipe.status).toBe('approved');
    credits.push({ student: 2, snipe: Q, points: 25 });
    const rQ = (await report(4, G2, Q, 'Other group')).report.id as string;
    expect(await queueIds(1, G)).toEqual([r4A, r4C, r2A]);
    expect(await queueIds(2, G2)).toEqual([rQ]);
    await fails(moderate(1, 'resolve', G, rQ, { decision: 'removed' }), 'SR404');
    await fails(moderate(1, 'queue', G2), 'SC404');
    await fails(moderate(2, 'resolve', G, r4A, { decision: 'removed' }), 'SM403');
    expect(await reportRow(rQ)).toEqual({ status: 'unresolved', resolved_by: null });

    // Ordinary members and outsiders cannot decide; strict decision payloads; unknown reports reveal nothing.
    await fails(moderate(4, 'resolve', G, r4A, { decision: 'dismissed' }), 'SM403');
    await fails(moderate(3, 'resolve', G, r4A, { decision: 'removed' }), 'SM403');
    await fails(moderate(7, 'resolve', G, r4A, { decision: 'removed' }), 'SC404');
    for (const payload of [{}, { decision: 'Dismissed' }, { decision: 'removed ' }, { decision: true }, { decision: ['removed'] }, { decision: null }, { decision: 'approved' }])
      await fails(moderate(5, 'resolve', G, r4A, payload), 'SM400');
    await fails(moderate(5, 'resolve', G, '999999', { decision: 'dismissed' }), 'SR404');
    await fails(moderate(5, 'resolve', G, null, { decision: 'dismissed' }), 'SR404');
    expect(await reportRow(r4A)).toEqual({ status: 'unresolved', resolved_by: null });

    // SRS-514.12, 514.11: the administrator dismisses. The resolver comes from the account, never the payload;
    // the Snipe keeps its publication, photo, answers and points for everyone.
    const dismissed = await moderate(5, 'resolve', G, r4A, { decision: 'dismissed', resolved_by: '4', role: 'owner', status: 'removed' });
    expect(dismissed.result).toBe('saved');
    expect(dismissed.report).toMatchObject({ id: r4A, status: 'dismissed', resolved_by: { id: '5' }, snipe: { status: 'approved', photo_available: true } });
    expect(await reportRow(r4A)).toEqual({ status: 'dismissed', resolved_by: 5 });
    expect(await snipeRow(A)).toEqual({ status: 'approved', terminal_reason: null });
    for (const student of [1, 2, 3, 4, 5]) expect((await photo(student, G, A)).storage_key, `student ${student}`).toMatch(/^snipe\//);
    expect(await find(3, G, A)).toMatchObject({ status: 'approved', my_answers: { identity: false, sharing: true, withdrawn: false } });
    // The reporter's receipt shows the decision, and they may report a new issue.
    expect(await find(4, G, A)).toMatchObject({ my_report: { id: r4A, status: 'dismissed' }, can_report: true, photo_available: true });
    expect(await queueIds(1, G)).toEqual([r4C, r2A]);
    // Idempotent: the same decision again (by either manager) returns the stored one; a different one is refused.
    expect((await moderate(1, 'resolve', G, r4A, { decision: 'dismissed' })).result).toBe('existing');
    const changed = await moderate(1, 'resolve', G, r4A, { decision: 'removed' });
    expect([changed.result, changed.report.status]).toEqual(['conflict', 'dismissed']);
    expect(await reportRow(r4A)).toEqual({ status: 'dismissed', resolved_by: 5 });
    expect(await snipeRow(A)).toEqual({ status: 'approved', terminal_reason: null });

    // A fresh report after dismissal.
    const fresh = await report(4, G, A, 'Still unwanted');
    expect(fresh.result).toBe('created');
    const r4A2 = fresh.report.id as string;
    expect(await queueIds(5, G)).toEqual([r4C, r2A, r4A2]);

    // Role revoked mid-session: every call rechecks the role, including the view's admin removal flag.
    expect(await find(5, G, A)).toMatchObject({ viewer_role: 'member', can_admin_remove: true });
    await setRole(G, 5, 'member');
    await fails(moderate(5, 'queue', G), 'SM403');
    await fails(moderate(5, 'resolve', G, r4A2, { decision: 'removed' }), 'SM403');
    await fails(moderate(5, 'remove', G, C), 'SM403');
    expect(await find(5, G, A)).toMatchObject({ can_admin_remove: false, photo_available: true });
    await setRole(G, 5, 'administrator');
    expect(await queueIds(5, G)).toEqual([r4C, r2A, r4A2]);
    await setRole(G, 5, 'member');
    expect(await snipeRow(A)).toEqual({ status: 'approved', terminal_reason: null });

    // An administrator who joined after publication: report metadata and decisions, never the photo or the Snipe
    // itself, and no pending Snipe at all.
    await db.query("INSERT INTO socialu.group_memberships(conversation_id,student_id,role) VALUES($1,6,'administrator')", [G]);
    expect((await call(6, 'list', G)).snipes).toEqual([]);
    const late = await moderate(6, 'queue', G);
    expect(late.reports.map((r: any) => r.id)).toEqual([r4C, r2A, r4A2]);
    for (const item of late.reports) expect(item.snipe).toMatchObject({ visible: false, photo_available: false });
    await fails(photo(6, G, A), 'SN404');
    await fails(moderate(6, 'remove', G, A), 'SN404');
    await fails(moderate(6, 'remove', G, P), 'SN404');
    await fails(moderate(6, 'remove', G, '999999'), 'SN404');
    expect(JSON.stringify(late)).not.toContain('storage_key');

    // SRS-514.13: resolving as Removed applies the published removal: Removed once, photo withdrawn for everyone,
    // placeholder for members, points kept. The Snipe's other open report closes with the same decision.
    const removed = await moderate(6, 'resolve', G, r4A2, { decision: 'removed' });
    expect(removed).toMatchObject({ result: 'saved', snipe: null, report: { id: r4A2, status: 'removed', resolved_by: { id: '6' }, snipe: { status: 'removed', photo_available: false } } });
    expect(await snipeRow(A)).toEqual({ status: 'removed', terminal_reason: 'Removed by a group administrator' });
    expect([await reportRow(r4A), await reportRow(r2A), await reportRow(r4A2)]).toEqual([
      { status: 'dismissed', resolved_by: 5 }, { status: 'removed', resolved_by: 6 }, { status: 'removed', resolved_by: 6 }]);
    for (const student of [1, 2, 3, 4, 5]) await fails(photo(student, G, A), 'SN404');
    expect(await find(4, G, A)).toMatchObject({ status: 'removed', photo_available: false, can_report: false, my_report: { id: r4A2, status: 'removed' } });
    expect(await find(1, G, A)).toMatchObject({ status: 'removed', can_remove: false, can_admin_remove: false,
      terminal_reason: 'Removed by a group administrator', reward: { awarded: true, points: 25 } });
    await fails(report(3, G, A, 'again'), 'SR409');
    // SRS-514.15: repeats return the existing Removed state; nothing is removed twice.
    expect((await moderate(6, 'resolve', G, r4A2, { decision: 'removed' })).result).toBe('existing');
    expect((await moderate(6, 'resolve', G, r2A, { decision: 'removed' })).result).toBe('existing');
    expect((await moderate(1, 'resolve', G, r4A2, { decision: 'dismissed' })).result).toBe('conflict');
    expect(await removals(A)).toBe(1);
    expect(await ledger()).toEqual(credits);
    expect(await queueIds(1, G)).toEqual([r4C]);

    // SRS-514.1: the owner removes a published Snipe they can see directly (with confirmation in the UI).
    // Only managers get the option; the photographer keeps their own Remove, tagged friends their withdrawal.
    expect(await find(1, G, C)).toMatchObject({ viewer_role: 'member', can_admin_remove: true, can_remove: false });
    expect(await find(2, G, C)).toMatchObject({ viewer_role: 'photographer', can_remove: true, can_admin_remove: false });
    for (const student of [3, 4, 5]) expect((await find(student, G, C)).can_admin_remove, `student ${student}`).toBe(false);
    await fails(moderate(4, 'remove', G, C), 'SM403');
    await fails(moderate(3, 'remove', G, C), 'SM403');
    const direct = await moderate(1, 'remove', G, C, { decision: 'dismissed', resolved_by: '4' });
    expect(direct).toMatchObject({ result: 'saved', snipe: { status: 'removed', photo_available: false, can_admin_remove: false } });
    expect(await snipeRow(C)).toEqual({ status: 'removed', terminal_reason: 'Removed by a group administrator' });
    expect(await reportRow(r4C)).toEqual({ status: 'removed', resolved_by: 1 });
    expect((await moderate(1, 'remove', G, C)).snipe.status).toBe('removed');
    expect((await moderate(1, 'resolve', G, r4C, { decision: 'removed' })).result).toBe('existing');
    for (const student of [1, 2, 3, 4]) await fails(photo(student, G, C), 'SN404');
    expect(await removals(C)).toBe(1);
    expect(await moderate(1, 'queue', G)).toEqual({ reports: [] });

    // Untagged managers never see or touch a pending Snipe; it stays Pending for its reviewers.
    expect(await find(1, G, P)).toBeUndefined();
    await fails(moderate(1, 'remove', G, P), 'SN404');
    expect(await find(3, G, P)).toMatchObject({ status: 'pending', can_admin_remove: false });

    // SRS-514.1: an originally tagged friend who answered No to identity but approved sharing still removes it.
    expect(await find(2, G, E)).toMatchObject({ viewer_role: 'tagged', my_answers: { identity: false, sharing: true, withdrawn: false }, can_withdraw: true });
    expect((await call(2, 'withdraw', G, E)).snipe.status).toBe('removed');
    expect(await snipeRow(E)).toEqual({ status: 'removed', terminal_reason: 'Sharing permission withdrawn' });
    await fails(photo(4, G, E), 'SN404');
    expect(await removals(E)).toBe(1);

    // Concurrent, conflicting decisions on one report (each in its own transaction, as the server sends them):
    // one decision is stored, repeats of it are 'existing', the other decision is refused. PGlite runs them in
    // order; on hosted Postgres the photographer, request and report locks serialize them.
    const deliver = (decision: string) => db.transaction(async (tx) => {
      await tx.exec('SET LOCAL ROLE service_role');
      return (await tx.query<{ result: any }>('SELECT public.socialu_snipe_moderation($1,$2,$3,$4,$5::jsonb) AS result',
        [testUid(2), 'resolve', G2, rQ, JSON.stringify({ decision })])).rows[0].result.result as string;
    });
    const race = await Promise.all(Array.from({ length: 10 }, (_, i) => deliver(i % 2 ? 'removed' : 'dismissed')));
    expect(race.filter((r) => r === 'saved')).toHaveLength(1);
    expect(await reportRow(rQ)).toEqual({ status: 'dismissed', resolved_by: 2 });
    expect(race).toEqual(['saved', 'conflict', 'existing', 'conflict', 'existing', 'conflict', 'existing', 'conflict', 'existing', 'conflict']);
    expect(await snipeRow(Q)).toEqual({ status: 'approved', terminal_reason: null });

    // Concurrent removal paths on one Snipe: report decisions, the manager's direct removal and the photographer's
    // removal. One removal, one stored decision, no ledger change.
    const rQ2 = (await report(4, G2, Q, 'Second look')).report.id as string;
    const tx = (fn: string, sql: string, args: unknown[]) => db.transaction(async (t) => {
      await t.exec('SET LOCAL ROLE service_role');
      return (await t.query<{ result: any }>(`SELECT public.${fn}(${sql}) AS result`, args)).rows[0].result;
    });
    const mixed = await Promise.all([
      tx('socialu_snipe_moderation', "$1,'resolve',$2,$3,$4::jsonb", [testUid(2), G2, rQ2, JSON.stringify({ decision: 'removed' })]),
      tx('socialu_snipe', "$1,'remove',$2,$3", [testUid(2), G2, Q]),
      tx('socialu_snipe_moderation', "$1,'remove',$2,$3", [testUid(2), G2, Q]),
      tx('socialu_snipe_moderation', "$1,'resolve',$2,$3,$4::jsonb", [testUid(2), G2, rQ2, JSON.stringify({ decision: 'removed' })]),
    ]);
    expect(mixed.map((r) => r.result)).toEqual(['saved', 'saved', 'saved', 'existing']);
    expect((await snipeRow(Q)).status).toBe('removed');
    expect(await reportRow(rQ2)).toEqual({ status: 'removed', resolved_by: 2 });
    expect(await removals(Q)).toBe(1);
    expect(await ledger()).toEqual(credits);

    // SRS-514.14: direct messages have no reports and no administrators; normal removal roles still work there.
    const D = await submit(8, DM, [1]);
    expect((await answer(1, DM, D, true)).snipe).toMatchObject({ status: 'approved', can_report: false, can_admin_remove: false });
    await fails(moderate(1, 'queue', DM), 'SR403');
    await fails(moderate(8, 'remove', DM, D), 'SR403');
    await fails(moderate(1, 'resolve', DM, r4A, { decision: 'dismissed' }), 'SR403');
    expect((await call(1, 'withdraw', DM, D)).snipe.status).toBe('removed');
    expect(await ledger()).toEqual([...credits, { student: 8, snipe: D, points: 25 }]);

    // Former managers and inactive accounts are refused on every call.
    await db.query('UPDATE socialu.group_memberships SET left_at = now() WHERE conversation_id = $1 AND student_id = 6', [G]);
    await fails(moderate(6, 'queue', G), 'SC404');
    await db.query('UPDATE socialu.students SET is_active = false WHERE student_id = 1');
    await fails(moderate(1, 'queue', G), '42501');
  } finally { await db.close(); }
}, 120000);
