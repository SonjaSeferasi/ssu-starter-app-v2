import React from 'react';
import { CalendarDays, MapPin, UserRound } from 'lucide-react';
import styles from '../../app/events/events.module.css';
import { EventArt } from './EventArt';
import { formatWhen, monthFormat, weekDays, weekdayFormat, type CampusEvent } from '../../lib/events';

export type { CampusEvent } from '../../lib/events';

export const NO_ACTIVE_EVENTS = 'No active events are available.';

function EventDetails({ event }: { event: CampusEvent }) {
  return (
    <dl className={styles.meta}>
      <div className={styles.metaRow}>
        <dt><CalendarDays aria-label="Date and time" /></dt>
        <dd>{formatWhen(event.starts_at)}</dd>
      </div>
      <div className={styles.metaRow}>
        <dt><MapPin aria-label="Location" /></dt>
        <dd>{event.location}</dd>
      </div>
      <div className={styles.metaRow}>
        <dt><UserRound aria-label="Host" /></dt>
        <dd>Hosted by @{event.creator_username}</dd>
      </div>
    </dl>
  );
}

// The soonest event, shown large at the top of Discover.
export function FeaturedEvent({ event }: { event: CampusEvent }) {
  return (
    <article className={styles.featured} aria-labelledby={`featured-${event.event_id}`}>
      <EventArt id={event.event_id} title={event.title} className={styles.featuredArt} />
      <div className={styles.featuredBody}>
        <p className={styles.kicker}>Next up</p>
        <h2 id={`featured-${event.event_id}`} className={styles.featuredTitle}>{event.title}</h2>
        <EventDetails event={event} />
        <p className={styles.description}>{event.description}</p>
      </div>
    </article>
  );
}

// SRS-401.1-.6: each active event with its current title, description, location, date, and time,
// or a message when no active events are available.
export function EventList({ events, emptyMessage = NO_ACTIVE_EVENTS, emptyHint = 'Check back later, or create an event for your campus.' }:
  { events: CampusEvent[]; emptyMessage?: string; emptyHint?: string }) {
  if (events.length === 0) {
    return (
      <div className={styles.empty}>
        <h2>{emptyMessage}</h2>
        <p>{emptyHint}</p>
      </div>
    );
  }

  return (
    <ul className={styles.grid}>
      {events.map((event) => {
        const startsAt = new Date(event.starts_at);
        return (
          <li key={event.event_id} id={`event-${event.event_id}`} className={styles.card}>
            <div className={styles.cardArtWrap}>
              <EventArt id={event.event_id} title={event.title} className={styles.cardArt} />
              <p className={styles.dateBadge} aria-hidden="true">
                <span>{monthFormat.format(startsAt)}</span>{startsAt.getDate()}
              </p>
            </div>
            <div className={styles.cardBody}>
              <h3 className={styles.cardTitle}>{event.title}</h3>
              <EventDetails event={event} />
              <p className={`${styles.description} ${styles.clamp}`}>{event.description}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// Monday-to-Sunday strip with today highlighted and a dot on each day that has an event.
export function WeekStrip({ events, today = new Date() }: { events: CampusEvent[]; today?: Date }) {
  return (
    <section className={styles.sideCard} aria-labelledby="this-week">
      <h2 id="this-week" className={styles.sideTitle}>This week</h2>
      <ol className={styles.week}>
        {weekDays(today, events).map((day) => (
          <li key={day.date.toISOString()} className={day.isToday ? styles.today : undefined} aria-current={day.isToday ? 'date' : undefined}>
            <span className={styles.weekday}>{weekdayFormat.format(day.date)}</span>
            <span className={styles.weekDate}>{day.date.getDate()}</span>
            {day.hasEvents ? <span className={styles.dot} aria-label="Has events" /> : <span className={styles.noDot} />}
          </li>
        ))}
      </ol>
    </section>
  );
}
