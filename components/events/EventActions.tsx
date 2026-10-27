'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Heart, MessageCircle } from 'lucide-react';
import { storedAccessToken } from '../../lib/account/session';
import type { CampusEvent, EventEngagement } from '../../lib/events';
import styles from '../../app/events/events.module.css';

const initials = (username: string) => username.slice(0, 2).toUpperCase();

// Up to three attendee initials and the number of students going.
export function GoingSummary({ event }: { event: CampusEvent }) {
  const count = event.going_count ?? 0;
  if (count === 0) return <p className={styles.goingSummary}>Be the first to say you’re going</p>;
  return (
    <p className={styles.goingSummary}>
      <span className={styles.avatars} aria-hidden="true">
        {(event.attendee_preview ?? []).map((username) => <span key={username} className={styles.avatar}>{initials(username)}</span>)}
      </span>
      <strong>{count} going</strong>
    </p>
  );
}

// Like, comment and "I'm going" for one event. The server returns the updated counts after each change.
export function EventActions({ event, onChange, commentHref }:
  { event: CampusEvent; onChange: (engagement: EventEngagement) => void; commentHref?: string }) {
  const [busy, setBusy] = useState<'like' | 'going' | null>(null);
  const [error, setError] = useState('');
  const started = Date.parse(event.starts_at) <= Date.now();

  async function toggle(kind: 'like' | 'going', on: boolean) {
    const token = storedAccessToken();
    if (!token) { setError('Please sign in again.'); return; }
    setBusy(kind);
    setError('');
    try {
      const response = await fetch(`/api/events/${event.event_id}/${kind}`, {
        method: on ? 'DELETE' : 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) setError(data.error || 'That did not work. Please try again.');
      else onChange(data.engagement);
    } catch {
      setError('That did not work. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  const liked = Boolean(event.liked_by_me);
  const going = Boolean(event.going_by_me);
  return (
    <div className={styles.actionsWrap}>
      <div className={styles.actions}>
        <button type="button" className={styles.action} aria-pressed={liked} disabled={busy !== null}
          onClick={() => toggle('like', liked)} aria-label={`${liked ? 'Unlike' : 'Like'} ${event.title}`}>
          <Heart aria-hidden="true" fill={liked ? 'currentColor' : 'none'} />
          <span>{event.like_count ?? 0}</span>
        </button>
        <Link href={commentHref ?? `/events/${event.event_id}#comments`} className={styles.action} aria-label={`Comments on ${event.title}`}>
          <MessageCircle aria-hidden="true" />
          <span>{event.comment_count ?? 0}</span>
        </Link>
        <button type="button" className={`${styles.goingButton} ${going ? styles.goingOn : ''}`} aria-pressed={going}
          disabled={busy !== null || started} onClick={() => toggle('going', going)}
          title={started ? 'This event has started, so attendance can no longer change.' : undefined}>
          <Check aria-hidden="true" />
          {going ? 'Going' : 'I’m going'}
        </button>
      </div>
      {error ? <p role="alert" className={styles.actionError}>{error}</p> : null}
    </div>
  );
}
