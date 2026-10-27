import { beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryInput } from '../../lib/profile-memories';
const { getClient, getUser, rpc, upload, remove, sign } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn(), upload: vi.fn(), remove: vi.fn(), sign: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
import { GET, POST, DELETE } from '../../app/api/profiles/memories/route';

const user = { id: '11111111-2222-4333-8444-555555555555', email_confirmed_at: '2026-10-08T12:00:00Z' };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const stored = { id: 1, key: `profile-memories/${user.id}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`, caption: 'Campus days', doodle: 'heart', createdAt: '2026-10-27T12:00:00Z' };
const jpeg = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])], 'campus.jpg', { type: 'image/jpeg' });
let results: Array<{ data: unknown; error: unknown }>;
const auth = { Authorization: `Bearer ${token}` };
const post = (fields: Record<string, string | File>) => { const form = new FormData(); for (const [k, v] of Object.entries(fields)) form.set(k, v); return new Request('http://localhost/api/profiles/memories', { method: 'POST', headers: auth, body: form }); };

beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc, storage: { from: () => ({ upload, remove, createSignedUrl: sign }) } });
  getUser.mockResolvedValue({ data: { user }, error: null });
  upload.mockResolvedValue({ error: null }); remove.mockResolvedValue({ error: null });
  sign.mockResolvedValue({ data: { signedUrl: 'https://signed.example/photo' }, error: null });
  results = [];
  rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : results.shift() ?? { data: { memories: [stored], removedKey: null }, error: null });
});

describe('pinned memories API', () => {
  it('returns signed photo links and never exposes storage keys', async () => {
    const data = await (await GET(new Request('http://localhost/api/profiles/memories?username=alex', { headers: auth }))).json();
    expect(data).toEqual({ available: true, memories: [{ id: 1, caption: 'Campus days', doodle: 'heart', createdAt: stored.createdAt, url: 'https://signed.example/photo' }] });
    expect(rpc).toHaveBeenCalledWith('socialu_profile_memories', { p_auth_id: user.id, p_action: 'read', p_username: 'alex' });
  });
  it('uploads into the caller’s own folder and pins the trimmed caption', async () => {
    results = [{ data: { memories: [], removedKey: null }, error: null }];
    expect((await POST(post({ photo: jpeg(), caption: ' Small wins ', doodle: 'sparkles' }))).status).toBe(200);
    const key = upload.mock.calls[0][0] as string;
    expect(key).toMatch(new RegExp(`^profile-memories/${user.id}/[0-9a-f-]{36}\\.jpg$`));
    expect(rpc).toHaveBeenCalledWith('socialu_profile_memories', { p_auth_id: user.id, p_action: 'add', p_storage_key: key, p_caption: 'Small wins', p_doodle: 'sparkles' });
  });
  it('removes the uploaded photo when pinning fails', async () => {
    results = [{ data: { memories: [], removedKey: null }, error: null }, { data: null, error: { code: '22023', message: 'Choose a photo, a short caption, and a doodle.' } }];
    expect((await POST(post({ photo: jpeg() }))).status).toBe(400);
    expect(remove).toHaveBeenCalledWith([upload.mock.calls[0][0]]);
  });
  it.each([
    [{ caption: 'no photo' }], [{ photo: new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }) }], [{ photo: jpeg(), doodle: 'skull' }],
  ])('rejects invalid uploads before storing anything: %#', async fields => {
    expect((await POST(post(fields as Record<string, string | File>))).status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });
  it('does not upload once six memories are pinned', async () => {
    results = [{ data: { memories: Array(6).fill(stored), removedKey: null }, error: null }];
    expect((await POST(post({ photo: jpeg() }))).status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });
  it('deletes the stored photo after removing a memory', async () => {
    results = [{ data: { memories: [], removedKey: stored.key }, error: null }];
    const response = await DELETE(new Request('http://localhost/api/profiles/memories', { method: 'DELETE', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ memoryId: 1 }) }));
    expect(response.status).toBe(200);
    expect(remove).toHaveBeenCalledWith([stored.key]);
  });
  it('reports preview until the migration is installed', async () => {
    results = [{ data: null, error: { code: 'PGRST202' } }];
    expect(await (await GET(new Request('http://localhost/api/profiles/memories', { headers: auth }))).json()).toEqual({ memories: [], available: false });
  });
  it('validates captions', () => {
    expect(memoryInput('  hi  ', 'star')).toEqual({ caption: 'hi', doodle: 'star' });
    expect(() => memoryInput('x'.repeat(41))).toThrow();
  });
});
