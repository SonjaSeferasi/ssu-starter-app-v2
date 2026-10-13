import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getClient, getUser, rpc, storageUpload, storageSignedUrl } = vi.hoisted(() => ({
  getClient: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  storageUpload: vi.fn(),
  storageSignedUrl: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));

const user = { id: 'auth-uuid-1', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z' };

function req(url: string, init: RequestInit & { token?: string } = {}) {
  const { token, headers, ...rest } = init;
  return new Request(`http://localhost${url}`, {
    ...rest,
    headers: { ...(headers as Record<string, string>), ...(token !== undefined ? { Authorization: `Bearer ${token}` } : {}) },
  });
}

const rawRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  post_id: 1,
  author_id: 42,
  text_content: 'Hello campus!',
  visibility: 'public',
  published_at: '2026-10-08T12:00:00Z',
  edited_at: null,
  author_name: 'Maya Chen',
  author_photo_key: null,
  photo_keys: [],
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({
    auth: { getUser },
    rpc,
    storage: { from: vi.fn(() => ({ upload: storageUpload, createSignedUrl: storageSignedUrl })) },
  });
  getUser.mockResolvedValue({ data: { user }, error: null });
  storageUpload.mockResolvedValue({ error: null });
  storageSignedUrl.mockImplementation(async (key: string) => ({ data: { signedUrl: `https://signed.example/${key}` }, error: null }));
});

import { GET as campusFeed } from '../../app/api/posts/feed/campus/route';
import { GET as friendsFeed } from '../../app/api/posts/feed/friends/route';
import { POST as createPost } from '../../app/api/posts/route';
import { POST as attachPhotos } from '../../app/api/posts/[postId]/photos/route';

describe('Campus Feed (SRS-301)', () => {
  it('rejects an unauthenticated request', async () => {
    const response = await campusFeed(req('/api/posts/feed/campus'));
    expect(response.status).toBe(401);
  });

  it('returns shaped public posts for an authenticated student', async () => {
    rpc.mockResolvedValue({ data: [rawRow()], error: null });
    const response = await campusFeed(req('/api/posts/feed/campus', { token: 'valid' }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_campus_feed', { p_auth_id: user.id });
    expect(await response.json()).toEqual({
      posts: [
        {
          postId: 1,
          authorId: 42,
          authorName: 'Maya Chen',
          authorPhotoUrl: null,
          textContent: 'Hello campus!',
          visibility: 'public',
          publishedAt: '2026-10-08T12:00:00Z',
          editedAt: null,
          photos: [],
        },
      ],
    });
  });

  it('surfaces a 403 when the account is not eligible', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'A verified, active university account is required.' } });
    const response = await campusFeed(req('/api/posts/feed/campus', { token: 'valid' }));
    expect(response.status).toBe(403);
  });
});

describe('Friends Feed (SRS-302)', () => {
  it('rejects an unauthenticated request', async () => {
    const response = await friendsFeed(req('/api/posts/feed/friends'));
    expect(response.status).toBe(401);
  });

  it('returns an empty feed when there is nothing to show', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const response = await friendsFeed(req('/api/posts/feed/friends', { token: 'valid' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ posts: [] });
  });

  it('returns friends-only posts from the RPC', async () => {
    rpc.mockResolvedValue({ data: [rawRow({ visibility: 'friends_only' })], error: null });
    const response = await friendsFeed(req('/api/posts/feed/friends', { token: 'valid' }));
    expect(rpc).toHaveBeenCalledWith('socialu_friends_feed', { p_auth_id: user.id });
    const body = await response.json();
    expect(body.posts).toHaveLength(1);
    expect(body.posts[0].visibility).toBe('friends_only');
  });
});

describe('Create Post (SRS-303)', () => {
  it('rejects an unauthenticated request', async () => {
    const response = await createPost(req('/api/posts', { method: 'POST', body: JSON.stringify({}) }));
    expect(response.status).toBe(401);
  });

  it('rejects blank text (validated inside socialu_create_post)', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '22023', message: 'Post text is required.' } });
    const response = await createPost(
      req('/api/posts', { method: 'POST', token: 'valid', body: JSON.stringify({ textContent: '   ', visibility: 'public' }) })
    );
    expect(response.status).toBe(400);
  });

  it('creates a post for the authenticated student', async () => {
    rpc.mockResolvedValue({ data: rawRow(), error: null });
    const response = await createPost(
      req('/api/posts', { method: 'POST', token: 'valid', body: JSON.stringify({ textContent: 'Hello!', visibility: 'public' }) })
    );
    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith('socialu_create_post', { p_auth_id: user.id, p_text: 'Hello!', p_visibility: 'public' });
    const body = await response.json();
    expect(body.post.authorId).toBe(42);
  });
});

describe('Attach Photos (SRS-304)', () => {
  function photoRequest(token: string | undefined, files: File[]) {
    const form = new FormData();
    for (const file of files) form.append('images', file);
    return req('/api/posts/1/photos', { method: 'POST', token, body: form });
  }

  it('rejects an unauthenticated request', async () => {
    const response = await attachPhotos(req('/api/posts/1/photos', { method: 'POST' }), { params: Promise.resolve({ postId: '1' }) });
    expect(response.status).toBe(401);
  });

  it('returns 404 when the post does not exist', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'Post not found.' } });
    const response = await attachPhotos(photoRequest('valid', [new File(['x'], 'a.jpg', { type: 'image/jpeg' })]), {
      params: Promise.resolve({ postId: '1' }),
    });
    expect(response.status).toBe(404);
  });

  it('returns 403 when the requester is not the post author', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'Only the post author can attach photos.' } });
    const response = await attachPhotos(photoRequest('valid', [new File(['x'], 'a.jpg', { type: 'image/jpeg' })]), {
      params: Promise.resolve({ postId: '1' }),
    });
    expect(response.status).toBe(403);
  });

  it('rejects an unsupported file type', async () => {
    const response = await attachPhotos(photoRequest('valid', [new File(['x'], 'a.gif', { type: 'image/gif' })]), {
      params: Promise.resolve({ postId: '1' }),
    });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('attaches supported photos to the post', async () => {
    rpc.mockResolvedValue({ data: 99, error: null });
    const response = await attachPhotos(
      photoRequest('valid', [new File(['x'], 'a.jpg', { type: 'image/jpeg' }), new File(['y'], 'b.png', { type: 'image/png' })]),
      { params: Promise.resolve({ postId: '1' }) }
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ attachedCount: 2 });
    expect(storageUpload).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenCalledTimes(2);
  });
});
