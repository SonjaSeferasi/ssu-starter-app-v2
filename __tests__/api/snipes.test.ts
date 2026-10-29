import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
const { getClient, getUser, rpc, getBucket, upload, download, remove, buckets } = vi.hoisted(() => ({
  getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn(), getBucket: vi.fn(), upload: vi.fn(), download: vi.fn(), remove: vi.fn(), buckets: [] as string[],
}));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
import { GET as list, POST as submit } from '../../app/api/conversations/[id]/snipes/route';
import { PATCH as act } from '../../app/api/conversations/[id]/snipes/[snipeId]/route';
import { GET as photo } from '../../app/api/conversations/[id]/snipes/[snipeId]/photo/route';

const AUTH_ID = '0f7a2d4c-1b2e-4c3d-8e9f-0a1b2c3d4e5f';
const KEY = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const BUCKET = 'socialu-snipe-photos';
const digestOf = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const user = { id: AUTH_ID, email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z', user_metadata: {} };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const pending = { id: '5', status: 'pending', viewer_role: 'photographer', photo_available: true };
type Handler = (args: Record<string, any>) => { data?: unknown; error?: unknown };
let snipe: Handler;
let sessionValid = true;
let account: { data?: unknown; error?: unknown };
let jpeg: Buffer;

const base = 'http://localhost/api/conversations/7/snipes';
const headers = (auth = token) => (auth ? { Authorization: 'Bearer ' + auth } : {}) as Record<string, string>;
const ctx = (id = '7') => ({ params: Promise.resolve({ id }) });
const snipeCtx = (id = '7', snipeId = '5') => ({ params: Promise.resolve({ id, snipeId }) });
const snipeCalls = () => rpc.mock.calls.filter(([fn]) => fn === 'socialu_snipe').map(([, args]) => args);
const actions = () => snipeCalls().map((args) => args.p_action);
function form(fields: { photos?: File[]; key?: string; targets?: string[]; extra?: Record<string, string> } = {}) {
  const body = new FormData();
  for (const file of fields.photos ?? [new File([jpeg], 'snipe.jpg', { type: 'image/jpeg' })]) body.append('photo', file);
  body.append('submissionKey', fields.key ?? KEY.toUpperCase());
  for (const id of fields.targets ?? ['2', '3']) body.append('target', id);
  for (const [name, value] of Object.entries(fields.extra ?? {})) body.append(name, value);
  return new Request(base, { method: 'POST', headers: headers(), body });
}
const patch = (body: unknown) => new Request(base + '/5', { method: 'PATCH', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

beforeAll(async () => { jpeg = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#39775e' } }).jpeg().toBuffer(); });
beforeEach(() => {
  vi.resetAllMocks();
  buckets.length = 0;
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  sessionValid = true;
  account = { data: { id: '1', username: 'student1' }, error: null };
  snipe = ({ p_action }) => p_action === 'prepare' ? { data: { created: false, snipe: null } }
    : p_action === 'create' ? { data: { created: true, snipe: pending } }
    : p_action === 'list' ? { data: { student_id: '1', kind: 'group', targets: [], snipes: [] } }
    : { data: null, error: { code: 'SN404', message: 'Snipe not available.' } };
  getClient.mockReturnValue({ auth: { getUser }, rpc, storage: { getBucket, from: (bucket: string) => { buckets.push(bucket); return { upload, download, remove }; } } });
  getUser.mockResolvedValue({ data: { user }, error: null });
  rpc.mockImplementation(async (fn: string, args: Record<string, any>) => {
    if (fn === 'socialu_session_guard') return { data: sessionValid, error: null };
    if (fn === 'socialu_account') return account;
    if (fn === 'socialu_snipe') return { data: null, error: null, ...snipe(args) };
    return { data: null, error: { code: 'PGRST202', message: 'unknown' } };
  });
  getBucket.mockResolvedValue({ data: { id: BUCKET, public: false }, error: null });
  upload.mockResolvedValue({ data: { path: 'x' }, error: null });
  remove.mockResolvedValue({ data: [], error: null });
});

describe('Snipe list (SRS-510.4, 512.1, 512.2)', () => {
  it('returns the private Snipe view for the verified student only, never cached', async () => {
    const res = await list(new Request(base, { headers: headers() }), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(snipeCalls()).toEqual([{ p_auth_id: AUTH_ID, p_action: 'list', p_conversation_id: '7', p_snipe_id: null, p_payload: {} }]);
  });
  it('returns the verified student’s own rate and confirmed balance, ignoring any supplied account (SRS-521.5)', async () => {
    const rewarded = { ...pending, status: 'approved', reward: { awarded: true, verified_friends: 2, points_per_friend: 25, points: 50, recorded_at: '2026-10-29T12:00:00Z', balance_after: 50 } };
    snipe = () => ({ data: { student_id: '1', kind: 'group', rewards: { points_per_friend: 25, balance: 50 }, targets: [], snipes: [rewarded] } });
    const res = await list(new Request(base + '?student_id=9&p_auth_id=victim', { headers: headers() }), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toMatchObject({ rewards: { points_per_friend: 25, balance: 50 }, snipes: [rewarded] });
    expect(snipeCalls()).toEqual([{ p_auth_id: AUTH_ID, p_action: 'list', p_conversation_id: '7', p_snipe_id: null, p_payload: {} }]);
  });
  it('requires sign-in, a live session and an active account before any Snipe call', async () => {
    expect((await list(new Request(base, { headers: headers('') }), ctx())).status).toBe(401);
    sessionValid = false;
    expect((await list(new Request(base, { headers: headers() }), ctx())).status).toBe(401);
    sessionValid = true;
    account = { data: null, error: { code: '42501', message: 'Your account requires verification or account support.' } };
    expect((await list(new Request(base, { headers: headers() }), ctx())).status).toBe(403);
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });
    expect((await list(new Request(base, { headers: headers() }), ctx())).status).toBe(403);
    expect(snipeCalls()).toHaveLength(0);
  });
  it('gives non-participants and malformed IDs the same answer as a missing conversation', async () => {
    const bad = await list(new Request(base, { headers: headers() }), ctx('7 OR 1=1'));
    expect(bad.status).toBe(404); expect(snipeCalls()).toHaveLength(0);
    snipe = () => ({ error: { code: 'SC404', message: 'Conversation not available.' } });
    const res = await list(new Request(base, { headers: headers() }), ctx());
    expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: 'Conversation not available.' });
  });
  it('does not fall back to anonymous database access', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect((await list(new Request(base, { headers: headers() }), ctx())).status).toBe(503);
    expect(snipeCalls()).toHaveLength(0);
  });
});

describe('Snipe submission (SRS-510.2 to 510.11, 513.9)', () => {
  it('validates, uploads privately with an attempt-specific key, then creates one pending request', async () => {
    const res = await submit(form({ extra: { p_auth_id: 'victim', submitter_id: '99' } }), ctx());
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ created: true, snipe: pending });
    expect(actions()).toEqual(['prepare', 'create']);
    const [prepare, create] = snipeCalls();
    const digest = digestOf(jpeg);
    expect(prepare).toEqual({ p_auth_id: AUTH_ID, p_action: 'prepare', p_conversation_id: '7', p_snipe_id: null, p_payload: { submission_key: KEY, targets: ['2', '3'], content_digest: digest } });
    // Only the dedicated private Snipe bucket is touched, never the general media bucket.
    expect(buckets.length).toBeGreaterThan(0);
    expect(buckets.every((b) => b === BUCKET)).toBe(true);
    expect(getBucket).toHaveBeenCalledWith(BUCKET);
    const [storageKey, bytes, options] = upload.mock.calls[0];
    expect(storageKey).toMatch(new RegExp(`^snipe/${AUTH_ID}/${KEY}/${digest}/[0-9a-f-]{36}\\.jpg$`));
    expect(options).toEqual({ contentType: 'image/jpeg', upsert: false });
    expect(create.p_auth_id).toBe(AUTH_ID);
    expect(create.p_payload).toEqual({ submission_key: KEY, targets: ['2', '3'], content_digest: digest, storage_key: storageKey, mime_type: 'image/jpeg', byte_count: bytes.byteLength });
    expect(JSON.stringify(body)).not.toContain('snipe/');
    expect(remove).not.toHaveBeenCalled();
  });
  it('returns an accepted request on retry without uploading again', async () => {
    snipe = ({ p_action }) => ({ data: p_action === 'prepare' ? { created: false, snipe: pending } : null });
    const res = await submit(form(), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ created: false, snipe: pending });
    expect(upload).not.toHaveBeenCalled(); expect(getBucket).not.toHaveBeenCalled(); expect(actions()).toEqual(['prepare']);
  });
  it.each([
    ['SVG labelled as SVG', () => form({ photos: [new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'x.svg', { type: 'image/svg+xml' })] }), []],
    ['more than one photo', () => form({ photos: [new File([jpeg], 'a.jpg', { type: 'image/jpeg' }), new File([jpeg], 'b.jpg', { type: 'image/jpeg' })] }), []],
    ['a file over 10,000,000 bytes', () => form({ photos: [new File([new Uint8Array(10_000_001)], 'big.jpg', { type: 'image/jpeg' })] }), []],
    ['SVG disguised as PNG', () => form({ photos: [new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'x.png', { type: 'image/png' })] }), []],
    ['a PNG disguised as JPEG', () => form({ photos: [new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])], 'x.jpg', { type: 'image/jpeg' })] }), []],
  ])('rejects %s with a reason and stores nothing', async (_name, request, expected) => {
    const res = await submit(request(), ctx());
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('SNIPE_PHOTO_INVALID');
    expect(actions()).toEqual(expected);
    expect(upload).not.toHaveBeenCalled();
  });
  it('rejects missing tags or a malformed submission key before touching the database', async () => {
    expect((await submit(form({ targets: [] }), ctx())).status).toBe(400);
    expect((await submit(form({ targets: ['2', 'abc'] }), ctx())).status).toBe(400);
    expect((await submit(form({ key: 'not-a-uuid' }), ctx())).status).toBe(400);
    expect(snipeCalls()).toHaveLength(0);
  });
  it('rejects a cooled-down selection before upload and names the friend and next time', async () => {
    const cooldowns = [{ friend: { id: '2', name: 'Student 2', username: 'student2' }, next_eligible_at: '2026-10-26T12:00:00Z' }];
    snipe = () => ({ error: { code: 'SN429', message: 'A selected friend was Sniped by you in the last 24 hours.', details: JSON.stringify(cooldowns) } });
    const res = await submit(form(), ctx());
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ code: 'SNIPE_COOLDOWN', cooldowns });
    expect(upload).not.toHaveBeenCalled();
  });
  it('refuses to upload Snipes into a public bucket', async () => {
    getBucket.mockResolvedValue({ data: { id: BUCKET, public: true }, error: null });
    const res = await submit(form(), ctx());
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe('SNIPE_STORAGE_PUBLIC');
    expect(upload).not.toHaveBeenCalled(); expect(actions()).toEqual(['prepare']);
  });
  it('removes the upload when the database definitely rejected the request', async () => {
    snipe = ({ p_action }) => p_action === 'prepare' ? { data: { created: false, snipe: null } }
      : { error: { code: 'SN422', message: 'Only current friends in this conversation can be tagged. Refresh and choose again.' } };
    const res = await submit(form(), ctx());
    expect(res.status).toBe(409);
    expect(remove).toHaveBeenCalledWith([upload.mock.calls[0][0]]);
  });
  it('keeps the upload when the create outcome is uncertain, so a committed photo is never deleted', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    snipe = ({ p_action }) => p_action === 'prepare' ? { data: { created: false, snipe: null } } : { error: { message: 'TypeError: fetch failed', code: '' } };
    const res = await submit(form(), ctx());
    expect(res.status).toBe(503);
    expect(remove).not.toHaveBeenCalled();
    quiet.mockRestore();
  });
  it('removes its own upload only when a concurrent retry committed a different photo', async () => {
    snipe = ({ p_action }) => ({ data: p_action === 'prepare' ? { created: false, snipe: null } : { created: false, snipe: pending, same_upload: false } });
    const res = await submit(form(), ctx());
    expect(res.status).toBe(200);
    expect(remove).toHaveBeenCalledWith([upload.mock.calls[0][0]]);
    remove.mockClear();
    snipe = ({ p_action }) => ({ data: p_action === 'prepare' ? { created: false, snipe: null } : { created: false, snipe: pending, same_upload: true } });
    expect((await submit(form(), ctx())).status).toBe(200);
    expect(remove).not.toHaveBeenCalled();
  });
  it('refuses an accepted key reused with a different photo, before any upload', async () => {
    const other = await sharp({ create: { width: 30, height: 40, channels: 3, background: '#c0ddcb' } }).jpeg().toBuffer();
    snipe = ({ p_payload }) => p_payload.content_digest === digestOf(jpeg)
      ? { data: { created: false, snipe: pending } }
      : { error: { code: 'SN409', message: 'This submission was already used for a different Snipe. Start a new one.' } };
    const res = await submit(form({ photos: [new File([other], 'other.jpg', { type: 'image/jpeg' })] }), ctx());
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('SNIPE_CONFLICT');
    expect(snipeCalls()[0].p_payload.content_digest).toBe(digestOf(other));
    expect(upload).not.toHaveBeenCalled(); expect(actions()).toEqual(['prepare']);
  });
  it('after an uncertain commit, a retry removes only its own new object, never the possibly committed one', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    snipe = ({ p_action }) => p_action === 'prepare' ? { data: { created: false, snipe: null } } : { error: { message: 'TypeError: fetch failed', code: '' } };
    expect((await submit(form(), ctx())).status).toBe(503);
    const firstKey = upload.mock.calls[0][0];
    // The first attempt did commit, but a concurrent path reached create before prepare saw it.
    snipe = ({ p_action, p_payload }) => ({ data: p_action === 'prepare' ? { created: false, snipe: null }
      : { created: false, snipe: pending, same_upload: p_payload.storage_key === firstKey } });
    expect((await submit(form(), ctx())).status).toBe(200);
    const secondKey = upload.mock.calls[1][0];
    expect(secondKey).not.toBe(firstKey);
    expect(remove.mock.calls).toEqual([[[secondKey]]]);
    quiet.mockRestore();
  });
});

