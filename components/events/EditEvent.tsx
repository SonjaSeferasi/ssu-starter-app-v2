'use client';

import React, { useState } from 'react';
import { Pencil, Save } from 'lucide-react';
import { storedAccessToken } from '../../lib/account/session';
import type { CampusEvent } from '../../lib/events';
import styles from '../../app/events/events.module.css';

type Editable = Pick<CampusEvent, 'event_id' | 'title' | 'description' | 'location' | 'starts_at' | 'dress_code'>;
export type EventEditForm = { title: string; description: string; location: string; date: string; time: string; dressCode: string };

const pad = (n: number) => String(n).padStart(2, '0');

// The saved event as the edit form shows it: the date and time in the creator's own time zone.
export function editFormValues(event: Editable): EventEditForm {
  const when = new Date(event.starts_at);
  return {
    title: event.title, description: event.description, location: event.location,
    date: `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}`,
    time: `${pad(when.getHours())}:${pad(when.getMinutes())}`,
    dressCode: event.dress_code ?? '',
  };
}

// SRS-404.1-404.5, for the event's creator: edit the title, description, location, date, time and dress code,
// then save; the saved values replace the old ones everywhere the event is shown. SRS-404.6: the server
// refuses anyone else, and only the creator sees this control.
export function EditEvent({ event, onSaved }: { event: Editable; onSaved: (event: Partial<CampusEvent>) => void }) {
  const [form, setForm] = useState<EventEditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const update = (field: keyof EventEditForm, value: string) => setForm((current) => current && { ...current, [field]: value });

  async function save(submit: React.FormEvent<HTMLFormElement>) {
    submit.preventDefault();
    const token = storedAccessToken();
    if (!token || !form) { setError('Please sign in again.'); return; }
    setSaving(true);
    setError('');
    try {
      const timezoneOffset = new Date(`${form.date}T${form.time}`).getTimezoneOffset();
      const response = await fetch(`/api/events/${event.event_id}`, {
        method: 'PATCH', cache: 'no-store',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, timezoneOffset }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'Your changes could not be saved. Please try again.'); return; }
      onSaved(data.event);
      setForm(null);
      setSaved(true);
    } catch {
      setError('Your changes could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.sectionBlock} aria-labelledby="edit-title">
      <h2 id="edit-title" className={styles.sectionTitle}>Edit event</h2>
      {!form ? (
        <>
          <p className={styles.sideBody}>Change the title, description, location, date, time or dress code.</p>
          {saved ? <p role="status" className={styles.notice}>Your changes were saved.</p> : null}
          <button type="button" className={styles.keepButton} onClick={() => { setForm(editFormValues(event)); setSaved(false); }}>
            <Pencil aria-hidden="true" size={18} /> Edit details
          </button>
        </>
      ) : (
        <form onSubmit={save} className={styles.form}>
          <div className={styles.row}>
            <label className={styles.label}>
              Event title
              <input type="text" value={form.title} onChange={(change) => update('title', change.target.value)}
                required maxLength={255} className={styles.input} />
            </label>
            <label className={styles.label}>
              Location
              <input type="text" value={form.location} onChange={(change) => update('location', change.target.value)}
                required maxLength={255} className={styles.input} />
            </label>
          </div>
          <label className={styles.label}>
            Description
            <textarea value={form.description} onChange={(change) => update('description', change.target.value)}
              required rows={4} maxLength={2000} className={styles.input} />
          </label>
          <div className={styles.row}>
            <label className={styles.label}>
              Date
              <input type="date" value={form.date} onChange={(change) => update('date', change.target.value)} required className={styles.input} />
            </label>
            <label className={styles.label}>
              Time
              <input type="time" value={form.time} onChange={(change) => update('time', change.target.value)} required className={styles.input} />
            </label>
          </div>
          <label className={styles.label}>
            Dress code (optional)
            <input type="text" value={form.dressCode} onChange={(change) => update('dressCode', change.target.value)}
              maxLength={100} className={styles.input} />
          </label>
          <div className={styles.formFooter}>
            <button type="button" className={styles.keepButton} disabled={saving} onClick={() => { setForm(null); setError(''); }}>Discard changes</button>
            <button type="submit" className={styles.primaryButton} disabled={saving}>
              <Save aria-hidden="true" /> {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}
      {error ? <p role="alert" className={styles.actionError}>{error}</p> : null}
    </section>
  );
}
