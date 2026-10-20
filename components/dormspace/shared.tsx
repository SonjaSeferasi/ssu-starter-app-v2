'use client';

import { storedAccessToken } from '../../lib/account/session';

import { useCallback, useEffect, useRef, useState } from 'react';
import { INPUT_NUDGE_MS, movementDelta, movementVector, type Direction, type Position } from '../../lib/dormspace-movement';
import styles from './dormspace.module.css';

export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; error: string };

export async function dormApi<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const token = storedAccessToken() ?? '';
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

export type { Direction } from '../../lib/dormspace-movement';

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

// Both views consume the same normalized, elapsed-time movement in avatar-width units.
export function useHeldMovement(step: (delta: Position) => void) {
  const held = useRef(new Map<string, Direction>());
  const stepRef = useRef(step);
  stepRef.current = step;
  const [moving, setMoving] = useState(false);
  const [facing, setFacing] = useState<Direction>('down');
  const [shiftHeld, setShiftHeld] = useState(false);
  const [runEnabled, setRunEnabled] = useState(false);
  const sprinting = shiftHeld || runEnabled;
  const running = useRef(sprinting);
  running.current = sprinting;

  useEffect(() => {
    if (!moving) return;
    let previous = performance.now();
    let frame: number;
    function advance(now: number) {
      const delta = movementDelta(held.current.values(), now - previous, running.current);
      previous = now;
      if (delta.x || delta.y) stepRef.current(delta);
      frame = requestAnimationFrame(advance);
    }
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [moving]);

  const synchronize = useCallback(() => {
    const directions = [...held.current.values()];
    const vector = movementVector(directions);
    if (directions.length) setFacing(directions[directions.length - 1]);
    setMoving(Boolean(vector.x || vector.y));
  }, []);

  const press = useCallback((direction: Direction, source = `pointer:${direction}`) => {
    if (held.current.has(source)) return;
    const before = movementVector(held.current.values());
    held.current.set(source, direction);
    synchronize();
    // A quick key/touch tap still nudges once, without adding a bonus when another key is held.
    if (!before.x && !before.y) stepRef.current(movementDelta(held.current.values(), INPUT_NUDGE_MS, running.current));
  }, [synchronize]);
  const release = useCallback((direction: Direction, source = `pointer:${direction}`) => {
    held.current.delete(source);
    synchronize();
  }, [synchronize]);
  const releaseKeyboard = useCallback(() => {
    for (const source of held.current.keys()) if (source.startsWith('key:')) held.current.delete(source);
    setShiftHeld(false);
    synchronize();
  }, [synchronize]);
  const releaseAll = useCallback(() => {
    held.current.clear(); running.current = false;
    setMoving(false); setShiftHeld(false); setRunEnabled(false);
  }, []);

  // A key released while the window is in the background never reports keyup; stop instead of sliding forever.
  useEffect(() => {
    const stop = () => releaseAll();
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', stop);
    return () => { window.removeEventListener('blur', stop); document.removeEventListener('visibilitychange', stop); };
  }, [releaseAll]);

  function onKeyDown(event: React.KeyboardEvent, interact: () => void) {
    if (event.key === 'Shift') { setShiftHeld(true); return; }
    const key = movementKey(event);
    if (!key) return;
    event.preventDefault();
    if (key === 'interact') { if (!event.repeat) interact(); return; }
    setShiftHeld(event.shiftKey);
    if (!event.repeat) press(key, `key:${event.code || event.key.toLowerCase()}`);
  }
  function onKeyUp(event: React.KeyboardEvent) {
    if (event.key === 'Shift') { setShiftHeld(false); return; }
    held.current.delete(`key:${event.code || event.key.toLowerCase()}`);
    synchronize();
  }
  return { press, release, releaseAll, releaseKeyboard, moving, facing, sprinting, setSprinting: setRunEnabled, onKeyDown, onKeyUp };
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
