import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { rpc, getClient } = vi.hoisted(() => ({ rpc: vi.fn(), getClient: vi.fn() }));
vi.mock('../lib/supabase', () => ({ getSupabaseClient: getClient }));
import { snipeOperation } from '../lib/snipe';
import { stageOperation } from '../lib/snipe-transport';

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ rpc });
});
afterEach(() => vi.unstubAllEnvs());

it('rejects DMs before calling an older Snipe or staging bridge', async () => {
  rpc.mockResolvedValue({ data: null, error: { code: 'SC404', message: 'Conversation not available.' } });
  for (const action of ['list', 'prepare', 'create', 'respond', 'withdraw', 'remove', 'photo'] as const)
    await expect(snipeOperation('verified-user', action, '7')).rejects.toMatchObject({ status: 404 });
  for (const action of ['begin', 'claim', 'accept', 'discard', 'release', 'reject'] as const)
    await expect(stageOperation('verified-user', action, '7', {})).rejects.toMatchObject({ status: 404 });
  expect(rpc.mock.calls.every(([name]) => name === 'socialu_group_members')).toBe(true);
});

it('uses verified group membership for every core and staging operation', async () => {
  rpc.mockImplementation(async (name) => ({ data: name === 'socialu_group_members' ? { student_id: '1', members: [] } : { ok: true }, error: null }));
  expect(await snipeOperation('verified-user', 'list', '7')).toEqual({ ok: true });
  expect(await stageOperation('verified-user', 'begin', '7', {})).toEqual({ ok: true });
  expect(rpc.mock.calls.map(([name]) => name)).toEqual(['socialu_group_members', 'socialu_snipe', 'socialu_group_members', 'socialu_snipe_photo']);
  expect(rpc.mock.calls[0][1]).toEqual({ p_auth_id: 'verified-user', p_conversation_id: '7' });
});
