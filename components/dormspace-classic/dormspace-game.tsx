'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { floorCount, floorOfFriend, type Dorm, type Friend } from '../../lib/dormspace-rules';
import { DormHall } from './dorm-hall';
import { DormRoom } from './dorm-room';
import { Guestbook } from './guestbook';
import { dormApi } from './shared';
import styles from './dormspace.module.css';
import type { GameRoomData } from '../../lib/game-room';
import { defaultPixelLook, pixelLookKey, resolveDormAvatar, type PixelAvatarLook } from '../../lib/dormspace-avatar';

type Hall = { me: { username: string }; friends: Friend[] };
type View = { kind: 'hall'; floor: number; arriveAt: string | null } | { kind: 'room'; dorm: Dorm };

const REVOCATION_CHECK_MS = 2000;

export function DormSpaceGame() {
  const [hall, setHall] = useState<Hall | null>(null);
  const [view, setView] = useState<View>({ kind: 'hall', floor: 1, arriveAt: null });
  const [guestbookOpen, setGuestbookOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [avatar, setAvatar] = useState<PixelAvatarLook | null>(null);
  const [avatarNotice, setAvatarNotice] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [avatarAttempt, setAvatarAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    async function loadAvatar() {
      if (loading || document.visibilityState === 'hidden') return;
      loading = true;
      const result = await dormApi<GameRoomData>('/api/game-room', { signal: controller.signal });
      loading = false;
      if (controller.signal.aborted) return;
      if (result.ok) {
        const resolved = resolveDormAvatar(result.data);
        setAvatar(previous => previous && pixelLookKey(previous) === pixelLookKey(resolved.look) ? previous : resolved.look);
        setAvatarNotice(resolved.notice); setAvatarError('');
      } else {
        setAvatar(previous => previous ?? defaultPixelLook);
        setAvatarError('Your saved avatar could not be loaded. Your last loaded look, or the default pixel avatar, is shown.');
      }
    }
    void loadAvatar();
    // Returning from a Game Room tab picks up newly saved clothing without a room reset.
    const refresh = () => { void loadAvatar(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { controller.abort(); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [avatarAttempt]);

  const loadHall = useCallback(async () => {
    const result = await dormApi<Hall>('/api/dorm?view=hall');
    if (!result.ok) { setError(result.error); return null; }
    setError('');
    setHall(result.data);
    return result.data;
  }, []);

  // SRS-507.1: DormSpace opens on the first floor of the student's DormHall.
  useEffect(() => { void loadHall(); }, [loadHall]);

  // SRS-507.9, SRS-507.16, SRS-507.18: keep doors current; a floor that disappears returns to floor 1.
  useEffect(() => {
    if (view.kind !== 'hall') return;
    const timer = window.setInterval(() => { void loadHall(); }, 15000);
    return () => window.clearInterval(timer);
  }, [view.kind, loadHall]);
  useEffect(() => {
    if (hall && view.kind === 'hall' && view.floor > floorCount(hall.friends.length)) {
      setView({ kind: 'hall', floor: 1, arriveAt: null });
    }
  }, [hall, view]);

  // SRS-507.15: return to the floor that holds the dorm's current door, or floor 1.
  const returnToHall = useCallback(async (from: string | null, message = '') => {
    setGuestbookOpen(false);
    setNotice(message);
    const latest = await loadHall();
    const floor = from && latest ? floorOfFriend(latest.friends, from) : 1;
    setView({ kind: 'hall', floor, arriveAt: from });
  }, [loadHall]);

  // SRS-507.12, SRS-507.13, SRS-507.19: entry is authorized by the server at the moment of entry.
  async function openDorm(owner: string | null) {
    if (busy) return;
    setBusy(true);
    setNotice('');
    const result = await dormApi<Dorm>(`/api/dorm${owner ? `?owner=${encodeURIComponent(owner)}` : ''}`);
    setBusy(false);
    if (result.ok) { setView({ kind: 'room', dorm: result.data }); return; }
    if (result.status === 403) { await returnToHall(null, result.error); return; }
    setError(result.error);
  }

  async function reloadDorm() {
    if (view.kind !== 'room') return;
    const result = await dormApi<Dorm>('/api/dorm');
    if (result.ok) setView({ kind: 'room', dorm: result.data });
    else setError(result.error);
  }

  // SRS-507.17: a visit ends as soon as the friendship with the owner ends.
  const visiting = view.kind === 'room' && !view.dorm.isOwner ? view.dorm.owner : null;
  useEffect(() => {
    if (!visiting) return;
    const timer = window.setInterval(async () => {
      const result = await dormApi<{ allowed: boolean }>(`/api/dorm?check=${encodeURIComponent(visiting)}`);
      if (result.ok && !result.data.allowed) {
        void returnToHall(null, `You're no longer friends with ${visiting}, so your visit ended.`);
      }
    }, REVOCATION_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [visiting, returnToHall]);

  const denied = useCallback((message: string) => { void returnToHall(null, message); }, [returnToHall]);

  if (error && !hall) {
    return (
      <div className={styles.game}>
        <p className={styles.error} role="alert">{error}</p>
        {error.includes('profile') ? <Link className={`${styles.button} ${styles.primary}`} href="/profile">Create your profile</Link> : null}
        <button type="button" className={styles.button} onClick={() => { setError(''); void loadHall(); }}>Try again</button>
      </div>
    );
  }
  if (!hall || !avatar) return <p className={styles.status} role="status">Opening DormSpace…</p>;

  return (
    <div className={styles.game}>
      <div className={styles.toolbar}>
        <Link className={styles.button} href="/game-room">Edit Game Room avatar</Link>
        <span className={styles.hint}>Your saved Game Room look follows you into DormSpace.</span>
      </div>
      {avatarNotice ? <p className={styles.notice} role="status">{avatarNotice}</p> : null}
      {avatarError ? <div className={styles.notice} role="status">{avatarError} <button type="button" className={styles.button} onClick={() => setAvatarAttempt(value => value + 1)}>Retry avatar</button></div> : null}
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {busy ? <p className={styles.status} role="status">Opening dorm…</p> : null}

      {view.kind === 'hall' ? (
        <DormHall
          avatar={avatar}
          friends={hall.friends} floor={view.floor} arriveAt={view.arriveAt}
          onFloorChange={(floor) => setView({ kind: 'hall', floor, arriveAt: null })}
          onOpenDorm={(owner) => void openDorm(owner)}
        />
      ) : (
        <DormRoom
          avatar={avatar}
          key={view.dorm.owner}
          dorm={view.dorm}
          onDormChange={(dorm) => setView({ kind: 'room', dorm })}
          onReload={() => void reloadDorm()}
          onExit={() => void returnToHall(view.dorm.isOwner ? null : view.dorm.owner)}
          onOpenGuestbook={() => setGuestbookOpen(true)}
        />
      )}

      {guestbookOpen && view.kind === 'room' ? (
        <Guestbook owner={view.dorm.owner} onClose={() => setGuestbookOpen(false)} onDenied={denied} />
      ) : null}
    </div>
  );
}
