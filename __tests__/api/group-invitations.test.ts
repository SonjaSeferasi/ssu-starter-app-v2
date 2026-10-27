import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
const user = { id: 'provider-identity', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z', user_metadata: {} };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const guards = (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : fn === 'socialu_auth_guard' ? { data: {}, error: null } : null;
const chatCalls = () => rpc.mock.calls.filter(([fn]) => !['socialu_session_guard', 'socialu_auth_guard'].includes(fn));
const failWith = (code: string) => rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: null, error: { code, message: 'database detail' } });
const url = (id = '21', query = '') => `http://localhost/api/conversations/${id}/invitations${query}`;
const params = (id = '21') => ({ params: Promise.resolve({ id }) });
const get = (id = '21', query = '', bearer = token) => new Request(url(id, query), { headers: bearer ? { Authorization: 'Bearer ' + bearer } : {} });
const post = (body: unknown, id = '21', bearer = token) => new Request(url(id), { method: 'POST', headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}) }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const list = { has_more: false, friends: [{ username: 'student2', name: 'Student 2', invited: false }] };
const sent = { created: true, invitation: { id: '5', conversation_id: '21', username: 'student2', status: 'pending' } };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
});
import { GET, POST } from '../../app/api/conversations/[id]/invitations/route';

describe('SRS-205.1 (#482) list the friends a group owner can invite', () => {
  beforeEach(() => rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: list, error: null }));
  it('returns the friends for the signed-in student, with a trimmed search', async () => {
    const res = await GET(get('21', '?q=%20stud%20'), params());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual(list);
    expect(chatCalls()).toEqual([['socialu_group_invite_friends', { p_auth_id: user.id, p_conversation_id: '21', p_query: 'stud' }]]);
  });
  it('rejects a search over 100 characters before touching the database', async () => {
    expect((await GET(get('21', '?q=' + 'x'.repeat(101)), params())).status).toBe(400); expect(chatCalls()).toHaveLength(0);
  });
  it('requires a signed-in, verified student', async () => {
    expect((await GET(get('21', '', ''), params())).status).toBe(401);
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });
    expect((await GET(get(), params())).status).toBe(403);
    expect(chatCalls()).toHaveLength(0);
  });
  it('treats malformed conversation IDs as not available', async () => {
    const res = await GET(get('abc'), params('abc'));
    expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: 'Conversation not available.' }); expect(chatCalls()).toHaveLength(0);
  });
  it('tells a regular member that only the owner or an administrator can invite', async () => {
    failWith('SCI01');
    const res = await GET(get(), params());
    expect(res.status).toBe(403); expect(await res.json()).toEqual({ error: 'Only the group owner or an administrator can invite people.' });
  });
  it('gives outsiders the same answer as a missing conversation', async () => {
    failWith('SC404');
    expect((await GET(get(), params())).status).toBe(404);
  });
});

describe('SRS-205.3 (#486) send a group invitation', () => {
  beforeEach(() => rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: sent, error: null }));
  it('saves a pending invitation for the chosen friend', async () => {
    const res = await POST(post({ username: ' student2 ' }), params());
    expect(res.status).toBe(201);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual(sent);
    expect(chatCalls()).toEqual([['socialu_send_group_invitation', { p_auth_id: user.id, p_conversation_id: '21', p_username: 'student2' }]]);
  });
  it('returns 200 when the friend already has an invitation waiting', async () => {
    rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: { ...sent, created: false }, error: null });
    expect((await POST(post({ username: 'student2' }), params())).status).toBe(200);
  });
  it('ignores inviter, invitee and status values sent by the browser', async () => {
    await POST(post({ username: 'student2', inviter_id: '999', invitee_id: '7', status: 'accepted', p_auth_id: 'victim' }), params());
    expect(chatCalls()).toEqual([['socialu_send_group_invitation', { p_auth_id: user.id, p_conversation_id: '21', p_username: 'student2' }]]);
  });
  it('requires a friend to invite', async () => {
    for (const body of [{}, { username: '   ' }, { username: 5 }, 'not json']) expect((await POST(post(body), params())).status).toBe(400);
    expect(chatCalls()).toHaveLength(0);
  });
  it('requires a signed-in student', async () => {
    expect((await POST(post({ username: 'student2' }, '21', ''), params())).status).toBe(401); expect(chatCalls()).toHaveLength(0);
  });
  it('explains why an invitation was refused', async () => {
    for (const [code, status, error] of [
      ['SCI01', 403, 'Only the group owner or an administrator can invite people.'],
      ['SCI02', 403, 'You can only invite your current friends.'],
      ['SCI03', 409, 'This friend is already in the group.'],
      ['SC404', 404, 'Conversation not available.'],
    ] as const) {
      failWith(code);
      const res = await POST(post({ username: 'student4' }), params());
      expect(res.status).toBe(status); expect(await res.json()).toEqual({ error });
    }
  });
  it('never reports an invitation as sent when the database fails', async () => {
    failWith('XX000');
    const res = await POST(post({ username: 'student2' }), params());
    expect(res.status).toBe(503); expect(await res.json()).not.toHaveProperty('invitation');
  });
});
