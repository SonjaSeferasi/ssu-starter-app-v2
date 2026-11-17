'use client';

import React, { useState } from 'react';
import { Ban } from 'lucide-react';
import { storedAccessToken } from '../../lib/account/session';
import { formatWhen, type CampusEvent } from '../../lib/events';
import styles from '../../app/events/events.module.css';

type Cancellation = Pick<CampusEvent, 'status' | 'cancelled_at' | 'cancellation_note'>;

// Cancels the event as its signed-in creator; returns the saved cancellation or throws with the server's message.
export async function requestCancel(eventId: string, note = ''): Promise<Cancellation> {
  const token = storedAccessToken();
  if (!token) throw new Error('Please sign in again.');
  const response = await fetch(`/api/events/${eventId}/cancel`, {
    method: 'POST', cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ note }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The event could not be cancelled. Please try again.');
  return data.event;
}

// UR-404: what invited students (and everyone else who can open the event) read once it is cancelled.
export function cancellationNotice(event: Cancellation) {
  if (event.status !== 'cancelled') return null;
  const when = event.cancelled_at ? ` on ${formatWhen(event.cancelled_at)}` : '';
  return { title: 'This event has been cancelled', detail: `The host cancelled this event${when}. It will not take place as planned.`, note: event.cancellation_note || null };
}

export function CancellationNotice({ event }: { event: Cancellation }) {
  const notice = cancellationNotice(event);
  if (!notice) return null;
  return (
    <div role="status" className={styles.cancelledNotice}>
      <strong><Ban aria-hidden="true" /> {notice.title}</strong>
      <p>{notice.detail}</p>
      {notice.note ? <p>Note from the host: “{notice.note}”</p> : null}
    </div>
  );
}

// UR-404, for the event's creator: choose Cancel event, optionally add a note, then confirm.
export function CancelEvent({ eventId, onCancelled }: { eventId: string; onCancelled: (event: Cancellation) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function cancel() {
    setSaving(true);
    setError('');
    try {
      onCancelled(await requestCancel(eventId, note));
    } catch (err) {
      setError((err as Error).message || 'The event could not be cancelled. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.sectionBlock} aria-labelledby="cancel-title">
      <h2 id="cancel-title" className={styles.sectionTitle}>Cancel this event</h2>
      {!confirming ? (
        <>
          <p className={styles.sideBody}>If the event will no longer take place as planned, cancel it. Invited students will see that it is cancelled.</p>
          <button type="button" className={styles.dangerButton} onClick={() => setConfirming(true)}>
            <Ban aria-hidden="true" /> Cancel event
          </button>
        </>
      ) : (
        <>
          <p className={styles.sideBody}>Are you sure? This cannot be undone. Likes, comments and new invitations will close.</p>
          <label htmlFor="cancel-note" className={styles.srOnly}>Note for invited students (optional)</label>
          <textarea id="cancel-note" value={note} onChange={(change) => setNote(change.target.value)} maxLength={300} rows={2}
            placeholder="Add a note for invited students (optional)" className={styles.input} />
          <div className={styles.formFooter}>
            <button type="button" className={styles.keepButton} disabled={saving} onClick={() => { setConfirming(false); setError(''); }}>Keep event</button>
            <button type="button" className={styles.dangerButton} disabled={saving} onClick={cancel}>
              {saving ? 'Cancelling…' : 'Yes, cancel event'}
            </button>
          </div>
        </>
      )}
      {error ? <p role="alert" className={styles.actionError}>{error}</p> : null}
    </section>
  );
}

// UR-404, on the host's event cards: Cancel event, then confirm. The event then leaves the active lists and
// moves to Cancelled and History.
export function CancelEventButton({ eventId, title, onCancelled }: { eventId: string; title: string; onCancelled: (cancellation: Cancellation) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function cancel() {
    setSaving(true);
    setError('');
    try {
      onCancelled(await requestCancel(eventId));
    } catch (err) {
      setError((err as Error).message || 'The event could not be cancelled. Please try again.');
      setSaving(false);
    }
  }

  if (!confirming) {
    return (
      <button type="button" className={styles.cardCancel} onClick={() => setConfirming(true)} aria-label={`Cancel ${title}`}>
        <Ban aria-hidden="true" /> Cancel event
      </button>
    );
  }
  return (
    <div className={styles.cardCancelConfirm} role="group" aria-label={`Cancel ${title}?`}>
      <p>Cancel this event? Invited students will see that it is cancelled. This cannot be undone.</p>
      <div>
        <button type="button" className={styles.keepButton} disabled={saving} onClick={() => { setConfirming(false); setError(''); }}>Keep event</button>
        <button type="button" className={styles.dangerButton} disabled={saving} onClick={cancel}>{saving ? 'Cancelling…' : 'Yes, cancel'}</button>
      </div>
      {error ? <p role="alert" className={styles.actionError}>{error}</p> : null}
    </div>
  );
}
