'use client';

import { useEffect, useRef, useState } from 'react';
import { floorCount, floorDoors, type Friend } from '../../lib/dormspace-rules';
import { doors, PixelArt, PixelAvatar, textures } from './pixel-art';
import { TouchControls, useHeldMovement, type Direction } from './shared';
import styles from './dormspace.module.css';

type Slot = { kind: 'mine' } | { kind: 'friend'; friend: Friend } | { kind: 'vacant' } | { kind: 'elevator' };
const SLOTS = 11;
const TICK_MS = 40;
const STEP_X = 1.1;
const STEP_Y = 2.6;
// Highest point the feet reach (percent of the hall floor): right up against the doors, which the
// avatar is drawn in front of. Interaction works from this edge down to DOOR_RANGE below it.
const HALL_TOP = 5;
const DOOR_RANGE = 14;
const center = (slot: number) => ((slot + 0.5) / SLOTS) * 100;

export function DormHall({ friends, floor, arriveAt, onFloorChange, onOpenDorm }: {
  friends: Friend[]; floor: number; arriveAt: string | null;
  onFloorChange: (floor: number) => void; onOpenDorm: (owner: string | null) => void;
}) {
  const floors = floorCount(friends.length);
  // SRS-507.2, SRS-507.5 to SRS-507.7: the elevator stands at the far left; My Dorm is the first door
  // on floor 1, followed by friend or Vacant doors.
  const slots: Slot[] = [
    { kind: 'elevator' },
    ...(floor === 1 ? [{ kind: 'mine' } as Slot] : []),
    ...floorDoors(friends, floor).map((friend): Slot => (friend ? { kind: 'friend', friend } : { kind: 'vacant' })),
  ];
  const arrivalSlot = Math.max(0, slots.findIndex((slot) => (arriveAt === null
    ? slot.kind === 'mine' : slot.kind === 'friend' && slot.friend.username === arriveAt)));
  const [position, setPosition] = useState({ x: center(arrivalSlot), y: HALL_TOP + 8 });
  const [elevatorOpen, setElevatorOpen] = useState(false);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => { stage.current?.focus(); }, []);

  function step(direction: Direction) {
    setElevatorOpen(false);
    setPosition(({ x, y }) => ({
      // SRS-504.7: the avatar stays inside the traversable hall.
      x: Math.min(97, Math.max(3, x + (direction === 'left' ? -STEP_X : direction === 'right' ? STEP_X : 0))),
      y: Math.min(96, Math.max(HALL_TOP, y + (direction === 'up' ? -STEP_Y : direction === 'down' ? STEP_Y : 0))),
    }));
  }
  const walk = useHeldMovement(step, TICK_MS);

  // Interaction range: standing in front of a door, near the hall wall.
  const targetSlot = position.y <= HALL_TOP + DOOR_RANGE ? slots.findIndex((_, i) => Math.abs(position.x - center(i)) <= 50 / SLOTS) : -1;
  const target = targetSlot >= 0 ? slots[targetSlot] : null;

  function activate(slot: Slot | null) {
    if (!slot) return;
    walk.releaseAll();
    if (slot.kind === 'mine') onOpenDorm(null);
    else if (slot.kind === 'friend') onOpenDorm(slot.friend.username);
    else if (slot.kind === 'elevator') setElevatorOpen((open) => !open);
    // SRS-507.8: a Vacant door leaves the student in the DormHall.
  }

  // SRS-507.11: arrive beside the elevator on the selected floor.
  function chooseFloor(next: number) {
    setElevatorOpen(false);
    setPosition({ x: center(0), y: HALL_TOP + 8 });
    onFloorChange(next);
    stage.current?.focus();
  }

  function label(slot: Slot) {
    if (slot.kind === 'mine') return 'My Dorm';
    if (slot.kind === 'friend') return slot.friend.username;
    if (slot.kind === 'vacant') return 'Vacant';
    return 'Elevator';
  }

  return (
    <section aria-label={`DormHall floor ${floor}`} className={styles.game}>
      <div className={styles.toolbar}>
        <h2>DormHall · Floor {floor} of {floors}</h2>
        <span className={styles.badge}>{friends.length === 1 ? '1 friend' : `${friends.length} friends`}</span>
      </div>

      <div
        ref={stage} className={styles.stage} tabIndex={0} aria-describedby="hall-help"
        onKeyDown={(event) => walk.onKeyDown(event, () => activate(target))} onKeyUp={walk.onKeyUp} onBlur={walk.releaseAll}
      >
        <div className={styles.hallWall} style={{ backgroundImage: textures.hallWall.image }}>
          {slots.map((slot, i) => (
            <button
              key={slot.kind === 'friend' ? slot.friend.username : `${slot.kind}-${i}`}
              type="button" className={styles.door} data-target={i === targetSlot}
              onClick={() => { setPosition({ x: center(i), y: HALL_TOP }); activate(slot); }}
              aria-label={slot.kind === 'friend' ? `${slot.friend.username}'s dorm` : label(slot)}
            >
              <span className={styles.plaque}>
                {slot.kind === 'friend' ? (
                  // SRS-507.3: username and profile picture, or the account default picture.
                  slot.friend.pictureUrl
                    ? <img src={slot.friend.pictureUrl} alt="" className={styles.portrait} />
                    : <span className={styles.portrait} aria-hidden="true">{slot.friend.username.slice(0, 1).toUpperCase()}</span>
                ) : null}
                <span className={styles.doorLabel}>{label(slot)}</span>
              </span>
              <PixelArt art={slot.kind === 'friend' ? doors.friend : doors[slot.kind]} className={styles.doorSprite} />
            </button>
          ))}
        </div>
        <div className={styles.hallFloor} style={{ backgroundImage: textures.hallFloor.image }}>
          <span className={styles.hallAvatar} style={{ left: `${position.x}%`, top: `${position.y}%`, transitionDuration: `${walk.tick}ms` }}>
            <PixelAvatar facing={walk.facing} moving={walk.moving} sprinting={walk.sprinting} />
          </span>
        </div>
      </div>

      {elevatorOpen ? (
        // SRS-507.10: one labeled button for every available floor.
        <div className={styles.panel} role="group" aria-label="Choose a floor">
          <h3>Elevator</h3>
          <div className={styles.inventory}>
            {Array.from({ length: floors }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" className={`${styles.button} ${n === floor ? styles.primary : ''}`}
                aria-current={n === floor ? 'true' : undefined} onClick={() => chooseFloor(n)}>Floor {n}</button>
            ))}
          </div>
        </div>
      ) : null}

      <TouchControls onPress={walk.press} onRelease={walk.release} onInteract={() => activate(target)} interactLabel={target ? label(target) : null}
        sprinting={walk.sprinting} onSprint={walk.setSprinting} />
      <p id="hall-help" className={styles.hint}>
        Walk up to a door and press E to go inside. Friends appear in the order you became friends; ride the elevator to reach other floors.
      </p>
    </section>
  );
}
