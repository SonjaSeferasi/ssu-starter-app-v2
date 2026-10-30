import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { befriend, friendship, testUid } from '../helpers/dormspace-db';
import { createGroup, createSnipeDatabase, snipeCall, snipeDigest, snipeUpload } from '../helpers/snipe-db';

// UR-510 to UR-514 basic slice against the real schema, triggers and bridge, in memory. Nothing hosted.
// Students: 1 photographer; friends 1-2, 1-3, 1-4, 1-6, 1-7, 2-3, 2-4. Student 5 is in the group but
// not a friend of 1; student 6 is a friend outside the group until the end.
it('runs the Snipe lifecycle with separate consent, private visibility, cooldowns and removal', async () => {
  const db = await createSnipeDatabase(7);
  try {
    const friendshipIds: Record<string, string> = {};
    for (const [a, b] of [[1, 2], [1, 3], [1, 4], [1, 6], [1, 7], [2, 3], [2, 4]]) friendshipIds[`${a}-${b}`] = await befriend(db, a, b);
    const G = await createGroup(db, 1, [2, 3, 4, 5, 7]);
    const H = await createGroup(db, 1, [2]);
    const DM = (await friendship(db, 1, 'message', 2)).conversation_id as string;
    const call = (student: number, action: string, conversation: string, snipeId: string | null = null, payload: object = {}) =>
      snipeCall(db, student, action, conversation, snipeId, payload);
    const fails = async (promise: Promise<unknown>, code: string) => {
      const error: any = await promise.then(() => null, (e) => e);
      expect(error?.code, `expected ${code}`).toBe(code);
      return error;
    };
    const submit = (student: number, conversation: string, targets: number[], key = randomUUID(), upload = snipeUpload(student, key)) =>
      call(student, 'create', conversation, null, { submission_key: key, targets: targets.map(String), ...upload });
    const visible = async (student: number, conversation: string) => (await call(student, 'list', conversation)).snipes as any[];
    const find = async (student: number, conversation: string, id: string) => (await visible(student, conversation)).find((s) => s.id === id);
    const count = async (sql: string) => (await db.query<{ n: number }>(sql)).rows[0].n;
    const age = async (id: string, hours: number) => {
      // Test-only clock travel: shift the whole immutable identity together, bypassing its triggers.
      await db.exec('SET session_replication_role = replica');
      await db.query(`UPDATE socialu.snipe_requests SET submitted_at = submitted_at - $2 * INTERVAL '1 hour',
        expires_at = expires_at - $2 * INTERVAL '1 hour', published_at = published_at - $2 * INTERVAL '1 hour' WHERE snipe_id = $1`, [id, hours]);
      await db.exec('SET session_replication_role = origin');
    };

    // Approved B-06 policy only; private bridge; deferred consent check runs as its owner.
    expect((await db.query("SELECT mime_type, max_bytes::int AS max FROM socialu.upload_policies WHERE upload_context='snipe' ORDER BY mime_type")).rows)
      .toEqual([{ mime_type: 'image/jpeg', max: 10000000 }, { mime_type: 'image/png', max: 10000000 }]);
    await expect(db.query("INSERT INTO socialu.media_assets(owner_id,storage_key,upload_context,mime_type,byte_count) VALUES(1,'x.gif','snipe','image/gif',10)")).rejects.toThrow();
    await expect(db.query("INSERT INTO socialu.media_assets(owner_id,storage_key,upload_context,mime_type,byte_count) VALUES(1,'x.jpg','snipe','image/jpeg',10000001)")).rejects.toThrow();
    expect((await db.query<any>("SELECT prosecdef, proconfig FROM pg_proc WHERE oid='socialu.check_snipe_consent()'::regprocedure")).rows[0])
      .toEqual({ prosecdef: true, proconfig: ['search_path=socialu, pg_catalog'] });
    for (const role of ['anon', 'authenticated', 'service_role']) {
      expect((await db.query<any>("SELECT has_function_privilege($1,'public.socialu_snipe(uuid,text,bigint,bigint,jsonb)','EXECUTE') AS ok", [role])).rows[0].ok).toBe(role === 'service_role');
      for (const helper of ['socialu.snipe_view(bigint,bigint)', 'socialu.snipe_settle(bigint,bigint)'])
        expect((await db.query<any>('SELECT has_function_privilege($1,$2,\'EXECUTE\') AS ok', [role, helper])).rows[0].ok).toBe(false);
    }
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      await expect(db.query('SELECT * FROM socialu.snipe_requests')).rejects.toThrow();
      await expect(db.query("SELECT public.socialu_snipe($1,'list',$2)", [testUid(1), G])).rejects.toThrow();
      await db.exec('RESET ROLE');
    }

    // SRS-510.4: only current friends who are current participants, never the photographer.
    expect((await call(1, 'list', G)).targets.map((t: any) => t.id)).toEqual(['2', '3', '4', '7']);
    expect((await call(1, 'list', DM)).targets.map((t: any) => t.id)).toEqual(['2']);
    await fails(call(6, 'list', G), 'SC404');
    await fails(call(1, 'list', '999999'), 'SC404');

    // SRS-510.6 to 510.8, 513.9: invalid submissions are rejected whole and reserve nothing.
    await fails(submit(1, G, [2, 5]), 'SN422');
    await fails(submit(1, G, [6]), 'SN422');
    await fails(submit(1, G, [1]), 'SN400');
    await fails(call(1, 'create', G, null, { submission_key: randomUUID(), targets: ['2', '2'], ...snipeUpload(1, randomUUID()) }), 'SN400');
    await fails(call(1, 'create', G, null, { submission_key: 'retry', targets: ['2'] }), 'SN400');
    const borrowed = randomUUID();
    await fails(submit(1, G, [2], borrowed, snipeUpload(2, borrowed)), 'SN400');
    await fails(submit(1, G, [2], borrowed, { ...snipeUpload(1, borrowed), mime_type: 'image/png' }), 'SN400');
    // The storage path must carry the digest the server computed for this photo.
    await fails(submit(1, G, [2], borrowed, { ...snipeUpload(1, borrowed), content_digest: snipeDigest('photo-b') }), 'SN400');
    await fails(submit(1, G, [2], borrowed, { ...snipeUpload(1, borrowed), content_digest: 'not-a-digest' }), 'SN400');
    expect(await count('SELECT count(*)::int AS n FROM socialu.snipe_requests')).toBe(0);
    expect(await count("SELECT count(*)::int AS n FROM socialu.media_assets WHERE upload_context='snipe'")).toBe(0);

    // SRS-510.9 to 510.11, 512.4: one Pending request; a retry returns it; reuse with other tags is refused.
    const keyA = randomUUID();
    const created = await submit(1, G, [2, 3], keyA);
    expect(created.created).toBe(true);
    const A = created.snipe.id as string;
    expect(created.snipe).toMatchObject({ status: 'pending', viewer_role: 'photographer', photo_available: true, can_remove: false });
    expect(created.snipe.tags.map((t: any) => [t.id, t.identity, t.sharing, t.withdrawn])).toEqual([['2', null, null, false], ['3', null, null, false]]);
    expect(Date.parse(created.snipe.expires_at) - Date.parse(created.snipe.submitted_at)).toBe(24 * 3600 * 1000);
    const retried = await call(1, 'create', G, null, { submission_key: keyA, targets: ['3', '2'], ...snipeUpload(1, keyA) });
    expect([retried.created, retried.snipe.id, retried.same_upload]).toEqual([false, A, false]);
    const committedKey = (await call(1, 'photo', G, A)).storage_key;
    const replayed = await call(1, 'create', G, null, { submission_key: keyA, targets: ['2', '3'], ...snipeUpload(1, keyA), storage_key: committedKey });
    expect([replayed.created, replayed.same_upload]).toEqual([false, true]);
    expect((await call(1, 'prepare', G, null, { submission_key: keyA, targets: ['2', '3'], content_digest: snipeDigest() })).snipe.id).toBe(A);
    await fails(call(1, 'create', G, null, { submission_key: keyA, targets: ['2'], ...snipeUpload(1, keyA) }), 'SN409');
    // Regression: the same key with a different photo, or in another conversation, is not the same action.
    await fails(call(1, 'prepare', G, null, { submission_key: keyA, targets: ['2', '3'], content_digest: snipeDigest('photo-b') }), 'SN409');
    await fails(call(1, 'create', G, null, { submission_key: keyA, targets: ['2', '3'], ...snipeUpload(1, keyA, 'jpg', snipeDigest('photo-b')) }), 'SN409');
    await fails(call(1, 'create', H, null, { submission_key: keyA, targets: ['2'], ...snipeUpload(1, keyA) }), 'SN409');
    await fails(call(1, 'prepare', G, null, { submission_key: keyA, targets: ['2', '3'] }), 'SN400');
    expect(await count('SELECT count(*)::int AS n FROM socialu.snipe_requests')).toBe(1);
    expect(await count("SELECT count(*)::int AS n FROM socialu.media_assets WHERE upload_context='snipe'")).toBe(1);

    // SRS-511.1, 512.2: untagged members get no photo, controls or placeholder; outsiders get nothing.
    expect(await visible(4, G)).toEqual([]);
    expect(await visible(5, G)).toEqual([]);
    await fails(call(4, 'photo', G, A), 'SN404');
    await fails(call(5, 'respond', G, A, { identity: true }), 'SN404');
    await fails(call(6, 'photo', G, A), 'SC404');
    await fails(call(2, 'photo', H, A), 'SN404');
    expect((await call(2, 'photo', G, A)).storage_key).toMatch(new RegExp(`^snipe/${testUid(1)}/${keyA}/`));
    const reviewing = await find(2, G, A);
    expect(reviewing).toMatchObject({ viewer_role: 'tagged', can_answer: true, my_answers: { identity: null, sharing: null, withdrawn: false } });
    expect(reviewing.tags).toHaveLength(2);
    await fails(call(1, 'respond', G, A, { identity: true }), 'SN403');

    // SRS-511.2 to 511.9: separate answers, nothing assumed, publication only when everything is answered.
    let answer = await call(2, 'respond', G, A, { identity: true });
    expect(answer.result).toBe('saved');
    expect(answer.snipe).toMatchObject({ status: 'pending', my_answers: { identity: true, sharing: null } });
    expect((await call(3, 'respond', G, A, { sharing: true })).snipe.status).toBe('pending');
    expect((await call(2, 'respond', G, A, { sharing: true })).snipe.status).toBe('pending');
    await fails(call(2, 'respond', G, A, { identity: false }), 'SN409');
    await fails(call(3, 'respond', G, A, { identity: 'no' }), 'SN400');
    answer = await call(3, 'respond', G, A, { identity: false });
    expect(answer.snipe).toMatchObject({ status: 'approved', verified_targets: [{ id: '2', name: 'Dorm Student 2', username: 'dorm2' }] });
    expect(answer.snipe.published_at).not.toBeNull();
    // SRS-511.9, 512.10: other members see Approved with verified targets only.
    const asMember = await find(4, G, A);
    expect(asMember).toMatchObject({ status: 'approved', viewer_role: 'member', photo_available: true, tags: null, my_answers: null, terminal_reason: null });
    expect(asMember.verified_targets.map((p: any) => p.id)).toEqual(['2']);
    expect((await call(5, 'photo', G, A)).mime_type).toBe('image/jpeg');
    // SRS-511.13, 512.12: closed requests take no more answers.
    expect((await call(2, 'respond', G, A, { identity: true })).result).toBe('closed');

    // SRS-513.1 to 513.7: ordered-pair cooldowns apply across conversations, including denied identities.
    const cooldown = await fails(submit(1, H, [2]), 'SN429');
    expect(JSON.parse(cooldown.detail)).toEqual([{ friend: { id: '2', name: 'Dorm Student 2', username: 'dorm2' }, next_eligible_at: expect.any(String) }]);
    await fails(submit(1, DM, [2]), 'SN429');
    await fails(submit(1, G, [3]), 'SN429');
    expect((await call(1, 'list', H)).targets[0].next_eligible_at).not.toBeNull();
    const B = (await submit(3, G, [2])).snipe.id as string;

    // SRS-511.7: one sharing No rejects the request without publication.
    const rejected = (await call(2, 'respond', G, B, { sharing: false })).snipe;
    expect(rejected).toMatchObject({ status: 'rejected', terminal_reason: 'Sharing permission declined', photo_available: false });
    await fails(call(3, 'photo', G, B), 'SN404');
    expect(await find(1, G, B)).toBeUndefined();

    // SRS-511.10: everyone shares but nobody is identified -> Closed, No verified targets.
    const C = (await submit(4, G, [1])).snipe.id as string;
    expect((await call(1, 'respond', G, C, { identity: false, sharing: true })).snipe).toMatchObject({ status: 'closed', terminal_reason: 'No verified targets' });
    await fails(call(4, 'photo', G, C), 'SN404');
    expect(await find(2, G, C)).toBeUndefined();

    // SRS-512.4 to 512.6: the deadline is enforced on a response even before any refresh runs.
    const D = (await submit(1, G, [4])).snipe.id as string;
    await age(D, 25);
    expect((await call(4, 'respond', G, D, { identity: true })).result).toBe('expired');
    expect(await find(4, G, D)).toMatchObject({ status: 'expired', terminal_reason: 'Not every tagged friend answered within 24 hours', photo_available: false });
    await fails(call(1, 'photo', G, D), 'SN404');

    // SRS-513.3: exactly 24 elapsed hours passes; one second less does not. Failed attempts change nothing.
    const asOf = (offset: string) => db.transaction(async (tx) => {
      await tx.exec('SET LOCAL session_replication_role = replica');
      await tx.query(`UPDATE socialu.snipe_requests SET submitted_at = now() - INTERVAL '24 hours' + $2::interval,
        expires_at = now() + $2::interval WHERE snipe_id = $1`, [A, offset]);
      await tx.exec('SET LOCAL session_replication_role = origin');
      const key = randomUUID();
      return (await tx.query<{ result: any }>('SELECT public.socialu_snipe($1,$2,$3,NULL,$4::jsonb) AS result',
        [testUid(1), 'create', H, JSON.stringify({ submission_key: key, targets: ['2'], ...snipeUpload(1, key) })])).rows[0].result;
    });
    expect((await asOf('1 second').catch((e) => e)).code).toBe('SN429');
    const P = (await asOf('0 seconds')).snipe.id as string;

    // SRS-514.1 to 514.7, 514.15: the photographer removes a published Snipe once; the photo stops.
    expect((await call(2, 'respond', H, P, { identity: true, sharing: true })).snipe.status).toBe('approved');
    expect((await call(1, 'remove', H, P)).snipe).toMatchObject({ status: 'removed', terminal_reason: 'Removed by the photographer', photo_available: false });
    expect((await call(1, 'remove', H, P)).snipe.status).toBe('removed');
    await fails(call(2, 'photo', H, P), 'SN404');

    // SRS-511.12, 514.6, 514.7: tagged withdrawal after publication removes it for everyone.
    expect((await call(2, 'withdraw', G, A)).snipe).toMatchObject({ status: 'removed', terminal_reason: 'Sharing permission withdrawn', can_withdraw: false });
    for (const student of [1, 2, 3, 4, 5]) await fails(call(student, 'photo', G, A), 'SN404');
    expect(await find(4, G, A)).toMatchObject({ status: 'removed', photo_available: false, verified_targets: [], terminal_reason: null });
    expect((await call(2, 'withdraw', G, A)).snipe.status).toBe('removed');

    // Only the photographer or a tagged friend may remove; later members do not see earlier Snipes.
    const Q = (await submit(3, G, [1])).snipe.id as string;
    expect((await call(1, 'respond', G, Q, { identity: true, sharing: true })).snipe.status).toBe('approved');
    await fails(call(4, 'remove', G, Q), 'SN403');
    await fails(call(5, 'withdraw', G, Q), 'SN403');
    await db.query('INSERT INTO socialu.group_memberships(conversation_id,student_id) VALUES($1,6)', [G]);
    expect(await find(6, G, Q)).toBeUndefined();
    await fails(call(6, 'photo', G, Q), 'SN404');

    // SRS-511.11: withdrawing a granted permission before publication cancels the request.
    const R = (await submit(2, G, [1])).snipe.id as string;
    await fails(call(1, 'withdraw', G, R), 'SN409');
    await call(1, 'respond', G, R, { sharing: true });
    expect((await call(1, 'withdraw', G, R)).snipe).toMatchObject({ status: 'canceled', terminal_reason: 'Sharing permission withdrawn' });

    // SRS-512.7/512.8: friendship end, departure and deactivation cancel pending requests.
    const S = (await submit(1, G, [7])).snipe.id as string;
    await friendship(db, 1, 'remove', 7, friendshipIds['1-7']);
    expect(await find(1, G, S)).toMatchObject({ status: 'canceled', terminal_reason: 'Required friendship ended' });
    const T = (await submit(2, G, [3])).snipe.id as string;
    await db.query('UPDATE socialu.group_memberships SET left_at = now() WHERE conversation_id = $1 AND student_id = 3', [G]);
    expect(await find(2, G, T)).toMatchObject({ status: 'canceled', terminal_reason: 'Required participant left the conversation' });
    const U = (await submit(4, G, [2])).snipe.id as string;
    await db.query('UPDATE socialu.students SET is_active = false WHERE student_id = 2');
    expect(await find(4, G, U)).toMatchObject({ status: 'canceled', terminal_reason: 'Required friendship ended' });
    await fails(call(2, 'list', G), '42501');

    // SRS-525: only the three published Snipes (A, P by student 1; Q by student 3) earned points, each once,
    // for its photographer only, at 25 per verified friend. Removed A and P keep theirs. No feed posts.
    expect((await db.query<any>(`SELECT student_id::int AS student, snipe_id::text AS snipe, reward_units AS units, points_change::int AS points
      FROM socialu.point_transactions ORDER BY transaction_id`)).rows).toEqual([
      { student: 1, snipe: A, units: 1, points: 25 }, { student: 1, snipe: P, units: 1, points: 25 }, { student: 3, snipe: Q, units: 1, points: 25 }]);
    expect(await count('SELECT count(*)::int AS n FROM socialu.posts')).toBe(0);
  } finally { await db.close(); }
}, 60000);

