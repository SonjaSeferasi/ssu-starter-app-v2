import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
const user = { id: 'provider-identity', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z', user_metadata: {} };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const guards = (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : fn === 'socialu_auth_guard' ? { data: {}, error: null } : null;
const chatCalls = () => rpc.mock.calls.filter(([fn]) => !['socialu_session_guard', 'socialu_auth_guard'].includes(fn));
const answer = (data: unknown) => rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data, error: null });
const failWith = (code: string) => rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: null, error: { code, message: 'database detail' } });
const headers = (bearer: string): Record<string, string> => ({ 'Content-Type': 'application/json', ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}) });
const post = (body: unknown, bearer = token) => new Request('http://localhost/api/conversations/7/messages', { method: 'POST', headers: headers(bearer), body: JSON.stringify(body) });
const ctx = (id = '7') => ({ params: Promise.resolve({ id }) });
const saved = { id: '92', conversation_id: '7', sender_id: '42', text: '😂', sent_at: '2026-10-26T15:00:00Z', kind: 'emoji' };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
  answer(saved);
});
import { POST } from '../../app/api/conversations/[id]/messages/route';
import { CHAT_EMOJIS, isSingleEmoji, searchEmojis } from '../../lib/chat-emoji';

describe('SRS-201.8 (#796) send an emoji', () => {
  it('lets a conversation participant send one emoji', async () => {
    const res = await POST(post({ kind: 'emoji', emoji: '😂' }), ctx());
    expect(res.status).toBe(201);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ message: saved });
    expect(chatCalls()).toEqual([['socialu_send_emoji', { p_auth_id: user.id, p_conversation_id: '7', p_emoji: '😂' }]]);
  });
  it('accepts emoji made of several parts', async () => {
    for (const emoji of ['❤️', '👍🏽', '👨‍👩‍👧‍👦']) expect((await POST(post({ kind: 'emoji', emoji }), ctx())).status).toBe(201);
  });
  it('ignores sender IDs and text supplied by the browser', async () => {
    await POST(post({ kind: 'emoji', emoji: '👋', text: 'hello', sender_id: '999', p_auth_id: 'victim' }), ctx());
    expect(chatCalls()).toEqual([['socialu_send_emoji', { p_auth_id: user.id, p_conversation_id: '7', p_emoji: '👋' }]]);
  });
  it.each([['hello'], ['😀😀'], ['ok 👍'], ['😀 '], ['1'], [''], [undefined], [42]])('refuses anything but a single emoji %#', async (emoji) => {
    const res = await POST(post({ kind: 'emoji', emoji }), ctx());
    expect(res.status).toBe(400); expect(await res.json()).toEqual({ error: 'Choose an emoji to send.' });
    expect(chatCalls()).toHaveLength(0);
  });
  it('requires a signed-in, verified student before touching the database', async () => {
    expect((await POST(post({ kind: 'emoji', emoji: '😂' }, ''), ctx())).status).toBe(401);
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });
    expect((await POST(post({ kind: 'emoji', emoji: '😂' }), ctx())).status).toBe(403);
    expect(chatCalls()).toHaveLength(0);
  });
  it('gives non-participants the same answer as a missing conversation', async () => {
    failWith('SC404');
    const res = await POST(post({ kind: 'emoji', emoji: '😂' }), ctx());
    expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: 'Conversation not available.' });
    const bad = await POST(post({ kind: 'emoji', emoji: '😂' }), ctx('abc'));
    expect(bad.status).toBe(404);
  });
  it('explains when private messaging is not allowed, or the database refuses the emoji', async () => {
    failWith('SC403');
    expect((await POST(post({ kind: 'emoji', emoji: '😂' }), ctx())).status).toBe(403);
    failWith('SCE01');
    const res = await POST(post({ kind: 'emoji', emoji: '😂' }), ctx());
    expect(res.status).toBe(400); expect(await res.json()).toEqual({ error: 'Choose an emoji to send.' });
  });
  it('never reports a failed save as sent', async () => {
    failWith('XX000');
    const res = await POST(post({ kind: 'emoji', emoji: '😂' }), ctx());
    expect(res.status).toBe(503); expect(await res.json()).not.toHaveProperty('message');
  });
  it('keeps sending text messages exactly as before', async () => {
    answer({ ...saved, text: 'Hello', kind: undefined });
    expect((await POST(post({ text: 'Hello' }), ctx())).status).toBe(201);
    expect(chatCalls()).toEqual([['socialu_send_message', { p_auth_id: user.id, p_conversation_id: '7', p_text: 'Hello' }]]);
  });
});

describe('SRS-201.8 (#797) the built-in emoji list', () => {
  it('only offers single emoji the server accepts, each once', () => {
    expect(CHAT_EMOJIS.length).toBeGreaterThan(100);
    for (const { emoji } of CHAT_EMOJIS) expect(isSingleEmoji(emoji), emoji).toBe(true);
    expect(new Set(CHAT_EMOJIS.map(({ emoji }) => emoji)).size).toBe(CHAT_EMOJIS.length);
  });
  it('includes the reaction set planned for SRS-210.2', () => {
    for (const emoji of ['👍', '❤️', '😂', '😮', '😢', '🙏']) expect(CHAT_EMOJIS.some((item) => item.emoji === emoji), emoji).toBe(true);
  });
  it('finds emoji by name or extra words, ignoring case', () => {
    expect(searchEmojis('laugh').map(({ emoji }) => emoji)).toContain('😂');
    expect(searchEmojis('  Thumbs UP ').map(({ emoji }) => emoji)).toEqual(['👍']);
    expect(searchEmojis('pizza').map(({ emoji }) => emoji)).toEqual(['🍕']);
    expect(searchEmojis('')).toHaveLength(CHAT_EMOJIS.length);
    expect(searchEmojis('zzzzqx')).toEqual([]);
  });
});
