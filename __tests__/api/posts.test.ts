import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getClient, getUser, rpc, sessionGuard, storageUpload, storageSignedUrl, storageRemove } = vi.hoisted(() => ({
  getClient: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  sessionGuard: vi.fn(),
  storageUpload: vi.fn(),
  storageSignedUrl: vi.fn(),
  storageRemove: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));

const user = { id: 'auth-uuid-1', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z' };
const verifiedToken = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';

function req(url: string, init: RequestInit & { token?: string } = {}) {
  const { token, headers, ...rest } = init;
  return new Request(`http://localhost${url}`, {
    ...rest,
    headers: { ...(headers as Record<string, string>), ...(token !== undefined ? { Authorization: `Bearer ${token === 'valid' ? verifiedToken : token}` } : {}) },
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
  author_username: 'maya.chen',
  author_photo_key: null,
  photos: [],
  like_count: 0,
  is_liked_by_viewer: false,
  comment_count: 0,
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({
    auth: { getUser },
    rpc: (fn: string, args: unknown) => fn === 'socialu_session_guard' ? sessionGuard(args) : rpc(fn, args),
    storage: { from: vi.fn(() => ({ upload: storageUpload, createSignedUrl: storageSignedUrl, remove: storageRemove })) },
  });
  getUser.mockResolvedValue({ data: { user }, error: null });
  sessionGuard.mockResolvedValue({ data: true, error: null });
  storageUpload.mockResolvedValue({ error: null });
  storageSignedUrl.mockImplementation(async (key: string) => ({ data: { signedUrl: `https://signed.example/${key}` }, error: null }));
  storageRemove.mockResolvedValue({ data: [], error: null });
});

import { GET as campusFeed } from '../../app/api/posts/feed/campus/route';
import { GET as friendsFeed } from '../../app/api/posts/feed/friends/route';
import { POST as createPost } from '../../app/api/posts/route';
import { PATCH as updatePost, DELETE as deletePost } from '../../app/api/posts/[postId]/route';
import { POST as attachPhotos } from '../../app/api/posts/[postId]/photos/route';
import { DELETE as removePhoto } from '../../app/api/posts/[postId]/photos/[assetId]/route';
import { POST as likePost, DELETE as unlikePost } from '../../app/api/posts/[postId]/likes/route';

describe('Campus Feed (SRS-301)', () => {
  it('does not return feed data after a password security action revokes the session', async () => {
    sessionGuard.mockResolvedValue({ data: false, error: null });
    const response = await campusFeed(req('/api/posts/feed/campus', { token: 'valid' }));
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

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
          authorUsername: 'maya.chen',
          authorPhotoUrl: null,
          textContent: 'Hello campus!',
          visibility: 'public',
          publishedAt: '2026-10-08T12:00:00Z',
          editedAt: null,
          photos: [],
          mentions: [],
          likeCount: 0,
          isLikedByViewer: false,
          commentCount: 0,
        },
      ],
    });
  });

  it('resolves each photo to its asset id and a signed URL', async () => {
    rpc.mockResolvedValue({
      data: [rawRow({ photos: [{ asset_id: 7, storage_key: 'post_photo/1/7.jpg' }] })],
      error: null,
    });
    const response = await campusFeed(req('/api/posts/feed/campus', { token: 'valid' }));
    const body = await response.json();
    expect(body.posts[0].photos).toEqual([{ assetId: 7, url: 'https://signed.example/post_photo/1/7.jpg' }]);
  });

  it('surfaces a 403 when the account is not eligible', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'A verified, active university account is required.' } });
    const response = await campusFeed(req('/api/posts/feed/campus', { token: 'valid' }));
    expect(response.status).toBe(403);
  });

  // Tagging/Mentioning Students (additional functionality, not SRS-numbered).
  // This route-level test covers what the PGlite database test can't --
  // the Next.js shaping layer that resolves each mention's photo_key to a
  // signed photo_url and camelCases the row, same as it already does for
  // post photos above.
  it("shapes a post's mentions with resolved photo URLs", async () => {
    rpc.mockResolvedValue({
      data: [rawRow({
        mentions: [
          { student_id: 7, matched_username: 'oldhandle', username: 'newhandle', name: 'Sam Lee', photo_key: 'profile/7/photo.jpg' },
          { student_id: 9, matched_username: 'jordan', username: 'jordan', name: 'Jordan Kim', photo_key: null },
        ],
      })],
      error: null,
    });
    const response = await campusFeed(req('/api/posts/feed/campus', { token: 'valid' }));
    const body = await response.json();
    expect(body.posts[0].mentions).toEqual([
      { studentId: 7, matchedUsername: 'oldhandle', username: 'newhandle', name: 'Sam Lee', photoUrl: 'https://signed.example/profile/7/photo.jpg' },
      { studentId: 9, matchedUsername: 'jordan', username: 'jordan', name: 'Jordan Kim', photoUrl: null },
    ]);
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

  // Neither SRS-303 nor SRS-304 requires text to accompany a photo -- a
  // blank/whitespace-only textContent is accepted here (socialu_create_post
  // stores no text_content); PostComposer.tsx is what actually guards
  // against publishing with neither text nor a photo, since the two calls
  // (create post, then attach photos) aren't atomic.
  it('accepts blank text (a photo-only post attaches its photo in a separate request)', async () => {
    rpc.mockResolvedValue({ data: rawRow({ text_content: null }), error: null });
    const response = await createPost(
      req('/api/posts', { method: 'POST', token: 'valid', body: JSON.stringify({ textContent: '   ', visibility: 'public' }) })
    );
    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith('socialu_create_post', { p_auth_id: user.id, p_text: '', p_visibility: 'public' });
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

describe('Edit Post text (SRS-306.1/306.2/306.4/306.5)', () => {
  function editReq(token: string | undefined, text: string) {
    return req('/api/posts/1', { method: 'PATCH', token, body: JSON.stringify({ textContent: text }) });
  }

  it('rejects an unauthenticated request (SRS-306.5: direct API call without a session)', async () => {
    const response = await updatePost(req('/api/posts/1', { method: 'PATCH', body: JSON.stringify({ textContent: 'x' }) }), {
      params: Promise.resolve({ postId: '1' }),
    });
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects an invalid post id without calling the database', async () => {
    const response = await updatePost(editReq('valid', 'Updated text'), { params: Promise.resolve({ postId: 'nope' }) });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('student A successfully edits their own Public post, and edited_at is returned', async () => {
    rpc.mockResolvedValue({
      data: rawRow({ text_content: 'Updated text', edited_at: '2026-10-15T09:00:00Z' }),
      error: null,
    });
    const response = await updatePost(editReq('valid', 'Updated text'), { params: Promise.resolve({ postId: '1' }) });
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_update_post', { p_auth_id: user.id, p_post_id: 1, p_text: 'Updated text' });
    const body = await response.json();
    expect(body.post.textContent).toBe('Updated text');
    expect(body.post.editedAt).toBe('2026-10-15T09:00:00Z');
  });

  it('student A successfully edits their own Friends Only post', async () => {
    rpc.mockResolvedValue({
      data: rawRow({ visibility: 'friends_only', text_content: 'Updated', edited_at: '2026-10-15T09:00:00Z' }),
      error: null,
    });
    const response = await updatePost(editReq('valid', 'Updated'), { params: Promise.resolve({ postId: '1' }) });
    expect(response.status).toBe(200);
    expect((await response.json()).post.visibility).toBe('friends_only');
  });

  it("student B cannot edit student A's post (SRS-306.5)", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'Only the post author can edit this post.' } });
    const response = await updatePost(editReq('valid', 'Hijacked text'), { params: Promise.resolve({ postId: '1' }) });
    expect(response.status).toBe(403);
  });

  it('returns 404 for a post that does not exist', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'Post not found.' } });
    const response = await updatePost(editReq('valid', 'Text'), { params: Promise.resolve({ postId: '999' }) });
    expect(response.status).toBe(404);
  });

  it('rejects blank text when the post has no photos to fall back on (schema.sql\'s check_post_content trigger, P0001 -> 400)', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'A published post must contain text or a photo' } });
    const response = await updatePost(editReq('valid', '   '), { params: Promise.resolve({ postId: '1' }) });
    expect(response.status).toBe(400);
  });

  it('accepts blank text when the post already has at least one photo', async () => {
    rpc.mockResolvedValue({
      data: rawRow({ text_content: null, photos: [{ asset_id: 7, storage_key: 'post_photo/1/7.jpg' }] }),
      error: null,
    });
    const response = await updatePost(editReq('valid', '   '), { params: Promise.resolve({ postId: '1' }) });
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_update_post', { p_auth_id: user.id, p_post_id: 1, p_text: '' });
  });
});

