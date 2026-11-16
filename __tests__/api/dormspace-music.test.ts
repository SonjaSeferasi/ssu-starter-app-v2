import { beforeEach, expect, it, vi } from 'vitest';
import { GET, POST } from '../../app/api/dorm/music/route';
import { AccountError } from '../../lib/socialu-account';
import { MAX_MUSIC_BYTES } from '../../lib/dormspace-music';
const mocks = vi.hoisted(() => ({ user: vi.fn(), rpc: vi.fn(), signed: vi.fn(), upload: vi.fn(), info: vi.fn(), download: vi.fn(), remove: vi.fn() }));
vi.mock('../../lib/socialu-account', async original => ({
  ...await original<typeof import('../../lib/socialu-account')>(), verifiedUser: mocks.user,
  accountClient: () => ({ rpc: mocks.rpc, storage: { from: () => ({ createSignedUrl: mocks.signed, createSignedUploadUrl: mocks.upload, info: mocks.info, download: mocks.download, remove: mocks.remove }) } }),
}));
const auth = '33333333-3333-4333-8333-000000000001';
const session = '33333333-3333-4333-8333-000000000002';
const connection = '33333333-3333-4333-8333-000000000003';
const key = `${auth}/33333333-3333-4333-8333-000000000004.mp3`;
function request(body?: object) {
  return new Request(`http://localhost/api/dorm/music?owner=dorm1&connection=${connection}`, {
    method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer header.${Buffer.from(JSON.stringify({ session_id: session })).toString('base64url')}.signature` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
beforeEach(() => {
  vi.resetAllMocks(); mocks.user.mockResolvedValue({ id: auth });
  mocks.rpc.mockResolvedValue({ data: { isOwner: true, oldKey: null, track: null }, error: null });
  mocks.signed.mockResolvedValue({ data: { signedUrl: 'https://storage.example/signed-music' }, error: null });
  mocks.upload.mockResolvedValue({ data: { signedUrl: 'https://storage.example/signed-upload' }, error: null });
  mocks.remove.mockResolvedValue({ error: null });
});
it('rejects signed-out reads before touching storage', async () => {
  mocks.user.mockRejectedValue(new AccountError('Please sign in.', 401));
  expect((await GET(request())).status).toBe(401); expect(mocks.rpc).not.toHaveBeenCalled();
});
it('revalidates current presence and hides object keys from music reads', async () => {
  mocks.rpc.mockResolvedValue({ data: { isOwner: false, track: { storageKey: key, title: 'Test track', version: 'version' } }, error: null });
  const result = await GET(request()); expect(result.status).toBe(200);
  expect(await result.json()).toEqual({ isOwner: false, track: { title: 'Test track', version: 'version', url: 'https://storage.example/signed-music' } });
  expect(mocks.signed).toHaveBeenCalledWith(key, 30);
  expect(mocks.rpc).toHaveBeenCalledWith('socialu_dorm_music', expect.objectContaining({ p_auth_id: auth, p_session: session, p_connection: connection }));
});
it('does not mint an upload for a visitor or an oversized MP3', async () => {
  mocks.rpc.mockResolvedValueOnce({ data: { isOwner: false, track: null }, error: null });
  expect((await POST(request({ action: 'upload', size: 128 }))).status).toBe(403);
  expect((await POST(request({ action: 'upload', size: MAX_MUSIC_BYTES + 1 }))).status).toBe(400);
  expect(mocks.upload).not.toHaveBeenCalled();
});
it('scopes a signed upload to the verified owner and never accepts a supplied object path', async () => {
  const r = await POST(request({ action: 'upload', size: 128, storageKey: 'someone-else/file.mp3' }));
  const data = await r.json(); expect(r.status).toBe(200);
  expect(data.storageKey).toMatch(new RegExp(`^${auth}/[0-9a-f-]{36}\\.mp3$`));
  expect(mocks.upload).toHaveBeenCalledWith(data.storageKey);
});
it('rejects a foreign object key before reading or changing it', async () => {
  expect((await POST(request({ action: 'save', storageKey: key.replace(auth, session), title: 'No' }))).status).toBe(400);
  expect(mocks.info).not.toHaveBeenCalled(); expect(mocks.remove).not.toHaveBeenCalled();
});
it('rejects a renamed non-audio upload without replacing the existing soundtrack', async () => {
  mocks.info.mockResolvedValue({ data: { size: 128 }, error: null });
  mocks.download.mockResolvedValue({ data: new Blob(['not an mp3'.repeat(20)]), error: null });
  expect((await POST(request({ action: 'save', storageKey: key, title: 'Invalid' }))).status).toBe(400);
  expect(mocks.rpc).toHaveBeenCalledTimes(1); expect(mocks.remove).toHaveBeenCalledWith([key]);
});
it('saves checked audio and removes the previous object only after storage commits', async () => {
  const bytes = new Uint8Array(128); bytes.set([255, 251, 144, 0]);
  mocks.info.mockResolvedValue({ data: { size: 128 }, error: null });
  mocks.download.mockResolvedValue({ data: new Blob([bytes]), error: null });
  mocks.rpc.mockResolvedValueOnce({ data: { isOwner: true, track: null }, error: null })
    .mockResolvedValueOnce({ data: { isOwner: true, oldKey: 'old.mp3', track: { storageKey: key, title: 'New track', version: 'v2' } }, error: null });
  expect((await POST(request({ action: 'save', storageKey: key, title: 'New track' }))).status).toBe(200);
  expect(mocks.rpc).toHaveBeenLastCalledWith('socialu_dorm_music', expect.objectContaining({ p_action: 'save', p_payload: { storageKey: key, title: 'New track' } }));
  expect(mocks.remove).toHaveBeenCalledWith(['old.mp3']);
});
