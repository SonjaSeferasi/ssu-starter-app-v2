'use client';

import { type FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { accessToken } from '../../lib/account/session';
import { SNIPE_PHOTO_POLICY, SNIPE_POLICY_TEXT, isSnipeMimeType } from '../../lib/snipe-policy';
import chat from '../../app/messages/messages.module.css';
import styles from './snipe.module.css';

// UR-510 to UR-514 (basic slice): a private, conversation-only Snipe panel. Pending requests are only
// returned to the photographer and tagged friends, so other members never see a placeholder for them.
type Person = { id: string; name: string; username: string };
type Target = Person & { next_eligible_at: string | null };
type Answers = { identity: boolean | null; sharing: boolean | null; withdrawn: boolean };
type Status = 'pending' | 'approved' | 'rejected' | 'expired' | 'canceled' | 'closed' | 'removed';
export type SnipeView = {
  id: string; status: Status; viewer_role: 'photographer' | 'tagged' | 'member';
  submitted_at: string; expires_at: string; published_at: string | null; terminal_reason: string | null;
  photographer: Person; photo_available: boolean; verified_targets: Person[];
  tags: (Person & Answers)[] | null; my_answers: Answers | null;
  can_answer: boolean; can_withdraw: boolean; can_remove: boolean;
};
type SnipeList = { student_id: string; kind: 'private' | 'group'; targets: Target[]; snipes: SnipeView[] };
type Cooldown = { friend: Person; next_eligible_at: string };

const POLL_MS = 20_000;
const statusLabels: Record<Status, string> = {
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected', expired: 'Expired', canceled: 'Canceled', closed: 'Closed', removed: 'Removed',
};
const when = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const answerText = (value: boolean | null) => value === null ? 'Not answered' : value ? 'Yes' : 'No';
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
      setList(data); setState('loaded'); setLoadError('');
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
          <p className={styles.note}>Snipes stay in this conversation only. Rewards are not connected yet, so Snipes award no points.</p>
          {state === 'loading' && <p className={styles.muted}>Loading Snipes…</p>}
          {state === 'failed' && !list && (
            <p className={chat.error} role="alert">{loadError} <button type="button" className={chat.retry} onClick={() => void load()}>Try again</button></p>
          )}
          {list && (
            <>
              <Composer base={base} targets={list.targets} onSubmitted={(snipe) => { replaceSnipe(snipe); void load(); }} />
              {loadError && (
                <p className={chat.error} role="alert">Couldn’t refresh Snipes. <button type="button" className={chat.retry} onClick={() => void load()}>Retry</button></p>
              )}
              <div className={styles.listHeading}>
                <h3 className={styles.heading}>Your Snipes here</h3>
                <button type="button" className={chat.retry} onClick={() => void load()}>Refresh</button>
              </div>
              {list.snipes.length === 0
                ? <p className={styles.muted}>No Snipes to show in this conversation yet.</p>
                : <ul className={styles.cards}>{list.snipes.map((snipe) => (
                    <li key={snipe.id}><SnipeCard base={base} snipe={snipe} onChange={replaceSnipe} /></li>
                  ))}</ul>}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function Composer({ base, targets, onSubmitted }: { base: string; targets: Target[]; onSubmitted: (snipe: SnipeView) => void }) {
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

function SnipeCard({ base, snipe, onChange }: { base: string; snipe: SnipeView; onChange: (snipe: SnipeView) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<'withdraw' | 'remove' | null>(null);
  const mine = snipe.viewer_role === 'photographer';

  async function act(body: Record<string, unknown>) {
    setBusy(true); setError('');
    try {
      const { response, data } = await snipeFetch(`${base}/${encodeURIComponent(snipe.id)}`, { method: 'PATCH', json: body });
      if (data.snipe) onChange(data.snipe);
      if (!response.ok) throw new Error(data.error || 'That change could not be saved. Please try again.');
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

      {(snipe.can_withdraw || snipe.can_remove) && (
        confirming ? (
          <div className={styles.confirm} role="group" aria-label="Confirm">
            <p className={styles.tight}>{confirming === 'remove'
              ? 'Remove this Snipe for everyone in this conversation? This cannot be undone.'
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
          </div>
        )
      )}
      {error && <p className={chat.error} role="alert">{error}</p>}
    </article>
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
