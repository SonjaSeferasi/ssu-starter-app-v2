import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
const user = { id: 'provider-identity', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z', user_metadata: {} };
const list = { student_id: '42', conversations: [
  { id: '7', kind: 'private', name: 'Testing 2', username: 'Testing 2', member_count: null, last_message: { text: 'Hi', sender_id: '43', sent_at: '2026-10-19T15:00:00Z' } },
  { id: '9', kind: 'group', name: null, username: null, member_count: 1, last_message: null },
] };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const req = (bearer = token) => new Request('http://localhost/api/conversations', { headers: bearer ? { Authorization: 'Bearer ' + bearer } : {} });
const guards = (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : fn === 'socialu_auth_guard' ? { data: {}, error: null } : null;
const chatCalls = () => rpc.mock.calls.filter(([fn]) => !['socialu_session_guard', 'socialu_auth_guard'].includes(fn));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
  rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: list, error: null });
});
import { GET, POST } from '../../app/api/conversations/route';
describe('SRS-202.1 (#457) list the student’s conversations', () => {
  it('returns the signed-in student’s DMs and groups', async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual(list);
    expect(rpc).toHaveBeenCalledWith('socialu_conversation_list', { p_auth_id: user.id });
  });
  it('requires sign-in before touching the database', async () => {
    expect((await GET(req(''))).status).toBe(401); expect(chatCalls()).toHaveLength(0);
  });
  it('rejects unverified accounts', async () => {
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });
    expect((await GET(req())).status).toBe(403); expect(chatCalls()).toHaveLength(0);
  });
  it('handles a database failure without returning a list', async () => {
    rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: null, error: { code: 'XX000', message: 'read failed' } });
    const res = await GET(req());
    expect(res.status).toBe(503); expect(await res.json()).not.toHaveProperty('conversations');
  });
  it('does not fall back to anonymous database access', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect((await GET(req())).status).toBe(503); expect(chatCalls()).toHaveLength(0);
  });
});

const created = { id: '21', kind: 'group', role: 'owner', member_count: 1 };
const post = (body: unknown, bearer = token) => new Request('http://localhost/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}) }, body: typeof body === 'string' ? body : JSON.stringify(body) });
describe('SRS-202.1 (#455) and SRS-203.1 (#459) create a group chat', () => {
  beforeEach(() => rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: created, error: null }));
  it('creates a group with the signed-in student as its owner', async () => {
    const res = await POST(post({ kind: 'group' }));
    expect(res.status).toBe(201);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ conversation: created });
    expect(rpc).toHaveBeenCalledWith('socialu_create_group', { p_auth_id: user.id });
  });
  it('ignores owner and member IDs supplied by the browser', async () => {
    await POST(post({ kind: 'group', owner_id: '999', student_id: '999', members: ['5'], p_auth_id: 'victim' }));
    expect(chatCalls()).toEqual([['socialu_create_group', { p_auth_id: user.id }]]);
  });
  it.each([[{}], [{ kind: 'private' }], [{ kind: 'GROUP' }], ['not json'], [[{ kind: 'group' }]]])('rejects anything but a group request %#', async (body) => {
    expect((await POST(post(body))).status).toBe(400); expect(chatCalls()).toHaveLength(0);
  });
  it('requires sign-in before touching the database', async () => {
    expect((await POST(post({ kind: 'group' }, ''))).status).toBe(401); expect(chatCalls()).toHaveLength(0);
  });
  it('rejects unverified accounts', async () => {
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });
    expect((await POST(post({ kind: 'group' }))).status).toBe(403); expect(chatCalls()).toHaveLength(0);
  });
  it('never reports a failed save as a created group', async () => {
    rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: null, error: { code: 'P0001', message: 'A group must have exactly one current owner' } });
    const res = await POST(post({ kind: 'group' }));
    expect(res.status).toBe(503); expect(await res.json()).not.toHaveProperty('conversation');
  });
  it('does not fall back to anonymous database access', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect((await POST(post({ kind: 'group' }))).status).toBe(503); expect(chatCalls()).toHaveLength(0);
  });
});
