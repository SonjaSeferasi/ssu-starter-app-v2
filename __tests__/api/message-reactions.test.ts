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
const url = (id: string, messageId: string) => `http://localhost/api/conversations/${id}/messages/${messageId}/reaction`;
const put = (body: unknown, bearer = token, id = '21', messageId = '305') => new Request(url(id, messageId), { method: 'PUT', headers: headers(bearer), body: JSON.stringify(body) });
const del = (bearer = token, id = '21', messageId = '305') => new Request(url(id, messageId), { method: 'DELETE', headers: headers(bearer) });
const ctx = (id = '21', messageId = '305') => ({ params: Promise.resolve({ id, messageId }) });
const saved = { conversation_id: '21', message_id: '305', reactions: [{ emoji: '👍', count: 2, mine: true }] };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
  answer(saved);
});
import { DELETE, PUT } from '../../app/api/conversations/[id]/messages/[messageId]/reaction/route';
import { REACTIONS, isReaction, sortReactions } from '../../lib/chat-reactions';

describe('SRS-210.2 (#806) the approved reaction set', () => {
  it('is exactly 👍 ❤️ 😂 😮 😢 🙏, in that order', () => {
    expect(REACTIONS.map((reaction) => reaction.emoji)).toEqual(['👍', '❤️', '😂', '😮', '😢', '🙏']);
    expect(REACTIONS.every((reaction) => reaction.name.length > 0)).toBe(true);
  });
  it('accepts only those emoji', () => {
    for (const { emoji } of REACTIONS) expect(isReaction(emoji)).toBe(true);
    for (const bad of ['😀', '❤', '👍🏽', '👍👍', ' 👍', 'like', '', null, undefined, 1, {}]) expect(isReaction(bad)).toBe(false);
  });
  it('keeps chips in the order of the set and drops empty ones', () => {
    const chips = sortReactions([{ emoji: '🙏', count: 1, mine: false }, { emoji: '😂', count: 0, mine: false }, { emoji: '❤️', count: 3, mine: true }, { emoji: '👍', count: 1, mine: false }]);
    expect(chips.map((chip) => chip.emoji)).toEqual(['👍', '❤️', '🙏']);
  });
});

describe('SRS-210.3 / SRS-210.6 (#808, #810, #820) react to a message, or change the reaction', () => {
  it('saves the reaction for the signed-in student and returns the message’s reactions', async () => {
    const res = await PUT(put({ emoji: '👍' }), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual(saved);
    expect(chatCalls()).toEqual([['socialu_react_to_message', { p_auth_id: user.id, p_conversation_id: '21', p_message_id: '305', p_emoji: '👍' }]]);
  });
  it('sends every emoji of the set the same way (a change replaces the old one in the database)', async () => {
    for (const { emoji } of REACTIONS) expect((await PUT(put({ emoji }), ctx())).status).toBe(200);
    expect(chatCalls().map(([, args]) => args.p_emoji)).toEqual(REACTIONS.map((reaction) => reaction.emoji));
  });
  it('ignores student IDs and other fields sent by the browser', async () => {
    await PUT(put({ emoji: '❤️', student_id: '9', p_auth_id: 'victim', count: 99 }), ctx());
    expect(chatCalls()).toEqual([['socialu_react_to_message', { p_auth_id: user.id, p_conversation_id: '21', p_message_id: '305', p_emoji: '❤️' }]]);
  });
  it.each([['😀'], ['like'], [''], [undefined], [['👍']]])('refuses emoji outside the set %#', async (emoji) => {
    const res = await PUT(put({ emoji }), ctx());
    expect(res.status).toBe(400); expect(await res.json()).toEqual({ error: 'Choose a reaction from the list.' });
    expect(chatCalls()).toHaveLength(0);
  });
  it('passes on the database’s emoji check', async () => {
    failWith('SCR01');
    const res = await PUT(put({ emoji: '👍' }), ctx());
    expect(res.status).toBe(400); expect(await res.json()).toEqual({ error: 'Choose a reaction from the list.' });
  });
  it('explains when reactions are not allowed in a private conversation right now', async () => {
    failWith('SCR03');
    const res = await PUT(put({ emoji: '👍' }), ctx());
    expect(res.status).toBe(403); expect(await res.json()).toEqual({ error: 'You cannot react to messages in this conversation right now.' });
  });
});

describe('SRS-210.5 (#815, #817) remove a reaction', () => {
  it('removes only the signed-in student’s own reaction', async () => {
    answer({ ...saved, reactions: [{ emoji: '👍', count: 1, mine: false }] });
    const res = await DELETE(del(), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ ...saved, reactions: [{ emoji: '👍', count: 1, mine: false }] });
    expect(chatCalls()).toEqual([['socialu_remove_reaction', { p_auth_id: user.id, p_conversation_id: '21', p_message_id: '305' }]]);
  });
});

describe.each([['PUT', () => PUT(put({ emoji: '👍' }), ctx())], ['DELETE', () => DELETE(del(), ctx())]] as const)('SRS-210.1 (#803) %s checks', (_, send) => {
  it('requires a signed-in, verified student before touching the database', async () => {
    expect((await (_ === 'PUT' ? PUT(put({ emoji: '👍' }, ''), ctx()) : DELETE(del(''), ctx()))).status).toBe(401);
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });
    expect((await send()).status).toBe(403);
    expect(chatCalls()).toHaveLength(0);
  });
  it('gives outsiders the same answer as a missing conversation', async () => {
    failWith('SC404');
    const res = await send();
    expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: 'Conversation not available.' });
  });
  it('explains when the message is not in the conversation or not available', async () => {
    failWith('SCR04');
    const res = await send();
    expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: 'This message is no longer available.' });
  });
  it('refuses malformed IDs without touching the database', async () => {
    for (const [id, messageId, error] of [['abc', '305', 'Conversation not available.'], ['0', '305', 'Conversation not available.'], ['21', 'abc', 'This message is no longer available.'], ['21', '-1', 'This message is no longer available.'], ['21', '1'.repeat(19), 'This message is no longer available.']]) {
      const res = _ === 'PUT' ? await PUT(put({ emoji: '👍' }, token, id, messageId), ctx(id, messageId)) : await DELETE(del(token, id, messageId), ctx(id, messageId));
      expect(res.status).toBe(404); expect(await res.json()).toEqual({ error });
    }
    expect(chatCalls()).toHaveLength(0);
  });
  it('never reports a failed change as saved', async () => {
    failWith('XX000');
    const res = await send();
    expect(res.status).toBe(503); expect(await res.json()).not.toHaveProperty('reactions');
  });
});
