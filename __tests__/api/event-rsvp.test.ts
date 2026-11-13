import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };

const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));

import { POST as answer } from '../../app/api/events/[id]/rsvp/route';
import { RsvpInvitation, rsvpStatus } from '../../components/events/RsvpInvitation';
import { InvitationList } from '../../components/events/MyInvitations';

const user = { id: 'student-auth-id', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z' };
const validToken = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const ctx = (id = '42') => ({ params: Promise.resolve({ id }) });

function request(body?: object, token = validToken) {
  return new Request('http://localhost/api/events/42/rsvp', {
    method: 'POST',
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
  dbResult({ event_id: '42', rsvp: 'attending' });
});

describe('UR-403 an invited student accepts an event invitation', () => {
  it('records the RSVP as attending for the signed-in student', async () => {
    const response = await answer(request({ response: 'attending', studentId: 'someone-else' }), ctx());
    expect(response.status).toBe(200);
    expect((await response.json()).invitation).toEqual({ event_id: '42', rsvp: 'attending' });
    expect(callTo('socialu_event_rsvp')?.[1]).toEqual({ p_auth_id: 'student-auth-id', p_event_id: '42', p_response: 'attending' });
  });

  it('refuses anything other than accept or decline without touching the invitation', async () => {
    for (const response of ['pending', 'yes', undefined]) {
      expect((await answer(request({ response }), ctx())).status).toBe(400);
    }
    expect(callTo('socialu_event_rsvp')).toBeUndefined();
  });

  it('explains who can answer, and when', async () => {
    dbResult(null, { code: 'SE403', message: 'not invited' });
    let response = await answer(request({ response: 'attending' }), ctx());
    expect([response.status, (await response.json()).error]).toEqual([403, 'Only invited students can answer this invitation.']);
    dbResult(null, { code: 'SE409', message: 'started' });
    response = await answer(request({ response: 'attending' }), ctx());
    expect([response.status, (await response.json()).error]).toEqual([409, 'This event has already started, so your RSVP can no longer change.']);
    dbResult(null, { code: 'SE404', message: 'missing' });
    expect((await answer(request({ response: 'attending' }), ctx())).status).toBe(404);
  });

  it('requires sign-in', async () => {
    expect((await answer(request({ response: 'attending' }, ''), ctx())).status).toBe(401);
  });

  it('offers Accept while pending and confirms the RSVP once accepted', () => {
    const pending = renderToStaticMarkup(createElement(RsvpInvitation, { eventId: '42', host: 'host', rsvp: 'pending', onChange: () => {} }));
    expect(pending).toContain('Accept invitation');
    expect(pending).toContain('Will you attend?');
    const accepted = renderToStaticMarkup(createElement(RsvpInvitation, { eventId: '42', host: 'host', rsvp: 'attending', onChange: () => {} }));
    expect(accepted).toContain('Accepted');
    expect(accepted).toContain(rsvpStatus('attending'));
    expect(rsvpStatus('attending')).toBe('You accepted. Your RSVP says you plan to attend.');
  });

  it('shows each invitation’s answer in the invitation list', () => {
    const invitation = { event_id: '42', title: 'Halloween Parade', location: 'Main Quad', starts_at: '2026-11-20T23:00:00Z', creator_username: 'host', status: 'active' as const };
    const classNames = { list: 'l', item: 'i', title: 't', meta: 'm', empty: 'e' };
    const html = renderToStaticMarkup(createElement(InvitationList, { invitations: [{ ...invitation, rsvp: 'attending' }, { ...invitation, event_id: '43', rsvp: 'pending' }], classNames }));
    expect(html).toContain('Accepted');
    expect(html).toContain('Awaiting your reply');
  });
});
