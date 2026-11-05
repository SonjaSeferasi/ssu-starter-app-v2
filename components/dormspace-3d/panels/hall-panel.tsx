'use client';
// Elevator floors, own-room shortcut and a keyboard-accessible list of this floor's doors. The list
// mirrors the 3D doors exactly (same numbers, names and lock states for every viewer in the school).
import { doorPresentation, type HallDirectory, type HallDoor } from '../../../lib/dormspace-hall-contract';
import styles from '../dormspace-3d.module.css';

export function HallPanel({ directory, busy, onFloor, onDoor, onClose }: {
  directory: HallDirectory; busy: boolean;
  onFloor: (floor: number) => void; onDoor: (door: HallDoor) => void; onClose: () => void;
}) {
  const floors = Array.from({ length: directory.floorCount }, (_, i) => i + 1);
  return (
    <aside className={styles.drawer} aria-label="Elevator and doors">
      <div className={styles.drawerHeader}><h3>Elevator</h3><button type="button" className={styles.button} aria-label="Close elevator" onClick={onClose}>Close</button></div>
      <p className={styles.hint}>Your room is {directory.me.roomNumber} on floor {directory.me.floor}. Everyone at your school sees the same room numbers.</p>
      <div className={styles.floors} role="group" aria-label="Choose a floor">
        {floors.map(floor => (
          <button key={floor} type="button" className={`${styles.button} ${floor === directory.floor ? styles.primary : ''}`} disabled={busy}
            aria-current={floor === directory.floor ? 'true' : undefined} onClick={() => onFloor(floor)}>Floor {floor}</button>
        ))}
      </div>
      <h3>Doors on floor {directory.floor}</h3>
      <ul className={styles.doors}>
        {directory.doors.map(door => {
          const shown = doorPresentation(door);
          return (
            <li key={door.slot}>
              <strong>{door.roomNumber}</strong>
              <span>{door.state === 'own' ? 'Your room' : shown.title}</span>
              <span className={styles.doorState}>{shown.status}</span>
              <button type="button" className={styles.button} disabled={busy || !shown.enterable} onClick={() => onDoor(door)}
                aria-label={shown.enterable ? `Enter room ${door.roomNumber}${door.username ? `, ${door.username}` : ''}` : `Room ${door.roomNumber} is ${shown.status.toLowerCase()}`}>
                {shown.enterable ? 'Enter' : 'Locked'}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
