import { beforeEach, expect, it, vi } from 'vitest';
import { GET } from '../../app/api/points/route';
import { AccountError } from '../../lib/socialu-account';
const mock = vi.hoisted(() => ({ user: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/socialu-account', async original => ({ ...await original<typeof import('../../lib/socialu-account')>(),
  verifiedUser: mock.user, accountClient: () => ({ rpc: mock.rpc }) }));
beforeEach(() => { vi.resetAllMocks(); mock.user.mockResolvedValue({ id: 'verified-account' }); mock.rpc.mockResolvedValue({ data: { balance: 75 }, error: null }); });
it('returns only the verified caller balance and prevents caching', async () => {
  const response = await GET(new Request('http://localhost/api/points?user=another-account'));
  expect(await response.json()).toEqual({ balance: 75 });
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(mock.rpc).toHaveBeenCalledWith('socialu_points_balance', { p_auth_id: 'verified-account' });
});
it('denies signed-out access before reading the ledger', async () => {
  mock.user.mockRejectedValue(new AccountError('Please sign in.', 401));
  expect((await GET(new Request('http://localhost/api/points'))).status).toBe(401);
  expect(mock.rpc).not.toHaveBeenCalled();
});
it('reports unavailability instead of inventing a zero balance', async () => {
  mock.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });
  expect((await GET(new Request('http://localhost/api/points'))).status).toBe(503);
});
