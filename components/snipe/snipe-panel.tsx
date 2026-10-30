'use client';

import { type FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { accessToken } from '../../lib/account/session';
import { SNIPE_PHOTO_POLICY, SNIPE_POLICY_TEXT, isSnipeMimeType } from '../../lib/snipe-policy';
import chat from '../../app/messages/messages.module.css';
import styles from './snipe.module.css';

// UR-510 to UR-514 and UR-525: a private, conversation-only Snipe panel. Pending requests are only
// returned to the photographer and tagged friends, so other members never see a placeholder for them.
// Points come from the shared ledger; only the photographer sees a Snipe's reward result.
// Group members can report a published Snipe (SRS-514.8 to 514.14); direct messages never offer it. Current
// group owners and administrators also get the group's report queue and can remove published Snipes (SRS-514.1,
// 514.10, 514.12, 514.13); the server decides who that is on every request.
type Person = { id: string; name: string; username: string };
type Target = Person & { next_eligible_at: string | null };
type Answers = { identity: boolean | null; sharing: boolean | null; withdrawn: boolean };
type Status = 'pending' | 'approved' | 'rejected' | 'expired' | 'canceled' | 'closed' | 'removed';
// Frozen ledger outcome for a published Snipe; `awarded: false` means no credit was ever recorded for it.
type Reward = { awarded: true; verified_friends: number; points_per_friend: number; points: number; recorded_at: string; balance_after: number }
  | { awarded: false };
// The signed-in student's own stored group report (SRS-514.9); its status shows the administrator's decision.
type Receipt = { id: string; snipe_id: string; reason: string; status: 'unresolved' | 'dismissed' | 'removed' };
export type SnipeView = {
  id: string; status: Status; viewer_role: 'photographer' | 'tagged' | 'member';
  submitted_at: string; expires_at: string; published_at: string | null; terminal_reason: string | null;
  photographer: Person; photo_available: boolean; verified_targets: Person[];
  tags: (Person & Answers)[] | null; my_answers: Answers | null;
  can_answer: boolean; can_withdraw: boolean; can_remove: boolean;
  reward?: Reward | null;
  // Absent only if the server predates group reporting.
  can_report?: boolean; my_report?: Receipt | null;
  // Absent only if the server predates administrator review.
  can_admin_remove?: boolean;
};
// SRS-514.10: one unresolved report as a current manager sees it. `visible` is false for a Snipe published
// before the manager joined: they can decide the report but are never shown its photo.
type QueueReport = { id: string; reason: string; status: Receipt['status']; reporter: Person;
  snipe: { id: string; status: Status; published_at: string | null; photographer: Person; visible: boolean; photo_available: boolean } };
type Decision = 'dismissed' | 'removed';
type Rewards = { points_per_friend: number | null; balance: number };
// `rewards` is absent only if the server predates the rewards migration.
type SnipeList = { student_id: string; kind: 'private' | 'group'; rewards?: Rewards; targets: Target[]; snipes: SnipeView[] };
type Cooldown = { friend: Person; next_eligible_at: string };

const POLL_MS = 20_000;
const REPORT_REASON_MAX = 500;
const reportStatusLabels: Record<Receipt['status'], string> = {
  unresolved: 'Waiting for review by a group administrator', dismissed: 'Reviewed: dismissed', removed: 'Reviewed: Snipe removed',
};
const statusLabels: Record<Status, string> = {
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected', expired: 'Expired', canceled: 'Canceled', closed: 'Closed', removed: 'Removed',
};
const when = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const answerText = (value: boolean | null) => value === null ? 'Not answered' : value ? 'Yes' : 'No';
const points = (n: number) => `${Number(n).toLocaleString()} ${Number(n) === 1 ? 'point' : 'points'}`;
const friends = (n: number) => `${n} verified ${n === 1 ? 'friend' : 'friends'}`;
const failure = (error: unknown, fallback: string) =>
  error instanceof TypeError ? 'Connection problem. Check your connection and try again.' : error instanceof Error && error.message ? error.message : fallback;

async function snipeFetch(path: string, init: { method?: string; body?: BodyInit; json?: unknown; signal?: AbortSignal } = {}) {
  const token = await accessToken();
  const headers: Record<string, string> = { Authorization: `Bearer ${token ?? ''}` };
  if (init.json !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, {
    method: init.method ?? 'GET', headers, cache: 'no-store', signal: init.signal,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

export function SnipePanel({ conversationId }: { conversationId: string }) {
  const base = `/api/conversations/${encodeURIComponent(conversationId)}/snipes`;
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<SnipeList | null>(null);
  const [state, setState] = useState<'loading' | 'loaded' | 'failed' | 'denied'>('loading');
  const [loadError, setLoadError] = useState('');
  // Bumped after every successful list load, so the report queue refreshes with the list (including after
  // a decision, a removal or a role change).
  const [revision, setRevision] = useState(0);
  const inFlight = useRef<AbortController | null>(null);

  // One list request at a time: polls skip while one is running; explicit refreshes replace it.
  const load = useCallback(async (replace = true) => {
    if (inFlight.current && !replace) return;
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    try {
      const { response, data } = await snipeFetch(base, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (response.status === 404) { setState('denied'); return; }
      if (!response.ok) throw new Error(data.error || 'Snipes could not be loaded.');
      setList(data); setState('loaded'); setLoadError(''); setRevision((n) => n + 1);
    } catch (error) {
      if (controller.signal.aborted) return;
      setState((current) => current === 'loaded' ? current : 'failed');
      setLoadError(failure(error, 'Snipes could not be loaded.'));
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, [base]);

  useEffect(() => {
    void load();
    return () => { inFlight.current?.abort(); inFlight.current = null; };
  }, [load]);

  // Modest polling, only while the panel is open and the tab is visible.
  useEffect(() => {
    if (!open) return;
    const refresh = () => { if (document.visibilityState === 'visible') void load(false); };
    const timer = window.setInterval(refresh, POLL_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [open, load]);

  const replaceSnipe = useCallback((snipe: SnipeView | null | undefined) => {
    if (!snipe) return;
    setList((current) => current && { ...current, snipes: current.snipes.some((s) => s.id === snipe.id)
      ? current.snipes.map((s) => s.id === snipe.id ? snipe : s) : [snipe, ...current.snipes] });
  }, []);

  if (state === 'denied') return null;
  const needsMe = list?.snipes.filter((s) => s.can_answer).length ?? 0;

  return (
    <section className={styles.panel} aria-label="Snipe">
      <button type="button" className={styles.toggle} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" /><circle cx="12" cy="13" r="3" /></svg>
        Snipe
        {needsMe > 0 && <span className={styles.count}>{needsMe} to review</span>}
        <span className={styles.chevron} aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div id={panelId} className={styles.body}>
          <p className={styles.note}>Snipes stay in this conversation only. Photographers earn points for each verified friend once a Snipe is published.</p>
          {state === 'loading' && <p className={styles.muted}>Loading Snipes and points…</p>}
          {state === 'failed' && !list && (
            <p className={chat.error} role="alert">{loadError} <button type="button" className={chat.retry} onClick={() => void load()}>Try again</button></p>
          )}
          {list && (
            <>
              {/* SRS-521.1, 521.4: confirmed shared balance; marked as last confirmed when a refresh fails. */}
              {list.rewards && (
                <p className={styles.balance} role="status" aria-live="polite">
                  <span>{loadError ? 'Last confirmed shared balance' : 'Your shared points balance'}</span>
                  <strong>{points(list.rewards.balance)}</strong>
                </p>
              )}
              <Composer base={base} targets={list.targets} pointsPerFriend={list.rewards?.points_per_friend}
                onSubmitted={(snipe) => { replaceSnipe(snipe); void load(); }} />
              {loadError && (
                <p className={chat.error} role="alert">Couldn’t refresh Snipes. <button type="button" className={chat.retry} onClick={() => void load()}>Retry</button></p>
              )}
              {/* SRS-514.14: no report queue in direct messages. */}
              {list.kind === 'group' && <ReportQueue base={base} revision={revision} onDecided={() => void load()} />}
              <div className={styles.listHeading}>
                <h3 className={styles.heading}>Your Snipes here</h3>
                <button type="button" className={chat.retry} onClick={() => void load()}>Refresh</button>
              </div>
              {list.snipes.length === 0
                ? <p className={styles.muted}>No Snipes to show in this conversation yet.</p>
                : <ul className={styles.cards}>{list.snipes.map((snipe) => (
                    <li key={snipe.id}><SnipeCard base={base} snipe={snipe} group={list.kind === 'group'} onChange={replaceSnipe} onReload={() => void load()} /></li>
                  ))}</ul>}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function Composer({ base, targets, pointsPerFriend, onSubmitted }: {
  // null: no current Snipe rule; undefined: the server predates rewards.
  base: string; targets: Target[]; pointsPerFriend?: number | null; onSubmitted: (snipe: SnipeView) => void;
}) {
  const [composing, setComposing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [cooldowns, setCooldowns] = useState<Cooldown[]>([]);
  const [notice, setNotice] = useState('');
  const input = useRef<HTMLInputElement>(null);
  // SRS-510.11: one stable identity per submission. Retrying the same photo and tags reuses it,
  // so a lost response can never create a second request. Any change starts a new submission.
  const submissionKey = useRef<string | null>(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const eligible = targets.filter((t) => !t.next_eligible_at || Date.parse(t.next_eligible_at) <= Date.now());
  const tooLarge = size !== null && (size.width > SNIPE_PHOTO_POLICY.maxWidth || size.height > SNIPE_PHOTO_POLICY.maxHeight);
  const photoProblem = !file ? '' : !isSnipeMimeType(file.type) ? 'Only JPEG and PNG photos are supported.'
    : file.size > SNIPE_PHOTO_POLICY.maxBytes ? 'Photos can be at most 10 MB.'
    : tooLarge ? `Photos can be at most ${SNIPE_PHOTO_POLICY.maxWidth} × ${SNIPE_PHOTO_POLICY.maxHeight} pixels.` : '';

  function reset() {
    submissionKey.current = null; setFile(null); setSize(null); setSelected([]); setError(''); setCooldowns([]);
    if (input.current) input.current.value = '';
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting || !file || selected.length === 0 || photoProblem) return;
    submissionKey.current ??= crypto.randomUUID();
    setSubmitting(true); setError(''); setCooldowns([]); setNotice('');
    try {
      const form = new FormData();
      form.append('photo', file);
      form.append('submissionKey', submissionKey.current);
      for (const id of selected) form.append('target', id);
      const { response, data } = await snipeFetch(base, { method: 'POST', body: form });
      if (!response.ok) {
        if (Array.isArray(data.cooldowns)) setCooldowns(data.cooldowns);
        throw new Error(data.error || 'Your Snipe could not be submitted. Please try again.');
      }
      reset(); setComposing(false);
      setNotice(data.created === false ? 'This Snipe was already submitted.' : 'Snipe submitted. Your tagged friends can now review it privately.');
      onSubmitted(data.snipe);
    } catch (err) {
      setError(err instanceof TypeError
        ? 'Connection problem. Your Snipe may not have been saved. Try again: it will not be submitted twice.'
        : failure(err, 'Your Snipe could not be submitted. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!composing) {
    return (
      <div className={styles.compose}>
        {notice && <p className={styles.success} role="status">{notice}</p>}
        <button type="button" className={chat.newGroup} onClick={() => { setNotice(''); setComposing(true); }}>New Snipe</button>
      </div>
    );
  }

  return (
    <form className={styles.compose} onSubmit={submit} aria-label="New Snipe">
      {/* SRS-528.2: reward, sharing, expiry and cooldown rules before submission. */}
      <div className={styles.rules} role="group" aria-label="Snipe rules">
        {pointsPerFriend !== undefined && <p className={styles.tight}><strong>Rewards: </strong>{pointsPerFriend !== null
          ? `You earn ${points(pointsPerFriend)} for each tagged friend who answers Yes to “Is this you?”, once your Snipe is published. Tagged friends don’t earn points.`
          : 'Snipe rewards are unavailable right now, so Snipes can’t be published until they return.'}</p>}
        <p className={styles.tight}>Every tagged friend must approve sharing, even someone who says it isn’t them. Otherwise nothing is published and no points are awarded.</p>
        <p className={styles.tight}>Requests close after 24 hours if not everyone answers. You can Snipe the same friend once every 24 hours.</p>
      </div>
      <label className={styles.label} htmlFor="snipe-photo">Photo <span className={styles.muted}>({SNIPE_POLICY_TEXT})</span></label>
      <input id="snipe-photo" ref={input} className={styles.file} type="file" accept={SNIPE_PHOTO_POLICY.mimeTypes.join(',')} disabled={submitting}
        onChange={(event) => { submissionKey.current = null; setSize(null); setError(''); setFile(event.target.files?.[0] ?? null); }} />
      {preview && (
        <img className={styles.photo} src={preview} alt="Selected Snipe photo preview"
          onLoad={(event) => setSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} />
      )}
      {photoProblem && <p className={chat.error} role="alert">{photoProblem}</p>}

      <fieldset className={styles.fieldset} disabled={submitting}>
        <legend className={styles.label}>Tag friends in this conversation</legend>
        {targets.length === 0
          ? <p className={styles.muted}>No one here can be tagged. Snipe tags are limited to your current friends who are in this conversation.</p>
          : targets.map((target) => {
              const waiting = Boolean(target.next_eligible_at && Date.parse(target.next_eligible_at) > Date.now());
              return (
                <label key={target.id} className={styles.option}>
                  <input type="checkbox" checked={selected.includes(target.id)} disabled={waiting}
                    onChange={(event) => { submissionKey.current = null; setSelected((current) => event.target.checked ? [...current, target.id] : current.filter((id) => id !== target.id)); }} />
                  <span>{target.name} <span className={styles.muted}>@{target.username}</span>
                    {waiting && <span className={styles.muted}> · available again {when(target.next_eligible_at!)}</span>}</span>
                </label>
              );
            })}
        {targets.length > 0 && eligible.length === 0 && <p className={styles.muted}>Everyone here was Sniped by you in the last 24 hours.</p>}
        {typeof pointsPerFriend === 'number' && selected.length > 0 && (
          <p className={styles.muted} aria-live="polite">Up to {points(selected.length * pointsPerFriend)} if published and {selected.length === 1 ? 'your friend confirms' : `all ${selected.length} confirm`} it’s them.</p>
        )}
      </fieldset>

      {error && (
        <div className={chat.error} role="alert">
          <p className={styles.tight}>{error}</p>
          {cooldowns.map((c) => <p key={c.friend.id} className={styles.tight}>{c.friend.name} can be Sniped again after {when(c.next_eligible_at)}.</p>)}
        </div>
      )}
      <div className={styles.actions}>
        <button type="submit" className={chat.newGroup} disabled={submitting || !file || selected.length === 0 || Boolean(photoProblem)}>
          {submitting ? 'Submitting…' : error ? 'Try again' : 'Submit Snipe'}
        </button>
        <button type="button" className={chat.retry} disabled={submitting} onClick={() => { reset(); setComposing(false); }}>Cancel</button>
      </div>
    </form>
  );
}

function SnipeCard({ base, snipe, group, onChange, onReload }: {
  base: string; snipe: SnipeView; group: boolean; onChange: (snipe: SnipeView) => void; onReload: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<'withdraw' | 'remove' | 'admin-remove' | null>(null);
  const mine = snipe.viewer_role === 'photographer';

  async function act(body: Record<string, unknown>) {
    setBusy(true); setError('');
    try {
      const path = `${base}/${encodeURIComponent(snipe.id)}`;
      // SRS-514.1: a group manager's removal goes through its own route; the server checks the role again.
      const { response, data } = body.action === 'admin-remove'
        ? await snipeFetch(`${path}/admin-removal`, { method: 'POST' })
        : await snipeFetch(path, { method: 'PATCH', json: body });
      if (data.snipe) onChange(data.snipe);
      if (response.status === 403) onReload();
      if (!response.ok) throw new Error(data.error || 'That change could not be saved. Please try again.');
      // A removal can also close reports, so the list and the report queue are refreshed.
      if (body.action !== 'respond') onReload();
      setConfirming(null);
      return true;
    } catch (err) {
      setError(failure(err, 'That change could not be saved. Please try again.'));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={styles.card} aria-label={`Snipe by ${snipe.photographer.name}`}>
      <header className={styles.cardHeader}>
        <strong>{mine ? 'Your Snipe' : `Snipe by ${snipe.photographer.name}`}</strong>
        <span className={`${styles.badge} ${styles[snipe.status] ?? ''}`}>{statusLabels[snipe.status]}</span>
      </header>
      <p className={styles.muted}>Submitted {when(snipe.submitted_at)}{snipe.status === 'pending' && <> · closes {when(snipe.expires_at)} if not everyone answers</>}</p>

      {snipe.photo_available
        ? <SnipePhoto path={`${base}/${encodeURIComponent(snipe.id)}/photo`} alt={`Snipe by ${snipe.photographer.name}`} />
        : snipe.status === 'removed' ? <p className={styles.placeholder}>Snipe removed</p> : null}

      {snipe.status === 'approved' && (
        <p className={styles.tight}>Verified: {snipe.verified_targets.map((p) => p.name).join(', ')}</p>
      )}
      {snipe.terminal_reason && snipe.status !== 'approved' && <p className={styles.reason}>Reason: {snipe.terminal_reason}</p>}
      {mine && <RewardResult snipe={snipe} />}

      {snipe.tags && (
        <ul className={styles.tagList} aria-label="Tagged friends’ answers">
          {snipe.tags.map((tag) => (
            <li key={tag.id}>
              <strong>{tag.name}</strong>: Is this you? {answerText(tag.identity)} · Sharing: {tag.withdrawn ? 'Withdrawn' : answerText(tag.sharing)}
            </li>
          ))}
        </ul>
      )}

      {snipe.can_answer && snipe.my_answers && <AnswerForm answers={snipe.my_answers} busy={busy} onSave={(answer) => act({ action: 'respond', ...answer })} />}

      {(snipe.can_withdraw || snipe.can_remove || snipe.can_admin_remove) && (
        confirming ? (
          <div className={styles.confirm} role="group" aria-label="Confirm">
            <p className={styles.tight}>{confirming === 'remove'
              ? 'Remove this Snipe for everyone in this conversation? This cannot be undone.'
              : confirming === 'admin-remove'
              ? 'Remove this Snipe for everyone in this group as a group administrator? Its photo stops being shown. This cannot be undone.'
              : snipe.status === 'approved'
                ? 'Withdraw your sharing permission? The Snipe will be removed for everyone in this conversation.'
                : 'Withdraw your sharing permission? This cancels the whole Snipe.'}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.danger} disabled={busy} onClick={() => void act({ action: confirming })}>{busy ? 'Saving…' : 'Confirm'}</button>
              <button type="button" className={chat.retry} disabled={busy} onClick={() => setConfirming(null)}>Keep it</button>
            </div>
          </div>
        ) : (
          <div className={styles.actions}>
            {snipe.can_withdraw && <button type="button" className={styles.secondary} onClick={() => setConfirming('withdraw')}>Withdraw sharing permission</button>}
            {snipe.can_remove && <button type="button" className={styles.secondary} onClick={() => setConfirming('remove')}>Remove Snipe</button>}
            {snipe.can_admin_remove && <button type="button" className={styles.secondary} onClick={() => setConfirming('admin-remove')}>Remove as group admin</button>}
          </div>
        )
      )}
      {error && <p className={chat.error} role="alert">{error}</p>}
      {/* SRS-514.14: group reporting is never offered in a direct message. */}
      {group && (snipe.can_report || snipe.my_report) && <SnipeReport base={base} snipe={snipe} onChange={onChange} />}
    </article>
  );
}

// SRS-514.8, 514.9, 514.11: a group member reports a published Snipe with a required reason. The receipt is
// shown only once the server confirms the report is stored, and comes from the stored report, so it is still
// there after a refresh. Reporting never hides the photo; only an authorized removal does.
function SnipeReport({ base, snipe, onChange }: { base: string; snipe: SnipeView; onChange: (snipe: SnipeView) => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const field = useId();
  const opener = useRef<HTMLButtonElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const trimmed = reason.trim();

  useEffect(() => { if (open) textarea.current?.focus(); }, [open]);

  function cancel() {
    setOpen(false); setReason(''); setError('');
    // Return keyboard focus to the control that opened the form.
    window.setTimeout(() => opener.current?.focus(), 0);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending || !trimmed) return;
    setSending(true); setError(''); setNotice('');
    try {
      const { response, data } = await snipeFetch(`${base}/${encodeURIComponent(snipe.id)}/report`, { method: 'POST', json: { reason: trimmed } });
      if (data.snipe) onChange(data.snipe);
      if (!response.ok) throw new Error(data.error || 'Your report could not be sent. Please try again.');
      setOpen(false); setReason('');
      setNotice(data.created ? 'Report received. Thank you.' : 'You already reported this Snipe. Your report is still waiting for review.');
    } catch (err) {
      setError(err instanceof TypeError
        ? 'Connection problem. Your report may not have been sent. Try again: it won’t be sent twice.'
        : failure(err, 'Your report could not be sent. Please try again.'));
    } finally {
      setSending(false);
    }
  }

  const receipt = snipe.my_report;
  // The form closes on its own if the Snipe stops being reportable (for example, a report is already on file).
  const showForm = Boolean(snipe.can_report) && open;
  return (
    <div className={styles.report}>
      {receipt && (
        <div className={styles.receipt} role="status" aria-label="Report receipt">
          {notice && <p className={styles.tight}><strong>{notice}</strong></p>}
          <p className={styles.tight}><strong>You reported this Snipe</strong> · Report #{receipt.id}</p>
          <p className={styles.tight}>Your reason: {receipt.reason}</p>
          <p className={styles.muted}>{reportStatusLabels[receipt.status] ?? receipt.status}. The Snipe stays visible unless it’s removed.</p>
        </div>
      )}
      {error && !showForm && <p className={chat.error} role="alert">{error}</p>}
      {snipe.can_report && !open && (
        <div className={styles.actions}>
          <button type="button" ref={opener} className={styles.secondary} onClick={() => { setNotice(''); setError(''); setOpen(true); }}>Report Snipe</button>
        </div>
      )}
      {showForm && (
        <form className={styles.fieldset} onSubmit={submit} aria-label="Report this Snipe"
          onKeyDown={(event) => { if (event.key === 'Escape' && !sending) cancel(); }}>
          <label className={styles.label} htmlFor={field}>Why are you reporting this Snipe?</label>
          <p className={styles.muted} id={`${field}-help`}>Group administrators will review your report. The Snipe stays visible while it waits for review.</p>
          <textarea id={field} ref={textarea} className={styles.textarea} value={reason} required maxLength={REPORT_REASON_MAX}
            aria-describedby={`${field}-help ${field}-count`} disabled={sending} onChange={(event) => setReason(event.target.value)} />
          <p className={styles.muted} id={`${field}-count`}>{reason.length}/{REPORT_REASON_MAX} characters</p>
          {error && <p className={chat.error} role="alert">{error}</p>}
          <div className={styles.actions}>
            <button type="submit" className={styles.danger} disabled={sending || !trimmed}>
              {sending ? 'Sending report…' : error ? 'Try again' : 'Send report'}
            </button>
            <button type="button" className={chat.retry} disabled={sending} onClick={cancel}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

// SRS-514.10: the group's unresolved reports, shown only to a current owner or administrator. Every request is
// checked by the server; anyone else (including a manager whose role was just revoked) gets a refusal and sees
// nothing here. Refreshed with the Snipe list and after every decision.
function ReportQueue({ base, revision, onDecided }: { base: string; revision: number; onDecided: () => void }) {
  const [reports, setReports] = useState<QueueReport[] | null>(null);
  const [state, setState] = useState<'loading' | 'loaded' | 'failed' | 'hidden'>('loading');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  // Whether the server has confirmed this student manages the group; only then is a load failure shown.
  const [isManager, setIsManager] = useState(false);
  const manager = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => current === 'hidden' ? current : 'loading');
    (async () => {
      try {
        const { response, data } = await snipeFetch(`${base}/reports`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (response.status === 403 || response.status === 404) {
          if (manager.current) setNotice('You’re no longer an owner or administrator of this group, so its reports are hidden.');
          manager.current = false; setIsManager(false); setReports(null); setState('hidden'); return;
        }
        if (!response.ok) throw new Error(data.error || 'Reports could not be loaded.');
        manager.current = true; setIsManager(true); setReports(data.reports); setState('loaded'); setError('');
      } catch (err) {
        if (controller.signal.aborted) return;
        setState('failed'); setError(failure(err, 'Reports could not be loaded.'));
      }
    })();
    return () => controller.abort();
  }, [base, revision, attempt]);

  if (!isManager) {
    return state === 'hidden' && notice ? <p className={styles.muted} role="status">{notice}</p> : null;
  }
  const decided = (message: string) => { setNotice(message); onDecided(); };
  return (
    <section className={styles.queue} aria-label="Reports to review" aria-busy={state === 'loading'}>
      <div className={styles.listHeading}>
        <h3 className={styles.heading}>Reports to review</h3>
        <button type="button" className={chat.retry} disabled={state === 'loading'} onClick={() => { setNotice(''); setAttempt((n) => n + 1); }}>
          {state === 'loading' ? 'Refreshing…' : 'Refresh reports'}
        </button>
      </div>
      <p className={styles.muted}>Only this group’s owner and administrator see this. Reported Snipes stay visible until you remove them.</p>
      {notice && <p className={styles.success} role="status">{notice}</p>}
      {state === 'failed' && (
        <p className={chat.error} role="alert">{error} <button type="button" className={chat.retry} onClick={() => setAttempt((n) => n + 1)}>Try again</button></p>
      )}
      {reports && (reports.length === 0
        ? <p className={styles.muted}>No reports are waiting for review in this group.</p>
        : <ul className={styles.cards}>{reports.map((report) => (
            <li key={report.id}><ReportReview base={base} report={report} onDecided={decided} /></li>
          ))}</ul>)}
    </section>
  );
}

// SRS-514.12, 514.13: resolve one report as Dismissed or Removed. Removal asks for confirmation first and then
// applies the same published removal as the photographer's (photo withdrawn for everyone, points kept).
function ReportReview({ base, report, onDecided }: { base: string; report: QueueReport; onDecided: (message: string) => void }) {
  const [busy, setBusy] = useState<Decision | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [failed, setFailed] = useState<Decision | null>(null);
  const { snipe } = report;
  const removed = snipe.status === 'removed';

  async function decide(decision: Decision) {
    setBusy(decision); setError(''); setFailed(null);
    try {
      const { response, data } = await snipeFetch(`${base}/reports/${encodeURIComponent(report.id)}`, { method: 'PATCH', json: { decision } });
      if (!response.ok) {
        // Already decided, no longer a manager, or gone: refresh so the queue shows the current state.
        if ([403, 404, 409].includes(response.status)) { onDecided(data.error || 'This report changed. The list was refreshed.'); return; }
        throw new Error(data.error || 'That decision could not be saved. Please try again.');
      }
      setConfirming(false);
      onDecided(decision === 'removed' ? `Report #${report.id} resolved: Snipe removed.` : `Report #${report.id} dismissed. The Snipe stays visible.`);
    } catch (err) {
      setFailed(decision);
      setError(err instanceof TypeError
        ? 'Connection problem. Your decision may not have been saved. Try again: it won’t be applied twice.'
        : failure(err, 'That decision could not be saved. Please try again.'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={styles.card} role="group" aria-label={`Report #${report.id}`}>
      <header className={styles.cardHeader}>
        <strong>Report #{report.id}</strong>
        <span className={`${styles.badge} ${styles[snipe.status] ?? ''}`}>{statusLabels[snipe.status]}</span>
      </header>
      <p className={styles.muted}>Snipe by {snipe.photographer.name}{snipe.published_at && <> · published {when(snipe.published_at)}</>}</p>
      <p className={styles.tight}>Reported by <strong>{report.reporter.name}</strong> <span className={styles.muted}>@{report.reporter.username}</span></p>
      <p className={styles.tight}>Reason: {report.reason}</p>
      {snipe.photo_available
        ? <SnipePhoto path={`${base}/${encodeURIComponent(snipe.id)}/photo`} alt={`Reported Snipe by ${snipe.photographer.name}`} />
        : <p className={styles.placeholder}>{removed ? 'Snipe removed' : 'Photo not shown: this Snipe was published before you joined the group.'}</p>}
      {confirming ? (
        <div className={styles.confirm} role="group" aria-label="Confirm removal">
          <p className={styles.tight}>Remove this Snipe for everyone in this group? Its photo stops being shown and this cannot be undone. Points already awarded are kept.</p>
          <div className={styles.actions}>
            <button type="button" className={styles.danger} disabled={busy !== null} onClick={() => void decide('removed')}>
              {busy === 'removed' ? 'Removing…' : failed === 'removed' ? 'Try again' : 'Confirm removal'}
            </button>
            <button type="button" className={chat.retry} disabled={busy !== null} onClick={() => { setConfirming(false); setError(''); }}>Keep it</button>
          </div>
        </div>
      ) : (
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} disabled={busy !== null} onClick={() => void decide('dismissed')}>
            {busy === 'dismissed' ? 'Dismissing…' : failed === 'dismissed' ? 'Try dismissing again' : 'Dismiss report'}
          </button>
          {removed
            // Already removed by someone else: recording the decision changes nothing else, so no confirmation.
            ? <button type="button" className={styles.secondary} disabled={busy !== null} onClick={() => void decide('removed')}>
                {busy === 'removed' ? 'Saving…' : 'Resolve as removed'}
              </button>
            : <button type="button" className={styles.secondary} disabled={busy !== null} onClick={() => { setError(''); setConfirming(true); }}>Remove Snipe</button>}
        </div>
      )}
      {error && <p className={chat.error} role="alert">{error}</p>}
    </div>
  );
}

// SRS-525.6, 524.4, 527.7: the photographer's confirmed reward, read from the ledger entry written at
// publication. It never changes later, including after removal. A published Snipe with no entry (approved
// before rewards started) is shown as not awarded; nothing is credited by viewing it.
function RewardResult({ snipe }: { snipe: SnipeView }) {
  if (snipe.status === 'pending') return null;
  if (snipe.status !== 'approved' && snipe.status !== 'removed') return <p className={styles.reason}>No points: this Snipe was not published.</p>;
  const reward = snipe.reward;
  if (!reward?.awarded) return <p className={styles.reason}>Not awarded: no reward was recorded for this Snipe. Snipes published before rewards started don’t earn points.</p>;
  return (
    <div className={styles.reward} role="group" aria-label="Snipe reward">
      <p className={styles.tight}><strong>Reward: {points(reward.points)}</strong></p>
      <p className={styles.tight}>{friends(reward.verified_friends)} × {points(reward.points_per_friend)} per friend = {points(reward.points)}</p>
      <p className={styles.muted}>Added to your shared balance on {when(reward.recorded_at)} (balance then: {points(reward.balance_after)}).
        {snipe.status === 'removed' && ' Removing a Snipe doesn’t take its points back.'}</p>
    </div>
  );
}

// SRS-511.2 to 511.4: two independent questions with no preselected answer; saving one never answers the other.
function AnswerForm({ answers, busy, onSave }: { answers: Answers; busy: boolean; onSave: (answer: Record<string, boolean>) => Promise<boolean> }) {
  const questions = [
    { key: 'identity' as const, text: 'Is this you?' },
    { key: 'sharing' as const, text: 'Do you approve sharing this photo in this conversation?' },
  ];
  return (
    <div className={styles.answers}>
      {questions.map((question) => answers[question.key] === null
        ? <Question key={question.key} name={question.key} text={question.text} busy={busy} onSave={(value) => onSave({ [question.key]: value })} />
        : <p key={question.key} className={styles.tight}>{question.text} <strong>{answerText(answers[question.key])}</strong></p>)}
    </div>
  );
}

function Question({ name, text, busy, onSave }: { name: string; text: string; busy: boolean; onSave: (value: boolean) => Promise<boolean> }) {
  const [choice, setChoice] = useState<'' | 'yes' | 'no'>('');
  const group = useId();
  return (
    <form className={styles.question} onSubmit={(event) => { event.preventDefault(); if (choice) void onSave(choice === 'yes'); }}>
      <fieldset className={styles.fieldset} disabled={busy}>
        <legend className={styles.label}>{text}</legend>
        <div className={styles.choices}>
          {(['yes', 'no'] as const).map((value) => (
            <label key={value} className={styles.option}>
              <input type="radio" name={`${group}-${name}`} value={value} checked={choice === value} onChange={() => setChoice(value)} />
              {value === 'yes' ? 'Yes' : 'No'}
            </label>
          ))}
          <button type="submit" className={styles.secondary} disabled={!choice}>Save answer</button>
        </div>
      </fieldset>
    </form>
  );
}

// Private photos are fetched with the bearer token and shown from a short-lived blob URL; the
// object URL is revoked when the photo is no longer allowed or the card goes away.
function SnipePhoto({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setFailed(false);
    (async () => {
      try {
        const token = await accessToken();
        const response = await fetch(path, { headers: { Authorization: `Bearer ${token ?? ''}` }, cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error();
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    })();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); setUrl(null); };
  }, [path, attempt]);
  if (failed) return <p className={styles.placeholder}>Photo unavailable. <button type="button" className={chat.retry} onClick={() => setAttempt((n) => n + 1)}>Retry</button></p>;
  return url ? <img className={styles.photo} src={url} alt={alt} /> : <p className={styles.placeholder}>Loading photo…</p>;
}
