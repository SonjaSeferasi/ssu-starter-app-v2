'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type EventForm = {
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
};

const emptyForm: EventForm = {
  title: '',
  description: '',
  location: '',
  date: '',
  time: '',
};

export default function CreateEventPage() {
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = window.localStorage.getItem('access_token');
    setAccessToken(token);
    setLoading(false);
  }, []);

  function updateField(field: keyof EventForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!accessToken) {
      setError('Sign in before creating an event.');
      return;
    }

    setSubmitting(true);
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      setError(data.error || 'The event could not be created.');
      return;
    }

    setMessage(`Event “${data.event.title}” was created successfully.`);
    setForm(emptyForm);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400">Loading…</p>
      </main>
    );
  }

  if (!accessToken) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <section className="text-center space-y-4">
          <p className="text-slate-300">You must be logged in to create an event.</p>
          <Link href="/login" className="inline-block rounded-full bg-emerald-400 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-300">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <section className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/90 p-7 shadow-2xl shadow-black/30 sm:p-10">
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">SRS-400.6</p>
        <h1 className="mt-4 text-3xl font-semibold">Create a campus event</h1>
        <p className="mt-2 text-slate-300">Provide the event details students need to understand and attend the activity.</p>

        {message ? (
          <p className="mt-5 rounded-xl border border-emerald-800 bg-emerald-900/30 p-3 text-sm text-emerald-200">{message}</p>
        ) : null}
        {error ? (
          <p className="mt-5 rounded-xl border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">{error}</p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm text-slate-200">
              Event title
              <input
                type="text"
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                required
                maxLength={255}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400"
                placeholder="Campus cleanup"
              />
            </label>
            <label className="block text-sm text-slate-200">
              Location
              <input
                type="text"
                value={form.location}
                onChange={(event) => updateField('location', event.target.value)}
                required
                maxLength={255}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400"
                placeholder="North Hall"
              />
            </label>
          </div>

          <label className="block text-sm text-slate-200">
            Description
            <textarea
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              required
              rows={4}
              maxLength={2000}
              className="mt-1 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400"
              placeholder="Describe what students should know about this event."
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm text-slate-200">
              Date
              <input
                type="date"
                value={form.date}
                onChange={(event) => updateField('date', event.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400"
              />
            </label>
            <label className="block text-sm text-slate-200">
              Time
              <input
                type="time"
                value={form.time}
                onChange={(event) => updateField('time', event.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-emerald-400"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">The event will be saved as active.</p>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              {submitting ? 'Creating event…' : 'Create event'}
            </button>
          </div>
        </form>

        <p className="mt-8 text-sm text-slate-300">
          Back to <Link href="/" className="text-emerald-300 hover:underline">home</Link>
        </p>
      </section>
    </main>
  );
}
