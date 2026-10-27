import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// SRS-212.9: the header bell, the Messages link and the chat pages listen to the same live channel, and share one
// copy of the message notifications. No browser, Supabase or server is used: each is replaced by a small stand-in.
const { createClient, storedAccessToken, accessToken, subscribeToChat } = vi.hoisted(() => ({
  createClient: vi.fn(), storedAccessToken: vi.fn(), accessToken: vi.fn(), subscribeToChat: vi.fn(),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient }));
vi.mock('../lib/account/session', () => ({ storedAccessToken, accessToken }));

const token = (sub: string) => 'header.' + Buffer.from(JSON.stringify({ sub })).toString('base64url') + '.signature';

function fakeSupabase() {
  const handlers: Record<string, (message: { payload: unknown }) => void> = {};
  let onStatus: ((status: string) => void) | null = null;
  const channel = {
    on: vi.fn((_type: string, { event }: { event: string }, handler: (message: { payload: unknown }) => void) => { handlers[event] = handler; return channel; }),
    subscribe: vi.fn((callback: (status: string) => void) => { onStatus = callback; return channel; }),
  };
  const client = { channel: vi.fn(() => channel), realtime: { setAuth: vi.fn(async () => {}) }, removeChannel: vi.fn(async () => 'ok') };
  return { client, channel, emit: (event: string, payload: unknown) => handlers[event]?.({ payload }), status: (status: string) => onStatus?.(status) };
}

const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
const listener = () => ({ message: vi.fn(), status: vi.fn(), conversation: vi.fn(), invitation: vi.fn(), reaction: vi.fn() });

