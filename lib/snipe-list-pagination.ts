// SRS-512.1, 512.3, 512.11: request ordering for a conversation's Snipe list, kept outside React so it can be
// tested without a DOM. Safe for client components (no server imports).
//
// The server returns the newest 50 visible requests and `next_cursor` (the last returned Snipe ID) only when an
// older visible request exists. "Show older" asks for the page after that cursor and appends it.
// A fresh first page (opening, an unpaused poll, Refresh, after a submission or a change) replaces the whole list,
// including its metadata and cursor. Older pages loaded earlier are dropped rather than merged: newer requests can
// push the first page past them (merging would skip the requests in between) and their states may be out of date.
// Each fresh first page and stop() starts a new generation, so a request from before it can no longer change the
// list. Both methods resolve false when their result was discarded, and throw only for a still-current request.
// Automatic updates (poll) never replace the list while older pages are shown or loading, so a card the student is
// answering stays on screen; an explicit refresh() still replaces it.
export type SnipeListPage = { snipes: { id: string }[]; next_cursor?: string | null };
export type SnipeListFetch<P extends SnipeListPage> = (before: string | null, signal: AbortSignal) => Promise<P>;
export type SnipeListUpdate<P extends SnipeListPage> = (update: (current: P | null) => P | null) => void;

// A refused list request. 404 means the student is no longer a participant: the caller hides the list.
export class SnipeListRequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export function snipeListPager<P extends SnipeListPage>(fetchPage: SnipeListFetch<P>, show: SnipeListUpdate<P>) {
  let generation = 0;
  let first: AbortController | null = null;
  // Older pages were appended to the current first page.
  let extended = false;
  // The cursor of the list last applied by this pager, so a page is only counted as appended when it really was
  // (show() may run its update later, as React's setState does).
  let cursor: string | null = null;
  const older = new Set<AbortController>();
  const abortOlder = () => { for (const c of older) c.abort(); older.clear(); };
  const settle = async (c: AbortController, from: number, run: () => Promise<P>, apply: (page: P) => void) => {
    try {
      const page = await run();
      if (from !== generation || c.signal.aborted) return false;
      apply(page);
      return true;
    } catch (error) {
      if (from !== generation || c.signal.aborted) return false;
      throw error;
    }
  };
  const paused = () => extended || older.size > 0;
  const refresh = () => {
    generation += 1; first?.abort(); abortOlder();
    const c = new AbortController();
    first = c;
    // Applying the first page also drops any "Show older" started from the list it replaces.
    return settle(c, generation, () => fetchPage(null, c.signal), (page) => { abortOlder(); extended = false; cursor = page.next_cursor ?? null; show(() => page); })
      .finally(() => { if (first === c) first = null; });
  };
  return {
    // A first page is in flight (polls skip instead of replacing it).
    get loading() { return first !== null; },
    // Older pages are shown (reopening the panel then starts from a fresh first page).
    get extended() { return extended; },
    // Older pages are shown or loading: automatic updates are paused until the next fresh first page.
    get paused() { return paused(); },
    // Unmounted, denied or another conversation: nothing in flight may change the list any more.
    stop() { generation += 1; first?.abort(); first = null; abortOlder(); extended = false; cursor = null; },
    // Panel closed: "Show older" requests are dropped; a first page in flight still completes as before.
    cancelOlder: abortOlder,
    refresh,
    // An automatic update (interval or tab becoming visible): null, with no request, while a first page is in
    // flight or older pages are shown or loading; otherwise the same as refresh().
    poll: () => first !== null || paused() ? null : refresh(),
    older(before: string) {
      const c = new AbortController();
      older.add(c);
      // Only the Snipes are appended: student, kind, rewards and targets stay those of the current first page.
      // The page is applied only to the list whose cursor requested it, so a repeat never appends twice and a
      // page that no longer matches neither changes the list nor marks it extended.
      // Each ID is shown once: anything already shown or repeated within the page is skipped, keeping the order.
      return settle(c, generation, () => fetchPage(before, c.signal), (next) => {
        if (cursor !== before) return;
        extended = true;
        cursor = next.next_cursor ?? null;
        show((current) => {
          if (!current || current.next_cursor !== before) return current;
          const seen = new Set(current.snipes.map((s) => s.id));
          const added = next.snipes.filter((s) => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
          return { ...current, snipes: [...current.snipes, ...added], next_cursor: next.next_cursor ?? null };
        });
      }).finally(() => { older.delete(c); });
    },
  };
}
