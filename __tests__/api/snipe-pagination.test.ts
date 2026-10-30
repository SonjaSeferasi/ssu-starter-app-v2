import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
const { getClient, getUser, rpc, getBucket, upload, remove } = vi.hoisted(() => ({
  getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn(), getBucket: vi.fn(), upload: vi.fn(), remove: vi.fn(),
}));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
import { GET as list, POST as submit } from '../../app/api/conversations/[id]/snipes/route';

// SRS-512.1, 512.3, 512.11: the conversation Snipe list's `before` cursor at the API boundary. The database
// (mocked here; covered by __tests__/database/snipe-pagination.test.ts) validates the anchor row itself.
const AUTH_ID = '0f7a2d4c-1b2e-4c3d-8e9f-0a1b2c3d4e5f';
const KEY = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const INVALID_PAGE = 'These Snipes could not be loaded. Refresh and try again.';
const user = { id: AUTH_ID, email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z', user_metadata: {} };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const base = 'http://localhost/api/conversations/7/snipes';
const headers = (auth = token) => (auth ? { Authorization: 'Bearer ' + auth } : {}) as Record<string, string>;
const ctx = (id = '7') => ({ params: Promise.resolve({ id }) });
const get = (query = '', auth = token, id = '7') => list(new Request(base + query, { headers: headers(auth) }), ctx(id));
const snipeCalls = () => rpc.mock.calls.filter(([fn]) => fn === 'socialu_snipe').map(([, args]) => args);
const page = (ids: string[], next: string | null) => ({ student_id: '1', kind: 'group', rewards: { points_per_friend: 25, balance: 0 }, targets: [],
  snipes: ids.map((id) => ({ id, status: 'pending', viewer_role: 'tagged' })), next_cursor: next });
let snipe: (args: Record<string, any>) => { data?: unknown; error?: unknown };
let sessionValid = true;
let account: { data?: unknown; error?: unknown };
let jpeg: Buffer;

beforeAll(async () => { jpeg = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#39775e' } }).jpeg().toBuffer(); });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  sessionValid = true;
  account = { data: { id: '1', username: 'student1' }, error: null };
  snipe = ({ p_action, p_payload }) => p_action === 'list' ? { data: p_payload.before ? page(['4'], null) : page(['9', '8'], '8') }
    : p_action === 'prepare' ? { data: { created: false, snipe: null } }
    : p_action === 'create' ? { data: { created: true, snipe: { id: '10', status: 'pending' } } }
    : { error: { code: 'SN404', message: 'Snipe not available.' } };
  getClient.mockReturnValue({ auth: { getUser }, rpc, storage: { getBucket, from: () => ({ upload, remove }) } });
  getUser.mockResolvedValue({ data: { user }, error: null });
  rpc.mockImplementation(async (fn: string, args: Record<string, any>) => {
    if (fn === 'socialu_session_guard') return { data: sessionValid, error: null };
    if (fn === 'socialu_account') return account;
    if (fn === 'socialu_snipe') return { data: null, error: null, ...snipe(args) };
    return { data: null, error: { code: 'PGRST202', message: 'unknown' } };
  });
  getBucket.mockResolvedValue({ data: { id: 'socialu-snipe-photos', public: false }, error: null });
  upload.mockResolvedValue({ data: { path: 'x' }, error: null });
  remove.mockResolvedValue({ data: [], error: null });
});

describe('Snipe list pages (SRS-512.1, 512.3, 512.11)', () => {
  it('keeps the first page request unchanged and passes the server’s next_cursor through, never cached', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual(page(['9', '8'], '8'));
    expect(snipeCalls()).toEqual([{ p_auth_id: AUTH_ID, p_action: 'list', p_conversation_id: '7', p_snipe_id: null, p_payload: {} }]);
  });

  it('forwards only a valid `before` Snipe ID; the student and every other field come from the server', async () => {
    const res = await get('?before=8&student_id=99&p_auth_id=victim&submitted_at=2020-01-01T00:00:00Z&before_at=2020-01-01&actor=2&p_conversation_id=1');
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual(page(['4'], null));
    expect(snipeCalls()).toEqual([{ p_auth_id: AUTH_ID, p_action: 'list', p_conversation_id: '7', p_snipe_id: null, p_payload: { before: '8' } }]);
    await get('?before=999999999999999999');
    expect(snipeCalls()[1].p_payload).toEqual({ before: '999999999999999999' });
  });

  it.each(['', '0', '01', '-1', '+1', '1.0', '1e3', 'abc', '%20', '1%20', '%201', 'null', 'undefined', '1234567890123456789', '8%3B', '0x10', '８'])(
    'refuses the malformed cursor ?before=%s with one message and no database call', async (value) => {
      const res = await get(`?before=${value}`);
      expect(res.status).toBe(400);
      expect(res.headers.get('Cache-Control')).toBe('no-store');
      expect(await res.json()).toEqual({ error: INVALID_PAGE });
      expect(snipeCalls()).toHaveLength(0);
    });

  it('checks sign-in, the live session, the account and the conversation ID before looking at the cursor', async () => {
    for (const query of ['?before=8', '?before=bad']) {
      expect((await get(query, '')).status).toBe(401);
      sessionValid = false;
      expect((await get(query)).status).toBe(401);
      sessionValid = true;
      account = { data: null, error: { code: '42501', message: 'Your account requires verification or account support.' } };
      expect((await get(query)).status).toBe(403);
      account = { data: { id: '1', username: 'student1' }, error: null };
      const malformedConversation = await get(query, token, '7 OR 1=1');
      expect(malformedConversation.status).toBe(404);
      expect(await malformedConversation.json()).toEqual({ error: 'Conversation not available.' });
    }
    expect(snipeCalls()).toHaveLength(0);
  });

  it('maps a hidden, missing or other-conversation anchor (SN400) to the same 400, and membership loss to 404, without detail', async () => {
    snipe = () => ({ error: { code: 'SN400', message: INVALID_PAGE, details: 'snipe 41 is pending for student 3', hint: 'conversation 9' } });
    const hidden = await get('?before=41');
    expect(hidden.status).toBe(400);
    expect(hidden.headers.get('Cache-Control')).toBe('no-store');
    expect(await hidden.json()).toEqual({ error: INVALID_PAGE });
    snipe = () => ({ error: { code: 'SC404', message: 'Conversation not available.' } });
    const gone = await get('?before=41');
    expect(gone.status).toBe(404);
    expect(await gone.json()).toEqual({ error: 'Conversation not available.' });
    expect(snipeCalls().map((args) => args.p_payload)).toEqual([{ before: '41' }, { before: '41' }]);
  });

  it('leaves submission unchanged: a `before` query on POST is never forwarded', async () => {
    const body = new FormData();
    body.append('photo', new File([jpeg], 'snipe.jpg', { type: 'image/jpeg' }));
    body.append('submissionKey', KEY);
    body.append('target', '2');
    body.append('before', '8');
    const res = await submit(new Request(base + '?before=8', { method: 'POST', headers: headers(), body }), ctx());
    expect(res.status).toBe(201);
    const [prepare, create] = snipeCalls();
    const digest = createHash('sha256').update(jpeg).digest('hex');
    expect(prepare.p_payload).toEqual({ submission_key: KEY, targets: ['2'], content_digest: digest });
    expect(create.p_action).toBe('create');
    expect(create.p_payload).not.toHaveProperty('before');
  });
});
