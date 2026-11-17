'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { isParticipationGame, needsParticipationReminder } from '../../lib/participation-calendar';
import { calendarRequest, useParticipationCalendar } from '../game-room/use-participation-calendar';
import styles from './participation-reminder.module.css';

export function ParticipationReminder({ pathname }: { pathname: string }) {
  const enabled = !isParticipationGame(pathname);
  const { data, retry } = useParticipationCalendar(enabled, pathname);
  const [closed, setClosed] = useState('');
  const [failure, setFailure] = useState('');
  const [saving, setSaving] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const identity = data ? `${data.accountId}:${data.today}` : '';
  const latest = useRef(identity); latest.current = identity;
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => { setFailure(''); setSaving(false); pending.current?.abort(); }, [identity, enabled]);

  async function dismiss() {
    if (!data || saving) return;
    const expected = identity;
    setClosed(expected); setFailure(''); setSaving(true);
    pending.current?.abort(); const controller = new AbortController(); pending.current = controller;
    try {
      await calendarRequest(controller.signal, data.today);
      if (!controller.signal.aborted && latest.current === expected) {
        window.dispatchEvent(new Event('socialu-participation-changed')); retry();
      }
    } catch {
      if (!controller.signal.aborted && latest.current === expected) setFailure('Dismissal could not be saved. This reminder may return after a refresh.');
    } finally { if (!controller.signal.aborted && latest.current === expected) setSaving(false); }
  }
  if (!enabled || !data || !needsParticipationReminder(data)) return null;
  if (closed === identity) return failure ? <p className={styles.error} role="status">{failure} <button type="button" onClick={() => void dismiss()} disabled={saving}>Retry dismissal</button></p> : null;
  return <aside className={styles.reminder} aria-label="Participation streak reminder">
    <Flame aria-hidden="true" className={styles.flame} />
    <div><strong>Keep your {data.count}-day streak glowing</strong>
      <p>You’ve used all three forgiven misses this week. Play before midnight in {data.timeZone} to keep your streak.</p>
      <small>Participation day: <time dateTime={data.today}>{data.today}</time>. Your device’s time zone may differ.</small>
    </div>
    <Link href="/game-room">Choose a game</Link>
    <button type="button" onClick={() => void dismiss()}>Dismiss for today</button>
  </aside>;
}
