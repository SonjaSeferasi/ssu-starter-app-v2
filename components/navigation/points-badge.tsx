'use client';
import { useEffect, useState } from 'react';
import { accessToken } from '../../lib/account/session';
import styles from './social-shell.module.css';

export function PointsBadge({ pathname }: { pathname: string }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [stale, setStale] = useState(false);
  useEffect(() => {
    let active = true;
    let request: AbortController | undefined;
    async function refresh(reset = false) {
      request?.abort(); const controller = new AbortController(); request = controller;
      if (reset) setBalance(null);
      try {
        const token = await accessToken();
        if (!token) { if (active) setBalance(null); return; }
        const response = await fetch('/api/points', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !Number.isSafeInteger(data.balance)) throw new Error();
        if (active && !controller.signal.aborted) { setBalance(data.balance); setStale(false); }
      } catch { if (active && !controller.signal.aborted) setStale(true); }
    }
    const changed = () => void refresh(true), update = () => void refresh();
    const storage = (event: StorageEvent) => { if (!event.key || event.key === 'access_token') changed(); };
    void refresh();
    window.addEventListener('focus', update); window.addEventListener('socialu-points-changed', update);
    window.addEventListener('socialu-session-changed', changed); window.addEventListener('storage', storage);
    return () => {
      active = false; request?.abort();
      window.removeEventListener('focus', update); window.removeEventListener('socialu-points-changed', update);
      window.removeEventListener('socialu-session-changed', changed); window.removeEventListener('storage', storage);
    };
  }, [pathname]);
  const text = balance === null ? 'Points unavailable' : `${balance.toLocaleString()} points${stale ? ' · last confirmed' : ''}`;
  return <span className={styles.pointsBadge} title={text} aria-label={text}>★ {balance === null ? '—' : balance.toLocaleString()} pts{stale && balance !== null ? ' *' : ''}</span>;
}
