import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };
import { describe, expect, it } from 'vitest';
import { SnipeSharingPermissions, SnipeSharingRecordView, confirmText, sharingPager } from '../components/snipe/snipe-sharing-permissions';
import type { SnipeSharingPage, SnipeSharingRecord } from '../lib/snipe-sharing';

// SRS-511.12, 514.1 to 514.7: static renders of the Messages-home sharing permissions. The record view is
// presentational, so each role and status can be checked exactly. The list's refresh and paging order is tested
// through sharingPager; authorization and the actions themselves are covered by the API and database tests.
const base: SnipeSharingRecord = { id: '41', status: 'approved', role: 'photographer', submitted_at: '2026-10-29T12:00:00Z',
  published_at: '2026-10-29T13:00:00Z', sharing: null, action: 'remove' };
const tagged: SnipeSharingRecord = { ...base, id: '42', role: 'tagged', sharing: 'approved', action: 'withdraw' };
const noop = () => {};
const view = (record: SnipeSharingRecord, options: { confirming?: boolean; busy?: boolean; error?: string } = {}) => renderToStaticMarkup(
  createElement(SnipeSharingRecordView, { record, confirming: false, busy: false, error: '', onStart: noop, onCancel: noop, onConfirm: noop, ...options }));
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, '\'').replace(/\s+/g, ' ').trim();
const buttons = (html: string) => [...html.matchAll(/<button[^>]*>([^<]*)<\/button>/g)].map((m) => m[1]);
// Nothing that could show a photo, link into a conversation or name another person.
const leaks = /<img|<a |href=|blob:|snipe\/|\/messages\/|\/api\/|conversation_id|storage|Dorm Student/i;

describe('Snipe sharing permissions (SRS-511.12, 514.1)', () => {
  it('starts collapsed with only the expandable heading, and loads nothing until opened', () => {
    const html = renderToStaticMarkup(createElement(SnipeSharingPermissions));
    expect(text(html)).toBe('Your Snipe sharing permissions ▾');
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('Loading');
    expect(html).not.toMatch(leaks);
  });

  it('offers an Approved Snipe’s photographer Remove, with the exact confirmation and Cancel', () => {
    const closed = view(base);
    expect(text(closed)).toContain('Original conversation');
    expect(text(closed)).toContain('Approved');
    expect(text(closed)).toContain('You took this Snipe');
    expect(text(closed)).toContain(`Published ${new Date(base.published_at).toLocaleDateString([], { dateStyle: 'medium' })}`);
    expect(text(closed)).not.toContain('Your sharing permission');
    expect(buttons(closed)).toEqual(['Remove Snipe']);

    const confirming = view(base, { confirming: true });
    expect(text(confirming)).toContain('Remove this Snipe? The photo will disappear from its original conversation for everyone. This cannot be undone. Points already awarded are kept.');
    expect(confirmText.remove).toContain('Points already awarded are kept.');
    expect(buttons(confirming)).toEqual(['Confirm', 'Cancel']);
    expect(confirming).toContain('role="group"');
    for (const html of [closed, confirming]) expect(html).not.toMatch(leaks);
  });

  it('offers an Approved Snipe’s tagged friend Withdraw sharing permission, with its own exact confirmation', () => {
    const closed = view(tagged);
    expect(text(closed)).toContain('You were tagged and approved sharing');
    expect(text(closed)).toContain('Your sharing permission: Approved');
    expect(buttons(closed)).toEqual(['Withdraw sharing permission']);

    const confirming = view(tagged, { confirming: true });
    expect(text(confirming)).toContain('Withdraw your sharing permission? The Snipe will be removed and the photo will disappear from its original conversation for everyone. This cannot be undone. Points already awarded to the photographer are kept.');
    expect(buttons(confirming)).toEqual(['Confirm', 'Cancel']);
    for (const html of [closed, confirming]) expect(html).not.toMatch(leaks);
  });

  it('disables both buttons while saving and offers Try again after a failure', () => {
    const saving = view(tagged, { confirming: true, busy: true });
    expect(buttons(saving)).toEqual(['Saving…', 'Cancel']);
    expect(saving.match(/<button[^>]*disabled=""/g)).toHaveLength(2);
    const failed = view(tagged, { confirming: true, error: 'Connection problem. Check your connection and try again.' });
    expect(text(failed)).toContain('Connection problem.');
    expect(failed).toContain('role="alert"');
    expect(buttons(failed)).toEqual(['Try again', 'Cancel']);
  });

  it('shows Removed records with their status and no action, for both roles', () => {
    for (const record of [{ ...base, status: 'removed', action: null }, { ...tagged, status: 'removed', sharing: 'withdrawn', action: null },
      { ...tagged, status: 'removed', action: null }] as SnipeSharingRecord[]) {
      const html = view(record, { confirming: true });
      expect(text(html)).toContain('Removed');
      expect(text(html)).toContain('This Snipe was removed and its photo is no longer shown.');
      expect(buttons(html)).toEqual([]);
      expect(html).not.toContain('Confirm');
      expect(html).not.toMatch(leaks);
    }
    expect(text(view({ ...tagged, status: 'removed', sharing: 'withdrawn', action: null }))).toContain('Your sharing permission: Withdrawn');
  });

});

