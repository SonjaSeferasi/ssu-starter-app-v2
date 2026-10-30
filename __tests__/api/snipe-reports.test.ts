import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
import { POST as report } from '../../app/api/conversations/[id]/snipes/[snipeId]/report/route';

// SRS-514.8, 514.9, 514.11, 514.14: the report route forwards only the trimmed reason for the verified account.
const AUTH_ID = '0f7a2d4c-1b2e-4c3d-8e9f-0a1b2c3d4e5f';
const user = { id: AUTH_ID, email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z', user_metadata: {} };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const receipt = { id: '12', snipe_id: '5', reason: 'Posted without asking.', status: 'unresolved' };
const approved = { id: '5', status: 'approved', viewer_role: 'member', photo_available: true, can_report: false, my_report: receipt };
const url = 'http://localhost/api/conversations/7/snipes/5/report';
const ctx = (id = '7', snipeId = '5') => ({ params: Promise.resolve({ id, snipeId }) });
const post = (body: unknown, auth = token) => new Request(url, { method: 'POST',
  headers: { ...(auth ? { Authorization: 'Bearer ' + auth } : {}), 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const reportCalls = () => rpc.mock.calls.filter(([fn]) => fn === 'socialu_snipe_report').map(([, args]) => args);
let bridge: (args: Record<string, any>) => { data?: unknown; error?: unknown };
let sessionValid = true;
let account: { data?: unknown; error?: unknown };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  sessionValid = true;
  account = { data: { id: '1', username: 'student1' }, error: null };
  bridge = () => ({ data: { result: 'created', report: receipt, snipe: approved } });
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
  rpc.mockImplementation(async (fn: string, args: Record<string, any>) => {
    if (fn === 'socialu_session_guard') return { data: sessionValid, error: null };
    if (fn === 'socialu_account') return account;
    if (fn === 'socialu_snipe_report') return { data: null, error: null, ...bridge(args) };
    return { data: null, error: { code: 'PGRST202', message: 'unknown' } };
  });
});

describe('Snipe group report (SRS-514.8, 514.9)', () => {
  it('stores a report for the verified student and returns its receipt, never cached', async () => {
    const res = await report(post({ reason: '  Posted without asking.  ', p_auth_id: 'victim', reporter_id: '9', status: 'dismissed', resolved_by: '1' }), ctx());
    expect(res.status).toBe(201);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ created: true, report: receipt, snipe: approved });
    // Only the trimmed reason is forwarded; identity, status and decisions never come from the browser.
    expect(reportCalls()).toEqual([{ p_auth_id: AUTH_ID, p_conversation_id: '7', p_snipe_id: '5', p_payload: { reason: 'Posted without asking.' } }]);
  });
  it('lets the photographer report their own published group Snipe, keeping their Remove action', async () => {
    const mine = { ...approved, viewer_role: 'photographer', can_remove: true };
    bridge = () => ({ data: { result: 'created', report: receipt, snipe: mine } });
    const res = await report(post({ reason: 'Posted without asking.' }), ctx());
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ created: true, report: receipt, snipe: mine });
    expect(reportCalls()).toHaveLength(1);
  });
  it('returns the stored report on a retry with the same reason', async () => {
    bridge = () => ({ data: { result: 'existing', report: receipt, snipe: approved } });
    const res = await report(post({ reason: 'Posted without asking.' }), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ created: false, report: receipt, snipe: approved });
  });
  it('refuses a changed reason clearly and shows the first report, which is kept', async () => {
    bridge = () => ({ data: { result: 'conflict', report: receipt, snipe: approved } });
    const res = await report(post({ reason: 'Something else' }), ctx());
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: 'SNIPE_ALREADY_REPORTED', error: expect.stringMatching(/first report is kept/), report: receipt, snipe: approved });
  });
  it.each([
    ['no reason', {}], ['an empty reason', { reason: '' }], ['only whitespace', { reason: ' \n\t ' }], ['a number', { reason: 5 }],
    ['null', { reason: null }], ['an array', { reason: ['spam'] }], ['an object', { reason: { text: 'spam' } }], ['501 characters', { reason: 'x'.repeat(501) }],
    ['501 emoji characters', { reason: '😀'.repeat(501) }],
  ])('rejects %s before calling the database', async (_name, body) => {
    const res = await report(post(body), ctx());
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('SNIPE_REPORT_INVALID');
    expect(reportCalls()).toHaveLength(0);
  });
  it('accepts exactly 500 characters, counted as characters', async () => {
    expect((await report(post({ reason: '😀'.repeat(500) }), ctx())).status).toBe(201);
    expect(reportCalls()[0].p_payload.reason).toBe('😀'.repeat(500));
  });
  it('rejects a malformed body or IDs without calling the database', async () => {
    expect((await report(post('not json'), ctx())).status).toBe(400);
    expect((await report(post(['spam']), ctx())).status).toBe(400);
    expect((await report(post({ reason: 'spam' }), ctx('7 OR 1=1'))).status).toBe(404);
    expect((await report(post({ reason: 'spam' }), ctx('7', '0'))).status).toBe(404);
    expect(reportCalls()).toHaveLength(0);
  });
  it('requires sign-in, a live session, a verified email and an active account before any report call', async () => {
    expect((await report(post({ reason: 'spam' }, ''), ctx())).status).toBe(401);
    sessionValid = false;
    expect((await report(post({ reason: 'spam' }), ctx())).status).toBe(401);
    sessionValid = true;
    account = { data: null, error: { code: '42501', message: 'Your account requires verification or account support.' } };
    expect((await report(post({ reason: 'spam' }), ctx())).status).toBe(403);
    account = { data: { id: '1' }, error: null };
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });
    expect((await report(post({ reason: 'spam' }), ctx())).status).toBe(403);
    expect(reportCalls()).toHaveLength(0);
  });
  it.each([
    ['SC404', 'Conversation not available.', 404, undefined],
    ['SN404', 'Snipe not available.', 404, undefined],
    ['SR400', 'Enter a reason for your report.', 400, 'SNIPE_REPORT_INVALID'],
    ['SR403', 'Snipes in direct messages can’t be reported.', 403, 'SNIPE_REPORT_NOT_ALLOWED'],
    ['SR409', 'Only published Snipes can be reported.', 409, 'SNIPE_NOT_PUBLISHED'],
    ['42501', 'inactive', 403, undefined],
    ['PGRST202', 'missing', 503, 'SNIPE_SETUP_REQUIRED'],
  ])('maps %s from the database', async (code, message, status, apiCode) => {
    bridge = () => ({ error: { code, message } });
    const res = await report(post({ reason: 'spam' }), ctx());
    expect(res.status).toBe(status);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const body = await res.json();
    expect(body.code).toBe(apiCode);
    if (code === 'SC404' || code === 'SN404') expect(body).toEqual({ error: message });
  });
  it('does not fall back to anonymous database access', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect((await report(post({ reason: 'spam' }), ctx())).status).toBe(503);
    expect(reportCalls()).toHaveLength(0);
  });
});
