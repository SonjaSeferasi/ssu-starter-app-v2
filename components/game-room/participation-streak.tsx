'use client';

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { readParticipation, type ParticipationStatus } from '../../lib/game-participation-client';
import styles from './game-room.module.css';

const games = [
  { key: 'dormspace', label: 'DormSpace' },
  { key: 'explorer', label: 'World Explorer' },
] as const;

export function ParticipationStreak({ preview }: { preview: boolean }) {
  const [status, setStatus] = useState<ParticipationStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (preview) return;
    let controller: AbortController | undefined;
    function refresh() {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      setFailed(false);
      void readParticipation(request.signal).then(value => {
        if (!request.signal.aborted) setStatus(value);
      }).catch(() => {
        if (!request.signal.aborted) setFailed(true);
      });
    }
    function sessionChanged() {
      setStatus(null);
      refresh();
    }
    function storageChanged(event: StorageEvent) {
      if (event.key === 'access_token' || event.key === null) sessionChanged();
    }
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('socialu-points-changed', refresh);
    window.addEventListener('socialu-session-changed', sessionChanged);
    window.addEventListener('storage', storageChanged);
    return () => {
      controller?.abort();
      window.removeEventListener('focus', refresh);
      window.removeEventListener('socialu-points-changed', refresh);
      window.removeEventListener('socialu-session-changed', sessionChanged);
      window.removeEventListener('storage', storageChanged);
    };
  }, [preview, attempt]);

  return <section className={styles.participation} aria-labelledby="participation-title">
    <div className={styles.streakHeading}>
      <Flame className={styles.streakIcon} aria-hidden="true" />
      <div>
        <h2 id="participation-title">Shared participation streak</h2>
        <div aria-live="polite">
          {preview ? <p>Sign in to track your participation.</p>
            : failed ? <p>Couldn’t refresh streaks. <button type="button" onClick={() => setAttempt(value => value + 1)}>Retry</button></p>
            : status ? <>
              <p><strong>{status.count} {status.count === 1 ? 'day' : 'days'}</strong> · {status.qualifiedToday ? 'Qualified today' : 'Not yet qualified today'}</p>
              <p>{status.forgivenRemaining} of 3 forgiven misses left this week{status.rewardPoints > 0 && ` · ${status.rewardPoints} points for your first qualifying activity each day`}</p>
            </> : <p>Loading your streak…</p>}
        </div>
      </div>
    </div>
    {!preview && status && !failed && <div className={styles.streakBoards}>
      {games.map(game => {
        const entries = status.leaderboards[game.key] ?? [];
        return <section className={styles.streakBoard} key={game.key} aria-labelledby={`streak-${game.key}`}>
          <h3 id={`streak-${game.key}`}>{game.label} streaks</h3>
          {entries.length ? <ol>{entries.map(entry => <li key={entry.username}>
            <span>{entry.username}</span><strong>{entry.days} {entry.days === 1 ? 'day' : 'days'}</strong>
          </li>)}</ol> : <p>No active streaks yet.</p>}
        </section>;
      })}
    </div>}
  </section>;
}
