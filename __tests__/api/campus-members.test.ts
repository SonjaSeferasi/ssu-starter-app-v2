import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc, signedUrl } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn(), signedUrl: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
import { GET } from '../../app/api/campus/members/route';
const user = { id: 'verified-user', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-22T12:00:00Z' };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
let result: { data: unknown; error: unknown };
const request = (query = '') => new Request(`http://localhost/api/campus/members${query}`, { headers: { Authorization: `Bearer ${token}` } });
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
  result = { data: [], error: null };
  getClient.mockReturnValue({ auth: { getUser }, rpc, storage: { from: () => ({ createSignedUrl: signedUrl }) } });
  getUser.mockResolvedValue({ data: { user }, error: null });
  rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : result);
  signedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed.example/photo.jpg' }, error: null });
});
describe('campus members', () => {
  it('requires a verified session', async () => {
    expect((await GET(new Request('http://localhost/api/campus/members'))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalledWith('socialu_campus_members', expect.anything());
  });
  it('derives campus from the authenticated user and signs photos without exposing storage keys', async () => {
    result.data = [{ username: 'maya', name: 'Maya', photo_key: 'profile/2/photo.jpg', is_me: false }];
    const response = await GET(request('?school=another&auth_id=other&q=maya&offset=20'));
    expect(rpc).toHaveBeenCalledWith('socialu_campus_members', { p_auth_id: user.id, p_query: 'maya', p_offset: 20 });
    expect(await response.json()).toEqual({ members: [{ username: 'maya', name: 'Maya', photo_url: 'https://signed.example/photo.jpg', is_me: false }], hasMore: false });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('returns a 20-member page and reports the next page', async () => {
    result.data = Array.from({ length: 21 }, (_, i) => ({ username: `student${i}`, name: `Student ${i}`, photo_key: null, is_me: false }));
    const data = await (await GET(request())).json();
    expect(data.members).toHaveLength(20); expect(data.hasMore).toBe(true);
  });
  it.each(['?offset=-1', '?offset=1.5', '?offset=NaN', '?q=' + 'x'.repeat(101)])('rejects invalid pagination/search: %s', async query => {
    expect((await GET(request(query))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalledWith('socialu_campus_members', expect.anything());
  });
  it('does not expose database errors', async () => {
    result = { data: null, error: { code: 'XX000', message: 'private SQL details' } };
    const response = await GET(request());
    expect(response.status).toBe(503); expect(await response.text()).not.toContain('private SQL details');
  });
});
