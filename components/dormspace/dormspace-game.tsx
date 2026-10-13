'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { floorCount, floorOfFriend, type Dorm, type Friend } from '../../lib/dormspace-rules';
import { DormHall } from './dorm-hall';
import { DormRoom } from './dorm-room';
import { Guestbook } from './guestbook';
import { dormApi } from './shared';
import styles from './dormspace.module.css';

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
  if (!hall) return <p className={styles.status} role="status">Opening DormSpace…</p>;

  return (
    <div className={styles.game}>
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {busy ? <p className={styles.status} role="status">Opening dorm…</p> : null}

      {view.kind === 'hall' ? (
        <DormHall
          friends={hall.friends} floor={view.floor} arriveAt={view.arriveAt}
          onFloorChange={(floor) => setView({ kind: 'hall', floor, arriveAt: null })}
          onOpenDorm={(owner) => void openDorm(owner)}
        />
      ) : (
        <DormRoom
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
