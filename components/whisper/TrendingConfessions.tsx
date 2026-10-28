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
// Deliberately the ONLY discovery panel here besides CommunityGuidelines --
// no separate "Popular Categories" panel, per explicit instruction.
export function TrendingConfessions({ accessToken }: { accessToken: string }) {
  const [confessions, setConfessions] = useState<Confession[] | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    fetch('/api/whispers?sort=trending&offset=0', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => res.json())
      .then((body) => { if (!cancelled) setConfessions((body.confessions ?? []).slice(0, 5)); })
      .catch(() => { if (!cancelled) setConfessions([]); });
    return () => { cancelled = true; };
  }, [accessToken]);

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-800">
        <span aria-hidden="true">🔥</span> Trending Confessions
      </p>
      {!confessions ? (
        <p className="mt-2 text-xs text-stone-400">Loading…</p>
      ) : confessions.length === 0 ? (
        <p className="mt-2 text-xs text-stone-400">Nothing trending yet — be the first to share.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {confessions.map((c, i) => (
            <li key={c.confessionId} className="flex gap-2.5">
              <span className="shrink-0 text-sm font-semibold text-stone-400">{i + 1}</span>
              <div className="min-w-0">
                <p className="line-clamp-2 text-xs text-stone-700">{c.textContent}</p>
                <p className="mt-0.5 text-[11px] text-stone-400">
                  {formatCount(totalReactions(c.reactionCounts))} reactions · {c.commentCount} comments
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
