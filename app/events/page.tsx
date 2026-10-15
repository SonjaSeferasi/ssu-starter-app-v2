'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CalendarDays, CirclePlus, MapPin } from 'lucide-react';
import { storedAccessToken } from '../../lib/account/session';
import shellStyles from '../../components/navigation/social-shell.module.css';
import styles from './events.module.css';
import { useNavigationSession } from '../../components/navigation/social-shell';
import { SessionNotice } from '../../components/navigation/section-page';

type CampusEvent = {
  event_id: string;
  creator_username: string;
  title: string;
  description: string;
  location: string;
  starts_at: string;
};

const dateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

// SRS-401.1-.6: students discover upcoming campus events with their title, description, location, date, and time.
export default function EventsPage() {
  const session = useNavigationSession();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);

  useEffect(() => {
    setCreated(new URLSearchParams(window.location.search).get('created') === '1');
    const token = storedAccessToken();
    if (!token) { setLoading(false); return; }

    const controller = new AbortController();
    fetch('/api/events', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) setError(data.error || 'Events could not be loaded.');
        else setEvents(data.events);
      })
      .catch((err) => { if (err.name !== 'AbortError') setError('Unable to load events. Please try again.'); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  if (session !== 'signed-in') return <SessionNotice state={session} />;

  return (
    <main className={shellStyles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Events &amp; Trending</h1>
        <Link href="/events/create" className={styles.button}>
          <CirclePlus aria-hidden="true" />
          Create event
        </Link>
      </div>

      {created ? <p role="status" className={styles.notice}>Your event was created and is now visible to other students.</p> : null}
      {error ? <p role="alert" className={styles.alert}>{error}</p> : null}

      <section className={styles.panel} aria-label="Campus events" aria-busy={loading}>
        {loading ? (
          <p role="status" className={styles.empty}>Loading events…</p>
        ) : events.length === 0 ? (
          <div className={styles.empty}>
            <h2>No upcoming events yet</h2>
            <p>{error ? 'Events will appear here once they can be loaded.' : 'Be the first to organize something for your campus.'}</p>
          </div>
        ) : (
          <ul className={styles.list}>
            {events.map((event) => {
              const startsAt = new Date(event.starts_at);
              return (
                <li key={event.event_id} className={styles.card}>
                  <h2 className={styles.cardTitle}>{event.title}</h2>
                  <p className={styles.organizer}>Organized by @{event.creator_username}</p>
                  <dl className={styles.meta}>
                    <div className={styles.metaRow}>
                      <dt><CalendarDays aria-label="Date and time" /></dt>
                      <dd>{dateFormat.format(startsAt)} · {timeFormat.format(startsAt)}</dd>
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
        )}
      </section>
    </main>
  );
}
