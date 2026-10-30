import { beforeEach, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
import { GET } from '../../app/api/conversations/[id]/peer/route';

// Next 15+ passes route params as a Promise; the peer header must still resolve the awaited ID.
const user = { id: 'provider-identity', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z', user_metadata: {} };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const request = () => new Request('http://localhost/api/conversations/7/peer', { headers: { Authorization: 'Bearer ' + token } });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
  rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : { data: { name: 'Student 2', username: 'student2' }, error: null });
});

it('returns the private conversation peer for the awaited conversation ID', async () => {
  const res = await GET(request(), { params: Promise.resolve({ id: '7' }) });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ peer: { name: 'Student 2', username: 'student2' } });
  expect(rpc).toHaveBeenCalledWith('socialu_friend_conversation', { p_auth_id: user.id, p_conversation_id: '7' });
});

it('treats a malformed awaited ID as not available without a lookup', async () => {
  const res = await GET(request(), { params: Promise.resolve({ id: '7 OR 1=1' }) });
  expect(res.status).toBe(404);
  expect(rpc.mock.calls.filter(([fn]) => fn === 'socialu_friend_conversation')).toHaveLength(0);
});
