'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './dormspace.module.css';

export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; error: string };

export async function dormApi<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const token = localStorage.getItem('access_token') ?? '';
    const response = await fetch(path, {
      ...init, cache: 'no-store',
      headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}`, ...init.headers },
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) return { ok: true, status: response.status, data: data as T };
    return { ok: false, status: response.status, error: data.error || 'Something went wrong. Please try again.' };
  } catch {
    return { ok: false, status: 0, error: 'You appear to be offline. Check your connection and try again.' };
  }
}

export type Direction = 'up' | 'down' | 'left' | 'right';

// SRS-504.3, SRS-504.5, SRS-504.9: WASD/arrows move, E interacts; typing in a text field never moves.
export function movementKey(event: React.KeyboardEvent): Direction | 'interact' | null {
  const target = event.target as HTMLElement;
  if (target.closest('input, textarea, select, [contenteditable="true"]')) return null;
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  switch (event.key) {
    case 'w': case 'W': case 'ArrowUp': return 'up';
    case 's': case 'S': case 'ArrowDown': return 'down';
    case 'a': case 'A': case 'ArrowLeft': return 'left';
    case 'd': case 'D': case 'ArrowRight': return 'right';
    case 'e': case 'E': return 'interact';
    default: return null;
  }
}

// Holding a direction keeps the avatar moving: one step on press, then one step every `interval`
// milliseconds until release. Several held directions combine (diagonals); the newest sets facing.
// Holding Shift sprints: steps come twice as often.
export const SPRINT_SPEEDUP = 2;
export function useHeldMovement(step: (direction: Direction) => void, interval: number) {
  const held = useRef<Direction[]>([]);
  const stepRef = useRef(step);
  stepRef.current = step;
  const [moving, setMoving] = useState(false);
  const [facing, setFacing] = useState<Direction>('down');
  const [sprinting, setSprinting] = useState(false);
  const tick = sprinting ? interval / SPRINT_SPEEDUP : interval;

  useEffect(() => {
    if (!moving) return;
    const timer = window.setInterval(() => held.current.forEach((direction) => stepRef.current(direction)), tick);
    return () => window.clearInterval(timer);
  }, [moving, tick]);

  const press = useCallback((direction: Direction) => {
    if (held.current.includes(direction)) return;
    held.current = [...held.current, direction];
    setFacing(direction);
    setMoving(true);
    stepRef.current(direction);
  }, []);
  const release = useCallback((direction: Direction) => {
    held.current = held.current.filter((d) => d !== direction);
    const newest = held.current[held.current.length - 1];
    if (newest) setFacing(newest); else setMoving(false);
  }, []);
  const releaseAll = useCallback(() => { held.current = []; setMoving(false); setSprinting(false); }, []);

  // A key released while the window is in the background never reports keyup; stop instead of sliding forever.
  useEffect(() => {
    const stop = () => releaseAll();
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', stop);
    return () => { window.removeEventListener('blur', stop); document.removeEventListener('visibilitychange', stop); };
  }, [releaseAll]);

  function onKeyDown(event: React.KeyboardEvent, interact: () => void) {
    if (event.key === 'Shift') { setSprinting(true); return; }
    const key = movementKey(event);
    if (!key) return;
    event.preventDefault();
    if (key === 'interact') { if (!event.repeat) interact(); return; }
    setSprinting(event.shiftKey);
    if (!event.repeat) press(key);
  }
  function onKeyUp(event: React.KeyboardEvent) {
    if (event.key === 'Shift') { setSprinting(false); return; }
    const key = movementKey(event);
    if (key && key !== 'interact') release(key);
  }
  return { press, release, releaseAll, moving, facing, sprinting, setSprinting, tick, onKeyDown, onKeyUp };
}

// SRS-504.4, SRS-504.6: on-screen directional and interaction controls for touch devices.
// Press and hold an arrow to keep walking.
export function TouchControls({ onPress, onRelease, onInteract, interactLabel, sprinting, onSprint }: {
  onPress: (direction: Direction) => void; onRelease: (direction: Direction) => void;
  onInteract: () => void; interactLabel: string | null; sprinting: boolean; onSprint: (on: boolean) => void;
}) {
  const arrow = (direction: Direction, symbol: string, label: string) => (
    <button type="button" className={styles.button} aria-label={label}
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); onPress(direction); }}
      onPointerUp={() => onRelease(direction)} onPointerCancel={() => onRelease(direction)}
      onLostPointerCapture={() => onRelease(direction)} onContextMenu={(event) => event.preventDefault()}
      // Keyboard activation of the button itself takes a single step.
      onClick={(event) => { if (event.detail === 0) { onPress(direction); onRelease(direction); } }}>{symbol}</button>
  );
  return (
    <div className={styles.controlsRow}>
      <div className={styles.controls} role="group" aria-label="Move your avatar">
        <span />{arrow('up', '▲', 'Move up')}<span />
        {arrow('left', '◀', 'Move left')}{arrow('down', '▼', 'Move down')}{arrow('right', '▶', 'Move right')}
      </div>
      <button type="button" className={`${styles.button} ${sprinting ? styles.primary : ''}`} aria-pressed={sprinting}
        onClick={() => onSprint(!sprinting)}>{sprinting ? 'Running' : 'Run'}</button>
      <button type="button" className={`${styles.button} ${styles.primary}`} onClick={onInteract} disabled={!interactLabel}>
        {interactLabel ? `Interact: ${interactLabel}` : 'Nothing nearby'}
      </button>
      <p className={styles.hint}>Hold WASD or the arrow keys to walk, and hold Shift to sprint. Press E to interact.</p>
    </div>
  );
}
