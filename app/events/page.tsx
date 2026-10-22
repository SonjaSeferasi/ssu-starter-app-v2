'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CirclePlus } from 'lucide-react';
import { storedAccessToken } from '../../lib/account/session';
import shellStyles from '../../components/navigation/social-shell.module.css';
import styles from './events.module.css';
import { useNavigationSession } from '../../components/navigation/social-shell';
import { SessionNotice } from '../../components/navigation/section-page';
import { EventList, type CampusEvent } from '../../components/events/EventList';

// SRS-401.1-.6: students view active campus events with their current title, description, location, date, and time.
export default function EventsPage() {
  const session = useNavigationSession();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);

  useEffect(() => {
    setCreated(new URLSearchParams(window.location.search).get('created') === '1');
    let controller: AbortController | null = null;

    // Always read the saved events from the server, so updated event details appear the next time the student looks.
    function loadEvents() {
      const token = storedAccessToken();
      if (!token) { setLoading(false); return; }
      controller?.abort();
      const current = new AbortController();
      controller = current;
      fetch('/api/events', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: current.signal })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) { setError(data.error || 'Events could not be loaded.'); return; }
          setError('');
          setEvents(data.events);
        })
        .catch((err) => { if (err.name !== 'AbortError') setError('Unable to load events. Please try again.'); })
        .finally(() => { if (controller === current) setLoading(false); });
    }

    function refreshWhenVisible() { if (document.visibilityState === 'visible') loadEvents(); }

    loadEvents();
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      controller?.abort();
    };
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
        ) : error && events.length === 0 ? (
          <p className={styles.empty}>Events will appear here once they can be loaded.</p>
        ) : (
          <EventList events={events} />
        )}
      </section>
    </main>
  );
}
