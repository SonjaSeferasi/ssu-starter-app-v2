import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };
import { describe, expect, it } from 'vitest';
import { EventList, FeaturedEvent, NO_ACTIVE_EVENTS, TrendingEvents, WeekStrip, type CampusEvent } from '../components/events/EventList';
import { goingNames } from '../components/events/EventActions';
import { splitByTime } from '../lib/events';
import { formatWhen, goingTo, hostedBy, trendingEvents, weekDays } from '../lib/events';

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

  it('trends events with 5 or more likes, most liked first, soonest first on a tie, top 5', () => {
    const at = (day: number) => new Date(2026, 9, day, 12).toISOString();
    const events = [
      { ...event, event_id: 'a', like_count: 4, starts_at: at(28) },
      { ...event, event_id: 'b', like_count: 5, starts_at: at(30) },
      { ...event, event_id: 'c', like_count: 9, starts_at: at(29) },
      { ...event, event_id: 'd', like_count: 5, starts_at: at(28) },
      { ...event, event_id: 'e', starts_at: at(28) },
    ];
    expect(trendingEvents(events).map((e) => e.event_id)).toEqual(['c', 'd', 'b']);
    expect(trendingEvents(Array.from({ length: 8 }, (_, i) => ({ ...event, event_id: String(i), like_count: 5 + i })))).toHaveLength(5);
  });

  it('lists only events the student is going to on My RSVPs', () => {
    expect(goingTo([{ ...event, going_by_me: true }, { ...event, event_id: '43', going_by_me: false }]).map((e) => e.event_id)).toEqual(['42']);
  });
});

describe('Event engagement on the page', () => {
  it('shows like, comment and going controls with counts, and who is going', () => {
    const html = render([{ ...event, like_count: 6, liked_by_me: true, comment_count: 2, going_count: 3, going_by_me: true, attendee_preview: ['sonja', 'darrin', 'linh'] }]);
    expect(html).toContain('aria-label="Unlike Campus Cleanup"');
    expect(html).toContain('href="/events/42#comments"');
    expect(html).toContain('>6<');
    expect(html).toContain('>2<');
    expect(html).toContain('@sonja, @darrin and @linh are going');
    expect(html).toContain('href="/events/42#going"');
    expect(html).toContain('>SO<');
    expect(html).toContain('Going');
    expect(html).toContain('href="/events/42"');
  });

  it('invites the first attendee when nobody is going yet', () => {
    expect(render([event])).toContain('Be the first to say you’re going');
  });

  it('ranks trending events with their likes, or explains how events trend', () => {
    const html = renderToStaticMarkup(createElement(TrendingEvents, { events: [{ ...event, like_count: 7 }] }));
    expect(html).toContain('Campus Cleanup');
    expect(html).toContain('7<span');
    expect(html).toContain('href="/events/42"');
    expect(renderToStaticMarkup(createElement(TrendingEvents, { events: [] }))).toContain('Events with 5 or more likes show up here.');
  });

  it('names who is going, with a count for everyone else', () => {
    expect(goingNames(['sonja'], 1)).toBe('@sonja is going');
    expect(goingNames(['sonja', 'darrin'], 2)).toBe('@sonja and @darrin are going');
    expect(goingNames(['sonja', 'darrin', 'linh'], 4)).toBe('@sonja, @darrin, @linh and 1 other are going');
    expect(goingNames(['sonja', 'darrin', 'linh'], 214)).toBe('@sonja, @darrin, @linh and 211 others are going');
  });

  it('shows the dress code only when the event has one, and the whole card opens the event', () => {
    const html = render([{ ...event, dress_code: 'Costumes encouraged' }]);
    expect(html).toContain('Dress code: Costumes encouraged');
    expect(html).toContain('href="/events/42"');
    expect(render([event])).not.toContain('Dress code');
  });

  it('keeps past events, splitting upcoming (soonest first) from past (most recent first)', () => {
    const now = Date.parse('2026-10-29T12:00:00Z');
    const at = (iso: string, id: string) => ({ ...event, event_id: id, starts_at: iso });
    const { upcoming, past } = splitByTime([at('2026-10-20T12:00:00Z', 'old'), at('2026-11-02T12:00:00Z', 'later'),
      at('2026-10-28T12:00:00Z', 'yesterday'), at('2026-10-30T12:00:00Z', 'tomorrow')], now);
    expect(upcoming.map((e) => e.event_id)).toEqual(['tomorrow', 'later']);
    expect(past.map((e) => e.event_id)).toEqual(['yesterday', 'old']);
  });
});
