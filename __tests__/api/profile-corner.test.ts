import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cornerInput, EMPTY_CORNER, VIBE_ICONS } from '../../lib/profile-corner';
const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
import { GET, POST } from '../../app/api/profiles/corner/route';
const user = { id: 'auth-1', email_confirmed_at: '2026-10-08T12:00:00Z' };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const request = (body?: unknown) => new Request('http://localhost/api/profiles/corner?username=alex', {
  method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}),
});
let result: { data: unknown; error: unknown };
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc }); getUser.mockResolvedValue({ data: { user }, error: null });
  result = { data: EMPTY_CORNER, error: null };
  rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : result);
});
describe('campus card API', () => {
  it('exposes additional stickers only when storage supports saving them',async()=>{
    expect((await(await GET(request())).json()).vibeIcons).toBeUndefined();
    result={data:{...EMPTY_CORNER,stickerVibes:true},error:null};
    expect((await(await GET(request())).json()).vibeIcons).toEqual(VIBE_ICONS);
    for(const icon of VIBE_ICONS)expect(cornerInput({action:'save_vibe',payload:{text:'My mood',icon}}).payload.icon).toBe(icon);
  });
  it('loads a selected profile without caching', async () => {
    const response = await GET(request()); expect(response.status).toBe(200); expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(rpc).toHaveBeenCalledWith('socialu_profile_corner', { p_auth_id: user.id, p_action: 'read', p_username: 'alex' });
  });
  it('uses only the verified owner when saving and strips forged fields', async () => {
    expect((await POST(request({ action: 'save_vibe', username: 'victim', authId: 'forged', payload: { text: ' Coffee time ', icon: 'coffee', studentId: 99 } }))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_profile_corner', { p_auth_id: user.id, p_action: 'save_vibe', p_username: null, p_payload: { text: 'Coffee time', icon: 'coffee' } });
  });
  it('uses the caller identity when voting on another profile', async () => {
    expect((await POST(request({ action: 'vote', username: 'alex', payload: { id: 5, choice: 1, votes: 900 } }))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_profile_corner', { p_auth_id: user.id, p_action: 'vote', p_username: 'alex', p_payload: { id: 5, choice: 1 } });
  });
  it('reports honest preview mode when storage is absent', async () => {
    result = { data: null, error: { code: 'PGRST202' } };
    expect(await (await GET(request())).json()).toEqual({ corner: EMPTY_CORNER, available: false });
    const response = await POST(request({ action: 'save_goals', payload: { goals: [] } }));
    expect(response.status).toBe(503); expect((await response.json()).code).toBe('CORNER_PREVIEW');
  });
  it.each([['P0002', 404], ['42501', 403], ['22023', 400], ['P0001', 409]])('maps database error %s to %i', async (code, status) => {
    result = { data: null, error: { code, message: 'Card error' } };
    expect((await POST(request({ action: 'join_plan', username: 'alex', payload: { id: 1 } }))).status).toBe(status);
  });
  it('rejects missing authentication', async () => expect((await GET(new Request('http://localhost/api/profiles/corner'))).status).toBe(401));
  it.each([
    { action: 'save_vibe', payload: { text: '', icon: 'sun' } },
    { action: 'save_vibe', payload: { text: 'Hi', icon: 'unknown' } },
    { action: 'save_goals', payload: { goals: [{ id: 'x', text: 'Club', done: 'false' }] } },
    { action: 'save_goals', payload: { goals: [{ id: 'x', text: 'One', done: true }, { id: 'x', text: 'Two', done: false }] } },
    { action: 'vote', username: 'alex', payload: { id: 1.5, choice: 1 } },
    { action: 'vote', username: 'alex', payload: { id: 1, choice: '1' } },
    { action: 'join_plan', payload: { id: 1 } },
    { action: 'delete_everything', payload: {} },
  ])('rejects malformed mutations before storage: %j', async body => {
    expect((await POST(request(body))).status).toBe(400);
    expect(rpc.mock.calls.some(([fn]) => fn === 'socialu_profile_corner')).toBe(false);
  });
});
describe('dates and card details', () => {
  const now = Date.parse('2026-10-27T12:00:00Z');
  const future = '2026-10-28T12:00:00Z';
  it('normalizes future dates and valid plan inputs', () => {
    expect(cornerInput({ action: 'create_plan', username: 'ignored', payload: { title: ' Study ', location: ' Library ', startsAt: future, capacity: 4 } }, now)).toEqual({ action: 'create_plan', username: null, payload: { title: 'Study', location: 'Library', startsAt: '2026-10-28T12:00:00.000Z', capacity: 4 } });
  });
  it.each(['invalid', '2026-10-26T12:00:00Z', '2027-10-27T12:00:00Z'])('rejects invalid, past or faraway dates %s', startsAt => {
    expect(() => cornerInput({ action: 'create_plan', payload: { title: 'Study', location: 'Library', startsAt, capacity: 4 } }, now)).toThrow();
  });
  it.each([1, 21, 2.5, '4'])('rejects invalid capacities %j', capacity => expect(() => cornerInput({ action: 'create_plan', payload: { title: 'Study', location: 'Library', startsAt: future, capacity } }, now)).toThrow());
  it('rejects duplicate poll options', () => expect(() => cornerInput({ action: 'create_poll', payload: { question: 'Pick?', options: ['Coffee', ' coffee '], endsAt: future } }, now)).toThrow());
});