describe('SRS-212.9 one live channel for every listener', () => {
  let supabase: ReturnType<typeof fakeSupabase>;
  let subscribe: typeof import('../lib/realtime-client').subscribeToChat;
  beforeEach(async () => {
    vi.resetModules();
    vi.doUnmock('../lib/realtime-client');
    supabase = fakeSupabase();
    createClient.mockReturnValue(supabase.client);
    storedAccessToken.mockReturnValue(token('user-1'));
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-anon-key');
    ({ subscribeToChat: subscribe } = await import('../lib/realtime-client'));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
  const add = (l: ReturnType<typeof listener>) => subscribe(l.message, l.status, l.conversation, l.invitation, l.reaction);

  it('opens one channel on the student’s own topic and gives every listener each event', async () => {
    const bell = listener(), page = listener();
    add(bell); add(page);
    await settle();
    expect(supabase.client.channel).toHaveBeenCalledTimes(1);
    expect(supabase.client.channel).toHaveBeenCalledWith('student:user-1', { config: { private: true } });
    expect(supabase.channel.subscribe).toHaveBeenCalledTimes(1);
    expect(supabase.client.realtime.setAuth).toHaveBeenCalledWith(token('user-1'));

    supabase.emit('message_created', { id: '5' });
    supabase.emit('conversation_updated', { conversation_id: '3', name: 'Team' });
    supabase.emit('group_invitation_created', { invitation_id: '9', conversation_id: '3' });
    supabase.emit('reaction_updated', { message_id: '5', conversation_id: '3', reactions: [] });
    for (const l of [bell, page]) {
      expect(l.message).toHaveBeenCalledWith({ id: '5' });
      expect(l.conversation).toHaveBeenCalledWith({ conversation_id: '3', name: 'Team' });
      expect(l.invitation).toHaveBeenCalledWith({ invitation_id: '9', conversation_id: '3' });
      expect(l.reaction).toHaveBeenCalledWith({ message_id: '5', conversation_id: '3', reactions: [] });
    }
  });

  it('reports the channel’s status to everyone, including listeners who join once it is live', async () => {
    const bell = listener();
    add(bell);
    await settle();
    expect(bell.status).toHaveBeenLastCalledWith('connecting');
    supabase.status('SUBSCRIBED');
    expect(bell.status).toHaveBeenLastCalledWith('live');
    const page = listener();
    add(page);
    expect(page.status).toHaveBeenCalledWith('live');
    supabase.status('CHANNEL_ERROR');
    expect(bell.status).toHaveBeenLastCalledWith('offline');
    expect(page.status).toHaveBeenLastCalledWith('offline');
  });

  it('keeps the channel for the others when one listener leaves, and closes it shortly after the last one', async () => {
    vi.useFakeTimers();
    const bell = listener(), page = listener();
    const stopBell = add(bell), stopPage = add(page);
    await settle();
    stopPage();
    supabase.emit('message_created', { id: '6' });
    expect(page.message).not.toHaveBeenCalled();
    expect(bell.message).toHaveBeenCalledWith({ id: '6' });
    stopBell();
    // Moving to another page re-subscribes within a moment and keeps the same channel.
    vi.advanceTimersByTime(500);
    const next = add(listener());
    vi.advanceTimersByTime(2000);
    expect(supabase.client.removeChannel).not.toHaveBeenCalled();
    expect(supabase.client.channel).toHaveBeenCalledTimes(1);
    next();
    vi.advanceTimersByTime(999);
    expect(supabase.client.removeChannel).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(supabase.client.removeChannel).toHaveBeenCalledTimes(1);
    // Stopping twice does nothing more.
    stopBell(); next();
    vi.advanceTimersByTime(2000);
    expect(supabase.client.removeChannel).toHaveBeenCalledTimes(1);
  });

  it('opens a new channel for a different student on the same tab', async () => {
    add(listener());
    await settle();
    storedAccessToken.mockReturnValue(token('user-2'));
    add(listener());
    expect(supabase.client.removeChannel).toHaveBeenCalledTimes(1);
    expect(supabase.client.channel).toHaveBeenLastCalledWith('student:user-2', { config: { private: true } });
  });

  it('opens nothing when signed out or when live updates are not configured', () => {
    storedAccessToken.mockReturnValue(null);
    const signedOut = listener();
    add(signedOut);
    expect(signedOut.status).toHaveBeenCalledWith('signed-out');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    const unconfigured = listener();
    add(unconfigured);
    expect(unconfigured.status).toHaveBeenCalledWith('unavailable');
    expect(supabase.client.channel).not.toHaveBeenCalled();
  });
});

describe('SRS-212.9 one shared copy of the message notifications', () => {
  const note = (conversation_id: string) => ({ conversation_id, kind: 'private', name: 'Sam', sender: { username: 'sam', name: 'Sam', photo_url: null }, text: 'Hi', message_kind: 'text', unread_count: 1, sent_at: '2026-10-27T12:00:00Z' });
  let store: typeof import('../components/chat/message-notifications');
  let fetchMock: ReturnType<typeof vi.fn>;
  let live: { onMessage: () => void; onStatus: (status: string) => void; stop: ReturnType<typeof vi.fn> }[];
  let notifications: unknown[];
  const events = new EventTarget();

  beforeEach(async () => {
    vi.resetModules();
    vi.doMock('../lib/realtime-client', () => ({ subscribeToChat }));
    live = [];
    subscribeToChat.mockReset();
    subscribeToChat.mockImplementation((onMessage: () => void, onStatus: (status: string) => void) => {
      const entry = { onMessage, onStatus, stop: vi.fn() };
      live.push(entry);
      onStatus('connecting');
      return entry.stop;
    });
    accessToken.mockResolvedValue('signed-in-token');
    notifications = [note('17')];
    fetchMock = vi.fn(async (path: string) => new Response(JSON.stringify(path === '/api/message-notifications'
      ? { notifications } : { invitations: [{ id: '4', conversation_id: '32', group_name: null, inviter: { username: 'kim', name: 'Kim' }, member_count: 2 }] })));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', events);
    store = await import('../components/chat/message-notifications');
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.doUnmock('../lib/realtime-client'); });
  const calls = (path: string) => fetchMock.mock.calls.filter(([p]) => p === path).length;
  const count = () => { const s = store.messageNotificationsSnapshot(); return (s.messages?.length ?? 0) + s.invitations.length; };

  it('loads once for the bell, the Messages link and the tab together, with one live subscription', async () => {
    const bell = vi.fn(), link = vi.fn();
    const stopBell = store.watchMessageNotifications(bell);
    const stopLink = store.watchMessageNotifications(link);
    await vi.waitFor(() => expect(count()).toBe(2));
    expect(calls('/api/message-notifications')).toBe(1);
    expect(calls('/api/group-invitations')).toBe(1);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer signed-in-token');
    expect(subscribeToChat).toHaveBeenCalledTimes(1);
    expect(bell).toHaveBeenCalled(); expect(link).toHaveBeenCalled();
    stopLink();
    expect(live[0].stop).not.toHaveBeenCalled();
    stopBell();
    expect(live[0].stop).toHaveBeenCalledTimes(1);
  });

  it('updates live when a message arrives, and when the student reads a conversation', async () => {
    const stop = store.watchMessageNotifications(() => {});
    await vi.waitFor(() => expect(count()).toBe(2));
    notifications = [note('17'), note('18')];
    live[0].onMessage();
    await vi.waitFor(() => expect(count()).toBe(3));
    // The conversation page announces that messages were read; the count drops without a reload.
    notifications = [];
    events.dispatchEvent(new Event('socialu-chat-activity'));
    await vi.waitFor(() => expect(count()).toBe(1));
    stop();
    // Nobody is watching: announcements are ignored.
    const before = fetchMock.mock.calls.length;
    events.dispatchEvent(new Event('socialu-chat-activity'));
    await Promise.resolve();
    expect(fetchMock.mock.calls.length).toBe(before);
  });

  it('runs one load at a time, with one more for anything asked meanwhile', async () => {
    const stop = store.watchMessageNotifications(() => {});
    await vi.waitFor(() => expect(count()).toBe(2));
    const before = calls('/api/message-notifications');
    await Promise.all([store.reloadMessageNotifications(), store.reloadMessageNotifications(), store.reloadMessageNotifications()]);
    await vi.waitFor(() => expect(calls('/api/message-notifications')).toBe(before + 2));
    stop();
  });

  it('catches up after live updates come back, but not on the first connection', async () => {
    const stop = store.watchMessageNotifications(() => {});
    await vi.waitFor(() => expect(count()).toBe(2));
    const before = calls('/api/message-notifications');
    live[0].onStatus('live');
    await Promise.resolve();
    expect(calls('/api/message-notifications')).toBe(before);
    live[0].onStatus('offline');
    live[0].onStatus('live');
    await vi.waitFor(() => expect(calls('/api/message-notifications')).toBe(before + 1));
    stop();
  });

  it('asks nothing of the server when signed out, and connects once signed in', async () => {
    accessToken.mockResolvedValue(null);
    subscribeToChat.mockImplementationOnce((_m: () => void, onStatus: (status: string) => void) => { onStatus('signed-out'); return () => {}; });
    const stop = store.watchMessageNotifications(() => {});
    await Promise.resolve(); await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(count()).toBe(0);
    accessToken.mockResolvedValue('signed-in-token');
    await vi.waitFor(async () => { await store.reloadMessageNotifications(); expect(count()).toBe(2); });
    expect(subscribeToChat).toHaveBeenCalledTimes(2);
    stop();
  });

  it('keeps the last numbers and explains when loading fails', async () => {
    const stop = store.watchMessageNotifications(() => {});
    await vi.waitFor(() => expect(count()).toBe(2));
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ error: 'Chat is unavailable.' }), { status: 503 }));
    await store.reloadMessageNotifications();
    expect(store.messageNotificationsSnapshot().error).toBe('Chat is unavailable.');
    expect(count()).toBe(2);
    stop();
  });
});
