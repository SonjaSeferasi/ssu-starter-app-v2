'use client';

import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { storedAccessToken } from '../../lib/account/session';
import styles from '../../app/events/events.module.css';

export type Rsvp = 'pending' | 'attending' | 'not_attending';

// What the invited student's current answer means, in their words.
export function rsvpStatus(rsvp: string) {
  if (rsvp === 'attending') return 'You accepted. Your RSVP says you plan to attend.';
  if (rsvp === 'not_attending') return 'You declined this invitation.';
  return 'You’re invited. Will you attend?';
}

// UR-403, for an invited student: accept (RSVP 'attending') or decline the invitation, and change their mind
// until the event starts.
export function RsvpInvitation({ eventId, host, rsvp, onChange }: { eventId: string; host: string; rsvp: string; onChange: (rsvp: Rsvp) => void }) {
  const [saving, setSaving] = useState<Rsvp | null>(null);
  const [error, setError] = useState('');

  async function answer(response: Rsvp) {
    const token = storedAccessToken();
    if (!token) { setError('Please sign in again.'); return; }
    setSaving(response);
    setError('');
    try {
      const result = await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'POST', cache: 'no-store',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });
      const data = await result.json();
      if (!result.ok) { setError(data.error || 'Your answer could not be saved. Please try again.'); return; }
      onChange(data.invitation.rsvp);
    } catch {
      setError('Your answer could not be saved. Please try again.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className={styles.sectionBlock} aria-labelledby="rsvp-title">
      <h2 id="rsvp-title" className={styles.sectionTitle}>Your invitation</h2>
      <p className={styles.sideBody}>@{host} invited you. <span role="status">{rsvpStatus(rsvp)}</span></p>
      <div className={styles.rsvpButtons}>
        <button type="button" className={styles.primaryButton} aria-pressed={rsvp === 'attending'}
          disabled={saving !== null || rsvp === 'attending'} onClick={() => answer('attending')}>
          <Check aria-hidden="true" /> {saving === 'attending' ? 'Accepting…' : rsvp === 'attending' ? 'Accepted' : 'Accept invitation'}
        </button>
        <button type="button" className={styles.keepButton} aria-pressed={rsvp === 'not_attending'}
          disabled={saving !== null || rsvp === 'not_attending'} onClick={() => answer('not_attending')}>
          <X aria-hidden="true" /> {saving === 'not_attending' ? 'Declining…' : rsvp === 'not_attending' ? 'Declined' : 'Decline'}
        </button>
      </div>
      {error ? <p role="alert" className={styles.actionError}>{error}</p> : null}
    </section>
  );
}