describe('Remove a post photo (SRS-306.3/306.5)', () => {
  function removeReq(token: string | undefined) {
    return req('/api/posts/1/photos/7', { method: 'DELETE', token });
  }

  it('rejects an unauthenticated request (SRS-306.5: direct API call without a session)', async () => {
    const response = await removePhoto(req('/api/posts/1/photos/7', { method: 'DELETE' }), {
      params: Promise.resolve({ postId: '1', assetId: '7' }),
    });
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects an invalid post or photo id without calling the database', async () => {
    const response = await removePhoto(removeReq('valid'), { params: Promise.resolve({ postId: '1', assetId: 'nope' }) });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('removes the DB link and deletes the Storage object', async () => {
    rpc.mockResolvedValue({ data: 'post_photo/1/7.jpg', error: null });
    const response = await removePhoto(removeReq('valid'), { params: Promise.resolve({ postId: '1', assetId: '7' }) });
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_remove_post_photo', { p_auth_id: user.id, p_post_id: 1, p_asset_id: 7 });
    expect(storageRemove).toHaveBeenCalledWith(['post_photo/1/7.jpg']);
  });

  it("student B cannot remove a photo from student A's post (SRS-306.5)", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'Only the post author can edit this post.' } });
    const response = await removePhoto(removeReq('valid'), { params: Promise.resolve({ postId: '1', assetId: '7' }) });
    expect(response.status).toBe(403);
  });

  it('returns 404 when the photo is not on this post', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'Photo not found on this post.' } });
    const response = await removePhoto(removeReq('valid'), { params: Promise.resolve({ postId: '1', assetId: '7' }) });
    expect(response.status).toBe(404);
  });
});

