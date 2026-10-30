'use client';

import { useState } from 'react';
import { SELECTABLE_CATEGORIES } from './types';
import type { Confession, WhisperCategory } from './types';

const MAX_LENGTH = 500;

// Confessions never carry an @mention of their own -- the text is always
// a free-form description (that's the whole "guess who" premise of
// Campus Crush); only COMMENTS on a campus_crush confession support
// @mentions, via WhisperCommentComposer. No mention autocomplete here.
export function ConfessionComposer({ accessToken, onPublished }: { accessToken: string; onPublished: (confession: Confession) => void }) {
  const [category, setCategory] = useState<WhisperCategory | null>(null);
  const [text, setText] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const canSubmit = category !== null && text.trim().length > 0 && text.length <= MAX_LENGTH && !publishing;

  async function handlePublish() {
    if (!category) {
      setError('Choose a category before sharing.');
      return;
    }
    if (!text.trim()) {
      setError('Write your confession before sharing.');
      return;
    }
    setError('');
    setPublishing(true);
    const res = await fetch('/api/whispers', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ category, textContent: text }),
    });
    const body = await res.json();
    setPublishing(false);
    if (!res.ok) {
      setError(body.error || 'Failed to share your confession.');
      return;
    }
    setText('');
    setCategory(null);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 4000);
    onPublished(body.confession);
  }

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-lg" aria-hidden="true">
          👻
        </span>
        <div className="relative min-w-0 flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's your campus secret? (Anonymous) …"
            rows={2}
            maxLength={MAX_LENGTH}
            disabled={publishing}
            className="w-full resize-none rounded-2xl border-0 bg-stone-50 px-4 py-3 pr-14 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
          />
          <span className={`absolute right-3 top-3 text-[11px] ${text.length > MAX_LENGTH - 30 ? 'text-red-500' : 'text-stone-400'}`}>
            {text.length}/{MAX_LENGTH}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 pl-[52px]" role="radiogroup" aria-label="Confession category">
        {SELECTABLE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={category === c.id}
            onClick={() => setCategory(c.id)}
            disabled={publishing}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-60 ${
              category === c.id ? `${c.bg} ${c.text}` : 'border border-stone-200 text-stone-500 hover:text-stone-800'
            }`}
          >
            <span aria-hidden="true">{c.emoji}</span> {c.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-col items-start justify-between gap-3 pl-[52px] sm:flex-row sm:items-center">
        <p className="flex items-start gap-1.5 text-xs text-stone-500">
          <span aria-hidden="true">🔒</span>
          <span>Your post will be anonymous to other students, but visible to authorized SocialU members and subject to moderation.</span>
        </p>
        <button
          type="button"
          onClick={handlePublish}
          disabled={!canSubmit}
          className="shrink-0 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
        >
          {publishing ? 'Sharing…' : 'Post Confession'}
        </button>
      </div>

      {error ? <p className="mt-2 pl-[52px] text-sm text-red-600">{error}</p> : null}
      {success ? <p className="mt-2 pl-[52px] text-sm font-medium text-emerald-700">Shared anonymously to the Whisper Wall!</p> : null}
    </div>
  );
}
