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
import { GET } from '../../app/api/auth/session/route';
describe('SocialU session eligibility', () => {
  it('requires both a verified provider account and a SocialU profile', async () => {
    const res = await GET(req('GET'));
    expect(res.status).toBe(200); expect(await res.json()).toEqual({ authenticated: true, needsProfile: false });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
  it('returns onboarding status for a missing student profile', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const res = await GET(req('GET'));
    expect(res.status).toBe(409); expect(await res.json()).toEqual({ authenticated: false, needsProfile: true });
  });
  it('denies inactive or re-verification-required accounts', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501' } });
    expect((await GET(req('GET'))).status).toBe(403);
  });
  it('rejects absent tokens', async () => { expect((await GET(req('GET', undefined, ''))).status).toBe(401); });
  it('handles provider failures', async () => {
    getUser.mockRejectedValue(new Error('secret')); const res = await GET(req('GET'));
    expect(res.status).toBe(503); expect(await res.text()).not.toContain('secret');
  });
});
