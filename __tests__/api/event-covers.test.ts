import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };

const { getClient, getUser, rpc, storage } = vi.hoisted(() => ({
  getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn(),
  storage: { upload: vi.fn(), remove: vi.fn(), list: vi.fn(), createSignedUrls: vi.fn() },
}));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));

import { DELETE as removeCover, POST as addCover } from '../../app/api/events/[id]/cover/route';
import { GET as listEvents } from '../../app/api/events/route';
import { EventArt } from '../../components/events/EventArt';

const user = { id: 'host-auth-id', email: 'host@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z' };
const validToken = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const ctx = (id = '42') => ({ params: Promise.resolve({ id }) });
const event = { event_id: '42', creator_id: '7', creator_username: 'testing1', title: 'Halloween party', description: 'Spooky szn', location: 'Atlantic', starts_at: '2026-10-31T05:44:00Z' };
let profileId = '7';

function upload(file?: File) {
  const form = new FormData();
  if (file) form.append('image', file);
  return new Request('http://localhost/api/events/42/cover', { method: 'POST', headers: { authorization: `Bearer ${validToken}` }, body: form });
}
const jpeg = (bytes = 10) => new File([new Uint8Array(bytes)], 'party.jpg', { type: 'image/jpeg' });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  profileId = '7';
  getClient.mockReturnValue({ auth: { getUser }, rpc, storage: { from: () => storage } });
  getUser.mockImplementation(async (token: string) => token === validToken
    ? { data: { user }, error: null } : { data: { user: null }, error: { message: 'Invalid token' } });
  rpc.mockImplementation(async (fn: string) => {
    if (fn === 'socialu_session_guard') return { data: true, error: null };
    if (fn === 'socialu_account') return { data: { id: profileId }, error: null };
    return { data: [event], error: null };
  });
  storage.upload.mockResolvedValue({ error: null });
  storage.remove.mockResolvedValue({ error: null });
  storage.list.mockResolvedValue({ data: [{ name: '42' }], error: null });
  storage.createSignedUrls.mockResolvedValue({ data: [{ path: 'event_cover/42', signedUrl: 'https://signed/cover-42' }], error: null });
});

describe('Event cover photos', () => {
  it('lets the host upload a cover photo, stored privately at event_cover/<id>', async () => {
    const response = await addCover(upload(jpeg()), ctx());

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ cover_url: 'https://signed/cover-42' });
    expect(storage.upload).toHaveBeenCalledWith('event_cover/42', expect.any(File), expect.objectContaining({ upsert: true, contentType: 'image/jpeg' }));
  });

  it('refuses anyone who is not the host', async () => {
    profileId = '8';
    const response = await addCover(upload(jpeg()), ctx());
    expect(response.status).toBe(403);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('refuses events the student cannot see', async () => {
    expect((await addCover(upload(jpeg()), ctx('99'))).status).toBe(404);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('accepts only JPEG, PNG or WebP photos up to 10 MB', async () => {
    const gif = new File([new Uint8Array(10)], 'a.gif', { type: 'image/gif' });
    expect((await (await addCover(upload(gif), ctx())).json()).error).toBe('Choose a JPEG, PNG or WebP photo.');
    expect((await (await addCover(upload(jpeg(10_000_001)), ctx())).json()).error).toBe('Cover photos must be 10 MB or smaller.');
    expect((await addCover(upload(), ctx())).status).toBe(400);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('lets the host remove the cover photo', async () => {
    const response = await removeCover(new Request('http://localhost/api/events/42/cover', { method: 'DELETE', headers: { authorization: `Bearer ${validToken}` } }), ctx());
    expect(await response.json()).toEqual({ cover_url: null });
    expect(storage.remove).toHaveBeenCalledWith(['event_cover/42']);
  });

  it('adds each cover to the event list, and still lists events if storage fails', async () => {
    const request = () => new Request('http://localhost/api/events', { headers: { authorization: `Bearer ${validToken}` } });
    expect((await (await listEvents(request())).json()).events[0].cover_url).toBe('https://signed/cover-42');

    storage.list.mockResolvedValue({ data: null, error: { message: 'storage down' } });
    const body = await (await listEvents(request())).json();
    expect(body.events[0]).toMatchObject({ event_id: '42', cover_url: null });
  });

  it('shows the cover photo instead of generated art', () => {
    expect(renderToStaticMarkup(createElement(EventArt, { id: '42', title: 'Halloween party', coverUrl: 'https://signed/cover-42' })))
      .toContain('src="https://signed/cover-42"');
    expect(renderToStaticMarkup(createElement(EventArt, { id: '42', title: 'Halloween party' }))).not.toContain('<img');
  });
});
