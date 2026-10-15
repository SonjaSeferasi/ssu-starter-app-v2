import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getClient, getUser, signIn, updateUser, signOut, rpc } = vi.hoisted(() => ({
  getClient: vi.fn(), getUser: vi.fn(), signIn: vi.fn(), updateUser: vi.fn(), signOut: vi.fn(), rpc: vi.fn(),
}));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));

import { POST } from '../../app/api/auth/reset-password/route';
import { recoveryTicket } from '../../lib/auth-flows';

const user = { id: 'test-student', email: 'student@salemstate.edu' };
const token = 'header.' + Buffer.from(JSON.stringify({ session_id: 'test-session', iat: 1791849600 })).toString('base64url') + '.signature';

function request(ticket = recoveryTicket(token, user.id)) {
  return new Request('http://localhost/api/auth/reset-password', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket, password: 'NewSecret123!', confirmPassword: 'NewSecret123!' }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
  getClient.mockReturnValue({ auth: { getUser, signInWithPassword: signIn, admin: { updateUserById: updateUser, signOut } }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
  signIn.mockResolvedValue({ data: { session: null }, error: { code: 'invalid_credentials' } });
  updateUser.mockResolvedValue({ data: { user }, error: null });
  signOut.mockResolvedValue({ error: { code: 'session_not_found', status: 403 } });
  rpc.mockResolvedValue({ data: true, error: null });
});

describe('password reset completion', () => {
  it('reports success when the admin password update has already revoked the recovery session', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: 'Password reset. Sign in with your new password.' });
    expect(updateUser).toHaveBeenCalledWith(user.id, { password: 'NewSecret123!' });
    expect(signOut).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith('socialu_session_guard', expect.objectContaining({ p_action: 'revoke_all', p_auth_id: user.id }));
    expect(rpc.mock.invocationCallOrder.at(-1)).toBeLessThan(updateUser.mock.invocationCallOrder[0]);
  });

  it('does not change the password if app-level session revocation fails', async () => {
    rpc.mockImplementation(async (_name, args) => args.p_action === 'revoke_all'
      ? { data: null, error: { message: 'private database detail' } } : { data: true, error: null });
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(updateUser).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain('private database detail');
  });

  it('still reports a failed password update', async () => {
    updateUser.mockResolvedValue({ error: { message: 'provider detail' } });
    const response = await POST(request());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Unable to save your new password. Please try again.' });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('rejects a recovery ticket that has already been used', async () => {
    rpc.mockImplementation(async name => ({ data: name !== 'socialu_claim_recovery', error: null }));
    expect((await POST(request())).status).toBe(401);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('rejects an invalid recovery ticket before provider operations', async () => {
    expect((await POST(request('invalid-ticket'))).status).toBe(401);
    expect(getUser).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('rejects a revoked app session before changing credentials', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    expect((await POST(request())).status).toBe(401);
    expect(updateUser).not.toHaveBeenCalled();
  });
});
