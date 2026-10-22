import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getClient, getUser, rpc, sessionGuard } = vi.hoisted(() => ({
  getClient: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  sessionGuard: vi.fn(),
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

function reportReq(token: string | undefined, reason: unknown, postId = '10') {
  return req(`/api/posts/${postId}/report`, {
    method: 'POST',
    token,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({
    auth: { getUser },
    rpc: (fn: string, args: unknown) => (fn === 'socialu_session_guard' ? sessionGuard(args) : rpc(fn, args)),
  });
  getUser.mockResolvedValue({ data: { user }, error: null });
  sessionGuard.mockResolvedValue({ data: true, error: null });
});

import { POST as reportPost } from '../../app/api/posts/[postId]/report/route';

// SRS-314: report creation/threshold/privacy logic lives entirely in
// socialu_report_post's SQL (same situation as every other RPC-backed
// feature here) -- the 5-distinct-reporter threshold itself is verified
// live against the real schema in __tests__/database/report-post.test.ts,
// not here. These are route-level tests of request handling and RPC passthrough.
describe('Report Post (SRS-314.1-314.5, reasons are additional functionality)', () => {
  it('rejects an unauthenticated request', async () => {
    const response = await reportPost(req('/api/posts/10/report', { method: 'POST' }), { params: Promise.resolve({ postId: '10' }) });
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects an invalid post id without calling the database', async () => {
    const response = await reportPost(reportReq('valid', 'spam', 'nope'), { params: Promise.resolve({ postId: 'nope' }) });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('submits a report with a reason and passes it through to the RPC', async () => {
    rpc.mockResolvedValue({ data: { reported: true, post_removed: false }, error: null });
    const response = await reportPost(reportReq('valid', 'harassment'), { params: Promise.resolve({ postId: '10' }) });
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_report_post', { p_auth_id: user.id, p_post_id: 10, p_reason: 'harassment' });
    expect(await response.json()).toEqual({ reported: true, postRemoved: false });
  });

  it('reflects postRemoved when this report was the 5th distinct one and the threshold fired', async () => {
    rpc.mockResolvedValue({ data: { reported: true, post_removed: true }, error: null });
    const response = await reportPost(reportReq('valid', 'spam'), { params: Promise.resolve({ postId: '10' }) });
    expect(await response.json()).toEqual({ reported: true, postRemoved: true });
  });

  it('a repeat report from the same student is a non-error no-op, not a new report', async () => {
    rpc.mockResolvedValue({ data: { reported: false, post_removed: false }, error: null });
    const response = await reportPost(reportReq('valid', 'spam'), { params: Promise.resolve({ postId: '10' }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reported: false, postRemoved: false });
  });

  it('the response never includes a reporter identity field (SRS-314.5/NFR-43)', async () => {
    rpc.mockResolvedValue({ data: { reported: true, post_removed: false }, error: null });
    const response = await reportPost(reportReq('valid', 'other'), { params: Promise.resolve({ postId: '10' }) });
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(['postRemoved', 'reported']);
  });

  it('a student cannot report their own post', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'You cannot report your own post.' } });
    const response = await reportPost(reportReq('valid', 'spam'), { params: Promise.resolve({ postId: '10' }) });
    expect(response.status).toBe(403);
  });

  it('a non-friend cannot report an inaccessible Friends Only post', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'You are not authorized to view this post.' } });
    const response = await reportPost(reportReq('valid', 'spam'), { params: Promise.resolve({ postId: '10' }) });
    expect(response.status).toBe(403);
  });

  it('rejects an invalid report reason', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '22023', message: 'Choose a valid report reason.' } });
    const response = await reportPost(reportReq('valid', 'not-a-real-reason'), { params: Promise.resolve({ postId: '10' }) });
    expect(response.status).toBe(400);
  });

  it('returns 404 for a post that does not exist', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'Post not found.' } });
    const response = await reportPost(reportReq('valid', 'spam', '999'), { params: Promise.resolve({ postId: '999' }) });
    expect(response.status).toBe(404);
  });

  it('surfaces a 503 when the database operation fails unexpectedly', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'unexpected' } });
    const response = await reportPost(reportReq('valid', 'spam'), { params: Promise.resolve({ postId: '10' }) });
    expect(response.status).toBe(503);
  });
});
