'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { accessToken } from '../../lib/account/session';
import type { SnipeSharingAction, SnipeSharingPage, SnipeSharingRecord } from '../../lib/snipe-sharing';
import chat from '../../app/messages/messages.module.css';
import styles from './snipe-sharing-permissions.module.css';

// SRS-511.12, 514.1 to 514.7: on the Messages home, the student's own published Snipes (taken by them, or
// approved by them for sharing) with the Remove / Withdraw control they keep even after leaving the
// conversation or after a friendship ends. Metadata only: no photo, link into the conversation, or messages.
// Nothing is loaded until the section is opened; the parent page only renders it for a signed-in student.
const statusLabels: Record<SnipeSharingRecord['status'], string> = { approved: 'Approved', removed: 'Removed' };
const roleLabels: Record<SnipeSharingRecord['role'], string> = {
  photographer: 'You took this Snipe', tagged: 'You were tagged and approved sharing',
};
const actionLabels: Record<SnipeSharingAction, string> = { remove: 'Remove Snipe', withdraw: 'Withdraw sharing permission' };
export const confirmText: Record<SnipeSharingAction, string> = {
  remove: 'Remove this Snipe? The photo will disappear from its original conversation for everyone. This cannot be undone. Points already awarded are kept.',
  withdraw: 'Withdraw your sharing permission? The Snipe will be removed and the photo will disappear from its original conversation for everyone. This cannot be undone. Points already awarded to the photographer are kept.',
};
const when = (iso: string) => new Date(iso).toLocaleDateString([], { dateStyle: 'medium' });
const failure = (error: unknown, fallback: string) =>
  error instanceof TypeError ? 'Connection problem. Check your connection and try again.' : error instanceof Error && error.message ? error.message : fallback;

