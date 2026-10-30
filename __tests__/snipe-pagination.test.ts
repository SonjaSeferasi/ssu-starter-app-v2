import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };
import { describe, expect, it } from 'vitest';
import { SnipeOlderControl, SnipePanel } from '../components/snipe/snipe-panel';
import { SnipeListRequestError, snipeListPager } from '../lib/snipe-list-pagination';

// SRS-512.1, 512.3, 512.11: the conversation Snipe list's "Show older Snipes" control (static renders) and its
// request ordering (snipeListPager, driven against a fake server whose responses the test releases one at a time).
// No DOM clicks or browser run here; the cursor's authorization is covered by the API and database tests.
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const buttons = (html: string) => [...html.matchAll(/<button([^>]*)>([^<]*)<\/button>/g)].map((m) => ({ label: m[2], disabled: m[1].includes('disabled=""') }));
const noop = () => {};
const control = (props: { cursor?: string | null; state?: 'idle' | 'loading' | 'failed'; error?: string }) =>
  renderToStaticMarkup(createElement(SnipeOlderControl, { state: 'idle', error: '', onLoad: noop, ...props }));

describe('Show older Snipes control (SRS-512.11)', () => {
  it('is absent without a cursor (no older visible request, or a server that predates pagination)', () => {
    expect(control({ cursor: undefined })).toBe('');
    expect(control({ cursor: null })).toBe('');
    expect(control({ cursor: null, state: 'failed', error: 'x' })).toBe('');
  });

  it('offers one enabled button after the cards when an older visible request exists, with no counts', () => {
    const html = control({ cursor: '41' });
    expect(buttons(html)).toEqual([{ label: 'Show older Snipes', disabled: false }]);
    expect(html).not.toContain('role="alert"');
    // Nothing about how many requests exist or are hidden, and the cursor itself is not shown.
    expect(text(html)).toBe('Show older Snipes');
  });

  it('is disabled and busy while loading, and offers Try again with an alert after a failure', () => {
    const loading = control({ cursor: '41', state: 'loading' });
    expect(buttons(loading)).toEqual([{ label: 'Loading older Snipes…', disabled: true }]);
    expect(loading).toContain('aria-busy="true"');
    const failed = control({ cursor: '41', state: 'failed', error: 'Connection problem. Check your connection and try again.' });
    expect(buttons(failed)).toEqual([{ label: 'Try again', disabled: false }]);
    expect(failed).toContain('role="alert"');
    expect(text(failed)).toContain('Connection problem. Check your connection and try again.');
    expect(text(control({ cursor: '41', state: 'failed' }))).toContain('Older Snipes could not be loaded.');
  });

  it('keeps the panel collapsed on first render: only the toggle, no list or older control yet', () => {
    const html = renderToStaticMarkup(createElement(SnipePanel, { conversationId: '7' }));
    expect(text(html)).toBe('Snipe ▾');
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).not.toContain('Show older');
  });
});

type Row = { id: string; status: 'pending' | 'approved'; visible: boolean };
type Page = { student_id: string; kind: 'private' | 'group'; rewards: { points_per_friend: number; balance: number }; targets: { id: string }[];
  snipes: Row[]; next_cursor?: string | null };
type Meta = Omit<Page, 'snipes' | 'next_cursor'>;
type Call = { before: string | null; signal: AbortSignal; release: () => void; resolveWith: (page: Page) => void; fail: (error: Error) => void };

