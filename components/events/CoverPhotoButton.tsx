'use client';

import React, { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { storedAccessToken } from '../../lib/account/session';
import styles from '../../app/events/events.module.css';

export const COVER_ACCEPT = 'image/jpeg,image/png,image/webp';

// Upload a cover photo for an event; the server checks the student is its host.
export async function uploadCover(eventId: string, file: File): Promise<string | null> {
  const token = storedAccessToken();
  if (!token) throw new Error('Please sign in again.');
  const form = new FormData();
  form.append('image', file);
  const response = await fetch(`/api/events/${eventId}/cover`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The cover photo could not be saved.');
  return data.cover_url;
}

// For the event's host: a button over the event art to add or change its cover photo.
export function CoverPhotoButton({ eventId, hasCover, onChange }: { eventId: string; hasCover: boolean; onChange: (url: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function choose(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError('');
    try { onChange(await uploadCover(eventId, file)); } catch (err) { setError((err as Error).message); } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className={styles.coverControl}>
      <button type="button" className={styles.coverButton} onClick={() => input.current?.click()} disabled={busy}>
        <Camera aria-hidden="true" />
        {busy ? 'Uploading…' : hasCover ? 'Change photo' : 'Add cover photo'}
      </button>
      <input ref={input} type="file" accept={COVER_ACCEPT} hidden onChange={(change) => choose(change.target.files?.[0])} />
      {error ? <p role="alert" className={styles.coverError}>{error}</p> : null}
    </div>
  );
}
