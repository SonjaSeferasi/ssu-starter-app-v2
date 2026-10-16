'use client';

import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Comment } from './types';

export function CommentComposer({
  postId,
  accessToken,
  authorInitial,
  onPosted,
}: {
  postId: number;
  accessToken: string;
  authorInitial: string;
  onPosted: (comment: Comment) => void;
}) {
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = text.trim().length > 0 && !posting;

  async function handleSubmit() {
    if (!canSubmit) return; // SRS-310: disabled while empty/whitespace-only or a request is pending.
    setPosting(true);
    setError('');
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ textContent: text }),
    });
    const body = await res.json();
    setPosting(false);
    if (!res.ok) {
      setError(body.error || 'Failed to post comment.');
      return;
    }
    setText('');
    onPosted(body.comment);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
        {authorInitial}
      </div>
      <div className="min-w-0 flex-1">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment…"
          rows={1}
          disabled={posting}
          className="w-full resize-none rounded-2xl border-0 bg-stone-50 px-3 py-2 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
        />
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        <div className="mt-1.5 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
          >
            {posting ? 'Posting…' : 'Post Comment'}
          </button>
        </div>
      </div>
    </div>
  );
}