describe('Snipe list paging and refresh ordering (SRS-512.1, 512.3, 512.11)', () => {
  // A fake server with the database's rules: rows newest first, visibility applied before the 50-row limit,
  // the cursor is the last returned ID and a page continues strictly after that row's stored position.
  function setup(rows: Row[]) {
    let data = rows;
    let meta: Meta = { student_id: '1', kind: 'group', rewards: { points_per_friend: 25, balance: 0 }, targets: [{ id: '2' }] };
    const calls: Call[] = [];
    const respond = (before: string | null): Page => {
      const visible = data.filter((r) => r.visible);
      const start = before === null ? 0 : visible.findIndex((r) => r.id === before) + 1;
      if (before !== null && start === 0) throw new SnipeListRequestError('These Snipes could not be loaded. Refresh and try again.', 400);
      const rest = visible.slice(start);
      return { ...meta, snipes: rest.slice(0, 50), next_cursor: rest.length > 50 ? rest[49].id : null };
    };
    const fetchPage = (before: string | null, signal: AbortSignal) => new Promise<Page>((resolve, reject) => {
      calls.push({ before, signal, release: () => { try { resolve(respond(before)); } catch (e) { reject(e); } }, resolveWith: resolve, fail: reject });
    });
    let shown: Page | null = null;
    const pager = snipeListPager(fetchPage, (update) => { shown = update(shown); });
    return {
      pager, calls,
      shown: () => shown,
      ids: () => shown!.snipes.map((s) => s.id),
      last: () => calls[calls.length - 1],
      publish: (from: number, to: number) => { data = [...ids(from, to).map((id): Row => ({ id: String(id), status: 'approved', visible: true })), ...data]; },
      meta: () => meta,
      setMeta: (next: Partial<Meta>) => { meta = { ...meta, ...next }; },
    };
  }
  // Newest first: from, from - 1, ..., to.
  const ids = (from: number, to: number) => Array.from({ length: from - to + 1 }, (_, n) => from - n);
  const strings = (from: number, to: number) => ids(from, to).map(String);
  // 51 visible requests (100..50) with requests hidden from this student interleaved; 50 is the oldest Pending one.
  const reviewerRows = (): Row[] => ids(100, 50).flatMap((n): Row[] => [
    { id: String(n), status: n === 50 ? 'pending' : 'approved', visible: true },
    ...(n % 7 === 0 ? [{ id: String(n * 1000), status: 'pending' as const, visible: false }] : []),
  ]);

  it('loads the newest 50, then Show older reaches the oldest Pending request, keeping the first page’s metadata', async () => {
    const list = setup(reviewerRows());
    let done = list.pager.refresh();
    expect(list.pager.loading).toBe(true);
    list.last().release();
    expect(await done).toBe(true);
    expect(list.pager.loading).toBe(false);
    expect(list.ids()).toEqual(strings(100, 51));
    expect(list.shown()!.next_cursor).toBe('51');
    expect(list.ids().some((id) => Number(id) >= 1000)).toBe(false);

    // The server's metadata changes before the older page arrives; only the Snipes are appended.
    const firstMeta = { ...list.shown()!, snipes: undefined, next_cursor: undefined };
    list.setMeta({ rewards: { points_per_friend: 30, balance: 500 }, targets: [{ id: '9' }], kind: 'private' });
    done = list.pager.older('51');
    expect(list.last().before).toBe('51');
    list.last().release();
    expect(await done).toBe(true);
    expect(list.ids()).toEqual(strings(100, 50));
    expect(list.shown()!.snipes.at(-1)).toEqual({ id: '50', status: 'pending', visible: true });
    expect(list.shown()!.next_cursor).toBeNull();
    expect({ ...list.shown()!, snipes: undefined, next_cursor: undefined }).toEqual(firstMeta);
    expect(list.calls.map((c) => c.before)).toEqual([null, '51']);
  });

  it('appends each older page once, in order, without duplicate IDs', async () => {
    const list = setup(ids(200, 81).map((n): Row => ({ id: String(n), status: 'pending', visible: true })));
    let done = list.pager.refresh(); list.last().release(); await done;
    // Two clicks with the same cursor: the second result no longer matches the list's cursor and changes nothing.
    const a = list.pager.older('151');
    const b = list.pager.older('151');
    list.calls[1].release(); list.calls[2].release();
    expect(await Promise.all([a, b])).toEqual([true, true]);
    expect(list.ids()).toEqual(strings(200, 101));
    expect(list.shown()!.next_cursor).toBe('101');
    // A page overlapping what is shown (defensive; the keyset cursor never returns one) adds only the new IDs.
    done = list.pager.older('101');
    list.last().resolveWith({ ...list.meta(), snipes: ['101', '100', ...strings(100, 81)].map((id): Row => ({ id, status: 'pending', visible: true })), next_cursor: null });
    await done;
    expect(list.ids()).toEqual(strings(200, 81));
    expect(new Set(list.ids()).size).toBe(120);
    expect(list.shown()!.next_cursor).toBeNull();
  });

  it('does not mark the list extended (or pause updates) for an older page whose cursor no longer matches', async () => {
    const list = setup(reviewerRows());
    let done = list.pager.refresh(); list.last().release(); await done;
    const shownBefore = list.shown();
    done = list.pager.older('60'); list.last().release(); await done;
    expect(list.shown()).toBe(shownBefore);
    expect(list.pager.extended).toBe(false);
    expect(list.pager.paused).toBe(false);
    expect(list.pager.poll()).not.toBeNull();
  });

  it('resets to a fresh first page and its own cursor after more than 50 new Snipes, so nothing is skipped', async () => {
    const list = setup(reviewerRows());
    let done = list.pager.refresh(); list.last().release(); await done;
    done = list.pager.older('51'); list.last().release(); await done;
    expect(list.ids()).toEqual(strings(100, 50));

    // 60 newer Snipes are published before the next poll, manual Refresh or reload.
    list.publish(160, 101);
    done = list.pager.refresh(); list.last().release();
    expect(await done).toBe(true);
    expect(list.ids()).toEqual(strings(160, 111));
    expect(list.shown()!.next_cursor).toBe('111');
    // Paging on from the fresh cursor reaches 110..101, which merging with the old pages would have skipped.
    while (list.shown()!.next_cursor) { done = list.pager.older(list.shown()!.next_cursor!); list.last().release(); expect(await done).toBe(true); }
    expect(list.ids()).toEqual(strings(160, 50));
    expect(new Set(list.ids()).size).toBe(111);
    expect(list.calls.map((c) => c.before)).toEqual([null, '51', null, '111', '61']);
  });

  it('discards a Show older result or failure that arrives after a refresh started', async () => {
    const list = setup(reviewerRows());
    let done = list.pager.refresh(); list.last().release(); await done;
    const older = list.pager.older('51');
    const stale = list.last();
    list.publish(105, 101);
    const refresh = list.pager.refresh();
    expect(stale.signal.aborted).toBe(true);
    list.last().release(); expect(await refresh).toBe(true);
    stale.release();
    expect(await older).toBe(false);
    expect(list.ids()).toEqual(strings(105, 56));
    expect(list.shown()!.next_cursor).toBe('56');
    // A stale failure is discarded too: it never reaches the error message.
    const failing = list.pager.older('56');
    list.pager.refresh();
    list.calls[list.calls.length - 2].fail(new Error('Network'));
    expect(await failing).toBe(false);
  });

  it('drops a Show older started while a first page was loading once that first page replaces the list', async () => {
    const list = setup(reviewerRows());
    let done = list.pager.refresh(); list.last().release(); await done;
    const poll = list.pager.refresh();
    const older = list.pager.older('51');
    const olderCall = list.last();
    list.publish(101, 101);
    list.calls[list.calls.length - 2].release(); expect(await poll).toBe(true);
    expect(olderCall.signal.aborted).toBe(true);
    olderCall.release(); expect(await older).toBe(false);
    expect(list.ids()).toEqual(strings(101, 52));
  });

  it('discards a first page overtaken by a newer one', async () => {
    const list = setup(reviewerRows());
    const first = list.pager.refresh();
    const overtaken = list.last();
    list.publish(101, 101);
    const second = list.pager.refresh();
    expect(overtaken.signal.aborted).toBe(true);
    list.last().release(); expect(await second).toBe(true);
    overtaken.release(); expect(await first).toBe(false);
    expect(list.ids()[0]).toBe('101');
  });

  it('closing cancels Show older but lets a first page in flight finish; stop (unmount, denied, other conversation) drops everything', async () => {
    const list = setup(reviewerRows());
    let done = list.pager.refresh(); list.last().release(); await done;
    const older = list.pager.older('51');
    const olderCall = list.last();
    const poll = list.pager.refresh();
    const pollCall = list.last();
    // Starting the poll already canceled the older page; closing cancels any other older page in flight.
    const older2 = list.pager.older('51');
    list.pager.cancelOlder();
    expect(list.last().signal.aborted).toBe(true);
    expect(pollCall.signal.aborted).toBe(false);
    olderCall.release(); list.last().release(); pollCall.release();
    expect(await Promise.all([older, older2, poll])).toEqual([false, false, true]);
    expect(list.ids()).toEqual(strings(100, 51));

    const shownBefore = list.shown();
    const late = [list.pager.refresh(), list.pager.older('51')];
    list.pager.stop();
    expect(list.pager.loading).toBe(false);
    for (const call of list.calls.slice(-2)) { expect(call.signal.aborted).toBe(true); call.release(); }
    expect(await Promise.all(late)).toEqual([false, false]);
    expect(list.shown()).toBe(shownBefore);
  });

  it('pauses automatic updates while older pages are shown, keeping the old Pending request, until an explicit refresh', async () => {
    const list = setup(reviewerRows());
    let done = list.pager.refresh(); list.last().release(); await done;
    // Not paused yet: an automatic update fetches and replaces the first page as before.
    expect(list.pager.paused).toBe(false);
    const poll = list.pager.poll();
    expect(poll).not.toBeNull();
    list.last().release(); expect(await poll).toBe(true);
    done = list.pager.older('51'); list.last().release(); expect(await done).toBe(true);
    expect(list.pager.paused).toBe(true);
    expect(list.pager.extended).toBe(true);

    // The student is answering the oldest Pending request while newer Snipes arrive and 20 s polls (or the tab
    // becoming visible again) fire: no request is made and the card stays in the list.
    list.publish(110, 101);
    const callsBefore = list.calls.length;
    const shownBefore = list.shown();
    expect(list.pager.poll()).toBeNull();
    expect(list.pager.poll()).toBeNull();
    expect(list.calls.length).toBe(callsBefore);
    expect(list.shown()).toBe(shownBefore);
    expect(list.ids().at(-1)).toBe('50');
    expect(list.shown()!.snipes.at(-1)!.status).toBe('pending');

    // Refresh (or a change, or reopening the panel) still loads a fresh first page, and automatic updates resume.
    done = list.pager.refresh(); list.last().release(); expect(await done).toBe(true);
    expect(list.ids()).toEqual(strings(110, 61));
    expect(list.pager.paused).toBe(false);
    expect(list.pager.extended).toBe(false);
    const resumed = list.pager.poll();
    expect(resumed).not.toBeNull();
    list.last().release(); expect(await resumed).toBe(true);
    expect(list.calls.map((c) => c.before)).toEqual([null, null, '51', null, null]);
  });

  it('pauses automatic updates while Show older is loading, so its page is appended rather than discarded', async () => {
    const list = setup(reviewerRows());
    let done = list.pager.refresh(); list.last().release(); await done;
    const older = list.pager.older('51');
    const olderCall = list.last();
    list.publish(101, 101);
    expect(list.pager.paused).toBe(true);
    expect(list.pager.poll()).toBeNull();
    expect(olderCall.signal.aborted).toBe(false);
    olderCall.release(); expect(await older).toBe(true);
    expect(list.ids()).toEqual(strings(100, 50));

    // A failed Show older leaves nothing appended, so automatic updates resume.
    const fresh = setup(reviewerRows());
    done = fresh.pager.refresh(); fresh.last().release(); await done;
    const failing = fresh.pager.older('51');
    fresh.last().fail(new Error('Network'));
    await expect(failing).rejects.toThrow('Network');
    expect(fresh.pager.paused).toBe(false);
    expect(fresh.pager.poll()).not.toBeNull();
  });

  it('skips an automatic update while a first page is in flight, and closing or stop clear the pause as they should', async () => {
    const list = setup(reviewerRows());
    const first = list.pager.refresh();
    expect(list.pager.poll()).toBeNull();
    expect(list.calls.length).toBe(1);
    list.last().release(); await first;

    // Closing during Show older cancels it and nothing was appended: automatic updates resume on reopening.
    list.pager.older('51');
    list.pager.cancelOlder();
    expect(list.pager.paused).toBe(false);
    // Closing after older pages were shown keeps them marked, so reopening loads a fresh first page.
    const older = list.pager.older('51'); list.last().release(); await older;
    list.pager.cancelOlder();
    expect(list.pager.extended).toBe(true);
    expect(list.pager.poll()).toBeNull();
    // stop (membership loss, unmount, another conversation) leaves nothing paused or in flight.
    list.pager.stop();
    expect(list.pager.paused).toBe(false);
    expect(list.pager.loading).toBe(false);
  });

  it('keeps one conversation’s late results out of another conversation’s list', async () => {
    // The panel keeps one pager per conversation and stops the previous one when the conversation changes.
    let shown: Page | null = null;
    const show = (update: (current: Page | null) => Page | null) => { shown = update(shown); };
    const pending: { conversation: string; resolve: (page: Page) => void }[] = [];
    const pagerFor = (conversation: string) => snipeListPager<Page>((before) => new Promise((resolve) => pending.push({ conversation, resolve })), show);
    const pageOf = (conversation: string, next: string | null): Page => ({ student_id: '1', kind: 'group', rewards: { points_per_friend: 25, balance: 0 },
      targets: [], snipes: [{ id: `${conversation}-1`, status: 'pending', visible: true }], next_cursor: next });
    const a = pagerFor('A');
    const first = a.refresh(); pending[0].resolve(pageOf('A', 'A-1')); await first;
    const lateOlder = a.older('A-1');
    const lateFirst = a.refresh();
    a.stop();
    const b = pagerFor('B');
    const bFirst = b.refresh();
    pending[3].resolve(pageOf('B', null)); expect(await bFirst).toBe(true);
    pending[1].resolve(pageOf('A', null)); pending[2].resolve(pageOf('A', null));
    expect(await Promise.all([lateOlder, lateFirst])).toEqual([false, false]);
    expect(shown!.snipes.map((s) => s.id)).toEqual(['B-1']);
  });

  it('reports a current request’s failure (404 membership loss included) to the caller, leaving the list as it was', async () => {
    const list = setup(reviewerRows());
    let done = list.pager.refresh(); list.last().release(); await done;
    const shownBefore = list.shown();
    const older = list.pager.older('51');
    list.last().fail(new SnipeListRequestError('Conversation not available.', 404));
    const error = await older.then(() => null, (e) => e);
    expect(error).toBeInstanceOf(SnipeListRequestError);
    expect(error.status).toBe(404);
    expect(list.shown()).toBe(shownBefore);
    done = list.pager.refresh();
    list.last().fail(new Error('Snipes could not be loaded.'));
    await expect(done).rejects.toThrow('could not be loaded');
    expect(list.pager.loading).toBe(false);
    // An unknown or hidden cursor is refused by the server; the fake mirrors that and the caller sees the error.
    const hidden = list.pager.older('98000');
    list.last().release();
    await expect(hidden).rejects.toThrow('Refresh and try again');
  });
});