describe('Snipe answers, withdrawal and removal (SRS-511, 514)', () => {
  it('sends only the answered question, from the verified account', async () => {
    snipe = () => ({ data: { result: 'saved', snipe: pending } });
    const res = await act(patch({ action: 'respond', identity: true, p_auth_id: 'victim', student_id: '9' }), snipeCtx());
    expect(res.status).toBe(200);
    expect(snipeCalls()).toEqual([{ p_auth_id: AUTH_ID, p_action: 'respond', p_conversation_id: '7', p_snipe_id: '5', p_payload: { identity: true } }]);
  });
  it.each([[{ action: 'respond' }], [{ action: 'respond', identity: 'yes' }], [{ action: 'respond', sharing: null }], [{ action: 'approve' }]])(
    'rejects %j without calling the database', async (body) => {
      expect((await act(patch(body), snipeCtx())).status).toBe(400);
      expect(snipeCalls()).toHaveLength(0);
    });
  it('reports a closed or expired request with its stored outcome', async () => {
    const expired = { ...pending, status: 'expired', terminal_reason: 'Not every tagged friend answered within 24 hours' };
    snipe = () => ({ data: { result: 'expired', snipe: expired } });
    const res = await act(patch({ action: 'respond', sharing: true }), snipeCtx());
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'SNIPE_CLOSED', snipe: expired });
  });
  it('reports a publishing answer rolled back with its reward as retryable, saving nothing (SRS-525, NFR-49)', async () => {
    const message = 'Snipe rewards are unavailable right now, so your answer was not saved. Please try again later.';
    snipe = () => ({ error: { code: 'SN503', message } });
    const res = await act(patch({ action: 'respond', sharing: true, points: 9999 }), snipeCtx());
    expect(res.status).toBe(503);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ error: message, code: 'SNIPE_REWARDS_UNAVAILABLE' });
    // No client-supplied amount ever reaches the database (SRS-523.8).
    expect(snipeCalls()).toEqual([{ p_auth_id: AUTH_ID, p_action: 'respond', p_conversation_id: '7', p_snipe_id: '5', p_payload: { sharing: true } }]);
  });
  it('maps permission and visibility answers without revealing hidden requests', async () => {
    snipe = () => ({ error: { code: 'SN403', message: 'Only the photographer or a tagged friend can remove this Snipe.' } });
    expect((await act(patch({ action: 'remove' }), snipeCtx())).status).toBe(403);
    snipe = () => ({ error: { code: 'SN404', message: 'Snipe not available.' } });
    const hidden = await act(patch({ action: 'withdraw' }), snipeCtx());
    expect(hidden.status).toBe(404); expect(await hidden.json()).toEqual({ error: 'Snipe not available.' });
    expect((await act(patch({ action: 'withdraw' }), snipeCtx('7', '0'))).status).toBe(404);
  });
});

