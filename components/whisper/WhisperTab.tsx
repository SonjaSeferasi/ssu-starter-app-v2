'use client';

import { useEffect, useState } from 'react';
import { WhisperWallBanner } from './WhisperWallBanner';
import { ConfessionComposer } from './ConfessionComposer';
import { ConfessionCard } from './ConfessionCard';
import { CategoryFilter } from './CategoryFilter';
import { TrendingConfessions } from './TrendingConfessions';
import type { Confession, WhisperCategory, WhisperSort } from './types';
import type { HeaderThemeId } from '../../lib/screen-themes';

const SORTS: { id: WhisperSort; label: string }[] = [
  { id: 'latest', label: 'Latest' },
  { id: 'trending', label: 'Trending' },
  { id: 'most_discussed', label: 'Most Discussed' },
];

// The Whisper Wall tab (additional functionality, not SRS-numbered) --
// rendered inside FeedPage as the third FeedSwitcher tab. The right
// sidebar here is intentionally just Trending Confessions -- Community
// Guidelines was removed per explicit instruction (its Campus Crush
// mention opt-out moved to Profile Settings, see campus-crush-privacy.tsx).
export function WhisperTab({ accessToken, headerTheme }: { accessToken: string; headerTheme?: HeaderThemeId | null }) {
  const [category, setCategory] = useState<WhisperCategory | null>(null);
  const [sort, setSort] = useState<WhisperSort>('latest');
  const [confessions, setConfessions] = useState<Confession[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Pagination (#1184): socialu_whisper_list and GET /api/whispers already
  // accept/forward an offset -- this was previously always 0, so anything
  // past the newest 20 (per category/sort) was permanently unreachable.
  // hasMore is the standard "did the last page come back full" heuristic
  // (no extra COUNT query needed); loadingMore is separate from `loading`
  // so paging in more doesn't replace the list with the full-page spinner.
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 20;
  const [deletedNotice, setDeletedNotice] = useState(false);
  // Trending Confessions sidebar click-through: same scroll-to/highlight
  // pattern FeedPage already uses for notification deep-links (SRS-312.10)
  // -- targetConfessionId is "waiting to be found"; once the (re)loaded
  // list actually contains it, the effect below scrolls to and briefly
  // highlights it, then clears both. If it's never in the loaded list
  // (e.g. way outside the first page), this silently does nothing, same
  // graceful degradation as the post version.
  const [targetConfessionId, setTargetConfessionId] = useState<number | null>(null);
  const [highlightedConfessionId, setHighlightedConfessionId] = useState<number | null>(null);
  const [targetNotFound, setTargetNotFound] = useState(false);
  // Bumped whenever a confession is published, updated, or deleted, so the
  // Trending Confessions sidebar (which fetches independently) refetches
  // instead of going stale after its first mount (confirmed bug #1183).
  const [trendingRefreshKey, setTrendingRefreshKey] = useState(0);

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
      setHasMore(body.confessions.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the Whisper Wall.');
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!accessToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ sort, offset: String((confessions ?? []).length) });
      if (category) params.set('category', category);
      const res = await fetch(`/api/whispers?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load more confessions.');
      // Append, not replace -- and de-dupe by id defensively in case a
      // confession shifted pages between the two requests (e.g. someone
      // else's new post landing in Latest sort right at the page boundary),
      // so "Load more" can never show the same confession twice.
      setConfessions((prev) => {
        const existingIds = new Set((prev ?? []).map((c) => c.confessionId));
        const fresh = (body.confessions as Confession[]).filter((c) => !existingIds.has(c.confessionId));
        return [...(prev ?? []), ...fresh];
      });
      setHasMore(body.confessions.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more confessions.');
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, category, sort]);

  useEffect(() => {
    if (loading || targetConfessionId === null) return;
    if (!(confessions ?? []).some((c) => c.confessionId === targetConfessionId)) {
      // The Trending Confessions sidebar ranks purely by engagement, so a
      // clicked confession can be older than whatever pages are currently
      // loaded here. The student can reach it with "Load more" (see
      // loadMore() above), but this effect itself has no way to keep
      // auto-paging until it's found -- there's no endpoint to fetch a
      // single confession by id directly, which would be needed for that.
      // Previously this silently did nothing at all with no explanation
      // (confirmed bug #1184); now it at least tells the student why and
      // points them at "Load more", instead of looking broken.
      setTargetNotFound(true);
      setTargetConfessionId(null);
      return;
    }
    const el = document.getElementById(`confession-${targetConfessionId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedConfessionId(targetConfessionId);
    setTargetConfessionId(null);
    const timer = setTimeout(() => setHighlightedConfessionId(null), 2500);
    return () => clearTimeout(timer);
  }, [loading, confessions, targetConfessionId]);

  useEffect(() => {
    if (!targetNotFound) return;
    const timer = setTimeout(() => setTargetNotFound(false), 4000);
    return () => clearTimeout(timer);
  }, [targetNotFound]);

  // Clicking a Trending Confessions item clears any active category filter
  // (so the target confession can't be hidden by it) and sets the scroll
  // target -- the effect above does the actual scrolling/highlighting once
  // the (re)loaded list contains it.
  function handleTrendingSelect(confessionId: number) {
    setCategory(null);
    setTargetNotFound(false);
    setTargetConfessionId(confessionId);
  }

  function handlePublished(confession: Confession) {
    setConfessions((prev) => [confession, ...(prev ?? [])]);
    setTrendingRefreshKey((k) => k + 1);
  }

  function handleUpdated(updated: Confession) {
    setConfessions((prev) => (prev ?? []).map((c) => (c.confessionId === updated.confessionId ? updated : c)));
    setTrendingRefreshKey((k) => k + 1);
  }

  function handleDeleted(confessionId: number) {
    setConfessions((prev) => (prev ?? []).filter((c) => c.confessionId !== confessionId));
    setDeletedNotice(true);
    setTimeout(() => setDeletedNotice(false), 4000);
    setTrendingRefreshKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col items-start gap-6 lg:flex-row">
      <div className="w-full min-w-0 flex-1 space-y-4 lg:max-w-2xl">
        <WhisperWallBanner headerTheme={headerTheme} />

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

        {targetNotFound ? (
          <div className="rounded-3xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600">
            That confession isn't in the posts loaded here yet -- try Load more below, or switch sort.
          </div>
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
              <ConfessionCard
                key={confession.confessionId}
                confession={confession}
                accessToken={accessToken}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
                highlighted={confession.confessionId === highlightedConfessionId}
              />
            ))}
            {hasMore ? (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-full border border-stone-200 bg-white px-5 py-2 text-sm font-medium text-stone-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <aside className="order-first w-full shrink-0 space-y-4 lg:order-last lg:w-72">
        <TrendingConfessions accessToken={accessToken} onSelect={handleTrendingSelect} refreshKey={trendingRefreshKey} />
      </aside>
    </div>
  );
}
