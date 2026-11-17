import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
const user = { id: 'provider-identity', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z', user_metadata: {} };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const req = (bearer = token) => new Request('http://localhost/api/conversations/7', { method: 'DELETE', headers: bearer ? { Authorization: 'Bearer ' + bearer } : {} });
const ctx = (id = '7') => ({ params: Promise.resolve({ id }) });
const guards = (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : fn === 'socialu_auth_guard' ? { data: {}, error: null } : null;
const chatCalls = () => rpc.mock.calls.filter(([fn]) => !['socialu_session_guard', 'socialu_auth_guard'].includes(fn));
const fails = (code: string) => (fn: string) => guards(fn) ?? { data: null, error: { code, message: 'refused' } };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
  rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: { conversation_id: '7', deleted: true }, error: null });
});
import { DELETE } from '../../app/api/conversations/[id]/route';

describe('SRS-207.7 (#888) delete a former group conversation from the student’s view', () => {
  it('deletes the conversation for the signed-in student only', async () => {
    const res = await DELETE(req(), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ conversation_id: '7', deleted: true });
    // The student is taken from the verified token, never from the request, so this route cannot be used to
    // delete anybody else's view of a conversation.
    expect(chatCalls()).toEqual([['socialu_delete_conversation', { p_auth_id: user.id, p_conversation_id: '7' }]]);
  });

  it('requires sign-in before touching the database', async () => {
    expect((await DELETE(req(''), ctx())).status).toBe(401);
    expect(chatCalls()).toHaveLength(0);
  });

  it('rejects unverified accounts', async () => {
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });
    expect((await DELETE(req(), ctx())).status).toBe(403);
    expect(chatCalls()).toHaveLength(0);
  });

  it('refuses a conversation id that is not a positive number without calling the database', async () => {
    for (const id of ['0', '-1', 'abc', '1.5', '']) {
      expect((await DELETE(req(), ctx(id))).status).toBe(404);
    }
    expect(chatCalls()).toHaveLength(0);
  });

  it('says nothing about a conversation the student was never in', async () => {
    rpc.mockImplementation(async (fn: string) => fails('SC404')(fn));
    const res = await DELETE(req(), ctx());
    expect(res.status).toBe(404);
    // The same wording an outsider gets anywhere else, so deleting cannot be used to probe for groups.
    expect((await res.json()).error).toBe('Conversation not available.');
  });

  it('names the rule for a conversation the student can plainly see', async () => {
    rpc.mockImplementation(async (fn: string) => fails('SCH01')(fn));
    const priv = await DELETE(req(), ctx());
    expect(priv.status).toBe(400);
    expect((await priv.json()).error).toBe('Only a group you have left can be deleted.');

    rpc.mockImplementation(async (fn: string) => fails('SCH02')(fn));
    const member = await DELETE(req(), ctx());
    expect(member.status).toBe(409);
    expect((await member.json()).error).toBe('Leave the group before deleting this conversation.');
  });

  it('does not fall back to anonymous database access', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect((await DELETE(req(), ctx())).status).toBe(503);
    expect(chatCalls()).toHaveLength(0);
  });
});
