import React from 'react';
import { CalendarDays, Clock, MapPin } from 'lucide-react';
import styles from '../../app/events/events.module.css';

export type CampusEvent = {
  event_id: string;
  creator_username: string;
  title: string;
  description: string;
  location: string;
  starts_at: string;
};

export const NO_ACTIVE_EVENTS = 'No active events are available.';

const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

// SRS-401.1-.6: each active event with its current title, description, location, date, and time,
// or a message when no active events are available.
export function EventList({ events }: { events: CampusEvent[] }) {
  if (events.length === 0) {
    return (
      <div className={styles.empty}>
        <h2>{NO_ACTIVE_EVENTS}</h2>
        <p>Check back later, or create an event for your campus.</p>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {events.map((event) => {
        const startsAt = new Date(event.starts_at);
        return (
          <li key={event.event_id} className={styles.card}>
            <h2 className={styles.cardTitle}>{event.title}</h2>
            <p className={styles.organizer}>Organized by @{event.creator_username}</p>
            <dl className={styles.meta}>
              <div className={styles.metaRow}>
                <dt><CalendarDays aria-label="Date" /></dt>
                <dd>{dateFormat.format(startsAt)}</dd>
              </div>
              <div className={styles.metaRow}>
                <dt><Clock aria-label="Time" /></dt>
                <dd>{timeFormat.format(startsAt)}</dd>
              </div>
              <div className={styles.metaRow}>
                <dt><MapPin aria-label="Location" /></dt>
                <dd>{event.location}</dd>
              </div>
            </dl>
            <p className={styles.description}>{event.description}</p>
          </li>
        );
      })}
    </ul>
  );
}
