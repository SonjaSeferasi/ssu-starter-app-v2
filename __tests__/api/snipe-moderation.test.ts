import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
import { GET as queue } from '../../app/api/conversations/[id]/snipes/reports/route';
import { PATCH as resolve } from '../../app/api/conversations/[id]/snipes/reports/[reportId]/route';
import { POST as adminRemove } from '../../app/api/conversations/[id]/snipes/[snipeId]/admin-removal/route';

// SRS-514.1, 514.10, 514.12, 514.13, 514.15: the moderation routes forward only the verified account, the IDs
// from the path and (for a decision) the decision. Roles, resolvers and balances never come from the browser.
const AUTH_ID = '0f7a2d4c-1b2e-4c3d-8e9f-0a1b2c3d4e5f';
const user = { id: AUTH_ID, email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z', user_metadata: {} };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const item = { id: '12', reason: 'Posted without asking.', status: 'unresolved', reporter: { id: '4', name: 'Student 4', username: 's4' }, resolved_by: null,
  snipe: { id: '5', status: 'approved', published_at: '2026-10-29T12:00:00Z', photographer: { id: '1', name: 'Student 1', username: 's1' }, visible: true, photo_available: true } };
const removedView = { id: '5', status: 'removed', viewer_role: 'member', photo_available: false, can_admin_remove: false };
const base = 'http://localhost/api/conversations/7/snipes';
const request = (path: string, method: string, body?: unknown, auth = token) => new Request(base + path, { method,
  headers: { ...(auth ? { Authorization: 'Bearer ' + auth } : {}), 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
const queueCtx = (id = '7') => ({ params: Promise.resolve({ id }) });
const reportCtx = (id = '7', reportId = '12') => ({ params: Promise.resolve({ id, reportId }) });
const snipeCtx = (id = '7', snipeId = '5') => ({ params: Promise.resolve({ id, snipeId }) });
const calls = () => rpc.mock.calls.filter(([fn]) => fn === 'socialu_snipe_moderation').map(([, args]) => args);
let bridge: (args: Record<string, any>) => { data?: unknown; error?: unknown };
let sessionValid = true;
let account: { data?: unknown; error?: unknown };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  sessionValid = true;
  account = { data: { id: '1', username: 'student1' }, error: null };
  bridge = (args) => args.p_action === 'queue' ? { data: { reports: [item] } }
    : args.p_action === 'resolve' ? { data: { result: 'saved', report: { ...item, status: args.p_payload.decision }, snipe: removedView } }
    : { data: { result: 'saved', snipe: removedView } };
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
  rpc.mockImplementation(async (fn: string, args: Record<string, any>) => {
    if (fn === 'socialu_session_guard') return { data: sessionValid, error: null };
    if (fn === 'socialu_account') return account;
    if (fn === 'socialu_snipe_moderation') return { data: null, error: null, ...bridge(args) };
    return { data: null, error: { code: 'PGRST202', message: 'unknown' } };
  });
});

describe('Snipe report queue (SRS-514.10)', () => {
  it('returns the group queue for the verified account, never cached', async () => {
    const res = await queue(request('/reports', 'GET'), queueCtx());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ reports: [item] });
    expect(calls()).toEqual([{ p_auth_id: AUTH_ID, p_action: 'queue', p_conversation_id: '7', p_target_id: null, p_payload: {} }]);
  });
  it.each([
    ['SM403', 403, 'SNIPE_MODERATION_NOT_ALLOWED'], ['SR403', 403, 'SNIPE_REPORT_NOT_ALLOWED'], ['SC404', 404, undefined], ['42501', 403, undefined],
  ])('maps %s for non-managers, direct messages, outsiders and inactive accounts', async (code, status, apiCode) => {
    bridge = () => ({ error: { code, message: 'refused' } });
    const res = await queue(request('/reports', 'GET'), queueCtx());
    expect(res.status).toBe(status);
    expect((await res.json()).code).toBe(apiCode);
  });
  it('requires sign-in and a valid conversation ID before any call', async () => {
    expect((await queue(request('/reports', 'GET', undefined, ''), queueCtx())).status).toBe(401);
    expect((await queue(request('/reports', 'GET'), queueCtx('7 OR 1=1'))).status).toBe(404);
    expect((await queue(request('/reports', 'GET'), queueCtx('1234567890123456789'))).status).toBe(404);
    expect(calls()).toHaveLength(0);
  });
});

