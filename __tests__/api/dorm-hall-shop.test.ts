import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
import { GET as hallGET } from '../../app/api/dorm/hall/route';
import { GET as shopGET, POST as shopPOST } from '../../app/api/dorm/shop/route';

// Request validation and response handling for the 3D DormSpace APIs. The database behaviour itself is
// covered by __tests__/database/dormspace-3d-directory.test.ts and dormspace-shop.test.ts.
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const KEY = '22222222-2222-4222-8222-222222222222';
const auth = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
const get = (path: string, headers: Record<string, string> = auth) => new Request(`http://localhost${path}`, { headers });
const post = (body: unknown) => new Request('http://localhost/api/dorm/shop', { method: 'POST', headers: auth, body: JSON.stringify(body) });
let bridge: (name: string, args: any) => { data: unknown; error: unknown };
const calls = () => rpc.mock.calls.filter(([name]) => name !== 'socialu_session_guard');
const directory = { floor: 1, floorCount: 1, roomsPerFloor: 12, me: { username: 'dorm1', floor: 1, slot: 0 },
  doors: [{ slot: 0, state: 'own', username: 'dorm1' }, { slot: 1, state: 'locked', username: 'dorm3', email: 'dorm3@salemstate.edu' }, { slot: 2, state: 'withheld', username: null }] };

beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user: { id: 'verified-student', email: 'dorm1@salemstate.edu', email_confirmed_at: '2026-10-08' } }, error: null });
  bridge = () => ({ data: directory, error: null });
  rpc.mockImplementation(async (name: string, args: any) => name === 'socialu_session_guard' ? { data: true, error: null } : bridge(name, args));
});

