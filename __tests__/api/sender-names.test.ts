import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
const user = { id: 'provider-identity', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z', user_metadata: {} };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const guards = (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : fn === 'socialu_auth_guard' ? { data: {}, error: null } : null;
const chatCalls = () => rpc.mock.calls.filter(([fn]) => !['socialu_session_guard', 'socialu_auth_guard'].includes(fn));
const answer = (data: unknown) => rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data, error: null });
const get = (bearer = token, id = '21') => new Request(`http://localhost/api/conversations/${id}/messages`, { headers: bearer ? { Authorization: 'Bearer ' + bearer } : {} });
const ctx = (id = '21') => ({ params: Promise.resolve({ id }) });
const history = {
  student_id: '1', kind: 'group', role: 'owner', member_count: 3,
  messages: [{ id: '7', conversation_id: '21', sender_id: '2', text: 'Hi all', sent_at: '2026-10-26T15:00:00Z' }],
  senders: { '1': { name: 'Student 1', username: 'student1' }, '2': { name: 'Sam', username: 'student2' } },
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
});
import { GET } from '../../app/api/conversations/[id]/messages/route';

describe('SRS-211.1 (#830) sender names come with the saved messages', () => {
  it('returns the names with the history for the signed-in participant', async () => {
    answer(history);
    const res = await GET(get(), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(history);
    expect(chatCalls()).toEqual([['socialu_conversation_messages', { p_auth_id: user.id, p_conversation_id: '21' }]]);
  });
  it('gives outsiders and signed-out students no names', async () => {
    rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: null, error: { code: 'SC404', message: 'Conversation not available.' } });
    const res = await GET(get(), ctx());
    expect(res.status).toBe(404); expect(await res.json()).not.toHaveProperty('senders');
    expect((await GET(get(''), ctx())).status).toBe(401);
  });
});
