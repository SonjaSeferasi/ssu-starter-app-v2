import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc, signIn, signUp } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn(), signIn: vi.fn(), signUp: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
const user = { id: 'provider-identity', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z', user_metadata: { full_name: 'Student Name', username: 'student' } };
const profile = { id: '42', username: 'student', biography: 'Hello', avatar_url: null };
function req(method: string, body?: unknown, token = 'valid-token') {
  return new Request('http://localhost/api/test', { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser, signInWithPassword: signIn, signUp }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
  rpc.mockResolvedValue({ data: profile, error: null });
  signIn.mockResolvedValue({ data: { user, session: { access_token: 'test-token' } }, error: null });
  signUp.mockResolvedValue({ data: { user, session: null }, error: null });
});
import { GET, POST, PATCH } from '../../app/api/profile/route';
describe('SocialU profile access', () => {
  it('reads the profile using the verified provider ID', async () => {
    expect((await GET(req('GET'))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_account', { p_action: 'read', p_auth_id: user.id });
  });
  it('does not query data without a token', async () => {
    expect((await GET(req('GET', undefined, ''))).status).toBe(401); expect(rpc).not.toHaveBeenCalled();
  });
  it('rejects expired tokens', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: {} });
    expect((await GET(req('GET'))).status).toBe(401); expect(rpc).not.toHaveBeenCalled();
  });
  it('rejects unverified users', async () => {
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });
    expect((await GET(req('GET'))).status).toBe(403); expect(rpc).not.toHaveBeenCalled();
  });
  it('provides setup defaults only after identity verification', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await (await GET(req('GET'))).json()).toEqual({ profile: null, defaults: { fullName: 'Student Name', username: 'student' } });
  });
  it('ignores caller-supplied student and auth IDs on profile creation', async () => {
    const res = await POST(req('POST', { fullName: 'Student Name', username: 'student', biography: 'Hello', student_id: '999', auth_user_id: 'victim' }));
    expect(res.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith('socialu_account', { p_action: 'onboard', p_auth_id: user.id, p_full_name: 'Student Name', p_username: 'student', p_bio: 'Hello' });
  });
  it('requires the full name for onboarding', async () => {
    expect((await POST(req('POST', { username: 'student' }))).status).toBe(400); expect(rpc).not.toHaveBeenCalled();
  });
  it('restricts edits to the authenticated student', async () => {
    expect((await PATCH(req('PATCH', { biography: 'Updated', id: 'victim' }))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_account', { p_action: 'update_bio', p_auth_id: user.id, p_bio: 'Updated' });
  });
  it('rejects oversized biographies', async () => {
    expect((await PATCH(req('PATCH', { biography: 'x'.repeat(251) }))).status).toBe(400); expect(rpc).not.toHaveBeenCalled();
  });
  it('does not fall back to anonymous database access', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect((await GET(req('GET'))).status).toBe(503); expect(rpc).not.toHaveBeenCalled();
  });
});
