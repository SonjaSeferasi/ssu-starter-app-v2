import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
const user = { id: 'provider-identity', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z', user_metadata: {} };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const req = (bearer = token) => new Request('http://localhost/api/conversations/7/read', { method: 'POST', headers: bearer ? { Authorization: 'Bearer ' + bearer } : {} });
const ctx = (id = '7') => ({ params: Promise.resolve({ id }) });
const guards = (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : fn === 'socialu_auth_guard' ? { data: {}, error: null } : null;
const chatCalls = () => rpc.mock.calls.filter(([fn]) => !['socialu_session_guard', 'socialu_auth_guard'].includes(fn));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
  rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: { marked: 3 }, error: null });
});
import { POST } from '../../app/api/conversations/[id]/read/route';
describe('SRS-212.5 mark a conversation’s messages as read', () => {
  it('marks the conversation read for the signed-in participant', async () => {
    const res = await POST(req(), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ marked: 3 });
    expect(chatCalls()).toEqual([['socialu_mark_conversation_read', { p_auth_id: user.id, p_conversation_id: '7' }]]);
  });
  it('requires sign-in before touching the database', async () => {
    expect((await POST(req(''), ctx())).status).toBe(401); expect(chatCalls()).toHaveLength(0);
  });
  it('rejects unverified accounts', async () => {
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });
    expect((await POST(req(), ctx())).status).toBe(403); expect(chatCalls()).toHaveLength(0);
  });
  it('treats an invalid conversation ID as not available', async () => {
    const res = await POST(req(), ctx('7;drop'));
    expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: 'Conversation not available.' }); expect(chatCalls()).toHaveLength(0);
  });
  it('gives non-participants the same answer as a missing conversation', async () => {
    rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: null, error: { code: 'SC404', message: 'Conversation not available.' } });
    const res = await POST(req(), ctx());
    expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: 'Conversation not available.' });
  });
  it('handles a database failure safely', async () => {
    rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: null, error: { code: 'XX000', message: 'write failed' } });
    const res = await POST(req(), ctx());
    expect(res.status).toBe(503); expect(await res.json()).not.toHaveProperty('marked');
  });
  it('does not fall back to anonymous database access', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect((await POST(req(), ctx())).status).toBe(503); expect(chatCalls()).toHaveLength(0);
  });
});
