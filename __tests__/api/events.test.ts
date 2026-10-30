import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));

import { GET, POST } from '../../app/api/events/route';

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

const validToken = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';

function createRequest(body: object, token = validToken) {
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
    getUser.mockImplementation(async (token: string) => token === validToken
      ? { data: { user }, error: null }
      : { data: { user: null }, error: { message: 'Invalid token' } });
    rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : { data: saved, error: null });
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

  it('saves an optional dress code, trimmed, up to 100 characters', async () => {
    await POST(createRequest({ ...validBody, dressCode: '  Costumes encouraged  ' }));
    expect(rpc.mock.calls.find(([fn]) => fn === 'socialu_create_event')![1].p_dress_code).toBe('Costumes encouraged');

    rpc.mockClear();
    const response = await POST(createRequest({ ...validBody, dressCode: 'x'.repeat(101) }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'dress code must be 100 characters or fewer.' });
    expect(rpc.mock.calls.find(([fn]) => fn === 'socialu_create_event')).toBeUndefined();
  });

  it('ignores creator IDs supplied by the browser', async () => {
    await POST(createRequest({ ...validBody, creator_id: 999, p_auth_id: 'victim' }));
    const args = rpc.mock.calls.find(([fn]) => fn === 'socialu_create_event')![1];
    expect(args.p_auth_id).toBe(user.id);
    expect(args).not.toHaveProperty('creator_id');
  });

  it('rejects an event without required fields', async () => {
    const response = await POST(createRequest({ ...validBody, description: '' }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'description is required.' });
    expect(rpc).not.toHaveBeenCalledWith('socialu_create_event', expect.anything());
  });

  it('rejects requests without a valid access token', async () => {
    expect((await POST(createRequest(validBody, 'bad-token'))).status).toBe(401);
    expect((await POST(createRequest(validBody, ''))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('explains when the signed-in user has no active student account', async () => {
    rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : { data: null, error: { code: '42501', message: 'A verified, active university account is required.' } });
    const response = await POST(createRequest(validBody));

    expect(response.status).toBe(403);
    expect((await response.json()).error).toMatch(/verified, active university account/);
  });

  it('keeps the time the student picked in their own time zone', async () => {
    // 10:00 in New York during daylight time (UTC-4) is 14:00 UTC.
    await POST(createRequest({ ...validBody, timezoneOffset: 240 }));
    const args = rpc.mock.calls.find(([fn]) => fn === 'socialu_create_event')![1];
    expect(args.p_starts_at).toBe('2026-10-09T14:00:00.000Z');
  });
});

describe('Event discovery API', () => {
  const listed = [{ ...saved, creator_username: 'organizer' }];

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
    getClient.mockReturnValue({ auth: { getUser }, rpc });
    getUser.mockImplementation(async (token: string) => token === validToken
      ? { data: { user }, error: null }
      : { data: { user: null }, error: { message: 'Invalid token' } });
    rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : { data: listed, error: null });
  });

  function listRequest(token = validToken) {
    return new Request('http://localhost/api/events', { headers: token ? { authorization: `Bearer ${token}` } : {} });
  }

  it('lists campus events for a signed-in student', async () => {
    const response = await GET(listRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ events: listed.map((e) => ({ ...e, cover_url: null })), trending: [] });
    expect(rpc).toHaveBeenCalledWith('socialu_list_events', { p_auth_id: user.id });
  });

  it('returns the latest saved event information on every request', async () => {
    const first = await GET(listRequest());
    expect(first.headers.get('Cache-Control')).toBe('no-store');
    expect((await first.json()).events[0].location).toBe('North Hall');

    const updated = [{ ...listed[0], location: 'South Lawn' }];
    rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : { data: updated, error: null });
    expect((await (await GET(listRequest())).json()).events[0].location).toBe('South Lawn');
  });

  it('includes events with 5 or more likes as trending, most liked first', async () => {
    const popular = [
      { ...saved, event_id: '1', like_count: 5 },
      { ...saved, event_id: '2', like_count: 4 },
      { ...saved, event_id: '3', like_count: 12 },
    ];
    rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : { data: popular, error: null });
    const { trending } = await (await GET(listRequest())).json();
    expect(trending.map((event: { event_id: string }) => event.event_id)).toEqual(['3', '1']);
  });

  it('returns an empty list when there are no events', async () => {
    rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : { data: [], error: null });
    expect(await (await GET(listRequest())).json()).toEqual({ events: [], trending: [] });
  });

  it('requires sign-in', async () => {
    expect((await GET(listRequest(''))).status).toBe(401);
    expect((await GET(listRequest('bad-token'))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
});
