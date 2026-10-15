import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getClient, getUser, rpc, upload, remove, signedUrl } = vi.hoisted(() => ({
  getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn(), upload: vi.fn(), remove: vi.fn(), signedUrl: vi.fn(),
}));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));

const user = { id: 'auth-uuid-1', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z' };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const rawProfile = {
  id: '7', is_own: false, username: 'alex.kim', full_name: 'Alex Kim', display_name: null, name: 'Alex Kim', university: 'Salem State University',
  major: 'Computer Science', class_year: 'Junior', bio: 'Hi', photo_key: 'profile/x/photo.png', setup_completed: true,
  display_name_next_change_at: null, post_count: 2, friend_count: 5, is_friend: false, friend_request: null,
};
let profileResult: { data: unknown; error: unknown } = { data: rawProfile, error: null };

function get(url: string, auth = true) {
  return new Request(`http://localhost${url}`, { headers: auth ? { Authorization: `Bearer ${token}` } : {} });
}
function save(fields: Record<string, string | File>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return new Request('http://localhost/api/profile/details', { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: form });
}
const valid = { displayName: '', major: 'Biology', classYear: 'Senior', bio: 'Hello campus' };
const photo = (name: string, type: string, size = 1000) => new File([new Uint8Array(size)], name, { type });
const profileCalls = () => rpc.mock.calls.filter(([fn]) => fn.startsWith('socialu_profile') || fn === 'socialu_save_profile');

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  profileResult = { data: rawProfile, error: null };
  getClient.mockReturnValue({ auth: { getUser }, rpc, storage: { from: () => ({ upload, remove, createSignedUrl: signedUrl }) } });
  getUser.mockResolvedValue({ data: { user }, error: null });
  rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null }
    : fn === 'socialu_profile_content' ? { data: [], error: null } : profileResult);
  upload.mockResolvedValue({ data: {}, error: null });
  remove.mockResolvedValue({ data: [], error: null });
  signedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed.example/photo.png' }, error: null });
});

import { GET as view } from '../../app/api/profiles/route';
import { GET as content } from '../../app/api/profiles/content/route';
import { PUT } from '../../app/api/profile/details/route';

describe('Profile view (SRS-111, SRS-113)', () => {
  it('requires a signed-in student', async () => {
    expect((await view(get('/api/profiles', false))).status).toBe(401);
    expect(profileCalls()).toHaveLength(0);
  });
  it('looks up another student by username using the verified auth id', async () => {
    const res = await view(get('/api/profiles?username=alex.kim'));
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_profile_view', { p_auth_id: user.id, p_username: 'alex.kim' });
    const { profile } = await res.json();
    expect(profile.photo_url).toBe('https://signed.example/photo.png');
    expect(profile).not.toHaveProperty('photo_key');
  });
  it('reads the caller’s own profile without a username', async () => {
    await view(get('/api/profiles'));
    expect(rpc).toHaveBeenCalledWith('socialu_profile_view', { p_auth_id: user.id, p_username: null });
  });
  it('returns 404 for missing or blocked profiles without saying which', async () => {
    profileResult = { data: null, error: { code: 'P0002', message: 'This profile is not available.' } };
    const res = await view(get('/api/profiles?username=blocked'));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'This profile is not available.' });
  });
});

describe('Profile content (SRS-112)', () => {
  it('defaults to the Posts category', async () => {
    expect((await content(get('/api/profiles/content?username=alex.kim'))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_profile_content', { p_auth_id: user.id, p_username: 'alex.kim', p_category: 'posts' });
  });
  it('rejects categories other than Posts and Tagged, such as Snipes', async () => {
    expect((await content(get('/api/profiles/content?username=alex.kim&category=snipes'))).status).toBe(400);
    expect(profileCalls()).toHaveLength(0);
  });
});

describe('Save profile (SRS-109, SRS-110)', () => {
  it.each([
    [{ ...valid, major: ' ' }, 'Enter your major.'],
    [{ ...valid, classYear: 'Fifth year' }, 'Choose Freshman, Sophomore, Junior, Senior, or Graduate.'],
    [{ ...valid, bio: '' }, 'Write a short bio.'],
    [{ ...valid, bio: 'x'.repeat(251) }, 'Your bio can be at most 250 characters.'],
  ])('rejects a missing or invalid required field', async (fields, message) => {
    const res = await PUT(save(fields));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(message);
    expect(profileCalls()).toHaveLength(0);
  });
  it('rejects unsupported photo formats before uploading', async () => {
    const res = await PUT(save({ ...valid, photo: photo('face.gif', 'image/gif') }));
    expect(res.status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });
  it('rejects photos larger than 10 MB', async () => {
    const res = await PUT(save({ ...valid, photo: photo('face.png', 'image/png', 10_000_001) }));
    expect(res.status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });
  it('accepts a HEIC photo even when the browser sends no MIME type', async () => {
    expect((await PUT(save({ ...valid, photo: photo('face.HEIC', '') }))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_save_profile', expect.objectContaining({ p_photo_mime: 'image/heic', p_photo_bytes: 1000 }));
  });
  it('uploads the photo and saves every field for the verified student', async () => {
    const res = await PUT(save({ ...valid, photo: photo('face.jpg', 'image/jpeg') }));
    expect(res.status).toBe(200);
    const key = upload.mock.calls[0][0] as string;
    expect(key).toMatch(new RegExp(`^profile/${user.id}/.+\\.jpg$`));
    expect(rpc).toHaveBeenCalledWith('socialu_save_profile', {
      p_auth_id: user.id, p_display_name: '', p_major: 'Biology', p_class_year: 'Senior', p_bio: 'Hello campus',
      p_photo_key: key, p_photo_mime: 'image/jpeg', p_photo_bytes: 1000,
    });
  });
  it('keeps the current photo when no new photo is chosen', async () => {
    await PUT(save(valid));
    expect(upload).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith('socialu_save_profile', expect.objectContaining({ p_photo_key: null }));
  });
  it('removes the uploaded photo when the database rejects the save', async () => {
    profileResult = { data: null, error: { code: '22023', message: 'You can change your display name again on October 20.' } };
    const res = await PUT(save({ ...valid, displayName: 'New', photo: photo('face.png', 'image/png') }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('You can change your display name again on October 20.');
    expect(remove).toHaveBeenCalledWith([upload.mock.calls[0][0]]);
  });
});
