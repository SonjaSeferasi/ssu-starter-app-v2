'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Ban } from 'lucide-react';
import { storedAccessToken } from '../../lib/account/session';
import { formatWhen, type CampusEvent } from '../../lib/events';
import { EventArt } from './EventArt';
import styles from '../../app/events/events.module.css';

export type CancelledEvent = CampusEvent & { hosted_by_me?: boolean };

export const HISTORY_SIZE = 5;
const cancelledOn = (event: CancelledEvent) => event.cancelled_at ? `Cancelled ${formatWhen(event.cancelled_at)}` : 'Cancelled';

// UR-404: the cancelled events the student created, was invited to or was going to (GET /api/events/cancelled).
export function useCancelledEvents() {
  const [events, setEvents] = useState<CancelledEvent[] | null>(null);
  useEffect(() => {
    const token = storedAccessToken();
    if (!token) { setEvents([]); return; }
    const controller = new AbortController();
    fetch('/api/events/cancelled', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal })
      .then(async (response) => setEvents(response.ok ? (await response.json()).events : []))
      .catch((err) => { if (err.name !== 'AbortError') setEvents([]); });
    return () => controller.abort();
  }, []);
  // A just-cancelled event joins the top of the list at once; the server's copy replaces it on the next load.
  const add = (event: CancelledEvent) => setEvents((current) => [event, ...(current ?? []).filter((e) => e.event_id !== event.event_id)]);
  return { events, add };
}

// The Cancelled tab: every cancelled event with when it was cancelled and the host's note.
export function CancelledEventList({ events }: { events: CancelledEvent[] | null }) {
  if (events === null) return <p role="status" className={styles.empty}>Loading cancelled events…</p>;
  if (events.length === 0) {
    return (
      <div className={styles.empty}>
        <h2>No cancelled events.</h2>
        <p>Events you host, are invited to or are going to appear here if they are cancelled.</p>
      </div>
    );
  }
  return (
    <ul className={styles.grid}>
      {events.map((event) => (
        <li key={event.event_id} className={`${styles.card} ${styles.cancelledCard}`}>
          <div className={styles.cardArtWrap}>
            <EventArt id={event.event_id} title={event.title} className={styles.cardArt} coverUrl={event.cover_url} />
          </div>
          <div className={styles.cardBody}>
            <p><span className={styles.cancelledTag}>Cancelled</span>{event.hosted_by_me ? <span className={styles.hostTag}>You hosted</span> : null}</p>
            <h3 className={styles.cardTitle}>
              <Link href={`/events/${event.event_id}`} className={styles.titleLink}>{event.title}</Link>
            </h3>
            <p className={styles.cancelledMeta}>Was planned for {formatWhen(event.starts_at)} · {event.location} · @{event.creator_username}</p>
            <p className={styles.cancelledMeta}>{cancelledOn(event)}</p>
            {event.cancellation_note ? <p className={styles.description}>Note from the host: “{event.cancellation_note}”</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

// History, under Trending on the side: the most recently cancelled events, each opening the event.
export function EventHistory({ events, onShowAll }: { events: CancelledEvent[] | null; onShowAll?: () => void }) {
  return (
    <section className={styles.sideCard} aria-labelledby="history-title">
      <h2 id="history-title" className={styles.sideTitle}>History</h2>
      <p className={styles.sideBody}>Recently cancelled events</p>
      {events === null ? <p className={styles.sideEmpty}>Loading history…</p>
        : events.length === 0 ? <p className={styles.sideEmpty}>No cancelled events yet.</p>
        : (
          <ul className={styles.historyList}>
            {events.slice(0, HISTORY_SIZE).map((event) => (
              <li key={event.event_id}>
                <Link href={`/events/${event.event_id}`} className={styles.historyItem}>
                  <Ban aria-hidden="true" />
                  <span>
                    <strong>{event.title}</strong>
                    <span>{cancelledOn(event)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      {onShowAll && events && events.length > HISTORY_SIZE ? (
        <button type="button" className={styles.historyMore} onClick={onShowAll}>See all {events.length} cancelled events</button>
      ) : null}
    </section>
  );
}
