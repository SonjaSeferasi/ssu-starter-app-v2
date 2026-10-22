export type Direction = 'up' | 'down' | 'left' | 'right';
export type Position = { x: number; y: number };

// One world unit is one avatar width in either view; room cells are one unit wide.
export const WALK_UNITS_PER_SECOND = 4;
export const SPRINT_SPEEDUP = 1.5;
export const WALK_CYCLE_MS = 300;
export const HALL_AVATAR_PX = 52;
const MAX_FRAME_MS = 50;
export const INPUT_NUDGE_MS = 1000 / 60;

export function movementVector(directions: Iterable<Direction>): Position {
  const held = new Set(directions);
  const x = Number(held.has('right')) - Number(held.has('left'));
  const y = Number(held.has('down')) - Number(held.has('up'));
  const length = Math.hypot(x, y);
  return length ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}

export function movementDelta(directions: Iterable<Direction>, elapsedMs: number, sprinting: boolean): Position {
  const vector = movementVector(directions);
  // Prevent a suspended/stalled frame from jumping across the scene on resumption.
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, Math.min(MAX_FRAME_MS, elapsedMs)) : 0;
  const distance = WALK_UNITS_PER_SECOND * (sprinting ? SPRINT_SPEEDUP : 1) * elapsed / 1000;
  return { x: vector.x * distance, y: vector.y * distance };
}

export function hallMovement(delta: Position, width: number, height: number): Position {
  return width > 0 && height > 0
    ? { x: delta.x * HALL_AVATAR_PX / width * 100, y: delta.y * HALL_AVATAR_PX / height * 100 }
    : { x: 0, y: 0 };
}

const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));

export function moveInRoom(position: Position, delta: Position, width: number, doorwayRow: number, solid: ReadonlySet<string>): Position {
  // Short substeps preserve chair/guestbook collisions at running speed and slide along obstacles.
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.y) / 0.2));
  let { x, y } = position;
  for (let step = 0; step < steps; step++) {
    const nextX = clamp(x + delta.x / steps, width - 1);
    if (!solid.has(`${Math.round(nextX)},${Math.round(y)}`)) x = nextX;
    const nextY = clamp(y + delta.y / steps, doorwayRow);
    if (!solid.has(`${Math.round(x)},${Math.round(nextY)}`)) y = nextY;
  }
  return x === position.x && y === position.y ? position : { x, y };
}

export function roomInteraction(position: Position, doorwayRow: number): 'exit' | 'guestbook' | null {
  const distanceTo = (left: number, right: number) => Math.hypot(
    position.x - Math.max(left, Math.min(right, position.x)), position.y - doorwayRow,
  );
  if (distanceTo(4, 5) <= 0.9) return 'exit';
  if (distanceTo(0, 1) <= 1.1) return 'guestbook';
  return null;
}