describe('Snipe report decision (SRS-514.12, 514.13)', () => {
  it.each(['dismissed', 'removed'])('forwards only the %s decision for the verified account', async (decision) => {
    const res = await resolve(request('/reports/12', 'PATCH', { decision, resolved_by: '4', role: 'owner', p_auth_id: 'victim', balance: 999 }), reportCtx());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ changed: true, report: { ...item, status: decision }, snipe: removedView });
    expect(calls()).toEqual([{ p_auth_id: AUTH_ID, p_action: 'resolve', p_conversation_id: '7', p_target_id: '12', p_payload: { decision } }]);
  });
  it('returns the stored decision on a repeat and refuses a changed one', async () => {
    bridge = () => ({ data: { result: 'existing', report: { ...item, status: 'dismissed' }, snipe: null } });
    const same = await resolve(request('/reports/12', 'PATCH', { decision: 'dismissed' }), reportCtx());
    expect([same.status, (await same.json()).changed]).toEqual([200, false]);
    bridge = () => ({ data: { result: 'conflict', report: { ...item, status: 'dismissed' }, snipe: null } });
    const other = await resolve(request('/reports/12', 'PATCH', { decision: 'removed' }), reportCtx());
    expect(other.status).toBe(409);
    expect(await other.json()).toMatchObject({ code: 'SNIPE_REPORT_ALREADY_RESOLVED', report: { status: 'dismissed' } });
  });
  it.each([
    ['no decision', {}], ['a capitalised decision', { decision: 'Dismissed' }], ['padding', { decision: ' removed' }], ['a boolean', { decision: true }],
    ['an array', { decision: ['removed'] }], ['null', { decision: null }], ['another value', { decision: 'approved' }],
  ])('rejects %s before calling the database', async (_name, body) => {
    const res = await resolve(request('/reports/12', 'PATCH', body), reportCtx());
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('SNIPE_DECISION_INVALID');
    expect(calls()).toHaveLength(0);
  });
  it('rejects malformed bodies and IDs without calling the database', async () => {
    expect((await resolve(request('/reports/12', 'PATCH', 'not json'), reportCtx())).status).toBe(400);
    expect((await resolve(request('/reports/12', 'PATCH', ['removed']), reportCtx())).status).toBe(400);
    for (const reportId of ['0', '-1', '12abc', '1234567890123456789'])
      expect((await resolve(request('/reports/x', 'PATCH', { decision: 'removed' }), reportCtx('7', reportId))).status).toBe(404);
    expect((await resolve(request('/reports/12', 'PATCH', { decision: 'removed' }), reportCtx('x'))).status).toBe(404);
    expect(calls()).toHaveLength(0);
  });
  it.each([
    ['SM403', 403, 'SNIPE_MODERATION_NOT_ALLOWED'], ['SM400', 400, 'SNIPE_DECISION_INVALID'], ['SR404', 404, undefined],
    ['SR403', 403, 'SNIPE_REPORT_NOT_ALLOWED'], ['SC404', 404, undefined], ['PGRST202', 503, 'SNIPE_SETUP_REQUIRED'],
  ])('maps %s from the database with a safe message', async (code, status, apiCode) => {
    bridge = () => ({ error: { code, message: 'internal detail' } });
    const res = await resolve(request('/reports/12', 'PATCH', { decision: 'dismissed' }), reportCtx());
    expect(res.status).toBe(status);
    const body = await res.json();
    expect(body.code).toBe(apiCode);
    if (code === 'SR404') expect(body).toEqual({ error: 'Report not available.' });
  });
  it('requires a live session and an active account', async () => {
    sessionValid = false;
    expect((await resolve(request('/reports/12', 'PATCH', { decision: 'removed' }), reportCtx())).status).toBe(401);
    sessionValid = true;
    account = { data: null, error: { code: '42501', message: 'Your account requires verification or account support.' } };
    expect((await resolve(request('/reports/12', 'PATCH', { decision: 'removed' }), reportCtx())).status).toBe(403);
    expect(calls()).toHaveLength(0);
  });
});

describe('Group administrator removal (SRS-514.1, 514.15)', () => {
  it('removes for the verified account without reading the body', async () => {
    const res = await adminRemove(request('/5/admin-removal', 'POST', { role: 'owner', p_auth_id: 'victim' }), snipeCtx());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ snipe: removedView });
    expect(calls()).toEqual([{ p_auth_id: AUTH_ID, p_action: 'remove', p_conversation_id: '7', p_target_id: '5', p_payload: {} }]);
  });
  it('reports a Snipe that is no longer published as closed', async () => {
    bridge = () => ({ data: { result: 'closed', snipe: { ...removedView, status: 'pending' } } });
    const res = await adminRemove(request('/5/admin-removal', 'POST'), snipeCtx());
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('SNIPE_CLOSED');
  });
  it.each([['SM403', 403], ['SN404', 404], ['SR403', 403], ['SC404', 404]])('maps %s', async (code, status) => {
    bridge = () => ({ error: { code, message: 'refused' } });
    expect((await adminRemove(request('/5/admin-removal', 'POST'), snipeCtx())).status).toBe(status);
  });
  it('rejects invalid IDs and missing sign-in before any call', async () => {
    expect((await adminRemove(request('/5/admin-removal', 'POST', undefined, ''), snipeCtx())).status).toBe(401);
    expect((await adminRemove(request('/0/admin-removal', 'POST'), snipeCtx('7', '0'))).status).toBe(404);
    expect(calls()).toHaveLength(0);
  });
});
