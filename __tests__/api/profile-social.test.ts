import { beforeEach, describe, expect, it, vi } from 'vitest';
const { verifiedUser, rpc, shape } = vi.hoisted(() => ({ verifiedUser: vi.fn(), rpc: vi.fn(), shape: vi.fn() }));
vi.mock('../../lib/socialu-account', async importOriginal => ({ ...await importOriginal<typeof import('../../lib/socialu-account')>(), verifiedUser, accountClient: () => ({}) }));
vi.mock('../../lib/profile', () => ({ profileRpc: rpc }));
vi.mock('../../lib/posts', () => ({ shapeFeedPosts: shape }));
import { AccountError } from '../../lib/socialu-account';
import { GET, POST } from '../../app/api/profiles/social/route';
const request = (body?: unknown, query = '') => new Request(`http://localhost/api/profiles/social${query}`, {
  method: body ? 'POST' : 'GET', ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
});
beforeEach(() => { vi.resetAllMocks(); verifiedUser.mockResolvedValue({ id: 'verified-user' }); rpc.mockResolvedValue({ saved: true }); shape.mockResolvedValue([{ postId: 1 }]); });
describe('Profile saved posts and follows', () => {
  it('derives the acting identity from authentication, ignoring forged identity fields', async () => {
    const response = await POST(request({ action: 'follow', username: 'alex', auth_user_id: 'victim', student_id: 999 }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_profile_social', { p_auth_id: 'verified-user', p_action: 'follow', p_username: 'alex' });
  });
  it.each(['save', 'unsave'])('changes only the caller’s saved state for %s', async action => {
    expect((await POST(request({ action, postId: 12 }))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_profile_social', { p_auth_id: 'verified-user', p_action: action, p_username: null, p_post_id: 12 });
  });
  it.each([0, -1, 1.2, 'bad', null, 9007199254740992])('rejects invalid post id %s', async postId => {
    expect((await POST(request({ action: 'save', postId }))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('signs visible saved post media and disables caching', async () => {
    rpc.mockResolvedValue([{ post_id: 1 }]);
    const response = await GET(request(undefined, '?action=saved'));
    expect(await response.json()).toEqual({ posts: [{ postId: 1 }] });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(shape).toHaveBeenCalledWith({}, [{ post_id: 1 }]);
  });
  it('rejects unauthenticated access before any RPC', async () => {
    verifiedUser.mockRejectedValue(new AccountError('Please sign in.', 401));
    expect((await GET(request())).status).toBe(401);
    expect((await POST(request({ action: 'save', postId: 1 }))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([['private saved posts', 403], ['blocked profile', 404], ['missing migration', 503]])('preserves the error for %s', async (_, status) => {
    rpc.mockRejectedValue(new AccountError('Unavailable', status as number));
    expect((await GET(request(undefined, '?action=saved&username=someone'))).status).toBe(status);
  });
  it.each([{ action: 'delete' }, { action: 'follow' }, { action: 'summary' }])('rejects unsupported or incomplete mutation %j', async body => {
    expect((await POST(request(body))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('does not allow mutation through GET', async () => {
    expect((await GET(request(undefined, '?action=follow&username=alex'))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});
