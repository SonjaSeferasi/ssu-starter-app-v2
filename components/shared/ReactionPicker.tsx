'use client';

import { useEffect, useRef, useState } from 'react';
import { REACTIONS } from '../../lib/reactions';
import type { Reaction } from '../../lib/reactions';

const LONG_PRESS_MS = 450;

// Facebook-style reaction control, shared by regular posts/comments AND
// the Whisper Wall's confessions/comments/replies (same component, same
// vocabulary/order everywhere -- see lib/reactions.ts). A short click/tap
// on the main button applies the default 👍 Like, or removes the current
// reaction if one is already active. Hovering (desktop) or long-pressing
// (mobile) opens a floating pill-shaped picker with all 6 reactions;
// picking the already-active one removes it, picking another replaces it.
// The component owns its own fetch (same convention as every other
// reaction/action control in this codebase) so callers only pass a URL.
export function ReactionPicker({
  reactUrl,
  accessToken,
  reactionCounts,
  myReaction,
  onChanged,
  disabled,
}: {
  reactUrl: string;
  accessToken: string;
  reactionCounts: Record<Reaction, number>;
  myReaction: Reaction | null;
  onChanged: (reactionCounts: Record<Reaction, number>, myReaction: Reaction | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function apply(reaction: Reaction | null) {
    if (busy) return;
    setOpen(false);
    setBusy(true);
    const res = await fetch(reactUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ reaction }),
    });
    setBusy(false);
    if (!res.ok) return;
    const body = await res.json();
    onChanged(body.reactionCounts, body.myReaction);
  }

  function choose(reaction: Reaction) {
    apply(myReaction === reaction ? null : reaction);
  }

  function handleClick() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    // A plain click/tap on the main button: default Like toggle, same as
    // Facebook -- apply 👍 if nothing is active yet, remove if there is one.
    apply(myReaction === null ? 'like' : null);
  }

  function startLongPress() {
    longPressTimer.current = setTimeout(() => {
      suppressClick.current = true;
      setOpen(true);
    }, LONG_PRESS_MS);
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  const active = REACTIONS.find((r) => r.id === myReaction);
  const nonZero = REACTIONS.filter((r) => (reactionCounts[r.id] ?? 0) > 0);
  const total = nonZero.reduce((sum, r) => sum + reactionCounts[r.id], 0);

  return (
    <div ref={wrapperRef} className="group relative inline-flex items-center gap-2">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={handleClick}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onTouchMove={cancelLongPress}
        onMouseEnter={() => setOpen(true)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-pressed={myReaction !== null}
        aria-label={active ? `${active.label}, click to remove` : 'Like'}
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium transition disabled:opacity-60 ${
          active ? 'text-emerald-700' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
        }`}
      >
        <span aria-hidden="true" className="text-base">
          {active ? active.emoji : '👍'}
        </span>
        <span>{active ? active.label : 'Like'}</span>
      </button>

      {total > 0 ? (
        <span className="inline-flex items-center gap-1 text-xs text-stone-500">
          {nonZero.slice(0, 3).map((r) => (
            <span key={r.id} aria-hidden="true">
              {r.emoji}
            </span>
          ))}
          <span>{total}</span>
        </span>
      ) : null}

      {/* The picker itself: a white pill-shaped floating bar with a soft
          shadow, positioned above the button so it's never clipped by the
          card's own bottom edge. Shown on hover (desktop, via CSS
          group-hover -- no JS state needed) or while `open` is true
          (mobile long-press, or keyboard/click fallback). Scales/fades in
          rather than just appearing, and each emoji pops on its own hover. */}
      <div
        role="menu"
        onMouseLeave={() => setOpen(false)}
        className={`absolute bottom-full left-0 z-20 mb-2 flex origin-bottom-left items-center gap-0.5 rounded-full border border-stone-100 bg-white p-1.5 shadow-lg transition-all duration-150 ${
          open ? 'visible scale-100 opacity-100' : 'invisible scale-90 opacity-0'
        } group-hover:visible group-hover:scale-100 group-hover:opacity-100`}
      >
        {REACTIONS.map((r) => (
          <button
            key={r.id}
            type="button"
            role="menuitem"
            aria-pressed={myReaction === r.id}
            aria-label={r.label}
            title={r.label}
            onClick={() => choose(r.id)}
            className={`flex h-9 w-9 items-center justify-center rounded-full text-xl transition-transform duration-150 hover:-translate-y-1.5 hover:scale-125 ${
              myReaction === r.id ? 'ring-2 ring-emerald-500' : ''
            }`}
          >
            <span aria-hidden="true">{r.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
