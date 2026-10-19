import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
const user = { id: 'provider-identity', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z', user_metadata: {} };
const saved = { id: '91', conversation_id: '7', sender_id: '42', text: 'Hello', sent_at: '2026-10-12T15:00:00Z' };
function req(body: unknown, token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature') {
  return new Request('http://localhost/api/conversations/7/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) });
}
const ctx = (id = '7') => ({ params: Promise.resolve({ id }) });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
  rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : fn === 'socialu_auth_guard' ? { data: {}, error: null } : { data: saved, error: null });
});
import { POST } from '../../app/api/conversations/[id]/messages/route';
describe('SRS-201.1 send a text message', () => {
  it('lets a conversation participant send a text message', async () => {
    const res = await POST(req({ text: 'Hello' }), ctx());
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ message: saved });
    expect(rpc).toHaveBeenCalledWith('socialu_send_message', { p_auth_id: user.id, p_conversation_id: '7', p_text: 'Hello' });
  });
  it('requires sign-in before touching the database', async () => {
    expect((await POST(req({ text: 'Hello' }, ''), ctx())).status).toBe(401); expect(rpc.mock.calls.filter(([fn]) => !['socialu_session_guard', 'socialu_auth_guard'].includes(fn))).toHaveLength(0);
  });
  it('rejects unverified accounts', async () => {
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });
    expect((await POST(req({ text: 'Hello' }), ctx())).status).toBe(403); expect(rpc.mock.calls.filter(([fn]) => !['socialu_session_guard', 'socialu_auth_guard'].includes(fn))).toHaveLength(0);
  });
  it('ignores sender IDs supplied by the browser', async () => {
    await POST(req({ text: 'Hello', sender_id: '999', p_auth_id: 'victim' }), ctx());
    expect(rpc).toHaveBeenCalledWith('socialu_send_message', { p_auth_id: user.id, p_conversation_id: '7', p_text: 'Hello' });
  });
  it.each([[''], ['   '], ['x'.repeat(501)], [undefined]])('rejects empty or oversized text %#', async (text) => {
    expect((await POST(req({ text }), ctx())).status).toBe(400); expect(rpc.mock.calls.filter(([fn]) => !['socialu_session_guard', 'socialu_auth_guard'].includes(fn))).toHaveLength(0);
  });
  it('accepts exactly 500 characters', async () => {
    expect((await POST(req({ text: 'x'.repeat(500) }), ctx())).status).toBe(201);
  });
  it('treats an invalid conversation ID as not available', async () => {
    const res = await POST(req({ text: 'Hello' }), ctx('abc'));
    expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: 'Conversation not available.' }); expect(rpc.mock.calls.filter(([fn]) => !['socialu_session_guard', 'socialu_auth_guard'].includes(fn))).toHaveLength(0);
  });
  it('gives non-participants the same answer as a missing conversation', async () => {
    rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : fn === 'socialu_auth_guard' ? { data: {}, error: null } : { data: null, error: { code: 'SC404', message: 'Conversation not available.' } });
    const res = await POST(req({ text: 'Hello' }), ctx());
    expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: 'Conversation not available.' });
  });
  it('explains when private messaging is not allowed', async () => {
    rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : fn === 'socialu_auth_guard' ? { data: {}, error: null } : { data: null, error: { code: 'SC403', message: 'Messaging is not available for this conversation.' } });
    expect((await POST(req({ text: 'Hello' }), ctx())).status).toBe(403);
  });
  it('never reports a failed save as sent', async () => {
    rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : fn === 'socialu_auth_guard' ? { data: {}, error: null } : { data: null, error: { code: 'XX000', message: 'insert failed' } });
    const res = await POST(req({ text: 'Hello' }), ctx());
    expect(res.status).toBe(503); expect(await res.json()).not.toHaveProperty('message');
  });
  it('does not fall back to anonymous database access', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect((await POST(req({ text: 'Hello' }), ctx())).status).toBe(503); expect(rpc.mock.calls.filter(([fn]) => !['socialu_session_guard', 'socialu_auth_guard'].includes(fn))).toHaveLength(0);
  });
});

import { GET } from '../../app/api/conversations/[id]/messages/route';
const history = { student_id: '42', messages: [saved, { ...saved, id: '92', sender_id: '43', text: 'Hi', sent_at: '2026-10-12T15:01:00Z' }] };
const guards = (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : fn === 'socialu_auth_guard' ? { data: {}, error: null } : null;
const getReq = (token = req({}).headers.get('Authorization')?.slice(7) ?? '') => new Request('http://localhost/api/conversations/7/messages', { headers: token ? { Authorization: 'Bearer ' + token } : {} });
const chatCalls = () => rpc.mock.calls.filter(([fn]) => !['socialu_session_guard', 'socialu_auth_guard'].includes(fn));
describe('SRS-201.2 retrieve saved text messages', () => {
  beforeEach(() => rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: history, error: null }));
  it('returns the saved messages and the signed-in student ID to a participant', async () => {
    const res = await GET(getReq(), ctx());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual(history);
    expect(rpc).toHaveBeenCalledWith('socialu_conversation_messages', { p_auth_id: user.id, p_conversation_id: '7' });
  });
  it('requires sign-in before touching the database', async () => {
    expect((await GET(getReq(''), ctx())).status).toBe(401); expect(chatCalls()).toHaveLength(0);
  });
  it('rejects unverified accounts', async () => {
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });
    expect((await GET(getReq(), ctx())).status).toBe(403); expect(chatCalls()).toHaveLength(0);
  });
  it('treats an invalid conversation ID as not available', async () => {
    const res = await GET(getReq(), ctx('7 OR 1=1'));
    expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: 'Conversation not available.' }); expect(chatCalls()).toHaveLength(0);
  });
  it('gives non-participants the same answer as a missing conversation', async () => {
    rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: null, error: { code: 'SC404', message: 'Conversation not available.' } });
    const res = await GET(getReq(), ctx());
    expect(res.status).toBe(404); expect(await res.json()).toEqual({ error: 'Conversation not available.' });
  });
  it('handles a retrieval failure without returning messages', async () => {
    rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: null, error: { code: 'XX000', message: 'read failed' } });
    const res = await GET(getReq(), ctx());
    expect(res.status).toBe(503); expect(await res.json()).not.toHaveProperty('messages');
  });
  it('does not fall back to anonymous database access', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect((await GET(getReq(), ctx())).status).toBe(503); expect(chatCalls()).toHaveLength(0);
  });
});