describe('Snipe photo reads (SRS-511.1, 514.6)', () => {
  const get = (auth = token) => new Request(base + '/5/photo', { headers: headers(auth) });
  it('streams an allowed photo through the authorized no-store route', async () => {
    snipe = () => ({ data: { storage_key: `snipe/${AUTH_ID}/${KEY}/a.jpg`, mime_type: 'image/jpeg', byte_count: jpeg.length } });
    download.mockResolvedValue({ data: new Blob([jpeg], { type: 'application/octet-stream' }), error: null });
    const res = await photo(get(), snipeCtx());
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer())).toEqual(jpeg);
    expect(res.headers.get('Content-Type')).toBe('image/jpeg');
    expect(res.headers.get('Cache-Control')).toContain('no-store');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(download).toHaveBeenCalledWith(`snipe/${AUTH_ID}/${KEY}/a.jpg`);
    expect(buckets).toEqual([BUCKET]);
    expect([...res.headers.values()].join(' ')).not.toContain('snipe/');
    // Checked before the download and again after it.
    expect(actions()).toEqual(['photo', 'photo']);
    expect(snipeCalls()[0]).toMatchObject({ p_auth_id: AUTH_ID, p_action: 'photo', p_snipe_id: '5' });
  });
  it('sends nothing when the Snipe was withdrawn while its bytes were downloading', async () => {
    let checks = 0;
    snipe = () => (++checks === 1 ? { data: { storage_key: `snipe/${AUTH_ID}/${KEY}/a.jpg`, mime_type: 'image/jpeg' } }
      : { error: { code: 'SN404', message: 'Snipe not available.' } });
    download.mockResolvedValue({ data: new Blob([jpeg]), error: null });
    const res = await photo(get(), snipeCtx());
    expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: 'Snipe not available.' });
    expect(download).toHaveBeenCalledTimes(1); expect(checks).toBe(2);
  });
  it('rechecks access on every read: hidden, removed and missing photos look the same', async () => {
    const res = await photo(get(), snipeCtx());
    expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: 'Snipe not available.' });
    expect(download).not.toHaveBeenCalled();
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    snipe = () => ({ data: { storage_key: 'snipe/gone.jpg', mime_type: 'image/jpeg' } });
    download.mockResolvedValue({ data: null, error: { message: 'Object not found' } });
    const gone = await photo(get(), snipeCtx());
    expect(gone.status).toBe(404); expect(await gone.json()).toEqual({ error: 'Snipe not available.' });
    quiet.mockRestore();
  });
  it('requires a live signed-in session before any storage read', async () => {
    expect((await photo(get(''), snipeCtx())).status).toBe(401);
    sessionValid = false;
    expect((await photo(get(), snipeCtx())).status).toBe(401);
    expect(download).not.toHaveBeenCalled(); expect(snipeCalls()).toHaveLength(0);
  });
});
