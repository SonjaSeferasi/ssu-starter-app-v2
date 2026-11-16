'use client';
// SRS-504.4 / SRS-504.6: on-screen joystick (touch), plus run, interact, camera turn and zoom
// buttons that also work with a mouse or keyboard. Dragging on the canvas itself orbits the camera.
import { useRef, useState } from 'react';
import styles from '../dormspace-3d.module.css';

export type StickSink = { setStick(right: number, forward: number): void; setRun(on: boolean): void; rotateCamera(radians: number): void; zoomCamera(factor: number): void };

export function Joystick({ sink }: { sink: StickSink | null }) {
  const pad = useRef<HTMLDivElement>(null), knob = useRef<HTMLSpanElement>(null);
  const active = useRef<number | null>(null);
  function update(event: React.PointerEvent) {
    const rect = pad.current!.getBoundingClientRect(), radius = rect.width / 2;
    let x = (event.clientX - rect.left - radius) / radius, y = (event.clientY - rect.top - radius) / radius;
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    knob.current!.style.transform = `translate(${x * radius * 0.6}px, ${y * radius * 0.6}px)`;
    sink?.setStick(Math.abs(x) < 0.12 ? 0 : x, Math.abs(y) < 0.12 ? 0 : -y);
  }
  function release() {
    active.current = null; sink?.setStick(0, 0);
    if (knob.current) knob.current.style.transform = '';
  }
  return (
    <div ref={pad} className={styles.joystick} role="presentation"
      onPointerDown={event => { active.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); update(event); }}
      onPointerMove={event => { if (active.current === event.pointerId) update(event); }}
      onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onContextMenu={event => event.preventDefault()}>
      <span ref={knob} className={styles.knob} />
    </div>
  );
}

export function ControlBar({ sink, interactLabel, onInteract }: { sink: StickSink | null; interactLabel: string | null; onInteract: () => void }) {
  const [running, setRunning] = useState(false);
  return (
    <div className={styles.controls} role="group" aria-label="Game controls">
      <button type="button" className={`${styles.button} ${styles.primary}`} disabled={!interactLabel} onClick={onInteract}>
        {interactLabel ? `Interact: ${interactLabel}` : 'Nothing nearby'}
      </button>
      <button type="button" className={`${styles.button} ${running ? styles.primary : ''}`} aria-pressed={running}
        onClick={() => { setRunning(!running); sink?.setRun(!running); }}>{running ? 'Running' : 'Run'}</button>
      <button type="button" className={styles.button} aria-label="Turn camera left" onClick={() => sink?.rotateCamera(Math.PI / 6)}>⟲</button>
      <button type="button" className={styles.button} aria-label="Turn camera right" onClick={() => sink?.rotateCamera(-Math.PI / 6)}>⟳</button>
      <button type="button" className={styles.button} aria-label="Zoom in" onClick={() => sink?.zoomCamera(0.82)}>＋</button>
      <button type="button" className={styles.button} aria-label="Zoom out" onClick={() => sink?.zoomCamera(1.2)}>－</button>
      <p className={styles.hint}>WASD or arrows walk relative to the camera · Shift sprints · E interacts · drag to look around · Q/Z turn the camera · R turns furniture while decorating.</p>
    </div>
  );
}
