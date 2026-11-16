import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };

const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));

import { PATCH as updateEvent } from '../../app/api/events/[id]/route';
import { EditEvent, editFormValues } from '../../components/events/EditEvent';

const user = { id: 'creator-auth-id', email: 'creator@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z' };
const validToken = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const ctx = (id = '42') => ({ params: Promise.resolve({ id }) });
const nextYear = new Date().getUTCFullYear() + 1;
const form = { title: 'Halloween Costume Parade', description: 'Costumes and floats.', location: 'Main Quad', date: `${nextYear}-10-31`, time: '18:30', dressCode: '', timezoneOffset: 240 };
const saved = { event_id: '42', creator_id: '7', title: 'Halloween Costume Parade', description: 'Costumes and floats.', location: 'Main Quad', starts_at: `${nextYear}-10-31T22:30:00.000Z`, status: 'active', dress_code: null };

function request(body?: object, token = validToken) {
  return new Request('http://localhost/api/events/42', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}
const dbResult = (data: unknown, error: unknown = null) =>
  rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : { data, error });
const callTo = (fn: string) => rpc.mock.calls.find(([name]) => name === fn);

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockImplementation(async (token: string) => token === validToken
    ? { data: { user }, error: null }
    : { data: { user: null }, error: { message: 'Invalid token' } });
  dbResult(saved);
});

describe('SRS-404.1-404.5 the creator updates an event', () => {
  it('saves the new title and details for the signed-in creator, keeping the time they picked', async () => {
    const response = await updateEvent(request({ ...form, title: '  Halloween Costume Parade  ', creatorId: 'someone-else' }), ctx());
    expect(response.status).toBe(200);
    expect((await response.json()).event).toEqual(saved);
    expect(callTo('socialu_event_update')?.[1]).toEqual({
      p_auth_id: 'creator-auth-id', p_event_id: '42', p_title: 'Halloween Costume Parade', p_description: 'Costumes and floats.',
      p_location: 'Main Quad', p_starts_at: `${nextYear}-10-31T22:30:00.000Z`, p_dress_code: null,
    });
  });

  it('refuses a missing field or a past time without touching the event', async () => {
    for (const bad of [{ title: ' ' }, { description: '' }, { location: '' }, { date: '' }, { time: '' }, { date: '2020-01-01' }, { dressCode: 'x'.repeat(101) }]) {
      expect((await updateEvent(request({ ...form, ...bad }), ctx())).status).toBe(400);
    }
    expect(callTo('socialu_event_update')).toBeUndefined();
  });

  it('pre-fills the edit form with the saved details in the creator’s time zone', () => {
    const local = new Date(2026, 10, 20, 18, 5);
    expect(editFormValues({ ...saved, starts_at: local.toISOString(), dress_code: null })).toEqual({
      title: saved.title, description: saved.description, location: saved.location, date: '2026-11-20', time: '18:05', dressCode: '',
    });
    expect(renderToStaticMarkup(createElement(EditEvent, { event: saved, onSaved: () => {} }))).toContain('Edit details');
  });
});

describe('SRS-404.6 only the creator can update an event', () => {
  it('explains who can edit, and when', async () => {
    dbResult(null, { code: 'SE403', message: 'denied' });
    let response = await updateEvent(request(form), ctx());
    expect([response.status, (await response.json()).error]).toEqual([403, 'Only the event’s creator can edit it.']);
    dbResult(null, { code: 'SE409', message: 'started' });
    response = await updateEvent(request(form), ctx());
    expect([response.status, (await response.json()).error]).toEqual([409, 'This event has already started, so it can no longer be edited.']);
    dbResult(null, { code: 'SE404', message: 'missing' });
    expect((await updateEvent(request(form), ctx())).status).toBe(404);
  });

  it('requires sign-in', async () => {
    expect((await updateEvent(request(form, ''), ctx())).status).toBe(401);
  });
});
