import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TokenVerifier } from 'livekit-server-sdk';
import { POST } from '../../app/api/dorm/voice/route';
import { POST as sweep } from '../../app/api/dorm/voice/sweep/route';

const mock = vi.hoisted(() => ({
  rpc: vi.fn(), user: vi.fn(), list: vi.fn(), remove: vi.fn(), rooms: vi.fn(),
}));
vi.mock('../../lib/socialu-account', async importOriginal => ({
  ...await importOriginal<typeof import('../../lib/socialu-account')>(),
  accountClient: () => ({ rpc: mock.rpc }), verifiedUser: mock.user,
}));
vi.mock('livekit-server-sdk', async importOriginal => ({
  ...await importOriginal<typeof import('livekit-server-sdk')>(),
  RoomServiceClient: class {
    listParticipants = mock.list;
    listRooms = mock.rooms;
    removeParticipant = mock.remove;
  },
}));

const authId = '33333333-3333-4333-8333-000000000001';
const sessionId = '33333333-3333-4333-8333-000000000002';
const connectionId = '33333333-3333-4333-8333-000000000003';
const attempt = '33333333-3333-4333-8333-000000000004';
const identity = `${connectionId}.${attempt}`;
const channel = 'socialu-voice-hall-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const secret = 'local-test-key-do-not-deploy-000000000000';
function request(body: object, session = sessionId) {
  return POST(new Request('http://localhost/api/dorm/voice', {
    method: 'POST',
    headers: { Authorization: 'Bearer header.' + Buffer.from(JSON.stringify({ session_id: session })).toString('base64url') + '.signature' },
    body: JSON.stringify(body),
  }));
}
const join = { action: 'join', connectionId, attempt, channel: 'caller-chosen-room' };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('DORMSPACE_VOICE_URL', 'ws://127.0.0.1:7880');
  vi.stubEnv('DORMSPACE_VOICE_API_KEY', 'test-key');
  vi.stubEnv('DORMSPACE_VOICE_API_SECRET', secret);
  vi.stubEnv('DORMSPACE_VOICE_SWEEP_SECRET', secret);
  mock.user.mockResolvedValue({ id: authId });
  mock.list.mockResolvedValue([]);
  mock.remove.mockResolvedValue(undefined);
  mock.rpc.mockResolvedValue({ data: { channel, username: 'dorm1' }, error: null });
});
afterEach(() => vi.unstubAllEnvs());

it('issues a short microphone-only provider token for the server-selected channel', async () => {
  const response = await request(join);
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  const { token, ticket } = await response.json();
  const verified = await new TokenVerifier('test-key', secret).verify(token);
  expect(verified.video).toMatchObject({ room: channel, roomJoin: true, canPublishSources: ['microphone'], canPublishData: false });
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  expect(claims.sub).toBe(identity);
  expect(claims.exp - claims.nbf).toBeLessThanOrEqual(25);
  expect(mock.rpc).toHaveBeenCalledWith('socialu_dorm_voice_lease', {
    p_action: 'join', p_auth_id: authId, p_session: sessionId, p_connection: connectionId, p_attempt: attempt,
  });
  expect((await request({ action: 'leave', ticket }, attempt)).status).toBe(403);
  expect((await request({ action: 'leave', ticket: ticket.slice(0, -1) + '!' })).status).toBe(403);
  expect(mock.remove).not.toHaveBeenCalled();
  expect((await request({ action: 'leave', ticket })).status).toBe(204);
  expect(mock.remove).toHaveBeenCalledWith(channel, identity, { revokeTokenTs: expect.any(BigInt) });
});

it('refuses a join without a current lease and revokes an existing provider session when access ends', async () => {
  mock.rpc.mockResolvedValueOnce({ data: null, error: null });
  expect((await request(join)).status).toBe(403);
  expect(mock.list).not.toHaveBeenCalled();
  const { ticket } = await (await request(join)).json();
  mock.rpc.mockResolvedValueOnce({ data: null, error: null });
  expect((await request({ action: 'check', ticket })).status).toBe(403);
  expect(mock.remove).toHaveBeenCalledWith(channel, identity, { revokeTokenTs: expect.any(BigInt) });
});

it('requires the sweep secret and removes stale or newly blocked provider sessions without a browser request', async () => {
  const runSweep = (value: string) => sweep(new Request('http://localhost/api/dorm/voice/sweep', {
    method: 'POST', headers: { Authorization: `Bearer ${value}` },
  }));
  expect((await runSweep('invalid')).status).toBe(401);
  expect(mock.rooms).not.toHaveBeenCalled();
  const blocked = `${authId}.${attempt}`, expired = `${sessionId}.${attempt}`;
  mock.rooms.mockResolvedValue([{ name: channel }, { name: 'a-different-app' }]);
  mock.list.mockResolvedValue([
    { identity: expired, joinedAtMs: 3n },
    { identity: blocked, joinedAtMs: 2n },
    { identity, joinedAtMs: 1n },
  ]);
  mock.rpc.mockResolvedValue({ data: { [identity]: [blocked], [blocked]: [identity] }, error: null });
  expect((await runSweep(secret)).status).toBe(204);
  expect(mock.list).toHaveBeenCalledTimes(1);
  expect(mock.remove.mock.calls.map(([, id]) => id).sort()).toEqual([blocked, expired].sort());
});
