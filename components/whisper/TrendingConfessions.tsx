'use client';

import { useEffect, useState } from 'react';
import { REACTIONS } from './types';
import type { Confession, WhisperReaction } from './types';

function totalReactions(counts: Record<WhisperReaction, number>): number {
  return REACTIONS.reduce((sum, r) => sum + (counts[r.id] ?? 0), 0);
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

// Right-sidebar panel, additional functionality not in the official SRS.
// Now the ONLY panel in the sidebar -- Community Guidelines was removed
// per explicit instruction, and there's no separate "Popular Categories"
// panel either.
//
// Fetches from its own dedicated socialu_whisper_trending RPC, which
// already enforces every display rule server-side -- top 3 by engagement
// score, zero-engagement confessions excluded entirely (never padded in),
// tie-broken by comments then reactions then recency. This component just
// renders whatever comes back (0-3 items) and exposes onSelect so the
// parent can scroll to/highlight the clicked confession in the main list.
export function TrendingConfessions({
  accessToken,
  onSelect,
  refreshKey,
}: {
  accessToken: string;
  onSelect: (confessionId: number) => void;
  /** Bumped by the parent (WhisperTab) whenever a confession is published,
   * updated (reacted to/commented on), or deleted -- the sidebar's own
   * engagement counts would otherwise go stale after mount, since this
   * effect only ran once per accessToken (confirmed bug #1183). */
  refreshKey?: number;
}) {
  const [confessions, setConfessions] = useState<Confession[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setError(false);
    fetch('/api/whispers/trending', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Failed to load trending confessions.');
        if (!cancelled) setConfessions(body.confessions ?? []);
      })
      .catch(() => {
        // A real failure (expired token, server error) must look different
        // from "nothing is trending right now" -- rendering the same empty
        // state for both made an outage indistinguishable from the quiet
        // state this panel is in most of the time anyway (confirmed bug #1183).
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, [accessToken, refreshKey]);

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-800">
        <span aria-hidden="true">🔥</span> Trending Confessions
      </p>
      {error ? (
        <p className="mt-2 text-xs text-red-600">Couldn't load trending confessions.</p>
      ) : !confessions ? (
        <p className="mt-2 text-xs text-stone-400">Loading…</p>
      ) : confessions.length === 0 ? (
        <p className="mt-2 text-xs text-stone-400">No trending confessions yet 👻</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {confessions.map((c, i) => (
            <li key={c.confessionId}>
              <button
                type="button"
                onClick={() => onSelect(c.confessionId)}
                className="flex w-full items-start gap-2.5 text-left transition hover:opacity-75"
              >
                <span className="shrink-0 text-sm font-semibold text-stone-400">{i + 1}</span>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-xs text-stone-700">{c.textContent}</p>
                  <p className="mt-0.5 text-[11px] text-stone-400">
                    {formatCount(totalReactions(c.reactionCounts))} reactions · {c.commentCount} comments
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
