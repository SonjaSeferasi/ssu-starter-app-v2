'use client';
// The shared DormHall in 3D: same doors for every viewer in the school, elevator floors and the
// own-room shortcut. Entering a door asks /api/dorm, which admits only the owner or a current friend.
import { useEffect, useRef, useState } from 'react';
import { doorPresentation, type HallDirectory, type HallDoor } from '../../lib/dormspace-hall-contract';
import { hallArrival } from '../../lib/dormspace-3d-world';
import type { SceneTarget } from './scene/engine';
import type { LayerProps } from './layer-types';
import { HallPanel } from './panels/hall-panel';
import styles from './dormspace-3d.module.css';

export function HallLayer({ engine, self, register, onInteractLabel, notify, directory, arrivalSlot, busy, onEnter, onFloor }: LayerProps & {
  directory: HallDirectory; arrivalSlot: number | null; busy: boolean;
  onEnter: (door: HallDoor) => void; onFloor: (floor: number) => void;
}) {
  const [target, setTarget] = useState<SceneTarget | null>(null);
  const [elevatorOpen, setElevatorOpen] = useState(false);
  const targetRef = useRef(target); targetRef.current = target;
  const doorAt = (slot: number) => directory.doors.find(door => door.slot === slot);

  function openDoor(door: HallDoor | undefined) {
    if (!door) return;
    const shown = doorPresentation(door);
    if (shown.enterable) onEnter(door);
    // SRS-507.8 and SRS-507.21: vacant and locked doors leave the student in the hall.
    else notify(door.state === 'locked' ? `Room ${door.roomNumber} belongs to ${door.username}. Only their current friends can go in.`
      : door.state === 'withheld' ? `Room ${door.roomNumber} is private.` : `Room ${door.roomNumber} is vacant.`);
  }
  function activate(next: SceneTarget | null) {
    if (!next || busy) return;
    if (next.kind === 'elevator') setElevatorOpen(open => !open);
    else if (next.kind === 'door') openDoor(doorAt(next.slot));
  }

  register({
    onTarget: next => setTarget(next),
    onInteract: () => activate(targetRef.current),
    onActivate: next => {
      // Clicking a door walks the student to it, then uses it (as in the campus version).
      if (next.kind === 'door') engine?.setPosition(hallArrival(next.slot));
      activate(next);
    },
    onRotate() {}, onCursor() {}, onNudge() {}, onPlace() {}, onSelectPlaced() {}, onStandUp() {},
    onEscape: () => setElevatorOpen(false),
    blocked: () => false,
  });

  // Hall targets are only the elevator and doors; room targets never reach this layer.
  function hallLabel(next: SceneTarget | null): string | null {
    if (!next) return null;
    if (next.kind === 'elevator') return 'Elevator';
    if (next.kind !== 'door') return null;
    const door = doorAt(next.slot);
    if (!door) return null;
    const shown = doorPresentation(door);
    return shown.enterable ? `Enter ${door.roomNumber}${door.state === 'own' ? ' (your room)' : ` · ${door.username}`}` : `${door.roomNumber} · ${shown.status}`;
  }
  const label = hallLabel(target);
  useEffect(() => { onInteractLabel(label); }, [label, onInteractLabel]);

  // Sync the hall scene: same directory doors for every viewer; arrival from the elevator or a door.
  useEffect(() => {
    engine?.setScene({ kind: 'hall', key: `hall:${directory.floor}:${arrivalSlot ?? 'elevator'}`, floor: directory.floor, floorCount: directory.floorCount, doors: directory.doors, arrivalSlot, self });
  }, [engine, directory, arrivalSlot, self]);

  return (
    <>
      <div className={styles.hud} data-scene="hall" data-floor={directory.floor}>
        <span className={styles.chip}>DormHall · Floor {directory.floor} of {directory.floorCount}</span>
        <span className={styles.chip}>Your room {directory.me.roomNumber}</span>
        <span className={styles.spacer} />
        <button type="button" className={styles.button} disabled={busy} onClick={() => openDoor(directory.doors.find(d => d.state === 'own') ?? { slot: directory.me.slot, roomNumber: directory.me.roomNumber, state: 'own', username: directory.me.username })}
          title="Open your own room">My room</button>
        <button type="button" className={styles.button} onClick={() => setElevatorOpen(open => !open)} aria-expanded={elevatorOpen}>Elevator &amp; doors</button>
      </div>
      {label ? <div className={styles.prompt} role="status"><kbd>E</kbd><span>{label}</span>
        <button type="button" className={`${styles.button} ${styles.primary}`} disabled={busy} onClick={() => activate(targetRef.current)}>Go</button></div> : null}
      {elevatorOpen ? (
        <HallPanel directory={directory} busy={busy}
          onFloor={floor => { setElevatorOpen(false); if (floor !== directory.floor) onFloor(floor); }}
          onDoor={door => { engine?.setPosition(hallArrival(door.slot)); openDoor(door); }}
          onClose={() => setElevatorOpen(false)} />
      ) : null}
    </>
  );
}
