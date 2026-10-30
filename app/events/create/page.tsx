'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { storedAccessToken } from '../../../lib/account/session';
import { ArrowLeft, Plus } from 'lucide-react';
import shellStyles from '../../../components/navigation/social-shell.module.css';
import styles from '../events.module.css';
import { COVER_ACCEPT, uploadCover } from '../../../components/events/CoverPhotoButton';
import { useNavigationSession } from '../../../components/navigation/social-shell';
import { SessionNotice } from '../../../components/navigation/section-page';

type EventForm = {
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  dressCode: string;
};

const emptyForm: EventForm = {
  title: '',
  description: '',
  location: '',
  date: '',
  time: '',
  dressCode: '',
};

export default function CreateEventPage() {
  const session = useNavigationSession();
  const router = useRouter();
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cover, setCover] = useState<File | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = storedAccessToken();
    setAccessToken(token);
    setLoading(false);
  }, []);

  function updateField(field: keyof EventForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!accessToken) {
      setError('Sign in before creating an event.');
      return;
    }

    setSubmitting(true);
    try {
      const timezoneOffset = new Date(`${form.date}T${form.time}`).getTimezoneOffset();
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...form, timezoneOffset }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'The event could not be created.');
        return;
      }
      // The optional cover photo is uploaded once the event exists; the event is kept even if this fails.
      let coverSaved = true;
      if (cover) {
        try { await uploadCover(data.event.event_id, cover); } catch { coverSaved = false; }
      }
      router.push(coverSaved ? '/events?created=1' : '/events?created=1&cover=failed');
    } catch {
      setError('Unable to create the event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (session !== 'signed-in' || loading) return <SessionNotice state={session === 'signed-in' ? 'loading' : session} />;

  return (
    <main className={shellStyles.page}>
      <Link href="/events" className={styles.backLink}>
        <ArrowLeft aria-hidden="true" size={16} />
        Back to Events &amp; Trending
      </Link>
      <h1 className={styles.title}>Create event</h1>
      <p className={styles.subtitle}>Provide the event details students need to understand and attend the activity.</p>

      {error ? <p role="alert" className={styles.alert}>{error}</p> : null}

      <section className={styles.panel}>
        <form onSubmit={handleSubmit} className={`${styles.formCard} ${styles.form}`}>
          <div className={styles.row}>
            <label className={styles.label}>
              Event title
              <input
                type="text"
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                required
                maxLength={255}
                placeholder="Campus cleanup"
                className={styles.input}
              />
            </label>
            <label className={styles.label}>
              Location
              <input
                type="text"
                value={form.location}
                onChange={(event) => updateField('location', event.target.value)}
                required
                maxLength={255}
                placeholder="North Hall"
                className={styles.input}
              />
            </label>
          </div>

          <label className={styles.label}>
            Description
            <textarea
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              required
              rows={4}
              maxLength={2000}
              placeholder="Describe what students should know about this event."
              className={styles.input}
            />
          </label>

          <div className={styles.row}>
            <label className={styles.label}>
              Date
              <input
                type="date"
                value={form.date}
                onChange={(event) => updateField('date', event.target.value)}
                required
                className={styles.input}
              />
            </label>
            <label className={styles.label}>
              Time
              <input
                type="time"
                value={form.time}
                onChange={(event) => updateField('time', event.target.value)}
                required
                className={styles.input}
              />
            </label>
          </div>

          <label className={styles.label}>
            Dress code (optional)
            <input type="text" value={form.dressCode} onChange={(event) => updateField('dressCode', event.target.value)}
              maxLength={100} placeholder="e.g. Costumes encouraged, Business casual" className={styles.input} />
          </label>

          <label className={styles.label}>
            Cover photo (optional)
            <input type="file" accept={COVER_ACCEPT} className={styles.input}
              onChange={(event) => setCover(event.target.files?.[0] ?? null)} />
            <span className={styles.hint}>JPEG, PNG or WebP, up to 10 MB. Without one, the event gets colorful generated art.</span>
          </label>

          <div className={styles.formFooter}>
            <p className={styles.hint}>Once created, your event appears on the Events page for other students.</p>
            <button type="submit" disabled={submitting} className={styles.primaryButton}>
              <Plus aria-hidden="true" />
              {submitting ? 'Creating event…' : 'Create event'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
