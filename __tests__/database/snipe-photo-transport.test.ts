import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { befriend, friendship, testUid } from '../helpers/dormspace-db';
import { SNIPE_TRANSPORT_MIGRATION, createGroup, createSnipeDatabase, reapCall, snipeCall, snipeDigest, snipeStage, snipeUpload, stageCall } from '../helpers/snipe-db';

// SRS-510.2 direct photo transport against the real schema, core bridge and reward triggers, in memory.
// Students: 1 photographer; friends 1-2, 1-3, 1-4. Group G = 1..5 (5 is not a friend of 1); H = 1, 2.
// Student 6 is outside both groups.
async function setup() {
  const db = await createSnipeDatabase(6);
  const ids: Record<string, string> = {};
  for (const [a, b] of [[1, 2], [1, 3], [1, 4]]) ids[`${a}-${b}`] = await befriend(db, a, b);
  const G = await createGroup(db, 1, [2, 3, 4, 5]);
  const H = await createGroup(db, 1, [2]);
  return { db, ids, G, H };
}
const fails = async (promise: Promise<unknown>, code: string) => {
  const error: any = await promise.then(() => null, (e) => e);
  expect(error?.code, `expected ${code}`).toBe(code);
  return error;
};
const committedKey = (student: number, key: string, digest = snipeDigest(), extension = 'jpg') =>
  `snipe/${testUid(student)}/${key}/${digest}/${randomUUID()}.${extension}`;
const count = async (db: any, sql: string, params: unknown[] = []) => (await db.query(sql, params)).rows[0].n as number;

it('keeps staging server-only: grants, RLS, private bucket, restrictive policy, and no core redefinition', async () => {
  const { db, G } = await setup();
  try {
    const privilege = async (role: string, fn: string) => (await db.query<any>("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok", [role, fn])).rows[0].ok;
    for (const role of ['anon', 'authenticated', 'service_role']) {
      expect(await privilege(role, 'public.socialu_snipe_photo(uuid,text,bigint,jsonb)'), role).toBe(role === 'service_role');
      expect(await privilege(role, 'public.socialu_snipe_photo_reap(text,jsonb)'), role).toBe(role === 'service_role');
      for (const helper of ['socialu.snipe_photo_core(uuid,text,bigint,jsonb)', 'socialu.snipe_photo_retryable(text)'])
        expect(await privilege(role, helper), `${role} ${helper}`).toBe(false);
      expect((await db.query<any>("SELECT has_table_privilege($1,'socialu.snipe_photo_stages','SELECT') AS ok", [role])).rows[0].ok).toBe(false);
      await db.exec(`SET ROLE ${role}`);
      try { await expect(db.query('SELECT * FROM socialu.snipe_photo_stages')).rejects.toThrow(); }
      finally { await db.exec('RESET ROLE'); }
    }
    expect((await db.query<any>("SELECT relrowsecurity FROM pg_class WHERE oid = 'socialu.snipe_photo_stages'::regclass")).rows[0].relrowsecurity).toBe(true);
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      try {
        await expect(db.query("SELECT public.socialu_snipe_photo($1,'begin',$2,'{}'::jsonb)", [testUid(1), G])).rejects.toThrow();
        await expect(db.query("SELECT public.socialu_snipe_photo_reap('claim','{}'::jsonb)")).rejects.toThrow();
      } finally { await db.exec('RESET ROLE'); }
    }

    // A separate private staging bucket limited to the approved policy, behind its own restrictive policy.
    expect((await db.query<any>("SELECT public, file_size_limit::int AS bytes, allowed_mime_types FROM storage.buckets WHERE id = 'socialu-snipe-staging'")).rows)
      .toEqual([{ public: false, bytes: 10000000, allowed_mime_types: ['image/jpeg', 'image/png'] }]);
    expect((await db.query<any>(`SELECT policyname, permissive, roles::text[] AS roles FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'socialu_snipe_%' ORDER BY policyname`)).rows).toEqual([
      { policyname: 'socialu_snipe_photos_server_only', permissive: 'RESTRICTIVE', roles: ['anon', 'authenticated'] },
      { policyname: 'socialu_snipe_staging_server_only', permissive: 'RESTRICTIVE', roles: ['anon', 'authenticated'] }]);
    const staged = (await db.query<{ id: string }>("INSERT INTO storage.objects(bucket_id, name) VALUES ('socialu-snipe-staging', $1) RETURNING id", [`stage/${testUid(1)}/${randomUUID()}.png`])).rows[0].id;
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      try {
        expect((await db.query('SELECT id FROM storage.objects WHERE id = $1', [staged])).rows, role).toEqual([]);
        await expect(db.query("INSERT INTO storage.objects(bucket_id, name) VALUES ('socialu-snipe-staging', 'stage/x.png')")).rejects.toThrow(/row-level security/);
        expect((await db.query('DELETE FROM storage.objects WHERE id = $1 RETURNING id', [staged])).rows).toEqual([]);
        await expect(db.query("INSERT INTO storage.objects(bucket_id, name) VALUES ('media', 'p.png') RETURNING id")).resolves.toBeTruthy();
      } finally { await db.exec('RESET ROLE'); }
    }

    // Integration boundary: the transport migration never redefines the core bridge, its view or rewards.
    const sql = readFileSync(SNIPE_TRANSPORT_MIGRATION, 'utf8');
    expect(sql).not.toMatch(/FUNCTION\s+(public\.socialu_snipe|socialu\.snipe_view|socialu\.award_snipe_publication)\s*\(/i);
    expect(sql).not.toMatch(/ALTER\s+FUNCTION|DROP\s+FUNCTION/i);
  } finally { await db.close(); }
}, 60000);

