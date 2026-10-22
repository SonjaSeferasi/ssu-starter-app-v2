import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getClient, getUser, rpc, signedUrl } = vi.hoisted(() => ({
  getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn(), signedUrl: vi.fn(),
}));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));

import { GET as listHighlights, POST as changeHighlights } from '../../app/api/profiles/highlights/route';

const user = { id: 'auth-uuid-1', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z' };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
let result: { data: unknown; error: unknown } = { data: [], error: null };

const get = (path: string) => new Request(`http://localhost${path}`, { headers: { Authorization: `Bearer ${token}` } });
const post = (path: string, body: unknown) => new Request(`http://localhost${path}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
});
const row = {
  post_id: 3, author_id: 7, text_content: 'Latte', visibility: 'public', published_at: '2026-10-20T12:00:00Z', edited_at: null,
  author_name: 'Alex Kim', author_username: 'alex.kim', author_photo_key: null, photos: [{ asset_id: 1, storage_key: 'posts/1.png' }],
  like_count: 0, is_liked_by_viewer: false, comment_count: 0,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  result = { data: [], error: null };
  getClient.mockReturnValue({ auth: { getUser }, rpc, storage: { from: () => ({ createSignedUrl: signedUrl }) } });
  getUser.mockResolvedValue({ data: { user }, error: null });
  rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : result);
  signedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed.example/photo.png' }, error: null });
});

describe('profile highlights', () => {
  it("lists another student's highlights with signed post photos", async () => {
    result = { data: [{ highlight_id: 2, title: 'Coffee breaks', posts: [row] }], error: null };
    const response = await listHighlights(get('/api/profiles/highlights?username=alex.kim'));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_profile_highlights', { p_auth_id: user.id, p_action: 'list', p_username: 'alex.kim' });
    const { highlights } = await response.json();
    expect(highlights[0]).toMatchObject({ highlightId: 2, title: 'Coffee breaks' });
    expect(highlights[0].posts[0].photos[0].url).toBe('https://signed.example/photo.png');
  });

  it('creates a highlight from post ids', async () => {
    const response = await changeHighlights(post('/api/profiles/highlights', { action: 'create', title: 'Study days', postIds: [3, '5'] }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_profile_highlights', { p_auth_id: user.id, p_action: 'create', p_title: 'Study days', p_post_ids: [3, 5] });
  });

  it('rejects an invalid post id', async () => {
    const response = await changeHighlights(post('/api/profiles/highlights', { action: 'create', title: 'X', postIds: ['abc'] }));
    expect(response.status).toBe(400);
  });

  it('passes a database validation message through', async () => {
    result = { data: null, error: { code: '22023', message: 'You can have up to 20 highlights.' } };
    const response = await changeHighlights(post('/api/profiles/highlights', { action: 'create', title: 'X', postIds: [1] }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'You can have up to 20 highlights.' });
  });
});