// The list's request ordering, driven against a fake server whose responses the test releases one at a time.
describe('Snipe sharing permissions list refresh and paging', () => {
  type Call = { before: string | null; signal: AbortSignal; release: () => void; fail: (error: Error) => void };
  function setup(ids: number[]) {
    // Server data, newest first; 20 per page with the last ID as the cursor, as the database returns it.
    let rows: SnipeSharingRecord[] = ids.map((id) => ({ ...base, id: String(id) }));
    const calls: Call[] = [];
    const respond = (before: string | null): SnipeSharingPage => {
      const older = rows.filter((r) => before === null || Number(r.id) < Number(before));
      return { records: older.slice(0, 20), next_cursor: older.length > 20 ? older[19].id : null };
    };
    const fetchPage = (before: string | null, signal: AbortSignal) => new Promise<SnipeSharingPage>((resolve, reject) => {
      calls.push({ before, signal, release: () => resolve(respond(before)), fail: reject });
    });
    let page: SnipeSharingPage | null = null;
    const pager = sharingPager(fetchPage, (update) => { page = update(page); });
    return {
      pager, calls,
      shown: () => page,
      ids: () => page!.records.map((r) => Number(r.id)),
      publish: (from: number, to: number) => { rows = [...range(from, to).map((id) => ({ ...base, id: String(id) })), ...rows]; },
      removeOnServer: (id: number) => { rows = rows.map((r): SnipeSharingRecord => r.id === String(id) ? { ...r, status: 'removed', action: null } : r); },
    };
  }
  const range = (from: number, to: number) => Array.from({ length: from - to + 1 }, (_, n) => from - n);
  const last = (calls: Call[]) => calls[calls.length - 1];

  it('replaces loaded older pages with a fresh first page and its own cursor, so no IDs are skipped and no stale record stays', async () => {
    const list = setup(range(100, 41));
    let done = list.pager.refresh(); last(list.calls).release();
    expect(await done).toBe(true);
    done = list.pager.more(list.shown()!.next_cursor!); last(list.calls).release();
    expect(await done).toBe(true);
    expect(list.ids()).toEqual(range(100, 61));
    expect(list.shown()!.next_cursor).toBe('61');

    // While the tab is away: 30 newer Snipes are published, and another original actor removes the older Snipe 70.
    list.publish(130, 101);
    list.removeOnServer(70);
    done = list.pager.refresh(); last(list.calls).release();
    expect(await done).toBe(true);
    // Only the fresh first page and its cursor remain: the loaded 100..61 (with the stale Approved 70) is gone.
    expect(list.ids()).toEqual(range(130, 111));
    expect(list.shown()!.next_cursor).toBe('111');
    expect(list.calls.map((c) => c.before)).toEqual([null, '81', null]);

    // Paging on from the fresh cursor reaches 110..101, which a merge with the old pages would have skipped,
    // and reloads 70 with its current status.
    for (let n = 0; n < 4; n++) { done = list.pager.more(list.shown()!.next_cursor!); last(list.calls).release(); expect(await done).toBe(true); }
    expect(list.ids()).toEqual(range(130, 41));
    expect(new Set(list.ids()).size).toBe(90);
    expect(list.shown()!.records.find((r) => r.id === '70')).toMatchObject({ status: 'removed', action: null });
    expect(list.shown()!.next_cursor).toBeNull();
  });

  it('discards a Show more that is still in flight when a refresh starts, even if it answers later', async () => {
    const list = setup(range(60, 1));
    let done = list.pager.refresh(); last(list.calls).release(); await done;
    const more = list.pager.more('41');
    const stale = last(list.calls);
    list.publish(80, 61);
    const refresh = list.pager.refresh();
    expect(stale.signal.aborted).toBe(true);
    last(list.calls).release(); expect(await refresh).toBe(true);
    stale.release();
    expect(await more).toBe(false);
    expect(list.ids()).toEqual(range(80, 61));
    expect(list.shown()!.next_cursor).toBe('61');
    // A stale failure is discarded too; it does not reach the error message.
    const failing = list.pager.more('61');
    list.pager.refresh();
    list.calls[list.calls.length - 2].fail(new Error('Network'));
    expect(await failing).toBe(false);
  });

  it('discards a refresh that is overtaken by a newer refresh', async () => {
    const list = setup(range(5, 1));
    const first = list.pager.refresh();
    const older = last(list.calls);
    list.publish(6, 6);
    const second = list.pager.refresh();
    expect(older.signal.aborted).toBe(true);
    last(list.calls).release(); expect(await second).toBe(true);
    older.release(); expect(await first).toBe(false);
    expect(list.ids()).toEqual(range(6, 1));
  });

  it('changes nothing after the panel is closed or unmounted (stop), for first pages and Show more alike', async () => {
    const list = setup(range(30, 1));
    let done = list.pager.refresh(); last(list.calls).release(); await done;
    const before = list.shown();
    const more = list.pager.more('11');
    const refresh = list.pager.refresh();
    const failing = list.pager.more('11');
    list.pager.stop();
    for (const call of list.calls.slice(1)) expect(call.signal.aborted).toBe(true);
    list.calls[1].release(); list.calls[2].release(); list.calls[3].fail(new Error('aborted'));
    expect(await Promise.all([more, refresh, failing])).toEqual([false, false, false]);
    expect(list.shown()).toBe(before);
  });

  it('reports a failure of the current request to the caller', async () => {
    const list = setup(range(30, 1));
    const done = list.pager.refresh();
    last(list.calls).fail(new Error('Your Snipe sharing permissions could not be loaded.'));
    await expect(done).rejects.toThrow('could not be loaded');
    expect(list.shown()).toBeNull();
  });
});
