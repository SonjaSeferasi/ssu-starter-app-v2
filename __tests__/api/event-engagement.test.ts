import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));

import { GET as getDetail } from '../../app/api/events/[id]/route';
import { DELETE as unlike, POST as like } from '../../app/api/events/[id]/like/route';
import { DELETE as notGoing, POST as going } from '../../app/api/events/[id]/going/route';
import { POST as comment } from '../../app/api/events/[id]/comments/route';

const user = { id: 'supabase-user-1', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z' };
const validToken = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const engagement = { like_count: 1, liked_by_me: true, comment_count: 0, going_count: 0, going_by_me: false, attendee_preview: [] };
const ctx = (id = '42') => ({ params: Promise.resolve({ id }) });

function request(method: string, body?: object, token = validToken) {
  return new Request('http://localhost/api/events/42', {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}
const dbResult = (data: unknown, error: unknown = null) =>
  rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : { data, error });
const callTo = (fn: string) => rpc.mock.calls.find(([name]) => name === fn);

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockImplementation(async (token: string) => token === validToken
    ? { data: { user }, error: null }
    : { data: { user: null }, error: { message: 'Invalid token' } });
  dbResult(engagement);
});

describe('Event likes and attendance API', () => {
  it.each([
    ['like', like, 'like'],
    ['unlike', unlike, 'unlike'],
    ['going', going, 'going'],
    ['not going', notGoing, 'not_going'],
  ] as const)('%s uses the signed-in student and returns the updated counts', async (_, handler, action) => {
    const response = await handler(request('POST', { p_auth_id: 'someone-else' }), ctx());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ engagement });
    expect(callTo('socialu_event_react')?.[1]).toEqual({ p_auth_id: user.id, p_event_id: '42', p_action: action });
  });

  it('requires sign-in', async () => {
    expect((await like(request('POST', undefined, ''), ctx())).status).toBe(401);
    expect(callTo('socialu_event_react')).toBeUndefined();
  });

  it('treats invalid event IDs as not available without touching the database', async () => {
    for (const id of ['0', 'abc', '-1', '1.5']) expect((await like(request('POST'), ctx(id))).status).toBe(404);
    expect(callTo('socialu_event_react')).toBeUndefined();
  });

  it('explains unavailable events and attendance after an event has started', async () => {
    dbResult(null, { code: 'SE404', message: 'Event not available.' });
    expect((await like(request('POST'), ctx())).status).toBe(404);

    dbResult(null, { code: 'SE409', message: 'Attendance changes close when the event begins.' });
    const response = await going(request('POST'), ctx());
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/already started/);
  });
});

describe('Event comments API', () => {
  it('posts a trimmed comment as the signed-in student', async () => {
    const saved = { comment_id: '9', author_username: 'student2', text: 'See you there', created_at: '2026-10-27T15:00:00Z' };
    dbResult(saved);
    const response = await comment(request('POST', { text: '  See you there  ', author_id: '999' }), ctx());

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ comment: saved });
    expect(callTo('socialu_event_comment')?.[1]).toEqual({ p_auth_id: user.id, p_event_id: '42', p_text: 'See you there' });
  });

  it.each([[''], ['   '], ['x'.repeat(501)], [undefined]])('rejects empty or oversized comments %#', async (text) => {
    const response = await comment(request('POST', { text }), ctx());
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('Comments must contain 1 to 500 characters.');
    expect(callTo('socialu_event_comment')).toBeUndefined();
  });
});

describe('Event detail API', () => {
  it('returns the event with its attendees and comments', async () => {
    const detail = { event_id: '42', title: 'Halloween Parade', ...engagement, attendees: [{ student_id: '2', username: 'student2', full_name: 'Student 2' }], comments: [] };
    dbResult(detail);
    const response = await getDetail(request('GET'), ctx());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ event: { ...detail, cover_url: null } });
    expect(callTo('socialu_event_detail')?.[1]).toEqual({ p_auth_id: user.id, p_event_id: '42' });
  });
});
