import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { befriend, friendship, testUid } from '../helpers/dormspace-db';
import { createGroup, createSnipeDatabase, snipeCall, snipeReportCall, snipeUpload } from '../helpers/snipe-db';

// SRS-514.8, 514.9, 514.11, 514.14 against the real schema, triggers, existing snipe_reports constraints and
// both bridges, in memory. Nothing hosted. Students: 1 photographer and group owner; 2 and 3 tagged friends of 1;
// 4 an untagged member; 5 a member who leaves; 6 an outsider who later joins (after publication).
it('lets current group members report a published Snipe once, with a receipt, without hiding it or touching rewards', async () => {
  const db = await createSnipeDatabase(6);
  try {
    await befriend(db, 1, 2); await befriend(db, 1, 3);
    const G = await createGroup(db, 1, [2, 3, 4, 5]);
    const DM = (await friendship(db, 1, 'message', 2)).conversation_id as string;
    const call = (student: number, action: string, conversation: string, snipeId: string | null = null, payload: object = {}) =>
      snipeCall(db, student, action, conversation, snipeId, payload);
    const report = (student: number, conversation: string, snipeId: string | null, payload: object = {}) =>
      snipeReportCall(db, student, conversation, snipeId, payload);
    const fails = async (promise: Promise<unknown>, code: string) => {
      const error: any = await promise.then(() => null, (e) => e);
      expect(error?.code, `expected ${code}`).toBe(code);
      return error;
    };
    const submit = async (student: number, conversation: string, targets: number[]) => {
      const key = randomUUID();
      return (await call(student, 'create', conversation, null, { submission_key: key, targets: targets.map(String), ...snipeUpload(student, key) })).snipe.id as string;
    };
    const find = async (student: number, conversation: string, id: string) => ((await call(student, 'list', conversation)).snipes as any[]).find((s) => s.id === id);
    const reports = async () => (await db.query<any>(`SELECT report_id::text AS id, snipe_id::text AS snipe, reporter_id::int AS reporter, reason, status,
      resolved_by FROM socialu.snipe_reports ORDER BY report_id`)).rows;
    const ledger = async () => (await db.query<any>('SELECT student_id::int AS student, snipe_id::text AS snipe, points_change::int AS points FROM socialu.point_transactions ORDER BY transaction_id')).rows;

    // Server-only bridge; private helpers callable by no API role; browser roles cannot reach reports.
    for (const role of ['anon', 'authenticated', 'service_role']) {
      expect((await db.query<any>("SELECT has_function_privilege($1,'public.socialu_snipe_report(uuid,bigint,bigint,jsonb)','EXECUTE') AS ok", [role])).rows[0].ok, role)
        .toBe(role === 'service_role');
      for (const helper of ['socialu.snipe_report_receipt(bigint)', 'socialu.freeze_snipe_report()', 'socialu.snipe_view(bigint,bigint)'])
        expect((await db.query<any>("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok", [role, helper])).rows[0].ok, `${role} ${helper}`).toBe(false);
    }
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      try {
        await expect(db.query('SELECT * FROM socialu.snipe_reports')).rejects.toThrow();
        await expect(db.query("SELECT public.socialu_snipe_report($1,$2,1,'{}'::jsonb)", [testUid(4), G])).rejects.toThrow();
      } finally { await db.exec('RESET ROLE'); }
    }

    // A: published in the group (photographer 1, verified friend 2). B: still pending (tagged friend 3).
    const A = await submit(1, G, [2]);
    expect((await call(2, 'respond', G, A, { identity: true, sharing: true })).snipe.status).toBe('approved');
    const B = await submit(1, G, [3]);
    expect(await ledger()).toEqual([{ student: 1, snipe: A, points: 25 }]);

    // SRS-514.8: every current member who can see it, the photographer included, is offered reporting, and only
    // for the published Snipe. The photographer keeps their separate Remove action.
    expect(await find(4, G, A)).toMatchObject({ viewer_role: 'member', can_report: true, my_report: null, photo_available: true });
    expect(await find(2, G, A)).toMatchObject({ viewer_role: 'tagged', can_report: true });
    expect(await find(1, G, A)).toMatchObject({ viewer_role: 'photographer', can_report: true, can_remove: true, my_report: null });
    expect(await find(1, G, B)).toMatchObject({ status: 'pending', can_report: false });
    expect(await find(3, G, B)).toMatchObject({ status: 'pending', can_report: false });

    // A reason is required: a JSON string, 1 to 500 characters after trimming. Nothing is stored otherwise.
    for (const payload of [{}, { reason: '' }, { reason: ' \n\t ' }, { reason: 5 }, { reason: null }, { reason: ['spam'] }, { reason: { text: 'spam' } }, { reason: 'x'.repeat(501) }])
      await fails(report(4, G, A, payload), 'SR400');
    expect(await reports()).toEqual([]);

    // SRS-514.8/514.9: a valid member report is stored for the verified reporter, trimmed, unresolved, with a
    // receipt. Browser-supplied identity, status or decision fields are ignored.
    const first = await report(4, G, A, { reason: '  Posted without asking me.  ', reporter_id: '1', status: 'dismissed', resolved_by: '1' });
    expect(first.result).toBe('created');
    expect(first.report).toEqual({ id: expect.stringMatching(/^\d+$/), snipe_id: A, reason: 'Posted without asking me.', status: 'unresolved' });
    expect(await reports()).toEqual([{ id: first.report.id, snipe: A, reporter: 4, reason: 'Posted without asking me.', status: 'unresolved', resolved_by: null }]);
    // SRS-514.11: the Snipe keeps its publication status and photo for everyone while the report waits.
    expect(first.snipe).toMatchObject({ status: 'approved', photo_available: true, can_report: false, my_report: first.report });
    for (const student of [1, 2, 3, 4]) {
      expect(await find(student, G, A), `student ${student}`).toMatchObject({ status: 'approved', photo_available: true });
      expect((await call(student, 'photo', G, A)).storage_key).toMatch(/^snipe\//);
    }
    // Only the reporter sees the receipt; the photographer and other members see nothing about it.
    for (const student of [1, 2, 3]) expect((await find(student, G, A)).my_report, `student ${student}`).toBeNull();
    expect(await find(4, G, A)).toMatchObject({ can_report: false, my_report: first.report });

    // Stable retries: the same reason returns the same report; a different reason is refused and the first is kept.
    const retry = await report(4, G, A, { reason: 'Posted without asking me.' });
    expect([retry.result, retry.report]).toEqual(['existing', first.report]);
    const changed = await report(4, G, A, { reason: 'Something else' });
    expect([changed.result, changed.report]).toEqual(['conflict', first.report]);
    expect(await reports()).toHaveLength(1);
    // The existing uniqueness (one unresolved report per reporter and Snipe) and immutability hold even for the owner.
    await expect(db.query("INSERT INTO socialu.snipe_reports(snipe_id, reporter_id, reason) VALUES ($1, 4, 'again')", [A])).rejects.toThrow();
    await expect(db.query("UPDATE socialu.snipe_reports SET reason = 'edited' WHERE report_id = $1", [first.report.id])).rejects.toThrow(/original Snipe, reporter and reason/);
    await expect(db.query("UPDATE socialu.snipe_reports SET reporter_id = 3 WHERE report_id = $1", [first.report.id])).rejects.toThrow(/original Snipe, reporter and reason/);
    // Existing role check: only a current group owner/administrator may resolve (the decision UI is the next phase).
    await expect(db.query("UPDATE socialu.snipe_reports SET status = 'dismissed', resolved_by = 4 WHERE report_id = $1", [first.report.id])).rejects.toThrow(/group manager/);
    expect((await reports())[0]).toMatchObject({ reason: 'Posted without asking me.', status: 'unresolved', resolved_by: null });

    // Repeated deliveries of one report, each in its own transaction as the server sends them: exactly one is stored.
    // PGlite runs them one after another; on hosted Postgres the photographer and request locks serialize them,
    // backed by the unique index.
    const deliver = () => db.transaction(async (tx) => {
      await tx.exec('SET LOCAL ROLE service_role');
      return (await tx.query<{ result: any }>('SELECT public.socialu_snipe_report($1,$2,$3,$4::jsonb) AS result',
        [testUid(2), G, A, JSON.stringify({ reason: 'x'.repeat(500) })])).rows[0].result;
    });
    const deliveries = await Promise.all(Array.from({ length: 20 }, deliver));
    expect(deliveries.filter((d) => d.result === 'created')).toHaveLength(1);
    expect(deliveries.filter((d) => d.result === 'existing')).toHaveLength(19);
    expect(new Set(deliveries.map((d) => d.report.id)).size).toBe(1);
    expect((await reports()).map((r) => [r.reporter, r.reason.length])).toEqual([[4, 25], [2, 500]]);

    // SRS-514.8: the photographer is a current member too, so they can report their own published Snipe. It
    // stays published, they still can remove it, and only they see their receipt.
    const own = await report(1, G, A, { reason: 'Wrong group' });
    expect(own.result).toBe('created');
    expect(own.report).toEqual({ id: expect.stringMatching(/^\d+$/), snipe_id: A, reason: 'Wrong group', status: 'unresolved' });
    expect(own.snipe).toMatchObject({ viewer_role: 'photographer', status: 'approved', photo_available: true, can_report: false, can_remove: true, my_report: own.report });
    expect((await report(1, G, A, { reason: 'Wrong group' }))).toMatchObject({ result: 'existing', report: own.report });
    expect((await find(4, G, A)).my_report).toEqual(first.report);
    expect((await find(3, G, A)).my_report).toBeNull();
    expect((await reports()).map((r) => [r.reporter, r.status])).toEqual([[4, 'unresolved'], [2, 'unresolved'], [1, 'unresolved']]);
    // Pending: hidden from untagged members (indistinguishable from missing); refused for its reviewers,
    // the photographer included.
    await fails(report(4, G, B, { reason: 'spam' }), 'SN404');
    await fails(report(3, G, B, { reason: 'spam' }), 'SR409');
    await fails(report(1, G, B, { reason: 'spam' }), 'SR409');
    // Missing, wrong-conversation and outsider requests reveal nothing.
    await fails(report(4, G, '999999', { reason: 'spam' }), 'SN404');
    await fails(report(2, DM, A, { reason: 'spam' }), 'SN404');
    await fails(report(6, G, A, { reason: 'spam' }), 'SC404');
    // Someone who joins after publication cannot see it, so cannot report it either.
    await db.query('INSERT INTO socialu.group_memberships(conversation_id,student_id) VALUES($1,6)', [G]);
    await fails(report(6, G, A, { reason: 'spam' }), 'SN404');
    // Former members and inactive accounts are refused on every call (fresh participant and account checks).
    expect((await find(5, G, A)).can_report).toBe(true);
    await db.query('UPDATE socialu.group_memberships SET left_at = now() WHERE conversation_id = $1 AND student_id = 5', [G]);
    await fails(report(5, G, A, { reason: 'spam' }), 'SC404');
    await db.query('UPDATE socialu.students SET is_active = false WHERE student_id = 5');
    await fails(report(5, G, A, { reason: 'spam' }), '42501');

    // SRS-514.14: direct-message Snipes are never reportable, by either participant; the view offers nothing.
    const D = await submit(2, DM, [1]);
    expect((await call(1, 'respond', DM, D, { identity: true, sharing: true })).snipe.status).toBe('approved');
    expect(await find(1, DM, D)).toMatchObject({ status: 'approved', can_report: false, my_report: null });
    await fails(report(1, DM, D, { reason: 'spam' }), 'SR403');
    await fails(report(2, DM, D, { reason: 'spam' }), 'SR403');
    // The existing table trigger refuses a DM report even when written directly.
    await expect(db.query("INSERT INTO socialu.snipe_reports(snipe_id, reporter_id, reason) VALUES ($1, 1, 'spam')", [D])).rejects.toThrow(/group conversations only/);

    // Removed: no new reports; the reporter's retry still returns their stored receipt; the photo stays withdrawn.
    expect((await find(3, G, A)).can_report).toBe(true);
    expect((await call(1, 'remove', G, A)).snipe.status).toBe('removed');
    const removed = await fails(report(3, G, A, { reason: 'spam' }), 'SR409');
    expect(removed.message).toMatch(/already removed/);
    expect((await report(4, G, A, { reason: 'Posted without asking me.' })).result).toBe('existing');
    expect(await find(4, G, A)).toMatchObject({ status: 'removed', photo_available: false, can_report: false, my_report: first.report });
    expect(await find(1, G, A)).toMatchObject({ status: 'removed', can_report: false, can_remove: false, my_report: own.report });
    expect((await report(1, G, A, { reason: 'Wrong group' })).result).toBe('existing');
    await fails(call(4, 'photo', G, A), 'SN404');

    // Reporting changed no Snipe outcome, consent answer or reward: two publications, one credit each, no reporter points.
    expect(await ledger()).toEqual([{ student: 1, snipe: A, points: 25 }, { student: 2, snipe: D, points: 25 }]);
    expect((await call(4, 'list', G)).rewards).toEqual({ points_per_friend: 25, balance: 0 });
    expect(await find(3, G, B)).toMatchObject({ status: 'pending', my_answers: { identity: null, sharing: null, withdrawn: false } });
    expect((await reports()).map((r) => r.status)).toEqual(['unresolved', 'unresolved', 'unresolved']);
  } finally { await db.close(); }
}, 120000);
