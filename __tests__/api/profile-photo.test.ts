import { beforeEach, expect, it, vi } from 'vitest';

const { getClient, getUser, rpc, download } = vi.hoisted(() => ({
  getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn(), download: vi.fn(),
}));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
import { GET } from '../../app/api/profiles/photo/route';

const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: 'session-1' })).toString('base64url') + '.signature';
function request(query = '', authenticated = true) {
  return new Request(`http://localhost/api/profiles/photo${query}`, { headers: authenticated ? { Authorization: `Bearer ${token}` } : {} });
}
beforeEach(() => {
  vi.resetAllMocks();vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc, storage: { from: () => ({ download }) } });
  getUser.mockResolvedValue({ data: { user: { id: 'viewer-1', email_confirmed_at: '2026-10-08' } }, error: null });
  rpc.mockImplementation(async fn => fn === 'socialu_session_guard' ? { data: true, error: null }
    : { data: { photo_key: 'profile/owner-2/portrait.jpg' }, error: null });
  download.mockResolvedValue({ data: new Blob(['photo-bytes'], { type: 'image/jpeg' }), error: null });
});

it('returns private image bytes after checking the viewer and target profile', async () => {
  const response = await GET(request('?username=classmate'));
  expect(response.status).toBe(200);
  expect(await response.text()).toBe('photo-bytes');
  expect(rpc).toHaveBeenCalledWith('socialu_profile_view', { p_auth_id: 'viewer-1', p_username: 'classmate' });
  expect(download).toHaveBeenCalledWith('profile/owner-2/portrait.jpg');
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  expect(response.headers.get('Vary')).toBe('Authorization');
  expect(response.headers.get('Content-Type')).toBe('image/jpeg');
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
});
it('defaults to the authenticated student and ignores a supplied storage key', async () => {
  await GET(request('?storageKey=profile/someone-else/private.png'));
  expect(rpc).toHaveBeenCalledWith('socialu_profile_view', { p_auth_id: 'viewer-1', p_username: null });
  expect(download).toHaveBeenCalledWith('profile/owner-2/portrait.jpg');
});
it('rejects a signed-out request without reading storage', async () => {
  expect((await GET(request('', false))).status).toBe(401);
  expect(download).not.toHaveBeenCalled();
});
it('does not download a blocked or inaccessible profile photo', async () => {
  rpc.mockImplementation(async fn => fn === 'socialu_session_guard' ? { data: true, error: null }
    : { data: null, error: { code: 'P0002', message: 'This profile is not available.' } });
  expect((await GET(request('?username=blocked'))).status).toBe(404);
  expect(download).not.toHaveBeenCalled();
});
it('does not download for a remotely ended session', async () => {
  rpc.mockResolvedValue({ data: false, error: null });
  expect((await GET(request())).status).toBe(401);
  expect(download).not.toHaveBeenCalled();
});
it('handles a profile without a saved photo', async () => {
  rpc.mockImplementation(async fn => fn === 'socialu_session_guard' ? { data: true, error: null }
    : { data: { photo_key: null }, error: null });
  expect((await GET(request())).status).toBe(404);
  expect(download).not.toHaveBeenCalled();
});
it('returns a recoverable error for a missing Storage object', async () => {
  download.mockResolvedValue({ data: null, error: { message: 'Object not found' } });
  expect((await GET(request())).status).toBe(502);
});
it('does not serve HTML or SVG disguised as a saved image', async () => {
  for (const type of ['text/html', 'image/svg+xml']) {
    download.mockResolvedValue({ data: new Blob(['<script>'], { type }), error: null });
    expect((await GET(request())).status).toBe(415);
  }
});