describe('Delete Post (SRS-307.1/307.3/307.5)', () => {
  function deleteReq(token: string | undefined) {
    return req('/api/posts/1', { method: 'DELETE', token });
  }

  it('rejects an unauthenticated request (SRS-307.5: direct API call without a session)', async () => {
    const response = await deletePost(req('/api/posts/1', { method: 'DELETE' }), { params: Promise.resolve({ postId: '1' }) });
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects an invalid post id without calling the database', async () => {
    const response = await deletePost(deleteReq('valid'), { params: Promise.resolve({ postId: 'nope' }) });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('author deletes their own Public post', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const response = await deletePost(deleteReq('valid'), { params: Promise.resolve({ postId: '1' }) });
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_delete_post', { p_auth_id: user.id, p_post_id: 1 });
    expect(await response.json()).toEqual({ deleted: true });
  });

  it('author deletes their own Friends Only post, same endpoint and rule', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const response = await deletePost(deleteReq('valid'), { params: Promise.resolve({ postId: '2' }) });
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_delete_post', { p_auth_id: user.id, p_post_id: 2 });
  });

  it('deletes any freed photo files from Storage', async () => {
    rpc.mockResolvedValue({ data: ['post_photo/1/a.jpg', 'post_photo/1/b.jpg'], error: null });
    const response = await deletePost(deleteReq('valid'), { params: Promise.resolve({ postId: '1' }) });
    expect(response.status).toBe(200);
    expect(storageRemove).toHaveBeenCalledWith(['post_photo/1/a.jpg', 'post_photo/1/b.jpg']);
  });

  it('does not call Storage when the post had no photos', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await deletePost(deleteReq('valid'), { params: Promise.resolve({ postId: '1' }) });
    expect(storageRemove).not.toHaveBeenCalled();
  });

  it("student B cannot delete student A's post (SRS-307.5)", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'Only the post author can delete this post.' } });
    const response = await deletePost(deleteReq('valid'), { params: Promise.resolve({ postId: '1' }) });
    expect(response.status).toBe(403);
    expect(storageRemove).not.toHaveBeenCalled();
  });

  it('returns 404 for a post that does not exist', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'Post not found.' } });
    const response = await deletePost(deleteReq('valid'), { params: Promise.resolve({ postId: '999' }) });
    expect(response.status).toBe(404);
  });
});