// Storage boundary: the fixture (helpers/snipe-db.ts) has RLS on storage.objects and a broad permissive
// policy granting anon/authenticated everything. The migration's restrictive policy must still keep browser
// roles out of the Snipe bucket entirely, while the media bucket keeps following its own (broad) policy.
it('keeps Snipe objects in a private bucket that browser roles cannot read or write, even with a broad policy', async () => {
  const db = await createSnipeDatabase(2);
  try {
    expect((await db.query<any>("SELECT public FROM storage.buckets WHERE id = 'socialu-snipe-photos'")).rows).toEqual([{ public: false }]);
    expect((await db.query<any>(`SELECT permissive, roles::text[] AS roles, qual, with_check FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'socialu_snipe_photos_server_only'`)).rows)
      .toEqual([{ permissive: 'RESTRICTIVE', roles: ['anon', 'authenticated'], qual: expect.stringContaining('socialu-snipe-photos'), with_check: expect.stringContaining('socialu-snipe-photos') }]);
    // The server (service_role bypasses RLS on hosted Supabase; here the owner) stores one object in each bucket.
    const snipeObject = (await db.query<{ id: string }>("INSERT INTO storage.objects(bucket_id, name) VALUES ('socialu-snipe-photos', 'snipe/a/b/c/d.jpg') RETURNING id")).rows[0].id;
    const mediaObject = (await db.query<{ id: string }>("INSERT INTO storage.objects(bucket_id, name) VALUES ('media', 'posts/1.jpg') RETURNING id")).rows[0].id;

    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      try {
        expect((await db.query<any>('SELECT bucket_id FROM storage.objects ORDER BY bucket_id')).rows, role).toEqual([{ bucket_id: 'media' }]);
        expect((await db.query("SELECT id FROM storage.objects WHERE id = $1", [snipeObject])).rows).toEqual([]);
        await expect(db.query("INSERT INTO storage.objects(bucket_id, name) VALUES ('socialu-snipe-photos', 'snipe/x.jpg')")).rejects.toThrow(/row-level security/);
        expect((await db.query("UPDATE storage.objects SET name = 'renamed' WHERE id = $1 RETURNING id", [snipeObject])).rows).toEqual([]);
        expect((await db.query('DELETE FROM storage.objects WHERE id = $1 RETURNING id', [snipeObject])).rows).toEqual([]);
        // Moving another object into the Snipe bucket is a write into it, so WITH CHECK refuses it.
        await expect(db.query("UPDATE storage.objects SET bucket_id = 'socialu-snipe-photos' WHERE id = $1", [mediaObject])).rejects.toThrow(/row-level security/);
        // Other buckets are untouched: the broad fixture policy still applies to them.
        const added = (await db.query<{ id: string }>("INSERT INTO storage.objects(bucket_id, name) VALUES ('media', $1) RETURNING id", [`posts/${role}.jpg`])).rows[0].id;
        expect((await db.query('DELETE FROM storage.objects WHERE id = $1 RETURNING id', [added])).rows).toHaveLength(1);
      } finally { await db.exec('RESET ROLE'); }
    }
    expect((await db.query<any>("SELECT name FROM storage.objects WHERE id = $1", [snipeObject])).rows).toEqual([{ name: 'snipe/a/b/c/d.jpg' }]);
  } finally { await db.close(); }
}, 60000);

// Regression for the first real-schema failure: the migration must parse and apply on its own, including
// where Supabase Storage tables do not exist (the bucket and policy steps are skipped).
it('applies the Snipe migration without Supabase Storage tables', async () => {
  const db = await createSnipeDatabase(2, { storage: false });
  try {
    expect((await db.query<any>("SELECT to_regclass('storage.objects') IS NULL AS missing")).rows[0].missing).toBe(true);
    expect((await db.query<any>("SELECT to_regprocedure('public.socialu_snipe(uuid,text,bigint,bigint,jsonb)') IS NOT NULL AS ok")).rows[0].ok).toBe(true);
  } finally { await db.close(); }
}, 60000);
