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
import { POST as login } from '../../app/api/auth/login/route';
import { POST as register } from '../../app/api/auth/register/route';
describe('SocialU login and registration', () => {
  it('checks account eligibility before returning a token', async () => {
    const res = await login(req('POST', { email: user.email, password: 'Secret123!' }));
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_account', { p_action: 'read', p_auth_id: user.id });
    expect((await res.json()).needsProfile).toBe(false);
  });
  it('directs an existing provider account to profile setup', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const res = await login(req('POST', { email: user.email, password: 'Secret123!' }));
    expect((await res.json()).needsProfile).toBe(true);
  });
  it('resolves usernames on the server', async () => {
    rpc.mockResolvedValueOnce({ data: { email: user.email }, error: null });
    await login(req('POST', { identifier: 'student', password: 'Secret123!' }));
    expect(signIn).toHaveBeenCalledWith({ email: user.email, password: 'Secret123!' });
  });
  it('rejects bad credentials with the SRS message', async () => {
    signIn.mockResolvedValue({ data: {}, error: { message: 'provider internals' } });
    const res = await login(req('POST', { email: user.email, password: 'wrong' }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Incorrect email or password.' });
    expect(rpc).not.toHaveBeenCalled();
  });
  it('does not return a token when the student is blocked or the domain is rejected', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501' } });
    const res = await login(req('POST', { email: user.email, password: 'Secret123!' }));
    expect(res.status).toBe(403);
    expect(await res.text()).not.toContain('test-token');
  });
  it('rejects an unverified provider account', async () => {
    signIn.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null }, session: { access_token: 'private' } }, error: null });
    expect((await login(req('POST', { email: user.email, password: 'Secret123!' }))).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('rejects malformed JSON', async () => {
    expect((await login(new Request('http://localhost/api/auth/login', { method: 'POST', body: '{' }))).status).toBe(400);
  });
  const registration = { fullName: 'Student Name', username: 'student', email: user.email, password: 'Secret123!', confirmPassword: 'Secret123!' };
  it('uses normal signup and does not auto-confirm email', async () => {
    const res = await register(req('POST', registration));
    expect(res.status).toBe(201);
    expect(signUp).toHaveBeenCalledWith({ email: user.email, password: 'Secret123!', options: { data: { full_name: 'Student Name', username: 'student' } } });
    expect(await res.text()).not.toContain('access_token');
  });
  it.each([{ fullName: '' }, { username: '' }, { confirmPassword: 'different' }, { password: 'weak', confirmPassword: 'weak' }])('rejects invalid registration %j', async invalid => {
    expect((await register(req('POST', { ...registration, ...invalid }))).status).toBe(400);
    expect(signUp).not.toHaveBeenCalled();
  });
  it('rejects duplicate SocialU identities before signup', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '23505' } });
    expect((await register(req('POST', registration))).status).toBe(409);
    expect(signUp).not.toHaveBeenCalled();
  });
  it('distinguishes a network failure from a missing migration', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '', message: 'TypeError: fetch failed' } });
    const res = await login(req('POST', { email: user.email, password: 'Secret123!' }));
    expect(res.status).toBe(503); expect((await res.json()).error).toContain('network connection');
  });
  it('reports missing migration without exposing internal errors', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'private detail' } });
    const res = await login(req('POST', { email: user.email, password: 'Secret123!' }));
    expect(res.status).toBe(503); expect(await res.text()).not.toContain('private detail');
  });
});
