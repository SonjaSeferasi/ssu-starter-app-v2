'use client';

import { useEffect, useState } from 'react';
import { WhisperWallBanner } from './WhisperWallBanner';
import { ConfessionComposer } from './ConfessionComposer';
import { ConfessionCard } from './ConfessionCard';
import { CategoryFilter } from './CategoryFilter';
import { TrendingConfessions } from './TrendingConfessions';
import { CommunityGuidelines } from './CommunityGuidelines';
import type { Confession, WhisperCategory, WhisperSort } from './types';

const SORTS: { id: WhisperSort; label: string }[] = [
  { id: 'latest', label: 'Latest' },
  { id: 'trending', label: 'Trending' },
  { id: 'most_discussed', label: 'Most Discussed' },
];

// The Whisper Wall tab (additional functionality, not SRS-numbered) --
// rendered inside FeedPage as the third FeedSwitcher tab. The right
// sidebar here is intentionally just Trending Confessions + Community
// Guidelines -- no separate category panel, per explicit instruction.
export function WhisperTab({ accessToken }: { accessToken: string }) {
  const [category, setCategory] = useState<WhisperCategory | null>(null);
  const [sort, setSort] = useState<WhisperSort>('latest');
  const [confessions, setConfessions] = useState<Confession[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletedNotice, setDeletedNotice] = useState(false);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ sort, offset: '0' });
      if (category) params.set('category', category);
      const res = await fetch(`/api/whispers?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load the Whisper Wall.');
      setConfessions(body.confessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the Whisper Wall.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, category, sort]);

  function handlePublished(confession: Confession) {
    setConfessions((prev) => [confession, ...(prev ?? [])]);
  }

  function handleUpdated(updated: Confession) {
    setConfessions((prev) => (prev ?? []).map((c) => (c.confessionId === updated.confessionId ? updated : c)));
  }

  function handleDeleted(confessionId: number) {
    setConfessions((prev) => (prev ?? []).filter((c) => c.confessionId !== confessionId));
    setDeletedNotice(true);
    setTimeout(() => setDeletedNotice(false), 4000);
  }

  return (
    <div className="flex flex-col items-start gap-6 lg:flex-row">
      <div className="w-full min-w-0 flex-1 space-y-4 lg:max-w-2xl">
        <WhisperWallBanner />

        <ConfessionComposer accessToken={accessToken} onPublished={handlePublished} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex shrink-0 rounded-full bg-stone-100 p-1">
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSort(s.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  sort === s.id ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <CategoryFilter value={category} onChange={setCategory} />
        </div>

        {deletedNotice ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Confession deleted successfully.</div>
        ) : null}

        {loading ? (
          <p className="py-10 text-center text-sm text-stone-500">Loading the Whisper Wall…</p>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 py-6 text-center text-sm text-red-700">{error}</div>
        ) : confessions && confessions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white/60 py-10 text-center text-sm text-stone-500">
            {category ? 'No confessions in this category yet. Be the first to share one.' : 'No confessions yet. Be the first to share your campus secret.'}
          </div>
        ) : (
          <div className="space-y-4">
            {(confessions ?? []).map((confession) => (
              <ConfessionCard key={confession.confessionId} confession={confession} accessToken={accessToken} onUpdated={handleUpdated} onDeleted={handleDeleted} />
            ))}
          </div>
        )}
      </div>

      <aside className="order-first w-full shrink-0 space-y-4 lg:order-last lg:w-72">
        <TrendingConfessions accessToken={accessToken} />
        <CommunityGuidelines accessToken={accessToken} />
      </aside>
    </div>
  );
}
