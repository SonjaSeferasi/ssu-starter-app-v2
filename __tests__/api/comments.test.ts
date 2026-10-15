import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getClient, getUser, rpc, sessionGuard, storageSignedUrl } = vi.hoisted(() => ({
  getClient: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  sessionGuard: vi.fn(),
  storageSignedUrl: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));

const user = { id: 'auth-uuid-1', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z' };
const verifiedToken =
  'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';

function req(url: string, init: RequestInit & { token?: string } = {}) {
  const { token, headers, ...rest } = init;
  return new Request(`http://localhost${url}`, {
    ...rest,
    headers: { ...(headers as Record<string, string>), ...(token !== undefined ? { Authorization: `Bearer ${token === 'valid' ? verifiedToken : token}` } : {}) },
  });
}

const rawComment = (overrides: Partial<Record<string, unknown>> = {}) => ({
  comment_id: 1,
  post_id: 10,
  author_id: 42,
  text_content: 'Nice post!',
  created_at: '2026-10-16T12:00:00Z',
  edited_at: null,
  author_name: 'Maya Chen',
  author_photo_key: null,
  ...overrides,
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({
    auth: { getUser },
    rpc: (fn: string, args: unknown) => (fn === 'socialu_session_guard' ? sessionGuard(args) : rpc(fn, args)),
    storage: { from: vi.fn(() => ({ createSignedUrl: storageSignedUrl })) },
  });
  getUser.mockResolvedValue({ data: { user }, error: null });
  sessionGuard.mockResolvedValue({ data: true, error: null });
  storageSignedUrl.mockImplementation(async (key: string) => ({ data: { signedUrl: `https://signed.example/${key}` }, error: null }));
});

import { GET as listComments, POST as createComment } from '../../app/api/posts/[postId]/comments/route';
import { PATCH as updateComment, DELETE as deleteComment } from '../../app/api/comments/[commentId]/route';

function postReq(token: string | undefined, text: unknown, postId = '10') {
  return req(`/api/posts/${postId}/comments`, {
    method: 'POST',
    token,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ textContent: text }),
  });
}

describe('List Comments (SRS-310.1, SRS-311 minimum display)', () => {
  it('rejects an unauthenticated request', async () => {
    const response = await listComments(req('/api/posts/10/comments'), { params: Promise.resolve({ postId: '10' }) });
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects an invalid post id without calling the database', async () => {
    const response = await listComments(req('/api/posts/nope/comments', { token: 'valid' }), { params: Promise.resolve({ postId: 'nope' }) });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('returns comments oldest first with author name, photo, text, and timestamp (comments persist after refreshing)', async () => {
    rpc.mockResolvedValue({
      data: [
        rawComment({ comment_id: 1, text_content: 'First!' }),
        rawComment({ comment_id: 2, text_content: 'Second.', author_photo_key: 'student_photo/42/a.jpg' }),
      ],
      error: null,
    });
    const response = await listComments(req('/api/posts/10/comments', { token: 'valid' }), { params: Promise.resolve({ postId: '10' }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.comments).toHaveLength(2);
    expect(body.comments[0]).toMatchObject({ commentId: 1, textContent: 'First!', authorName: 'Maya Chen' });
    expect(body.comments[1].authorPhotoUrl).toBe('https://signed.example/student_photo/42/a.jpg');
  });

  it('a non-friend cannot read comments on an inaccessible Friends Only post', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'You are not authorized to view this post.' } });
    const response = await listComments(req('/api/posts/10/comments', { token: 'valid' }), { params: Promise.resolve({ postId: '10' }) });
    expect(response.status).toBe(403);
  });

  it('returns 404 for a post that does not exist', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'Post not found.' } });
    const response = await listComments(req('/api/posts/999/comments', { token: 'valid' }), { params: Promise.resolve({ postId: '999' }) });
    expect(response.status).toBe(404);
  });
});

describe('Submit a Comment (SRS-310.1/310.2/310.3)', () => {
  it('rejects an unauthenticated request', async () => {
    const response = await createComment(postReq(undefined, 'Hi'), { params: Promise.resolve({ postId: '10' }) });
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects an invalid post id without calling the database', async () => {
    const response = await createComment(postReq('valid', 'Hi', 'nope'), { params: Promise.resolve({ postId: 'nope' }) });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('an authenticated student comments on a Public post (SRS-310.1)', async () => {
    rpc.mockResolvedValue({ data: rawComment(), error: null });
    const response = await createComment(postReq('valid', 'Nice post!'), { params: Promise.resolve({ postId: '10' }) });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.comment).toMatchObject({ commentId: 1, postId: 10, authorId: 42, textContent: 'Nice post!' });
  });

  it('associates the comment with the correct post and the authenticated student, never a client-supplied author (SRS-310.2/310.3)', async () => {
    rpc.mockResolvedValue({ data: rawComment(), error: null });
    await createComment(postReq('valid', 'Nice post!'), { params: Promise.resolve({ postId: '10' }) });
    expect(rpc).toHaveBeenCalledWith('socialu_create_comment', { p_auth_id: user.id, p_post_id: 10, p_text: 'Nice post!' });
  });

  it('an accepted friend comments on a Friends Only post (same RPC enforces it)', async () => {
    rpc.mockResolvedValue({ data: rawComment({ post_id: 11 }), error: null });
    const response = await createComment(postReq('valid', 'Love this!', '11'), { params: Promise.resolve({ postId: '11' }) });
    expect(response.status).toBe(201);
  });

  it('a non-friend cannot comment on a Friends Only post', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'You are not authorized to view this post.' } });
    const response = await createComment(postReq('valid', 'Let me in'), { params: Promise.resolve({ postId: '10' }) });
    expect(response.status).toBe(403);
  });

  it('a student without a verified university account cannot comment', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'A verified, active university account is required.' } });
    const response = await createComment(postReq('valid', 'Hi'), { params: Promise.resolve({ postId: '10' }) });
    expect(response.status).toBe(403);
  });

  it('rejects an empty comment', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '22023', message: 'Comment text is required.' } });
    const response = await createComment(postReq('valid', ''), { params: Promise.resolve({ postId: '10' }) });
    expect(response.status).toBe(400);
  });

  it('rejects a whitespace-only comment', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '22023', message: 'Comment text is required.' } });
    const response = await createComment(postReq('valid', '    '), { params: Promise.resolve({ postId: '10' }) });
    expect(response.status).toBe(400);
    // textField() trims before the RPC call -- whitespace-only arrives as an empty string.
    expect(rpc).toHaveBeenCalledWith('socialu_create_comment', { p_auth_id: user.id, p_post_id: 10, p_text: '' });
  });

  it('returns 404 for a post that does not exist', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'Post not found.' } });
    const response = await createComment(postReq('valid', 'Hi', '999'), { params: Promise.resolve({ postId: '999' }) });
    expect(response.status).toBe(404);
  });

  it('surfaces a 503 when the database operation fails unexpectedly', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'unexpected' } });
    const response = await createComment(postReq('valid', 'Hi'), { params: Promise.resolve({ postId: '10' }) });
    expect(response.status).toBe(503);
  });
});

