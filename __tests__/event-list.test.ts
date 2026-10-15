import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };
import { describe, expect, it } from 'vitest';
import { EventList, NO_ACTIVE_EVENTS, type CampusEvent } from '../components/events/EventList';

const event: CampusEvent = {
  event_id: '42',
  creator_username: 'organizer',
  title: 'Campus Cleanup',
  description: 'Clean up the campus.',
  location: 'North Hall',
  starts_at: '2026-10-20T14:30:00.000Z',
};

const render = (events: CampusEvent[]) => renderToStaticMarkup(createElement(EventList, { events }));

describe('SRS-401 view active campus events', () => {
  it('displays each available event with its title, description, location, date, and time', () => {
    const html = render([event, { ...event, event_id: '43', title: 'Movie on the Quad', location: 'Central Quad' }]);
    const startsAt = new Date(event.starts_at);

    expect(html).toContain('Campus Cleanup');
    expect(html).toContain('Movie on the Quad');
    expect(html).toContain('Clean up the campus.');
    expect(html).toContain('North Hall');
    expect(html).toContain('Central Quad');
    expect(html).toContain(new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(startsAt));
    expect(html).toContain(new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(startsAt));
    expect(html).not.toContain(NO_ACTIVE_EVENTS);
  });

  it('displays the latest saved information after an event is updated', () => {
    const updated = { ...event, title: 'Campus Cleanup (moved)', location: 'South Lawn', description: 'New meeting spot.' };
    const html = render([updated]);

    expect(html).toContain('Campus Cleanup (moved)');
    expect(html).toContain('South Lawn');
    expect(html).toContain('New meeting spot.');
    expect(html).not.toContain('North Hall');
  });

  it('states that no active events are available when there are none', () => {
    expect(render([])).toContain('No active events are available.');
  });
});
