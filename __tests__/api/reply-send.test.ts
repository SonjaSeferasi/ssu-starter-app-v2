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
const post = (body: unknown, bearer = token, id = '21') =>
  new Request(`http://localhost/api/conversations/${id}/messages`, { method: 'POST', headers: headers(bearer), body: JSON.stringify(body) });
const ctx = (id = '21') => ({ params: Promise.resolve({ id }) });
const saved = { id: '401', conversation_id: '21', sender_id: '7', text: 'I can bring it', sent_at: '2026-11-02T12:00:00Z', reply_to_id: '305' };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
  answer(saved);
});
import { POST } from '../../app/api/conversations/[id]/messages/route';

describe('SRS-209.3 (#991) send a reply', () => {
  it('passes the chosen message to the database with the reply', async () => {
    const response = await POST(post({ text: 'I can bring it', replyTo: '305' }), ctx());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ message: saved });
    const [fn, args] = chatCalls()[0];
    expect(fn).toBe('socialu_send_message');
    expect(args).toEqual({ p_auth_id: 'provider-identity', p_conversation_id: '21', p_text: 'I can bring it', p_reply_to_id: '305' });
  });

  it('leaves the parameter out entirely for an ordinary message', async () => {
    await POST(post({ text: 'Thanks' }), ctx());
    const [, args] = chatCalls()[0];
    // p_reply_to_id's default does the work; sending null would be a different call.
    expect(args).toEqual({ p_auth_id: 'provider-identity', p_conversation_id: '21', p_text: 'Thanks' });
    expect('p_reply_to_id' in (args as object)).toBe(false);
  });

  it('treats an explicit null the same as no reply at all', async () => {
    await POST(post({ text: 'Thanks', replyTo: null }), ctx());
    expect('p_reply_to_id' in (chatCalls()[0][1] as object)).toBe(false);
  });

  it('refuses a malformed message id before reaching the database', async () => {
    for (const bad of ['0', 'abc', '-5', '1.5', '']) {
      vi.clearAllMocks();
      answer(saved);
      const response = await POST(post({ text: 'Hi', replyTo: bad }), ctx());
      expect(response.status).toBe(404);
      // Nothing was asked of the database: a bad id never looks like a missing message.
      expect(chatCalls()).toHaveLength(0);
    }
  });

  it('reports a target that is not available as a missing message', async () => {
    failWith('SCP01');
    const response = await POST(post({ text: 'Hi', replyTo: '305' }), ctx());
    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe('This message is no longer available.');
  });

  it('explains that replies are a group feature', async () => {
    failWith('SCP02');
    const response = await POST(post({ text: 'Hi', replyTo: '305' }), ctx());
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('Replies are only available in group conversations.');
  });

  it('still refuses an empty or overlong message, reply or not', async () => {
    expect((await POST(post({ text: '   ', replyTo: '305' }), ctx())).status).toBe(400);
    expect((await POST(post({ text: 'x'.repeat(501), replyTo: '305' }), ctx())).status).toBe(400);
  });

  it('refuses an unsigned request without asking the database', async () => {
    const response = await POST(post({ text: 'Hi', replyTo: '305' }, ''), ctx());
    expect(response.status).toBe(401);
    expect(chatCalls()).toHaveLength(0);
  });
});
