'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { accessToken } from '../../lib/account/session';
import type { ScreenThemeId, HeaderThemeId } from '../../lib/screen-themes';

export type ScreenThemeState = ReturnType<typeof useScreenTheme>;

// "Customize Your Screen" -- additional functionality, not in the
// official SRS. The underlying fetch/save hook -- kept usable standalone,
// but in practice called exactly once, by ScreenThemeProvider below.
export function useScreenTheme() {
  const [backgroundTheme, setBackgroundTheme] = useState<ScreenThemeId | null>(null);
  const [headerTheme, setHeaderTheme] = useState<HeaderThemeId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await accessToken();
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/preferences/screen-theme', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load your saved theme.');
        if (!cancelled) {
          setBackgroundTheme(body.backgroundTheme ?? null);
          setHeaderTheme(body.headerTheme ?? null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load your saved theme.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(nextBackground: ScreenThemeId | null, nextHeader: HeaderThemeId | null): Promise<boolean> {
    setError('');
    try {
      const token = await accessToken();
      if (!token) throw new Error('Please sign in again.');
      const res = await fetch('/api/preferences/screen-theme', {
        method: 'PUT',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ backgroundTheme: nextBackground, headerTheme: nextHeader }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to save your theme.');
      setBackgroundTheme(body.backgroundTheme ?? null);
      setHeaderTheme(body.headerTheme ?? null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save your theme.');
      return false;
    }
  }

  return { backgroundTheme, headerTheme, loading, error, save };
}

// A single shared instance, provided once by SocialShell (which calls
// useScreenTheme() itself and provides the SAME state object both to this
// context, for FeedPage/CustomizeScreen, and directly for computing the
// shell chrome's own dark-theme coordination -- see social-shell.tsx) --
// so navigating between those doesn't trigger three separate fetches of
// the same preference. Exported directly (not wrapped in its own
// Provider component) because SocialShell needs the resolved state value
// itself, not just a child able to read it from context.
export const ScreenThemeContext = createContext<ScreenThemeState | null>(null);

// A safe, inert default for the (in practice, never-hit-in-the-real-app)
// case of no Provider in the tree -- every real route that uses this is
// always wrapped by SocialShell's ScreenThemeProvider. Deliberately NOT a
// second useScreenTheme() instance here: that would re-introduce the
// duplicate-fetch problem this Provider exists to solve.
const NO_PROVIDER_FALLBACK: ScreenThemeState = {
  backgroundTheme: null, headerTheme: null, loading: true, error: '',
  save: async () => false,
};

export function useScreenThemeContext(): ScreenThemeState {
  return useContext(ScreenThemeContext) ?? NO_PROVIDER_FALLBACK;
}
