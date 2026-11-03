'use client';

import { useEffect, useState } from 'react';
import { accessToken } from '../../lib/account/session';
import type { ScreenThemeId, HeaderThemeId } from '../../lib/screen-themes';

// "Customize Your Screen" -- additional functionality, not in the
// official SRS. Shared by FeedPage (reads backgroundTheme/headerTheme to
// render them) and the Customize Your Screen picker page (reads AND
// writes). Each page fetches its own instance on mount -- there's no
// cross-tab/cross-page cache to keep in sync, since Customize Your Screen
// is a separate route; by the time a student navigates back to Campus
// Feed, FeedPage freshly mounts and loads whatever was just saved.
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
