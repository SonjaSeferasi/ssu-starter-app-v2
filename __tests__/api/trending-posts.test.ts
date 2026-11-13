import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };

const { getClient, getUser, rpc, signedUrl } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn(), signedUrl: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));

import { GET as trending } from '../../app/api/posts/trending/route';
import { previewText, type TrendingPost } from '../../lib/trending';
import { TrendingPostList, likesLabel } from '../../components/events/TrendingPosts';

const user = { id: 'student-auth-id', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z' };
const validToken = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const row = (id: number, likes: number, extra: object = {}) => ({
  post_id: id, author_id: 7, author_name: 'Ada Student', author_username: 'ada', author_photo_key: null,
  published_at: '2026-11-12T15:00:00Z', is_repost: false, text_content: 'Free pizza in the quad!', photo_key: null, recent_like_count: likes, ...extra,
});
const request = (token = validToken) => new Request('http://localhost/api/posts/trending', { headers: token ? { authorization: `Bearer ${token}` } : {} });
const dbResult = (data: unknown, error: unknown = null) =>
  rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : { data, error });
const callTo = (fn: string) => rpc.mock.calls.find(([name]) => name === fn);

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  signedUrl.mockImplementation(async (key: string) => ({ data: { signedUrl: `https://cdn.test/${key}` }, error: null }));
  getClient.mockReturnValue({ auth: { getUser }, rpc, storage: { from: () => ({ createSignedUrl: signedUrl }) } });
  getUser.mockImplementation(async (token: string) => token === validToken
    ? { data: { user }, error: null }
    : { data: { user: null }, error: { message: 'Invalid token' } });
  dbResult([row(11, 5), row(12, 2, { author_name: 'Grace', author_username: 'grace', text_content: null, photo_key: 'posts/12/a.jpg', author_photo_key: 'avatars/g.jpg' })]);
});

describe('SRS-405.1-405.8 Trending on Events and Trending', () => {
  it('returns the ranking for the signed-in student, recalculated and never cached (SRS-405.8)', async () => {
    const response = await trending(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(callTo('socialu_trending_posts')?.[1]).toEqual({ p_auth_id: 'student-auth-id', p_limit: 10 });
    const { posts } = await response.json();
    // SRS-405.3: the database's order is kept; SRS-405.5: author, preview and count; photos are signed, keys never exposed.
    expect(posts.map((p: TrendingPost) => [p.postId, p.recentLikeCount])).toEqual([[11, 5], [12, 2]]);
    expect(posts[0]).toMatchObject({ authorName: 'Ada Student', authorUsername: 'ada', textPreview: 'Free pizza in the quad!', photoUrl: null });
    expect(posts[1]).toMatchObject({ textPreview: null, photoUrl: 'https://cdn.test/posts/12/a.jpg', authorPhotoUrl: 'https://cdn.test/avatars/g.jpg' });
    expect(JSON.stringify(posts)).not.toContain('"posts/12/a.jpg"');
  });

  it('requires sign-in', async () => {
    expect((await trending(request(''))).status).toBe(401);
    expect(callTo('socialu_trending_posts')).toBeUndefined();
  });

  it('reports when the ranking cannot be loaded', async () => {
    dbResult(null, { code: 'XX000', message: 'boom' });
    expect((await trending(request())).status).toBe(503);
  });

  it('keeps previews to one short line', () => {
    expect(previewText('  Free\n\npizza  ')).toBe('Free pizza');
    expect(previewText('')).toBeNull();
    const long = previewText('word '.repeat(60))!;
    expect(long.length).toBeLessThanOrEqual(121);
    expect(long.endsWith('…')).toBe(true);
  });

  it('shows each entry with its author, preview and recent likes, opening the feed post (SRS-405.5, SRS-405.6)', () => {
    const posts: TrendingPost[] = [
      { postId: 11, authorName: 'Ada Student', authorUsername: 'ada', authorPhotoUrl: null, publishedAt: '', isRepost: false, textPreview: 'Free pizza in the quad!', photoUrl: null, recentLikeCount: 5 },
      { postId: 12, authorName: 'Grace', authorUsername: 'grace', authorPhotoUrl: null, publishedAt: '', isRepost: false, textPreview: null, photoUrl: 'https://cdn.test/p.jpg', recentLikeCount: 1 },
    ];
    const html = renderToStaticMarkup(createElement(TrendingPostList, { posts }));
    expect(html).toContain('href="/posts/11"');
    expect(html).toContain('href="/posts/12"');
    expect(html).toContain('Ada Student');
    expect(html).toContain('@ada');
    expect(html).toContain('Free pizza in the quad!');
    expect(html).toContain('src="https://cdn.test/p.jpg"');
    expect(html).toContain('Shared a photo');
    expect(html).toContain(likesLabel(5));
    expect(likesLabel(1)).toBe('1 like this week');
    expect(html.indexOf('/posts/11')).toBeLessThan(html.indexOf('/posts/12'));
  });

  it('explains an empty ranking (SRS-405.4) and shows loading', () => {
    expect(renderToStaticMarkup(createElement(TrendingPostList, { posts: [] }))).toContain('Nothing is trending yet');
    expect(renderToStaticMarkup(createElement(TrendingPostList, { posts: null }))).toContain('Loading trending posts');
  });
});
