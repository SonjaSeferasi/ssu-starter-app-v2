import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
import { GET as list } from '../../app/api/snipes/sharing/route';
import { PATCH as act } from '../../app/api/snipes/sharing/[snipeId]/route';

// SRS-511.12, 514.1, 514.15: the sharing-permission routes forward only the verified account, the cursor or
// the Snipe ID and the action. No conversation is involved, and every response is no-store.
const AUTH_ID = '0f7a2d4c-1b2e-4c3d-8e9f-0a1b2c3d4e5f';
const user = { id: AUTH_ID, email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z', user_metadata: { student_id: '99', auth_id: 'victim' } };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const approved = { id: '5', status: 'approved', role: 'tagged', submitted_at: '2026-10-29T12:00:00Z', published_at: '2026-10-29T13:00:00Z', sharing: 'approved', action: 'withdraw' };
const removed = { ...approved, status: 'removed', sharing: 'withdrawn', action: null };
const get = (query = '', auth = token) => new Request(`http://localhost/api/snipes/sharing${query}`, { headers: auth ? { Authorization: 'Bearer ' + auth } : {} });
const patch = (body: unknown, auth = token) => new Request('http://localhost/api/snipes/sharing/5', { method: 'PATCH',
  headers: { ...(auth ? { Authorization: 'Bearer ' + auth } : {}), 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const ctx = (snipeId = '5') => ({ params: Promise.resolve({ snipeId }) });
const sharingCalls = () => rpc.mock.calls.filter(([fn]) => fn === 'socialu_snipe_sharing').map(([, args]) => args);
let bridge: (args: Record<string, any>) => { data?: unknown; error?: unknown };
let sessionValid = true;
let account: { data?: unknown; error?: unknown };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  sessionValid = true;
  account = { data: { id: '1', username: 'student1' }, error: null };
  bridge = (args) => args.p_action === 'list' ? { data: { records: [approved], next_cursor: null } } : { data: { changed: true, snipe: removed } };
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
  rpc.mockImplementation(async (fn: string, args: Record<string, any>) => {
    if (fn === 'socialu_session_guard') return { data: sessionValid, error: null };
    if (fn === 'socialu_account') return account;
    if (fn === 'socialu_snipe_sharing') return { data: null, error: null, ...bridge(args) };
    return { data: null, error: { code: 'PGRST202', message: 'unknown' } };
  });
});

describe('Snipe sharing permissions list (SRS-511.12, 514.1)', () => {
  it('lists the verified student’s records without any conversation, never cached', async () => {
    const res = await list(get());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ records: [approved], next_cursor: null });
    expect(sharingCalls()).toEqual([{ p_auth_id: AUTH_ID, p_action: 'list', p_snipe_id: null, p_before: null }]);
  });
  it('forwards a valid cursor and returns the next one', async () => {
    bridge = () => ({ data: { records: [approved], next_cursor: '5' } });
    const res = await list(get('?before=120'));
    expect(await res.json()).toEqual({ records: [approved], next_cursor: '5' });
    expect(sharingCalls()).toEqual([{ p_auth_id: AUTH_ID, p_action: 'list', p_snipe_id: null, p_before: '120' }]);
  });
  it.each(['0', '-1', 'abc', '1.5', '', '1 OR 1=1', '1234567890123456789'])('rejects the cursor %j before calling the database', async (cursor) => {
    const res = await list(get(`?before=${encodeURIComponent(cursor)}`));
    expect(res.status).toBe(400);
    expect(sharingCalls()).toHaveLength(0);
  });
  it('requires sign-in, a live session, a verified email and an active account before any call', async () => {
    expect((await list(get('', ''))).status).toBe(401);
    sessionValid = false;
    expect((await list(get())).status).toBe(401);
    sessionValid = true;
    account = { data: null, error: { code: '42501', message: 'inactive' } };
    expect((await list(get())).status).toBe(403);
    account = { data: null, error: null };
    expect((await list(get())).status).toBe(409);
    account = { data: { id: '1' }, error: null };
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });
    expect((await list(get())).status).toBe(403);
    expect(sharingCalls()).toHaveLength(0);
  });
});

describe('Snipe sharing permission actions (SRS-511.12, 514.1 to 514.7, 514.15)', () => {
  it.each(['withdraw', 'remove'])('sends %s for the verified student and returns the stored record', async (action) => {
    const res = await act(patch({ action, p_auth_id: 'victim', student_id: '9', conversation_id: '7', status: 'approved' }), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ changed: true, snipe: removed });
    // Only the action is read from the body; the actor comes from the token. No conversation is sent.
    expect(sharingCalls()).toEqual([{ p_auth_id: AUTH_ID, p_action: action, p_snipe_id: '5', p_before: null }]);
  });
  it('returns the stored state on a repeat (changed: false), still 200', async () => {
    bridge = () => ({ data: { changed: false, snipe: removed } });
    const res = await act(patch({ action: 'withdraw' }), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ changed: false, snipe: removed });
  });
  it.each([['no action', {}], ['a null action', { action: null }], ['list', { action: 'list' }], ['respond', { action: 'respond' }], ['photo', { action: 'photo' }],
    ['a number', { action: 1 }], ['upper case', { action: 'REMOVE' }]])('rejects %s before calling the database', async (_name, body) => {
    expect((await act(patch(body), ctx())).status).toBe(400);
    expect(sharingCalls()).toHaveLength(0);
  });
  it('rejects a malformed body or Snipe ID without calling the database', async () => {
    expect((await act(patch('not json'), ctx())).status).toBe(400);
    expect((await act(patch(['remove']), ctx())).status).toBe(400);
    for (const id of ['0', '5 OR 1=1', 'abc', '-5', '1234567890123456789']) {
      const res = await act(patch({ action: 'remove' }), ctx(id));
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'Snipe not available.' });
    }
    expect(sharingCalls()).toHaveLength(0);
  });
  it('requires sign-in and an active account before any action', async () => {
    expect((await act(patch({ action: 'remove' }, ''), ctx())).status).toBe(401);
    account = { data: null, error: { code: '42501', message: 'inactive' } };
    expect((await act(patch({ action: 'remove' }), ctx())).status).toBe(403);
    expect(sharingCalls()).toHaveLength(0);
  });
  it.each([
    ['SN404', 'Snipe not available.', 404, undefined],
    ['SN400', 'Photographers remove their Snipe instead.', 400, undefined],
    ['42501', 'inactive', 403, undefined],
    ['PGRST202', 'missing', 503, 'SNIPE_SETUP_REQUIRED'],
    ['XX000', 'internal', 503, undefined],
  ])('maps %s from the database', async (code, message, status, apiCode) => {
    bridge = () => ({ error: { code, message } });
    for (const res of [await act(patch({ action: 'remove' }), ctx()), await list(get())]) {
      expect(res.status).toBe(status);
      expect(res.headers.get('Cache-Control')).toBe('no-store');
      const body = await res.json();
      expect(body.code).toBe(apiCode);
      if (code === 'SN404') expect(body).toEqual({ error: 'Snipe not available.' });
      if (code === 'XX000') expect(body.error).not.toContain('internal');
    }
  });
  it('reports a lost connection as a network problem', async () => {
    bridge = () => ({ error: { code: '', message: 'TypeError: fetch failed' } });
    const res = await act(patch({ action: 'remove' }), ctx());
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/cannot reach Supabase/);
  });
  it('does not fall back to anonymous database access', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect((await act(patch({ action: 'remove' }), ctx())).status).toBe(503);
    expect((await list(get())).status).toBe(503);
    expect(sharingCalls()).toHaveLength(0);
  });
});
