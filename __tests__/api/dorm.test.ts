import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));

import { GET } from '../../app/api/dorm/route';

const firstUser = { id: 'provider-user-a', email_confirmed_at: '2026-10-08T12:00:00Z' };

function request(token?: string) {
  return new Request('http://localhost/api/dorm', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user: firstUser }, error: null });
  rpc.mockResolvedValue({ data: { owner: 'student-a', version: 1 }, error: null });
});

describe('current dorm API (SRS-505.1)', () => {
  it('rejects an unauthenticated request before touching dorm storage', async () => {
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects an expired token before touching dorm storage', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error('expired') });
    const response = await GET(request('expired-token'));
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('opens the signed-in student’s dorm using the verified provider ID', async () => {
    const response = await GET(request('valid-token'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ owner: 'student-a', version: 1 });
    expect(rpc).toHaveBeenCalledWith('socialu_dorm', {
      p_action: 'open', p_auth_id: firstUser.id, p_owner: null, p_payload: {},
    });
  });

  it('keeps two verified provider identities separate', async () => {
    const secondUser = { id: 'provider-user-b', email_confirmed_at: firstUser.email_confirmed_at };
    getUser.mockImplementation(async (token: string) => ({
      data: { user: token === 'second-token' ? secondUser : firstUser }, error: null,
    }));
    rpc.mockImplementation(async (_name: string, args: { p_auth_id: string }) => ({
      data: { owner: args.p_auth_id }, error: null,
    }));

    const [firstResponse, secondResponse] = await Promise.all([
      GET(request('first-token')), GET(request('second-token')),
    ]);
    expect((await firstResponse.json()).owner).toBe(firstUser.id);
    expect((await secondResponse.json()).owner).toBe(secondUser.id);
    expect(rpc).toHaveBeenCalledTimes(2);
  });
});
