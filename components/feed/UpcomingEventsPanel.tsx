'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { storedAccessToken } from '../../lib/account/session';

type UpcomingEvent = { event_id: string; title: string; starts_at: string };

const whenFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// SRS-401.1: a preview of upcoming campus events beside the feed; the whole card opens Events and Trending.
export function UpcomingEventsPanel() {
  const [events, setEvents] = useState<UpcomingEvent[] | null>(null);

  useEffect(() => {
    const token = storedAccessToken();
    if (!token) { setEvents([]); return; }
    const controller = new AbortController();
    fetch('/api/events', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal })
      .then(async (response) => setEvents(response.ok ? (await response.json()).events.slice(0, 3) : []))
      .catch((err) => { if (err.name !== 'AbortError') setEvents([]); });
    return () => controller.abort();
  }, []);

  return (
    <Link
      href="/events"
      className="block rounded-3xl border border-stone-200 bg-white/70 p-5 transition hover:border-emerald-300 hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#28634e]"
    >
      <p className="text-sm font-semibold text-stone-800">🗓️ Events</p>
      {events === null ? (
        <p className="mt-1.5 text-xs leading-relaxed text-stone-500">Loading upcoming events…</p>
      ) : events.length === 0 ? (
        <p className="mt-1.5 text-xs leading-relaxed text-stone-500">No upcoming events yet — create one for your campus.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {events.map((event) => (
            <li key={event.event_id}>
              <p className="truncate text-xs font-semibold text-stone-700">{event.title}</p>
              <p className="text-xs text-stone-500">{whenFormat.format(new Date(event.starts_at))}</p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs font-semibold text-emerald-700">See all events →</p>
    </Link>
  );
}
