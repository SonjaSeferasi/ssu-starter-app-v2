'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { accessToken, storedAccessToken } from '../../lib/account/session';
import styles from './social-shell.module.css';

type Theme = 'light' | 'dark';
type Appearance = { theme: Theme; busy: boolean; error: string; choose: (theme: Theme) => void; retry: () => void };
const AppearanceContext = createContext<Appearance | null>(null);
export const useAppearance = () => useContext(AppearanceContext);

// Kept above route content: changing appearance never replaces the page or its inputs.
export function AppearanceProvider({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const failed = useRef<Theme | null>(null);
  const request = useRef<AbortController | null>(null);
  const locked = useRef(false);

  async function run(selected?: Theme) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    locked.current = true; setBusy(true); setError('');
    failed.current = selected ?? null;
    if (selected) setTheme(selected);
    let token: string | null = null;
    const current = () => !controller.signal.aborted && token === storedAccessToken();
    try {
      token = await accessToken();
      if (controller.signal.aborted) return;
      if (!token) { setTheme('light'); return; }
      const response = await fetch('/api/preferences/appearance', {
        method: selected ? 'PUT' : 'GET', cache: 'no-store', signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, ...(selected ? { 'Content-Type': 'application/json' } : {}) },
        ...(selected ? { body: JSON.stringify({ theme: selected }) } : {}),
      });
      const data = await response.json();
      if (!response.ok || !['light', 'dark'].includes(data.theme) || (selected && data.theme !== selected)) throw new Error();
      if (current()) { setTheme(data.theme); failed.current = null; }
    } catch {
      if (current()) setError(selected
        ? `${selected === 'dark' ? 'Dark' : 'Light'} is showing, but could not be saved to your account.`
        : 'Your saved appearance could not be loaded. Light is showing until you retry.');
    } finally {
      if (!controller.signal.aborted) { locked.current = false; setBusy(false); }
    }
  }

  useEffect(() => {
    const reload = () => { setTheme('light'); void run(); };
    const storage = (event: StorageEvent) => { if (event.key === 'access_token' || event.key === null) reload(); };
    if (enabled) reload();
    else { setTheme('light'); setBusy(false); setError(''); }
    window.addEventListener('socialu-session-changed', reload);
    window.addEventListener('storage', storage);
    return () => {
      request.current?.abort();
      window.removeEventListener('socialu-session-changed', reload);
      window.removeEventListener('storage', storage);
    };
  }, [enabled]);

  useEffect(() => {
    if (enabled) document.documentElement.dataset.appearance = theme;
    else delete document.documentElement.dataset.appearance;
    return () => { delete document.documentElement.dataset.appearance; };
  }, [theme, enabled]);

  return <AppearanceContext.Provider value={{ theme, busy, error,
    choose: selected => { if (!locked.current) void run(selected); }, retry: () => { if (!locked.current) void run(failed.current ?? undefined); } }}>
    {children}
  </AppearanceContext.Provider>;
}

export function AppearanceChoices() {
  const appearance = useAppearance();
  if (!appearance) return null;
  return <section aria-label="Appearance">
    <p>Appearance</p>
    <div className={styles.placementChoices}>
      {(['light', 'dark'] as const).map(choice => <button type="button" key={choice}
        aria-pressed={appearance.theme === choice} disabled={appearance.busy}
        onClick={() => appearance.choose(choice)}>{choice === 'light' ? '☀ Light' : '☾ Dark'}</button>)}
    </div>
    {appearance.busy && <p role="status">Syncing appearance…</p>}
    {appearance.error && <p role="alert">{appearance.error} <button type="button" onClick={appearance.retry} disabled={appearance.busy}>Retry appearance</button></p>}
  </section>;
}
