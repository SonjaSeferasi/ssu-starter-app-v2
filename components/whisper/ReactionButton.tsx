'use client';

import { useEffect, useRef, useState } from 'react';
import { REACTIONS } from './types';
import type { WhisperReaction } from './types';

// Shared reaction control for confessions AND comments/replies -- one
// "React" button that shows the picker on hover (desktop, via CSS
// group-hover, no JS needed) or tap (mobile, via the open state below);
// clicking the already-active reaction removes it, clicking a different
// one replaces it. The component owns its own fetch (same convention as
// the rest of this feature) so callers only need to pass a reactUrl.
export function ReactionButton({
  reactUrl,
  accessToken,
  reactionCounts,
  myReaction,
  onChanged,
  disabled,
}: {
  reactUrl: string;
  accessToken: string;
  reactionCounts: Record<WhisperReaction, number>;
  myReaction: WhisperReaction | null;
  onChanged: (reactionCounts: Record<WhisperReaction, number>, myReaction: WhisperReaction | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', onOutside);
    return () => document.removeEventListener('pointerdown', onOutside);
  }, [open]);

  async function choose(reaction: WhisperReaction) {
    if (busy) return;
    setOpen(false);
    setBusy(true);
    const next = myReaction === reaction ? null : reaction;
    const res = await fetch(reactUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ reaction: next }),
    });
    setBusy(false);
    if (!res.ok) return;
    const body = await res.json();
    onChanged(body.reactionCounts, body.myReaction);
  }

  const active = REACTIONS.find((r) => r.id === myReaction);
  const nonZero = REACTIONS.filter((r) => (reactionCounts[r.id] ?? 0) > 0);

  return (
    <div ref={wrapperRef} className="group relative inline-flex items-center gap-1.5">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:opacity-60 ${
          active ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-stone-200 text-stone-600 hover:bg-stone-50'
        }`}
      >
        <span aria-hidden="true">{active ? active.emoji : '🙂'}</span>
        {active ? active.label : 'React'}
      </button>

      {nonZero.length > 0 ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-stone-500">
          {nonZero.map((r) => (
            <span key={r.id} className="inline-flex items-center gap-0.5" aria-label={`${r.label}, ${reactionCounts[r.id]}`}>
              <span aria-hidden="true">{r.emoji}</span>
              {reactionCounts[r.id]}
            </span>
          ))}
        </span>
      ) : null}

      <div
        role="menu"
        className={`absolute bottom-full left-0 z-20 mb-2 ${open ? 'flex' : 'hidden'} gap-1 rounded-full border border-stone-200 bg-white p-1.5 shadow-lg group-hover:flex`}
      >
        {REACTIONS.map((r) => (
          <button
            key={r.id}
            type="button"
            role="menuitem"
            aria-pressed={myReaction === r.id}
            aria-label={r.label}
            onClick={() => choose(r.id)}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-lg transition hover:scale-125 ${
              myReaction === r.id ? 'bg-emerald-100' : ''
            }`}
          >
            <span aria-hidden="true">{r.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
