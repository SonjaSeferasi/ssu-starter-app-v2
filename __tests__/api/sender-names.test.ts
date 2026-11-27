import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc, createSignedUrls } = vi.hoisted(() => ({
  getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn(), createSignedUrls: vi.fn(),
}));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
const user = { id: 'provider-identity', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z', user_metadata: {} };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const guards = (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : fn === 'socialu_auth_guard' ? { data: {}, error: null } : null;
const chatCalls = () => rpc.mock.calls.filter(([fn]) => !['socialu_session_guard', 'socialu_auth_guard'].includes(fn));
const answer = (data: unknown) => rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data, error: null });
const get = (bearer = token, id = '21') => new Request(`http://localhost/api/conversations/${id}/messages`, { headers: bearer ? { Authorization: 'Bearer ' + bearer } : {} });
const ctx = (id = '21') => ({ params: Promise.resolve({ id }) });
// What socialu_conversation_messages actually returns. Since SRS-211.2 (#1282) each sender carries
// photo_key -- a path into the private media bucket -- because only the server can sign it.
const history = () => ({
  student_id: '1', kind: 'group', role: 'owner', member_count: 3,
  messages: [{ id: '7', conversation_id: '21', sender_id: '2', text: 'Hi all', sent_at: '2026-10-26T15:00:00Z' }],
  senders: {
    '1': { name: 'Student 1', username: 'student1' },
    '2': { name: 'Sam', username: 'student2', photo_key: 'profile/sam.jpg' },
  },
});
// What the route is supposed to hand the browser: the same history, with every photo_key swapped for a
// signed photo_url (null for a sender who has no photo). A fresh object each time, because withPhotoUrls
// writes into the history it is given and a shared literal would be mutated by the call under test.
const served = () => ({
  ...history(),
  senders: {
    '1': { name: 'Student 1', username: 'student1', photo_url: null },
    '2': { name: 'Sam', username: 'student2', photo_url: 'https://example.test/sam.jpg' },
  },
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc, storage: { from: () => ({ createSignedUrls }) } });
  getUser.mockResolvedValue({ data: { user }, error: null });
  createSignedUrls.mockResolvedValue({
    data: [{ path: 'profile/sam.jpg', signedUrl: 'https://example.test/sam.jpg' }], error: null,
  });
});
import { GET } from '../../app/api/conversations/[id]/messages/route';

describe('SRS-211.1 (#830) sender names come with the saved messages', () => {
  it('returns the names with the history for the signed-in participant', async () => {
    answer(history());
    const res = await GET(get(), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(served());
    expect(chatCalls()).toEqual([['socialu_conversation_messages', { p_auth_id: user.id, p_conversation_id: '21' }]]);
  });

  it('never lets a sender photo key reach the browser', async () => {
    // SRS-211.2 (#1282): photo_key is a path into the private media bucket. withSenderPhotoUrls replaces
    // it rather than adding photo_url beside it, so a page that ignored the new field still could not
    // learn the path. This is the assertion that would have caught the swap being turned into an add.
    answer(history());
    const body = await (await GET(get(), ctx())).text();
    expect(body).not.toContain('photo_key');
    expect(body).not.toContain('profile/sam.jpg');
    expect(body).toContain('https://example.test/sam.jpg');
  });

  it('leaves a sender without a photo rather than failing the whole history', async () => {
    // One unsigned key is a missing avatar; an error here would be the conversation not loading at all.
    createSignedUrls.mockResolvedValue({ data: null, error: { message: 'storage unavailable' } });
    answer(history());
    const res = await GET(get(), ctx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.senders['2'].photo_url).toBeNull();
    expect(body.senders['2'].name).toBe('Sam');
  });
  it('gives outsiders and signed-out students no names', async () => {
    rpc.mockImplementation(async (fn: string) => guards(fn) ?? { data: null, error: { code: 'SC404', message: 'Conversation not available.' } });
    const res = await GET(get(), ctx());
    expect(res.status).toBe(404); expect(await res.json()).not.toHaveProperty('senders');
    expect((await GET(get(''), ctx())).status).toBe(401);
  });
});
