import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };
import { InvitationList, shownInvitations, type MyInvitation } from '../components/events/MyInvitations';
import { RsvpInvitation } from '../components/events/RsvpInvitation';

const future = new Date(Date.now() + 2 * 86400000).toISOString();
const invitation = (id: string, title: string, rsvp: string, extra: Partial<MyInvitation> = {}): MyInvitation =>
  ({ event_id: id, title, location: 'Main Quad', starts_at: future, creator_username: 'host', rsvp, status: 'active', invited: false, ...extra });
const classNames = { list: 'l', item: 'i', title: 't', meta: 'm', empty: 'e', actions: 'a', accept: 'yes', decline: 'no', accepted: 'ok' };
const render = (invitations: MyInvitation[], extra: object = {}) =>
  renderToStaticMarkup(createElement(InvitationList, { invitations, classNames, onRespond: () => {}, ...extra }));

describe('Invitations: other students’ events with Accept and Decline', () => {
  it('offers Accept and Decline on each upcoming invitation, each opening its event', () => {
    const html = render([invitation('42', 'Halloween Parade', 'pending')]);
    expect(html).toContain('href="/events/42"');
    expect(html).toContain('>Accept<');
    expect(html).toContain('>Decline<');
    expect(html).toContain('Awaiting your reply');
  });

  it('keeps an accepted invitation, marked Accepted, with Decline to change their mind', () => {
    const html = render([invitation('42', 'Halloween Parade', 'attending')]);
    expect(html).toContain('Halloween Parade');
    expect(html).toContain('✓ Accepted');
    expect(html).not.toContain('>Accept<');
    expect(html).toContain('>Decline<');
  });

  it('removes declined invitations from the list', () => {
    const list = [invitation('42', 'Halloween Parade', 'not_attending'), invitation('43', 'Bonfire', 'pending', { invited: true })];
    expect(shownInvitations(list).map((i) => i.title)).toEqual(['Bonfire']);
    const html = render(list);
    expect(html).not.toContain('Halloween Parade');
    expect(html).toContain('Bonfire');
    expect(render([list[0]])).toContain('No event invitations right now.');
  });

  it('shows no buttons on cancelled or started events, or where answering is not offered', () => {
    expect(render([invitation('42', 'Gone', 'pending', { status: 'cancelled' })])).not.toContain('>Accept<');
    expect(render([invitation('42', 'Over', 'pending', { starts_at: '2020-01-01T10:00:00Z' })])).not.toContain('>Accept<');
    expect(renderToStaticMarkup(createElement(InvitationList, { invitations: [invitation('42', 'Parade', 'pending')], classNames }))).not.toContain('>Accept<');
  });

  it('can show only the first few, for the sidebar', () => {
    const many = Array.from({ length: 8 }, (_, i) => invitation(String(i), `Event ${i}`, 'pending'));
    expect(render(many, { limit: 5 }).match(/href="\/events\//g)).toHaveLength(5);
  });

  it('says who posted an event the student was not invited to', () => {
    expect(renderToStaticMarkup(createElement(RsvpInvitation, { eventId: '42', host: 'host', rsvp: 'pending', onChange: () => {}, invited: false }))).toContain('@host posted this event.');
    expect(renderToStaticMarkup(createElement(RsvpInvitation, { eventId: '42', host: 'host', rsvp: 'pending', onChange: () => {} }))).toContain('@host invited you.');
  });
});
