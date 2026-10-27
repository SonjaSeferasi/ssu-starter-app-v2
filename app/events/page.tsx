'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Flame, Plus } from 'lucide-react';
import { storedAccessToken } from '../../lib/account/session';
import shellStyles from '../../components/navigation/social-shell.module.css';
import styles from './events.module.css';
import { useNavigationSession } from '../../components/navigation/social-shell';
import { SessionNotice } from '../../components/navigation/section-page';
import { EventList, FeaturedEvent, WeekStrip, type CampusEvent } from '../../components/events/EventList';
import { hostedBy } from '../../lib/events';

type Tab = 'discover' | 'rsvps' | 'hosting';
const TABS: { id: Tab; label: string }[] = [
  { id: 'discover', label: 'Discover' },
  { id: 'rsvps', label: 'My RSVPs' },
  { id: 'hosting', label: 'Hosting' },
];

// SRS-401.1-.6: students view active campus events with their current title, description, location, date, and time.
export default function EventsPage() {
  const session = useNavigationSession();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('discover');
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
      const headers = { Authorization: `Bearer ${token}` };
      fetch('/api/events', { headers, cache: 'no-store', signal: current.signal })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) { setError(data.error || 'Events could not be loaded.'); return; }
          setError('');
          setEvents(data.events);
        })
        .catch((err) => { if (err.name !== 'AbortError') setError('Unable to load events. Please try again.'); })
        .finally(() => { if (controller === current) setLoading(false); });
      // The Hosting tab compares each event's creator with the signed-in student.
      fetch('/api/profile', { headers, cache: 'no-store', signal: current.signal })
        .then(async (response) => { if (response.ok) setStudentId((await response.json()).profile?.id ?? null); })
        .catch(() => {});
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

  const [featured, ...upcoming] = events;
  const hosting = hostedBy(events, studentId);

  return (
    <main className={shellStyles.page}>
      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <header className={styles.header}>
            <div>
              <h1 className={styles.title}>Events &amp; Trending</h1>
              <p className={styles.subtitle}>What’s happening around Salem State this week</p>
            </div>
            <Link href="/events/create" className={styles.primaryButton}>
              <Plus aria-hidden="true" />
              Create event
            </Link>
          </header>

          <div role="tablist" aria-label="Events" className={styles.tabs}>
            {TABS.map(({ id, label }) => (
              <button key={id} id={`tab-${id}`} type="button" role="tab" aria-selected={tab === id} aria-controls="events-panel"
                className={styles.tab} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>

          {created ? <p role="status" className={styles.notice}>Your event was created and is now visible to other students.</p> : null}
          {error ? <p role="alert" className={styles.alert}>{error}</p> : null}

          <div id="events-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} aria-busy={loading}>
            {loading ? (
              <p role="status" className={styles.empty}>Loading events…</p>
            ) : error && events.length === 0 ? (
              <p className={styles.empty}>Events will appear here once they can be loaded.</p>
            ) : tab === 'discover' ? (
              featured ? (
                <>
                  <FeaturedEvent event={featured} />
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Upcoming events</h2>
                    <span className={styles.count}>{events.length} {events.length === 1 ? 'event' : 'events'}</span>
                  </div>
                  <EventList events={upcoming} emptyMessage="No other events yet." emptyHint="Create one to give students more to do." />
                </>
              ) : (
                <EventList events={[]} />
              )
            ) : tab === 'hosting' ? (
              <EventList events={hosting} emptyMessage="You aren’t hosting any active events."
                emptyHint="Events you create will appear here." />
            ) : (
              <div className={styles.empty}>
                <h2>RSVPs are coming soon</h2>
                <p>Once event invitations are ready, events you’re attending will appear here.</p>
              </div>
            )}
          </div>
        </div>

        <aside className={styles.sideColumn}>
          <WeekStrip events={events} />
          <section className={styles.sideCard} aria-labelledby="trending-title">
            <h2 id="trending-title" className={styles.sideTitle}><Flame aria-hidden="true" className={styles.flame} /> Trending on campus</h2>
            <p className={styles.sideBody}>Coming soon — trending campus posts and events will be ranked here.</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
