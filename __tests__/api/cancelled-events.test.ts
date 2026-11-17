import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };

const { getClient, getUser, rpc } = vi.hoisted(() => ({ getClient: vi.fn(), getUser: vi.fn(), rpc: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ getSupabaseClient: getClient }));

import { GET as cancelledEvents } from '../../app/api/events/cancelled/route';
import { CancelledEventList, EventHistory, HISTORY_SIZE, type CancelledEvent } from '../../components/events/CancelledEvents';
import { EventList, FeaturedEvent } from '../../components/events/EventList';

const user = { id: 'student-auth-id', email: 'student@salemstate.edu', email_confirmed_at: '2026-10-08T12:00:00Z' };
const validToken = 'header.' + Buffer.from(JSON.stringify({ iat: 1791849600, session_id: '11111111-1111-4111-8111-111111111111' })).toString('base64url') + '.signature';
const future = new Date(Date.now() + 2 * 86400000).toISOString();
const base = { creator_id: '7', creator_username: 'host', description: 'Floats.', location: 'Main Quad', starts_at: future };
const cancelled = (id: string, title: string, extra: Partial<CancelledEvent> = {}): CancelledEvent =>
  ({ ...base, event_id: id, title, status: 'cancelled', cancelled_at: '2026-11-16T15:00:00Z', cancellation_note: null, hosted_by_me: false, ...extra });
const request = (token = validToken) => new Request('http://localhost/api/events/cancelled', { headers: token ? { authorization: `Bearer ${token}` } : {} });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
  getClient.mockReturnValue({ auth: { getUser }, rpc });
  getUser.mockImplementation(async (token: string) => token === validToken
    ? { data: { user }, error: null }
    : { data: { user: null }, error: { message: 'Invalid token' } });
  rpc.mockImplementation(async (fn: string) => fn === 'socialu_session_guard' ? { data: true, error: null } : { data: [cancelled('42', 'Halloween Parade')], error: null });
});

describe('UR-404 cancelled events list', () => {
  it('returns the signed-in student’s cancelled events, never cached', async () => {
    const response = await cancelledEvents(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect((await response.json()).events.map((e: CancelledEvent) => e.title)).toEqual(['Halloween Parade']);
    expect(rpc.mock.calls.find(([fn]) => fn === 'socialu_cancelled_events')?.[1]).toEqual({ p_auth_id: 'student-auth-id' });
  });

  it('requires sign-in', async () => {
    expect((await cancelledEvents(request(''))).status).toBe(401);
  });

  it('shows each cancelled event in the Cancelled tab with when it was cancelled and the host’s note', () => {
    const html = renderToStaticMarkup(createElement(CancelledEventList, { events: [cancelled('42', 'Halloween Parade', { cancellation_note: 'Rain is forecast.', hosted_by_me: true })] }));
    expect(html).toContain('Halloween Parade');
    expect(html).toContain('>Cancelled<');
    expect(html).toContain('You hosted');
    expect(html).toContain('Rain is forecast.');
    expect(html).toContain('href="/events/42"');
    expect(renderToStaticMarkup(createElement(CancelledEventList, { events: [] }))).toContain('No cancelled events.');
  });

  it('lists the most recent cancelled events in History, with a link to see them all', () => {
    const many = Array.from({ length: HISTORY_SIZE + 2 }, (_, i) => cancelled(String(i), `Event ${i}`));
    const html = renderToStaticMarkup(createElement(EventHistory, { events: many, onShowAll: () => {} }));
    expect(html).toContain('History');
    expect(html.match(/href="\/events\//g)).toHaveLength(HISTORY_SIZE);
    expect(html).toContain(`See all ${HISTORY_SIZE + 2} cancelled events`);
    expect(renderToStaticMarkup(createElement(EventHistory, { events: [] }))).toContain('No cancelled events yet.');
  });
});

describe('UR-404 Cancel button on event cards', () => {
  const active = { ...base, event_id: '42', title: 'Halloween Parade', status: 'active' as const };
  const onCancel = () => {};

  it('shows Cancel event only on the host’s own upcoming events', () => {
    expect(renderToStaticMarkup(createElement(EventList, { events: [active], hostId: '7', onCancel }))).toContain('Cancel event');
    expect(renderToStaticMarkup(createElement(FeaturedEvent, { event: active, hostId: '7', onCancel }))).toContain('aria-label="Cancel Halloween Parade"');
    // Someone else's event, an event that has started, or a list without the cancel handler: no button.
    expect(renderToStaticMarkup(createElement(EventList, { events: [active], hostId: '8', onCancel }))).not.toContain('Cancel event');
    expect(renderToStaticMarkup(createElement(EventList, { events: [{ ...active, starts_at: '2020-01-01T10:00:00Z' }], hostId: '7', onCancel }))).not.toContain('Cancel event');
    expect(renderToStaticMarkup(createElement(EventList, { events: [active], hostId: '7' }))).not.toContain('Cancel event');
  });
});
