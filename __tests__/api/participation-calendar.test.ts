import { beforeEach, expect, it, vi } from 'vitest';
const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
import { GET, PUT } from '../../app/api/game-participation/calendar/route';
const token = 'h.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: 'fixture' })).toString('base64url') + '.s';
const req = (body?: unknown, auth = token) => new Request('http://localhost/api/game-participation/calendar', {
  method: body ? 'PUT' : 'GET', headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fixture');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user: { id: 'verified-owner', email_confirmed_at: '2026-01-01' } } });
  rpc.mockImplementation(async name => ({ data: name === 'socialu_session_guard' ? true : { days: [] }, error: null }));
});
it('derives read and dismissal ownership from the verified token', async () => {
  const response = await GET(req()); expect(response.status).toBe(200); expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect((await PUT(req({ date: '2025-01-09', p_auth_id: 'victim', student_id: 2 }))).status).toBe(200);
  expect(rpc).toHaveBeenCalledWith('socialu_participation_calendar', { p_auth_id: 'verified-owner', p_dismiss_date: '2025-01-09' });
});
it.each(['bad','2025-02-30','2025-13-01',null,14,{}])('rejects invalid dismissal date %j', async date => {
  expect((await PUT(req({ date }))).status).toBe(400); expect(rpc).not.toHaveBeenCalled();
});
it('requires sign-in and rejects revoked sessions', async () => {
  expect((await GET(req(undefined, ''))).status).toBe(401); expect(rpc).not.toHaveBeenCalled();
  rpc.mockResolvedValue({ data: false }); expect((await GET(req())).status).toBe(401); expect(rpc).toHaveBeenCalledTimes(1);
});
it.each([['22008',409],['42501',403],['PGRST202',503],['42883',503],['XX000',503]])('reports %s as %i, never successful dismissal', async (code,status) => {
  rpc.mockImplementation(async name => name === 'socialu_session_guard' ? { data: true } : { error: { code } });
  expect((await PUT(req({ date: '2025-01-09' }))).status).toBe(status);
});
