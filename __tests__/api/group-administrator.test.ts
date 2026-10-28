import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
const user = { id: 'provider-identity', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z', user_metadata: {} };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const guards = (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : fn === 'socialu_auth_guard' ? { data: {}, error: null } : null;
const chatCalls = () => rpc.mock.calls.filter(([fn]) => !['socialu_session_guard', 'socialu_auth_guard'].includes(fn));
const answer = (data: unknown) => rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data, error: null });
const failWith = (code: string) => rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: null, error: { code, message: 'database detail' } });
const headers = (bearer: string): Record<string, string> => ({ 'Content-Type': 'application/json', ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}) });
const url = (id: string) => `http://localhost/api/conversations/${id}/members`;
const get = (bearer = token, id = '32') => new Request(url(id), { headers: headers(bearer) });
const patch = (body: unknown, bearer = token, id = '32') => new Request(url(id), { method: 'PATCH', headers: headers(bearer), body: JSON.stringify(body) });
const ctx = (id = '32') => ({ params: Promise.resolve({ id }) });
const saved = { conversation_id: '32', member: { student_id: '2', username: 'student2', name: 'Student 2', role: 'administrator' } };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
  answer(saved);
});
import { GET, PATCH } from '../../app/api/conversations/[id]/members/route';

describe('SRS-204.1 (#883) list the group members to choose from', () => {
  it('returns the group members for the signed-in student', async () => {
    const members = { student_id: '1', members: [{ student_id: '1', username: 'student1', name: 'Student 1', role: 'owner' }] };
    answer(members);
    const res = await GET(get(), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual(members);
    expect(chatCalls()).toEqual([['socialu_group_members', { p_auth_id: user.id, p_conversation_id: '32' }]]);
  });
  it('gives outsiders and malformed IDs the same answer as a missing conversation', async () => {
    failWith('SC404');
    const res = await GET(get(), ctx());
    expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: 'Conversation not available.' });
    rpc.mockClear();
    expect((await GET(get(token, 'abc'), ctx('abc'))).status).toBe(404);
    expect(chatCalls()).toHaveLength(0);
  });
});

describe('SRS-204.2 (#883) assign administrator privileges', () => {
  it('assigns the chosen member and returns their new role', async () => {
    const res = await PATCH(patch({ username: 'student2', role: 'administrator' }), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual(saved);
    expect(chatCalls()).toEqual([['socialu_assign_group_admin', { p_auth_id: user.id, p_conversation_id: '32', p_username: 'student2' }]]);
  });
  it('trims the username and ignores other fields sent by the browser', async () => {
    await PATCH(patch({ username: '  student2  ', role: 'administrator', p_auth_id: 'victim', student_id: '9' }), ctx());
    expect(chatCalls()).toEqual([['socialu_assign_group_admin', { p_auth_id: user.id, p_conversation_id: '32', p_username: 'student2' }]]);
  });
  it.each([[''], ['   '], [undefined], [42]])('refuses an empty or missing username %#', async (username) => {
    const res = await PATCH(patch({ username, role: 'administrator' }), ctx());
    expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: 'Choose a current member of this group.' });
    expect(chatCalls()).toHaveLength(0);
  });
  it.each([['owner'], [undefined], ['Administrator'], ['']])('refuses a role the route does not grant %#', async (role) => {
    const res = await PATCH(patch({ username: 'student2', role }), ctx());
    expect(res.status).toBe(400);
    expect(chatCalls()).toHaveLength(0);
  });
  it('requires a signed-in, verified student before touching the database', async () => {
    expect((await PATCH(patch({ username: 'student2', role: 'administrator' }, ''), ctx())).status).toBe(401);
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });
    expect((await PATCH(patch({ username: 'student2', role: 'administrator' }), ctx())).status).toBe(403);
    expect(chatCalls()).toHaveLength(0);
  });
  it('explains when the student is not the group owner', async () => {
    failWith('SCA01');
    const res = await PATCH(patch({ username: 'student2', role: 'administrator' }), ctx());
    expect(res.status).toBe(403); expect(await res.json()).toEqual({ error: 'Only the group owner can assign an administrator.' });
  });
  it('explains when the group already has an administrator', async () => {
    failWith('SCA02');
    const res = await PATCH(patch({ username: 'student2', role: 'administrator' }), ctx());
    expect(res.status).toBe(409); expect(await res.json()).toEqual({ error: 'This group already has an administrator.' });
  });
  it('gives one answer for a student who is not a current regular member', async () => {
    failWith('SCA03');
    const res = await PATCH(patch({ username: 'stranger', role: 'administrator' }), ctx());
    expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: 'Choose a current member of this group.' });
  });
  it('never reports a failed assignment as saved', async () => {
    failWith('XX000');
    const res = await PATCH(patch({ username: 'student2', role: 'administrator' }), ctx());
    expect(res.status).toBe(503); expect(await res.json()).not.toHaveProperty('member');
  });
});

describe('SRS-204.6 (#884) revoke administrator privileges', () => {
  const revoked = { conversation_id: '32', member: { student_id: '2', username: 'student2', name: 'Student 2', role: 'member' } };
  it('returns the administrator to regular-member status', async () => {
    answer(revoked);
    const res = await PATCH(patch({ username: 'student2', role: 'member' }), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual(revoked);
    expect(chatCalls()).toEqual([['socialu_revoke_group_admin', { p_auth_id: user.id, p_conversation_id: '32', p_username: 'student2' }]]);
  });
  it('never calls the assign function when taking the role back', async () => {
    answer(revoked);
    await PATCH(patch({ username: 'student2', role: 'member' }), ctx());
    expect(chatCalls().map(([fn]) => fn)).not.toContain('socialu_assign_group_admin');
  });
  it('explains when the student is not the group owner', async () => {
    failWith('SCA04');
    const res = await PATCH(patch({ username: 'student2', role: 'member' }), ctx());
    expect(res.status).toBe(403); expect(await res.json()).toEqual({ error: 'Only the group owner can revoke administrator privileges.' });
  });
  it('gives one answer when the group has no administrator or the student is not the one holding it', async () => {
    failWith('SCA05');
    const res = await PATCH(patch({ username: 'student3', role: 'member' }), ctx());
    expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: 'Choose this group’s current administrator.' });
  });
  it('requires a signed-in, verified student before touching the database', async () => {
    expect((await PATCH(patch({ username: 'student2', role: 'member' }, ''), ctx())).status).toBe(401);
    expect(chatCalls()).toHaveLength(0);
  });
  it('never reports a failed revocation as saved', async () => {
    failWith('XX000');
    const res = await PATCH(patch({ username: 'student2', role: 'member' }), ctx());
    expect(res.status).toBe(503); expect(await res.json()).not.toHaveProperty('member');
  });
});
