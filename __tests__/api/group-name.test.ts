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
const patch = (body: unknown, bearer = token, id = '21') => new Request(`http://localhost/api/conversations/${id}`, { method: 'PATCH', headers: headers(bearer), body: JSON.stringify(body) });
const ctx = (id = '21') => ({ params: Promise.resolve({ id }) });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
  answer({ id: '21', name: 'Study group' });
});
import { PATCH } from '../../app/api/conversations/[id]/route';

describe('SRS-202.5 (#835) name a group chat', () => {
  it('saves the name for the signed-in student and returns it', async () => {
    const res = await PATCH(patch({ name: 'Study group' }), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ conversation: { id: '21', name: 'Study group' } });
    expect(chatCalls()).toEqual([['socialu_rename_group', { p_auth_id: user.id, p_conversation_id: '21', p_name: 'Study group' }]]);
  });
  it('tidies spaces and ignores other fields sent by the browser', async () => {
    await PATCH(patch({ name: '  Study \n group ', role: 'owner', p_auth_id: 'victim', student_id: '9' }), ctx());
    expect(chatCalls()).toEqual([['socialu_rename_group', { p_auth_id: user.id, p_conversation_id: '21', p_name: 'Study group' }]]);
  });
  it('accepts exactly 50 characters', async () => {
    expect((await PATCH(patch({ name: 'y'.repeat(50) }), ctx())).status).toBe(200);
  });
  it.each([[''], ['   '], ['x'.repeat(51)], [undefined], [42]])('refuses empty, too-long or missing names %#', async (name) => {
    const res = await PATCH(patch({ name }), ctx());
    expect(res.status).toBe(400); expect(await res.json()).toEqual({ error: 'Group names must be 1 to 50 characters.' });
    expect(chatCalls()).toHaveLength(0);
  });
  it('requires a signed-in, verified student before touching the database', async () => {
    expect((await PATCH(patch({ name: 'Study group' }, ''), ctx())).status).toBe(401);
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });
    expect((await PATCH(patch({ name: 'Study group' }), ctx())).status).toBe(403);
    expect(chatCalls()).toHaveLength(0);
  });
  it('explains when the student is not the owner or an administrator', async () => {
    failWith('SCG01');
    const res = await PATCH(patch({ name: 'Study group' }), ctx());
    expect(res.status).toBe(403); expect(await res.json()).toEqual({ error: 'Only the group owner or an administrator can name the group.' });
  });
  it('passes on the database’s length check', async () => {
    failWith('SCG02');
    expect((await PATCH(patch({ name: 'Study group' }), ctx())).status).toBe(400);
  });
  it('gives outsiders and malformed IDs the same answer as a missing conversation', async () => {
    failWith('SC404');
    const res = await PATCH(patch({ name: 'Study group' }), ctx());
    expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: 'Conversation not available.' });
    rpc.mockClear();
    const bad = await PATCH(patch({ name: 'Study group' }, token, 'abc'), ctx('abc'));
    expect(bad.status).toBe(404); expect(chatCalls()).toHaveLength(0);
  });
  it('never reports a failed save as saved', async () => {
    failWith('XX000');
    const res = await PATCH(patch({ name: 'Study group' }), ctx());
    expect(res.status).toBe(503); expect(await res.json()).not.toHaveProperty('conversation');
  });
});
