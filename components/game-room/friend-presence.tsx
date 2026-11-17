'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { accessToken, storedAccessToken } from '../../lib/account/session';
import { presenceLabels, presenceLocation, validPresence, type PlayingFriend } from '../../lib/game-presence';
import styles from './friend-presence.module.css';

const endpoint = '/api/game-room/presence';
const changed = 'socialu-presence-changed';
function announce() {
  window.dispatchEvent(new Event(changed));
  // A refresh signal only; account preference is always read from the server.
  try { localStorage.setItem(changed, crypto.randomUUID()); } catch { /* Storage may be disabled. */ }
}
async function request(token: string, method = 'GET', body?: unknown, signal?: AbortSignal) {
  const response = await fetch(endpoint, { method, cache: 'no-store', signal, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Friends playing now is unavailable.');
  return data;
}
function useAccountRevision() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const update = () => setRevision(n => n + 1);
    const storage = (e: StorageEvent) => { if (e.key === 'access_token' || e.key === null) update(); };
    window.addEventListener('socialu-session-changed', update); window.addEventListener('storage', storage);
    return () => { window.removeEventListener('socialu-session-changed', update); window.removeEventListener('storage', storage); };
  }, []);
  return revision;
}

// Mounted outside navigation: World Explorer also uses the standalone shell.
export function GamePresencePublisher({ pathname }: { pathname: string }) {
  const revision = useAccountRevision();
  useEffect(() => {
    const location = presenceLocation(pathname);
    if (!location) return;
    const sessionId = crypto.randomUUID();
    let disposed = false, busy = false, token: string | null = null;
    let controller: AbortController | undefined;
    function leave() {
      controller?.abort();
      if (token) void fetch(endpoint, { method: 'DELETE', keepalive: true, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) }).catch(() => {});
    }
    async function beat() {
      if (disposed || busy) return;
      busy = true;
      const current = new AbortController(); controller = current;
      const timeout = setTimeout(() => current.abort(), 10000);
      try {
        const next = await accessToken();
        if (disposed || current.signal.aborted || !next) return;
        token = next;
        await request(next, 'POST', { sessionId, location }, current.signal);
      } catch { /* Offline sessions expire server-side; no invented online state. */ }
      finally { clearTimeout(timeout); busy = false; }
    }
    const storage = (e: StorageEvent) => { if (e.key === changed) void beat(); };
    void beat();
    const timer = setInterval(() => void beat(), 30000);
    window.addEventListener(changed, beat); window.addEventListener('focus', beat); window.addEventListener('pageshow', beat);
    window.addEventListener('pagehide', leave); window.addEventListener('storage', storage);
    return () => {
      disposed = true; clearInterval(timer); leave();
      window.removeEventListener(changed, beat); window.removeEventListener('focus', beat); window.removeEventListener('pageshow', beat);
      window.removeEventListener('pagehide', leave); window.removeEventListener('storage', storage);
    };
  }, [pathname, revision]);
  return null;
}

