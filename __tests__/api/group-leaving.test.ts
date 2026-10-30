import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
const user = { id: 'provider-identity', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z', user_metadata: {} };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const guards = (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : fn === 'socialu_auth_guard' ? { data: {}, error: null } : null;
const chatCalls = () => rpc.mock.calls.filter(([fn]) => !['socialu_session_guard', 'socialu_auth_guard'].includes(fn));
const answer = (data: unknown) => rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data, error: null });
const failWith = (code: string) => rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: null, error: { code, message: 'database detail' } });
const headers = (bearer: string): Record<string, string> => ({ ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}) });
const post = (bearer = token, id = '32') => new Request(`http://localhost/api/conversations/${id}/leave`, { method: 'POST', headers: headers(bearer) });
const ctx = (id = '32') => ({ params: Promise.resolve({ id }) });
const left = { conversation_id: '32', member_count: 2, left_role: 'member', new_owner: null };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
  answer(left);
});
import { POST } from '../../app/api/conversations/[id]/leave/route';

describe('SRS-207.1 (#886) leave a group', () => {
  it('ends the signed-in student’s own membership and returns the remaining count', async () => {
    const res = await POST(post(), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual(left);
    expect(chatCalls()).toEqual([['socialu_leave_group', { p_auth_id: user.id, p_conversation_id: '32' }]]);
  });
  it('takes no student from the request, so nobody can make someone else leave', async () => {
    await POST(post(), ctx());
    const [, args] = chatCalls()[0];
    expect(Object.keys(args)).toEqual(['p_auth_id', 'p_conversation_id']);
    expect(args.p_auth_id).toBe(user.id);
  });
  it('reports an administrator leaving the same way (SRS-207.2)', async () => {
    answer({ ...left, left_role: 'administrator' });
    expect((await (await POST(post(), ctx())).json()).left_role).toBe('administrator');
  });
  it('requires a signed-in, verified student before touching the database', async () => {
    expect((await POST(post(''), ctx())).status).toBe(401);
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });
    expect((await POST(post(), ctx())).status).toBe(403);
    expect(chatCalls()).toHaveLength(0);
  });
  it('explains that the owner needs an administrator first (SRS-208.1)', async () => {
    failWith('SCL01');
    const res = await POST(post(), ctx());
    expect(res.status).toBe(409); expect(await res.json()).toEqual({ error: 'Assign an administrator before you leave the group.' });
  });
  it('gives outsiders, private conversations and malformed IDs the same answer as a missing conversation', async () => {
    failWith('SC404');
    const res = await POST(post(), ctx());
    expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: 'Conversation not available.' });
    rpc.mockClear();
    expect((await POST(post(token, 'abc'), ctx('abc'))).status).toBe(404);
    expect(chatCalls()).toHaveLength(0);
  });
  // SRS-208.2 (#887): when the owner leaves, the answer names the administrator who took the group on.
  it('passes on the new owner when the owner is the one leaving', async () => {
    const handover = { conversation_id: '32', member_count: 2, left_role: 'owner',
      new_owner: { student_id: '2', username: 'student2', name: 'Student 2' } };
    answer(handover);
    expect(await (await POST(post(), ctx())).json()).toEqual(handover);
  });
  it('never reports a failed departure as saved', async () => {
    failWith('XX000');
    const res = await POST(post(), ctx());
    expect(res.status).toBe(503); expect(await res.json()).not.toHaveProperty('member_count');
  });
});