describe('Like Post (SRS-308.1/308.2/308.3)', () => {
  function likeReq(token: string | undefined, postId = '1') {
    return req(`/api/posts/${postId}/likes`, { method: 'POST', token });
  }

  it('rejects an unauthenticated request', async () => {
    const response = await likePost(req('/api/posts/1/likes', { method: 'POST' }), { params: Promise.resolve({ postId: '1' }) });
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects an invalid post id without calling the database', async () => {
    const response = await likePost(likeReq('valid', 'nope'), { params: Promise.resolve({ postId: 'nope' }) });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('an authenticated student likes a Public post', async () => {
    rpc.mockResolvedValue({ data: { like_count: 1, is_liked_by_viewer: true }, error: null });
    const response = await likePost(likeReq('valid'), { params: Promise.resolve({ postId: '1' }) });
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_like_post', { p_auth_id: user.id, p_post_id: 1 });
    expect(await response.json()).toEqual({ likeCount: 1, isLikedByViewer: true });
  });

  it('an accepted friend likes a Friends Only post (same RPC enforces it)', async () => {
    rpc.mockResolvedValue({ data: { like_count: 3, is_liked_by_viewer: true }, error: null });
    const response = await likePost(likeReq('valid'), { params: Promise.resolve({ postId: '1' }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ likeCount: 3, isLikedByViewer: true });
  });

  it('a student not authorized to view a Friends Only post cannot like it', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'You are not authorized to view this post.' } });
    const response = await likePost(likeReq('valid'), { params: Promise.resolve({ postId: '1' }) });
    expect(response.status).toBe(403);
  });

  it('returns 404 for a post that does not exist', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'Post not found.' } });
    const response = await likePost(likeReq('valid', '999'), { params: Promise.resolve({ postId: '999' }) });
    expect(response.status).toBe(404);
  });

  it('liking an already-liked post is idempotent, not an error (duplicate-like prevention)', async () => {
    // socialu_like_post's ON CONFLICT DO NOTHING means a second like call
    // from the same student just returns the same unchanged count.
    rpc.mockResolvedValue({ data: { like_count: 1, is_liked_by_viewer: true }, error: null });
    const first = await likePost(likeReq('valid'), { params: Promise.resolve({ postId: '1' }) });
    const second = await likePost(likeReq('valid'), { params: Promise.resolve({ postId: '1' }) });
    expect(await first.json()).toEqual({ likeCount: 1, isLikedByViewer: true });
    expect(await second.json()).toEqual({ likeCount: 1, isLikedByViewer: true });
  });

  it('surfaces a 503 when the database operation fails unexpectedly', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'unexpected' } });
    const response = await likePost(likeReq('valid'), { params: Promise.resolve({ postId: '1' }) });
    expect(response.status).toBe(503);
  });
});

