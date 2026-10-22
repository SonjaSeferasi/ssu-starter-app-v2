import { beforeEach, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
import { PUT } from '../../app/api/dorm/route';

const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const request = (placement: object) => new Request('http://localhost/api/dorm', { method: 'PUT',
  headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: JSON.stringify({ version: 1, placements: [placement], p_auth_id: 'someone-else' }) });
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user: { id: 'verified-owner', email: 'owner@salemstate.edu', email_confirmed_at: '2026-10-08' } }, error: null });
  rpc.mockImplementation(async (name: string) => ({ data: name === 'socialu_session_guard' ? true : { version: 2 }, error: null }));
});

it.each([0, 90, 180, 270])('passes %s degree rotation using the verified owner', async rotation => {
  const response = await PUT(request({ itemId: 'bed', x: 1, y: 2, rotation }));
  expect(response.status).toBe(200);
  expect(rpc).toHaveBeenCalledWith('socialu_dorm', { p_action: 'save', p_auth_id: 'verified-owner', p_owner: null,
    p_payload: { version: 1, placements: [{ itemId: 'bed', x: 1, y: 2, rotation }], wallItemId: null, floorItemId: null } });
});
it.each([-90, 45, 360, 90.5, '90', null, true, {}])('rejects invalid rotation %j before saving', async rotation => {
  expect((await PUT(request({ itemId: 'bed', x: 1, y: 2, rotation }))).status).toBe(400);
  expect(rpc.mock.calls.some(([name]) => name === 'socialu_dorm')).toBe(false);
});
it('defaults legacy placements to zero degrees', async () => {
  expect((await PUT(request({ itemId: 'bed', x: 1, y: 2 }))).status).toBe(200);
  expect(rpc.mock.calls.find(([name]) => name === 'socialu_dorm')?.[1].p_payload.placements[0].rotation).toBe(0);
});
