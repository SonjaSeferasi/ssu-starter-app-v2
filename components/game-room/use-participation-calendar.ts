'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { accessToken, storedAccessToken } from '../../lib/account/session';
import type { ParticipationCalendar } from '../../lib/participation-calendar';

export async function calendarRequest(signal: AbortSignal, date?: string): Promise<ParticipationCalendar> {
  const token = await accessToken();
  if (!token) throw new Error('Sign in to see your weekly streak.');
  const response = await fetch('/api/game-participation/calendar', { signal, method: date ? 'PUT' : 'GET', cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, ...(date ? { 'Content-Type': 'application/json' } : {}) },
    ...(date ? { body: JSON.stringify({ date }) } : {}),
  });
  const data = await response.json();
  if (token !== storedAccessToken()) throw new Error('Your account changed. Refresh your streak.');
  if (!response.ok) throw new Error(data.error || 'Weekly participation is temporarily unavailable.');
  if (!data.accountId || !Array.isArray(data.days) || data.days.length !== 7 || !Number.isFinite(Date.parse(data.deadline))) throw new Error('Weekly participation returned incomplete status.');
  return data;
}

export function useParticipationCalendar(enabled: boolean, route = '') {
  const [data, setData] = useState<ParticipationCalendar | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    let controller: AbortController | undefined;
    let disposed = false;
    setData(null); setError('');
    if (!enabled) return;
    async function refresh(clear = false) {
      controller?.abort(); clearTimeout(timer.current);
      const request = new AbortController(); controller = request;
      if (clear) setData(null);
      try {
        const value = await calendarRequest(request.signal);
        if (disposed || request.signal.aborted) return;
        setData(value); setError('');
        // Server-relative deadline avoids depending on the device clock/zone.
        const untilMidnight = Date.parse(value.deadline) - Date.parse(value.serverTime);
        timer.current = setTimeout(() => void refresh(), Math.max(1000, Math.min(30000, untilMidnight + 100)));
      } catch (failure) {
        if (disposed || request.signal.aborted) return;
        setData(null); setError(failure instanceof Error ? failure.message : 'Unable to load your weekly streak.');
        timer.current = setTimeout(() => void refresh(), 30000);
      }
    }
    const update = () => { void refresh(); };
    const identity = () => { void refresh(true); };
    const storage = (event: StorageEvent) => { if (event.key === 'access_token' || event.key === null) identity(); };
    void refresh();
    window.addEventListener('focus', update);
    window.addEventListener('socialu-points-changed', update);
    window.addEventListener('socialu-participation-changed', update);
    window.addEventListener('socialu-session-changed', identity);
    window.addEventListener('storage', storage);
    return () => {
      disposed = true; controller?.abort(); clearTimeout(timer.current);
      window.removeEventListener('focus', update);
      window.removeEventListener('socialu-points-changed', update);
      window.removeEventListener('socialu-participation-changed', update);
      window.removeEventListener('socialu-session-changed', identity);
      window.removeEventListener('storage', storage);
    };
  }, [enabled, route, attempt]);
  return { data, error, retry };
}
