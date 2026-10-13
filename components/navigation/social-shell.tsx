'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isGamePage, isStandalonePage } from '../../lib/navigation';
import { NavigationFrame } from './social-navigation';
import type { NavigationPosition } from '../../lib/game-room';

type SessionState = 'loading' | 'signed-in' | 'signed-out' | 'unavailable';
const SessionContext = createContext<SessionState>('loading');
export function useNavigationSession() { return useContext(SessionContext); }

export function SocialShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<SessionState>('loading');
  const standalone = isStandalonePage(pathname);
  const gamePage = isGamePage(pathname);
  const [position, setPosition] = useState<NavigationPosition>('side');
  const [saving, setSaving] = useState(false);
  const [preferenceError, setPreferenceError] = useState('');
  const [pendingPosition, setPendingPosition] = useState<NavigationPosition>('side');
  const [preferenceLoadFailed, setPreferenceLoadFailed] = useState(false);
  const [preferenceReload, setPreferenceReload] = useState(0);

  async function savePosition(selected: NavigationPosition) {
    setPosition(selected); setPendingPosition(selected); setSaving(true); setPreferenceError(''); setPreferenceLoadFailed(false);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` }, body: JSON.stringify({ position: selected }) });
      if (!response.ok) throw new Error();
    } catch { setPreferenceError('Your placement is not confirmed saved.'); }
    finally { setSaving(false); }
  }

  useEffect(() => {
    if (session !== 'signed-in' || standalone) return;
    const controller = new AbortController();
    setPosition('side'); setSaving(true); setPreferenceError(''); setPreferenceLoadFailed(false);
    void fetch('/api/preferences', { headers: { Authorization: `Bearer ${localStorage.getItem('access_token') || ''}` }, cache: 'no-store', signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => { if (!controller.signal.aborted && (data.position === 'side' || data.position === 'bottom')) { setPosition(data.position); setPreferenceError(''); } })
      .catch(() => { if (!controller.signal.aborted) { setPreferenceError('Your saved placement could not be loaded.'); setPreferenceLoadFailed(true); } })
      .finally(() => { if (!controller.signal.aborted) setSaving(false); });
    return () => controller.abort();
  }, [session, standalone, preferenceReload]);

  useEffect(() => {
    if (standalone && !gamePage) return;
    let controller: AbortController | undefined;
    let disposed = false;

    async function checkSession() {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        // Consume the starter login's token; do not introduce a second login flow.
        const token = localStorage.getItem('access_token');
        if (!token) { setSession('signed-out'); return; }
        const response = await fetch('/api/auth/session', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store', signal: request.signal,
        });
        if (disposed || request.signal.aborted) return;
        setSession(response.ok ? 'signed-in' : [401, 403, 409].includes(response.status) ? 'signed-out' : 'unavailable');
      } catch {
        if (!disposed && !request.signal.aborted) setSession('unavailable');
      }
    }

    setSession('loading');
    void checkSession();
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'access_token' || event.key === null) void checkSession();
    };
    const onFocus = () => { void checkSession(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    window.addEventListener('socialu-session-changed', onFocus);
    return () => {
      disposed = true;
      controller?.abort();
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('socialu-session-changed', onFocus);
    };
  }, [standalone, gamePage]);

  return (
    <SessionContext.Provider value={session}>
      {!standalone && session === 'signed-in'
        ? <NavigationFrame pathname={pathname} position={position} onPositionChange={selected => void savePosition(selected)} saving={saving} preferenceError={preferenceError} onRetry={() => preferenceLoadFailed ? setPreferenceReload(value => value+1) : void savePosition(pendingPosition)}>{children}</NavigationFrame>
        : children}
    </SessionContext.Provider>
  );
}
