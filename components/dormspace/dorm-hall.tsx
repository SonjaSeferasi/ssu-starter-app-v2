'use client';

import { useEffect, useRef, useState } from 'react';
import { floorCount, floorDoors, type Friend } from '../../lib/dormspace-rules';
import { doors, PixelArt, PixelAvatar, textures } from './campus-art';
import { TouchControls, useHeldMovement } from './shared';
import { useAvatarMotion } from './use-avatar-motion';
import { HALL_AVATAR_PX, hallMovement, type Position } from '../../lib/dormspace-movement';
import styles from './dormspace.module.css';
import type { PixelAvatarLook } from '../../lib/dormspace-avatar';
import type { DormLive } from './use-dorm-live';
import { LivePlayers,LocalPlayerAvatar,PlayerCaption } from './live-players';

type Slot = { kind: 'mine' } | { kind: 'friend'; friend: Friend } | { kind: 'vacant' } | { kind: 'elevator' };
const SLOTS = 11;
// Highest point the feet reach (percent of the hall floor): right up against the doors, which the
// avatar is drawn in front of. Interaction works from this edge down to DOOR_RANGE below it.
const HALL_TOP = 5;
const DOOR_RANGE = 14;
const center = (slot: number) => ((slot + 0.5) / SLOTS) * 100;

export function DormHall({ avatar, friends, floor, arriveAt, onFloorChange, onOpenDorm,live,username }: {
  avatar?: PixelAvatarLook; friends: Friend[]; floor: number; arriveAt: string | null;
  live?: DormLive; username?:string;
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
  const motion = useAvatarMotion({ x: center(arrivalSlot), y: HALL_TOP + 8 }, { columns: 100, rows: 100, anchorY: 85,onMove:live?.move });
  const [targetSlot, setTargetSlot] = useState(arrivalSlot);
  const targetRef = useRef(arrivalSlot);
  const [elevatorOpen, setElevatorOpen] = useState(false);
  const stage = useRef<HTMLDivElement>(null);

  function followAvatar() {
    const viewport = stage.current;
    if (!viewport) return;
    const x = motion.position.current.x / 100 * motion.size.current.width;
    if (x < viewport.scrollLeft + 40) viewport.scrollLeft = Math.max(0, x - 40);
    else if (x > viewport.scrollLeft + viewport.clientWidth - 40) viewport.scrollLeft = x - viewport.clientWidth + 40;
  }
  useEffect(() => { stage.current?.focus(); followAvatar(); }, []);

  function moveTo(next: Position) {
    motion.move(next);
    if(motion.sprite.current)motion.sprite.current.style.zIndex=String(Math.round(next.y)*2);
    const nearby = next.y <= HALL_TOP + DOOR_RANGE ? slots.findIndex((_, i) => Math.abs(next.x - center(i)) <= 50 / SLOTS) : -1;
    if (nearby !== targetRef.current) { targetRef.current = nearby; setTargetSlot(nearby); }
    followAvatar();
  }

  function step(delta: Position) {
    const floor = motion.size.current;
    const offset = hallMovement(delta, floor.width, floor.height);
    if (elevatorOpen) setElevatorOpen(false);
    const { x, y } = motion.position.current;
    moveTo({
      // SRS-504.7: the avatar stays inside the traversable hall.
      x: Math.min(97, Math.max(3, x + offset.x)),
      y: Math.min(96, Math.max(HALL_TOP, y + offset.y)),
    });
  }
  const walk = useHeldMovement(step);
  useEffect(()=>{live?.setLocal({...motion.position.current,facing:walk.facing,moving:walk.moving,sprinting:walk.sprinting,restItemId:null});},[live,walk.facing,walk.moving,walk.sprinting]);

  // Interaction range: standing in front of a door, near the hall wall.
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
    moveTo({ x: center(0), y: HALL_TOP + 8 });
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
        ref={stage} className={`${styles.stage} ${styles.hallStage}`} tabIndex={0} aria-label="DormHall movement area" aria-describedby="hall-help"
        onKeyDown={(event) => walk.onKeyDown(event, () => activate(target))} onKeyUp={walk.onKeyUp} onBlur={walk.releaseKeyboard}
      >
        <div className={styles.hallInterior}>
          <div className={styles.hallWall} style={{ backgroundImage: textures.hallWall.image }}>
            {slots.map((slot, i) => (
              <button
                key={slot.kind === 'friend' ? slot.friend.username : `${slot.kind}-${i}`}
                type="button" className={styles.door} data-target={i === targetSlot}
                onClick={() => { moveTo({ x: center(i), y: HALL_TOP }); activate(slot); }}
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
          <div ref={motion.area} className={styles.hallFloor} style={{ backgroundImage: textures.hallFloor.image }}>
            <span ref={motion.sprite} data-dorm-avatar className={styles.hallAvatar} style={{ width: HALL_AVATAR_PX }}>
              <LocalPlayerAvatar live={live} look={avatar} facing={walk.facing} moving={walk.moving} sprinting={walk.sprinting} />
              <PlayerCaption live={live} self name={username}/>
            </span>
            {live?<LivePlayers live={live} kind="hall" columns={100} rows={100} anchorY={85} size={motion.size}/>:null}
          </div>
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
