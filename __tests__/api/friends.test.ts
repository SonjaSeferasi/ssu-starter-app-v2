import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getClient, getUser, rpc, signedUrl } = vi.hoisted(() => ({
  getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn(), signedUrl: vi.fn(),
}));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));

import { POST as friendAction } from '../../app/api/friends/route';
import { GET as notifications, POST as markRead } from '../../app/api/notifications/route';

const user = { id: 'auth-uuid-1', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z' };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const rawProfile = {
  id: '7', is_own: false, username: 'alex.kim', full_name: 'Alex Kim', display_name: null, name: 'Alex Kim', university: 'Salem State University',
  major: 'Computer Science', class_year: 'Junior', bio: 'Hi', photo_key: null, setup_completed: true,
  display_name_next_change_at: null, post_count: 2, friend_count: 5, is_friend: false, friend_request: 'sent',
};
let result: { data: unknown; error: unknown } = { data: rawProfile, error: null };

function post(body: unknown, auth = true) {
  return new Request('http://localhost/api/friends', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
  });
}
const get = () => new Request('http://localhost/api/notifications', { headers: { Authorization: `Bearer ${token}` } });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  result = { data: rawProfile, error: null };
  getClient.mockReturnValue({ auth: { getUser }, rpc, storage: { from: () => ({ createSignedUrl: signedUrl }) } });
  getUser.mockResolvedValue({ data: { user }, error: null });
  rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : result);
  signedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed.example/photo.png' }, error: null });
});

describe('POST /api/friends', () => {
  it('sends a friend request and returns the refreshed profile', async () => {
    const response = await friendAction(post({ username: 'alex.kim', action: 'send' }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_friend_action', { p_auth_id: user.id, p_username: 'alex.kim', p_action: 'send' });
    expect((await response.json()).profile).toMatchObject({ username: 'alex.kim', friend_request: 'sent', photo_url: null });
  });

  it('rejects an unknown action without calling the database', async () => {
    const response = await friendAction(post({ username: 'alex.kim', action: 'poke' }));
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalledWith('socialu_friend_action', expect.anything());
  });

  it('requires a signed-in student', async () => {
    const response = await friendAction(post({ username: 'alex.kim', action: 'send' }, false));
    expect(response.status).toBe(401);
  });

  it('passes through a friendly database validation message', async () => {
    result = { data: null, error: { code: '22023', message: 'Your friend request is already pending.' } };
    const response = await friendAction(post({ username: 'alex.kim', action: 'send' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Your friend request is already pending.' });
  });

  it('hides a missing or blocked student behind a 404', async () => {
    result = { data: null, error: { code: 'P0002', message: 'This profile is not available.' } };
    const response = await friendAction(post({ username: 'ghost', action: 'send' }));
    expect(response.status).toBe(404);
  });
});

describe('GET /api/notifications', () => {
  it('returns the unread count and signs actor photos', async () => {
    result = { data: { unread: 1, notifications: [{
      notification_id: 3, kind: 'friend_request', created_at: '2026-10-22T12:00:00Z', read_at: null, actor_username: 'alex.kim',
      actor_name: 'Alex Kim', actor_photo_key: 'profile/7/photo.png', request_status: 'pending',
    }] }, error: null };
    const response = await notifications(get());
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_notifications', { p_auth_id: user.id });
    expect(await response.json()).toEqual({ unread: 1, notifications: [{
      notification_id: 3, kind: 'friend_request', created_at: '2026-10-22T12:00:00Z', read_at: null, actor_username: 'alex.kim',
      actor_name: 'Alex Kim', actor_photo_url: 'https://signed.example/photo.png', request_status: 'pending',
    }] });
  });

  it('marks all notifications read', async () => {
    result = { data: null, error: null };
    const response = await markRead(new Request('http://localhost/api/notifications', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_mark_notifications_read', { p_auth_id: user.id });
  });
});

describe('POST /api/conversations', () => {
  it('opens the private conversation with a friend', async () => {
    const { POST: openConversation } = await import('../../app/api/conversations/route');
    result = { data: '12', error: null };
    const response = await openConversation(new Request('http://localhost/api/conversations', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ username: 'alex.kim' }),
    }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_open_private_conversation', { p_auth_id: user.id, p_username: 'alex.kim' });
    expect(await response.json()).toEqual({ conversationId: '12' });
  });

  it('refuses a student who is not a friend', async () => {
    const { POST: openConversation } = await import('../../app/api/conversations/route');
    result = { data: null, error: { code: 'SC403', message: 'not friends' } };
    const response = await openConversation(new Request('http://localhost/api/conversations', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ username: 'alex.kim' }),
    }));
    expect(response.status).toBe(403);
  });
});

describe('GET /api/profiles/friends', () => {
  it("lists a student's friends with signed photos", async () => {
    const { GET: friendsList } = await import('../../app/api/profiles/friends/route');
    result = { data: [{ username: 'maya.chen', name: 'Maya Chen', photo_key: 'profile/9/p.png', is_me: false, is_friend: false, friend_request: 'received' }], error: null };
    const response = await friendsList(new Request('http://localhost/api/profiles/friends?username=alex.kim', { headers: { Authorization: `Bearer ${token}` } }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_profile_friends', { p_auth_id: user.id, p_username: 'alex.kim' });
    expect(await response.json()).toEqual({ friends: [{ username: 'maya.chen', name: 'Maya Chen', photo_url: 'https://signed.example/photo.png', is_me: false, is_friend: false, friend_request: 'received' }] });
  });
});
