import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
const user = { id: 'provider-identity', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z', user_metadata: {} };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const guards = (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : fn === 'socialu_auth_guard' ? { data: {}, error: null } : null;
const chatCalls = () => rpc.mock.calls.filter(([fn]) => !['socialu_session_guard', 'socialu_auth_guard'].includes(fn));
const answer = (data: unknown) => rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data, error: null });
const failWith = (code: string) => rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: null, error: { code, message: 'database detail' } });
const headers = (bearer: string): Record<string, string> => (bearer ? { Authorization: 'Bearer ' + bearer } : {});
const list = (bearer = token) => new Request('http://localhost/api/group-invitations', { headers: headers(bearer) });
const post = (id: string, choice: string, bearer = token) => new Request(`http://localhost/api/group-invitations/${id}/${choice}`, { method: 'POST', headers: headers(bearer) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const pending = { invitations: [{ id: '5', conversation_id: '21', inviter: { username: 'student1', name: 'Student 1' }, member_count: 1 }] };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
});
import { GET } from '../../app/api/group-invitations/route';
import { POST as ACCEPT } from '../../app/api/group-invitations/[id]/accept/route';
import { POST as DECLINE } from '../../app/api/group-invitations/[id]/decline/route';

describe('SRS-205.5 (#490) the student’s pending group invitations', () => {
  it('returns the signed-in student’s own pending invitations', async () => {
    answer(pending);
    const res = await GET(list());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual(pending);
    expect(chatCalls()).toEqual([['socialu_pending_group_invitations', { p_auth_id: user.id }]]);
  });
  it('requires a signed-in, verified student', async () => {
    expect((await GET(list(''))).status).toBe(401);
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });
    expect((await GET(list())).status).toBe(403);
    expect(chatCalls()).toHaveLength(0);
  });
  it('handles a database failure without returning invitations', async () => {
    failWith('XX000');
    const res = await GET(list());
    expect(res.status).toBe(503); expect(await res.json()).not.toHaveProperty('invitations');
  });
});

describe('SRS-205.6 / SRS-205.7 (#494, #792) accept a group invitation and join the group', () => {
  it('accepts for the signed-in student and returns the joined group', async () => {
    answer({ conversation_id: '21', member_count: 2 });
    const res = await ACCEPT(post('5', 'accept'), params('5'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ conversation_id: '21', member_count: 2 });
    expect(chatCalls()).toEqual([['socialu_accept_group_invitation', { p_auth_id: user.id, p_invitation_id: '5' }]]);
  });
  it('gives one answer for missing, someone else’s and already answered invitations', async () => {
    failWith('SCI05');
    const res = await ACCEPT(post('5', 'accept'), params('5'));
    expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: 'This invitation is no longer available.' });
  });
  it('treats malformed invitation IDs the same way, without touching the database', async () => {
    answer({ conversation_id: '21', member_count: 2 });
    for (const id of ['abc', '0', '-1', '1.5']) {
      const res = await ACCEPT(post(id, 'accept'), params(id));
      expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: 'This invitation is no longer available.' });
    }
    expect(chatCalls()).toHaveLength(0);
  });
  it('requires a signed-in student', async () => {
    expect((await ACCEPT(post('5', 'accept', ''), params('5'))).status).toBe(401); expect(chatCalls()).toHaveLength(0);
  });
  it('never reports a join when the database fails', async () => {
    failWith('XX000');
    const res = await ACCEPT(post('5', 'accept'), params('5'));
    expect(res.status).toBe(503); expect(await res.json()).not.toHaveProperty('conversation_id');
  });
});

describe('SRS-205.8 (#498) decline a group invitation', () => {
  it('declines for the signed-in student', async () => {
    answer({ id: '5', status: 'declined' });
    const res = await DECLINE(post('5', 'decline'), params('5'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: '5', status: 'declined' });
    expect(chatCalls()).toEqual([['socialu_decline_group_invitation', { p_auth_id: user.id, p_invitation_id: '5' }]]);
  });
  it('gives the same not-available answer for invitations that cannot be declined', async () => {
    failWith('SCI05');
    expect((await DECLINE(post('5', 'decline'), params('5'))).status).toBe(404);
    expect((await DECLINE(post('x', 'decline'), params('x'))).status).toBe(404);
  });
  it('requires a signed-in student', async () => {
    expect((await DECLINE(post('5', 'decline', ''), params('5'))).status).toBe(401); expect(chatCalls()).toHaveLength(0);
  });
});