it('binds a ticket to the account, conversation, submission and original file; retries stay stable and changes conflict', async () => {
  const { db, G, H } = await setup();
  try {
    const key = randomUUID();
    const first = snipeStage(1, key, [3, 2]);
    expect(await stageCall(db, 1, 'begin', G, first)).toMatchObject({ state: 'staged', reused: false, staging_key: first.staging_key });
    expect((await db.query<any>('SELECT targets::text AS targets, status, byte_count::int AS bytes, owner_id::int AS owner FROM socialu.snipe_photo_stages')).rows)
      .toEqual([{ targets: '{2,3}', status: 'open', bytes: 6_000_000, owner: 1 }]);

    // Same submission and same original: a new ticket for the same staging object; the old ticket stops working.
    const retry = snipeStage(1, key, [2, 3]);
    expect(await stageCall(db, 1, 'begin', G, retry)).toMatchObject({ state: 'staged', reused: true, staging_key: first.staging_key });
    await fails(stageCall(db, 1, 'claim', G, { ticket_hash: first.ticket_hash }), 'SP404');
    // Changed photo, tags, size, type or conversation under the same key is a different action.
    for (const changed of [snipeStage(1, key, [2, 3], { digest: snipeDigest('photo-b') }), snipeStage(1, key, [2]),
      snipeStage(1, key, [2, 3], { bytes: 6_000_001 }), snipeStage(1, key, [2, 3], { extension: 'png' })])
      await fails(stageCall(db, 1, 'begin', G, changed), 'SN409');
    await fails(stageCall(db, 1, 'begin', H, snipeStage(1, key, [2])), 'SN409');

    // Policy, key shape and eligibility are checked before any ticket exists.
    await fails(stageCall(db, 1, 'begin', G, snipeStage(1, randomUUID(), [2], { bytes: 10_000_001 })), 'SN400');
    await fails(stageCall(db, 1, 'begin', G, { ...snipeStage(1, randomUUID(), [2]), mime_type: 'image/gif' }), 'SN400');
    await fails(stageCall(db, 1, 'begin', G, { ...snipeStage(1, randomUUID(), [2]), staging_key: `stage/${testUid(2)}/${randomUUID()}.jpg` }), 'SN400');
    await fails(stageCall(db, 1, 'begin', G, { ...snipeStage(1, randomUUID(), [2]), staging_key: committedKey(1, randomUUID()) }), 'SN400');
    await fails(stageCall(db, 1, 'begin', G, { ...snipeStage(1, randomUUID(), [2]), ticket_hash: 'short' }), 'SN400');
    await fails(stageCall(db, 1, 'begin', G, snipeStage(1, randomUUID(), [5])), 'SN422');
    await fails(stageCall(db, 6, 'begin', G, snipeStage(6, randomUUID(), [1])), 'SC404');
    expect(await count(db, 'SELECT count(*)::int AS n FROM socialu.snipe_photo_stages')).toBe(1);

    // Another account or another conversation cannot use the ticket; it looks missing.
    await fails(stageCall(db, 2, 'claim', G, { ticket_hash: retry.ticket_hash }), 'SP404');
    await fails(stageCall(db, 1, 'claim', H, { ticket_hash: retry.ticket_hash }), 'SP404');
    await fails(stageCall(db, 1, 'claim', G, { ticket_hash: snipeStage(1, key, [2]).ticket_hash }), 'SP404');

    // One exclusive claim: a concurrent finalize or a re-begin waits; a stale claim holder cannot accept.
    const claimed = await stageCall(db, 1, 'claim', G, { ticket_hash: retry.ticket_hash });
    expect(claimed).toMatchObject({ state: 'claimed', staging_key: first.staging_key, submission_key: key, targets: ['2', '3'],
      content_digest: snipeDigest(), mime_type: 'image/jpeg', byte_count: 6_000_000 });
    await fails(stageCall(db, 1, 'claim', G, { ticket_hash: retry.ticket_hash }), 'SP409');
    await fails(stageCall(db, 1, 'begin', G, snipeStage(1, key, [2, 3])), 'SP409');
    expect(await stageCall(db, 1, 'release', G, { ticket_hash: retry.ticket_hash, claim: claimed.claim })).toEqual({ state: 'open' });
    const claim = (await stageCall(db, 1, 'claim', G, { ticket_hash: retry.ticket_hash })).claim;
    expect(claim).not.toBe(claimed.claim);
    const storage = committedKey(1, key);
    const accept = (claimId: string, storageKey = storage) => stageCall(db, 1, 'accept', G,
      { ticket_hash: retry.ticket_hash, claim: claimId, storage_key: storageKey, mime_type: 'image/jpeg', byte_count: 5_900_000 });
    await fails(accept(claimed.claim), 'SP409');
    await fails(stageCall(db, 1, 'accept', G, { ticket_hash: retry.ticket_hash, claim, storage_key: storage, mime_type: 'image/png', byte_count: 5_900_000 }), 'SN400');
    expect(await count(db, 'SELECT count(*)::int AS n FROM socialu.snipe_requests')).toBe(0);

    // Atomic acceptance through the core bridge: exactly one Pending request; no storage key is returned.
    const accepted = await accept(claim);
    expect(accepted).toMatchObject({ state: 'accepted', created: true, snipe: { status: 'pending', viewer_role: 'photographer' } });
    expect(JSON.stringify(accepted)).not.toMatch(/snipe\/|stage\//);
    const id = accepted.snipe.id as string;
    expect((await snipeCall(db, 1, 'photo', G, id)).storage_key).toBe(storage);

    // Stable retries after a lost response: finalize, begin and a duplicate accept all return the same request.
    expect(await stageCall(db, 1, 'claim', G, { ticket_hash: retry.ticket_hash })).toMatchObject({ state: 'accepted', created: false, snipe: { id } });
    expect(await stageCall(db, 1, 'begin', G, snipeStage(1, key, [3, 2]))).toMatchObject({ state: 'accepted', created: false, snipe: { id } });
    expect(await accept(claim)).toMatchObject({ state: 'accepted', created: false, same_upload: true, snipe: { id } });
    expect(await accept(claim, committedKey(1, key))).toMatchObject({ state: 'accepted', created: false, same_upload: false });
    await fails(stageCall(db, 1, 'begin', G, snipeStage(1, key, [2, 3], { digest: snipeDigest('photo-b') })), 'SN409');
    // Same photo digest, but a different declared size or type: still the accepted key's binding, so a conflict.
    for (const changed of [snipeStage(1, key, [2, 3], { bytes: 6_000_001 }), snipeStage(1, key, [2, 3], { bytes: 5_900_000 }),
      snipeStage(1, key, [2, 3], { extension: 'png' }), { ...snipeStage(1, key, [2, 3]), byte_count: '6000000.0' }])
      await fails(stageCall(db, 1, 'begin', G, changed), 'SN409');
    expect(await stageCall(db, 1, 'begin', G, snipeStage(1, key, [3, 2]))).toMatchObject({ state: 'accepted', created: false, snipe: { id } });
    expect(await count(db, 'SELECT count(*)::int AS n FROM socialu.snipe_requests')).toBe(1);
    expect(await count(db, "SELECT count(*)::int AS n FROM socialu.media_assets WHERE upload_context = 'snipe'")).toBe(1);
    expect((await db.query<any>('SELECT status, snipe_id::text AS snipe FROM socialu.snipe_photo_stages')).rows).toEqual([{ status: 'accepted', snipe: id }]);

    // Reward behavior is the core's, unchanged: 25 points per verified friend, once, at publication.
    await snipeCall(db, 2, 'respond', G, id, { identity: true, sharing: true });
    expect((await snipeCall(db, 3, 'respond', G, id, { identity: true, sharing: true })).snipe.status).toBe('approved');
    expect((await db.query<any>('SELECT student_id::int AS student, points_change::int AS points, reward_units AS units FROM socialu.point_transactions')).rows)
      .toEqual([{ student: 1, points: 50, units: 2 }]);

    // A submission accepted through the legacy multipart route has no ticket: a begin retry returns it as before.
    const legacy = randomUUID();
    const legacyId = (await snipeCall(db, 1, 'create', G, null, { submission_key: legacy, targets: ['4'], ...snipeUpload(1, legacy) })).snipe.id as string;
    expect(await stageCall(db, 1, 'begin', G, snipeStage(1, legacy, [4], { extension: 'png', bytes: 9_000_000 })))
      .toMatchObject({ state: 'accepted', created: false, snipe: { id: legacyId } });
    expect(await count(db, 'SELECT count(*)::int AS n FROM socialu.snipe_photo_stages WHERE submission_key = $1', [legacy])).toBe(0);
  } finally { await db.close(); }
}, 60000);

it('keeps expired and rejected tickets terminal and rechecks eligibility and cooldowns at acceptance', async () => {
  const { db, ids, G } = await setup();
  try {
    const begin = (stage: ReturnType<typeof snipeStage>) => stageCall(db, 1, 'begin', G, stage);
    const claim = (stage: { ticket_hash: string }) => stageCall(db, 1, 'claim', G, { ticket_hash: stage.ticket_hash });
    const accept = (stage: { ticket_hash: string; submission_key: string }, claimId: string) => stageCall(db, 1, 'accept', G,
      { ticket_hash: stage.ticket_hash, claim: claimId, storage_key: committedKey(1, stage.submission_key), mime_type: 'image/jpeg', byte_count: 1000 });
    const expire = (stage: { ticket_hash: string }) => db.query("UPDATE socialu.snipe_photo_stages SET expires_at = now() - INTERVAL '1 second' WHERE ticket_hash = $1", [stage.ticket_hash]);

    // An expired ticket never finalizes, even when its bytes were uploaded, and stays expired.
    const k1 = randomUUID(), s1 = snipeStage(1, k1, [4]);
    await begin(s1); await expire(s1);
    expect(await claim(s1)).toMatchObject({ state: 'expired', error: { code: 'SP410' } });
    expect(await claim(s1)).toMatchObject({ state: 'expired' });
    // The same submission can start over with a new ticket and a new staging object.
    const s1b = snipeStage(1, k1, [4]);
    expect(await begin(s1b)).toMatchObject({ state: 'staged', reused: false, staging_key: s1b.staging_key });
    // Expiring while being checked: the acceptance is refused and nothing is created.
    const c1 = (await claim(s1b)).claim;
    await expire(s1b);
    expect(await accept(s1b, c1)).toMatchObject({ state: 'expired' });
    expect(await claim(s1b)).toMatchObject({ state: 'expired' });

    // A decoder rejection is terminal for the ticket; the claim can no longer accept.
    const s2 = snipeStage(1, randomUUID(), [4]);
    await begin(s2);
    const c2 = (await claim(s2)).claim;
    expect(await stageCall(db, 1, 'reject', G, { ticket_hash: s2.ticket_hash, claim: c2, reason: 'Photos can be at most 4096 × 4096 pixels.' })).toEqual({ state: 'rejected' });
    expect(await claim(s2)).toMatchObject({ state: 'rejected', error: { code: 'SP422', message: 'Photos can be at most 4096 × 4096 pixels.' } });
    await fails(accept(s2, c2), 'SP409');
    // A release or reject by a stale claim holder changes nothing.
    expect(await stageCall(db, 1, 'release', G, { ticket_hash: s2.ticket_hash, claim: c2 })).toEqual({ state: 'rejected' });

    // A cooldown committed by another submission path between claim and acceptance rejects the ticket.
    const s3 = snipeStage(1, randomUUID(), [3]);
    await begin(s3);
    const c3 = (await claim(s3)).claim;
    const other = randomUUID();
    await snipeCall(db, 1, 'create', G, null, { submission_key: other, targets: ['3'], content_digest: snipeDigest('other'),
      storage_key: committedKey(1, other, snipeDigest('other')), mime_type: 'image/jpeg', byte_count: 1000 });
    const cooled = await accept(s3, c3);
    expect(cooled).toMatchObject({ state: 'rejected', error: { code: 'SN429' } });
    expect(JSON.parse(cooled.error.details)[0].friend.id).toBe('3');
    expect(await claim(s3)).toMatchObject({ state: 'rejected', error: { code: 'SN429' } });

    // A friendship that ends between claim and acceptance rejects it too; nothing is created for either.
    const s4 = snipeStage(1, randomUUID(), [4]);
    await begin(s4);
    const c4 = (await claim(s4)).claim;
    await friendship(db, 1, 'remove', 4, ids['1-4']);
    expect(await accept(s4, c4)).toMatchObject({ state: 'rejected', error: { code: 'SN422' } });
    expect(await count(db, 'SELECT count(*)::int AS n FROM socialu.snipe_requests')).toBe(1);
    expect(await count(db, "SELECT count(*)::int AS n FROM socialu.media_assets WHERE upload_context = 'snipe'")).toBe(1);
    // An ineligible ticket is refused at claim time as well, before any download.
    const s5 = snipeStage(1, randomUUID(), [2]);
    await begin(s5);
    await friendship(db, 1, 'remove', 2, ids['1-2']);
    expect(await claim(s5)).toMatchObject({ state: 'rejected', error: { code: 'SN422' } });
  } finally { await db.close(); }
}, 60000);

it('bounds staging per account and only releases staging objects whose upload URL has expired', async () => {
  const { db, G } = await setup();
  try {
    const begin = (student: number, targets: number[]) => { const stage = snipeStage(student, randomUUID(), targets); return stageCall(db, student, 'begin', G, stage).then(() => stage); };
    const live = [await begin(1, [2]), await begin(1, [3]), await begin(1, [4])];
    await fails(begin(1, [2]), 'SP429');
    // Other accounts have their own bound.
    const another = await begin(2, [1]);
    // Discarding a ticket that was never handed out frees a live slot, once.
    expect(await stageCall(db, 1, 'discard', G, { ticket_hash: live[0].ticket_hash })).toEqual({ state: 'rejected' });
    expect(await stageCall(db, 1, 'discard', G, { ticket_hash: live[0].ticket_hash })).toEqual({ state: 'rejected' });
    // Every staging object that may still exist counts until cleanup, even for finished tickets.
    for (let i = 0; i < 17; i++) {
      const stage = await begin(1, [2]);
      await stageCall(db, 1, 'discard', G, { ticket_hash: stage.ticket_hash });
    }
    await fails(begin(1, [2]), 'SP429');

    // Nothing is released while a signed upload URL could still recreate the object.
    expect(await reapCall(db, 'claim')).toEqual({ objects: [] });
    expect(await reapCall(db, 'cleared', { ids: (await db.query<any>('SELECT stage_id::text AS id FROM socialu.snipe_photo_stages')).rows.map((r: any) => r.id) })).toEqual({ cleared: 0 });
    // Student 2's ticket is being checked: a live lease is never expired or released, whatever its deadline.
    await stageCall(db, 2, 'claim', G, { ticket_hash: another.ticket_hash });
    await db.query("UPDATE socialu.snipe_photo_stages SET upload_expires_at = now() - INTERVAL '1 second', expires_at = least(expires_at, now() - INTERVAL '1 second')");

    const batch = (await reapCall(db, 'claim')).objects as { id: string; staging_key: string }[];
    expect(batch).toHaveLength(20);
    expect(batch.every((o) => o.staging_key.startsWith(`stage/${testUid(1)}/`))).toBe(true);
    expect((await db.query<any>("SELECT status FROM socialu.snipe_photo_stages WHERE owner_id = 2")).rows).toEqual([{ status: 'finalizing' }]);
    // Open tickets past their deadline were closed for good before release.
    expect(await stageCall(db, 1, 'claim', G, { ticket_hash: live[1].ticket_hash })).toMatchObject({ state: 'expired' });
    // Leased batches are not handed to a second cleaner.
    expect(await reapCall(db, 'claim')).toEqual({ objects: [] });
    await fails(reapCall(db, 'cleared', { ids: ['abc'] }), 'SN400');
    expect(await reapCall(db, 'cleared', { ids: batch.map((o) => o.id) })).toEqual({ cleared: 20 });
    expect(await count(db, 'SELECT count(*)::int AS n FROM socialu.snipe_photo_stages WHERE object_cleared_at IS NULL AND owner_id = 1')).toBe(0);
    // Cleanup frees the account's bound again.
    await begin(1, [2]);
    // Cleared rows are kept a week for conflict answers, then dropped.
    await db.query("UPDATE socialu.snipe_photo_stages SET object_cleared_at = now() - INTERVAL '8 days' WHERE object_cleared_at IS NOT NULL");
    await reapCall(db, 'cleared', { ids: [] });
    expect(await count(db, 'SELECT count(*)::int AS n FROM socialu.snipe_photo_stages WHERE object_cleared_at IS NOT NULL')).toBe(0);
  } finally { await db.close(); }
}, 60000);
