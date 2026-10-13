import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));

import { POST } from '../../app/api/events/route';

const user = { id: 'supabase-user-1', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z' };
const saved = {
  event_id: '42',
  creator_id: '7',
  title: 'Campus Cleanup',
  description: 'Clean up the campus.',
  location: 'North Hall',
  starts_at: '2026-10-09T10:00:00+00:00',
  status: 'active',
};
const validBody = {
  title: 'Campus Cleanup',
  description: 'Clean up the campus.',
  location: 'North Hall',
  date: '2026-10-09',
  time: '10:00',
};

function createRequest(body: object, token = 'valid-token') {
  return new Request('http://localhost/api/events', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe('Event creation API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
    getClient.mockReturnValue({ auth: { getUser }, rpc });
    getUser.mockImplementation(async (token: string) => token === 'valid-token'
      ? { data: { user }, error: null }
      : { data: { user: null }, error: { message: 'Invalid token' } });
    rpc.mockResolvedValue({ data: saved, error: null });
  });

  it('creates an event with the required information', async () => {
    const response = await POST(createRequest(validBody));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ event: saved });
    expect(rpc).toHaveBeenCalledWith('socialu_create_event', {
      p_auth_id: user.id,
      p_title: 'Campus Cleanup',
      p_description: 'Clean up the campus.',
      p_location: 'North Hall',
      p_starts_at: new Date('2026-10-09T10:00:00').toISOString(),
    });
  });

  it('ignores creator IDs supplied by the browser', async () => {
    await POST(createRequest({ ...validBody, creator_id: 999, p_auth_id: 'victim' }));
    expect(rpc.mock.calls[0][1].p_auth_id).toBe(user.id);
    expect(rpc.mock.calls[0][1]).not.toHaveProperty('creator_id');
  });

  it('rejects an event without required fields', async () => {
    const response = await POST(createRequest({ ...validBody, description: '' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'description is required.' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects requests without a valid access token', async () => {
    expect((await POST(createRequest(validBody, 'bad-token'))).status).toBe(401);
    expect((await POST(createRequest(validBody, ''))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('explains when the signed-in user has no active student account', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'A verified, active university account is required.' } });
    const response = await POST(createRequest(validBody));

    expect(response.status).toBe(403);
    expect((await response.json()).error).toMatch(/verified, active university account/);
  });
});
