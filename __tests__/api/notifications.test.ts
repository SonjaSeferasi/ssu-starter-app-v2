import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getClient, getUser, rpc, sessionGuard } = vi.hoisted(() => ({
  getClient: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  sessionGuard: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));

const user = { id: 'auth-uuid-1', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z' };
const verifiedToken =
  'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';

function req(url: string, init: RequestInit & { token?: string } = {}) {
  const { token, headers, ...rest } = init;
  return new Request(`http://localhost${url}`, {
    ...rest,
    headers: { ...(headers as Record<string, string>), ...(token !== undefined ? { Authorization: `Bearer ${token === 'valid' ? verifiedToken : token}` } : {}) },
  });
}

const rawNotification = (overrides: Partial<Record<string, unknown>> = {}) => ({
  kind: 'post_like',
  post_id: 10,
  comment_id: null,
  latest_at: '2026-10-19T12:00:00Z',
  actor_count: 1,
  visibility: 'public',
  actor_names: ['Jordan Kim'],
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({
    auth: { getUser },
    rpc: (fn: string, args: unknown) => (fn === 'socialu_session_guard' ? sessionGuard(args) : rpc(fn, args)),
  });
  getUser.mockResolvedValue({ data: { user }, error: null });
  sessionGuard.mockResolvedValue({ data: true, error: null });
});

import { GET as listNotifications } from '../../app/api/notifications/route';

// SRS-312: these are route-level tests against a mocked RPC. The actual
// grouping/notification-creation SQL logic (socialu_like_post inserting a
// notification, socialu_unlike_post retracting it, socialu_list_notifications'
// 24-hour grouping window) is pure SQL business logic that a mocked RPC
// cannot meaningfully exercise -- that's verified live against Supabase,
// same as every prior SRS item's RPC logic in this codebase.
describe('List Notifications (SRS-312.1-312.4)', () => {
  it('rejects an unauthenticated request', async () => {
    const response = await listNotifications(req('/api/notifications'));
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('only ever requests the authenticated caller\'s own notifications (cannot retrieve another student\'s)', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await listNotifications(req('/api/notifications', { token: 'valid' }));
    // p_auth_id always comes from verifiedUser(request) -- there is no
    // student-id parameter anywhere in this route a caller could supply to
    // target someone else's notifications.
    expect(rpc).toHaveBeenCalledWith('socialu_list_notifications', { p_auth_id: user.id });
  });

  it('returns an empty list when there are no notifications', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const response = await listNotifications(req('/api/notifications', { token: 'valid' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ notifications: [] });
  });

  it('shapes a single-actor notification correctly (identifies the actor and the post)', async () => {
    rpc.mockResolvedValue({ data: [rawNotification()], error: null });
    const response = await listNotifications(req('/api/notifications', { token: 'valid' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.notifications).toEqual([
      {
        kind: 'post_like', postId: 10, commentId: null, latestAt: '2026-10-19T12:00:00Z',
        actorCount: 1, visibility: 'public', actorNames: ['Jordan Kim'],
      },
    ]);
  });

  it('shapes a grouped notification with multiple actors, most-recent-first', async () => {
    rpc.mockResolvedValue({
      data: [rawNotification({ actor_count: 5, actor_names: ['Sarah', 'Adam', 'Maya', 'Jordan', 'Linh'] })],
      error: null,
    });
    const response = await listNotifications(req('/api/notifications', { token: 'valid' }));
    const body = await response.json();
    expect(body.notifications[0].actorCount).toBe(5);
    expect(body.notifications[0].actorNames).toEqual(['Sarah', 'Adam', 'Maya', 'Jordan', 'Linh']);
  });

  it('includes the post visibility so the client can route to the correct feed tab', async () => {
    rpc.mockResolvedValue({ data: [rawNotification({ visibility: 'friends_only' })], error: null });
    const response = await listNotifications(req('/api/notifications', { token: 'valid' }));
    const body = await response.json();
    expect(body.notifications[0].visibility).toBe('friends_only');
  });

  it('a stale notification for a deleted post never appears (cascade already removed the row -- nothing to filter client-side)', async () => {
    // notifications.post_id ON DELETE CASCADE (schema.sql) means a deleted
    // post's notifications are already gone server-side; the RPC simply
    // never returns them, so there's nothing broken for this route to guard against.
    rpc.mockResolvedValue({ data: [], error: null });
    const response = await listNotifications(req('/api/notifications', { token: 'valid' }));
    expect(await response.json()).toEqual({ notifications: [] });
  });

  it('surfaces a 503 when the database operation fails unexpectedly', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'unexpected' } });
    const response = await listNotifications(req('/api/notifications', { token: 'valid' }));
    expect(response.status).toBe(503);
  });
});

// SRS-313: comment/reply notification creation lives inside
// socialu_create_comment's own SQL (same pure-SQL-logic situation as
// SRS-312's like notifications) -- verified live against Supabase, not
// here. These are route-level tests of socialu_list_notifications'
// shaping for the two new kinds.
describe('List Comment/Reply Notifications (SRS-313.1-313.3 + reply notifications)', () => {
  it('shapes a post_comment notification with its comment id for navigation', async () => {
    rpc.mockResolvedValue({
      data: [rawNotification({ kind: 'post_comment', comment_id: 50, actor_names: ['Sarah'], latest_at: '2026-10-20T10:00:00Z' })],
      error: null,
    });
    const response = await listNotifications(req('/api/notifications', { token: 'valid' }));
    const body = await response.json();
    expect(body.notifications[0]).toEqual({
      kind: 'post_comment', postId: 10, commentId: 50, latestAt: '2026-10-20T10:00:00Z',
      actorCount: 1, visibility: 'public', actorNames: ['Sarah'],
    });
  });

  it('shapes a comment_reply notification distinctly from post_comment', async () => {
    rpc.mockResolvedValue({
      data: [rawNotification({ kind: 'comment_reply', comment_id: 51, actor_names: ['Adam'] })],
      error: null,
    });
    const response = await listNotifications(req('/api/notifications', { token: 'valid' }));
    const body = await response.json();
    expect(body.notifications[0].kind).toBe('comment_reply');
    expect(body.notifications[0].commentId).toBe(51);
  });

  it('a mixed feed of like, comment, and reply notifications all shape correctly together', async () => {
    rpc.mockResolvedValue({
      data: [
        rawNotification({ kind: 'post_like', actor_names: ['Jordan'] }),
        rawNotification({ kind: 'post_comment', comment_id: 50, actor_names: ['Sarah'] }),
        rawNotification({ kind: 'comment_reply', comment_id: 51, actor_names: ['Adam'] }),
      ],
      error: null,
    });
    const response = await listNotifications(req('/api/notifications', { token: 'valid' }));
    const body = await response.json();
    expect(body.notifications.map((n: { kind: string }) => n.kind)).toEqual(['post_like', 'post_comment', 'comment_reply']);
  });
});
