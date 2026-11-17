'use client';

import { useEffect, useState } from 'react';
import styles from './game-room.module.css';

const storageKey = 'socialu.game-room.background';
type Background = 'campus-day' | 'adventure-sky';
const valid = (value: unknown): value is Background => value === 'campus-day' || value === 'adventure-sky';

export function useRoomBackground() {
  const [background, setBackground] = useState<Background>('campus-day');
  const [error, setError] = useState('');
  useEffect(() => {
    const read = () => {
      try { const value = localStorage.getItem(storageKey); setBackground(valid(value) ? value : 'campus-day'); }
      catch { setError('Background storage is unavailable on this device. Your choice will last for this visit.'); }
    };
    const sync = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) read(); };
    read(); window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  function choose(value: Background) {
    setBackground(value); setError('');
    try { localStorage.setItem(storageKey, value); }
    catch { setError('Your background is showing, but could not be remembered on this device.'); }
  }
  return { background, choose, error };
}

export function RoomBackgroundChoices({ background, choose, error }: ReturnType<typeof useRoomBackground>) {
  return <section className={styles.backgroundChoices} aria-label="Game Room background">
    <div><strong>Your Game Room backdrop</strong><small>Remembered on this device</small></div>
    <div className={styles.backgroundButtons}>
      {(['campus-day', 'adventure-sky'] as const).map(value => <button type="button" key={value}
        aria-pressed={background === value} onClick={() => choose(value)}>
        <span className={styles.backgroundSwatch} data-background={value} aria-hidden="true" />
        {value === 'campus-day' ? 'Campus Day' : 'Adventure Sky'}
      </button>)}
    </div>
    {error && <p role="alert">{error}</p>}
  </section>;
}