describe('Edit Own Comment (parity with SRS-306, not itself a numbered SRS-310 sub-requirement)', () => {
  function patchReq(token: string | undefined, text: unknown, commentId = '1') {
    return req(`/api/comments/${commentId}`, {
      method: 'PATCH',
      token,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ textContent: text }),
    });
  }

  it('rejects an unauthenticated request', async () => {
    const response = await updateComment(req('/api/comments/1', { method: 'PATCH' }), { params: Promise.resolve({ commentId: '1' }) });
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects an invalid comment id without calling the database', async () => {
    const response = await updateComment(patchReq('valid', 'Updated', 'nope'), { params: Promise.resolve({ commentId: 'nope' }) });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('a student edits their own comment', async () => {
    rpc.mockResolvedValue({ data: rawComment({ text_content: 'Updated text', edited_at: '2026-10-16T13:00:00Z' }), error: null });
    const response = await updateComment(patchReq('valid', 'Updated text'), { params: Promise.resolve({ commentId: '1' }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.comment).toMatchObject({ textContent: 'Updated text', editedAt: '2026-10-16T13:00:00Z' });
    expect(rpc).toHaveBeenCalledWith('socialu_update_comment', { p_auth_id: user.id, p_comment_id: 1, p_text: 'Updated text' });
  });

  it('a student cannot edit another student\'s comment', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'Only the comment author can edit this comment.' } });
    const response = await updateComment(patchReq('valid', 'Hijacked'), { params: Promise.resolve({ commentId: '1' }) });
    expect(response.status).toBe(403);
  });

  it('rejects an empty updated comment', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '22023', message: 'Comment text is required.' } });
    const response = await updateComment(patchReq('valid', ''), { params: Promise.resolve({ commentId: '1' }) });
    expect(response.status).toBe(400);
  });

  it('returns 404 for a comment that does not exist', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'Comment not found.' } });
    const response = await updateComment(patchReq('valid', 'Updated', '999'), { params: Promise.resolve({ commentId: '999' }) });
    expect(response.status).toBe(404);
  });

  it('surfaces a 503 when the database operation fails unexpectedly', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'unexpected' } });
    const response = await updateComment(patchReq('valid', 'Updated'), { params: Promise.resolve({ commentId: '1' }) });
    expect(response.status).toBe(503);
  });
});

describe('Delete Own Comment (parity with SRS-307, not itself a numbered SRS-310 sub-requirement)', () => {
  function delReq(token: string | undefined, commentId = '1') {
    return req(`/api/comments/${commentId}`, { method: 'DELETE', token });
  }

  it('rejects an unauthenticated request', async () => {
    const response = await deleteComment(req('/api/comments/1', { method: 'DELETE' }), { params: Promise.resolve({ commentId: '1' }) });
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects an invalid comment id without calling the database', async () => {
    const response = await deleteComment(delReq('valid', 'nope'), { params: Promise.resolve({ commentId: 'nope' }) });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('a student deletes their own comment', async () => {
    rpc.mockResolvedValue({ data: { deleted: true }, error: null });
    const response = await deleteComment(delReq('valid'), { params: Promise.resolve({ commentId: '1' }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: true });
    expect(rpc).toHaveBeenCalledWith('socialu_delete_comment', { p_auth_id: user.id, p_comment_id: 1 });
  });

  it('a student cannot delete another student\'s comment', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'Only the comment author can delete this comment.' } });
    const response = await deleteComment(delReq('valid'), { params: Promise.resolve({ commentId: '1' }) });
    expect(response.status).toBe(403);
  });

  it('returns 404 for a comment that does not exist', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'Comment not found.' } });
    const response = await deleteComment(delReq('valid', '999'), { params: Promise.resolve({ commentId: '999' }) });
    expect(response.status).toBe(404);
  });

  it('surfaces a 503 when the database operation fails unexpectedly', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'unexpected' } });
    const response = await deleteComment(delReq('valid'), { params: Promise.resolve({ commentId: '1' }) });
    expect(response.status).toBe(503);
  });
});