type TimedFriend = PlayingFriend & { deadline: number };
export function FriendsPlaying() {
  const revision = useAccountRevision();
  const [reload, setReload] = useState(0);
  const [visible, setVisible] = useState<boolean | null>(null);
  const [friends, setFriends] = useState<TimedFriend[]>([]);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<boolean | null>(null);
  const generation = useRef(0);
  const saveRequest = useRef<AbortController>();
  const saveBusy = useRef(false);
  const writeVersion = useRef(0);
  useEffect(() => {
    const id = ++generation.current;
    setFriends([]); setVisible(null); setError(''); setSaveError(''); setPending(null); setSaving(false); saveBusy.current = false;
    let busy = false;
    let controller: AbortController | undefined;
    async function read() {
      if (busy || saveBusy.current) return;
      busy = true; controller = new AbortController(); const current = controller;
      const timeout = setTimeout(() => current.abort(), 10000);
      const started = performance.now();
      const version = writeVersion.current;
      try {
        const token = await accessToken();
        if (id !== generation.current || current.signal.aborted) return;
        if (!token) throw new Error('Sign in to see friends playing now.');
        const data = await request(token, 'GET', undefined, current.signal);
        if (!validPresence(data)) throw new Error('Friends playing now is unavailable.');
        if (id !== generation.current || current.signal.aborted || saveBusy.current || version !== writeVersion.current) return;
        setVisible(data.visible); setError('');
        // Use server-relative expiry and subtract all request time; ignore local clock skew.
        setFriends(data.friends.map(f => ({ ...f, deadline: started + Math.min(60000, Date.parse(f.expiresAt) - Date.parse(data.serverTime)) })).filter(f => f.deadline > performance.now()));
      } catch (e) {
        if (id === generation.current && !saveBusy.current) { setFriends([]); setError(e instanceof Error && e.name !== 'AbortError' ? e.message : 'Friends playing now could not be refreshed. Please retry.'); }
      } finally { clearTimeout(timeout); busy = false; }
    }
    const storage = (e: StorageEvent) => { if (e.key === changed) void read(); };
    void read(); const timer = setInterval(() => void read(), 15000);
    const expiry = setInterval(() => setFriends(list => list.filter(f => f.deadline > performance.now())), 1000);
    window.addEventListener('focus', read); window.addEventListener(changed, read); window.addEventListener('storage', storage);
    return () => {
      generation.current++; controller?.abort(); saveRequest.current?.abort(); clearInterval(timer); clearInterval(expiry);
      window.removeEventListener('focus', read); window.removeEventListener(changed, read); window.removeEventListener('storage', storage);
    };
  }, [revision, reload]);
  async function save(next: boolean) {
    if (saveBusy.current) return;
    const id = generation.current, token = storedAccessToken();
    if (!token) { setError('Sign in to change your visibility.'); return; }
    saveBusy.current = true; writeVersion.current++; setSaving(true); setPending(next); setSaveError('');
    const controller = new AbortController(); saveRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const data = await request(token, 'PUT', { visible: next }, controller.signal);
      if (id !== generation.current || controller.signal.aborted) return;
      if (data.visible !== next) throw new Error('Your visibility change was not confirmed.');
      setVisible(next); setPending(null); announce();
    } catch {
      if (id === generation.current) setSaveError('Your visibility change was not confirmed. The switch shows your last confirmed setting. Retry to make sure it is saved.');
    } finally { clearTimeout(timeout); if (id === generation.current) { saveBusy.current = false; setSaving(false); } }
  }
  return <section className={styles.panel} aria-labelledby="friends-playing-title">
    <h2 id="friends-playing-title">Friends playing now</h2>
    <p>See where your friends are hanging out.</p>
    <label className={styles.toggle}><input type="checkbox" checked={visible === true} disabled={visible === null || saving} onChange={e => void save(e.target.checked)} />Show me as online</label>
    <p className={styles.hint}>Only accepted friends can see your Game Room or game. Turn this off to hide your presence.</p>
    {saving && <p role="status">Saving visibility…</p>}
    {saveError && <div role="alert"><p>{saveError}</p><button onClick={() => pending !== null && void save(pending)} disabled={saving}>Retry visibility</button></div>}
    {error && <div role="alert"><p>{error}</p><button onClick={() => setReload(n => n + 1)} disabled={saving}>Retry friends</button></div>}
    {visible === null && !error ? <p role="status">Checking friends…</p> : friends.length ? <ul>{friends.map(friend => <li key={friend.username}><span className={styles.dot} aria-hidden="true" /><div><Link href={`/students/${encodeURIComponent(friend.username)}`}>{friend.name}</Link><span>{presenceLabels[friend.location]}</span></div></li>)}</ul> : !error && <p>No friends are showing as online right now.</p>}
  </section>;
}
