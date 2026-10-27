import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };
import { describe, expect, it } from 'vitest';
import { EventList, FeaturedEvent, NO_ACTIVE_EVENTS, WeekStrip, type CampusEvent } from '../components/events/EventList';
import { formatWhen, hostedBy, weekDays } from '../lib/events';

const event: CampusEvent = {
  event_id: '42',
  creator_id: '7',
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
    expect(html).toContain(formatWhen(event.starts_at));
    expect(startsAt.getDate()).toBeGreaterThan(0);
    expect(html).toContain('Hosted by @organizer');
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

  it('features the next event with all of its details', () => {
    const html = renderToStaticMarkup(createElement(FeaturedEvent, { event }));
    expect(html).toContain('Next up');
    expect(html).toContain('Campus Cleanup');
    expect(html).toContain('North Hall');
    expect(html).toContain(formatWhen(event.starts_at));
    expect(html).toContain('Clean up the campus.');
  });
});

describe('Events page helpers', () => {
  it('builds a Monday-to-Sunday week with today and event days marked', () => {
    const tuesday = new Date(2026, 9, 27, 12);
    const days = weekDays(tuesday, [{ starts_at: new Date(2026, 9, 29, 19).toISOString() }]);

    expect(days.map((day) => day.date.getDate())).toEqual([26, 27, 28, 29, 30, 31, 1]);
    expect(days.filter((day) => day.isToday).map((day) => day.date.getDate())).toEqual([27]);
    expect(days.filter((day) => day.hasEvents).map((day) => day.date.getDate())).toEqual([29]);
  });

  it('starts the week on the previous Monday when today is Sunday', () => {
    expect(weekDays(new Date(2026, 10, 1, 9), [])[0].date.getDate()).toBe(26);
  });

  it('marks event days in the This week strip', () => {
    const html = renderToStaticMarkup(createElement(WeekStrip, { events: [event], today: new Date(event.starts_at) }));
    expect(html).toContain('This week');
    expect(html).toContain('aria-current="date"');
    expect(html).toContain('Has events');
  });

  it('shows only the signed-in student\'s events on the Hosting tab', () => {
    const other = { ...event, event_id: '43', creator_id: '8' };
    expect(hostedBy([event, other], '7').map((e) => e.event_id)).toEqual(['42']);
    expect(hostedBy([event, other], null)).toEqual([]);
  });
});