describe('GET /api/dorm/hall', () => {
  it('requires sign-in and never reaches the bridge without it', async () => {
    expect((await hallGET(get('/api/dorm/hall', {}))).status).toBe(401);
    expect(calls()).toHaveLength(0);
  });
  it('uses the verified account, returns one whitelisted floor and is not cached', async () => {
    const response = await hallGET(get('/api/dorm/hall?floor=1&auth_id=someone-else'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(calls()).toEqual([['socialu_dorm_directory', { p_auth_id: 'verified-student', p_action: 'directory', p_payload: { floor: 1 } }]]);
    const body = await response.json();
    expect(body.doors).toHaveLength(12);
    expect(body.doors[1]).toEqual({ slot: 1, roomNumber: '102', state: 'locked', username: 'dorm3' });
    expect(JSON.stringify(body)).not.toContain('salemstate');
  });
  it.each(['0', '1000', '1.5', 'two', '-1'])('rejects floor %s before the bridge', async floor => {
    expect((await hallGET(get(`/api/dorm/hall?floor=${floor}`))).status).toBe(400);
    expect(calls()).toHaveLength(0);
  });
  it('locates a door by username and validates the name', async () => {
    bridge = () => ({ data: { location: { username: 'dorm2', floor: 3, slot: 4 } }, error: null });
    expect(await (await hallGET(get('/api/dorm/hall?locate=dorm2'))).json()).toEqual({ location: { username: 'dorm2', floor: 3, slot: 4, roomNumber: '305' } });
    expect((await hallGET(get('/api/dorm/hall?locate=%20'))).status).toBe(400);
  });
  it('reports a missing migration as unavailable instead of inventing doors', async () => {
    bridge = () => ({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } });
    const response = await hallGET(get('/api/dorm/hall'));
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe('DORMSPACE_DIRECTORY_UNAVAILABLE');
  });
  it('rejects a malformed bridge response', async () => {
    bridge = () => ({ data: { ...directory, doors: [{ slot: 0, state: 'friend', username: null }] }, error: null });
    expect((await hallGET(get('/api/dorm/hall'))).status).toBe(503);
  });
});

describe('/api/dorm/shop', () => {
  it('returns the caller balance and offers without caching', async () => {
    bridge = () => ({ data: { balance: 40, offers: [{ id: '7', name: 'Plant', previewKey: 'dorm-plant', kind: 'decoration', surface: 'floor', width: 1, height: 1, overlapCategory: 'plant', price: 150, state: 'insufficient', reason: null }] }, error: null });
    const response = await shopGET(get('/api/dorm/shop?buyer=someone-else-scope-000'));
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const body = await response.json();
    expect(body.offers[0].state).toBe('insufficient');
    expect(calls()[0]).toEqual(['socialu_dorm_shop', { p_auth_id: 'verified-student', p_action: 'catalog', p_payload: {} }]);
    // Opaque buyer scope from the verified session only: stable, not the id, and different per account.
    expect(body.buyer).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(body.buyer).not.toContain('verified-student');
    expect((await (await shopGET(get('/api/dorm/shop'))).json()).buyer).toBe(body.buyer);
    getUser.mockResolvedValue({ data: { user: { id: 'other-student', email: 'dorm2@salemstate.edu', email_confirmed_at: '2026-10-08' } }, error: null });
    expect((await (await shopGET(get('/api/dorm/shop'))).json()).buyer).not.toBe(body.buyer);
  });
  it.each([
    [{ itemId: '7', expectedPrice: 150 }],
    [{ itemId: '7', expectedPrice: -1, actionKey: KEY }],
    [{ itemId: '7', expectedPrice: 1.5, actionKey: KEY }],
    [{ itemId: 'plant', expectedPrice: 150, actionKey: KEY }],
    [{ itemId: '7', expectedPrice: 150, actionKey: 'retry-1' }],
    [{ itemId: '7', expectedPrice: 150, actionKey: KEY, studentId: '2' }],
    [{ itemId: '7', expectedPrice: 150, actionKey: KEY, amount: 0 }],
  ])('rejects invalid or over-specified purchase %j before the bridge', async body => {
    expect((await shopPOST(post(body))).status).toBe(400);
    expect(calls()).toHaveLength(0);
  });
  it('forwards only the item, confirmed price and key for the verified buyer', async () => {
    bridge = () => ({ data: { status: 'completed', replayed: false, itemId: '7', charged: 150, balance: 50, owned: ['7'] }, error: null });
    const response = await shopPOST(post({ itemId: '7', expectedPrice: 150, actionKey: KEY.toUpperCase() }));
    expect(response.status).toBe(201);
    expect(calls()).toEqual([['socialu_dorm_shop', { p_auth_id: 'verified-student', p_action: 'purchase', p_payload: { itemId: '7', expectedPrice: 150, actionKey: KEY } }]]);
  });
  it('returns a replayed purchase as 200 and a rejection with its code and current price', async () => {
    bridge = () => ({ data: { status: 'completed', replayed: true, itemId: '7', charged: 150, balance: 50, owned: ['7'] }, error: null });
    expect((await shopPOST(post({ itemId: '7', expectedPrice: 150, actionKey: KEY }))).status).toBe(200);
    bridge = () => ({ data: { status: 'rejected', reason: 'price_changed', itemId: '7', price: 175, balance: 200 }, error: null });
    const rejected = await shopPOST(post({ itemId: '7', expectedPrice: 150, actionKey: KEY }));
    expect(rejected.status).toBe(409);
    expect(await rejected.json()).toMatchObject({ code: 'PRICE_CHANGED', result: { price: 175 } });
    bridge = () => ({ data: { status: 'rejected', reason: 'key_mismatch', itemId: '7', price: null, balance: 200 }, error: null });
    expect((await shopPOST(post({ itemId: '7', expectedPrice: 150, actionKey: KEY }))).status).toBe(422);
  });
  it('checks a purchase status by key and validates the key', async () => {
    bridge = () => ({ data: { status: 'not_found', balance: 10 }, error: null });
    expect(await (await shopGET(get(`/api/dorm/shop?purchase=${KEY}`))).json()).toEqual({ status: 'not_found', balance: 10 });
    expect(calls()[0][1]).toEqual({ p_auth_id: 'verified-student', p_action: 'status', p_payload: { actionKey: KEY } });
    expect((await shopGET(get('/api/dorm/shop?purchase=abc'))).status).toBe(400);
  });
  it('reports a missing shop migration as unavailable', async () => {
    bridge = () => ({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } });
    const response = await shopGET(get('/api/dorm/shop'));
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe('DORMSPACE_SHOP_UNAVAILABLE');
  });
});
