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
    p_payload: { version: 1, placements: [{ itemId: 'bed', x: 1, y: 2, rotation }] } });
});
it.each([-90, 45, 360, 90.5, '90', null, true, {}])('rejects invalid rotation %j before saving', async rotation => {
  expect((await PUT(request({ itemId: 'bed', x: 1, y: 2, rotation }))).status).toBe(400);
  expect(rpc.mock.calls.some(([name]) => name === 'socialu_dorm')).toBe(false);
});
it('defaults legacy placements to zero degrees', async () => {
  expect((await PUT(request({ itemId: 'bed', x: 1, y: 2 }))).status).toBe(200);
  expect(rpc.mock.calls.find(([name]) => name === 'socialu_dorm')?.[1].p_payload.placements[0].rotation).toBe(0);
});

it('returns the duplicate placement rule as 400 rather than an unavailable error (#1214)', async () => {
  rpc.mockImplementation(async (name: string) => name === 'socialu_session_guard'
    ? { data: true, error: null }
    : { data: null, error: { code: '22023', message: 'Each item can only be placed once.' } });
  const response = await PUT(request({ itemId: '07', x: 1, y: 1 }));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: 'Each item can only be placed once.' });
});

it('returns the appearance-versus-furniture rule through the API (#1216)', async () => {
  const message = 'Wall colors and floor styles cannot be placed as furniture.';
  rpc.mockImplementation(async (name: string) => name === 'socialu_session_guard'
    ? { data: true, error: null } : { data: null, error: { code: '22023', message } });
  const response = await PUT(request({ itemId: '1', x: 1, y: 1 }));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: message });
});

it.each([{ wallItemId: '2' }, { floorItemId: '3' }, { wallItemId: null, floorItemId: null }])('preserves omitted appearance keys while forwarding explicit choices/resets %j (#1215)', async appearance => {
  const response = await PUT(new Request('http://localhost/api/dorm', { method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ version: 1, placements: [], ...appearance }) }));
  expect(response.status).toBe(200);
  expect(rpc.mock.calls.find(([name]) => name === 'socialu_dorm')?.[1].p_payload).toEqual({ version: 1, placements: [], ...appearance });
});