describe('Remove a Like / Unlike Post (SRS-309.1/309.2)', () => {
  function unlikeReq(token: string | undefined, postId = '1') {
    return req(`/api/posts/${postId}/likes`, { method: 'DELETE', token });
  }

  it('rejects an unauthenticated request', async () => {
    const response = await unlikePost(req('/api/posts/1/likes', { method: 'DELETE' }), { params: Promise.resolve({ postId: '1' }) });
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects an invalid post id without calling the database', async () => {
    const response = await unlikePost(unlikeReq('valid', 'nope'), { params: Promise.resolve({ postId: 'nope' }) });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('an authenticated student removes their like from a Public post', async () => {
    rpc.mockResolvedValue({ data: { like_count: 4, is_liked_by_viewer: false }, error: null });
    const response = await unlikePost(unlikeReq('valid'), { params: Promise.resolve({ postId: '1' }) });
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_unlike_post', { p_auth_id: user.id, p_post_id: 1 });
    expect(await response.json()).toEqual({ likeCount: 4, isLikedByViewer: false });
  });

  it('the like count decreases by exactly one', async () => {
    // A post with 5 likes drops to 4 once the caller's own like is removed --
    // the DELETE is scoped to the caller's student id, so it cannot touch anyone else's row.
    rpc.mockResolvedValue({ data: { like_count: 4, is_liked_by_viewer: false }, error: null });
    const response = await unlikePost(unlikeReq('valid'), { params: Promise.resolve({ postId: '1' }) });
    expect((await response.json()).likeCount).toBe(4);
  });

  it('repeated Unlike requests do not reduce the count further (idempotent, not an error)', async () => {
    // socialu_unlike_post's DELETE matches zero rows on a second call -- the
    // count it returns stays whatever it already was, same as SRS-308's
    // ON CONFLICT DO NOTHING mirrored in the other direction.
    rpc.mockResolvedValue({ data: { like_count: 4, is_liked_by_viewer: false }, error: null });
    const first = await unlikePost(unlikeReq('valid'), { params: Promise.resolve({ postId: '1' }) });
    const second = await unlikePost(unlikeReq('valid'), { params: Promise.resolve({ postId: '1' }) });
    expect(await first.json()).toEqual({ likeCount: 4, isLikedByViewer: false });
    expect(await second.json()).toEqual({ likeCount: 4, isLikedByViewer: false });
  });

  it('a student can like a post again after unliking it', async () => {
    rpc.mockResolvedValueOnce({ data: { like_count: 4, is_liked_by_viewer: false }, error: null });
    const unliked = await unlikePost(unlikeReq('valid'), { params: Promise.resolve({ postId: '1' }) });
    expect(await unliked.json()).toEqual({ likeCount: 4, isLikedByViewer: false });

    rpc.mockResolvedValueOnce({ data: { like_count: 5, is_liked_by_viewer: true }, error: null });
    const liked = await likePost(req('/api/posts/1/likes', { method: 'POST', token: 'valid' }), { params: Promise.resolve({ postId: '1' }) });
    expect(await liked.json()).toEqual({ likeCount: 5, isLikedByViewer: true });
  });

  it("cannot remove another student's like (DELETE is scoped to the caller's own row)", async () => {
    // socialu_unlike_post always deletes WHERE student_id = (the authenticated
    // caller's resolved id) -- there is no student_id parameter a client could
    // supply to target someone else's like, so this is enforced by the RPC's
    // signature itself, not by application-level filtering we could get wrong.
    // Here that means: another student's like survives, reflected by the
    // count only dropping by the caller's own removal, never more.
    rpc.mockResolvedValue({ data: { like_count: 1, is_liked_by_viewer: false }, error: null });
    const response = await unlikePost(unlikeReq('valid'), { params: Promise.resolve({ postId: '1' }) });
    const body = await response.json();
    expect(body.likeCount).toBe(1); // one like (the other student's) remains
    expect(rpc).toHaveBeenCalledWith('socialu_unlike_post', { p_auth_id: user.id, p_post_id: 1 });
  });

  it('a student not authorized to view a Friends Only post cannot unlike it', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'You are not authorized to view this post.' } });
    const response = await unlikePost(unlikeReq('valid'), { params: Promise.resolve({ postId: '1' }) });
    expect(response.status).toBe(403);
  });

  it('returns 404 for a post that does not exist', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'Post not found.' } });
    const response = await unlikePost(unlikeReq('valid', '999'), { params: Promise.resolve({ postId: '999' }) });
    expect(response.status).toBe(404);
  });

  it('surfaces a 503 when the database operation fails unexpectedly, without corrupting the response shape', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'unexpected' } });
    const response = await unlikePost(unlikeReq('valid'), { params: Promise.resolve({ postId: '1' }) });
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(typeof body.error).toBe('string');
  });
});
