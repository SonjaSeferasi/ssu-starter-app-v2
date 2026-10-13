import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc, signIn, signUp } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn(), signIn: vi.fn(), signUp: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
const user = { id: 'provider-identity', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z', user_metadata: { full_name: 'Student Name', username: 'student' } };
const profile = { id: '42', username: 'student', biography: 'Hello', avatar_url: null };
function req(method: string, body?: unknown, token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature') {
  return new Request('http://localhost/api/test', { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser, signInWithPassword: signIn, signUp }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
  rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : fn === 'socialu_auth_guard' ? { data: {}, error: null } : { data: profile, error: null });
  signIn.mockResolvedValue({ data: { user, session: { access_token: 'test-token' } }, error: null });
  signUp.mockResolvedValue({ data: { user, session: null }, error: null });
});
import { POST } from '../../app/api/profile/avatar/route';
describe('Photo upload integration boundary', () => {
  it('rejects missing tokens', async () => { expect((await POST(req('POST', {}, ''))).status).toBe(401); });
  it('rejects an unverified account', async () => {
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });
    expect((await POST(req('POST', {}))).status).toBe(403);
  });
  it('checks SocialU eligibility before accepting upload work', async () => {
    rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : fn === 'socialu_auth_guard' ? { data: {}, error: null } : { data: null, error: { code: '42501' } });
    expect((await POST(req('POST', {}))).status).toBe(403);
  });
  it('requires a linked profile', async () => {
    rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : fn === 'socialu_auth_guard' ? { data: {}, error: null } : { data: null, error: null });
    expect((await POST(req('POST', {}))).status).toBe(409);
  });
  it('does not send files to the obsolete public avatar pipeline', async () => {
    const res = await POST(req('POST', {}));
    expect(res.status).toBe(501); expect(await res.json()).toEqual({ error: 'Profile photo uploads are not connected yet.' });
  });
});
