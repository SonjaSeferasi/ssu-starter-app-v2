import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };

const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));

import { POST as cancelEvent } from '../../app/api/events/[id]/cancel/route';
import { CancellationNotice, cancellationNotice } from '../../components/events/CancelEvent';
import { InvitationList } from '../../components/events/MyInvitations';

const user = { id: 'creator-auth-id', email: 'creator@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z' };
const validToken = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const ctx = (id = '42') => ({ params: Promise.resolve({ id }) });
const cancelled = { event_id: '42', status: 'cancelled', cancelled_at: '2026-11-13T15:00:00Z', cancellation_note: 'Rain is forecast.' };

function request(body?: object, token = validToken) {
  return new Request('http://localhost/api/events/42/cancel', {
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
  dbResult(cancelled);
});

describe('UR-404 the creator cancels an event', () => {
  it('marks the event cancelled for the signed-in creator, with the optional note', async () => {
    const response = await cancelEvent(request({ note: '  Rain is forecast.  ', creatorId: 'someone-else' }), ctx());
    expect(response.status).toBe(200);
    expect((await response.json()).event).toEqual(cancelled);
    expect(callTo('socialu_event_cancel')?.[1]).toEqual({ p_auth_id: 'creator-auth-id', p_event_id: '42', p_note: 'Rain is forecast.' });
  });

  it('sends no note when none is given', async () => {
    await cancelEvent(request({}), ctx());
    expect(callTo('socialu_event_cancel')?.[1].p_note).toBeNull();
  });

  it('refuses a note over 300 characters without touching the event', async () => {
    const response = await cancelEvent(request({ note: 'x'.repeat(301) }), ctx());
    expect(response.status).toBe(400);
    expect(callTo('socialu_event_cancel')).toBeUndefined();
  });

  it('explains who can cancel, and when', async () => {
    dbResult(null, { code: 'SE403', message: 'denied' });
    let response = await cancelEvent(request({}), ctx());
    expect([response.status, (await response.json()).error]).toEqual([403, 'Only the event’s creator can cancel it.']);
    dbResult(null, { code: 'SE409', message: 'started' });
    response = await cancelEvent(request({}), ctx());
    expect([response.status, (await response.json()).error]).toEqual([409, 'This event has already started, so it can no longer be cancelled.']);
    dbResult(null, { code: 'SE404', message: 'missing' });
    expect((await cancelEvent(request({}), ctx())).status).toBe(404);
    expect((await cancelEvent(request({}), ctx('abc'))).status).toBe(404);
  });

  it('requires sign-in', async () => {
    expect((await cancelEvent(request({}, ''), ctx())).status).toBe(401);
  });
});

describe('UR-404 invited students see the cancellation', () => {
  it('shows the cancellation status and the host’s note on the event', () => {
    expect(cancellationNotice({ status: 'active' })).toBeNull();
    const html = renderToStaticMarkup(createElement(CancellationNotice, { event: cancelled as never }));
    expect(html).toContain('This event has been cancelled');
    expect(html).toContain('Rain is forecast.');
    expect(renderToStaticMarkup(createElement(CancellationNotice, { event: { status: 'active' } }))).toBe('');
  });

  it('marks a cancelled invitation as cancelled, with the notice', () => {
    const invitation = { event_id: '42', title: 'Halloween Parade', location: 'Main Quad', starts_at: '2026-11-20T23:00:00Z', creator_username: 'host', rsvp: 'pending' };
    const classNames = { list: 'l', item: 'i', title: 't', meta: 'm', empty: 'e', cancelled: 'c' };
    const html = renderToStaticMarkup(createElement(InvitationList, { invitations: [{ ...invitation, ...cancelled } as never, { ...invitation, event_id: '43', title: 'Bonfire', status: 'active' }], classNames }));
    expect(html.match(/>Cancelled</g)).toHaveLength(1);
    expect(html).toContain('Cancelled by the host: “Rain is forecast.”');
    expect(html).toContain('href="/events/42"');
  });
});
