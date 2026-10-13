import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
import { GET, PUT } from '../../app/api/game-room/route';
import { PUT as savePreferences } from '../../app/api/preferences/route';
const user = { id: 'verified-provider-id', email_confirmed_at: '2026-10-09T12:00:00Z' };
function req(method: string, body?: unknown, token = 'verified-token') {
  return new Request('http://localhost/api/game-room', { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
}
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
  rpc.mockImplementation(async (name: string) => name === 'socialu_account' ? { data: { id: '42' }, error: null } : { data: { appearance: { outfitId: '1', faceId: '2' } }, error: null });
});
describe('Game Room account boundary', () => {
  it('rejects requests without a session before accessing account data', async () => {
    expect((await GET(req('GET', undefined, ''))).status).toBe(401); expect(rpc).not.toHaveBeenCalled();
  });
  it('rejects unverified identities', async () => {
    getUser.mockResolvedValue({ data: { user: { ...user, email_confirmed_at: null } }, error: null });
    expect((await GET(req('GET'))).status).toBe(403); expect(rpc).not.toHaveBeenCalled();
  });
  it('requires a linked SocialU profile', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect((await GET(req('GET'))).status).toBe(409); expect(rpc).toHaveBeenCalledTimes(1);
  });
  it('identifies missing Game Room integration so the UI can offer unsaved design samples', async () => {
    rpc.mockImplementation(async (name: string) => name === 'socialu_account'
      ? { data: { id: '42' }, error: null }
      : { data: null, error: { code: 'PGRST202' } });
    const response = await GET(req('GET'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Game Room account saving is not ready yet.', code: 'GAME_ROOM_SETUP_REQUIRED' });
  });
  it('does not describe unrelated storage failures as missing setup', async () => {
    rpc.mockImplementation(async (name: string) => name === 'socialu_account'
      ? { data: { id: '42' }, error: null }
      : { data: null, error: { code: 'PGRST001' } });
    const response = await GET(req('GET'));
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBeUndefined();
  });
  it('derives avatar ownership from the token rather than caller IDs', async () => {
    expect((await PUT(req('PUT', { outfitId: '1', faceId: '2', auth_user_id: 'victim', student_id: '999' }))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_game_room', { p_action: 'save_avatar', p_auth_id: user.id, p_outfit_id: '1', p_face_id: '2' });
  });
  it('returns a forbidden outcome when storage rejects an unowned outfit', async () => {
    rpc.mockImplementation(async (name: string) => name === 'socialu_account' ? { data: { id: '42' }, error: null } : { data: null, error: { code: '42501' } });
    expect((await PUT(req('PUT', { outfitId: '99', faceId: '2' }))).status).toBe(403);
  });
  it.each([{ outfitId: 'sample-campus', faceId: '2' }, { outfitId: '1', faceId: {} }, { outfitId: '1 OR 1=1', faceId: '2' }, { outfitId: '9223372036854775808', faceId: '2' }])('rejects invalid appearance IDs %j', async body => {
    expect((await PUT(req('PUT', body))).status).toBe(400); expect(rpc).not.toHaveBeenCalled();
  });
  it('accepts only the two specified navigation placements', async () => {
    expect((await savePreferences(req('PUT', { position: 'top' }))).status).toBe(400); expect(rpc).not.toHaveBeenCalled();
    expect((await savePreferences(req('PUT', { position: 'bottom', student_id: '999' }))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_game_room', { p_action: 'save_preferences', p_auth_id: user.id, p_position: 'bottom' });
  });
});
