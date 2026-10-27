import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc, signedUrl } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn(), signedUrl: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
const user = { id: 'provider-identity', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z', user_metadata: {} };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const guards = (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : fn === 'socialu_auth_guard' ? { data: {}, error: null } : null;
const chatCalls = () => rpc.mock.calls.filter(([fn]) => !['socialu_session_guard', 'socialu_auth_guard'].includes(fn));
const answer = (data: unknown) => rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data, error: null });
const failWith = (code: string) => rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: null, error: { code, message: 'database detail' } });
const get = (bearer = token) => new Request('http://localhost/api/message-notifications', { headers: bearer ? { Authorization: 'Bearer ' + bearer } : {} });
const raw = {
  notifications: [
    { conversation_id: '17', kind: 'private', name: 'Test 2', sender: { username: 'testing2', name: 'Test 2', photo_key: 'students/5/photo.png' }, text: 'Hi', message_kind: 'text', unread_count: 2, sent_at: '2026-10-26T15:00:00Z' },
    { conversation_id: '32', kind: 'group', name: null, sender: { username: 'loens1', name: 'Loens', photo_key: null }, text: '👋', message_kind: 'emoji', unread_count: 1, sent_at: '2026-10-26T14:00:00Z' },
  ],
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc, storage: { from: () => ({ createSignedUrl: signedUrl }) } });
  getUser.mockResolvedValue({ data: { user }, error: null });
  signedUrl.mockResolvedValue({ data: { signedUrl: 'https://cdn.example/photo.png' }, error: null });
});
import { GET } from '../../app/api/message-notifications/route';

describe('SRS-212.9 (#823) message notifications', () => {
  it('returns the signed-in student’s message notifications with sender photos as links', async () => {
    answer(raw);
    const res = await GET(get());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const body = await res.json();
    expect(body.notifications).toHaveLength(2);
    expect(body.notifications[0]).toEqual({ ...raw.notifications[0], sender: { username: 'testing2', name: 'Test 2', photo_url: 'https://cdn.example/photo.png' } });
    expect(body.notifications[1].sender).toEqual({ username: 'loens1', name: 'Loens', photo_url: null });
    expect(JSON.stringify(body)).not.toContain('photo_key');
    expect(chatCalls()).toEqual([['socialu_message_notifications', { p_auth_id: user.id }]]);
  });
  it('returns an empty list when there is nothing new', async () => {
    answer({ notifications: [] });
    expect(await (await GET(get())).json()).toEqual({ notifications: [] });
  });
  it('requires a signed-in, verified student before touching the database', async () => {
    expect((await GET(get(''))).status).toBe(401);
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });
    expect((await GET(get())).status).toBe(403);
    expect(chatCalls()).toHaveLength(0);
  });
  it('handles a database failure without returning notifications', async () => {
    failWith('XX000');
    const res = await GET(get());
    expect(res.status).toBe(503); expect(await res.json()).not.toHaveProperty('notifications');
  });
});
