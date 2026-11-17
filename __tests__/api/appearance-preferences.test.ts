import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
import { GET, PUT } from '../../app/api/preferences/appearance/route';
const user = { id: 'verified-owner', email_confirmed_at: '2026-11-17T00:00:00Z' };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: 'fixture-session' })).toString('base64url') + '.signature';
const request = (method: string, body?: unknown, authorization = token) => new Request('http://localhost/api/preferences/appearance', {
  method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authorization}` },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
  rpc.mockImplementation(async (name, args) => ({ data: name === 'socialu_session_guard' ? true : { theme: args.p_theme ?? 'light' }, error: null }));
});
describe('SRS-627 appearance account boundary', () => {
  it('reads a default without exposing cacheable account data', async () => {
    const response = await GET(request('GET'));
    expect(await response.json()).toEqual({ theme: 'light' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
  it.each(['light', 'dark'])('saves %s only for the verified user', async theme => {
    expect((await PUT(request('PUT', { theme, student_id: 999, p_auth_id: 'victim' }))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_appearance', { p_auth_id: user.id, p_theme: theme });
  });
  it.each(['system', '', null, 5, {}, true])('rejects unsupported preference %j before database access', async theme => {
    expect((await PUT(request('PUT', { theme }))).status).toBe(400); expect(rpc).not.toHaveBeenCalled();
  });
  it('requires sign-in', async () => { expect((await GET(request('GET', undefined, ''))).status).toBe(401); expect(rpc).not.toHaveBeenCalled(); });
  it('rejects unverified accounts', async () => {
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } } });
    expect((await GET(request('GET'))).status).toBe(403); expect(rpc).not.toHaveBeenCalled();
  });
  it('rejects revoked sessions', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    expect((await PUT(request('PUT', { theme: 'dark' }))).status).toBe(401);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it.each(['PGRST202', 'XX000', '42501'])('reports database failure %s without a false saved response', async code => {
    rpc.mockImplementation(async name => name === 'socialu_session_guard' ? { data: true } : { error: { code } });
    const response = await PUT(request('PUT', { theme: 'dark' }));
    expect(response.status).toBe(code === '42501' ? 403 : 503);
    expect((await response.json()).theme).toBeUndefined();
  });
  it('does not treat malformed storage results as a saved preference', async () => {
    rpc.mockImplementation(async name => ({ data: name === 'socialu_session_guard' ? true : { theme: 'system' } }));
    expect((await GET(request('GET'))).status).toBe(503);
  });
});
