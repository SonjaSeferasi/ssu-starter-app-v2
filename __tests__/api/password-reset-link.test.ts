import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getClient, getUser, resetPassword, rpc, verifyOtp } = vi.hoisted(() => ({
  getClient: vi.fn(), getUser: vi.fn(), resetPassword: vi.fn(), rpc: vi.fn(), verifyOtp: vi.fn(),
}));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));

import { POST as forgotPassword } from '../../app/api/auth/forgot-password/route';
import { POST as resend } from '../../app/api/auth/resend/route';
import { POST as verify } from '../../app/api/auth/verify/route';
import { readRecoveryTicket } from '../../lib/auth-flows';

function jwt(method: string, ageSeconds = 0) {
  const now = Math.floor(Date.now() / 1000) - ageSeconds;
  return 'header.' + Buffer.from(JSON.stringify({ iat: now, session_id: 'test-session', amr: [{ method, timestamp: now }] })).toString('base64url') + '.signature';
}
const token = jwt('recovery');
const user = { id: 'test-user', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-15T12:00:00Z', user_metadata: { full_name: 'Student Name', username: 'student' } };
function request(body: unknown) {
  return new Request('http://localhost:3000/api/auth/test', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser, resetPasswordForEmail: resetPassword, verifyOtp }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
  resetPassword.mockResolvedValue({ data: {}, error: null });
  verifyOtp.mockResolvedValue({ data: { user, session: { access_token: jwt('otp') } }, error: null });
  rpc.mockImplementation(async (name: string) => ({ data: name === 'socialu_session_guard' ? true : {}, error: null }));
});

describe('default Supabase password-reset email links', () => {
  it('verifies a direct reset token as recovery even when Supabase returns an OTP session', async () => {
    const response = await verify(request({ purpose: 'recovery', tokenHash: 'synthetic-reset-hash' }));
    expect(response.status).toBe(200);
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'synthetic-reset-hash', type: 'recovery' });
    const body = await response.json();
    expect(readRecoveryTicket(body.ticket).userId).toBe(user.id);
    expect(body.email).toBe(user.email);
    expect(body).not.toHaveProperty('session');
  });

  it('rejects used or expired direct reset links', async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: { message: 'Token has expired' } });
    const response = await verify(request({ purpose: 'recovery', tokenHash: 'used-reset-hash' }));
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain('ticket');
  });

  it('rejects malformed direct reset tokens before contacting Supabase', async () => {
    expect((await verify(request({ purpose: 'recovery', tokenHash: 'bad hash!' }))).status).toBe(400);
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it.each([forgotPassword, resend])('requests and resends links pointing to the reset page', async handler => {
    const response = await handler(request({ email: user.email, purpose: 'recovery' }));
    expect(response.status).toBe(200);
    expect(resetPassword).toHaveBeenCalledWith(user.email, { redirectTo: 'http://localhost:3000/reset-password' });
    expect((await response.json()).message).toContain('link');
  });

  it('validates the returned session and exchanges it for an encrypted recovery ticket', async () => {
    const response = await verify(request({ purpose: 'recovery', recoveryAccessToken: token }));
    expect(response.status).toBe(200);
    expect(getUser).toHaveBeenCalledWith(token);
    expect(rpc).toHaveBeenCalledWith('socialu_session_guard', expect.objectContaining({ p_action: 'check', p_auth_id: user.id }));
    const body = await response.json();
    expect(body.email).toBe(user.email);
    expect(body).not.toHaveProperty('session');
    expect(JSON.stringify(body)).not.toContain(token);
    expect(readRecoveryTicket(body.ticket)).toMatchObject({ token, userId: user.id });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('rejects an expired or forged session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'private provider detail' } });
    const response = await verify(request({ purpose: 'recovery', recoveryAccessToken: token }));
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain('private provider detail');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects app-revoked sessions', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    expect((await verify(request({ purpose: 'recovery', recoveryAccessToken: token }))).status).toBe(401);
  });

  it.each([
    { ...user, email: 'student@example.com' },
    { ...user, email_confirmed_at: null },
  ])('rejects ineligible accounts without issuing a recovery ticket', async invalidUser => {
    getUser.mockResolvedValue({ data: { user: invalidUser }, error: null });
    const response = await verify(request({ purpose: 'recovery', recoveryAccessToken: token }));
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain('ticket');
  });

  it.each([
    ['an ordinary password sign-in', jwt('password')],
    ['a magic-link sign-in', jwt('otp')],
    ['a stale recovery session', jwt('recovery', 16 * 60)],
  ])('refuses %s as a reset link', async (_label, other) => {
    const response = await verify(request({ purpose: 'recovery', recoveryAccessToken: other }));
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain('ticket');
  });

  it('does not accept a recovery session for signup', async () => {
    expect((await verify(request({ purpose: 'signup', recoveryAccessToken: token }))).status).toBe(400);
    expect(getUser).not.toHaveBeenCalled();
  });
});

describe('sign-up confirmation email links', () => {
  it('onboards the student from a confirmation-link session', async () => {
    const response = await verify(request({ purpose: 'signup', linkAccessToken: jwt('email/signup') }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_account', expect.objectContaining({ p_action: 'onboard', p_auth_id: user.id, p_username: 'student' }));
  });

  it('refuses an ordinary password sign-in token', async () => {
    expect((await verify(request({ purpose: 'signup', linkAccessToken: jwt('password') }))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalledWith('socialu_account', expect.anything());
  });

  it('no longer accepts six-digit codes', async () => {
    expect((await verify(request({ purpose: 'signup', email: user.email, code: '123456' }))).status).toBe(400);
  });
});
