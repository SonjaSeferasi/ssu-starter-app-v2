import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_PERSONALITY, personalityInput, spotifyMusic } from '../../lib/profile-personality';

const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));
import { GET, PUT } from '../../app/api/profiles/personality/route';

const user = { id: 'auth-uuid-1', email_confirmed_at: '2026-10-08T12:00:00Z' };
const token = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const spotifyUrl = 'https://open.spotify.com/track/0Lr4kGOYn9l83EjuK6cZFQ';
const values = { answers: [{ prompt: 'building', answer: 'A campus app' }, { prompt: 'up_for', answer: 'Coffee + a good conversation' }], interests: ['Coding', 'Music'], spotifyUrl };
let result: { data: unknown; error: unknown };
const request = (body?: unknown) => new Request('http://localhost/api/profiles/personality?username=alex', {
  method: body ? 'PUT' : 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockResolvedValue({ data: { user }, error: null });
  result = { data: values, error: null };
  rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : result);
});

describe('profile customization', () => {
  it('reads a visible profile and never caches it', async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ personality: values, available: true });
    expect(rpc).toHaveBeenCalledWith('socialu_profile_personality', { p_auth_id: user.id, p_action: 'read', p_username: 'alex' });
  });
  it('writes only the verified caller, canonicalizes music links and trims the answer', async () => {
    expect((await PUT(request({ ...values, username: 'someone-else', answers: [{ prompt: 'building', answer: ' A campus app ' }, values.answers[1]], spotifyUrl: spotifyUrl + '?si=tracking' }))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('socialu_profile_personality', { p_auth_id: user.id, p_action: 'save', p_answers: values.answers, p_interests: ['Coding', 'Music'], p_spotify_url: spotifyUrl });
  });
  it.each([
    { ...values, answers: [{ prompt: 'building', answer: 'x'.repeat(101) }] }, { ...values, answers: [{ prompt: 'unknown', answer: 'Hi' }] },
    { ...values, answers: [{ prompt: 'building', answer: '   ' }] }, { ...values, answers: [values.answers[0], values.answers[0]] },
    { ...values, answers: [...values.answers, { prompt: 'ask_me', answer: 'a' }, { prompt: 'fun_fact', answer: 'b' }] },
    { ...values, interests: ['Music', 'Music'] }, { ...values, interests: ['made-up'] },
    { ...values, interests: ['Coding'] }, { ...values, spotifyUrl: 'https://evil.example/track/0Lr4kGOYn9l83EjuK6cZFQ' },
  ])('rejects invalid input before storage: %j', async body => {
    expect((await PUT(request(body))).status).toBe(400);
    expect(rpc.mock.calls.filter(([fn]) => fn === 'socialu_profile_personality')).toHaveLength(0);
  });
  it('has an honest preview state until the local migration is installed', async () => {
    result = { data: null, error: { code: 'PGRST202' } };
    expect(await (await GET(request())).json()).toEqual({ personality: EMPTY_PERSONALITY, available: false });
    const response = await PUT(request(values));
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe('PERSONALITY_PREVIEW');
  });
  it('rejects signed-out and inaccessible profiles', async () => {
    expect((await GET(new Request('http://localhost/api/profiles/personality'))).status).toBe(401);
    result = { data: null, error: { code: 'P0002' } };
    expect((await GET(request())).status).toBe(404);
  });
  it('can clear customization without touching the bio', () => {
    expect(personalityInput(EMPTY_PERSONALITY)).toEqual(EMPTY_PERSONALITY);
  });
});

describe('Spotify music URLs', () => {
  it.each(['track', 'album', 'playlist'])('accepts canonical %s URLs and strips tracking', kind => {
    expect(spotifyMusic(`https://open.spotify.com/intl-en/${kind}/0Lr4kGOYn9l83EjuK6cZFQ?si=abc`)).toEqual({
      url: `https://open.spotify.com/${kind}/0Lr4kGOYn9l83EjuK6cZFQ`, embedUrl: `https://open.spotify.com/embed/${kind}/0Lr4kGOYn9l83EjuK6cZFQ`,
    });
  });
  it.each(['javascript:alert(1)', 'http://open.spotify.com/track/0Lr4kGOYn9l83EjuK6cZFQ',
    'https://open.spotify.com.evil.example/track/0Lr4kGOYn9l83EjuK6cZFQ',
    'https://name:password@open.spotify.com/track/0Lr4kGOYn9l83EjuK6cZFQ',
    'https://open.spotify.com:444/track/0Lr4kGOYn9l83EjuK6cZFQ', 'https://open.spotify.com/track/short',
    'https://open.spotify.com/user/alex', 'https://spotify.link/abc'])('rejects unsupported sources: %s', value => {
    expect(spotifyMusic(value)).toBeNull();
  });
});
