import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
const { getClient, getUser, rpc, getBucket, upload, remove, sign, storageFetch, buckets } = vi.hoisted(() => ({
  getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn(), getBucket: vi.fn(), upload: vi.fn(), remove: vi.fn(), sign: vi.fn(), storageFetch: vi.fn(), buckets: [] as string[],
}));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
import { POST as begin } from '../../app/api/conversations/[id]/snipes/uploads/route';
import { POST as finalize } from '../../app/api/conversations/[id]/snipes/uploads/finalize/route';

// SRS-510.2 direct transport routes with Auth, PostgREST and Storage replaced in memory; the database side is
// covered against the real SQL in __tests__/database/snipe-photo-transport.test.ts.
const AUTH_ID = '0f7a2d4c-1b2e-4c3d-8e9f-0a1b2c3d4e5f';
const KEY = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const CLAIM = '3b241101-e2bb-4255-8caf-4136c566a962';
const PHOTOS = 'socialu-snipe-photos', STAGING = 'socialu-snipe-staging';
const STAGE_KEY = `stage/${AUTH_ID}/9f1c3a52-6b0e-4a43-9d39-5a3c4c8a6b11.jpg`;
const TICKET = 'snipe-route-test-ticket_'.padEnd(43, 'x');
const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const user = { id: AUTH_ID, email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z', user_metadata: {} };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const pending = { id: '5', status: 'pending', viewer_role: 'photographer', photo_available: true };
type Handler = (args: Record<string, any>) => { data?: unknown; error?: unknown };
let stage: Handler, reap: Handler;
let original: Buffer;
const objects = new Map<string, Uint8Array>();

const base = 'http://localhost/api/conversations/7/snipes/uploads';
const ctx = () => ({ params: Promise.resolve({ id: '7' }) });
const json = (url: string, body: unknown) => new Request(url, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const startBody = (extra: Record<string, unknown> = {}) => ({ submissionKey: KEY.toUpperCase(), targets: ['2', '3'], digest: sha(original), mimeType: 'image/jpeg', byteCount: original.length, ...extra });
const stageCalls = () => rpc.mock.calls.filter(([fn]) => fn === 'socialu_snipe_photo').map(([, args]) => args);
const actions = () => stageCalls().map((args) => args.p_action);
const claimed = (bytes = original, extra: Record<string, unknown> = {}) => ({ data: { state: 'claimed', claim: CLAIM, staging_key: STAGE_KEY, submission_key: KEY,
  targets: ['2', '3'], content_digest: sha(bytes), mime_type: 'image/jpeg', byte_count: bytes.length, ...extra } });
const uploadedKey = () => upload.mock.calls[0]?.[0] as string;

beforeAll(async () => {
  // A real JPEG with embedded metadata; only a re-encoded copy without it may be committed.
  original = await sharp({ create: { width: 60, height: 40, channels: 3, background: '#39775e' } })
    .withExif({ IFD0: { Copyright: 'SocialU transport owner' } }).jpeg().toBuffer();
});
beforeEach(() => {
  vi.resetAllMocks();
  buckets.length = 0; objects.clear();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  vi.stubEnv('SUPABASE_URL', 'http://storage.test');
  objects.set(`${STAGING}/${STAGE_KEY}`, original);
  stage = ({ p_action, p_payload }) => {
    if (p_action === 'begin') return { data: { state: 'staged', reused: false, staging_key: p_payload.staging_key, expires_at: '2026-10-30T12:30:00Z' } };
    if (p_action === 'claim') return claimed();
    if (p_action === 'accept') return { data: { state: 'accepted', created: true, snipe: pending, same_upload: false } };
    return { data: { state: p_action === 'reject' || p_action === 'discard' ? 'rejected' : 'open' } };
  };
  reap = () => ({ data: { objects: [] } });
  getClient.mockReturnValue({ auth: { getUser }, rpc, storage: { getBucket, from: (bucket: string) => { buckets.push(bucket); return { upload, remove, createSignedUploadUrl: sign }; } } });
  getUser.mockResolvedValue({ data: { user }, error: null });
  rpc.mockImplementation(async (fn: string, args: Record<string, any>) => {
    if (fn === 'socialu_session_guard') return { data: true, error: null };
    if (fn === 'socialu_account') return { data: { id: '1', username: 'student1' }, error: null };
    if (fn === 'socialu_snipe_photo') return { data: null, error: null, ...stage(args) };
    if (fn === 'socialu_snipe_photo_reap') return { data: null, error: null, ...reap(args) };
    return { data: null, error: { code: 'PGRST202', message: 'unknown' } };
  });
  getBucket.mockImplementation(async (id: string) => ({ data: { id, public: false }, error: null }));
  sign.mockImplementation(async (key: string) => ({ data: { signedUrl: `http://storage.test/storage/v1/object/upload/sign/${STAGING}/${key}?token=upload-only`, token: 'upload-only', path: key }, error: null }));
  upload.mockResolvedValue({ data: { path: 'x' }, error: null });
  remove.mockResolvedValue({ data: [], error: null });
  // Server-key object reads; a missing object is answered the way Storage does (400, statusCode 404).
  storageFetch.mockImplementation(async (url: string) => {
    const path = decodeURIComponent(new URL(url).pathname.replace(/^\/storage\/v1\/object\//, ''));
    const bytes = objects.get(path);
    return bytes ? new Response(bytes) : new Response(JSON.stringify({ statusCode: '404', error: 'not_found' }), { status: 400 });
  });
  vi.stubGlobal('fetch', storageFetch);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('Begin a direct Snipe photo upload (SRS-510.2, 510.11)', () => {
  it('binds an opaque ticket in the database and returns an upload-only URL for one unpredictable staging key', async () => {
    const res = await begin(json(base, startBody({ p_auth_id: 'victim', student_id: '9', storageKey: 'snipe/x' })), ctx());
    expect(res.status).toBe(201);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const body = await res.json();
    expect(body.ticket).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const [call] = stageCalls();
    expect(call.p_auth_id).toBe(AUTH_ID);
    expect(call.p_action).toBe('begin');
    expect(call.p_conversation_id).toBe('7');
    // The database only ever sees the ticket's hash; every binding comes from this request, nothing else.
    expect(call.p_payload).toEqual({ submission_key: KEY, targets: ['2', '3'], content_digest: sha(original), mime_type: 'image/jpeg',
      byte_count: original.length, ticket_hash: sha(body.ticket), staging_key: expect.stringMatching(new RegExp(`^stage/${AUTH_ID}/[0-9a-f-]{36}\\.jpg$`)) });
    expect(sign).toHaveBeenCalledWith(call.p_payload.staging_key, { upsert: false });
    expect(body.upload).toEqual({ url: expect.stringContaining('/object/upload/sign/'), method: 'PUT', headers: { 'Content-Type': 'image/jpeg' } });
    // Both buckets must be private; only the staging bucket is used to sign; nothing committed is revealed.
    expect(getBucket.mock.calls.map(([id]) => id).sort()).toEqual([PHOTOS, STAGING]);
    expect(buckets).toEqual([STAGING]);
    expect(JSON.stringify(body)).not.toMatch(/snipe\/|ticket_hash/);
    expect(JSON.stringify(body)).not.toContain(sha(body.ticket));
  });
  it('returns an accepted submission on retry without issuing any upload URL', async () => {
    stage = () => ({ data: { state: 'accepted', created: false, snipe: pending } });
    const res = await begin(json(base, startBody()), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ created: false, snipe: pending });
    expect(sign).not.toHaveBeenCalled();
  });
  // Only the overrides are listed here: the body itself is built when the test runs, after the fixture exists.
  it.each([
    ['a photo over 10,000,000 bytes', { byteCount: 10_000_001 }, 'SNIPE_PHOTO_INVALID'],
    ['a GIF', { mimeType: 'image/gif' }, 'SNIPE_PHOTO_INVALID'],
    ['an empty file', { byteCount: 0 }, 'SNIPE_PHOTO_INVALID'],
    ['a fractional size', { byteCount: 12.5 }, 'SNIPE_PHOTO_INVALID'],
    ['a malformed digest', { digest: 'ABC' }, 'SNIPE_PHOTO_INVALID'],
    ['a malformed key', { submissionKey: 'retry' }, undefined],
    ['no friends', { targets: [] }, undefined],
    ['numeric friend IDs', { targets: [2] }, undefined],
  ])('rejects %s before the database or storage', async (_name, extra: Record<string, unknown>, code) => {
    const res = await begin(json(base, startBody(extra)), ctx());
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(code);
    expect(stageCalls()).toHaveLength(0); expect(sign).not.toHaveBeenCalled();
  });
  it('accepts only small JSON: an image body or form is refused unread', async () => {
    const form = new FormData();
    form.append('photo', new File([original], 'snipe.jpg', { type: 'image/jpeg' }));
    expect((await begin(new Request(base, { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form }), ctx())).status).toBe(400);
    const big = await begin(json(base, startBody({ padding: 'x'.repeat(9000) })), ctx());
    expect(big.status).toBe(413);
    expect(stageCalls()).toHaveLength(0);
  });
  it('maps conflicts and per-account limits from the database', async () => {
    stage = () => ({ error: { code: 'SN409', message: 'This submission was already used for a different Snipe. Start a new one.' } });
    const conflict = await begin(json(base, startBody()), ctx());
    expect([conflict.status, (await conflict.json()).code]).toEqual([409, 'SNIPE_CONFLICT']);
    stage = () => ({ error: { code: 'SP429', message: 'Too many photo uploads are in progress. Finish one or wait a few minutes, then try again.' } });
    const limited = await begin(json(base, startBody()), ctx());
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: 'Too many photo uploads are in progress. Finish one or wait a few minutes, then try again.', code: 'SNIPE_UPLOAD_LIMIT' });
    expect(sign).not.toHaveBeenCalled();
  });
  it('refuses to stage into a public bucket', async () => {
    getBucket.mockImplementation(async (id: string) => ({ data: { id, public: id === STAGING }, error: null }));
    const res = await begin(json(base, startBody()), ctx());
    expect([res.status, (await res.json()).code]).toEqual([503, 'SNIPE_STORAGE_PUBLIC']);
    expect(stageCalls()).toHaveLength(0);
  });
  it('closes a new ticket whose upload URL could not be issued; a reused ticket goes straight to finalize', async () => {
    sign.mockResolvedValue({ data: null, error: { message: 'unavailable' } });
    const res = await begin(json(base, startBody()), ctx());
    expect(res.status).toBe(503);
    const [started, discarded] = stageCalls();
    expect(discarded).toMatchObject({ p_action: 'discard', p_payload: { ticket_hash: started.p_payload.ticket_hash } });
    rpc.mockClear();
    stage = ({ p_action }) => ({ data: p_action === 'begin' ? { state: 'staged', reused: true, staging_key: STAGE_KEY, expires_at: '2026-10-30T12:30:00Z' } : null });
    const reused = await begin(json(base, startBody()), ctx());
    expect(reused.status).toBe(201);
    expect((await reused.json()).upload).toBeNull();
    expect(actions()).toEqual(['begin']);
  });
  it('cleans up only expired staging objects, in the staging bucket, and records only what was removed', async () => {
    const stale = [{ id: '11', staging_key: `stage/${AUTH_ID}/${KEY}.png` }, { id: '12', staging_key: `snipe/${AUTH_ID}/${KEY}/x/${KEY}.png` }];
    reap = ({ p_action }) => ({ data: p_action === 'claim' ? { objects: stale } : { cleared: 1 } });
    expect((await begin(json(base, startBody()), ctx())).status).toBe(201);
    expect(remove.mock.calls).toEqual([[[stale[0].staging_key]]]);
    expect(buckets.filter((b) => b === PHOTOS)).toEqual([]);
    const reaps = rpc.mock.calls.filter(([fn]) => fn === 'socialu_snipe_photo_reap').map(([, args]) => args);
    expect(reaps).toEqual([{ p_action: 'claim', p_payload: {} }, { p_action: 'cleared', p_payload: { ids: ['11'] } }]);
    // A failed removal is never recorded as cleared, and never fails the submission.
    rpc.mockClear(); remove.mockResolvedValue({ data: null, error: { message: 'down' } });
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await begin(json(base, startBody()), ctx())).status).toBe(201);
    expect(rpc.mock.calls.filter(([fn, args]) => fn === 'socialu_snipe_photo_reap' && args.p_action === 'cleared')).toEqual([]);
    quiet.mockRestore();
  });
});

describe('Finalize a direct Snipe photo upload (SRS-510.2, 510.3, 510.11)', () => {
  const finish = (ticket = TICKET) => finalize(json(base + '/finalize', { ticket, p_auth_id: 'victim' }), ctx());

  it('verifies the ORIGINAL bytes, commits only a re-encoded copy under a new key, and accepts atomically', async () => {
    const res = await finish();
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ created: true, snipe: pending });
    expect(JSON.stringify(body)).not.toMatch(/snipe\/|stage\//);
    expect(actions()).toEqual(['claim', 'accept']);
    const [claim, accept] = stageCalls();
    // Only the ticket's hash and the verified account; nothing else from the request body is forwarded.
    expect(claim).toEqual({ p_auth_id: AUTH_ID, p_action: 'claim', p_conversation_id: '7', p_payload: { ticket_hash: sha(TICKET) } });
    // The staged original is read with the server key from the staging bucket.
    expect(storageFetch.mock.calls[0][0]).toBe(`http://storage.test/storage/v1/object/${STAGING}/${STAGE_KEY}`);
    const [key, bytes, options] = upload.mock.calls[0];
    expect(key).toMatch(new RegExp(`^snipe/${AUTH_ID}/${KEY}/${sha(original)}/[0-9a-f-]{36}\\.jpg$`));
    expect(options).toEqual({ contentType: 'image/jpeg', upsert: false });
    expect((await sharp(bytes).metadata()).exif).toBeUndefined();
    expect(Buffer.compare(bytes, original)).not.toBe(0);
    expect(accept).toEqual({ p_auth_id: AUTH_ID, p_action: 'accept', p_conversation_id: '7',
      p_payload: { ticket_hash: sha(TICKET), claim: CLAIM, storage_key: key, mime_type: 'image/jpeg', byte_count: bytes.byteLength } });
    // Only the staged original is deleted (the reaper deletes it again once its upload URL expires).
    expect(remove.mock.calls).toEqual([[[STAGE_KEY]]]);
    expect(buckets.filter((b) => b === PHOTOS)).toHaveLength(1);
  });
  it.each([
    ['a file that changed after begin', async () => { objects.set(`${STAGING}/${STAGE_KEY}`, Buffer.from(original).fill(7, 200, 210)); return claimed(); }],
    ['an object larger than declared', async () => { objects.set(`${STAGING}/${STAGE_KEY}`, Buffer.concat([original, Buffer.alloc(1)])); return claimed(); }],
    ['an object shorter than declared', async () => { objects.set(`${STAGING}/${STAGE_KEY}`, original.subarray(0, 100)); return claimed(); }],
  ])('rejects %s without decoding or committing it', async (_name, prepare) => {
    const claim = await prepare();
    stage = ({ p_action }) => (p_action === 'claim' ? claim : { data: { state: 'rejected' } });
    const res = await finish();
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'The uploaded photo does not match the one you chose. Start the Snipe again.', code: 'SNIPE_PHOTO_INVALID' });
    expect(actions()).toEqual(['claim', 'reject']);
    expect(stageCalls()[1].p_payload).toEqual({ ticket_hash: sha(TICKET), claim: CLAIM, reason: 'The uploaded photo does not match the one you chose. Start the Snipe again.' });
    expect(upload).not.toHaveBeenCalled();
    expect(remove.mock.calls).toEqual([[[STAGE_KEY]]]);
  });
  it.each([
    ['wider than 4096 pixels', () => sharp({ create: { width: 4097, height: 1, channels: 3, background: '#000' } }).jpeg().toBuffer(), 'image/jpeg',
      'Photos can be at most 4096 × 4096 pixels.'],
    ['a PNG declared as JPEG', () => sharp({ create: { width: 8, height: 8, channels: 3, background: '#000' } }).png().toBuffer(), 'image/jpeg',
      'The file type does not match its contents. Choose a real JPEG or PNG photo.'],
    ['an SVG', async () => Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'image/png', 'Only JPEG and PNG photos are supported.'],
    ['a truncated JPEG', async () => original.subarray(0, original.length - 40), 'image/jpeg', 'This photo could not be read. Choose a different JPEG or PNG photo.'],
  ])('rejects a stored photo %s with the decoder reason, terminally', async (_name, make, mimeType, message) => {
    const bytes = await make();
    objects.set(`${STAGING}/${STAGE_KEY}`, bytes);
    stage = ({ p_action }) => (p_action === 'claim' ? claimed(bytes, { mime_type: mimeType }) : { data: { state: 'rejected' } });
    const res = await finish();
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: message, code: 'SNIPE_PHOTO_INVALID' });
    expect(actions()).toEqual(['claim', 'reject']);
    expect(upload).not.toHaveBeenCalled();
  });
  it('gives the claim back when the upload has not arrived or storage is unavailable', async () => {
    objects.clear();
    const missing = await finish();
    expect([missing.status, (await missing.json()).code]).toEqual([409, 'SNIPE_UPLOAD_MISSING']);
    expect(actions()).toEqual(['claim', 'release']);
    expect(stageCalls()[1].p_payload).toEqual({ ticket_hash: sha(TICKET), claim: CLAIM });
    rpc.mockClear();
    storageFetch.mockResolvedValue(new Response('busy', { status: 503 }));
    expect((await finish()).status).toBe(503);
    expect(actions()).toEqual(['claim', 'release']);
    rpc.mockClear();
    storageFetch.mockRejectedValue(new TypeError('fetch failed'));
    expect((await finish()).status).toBe(503);
    expect(actions()).toEqual(['claim', 'release']);
    expect(upload).not.toHaveBeenCalled();
  });
  it.each([
    ['an expired ticket', { data: { state: 'expired', error: { code: 'SP410', message: 'This photo upload expired. Start the Snipe again.' } } }, 410, 'SNIPE_UPLOAD_EXPIRED'],
    ['an earlier decoder rejection', { data: { state: 'rejected', error: { code: 'SP422', message: 'Photos can be at most 10 MB.' } } }, 400, 'SNIPE_PHOTO_INVALID'],
    ['another account or conversation', { error: { code: 'SP404', message: 'This photo upload is no longer available. Start the Snipe again.' } }, 404, 'SNIPE_UPLOAD_NOT_AVAILABLE'],
    ['a concurrent finalize', { error: { code: 'SP409', message: 'This photo is already being checked. Try again in a moment.' } }, 409, 'SNIPE_UPLOAD_BUSY'],
  ])('answers %s from the ticket without reading storage', async (_name, answer, status, code) => {
    stage = () => answer;
    const res = await finish();
    expect([res.status, (await res.json()).code]).toEqual([status, code]);
    expect(actions()).toEqual(['claim']);
    expect(storageFetch).not.toHaveBeenCalled(); expect(upload).not.toHaveBeenCalled();
  });
  it('explains a cooldown that rejected the ticket, naming the friend', async () => {
    const cooldowns = [{ friend: { id: '2', name: 'Student 2', username: 'student2' }, next_eligible_at: '2026-10-31T12:00:00Z' }];
    stage = () => ({ data: { state: 'rejected', error: { code: 'SN429', message: 'A selected friend was Sniped by you in the last 24 hours.', details: JSON.stringify(cooldowns) } } });
    const res = await finish();
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ code: 'SNIPE_COOLDOWN', cooldowns });
  });
  it('returns the saved request for a finalize repeated after acceptance', async () => {
    stage = () => ({ data: { state: 'accepted', created: false, snipe: pending } });
    const res = await finish();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ created: false, snipe: pending });
    expect(storageFetch).not.toHaveBeenCalled(); expect(upload).not.toHaveBeenCalled();
  });
  it('removes its committed copy when acceptance was definitely refused', async () => {
    stage = ({ p_action }) => p_action === 'claim' ? claimed()
      : { data: { state: 'rejected', error: { code: 'SN422', message: 'Only current friends in this conversation can be tagged. Refresh and choose again.' } } };
    const rejected = await finish();
    expect([rejected.status, (await rejected.json()).code]).toEqual([409, 'SNIPE_TARGET_INELIGIBLE']);
    expect(remove).toHaveBeenCalledWith([uploadedKey()]);
    // A lost claim (another finalize took over) is a database error: nothing was committed either.
    upload.mockClear(); remove.mockClear();
    stage = ({ p_action }) => p_action === 'claim' ? claimed() : { error: { code: 'SP409', message: 'This photo check took too long. Please try again.' } };
    expect((await finish()).status).toBe(409);
    expect(remove).toHaveBeenCalledWith([uploadedKey()]);
    upload.mockClear(); remove.mockClear();
    stage = ({ p_action }) => p_action === 'claim' ? claimed() : { data: { state: 'expired', error: { code: 'SP410', message: 'This photo upload expired. Start the Snipe again.' } } };
    expect((await finish()).status).toBe(410);
    expect(remove).toHaveBeenCalledWith([uploadedKey()]);
  });
  it('keeps every object when the acceptance outcome is uncertain, so a committed photo is never deleted', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    stage = ({ p_action }) => p_action === 'claim' ? claimed() : { error: { message: 'TypeError: fetch failed', code: '' } };
    const res = await finish();
    expect(res.status).toBe(503);
    expect(remove).not.toHaveBeenCalled();
    expect(actions()).toEqual(['claim', 'accept']);
    quiet.mockRestore();
  });
  it('removes its own committed copy only when a concurrent path committed a different photo', async () => {
    stage = ({ p_action }) => p_action === 'claim' ? claimed() : { data: { state: 'accepted', created: false, snipe: pending, same_upload: false } };
    expect((await finish()).status).toBe(200);
    expect(remove.mock.calls).toEqual([[[uploadedKey()]], [[STAGE_KEY]]]);
    upload.mockClear(); remove.mockClear();
    stage = ({ p_action }) => p_action === 'claim' ? claimed() : { data: { state: 'accepted', created: false, snipe: pending, same_upload: true } };
    expect((await finish()).status).toBe(200);
    expect(remove.mock.calls).toEqual([[[STAGE_KEY]]]);
  });
  it('releases the claim and removes a partial copy when the committed upload fails', async () => {
    upload.mockResolvedValue({ data: null, error: { message: 'Duplicate' } });
    const res = await finish();
    expect(res.status).toBe(503);
    expect(actions()).toEqual(['claim', 'release']);
    expect(remove).toHaveBeenCalledWith([uploadedKey()]);
  });
  it('requires a well-formed ticket in small JSON before any call', async () => {
    expect((await finish('short')).status).toBe(400);
    const form = new FormData(); form.append('ticket', TICKET);
    expect((await finalize(new Request(base + '/finalize', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: form }), ctx())).status).toBe(400);
    expect(stageCalls()).toHaveLength(0);
  });
});