async function sharingFetch(path: string, init: { method?: string; json?: unknown; signal?: AbortSignal } = {}) {
  const token = await accessToken();
  const headers: Record<string, string> = { Authorization: `Bearer ${token ?? ''}` };
  if (init.json !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, {
    method: init.method ?? 'GET', headers, cache: 'no-store', signal: init.signal,
    body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function fetchSharingPage(before: string | null, signal: AbortSignal): Promise<SnipeSharingPage> {
  const query = before ? `?before=${encodeURIComponent(before)}` : '';
  const { response, data } = await sharingFetch(`/api/snipes/sharing${query}`, { signal });
  if (!response.ok) throw new Error(data.error || 'Your Snipe sharing permissions could not be loaded.');
  return data as SnipeSharingPage;
}

type PageUpdate = (update: (current: SnipeSharingPage | null) => SnipeSharingPage | null) => void;

// Request ordering for the list, kept outside React so it can be tested without a DOM.
// A refresh (open, focus, after a change) replaces the whole list with a fresh first page and its own cursor.
// Older pages loaded earlier are dropped rather than merged: newly published Snipes can push the first page past
// them (merging would skip the IDs in between) and their statuses may be out of date. "Show more" reloads them.
// Each refresh or stop() starts a new generation, so an older request in flight can no longer change the list.
// Both methods resolve false when their result was discarded, and throw only for a still-current request.
export function sharingPager(fetchPage: typeof fetchSharingPage, show: PageUpdate) {
  let generation = 0;
  const controllers = new Set<AbortController>();
  const begin = () => { const c = new AbortController(); controllers.add(c); return c; };
  const settle = async (c: AbortController, from: number, run: () => Promise<SnipeSharingPage>, apply: (page: SnipeSharingPage) => void) => {
    try {
      const page = await run();
      if (from !== generation || c.signal.aborted) return false;
      apply(page);
      return true;
    } catch (error) {
      if (from !== generation || c.signal.aborted) return false;
      throw error;
    } finally { controllers.delete(c); }
  };
  const stop = () => { generation += 1; for (const c of controllers) c.abort(); controllers.clear(); };
  return {
    stop,
    refresh() {
      stop();
      const c = begin();
      return settle(c, generation, () => fetchPage(null, c.signal), (page) => show(() => page));
    },
    more(cursor: string) {
      const c = begin();
      return settle(c, generation, () => fetchPage(cursor, c.signal), (next) => show((current) => current && current.next_cursor === cursor ? {
        records: [...current.records, ...next.records.filter((r) => !current.records.some((existing) => existing.id === r.id))],
        next_cursor: next.next_cursor,
      } : current));
    },
  };
}

export function SnipeSharingPermissions() {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<SnipeSharingPage | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'loaded' | 'failed'>('idle');
  const [loadError, setLoadError] = useState('');
  const [more, setMore] = useState<'idle' | 'loading' | 'failed'>('idle');
  const pager = useRef<ReturnType<typeof sharingPager> | null>(null);
  pager.current ??= sharingPager(fetchSharingPage, setPage);

  // A refresh also cancels any "Show more" in flight, so the button is reset here.
  const load = useCallback(async () => {
    setState((current) => current === 'loaded' ? current : 'loading');
    setMore('idle');
    try {
      if (await pager.current!.refresh()) { setState('loaded'); setLoadError(''); }
    } catch (error) {
      setState((current) => current === 'loaded' ? current : 'failed');
      setLoadError(failure(error, 'Your Snipe sharing permissions could not be loaded.'));
    }
  }, []);

  // Load when opened and refresh when the student comes back to the tab. Statuses can still change in between;
  // every action is authorized again by the server against the live record. Closing or unmounting cancels
  // every request in flight.
  useEffect(() => {
    if (!open) return;
    const current = pager.current!;
    void load();
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      current.stop();
    };
  }, [open, load]);

  async function loadMore() {
    const cursor = page?.next_cursor;
    if (!cursor || more === 'loading') return;
    setMore('loading');
    try {
      if (await pager.current!.more(cursor)) setMore('idle');
    } catch { setMore('failed'); }
  }

  const replace = useCallback((record: SnipeSharingRecord) => {
    setPage((current) => current && { ...current, records: current.records.map((r) => r.id === record.id ? record : r) });
  }, []);

  return (
    <section className={styles.panel} aria-label="Your Snipe sharing permissions">
      <button type="button" className={styles.toggle} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
        Your Snipe sharing permissions
        <span className={styles.chevron} aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div id={panelId} className={styles.body}>
          <p className={styles.note}>Published Snipes you took or approved for sharing. You can remove one here even after leaving its conversation or after a friendship ends. Photos and messages are not shown here.</p>
          {state === 'loading' && <p className={styles.muted} role="status">Loading your Snipe sharing permissions…</p>}
          {state === 'failed' && (
            <p className={chat.error} role="alert">{loadError} <button type="button" className={chat.retry} onClick={() => void load()}>Try again</button></p>
          )}
          {state === 'loaded' && page && (
            <>
              {loadError && (
                <p className={chat.error} role="alert">Couldn’t refresh. <button type="button" className={chat.retry} onClick={() => void load()}>Retry</button></p>
              )}
              {page.records.length === 0
                ? <p className={styles.muted}>You have no published Snipes to manage.</p>
                : <ul className={styles.records}>{page.records.map((record) => (
                    <li key={record.id}><SharingRecordItem record={record} onChange={replace} onStale={() => void load()} /></li>
                  ))}</ul>}
              {page.next_cursor && (
                <div className={styles.more}>
                  <button type="button" className={styles.secondary} disabled={more === 'loading'} onClick={() => void loadMore()}>
                    {more === 'loading' ? 'Loading…' : 'Show more'}
                  </button>
                  {more === 'failed' && <p className={chat.error} role="alert">More Snipes couldn’t be loaded. Try again.</p>}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

// Holds the confirmation and request state for one record; the markup is in SnipeSharingRecordView.
function SharingRecordItem({ record, onChange, onStale }: {
  record: SnipeSharingRecord; onChange: (record: SnipeSharingRecord) => void; onStale: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // The change is not canceled if the record leaves the list (refresh, closed panel); the server applies it
  // either way. Only the follow-up refresh is skipped, so a closed panel makes no further requests.
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  async function confirm() {
    if (!record.action || busy) return;
    setBusy(true); setError('');
    try {
      const { response, data } = await sharingFetch(`/api/snipes/sharing/${encodeURIComponent(record.id)}`, { method: 'PATCH', json: { action: record.action } });
      if (!mounted.current) return;
      if (response.status === 404) { setError('This Snipe is no longer available to you.'); onStale(); return; }
      if (!response.ok) throw new Error(data.error || 'That change could not be saved.');
      setConfirming(false);
      onChange(data.snipe as SnipeSharingRecord);
      onStale();
    } catch (failed) {
      // Retrying is safe: a repeat returns the stored state and changes nothing.
      if (mounted.current) setError(failure(failed, 'That change could not be saved.'));
    } finally { if (mounted.current) setBusy(false); }
  }

  return <SnipeSharingRecordView record={record} confirming={confirming} busy={busy} error={error}
    onStart={() => { setError(''); setConfirming(true); }} onCancel={() => { setError(''); setConfirming(false); }} onConfirm={() => void confirm()} />;
}

// Presentational record: role, date, status, the student's own permission and the one available control.
export function SnipeSharingRecordView({ record, confirming, busy, error, onStart, onCancel, onConfirm }: {
  record: SnipeSharingRecord; confirming: boolean; busy: boolean; error: string;
  onStart: () => void; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <article className={styles.record}>
      <div className={styles.recordHeader}>
        <strong>Original conversation</strong>
        <span className={`${styles.badge} ${styles[record.status]}`}>{statusLabels[record.status]}</span>
      </div>
      <p className={styles.muted}>{roleLabels[record.role]} · Published {when(record.published_at)}</p>
      {record.sharing && (
        <p className={styles.muted}>Your sharing permission: {record.sharing === 'withdrawn' ? 'Withdrawn' : 'Approved'}</p>
      )}
      {record.status === 'removed' && <p className={styles.muted}>This Snipe was removed and its photo is no longer shown.</p>}
      {record.action && (confirming ? (
        <div className={styles.confirm} role="group" aria-label="Confirm">
          <p className={styles.tight}>{confirmText[record.action]}</p>
          {error && <p className={chat.error} role="alert">{error}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.danger} disabled={busy} onClick={onConfirm}>{busy ? 'Saving…' : error ? 'Try again' : 'Confirm'}</button>
            <button type="button" className={styles.secondary} disabled={busy} onClick={onCancel}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onStart}>{actionLabels[record.action]}</button>
        </div>
      ))}
    </article>
  );
}
