'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isStandalonePage } from '../../lib/navigation';
import { NavigationFrame } from './social-navigation';

type SessionState = 'loading' | 'signed-in' | 'signed-out' | 'unavailable';
const SessionContext = createContext<SessionState>('loading');
export function useNavigationSession() { return useContext(SessionContext); }

export function SocialShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<SessionState>('loading');
  const standalone = isStandalonePage(pathname);

  useEffect(() => {
    if (standalone) return;
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
  }, [standalone]);

  return (
    <SessionContext.Provider value={session}>
      {!standalone && session === 'signed-in'
        ? <NavigationFrame pathname={pathname}>{children}</NavigationFrame>
        : children}
    </SessionContext.Provider>
  );
}
