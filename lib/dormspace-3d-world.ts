// Pure 3D DormSpace world rules (no Three.js, no DOM). The saved room grid, live coordinates and
// server validation stay exactly as before; this module only maps them into metres and back.
//
// Room space: x to the right, z toward the room entrance, y up. The back (window) wall is z = 0.
// Grid cell (x, y) covers [x, x+1) × [y, y+1) cells; a live room position (as used by
// moveInRoom and dormspace_live) is a cell centre, so position (0, 0) is the middle of cell (0, 0).
// Hall space: live hall coordinates stay the existing 0-100 percentages that the server bounds.
import { placementProblem, placementMessages, placementSize, type CatalogItem, type Dorm, type Placement, type PlacementProblem, type Rotation } from './dormspace-rules';
import type { Direction, Position } from './dormspace-movement';
import { WALK_UNITS_PER_SECOND, SPRINT_SPEEDUP } from './dormspace-movement';

/** Metres per grid cell. One cell is one avatar width, matching the existing speed units. */
export const CELL = 0.62;
/** Wall height, and the vertical band of the back wall that the 10 × 5 wall grid occupies. */
export const WALL_HEIGHT = 2.75;
export const WALL_BAND_BOTTOM = 0.55;
export const WALL_BAND_TOP = 2.65;
/** Per-frame cap shared with the 2D views, so a stalled tab never teleports a player. */
export const MAX_FRAME_SECONDS = 0.05;

export type Surface = { code: string; width: number; height: number };
export type RoomDims = { columns: number; rows: number; wallColumns: number; wallRows: number; width: number; depth: number; floorDepth: number; wallCell: number };

export function roomDims(surfaces: Surface[]): RoomDims {
  const floor = surfaces.find(s => s.code === 'floor') ?? { code: 'floor', width: 10, height: 7 };
  const wall = surfaces.find(s => s.code === 'wall') ?? { code: 'wall', width: 10, height: 5 };
  return {
    columns: floor.width, rows: floor.height, wallColumns: wall.width, wallRows: wall.height,
    width: floor.width * CELL,
    // The fixture strip (guestbook and exit) is one extra row in front of the floor grid.
    floorDepth: floor.height * CELL, depth: (floor.height + 1) * CELL,
    wallCell: (WALL_BAND_TOP - WALL_BAND_BOTTOM) / wall.height,
  };
}

export type Vec2 = { x: number; z: number };
/** Centre of a live room position (cell-centred units) in metres. */
export function positionToWorld(position: Position, dims: RoomDims): Vec2 {
  return { x: (position.x + 0.5) * CELL - dims.width / 2, z: (position.y + 0.5) * CELL };
}
export function worldToPosition(point: Vec2, dims: RoomDims): Position {
  return { x: (point.x + dims.width / 2) / CELL - 0.5, y: point.z / CELL - 0.5 };
}
/** Floor cell under a world point, or null when outside the floor grid (including the fixture strip). */
export function worldToFloorCell(point: Vec2, dims: RoomDims): { x: number; y: number } | null {
  const x = Math.floor((point.x + dims.width / 2) / CELL), y = Math.floor(point.z / CELL);
  return x >= 0 && y >= 0 && x < dims.columns && y < dims.rows ? { x, y } : null;
}
/** Wall cell under a point on the back wall plane (x, height), or null outside the wall grid. */
export function worldToWallCell(x: number, height: number, dims: RoomDims): { x: number; y: number } | null {
  const column = Math.floor((x + dims.width / 2) / CELL), row = Math.floor((WALL_BAND_TOP - height) / dims.wallCell);
  return column >= 0 && row >= 0 && column < dims.wallColumns && row < dims.wallRows ? { x: column, y: row } : null;
}

/** Furniture faces +Z at 0°; a quarter turn clockwise (seen from above) faces +X, as in the 2D art. */
export const rotationYaw = (rotation: Rotation | undefined) => ((rotation ?? 0) * Math.PI) / 180;
export function rotateLocal(local: Vec2, yaw: number): Vec2 {
  return { x: local.x * Math.cos(yaw) + local.z * Math.sin(yaw), z: -local.x * Math.sin(yaw) + local.z * Math.cos(yaw) };
}

export type PlacedTransform = { x: number; y: number; z: number; yaw: number; width: number; depth: number; surface: 'floor' | 'wall' };
/** Where a placed item's model goes: footprint centre on the floor, or centre of its wall cells. */
export function placementTransform(item: CatalogItem, placement: Placement, dims: RoomDims): PlacedTransform {
  const rotation = placement.rotation ?? 0;
  const size = placementSize(item, rotation);
  if (item.surface === 'wall') {
    return {
      surface: 'wall', yaw: 0, width: size.width * CELL, depth: size.height * dims.wallCell,
      x: (placement.x + size.width / 2) * CELL - dims.width / 2,
      y: WALL_BAND_TOP - (placement.y + size.height / 2) * dims.wallCell, z: 0,
    };
  }
  return {
    surface: 'floor', yaw: rotationYaw(rotation), width: size.width * CELL, depth: size.height * CELL, y: 0,
    x: (placement.x + size.width / 2) * CELL - dims.width / 2, z: (placement.y + size.height / 2) * CELL,
  };
}

export type RestPose = 'sit' | 'sleep';
export type RestAnchor = { x: number; z: number; yaw: number; pose: RestPose; seatHeight: number; bedHeight: number };
/** Seat/mattress anchors in the model's unrotated local space (front +Z, bed pillow at -Z). */
const LOCAL_ANCHORS: Record<string, { local: Vec2; pose: RestPose; seatHeight?: number; bedHeight?: number }> = {
  chair: { local: { x: 0, z: 0.03 }, pose: 'sit', seatHeight: 0.46 },
  'dorm-armchair': { local: { x: 0, z: 0.05 }, pose: 'sit', seatHeight: 0.43 },
  'dorm-sofa': { local: { x: 0, z: 0.12 }, pose: 'sit', seatHeight: 0.43 },
  bed: { local: { x: 0, z: 0.04 }, pose: 'sleep', bedHeight: 0.56 },
};
export const RESTABLE_KEYS = Object.keys(LOCAL_ANCHORS);
/** Floor-level root point and yaw for a sitter/sleeper on a placed seat or bed, in every rotation. */
export function restAnchor(item: CatalogItem, placement: Placement, dims: RoomDims): RestAnchor | null {
  const anchor = LOCAL_ANCHORS[item.previewKey];
  if (!anchor || item.surface !== 'floor') return null;
  const t = placementTransform(item, placement, dims), offset = rotateLocal(anchor.local, t.yaw);
  return { x: t.x + offset.x, z: t.z + offset.z, yaw: t.yaw, pose: anchor.pose, seatHeight: anchor.seatHeight ?? 0.43, bedHeight: anchor.bedHeight ?? 0.55 };
}

// ---- Movement ----
/** Metres per second for walking/running: the existing 4 cells/s and 1.5× sprint. */
export const walkSpeed = (sprinting: boolean) => WALK_UNITS_PER_SECOND * (sprinting ? SPRINT_SPEEDUP : 1) * CELL;
/** Input (right, forward) in [-1, 1] turned into a world direction relative to the camera yaw. */
export function cameraRelative(input: { right: number; forward: number }, cameraYaw: number): Vec2 {
  const length = Math.hypot(input.right, input.forward);
  if (!length) return { x: 0, z: 0 };
  const right = input.right / Math.max(1, length), forward = input.forward / Math.max(1, length);
  // Camera at yaw θ sits at +(sin θ, cos θ) from its target, so "forward" is −(sin θ, cos θ).
  return { x: forward * -Math.sin(cameraYaw) + right * Math.cos(cameraYaw), z: forward * -Math.cos(cameraYaw) - right * Math.sin(cameraYaw) };
}
/** Four-way facing kept by the live protocol (down = toward the entrance, +z). */
export function facingFromVector(direction: Vec2, previous: Direction = 'down'): Direction {
  if (Math.abs(direction.x) < 1e-6 && Math.abs(direction.z) < 1e-6) return previous;
  return Math.abs(direction.x) > Math.abs(direction.z) ? direction.x > 0 ? 'right' : 'left' : direction.z > 0 ? 'down' : 'up';
}
export const yawFromFacing: Record<Direction, number> = { down: 0, right: Math.PI / 2, up: Math.PI, left: -Math.PI / 2 };
export const yawFromVector = (direction: Vec2) => Math.atan2(direction.x, direction.z);
/** Shortest-path angle interpolation. */
export function turnToward(current: number, target: number, amount: number) {
  let delta = (target - current) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * Math.min(1, Math.max(0, amount));
}
/** Arrow keys move the decorating cursor by grid steps relative to the camera's nearest quarter view. */
export function cursorStep(direction: Direction, cameraYaw: number): { dx: number; dy: number } {
  const quarter = ((Math.round(cameraYaw / (Math.PI / 2)) % 4) + 4) % 4;
  const base = { up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 }, left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 } }[direction];
  let { dx, dy } = base;
  // Rotate the grid step with the camera: each quarter turn of the view turns screen-up by 90°.
  for (let i = 0; i < quarter; i++) [dx, dy] = [dy, -dx];
  return { dx: dx || 0, dy: dy || 0 };
}

// ---- Orbit follow camera ----
export const CAMERA = { minPitch: 0.12, maxPitch: 1.18, minDistance: 1.8, maxDistance: 8.5, defaultPitch: 0.42, defaultDistance: 4.6, targetHeight: 1.25 };
export const clampPitch = (pitch: number) => Math.min(CAMERA.maxPitch, Math.max(CAMERA.minPitch, pitch));
export const clampDistance = (distance: number) => Math.min(CAMERA.maxDistance, Math.max(CAMERA.minDistance, distance));
export function orbitOffset(yaw: number, pitch: number, distance: number) {
  return { x: Math.sin(yaw) * Math.cos(pitch) * distance, y: Math.sin(pitch) * distance, z: Math.cos(yaw) * Math.cos(pitch) * distance };
}
export type Box = { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
/** Longest camera distance along `direction` (unit) from `target` that stays inside `box` (no wall clipping). */
export function clampOrbitDistance(target: { x: number; y: number; z: number }, direction: { x: number; y: number; z: number }, desired: number, box: Box, margin = 0.18) {
  let limit = desired;
  const axes: [number, number, number, number][] = [
    [target.x, direction.x, box.minX + margin, box.maxX - margin],
    [target.y, direction.y, box.minY + margin, box.maxY - margin],
    [target.z, direction.z, box.minZ + margin, box.maxZ - margin],
  ];
  for (const [origin, d, low, high] of axes) {
    if (d > 1e-6) limit = Math.min(limit, (high - origin) / d);
    else if (d < -1e-6) limit = Math.min(limit, (low - origin) / d);
  }
  return Math.max(0.6, limit);
}
/** Room walls to cut away so the camera never looks through solid geometry at the player. */
export function cutawayWalls(camera: Vec2, dims: RoomDims) {
  return {
    back: camera.z < 0.05, front: camera.z > dims.depth - 0.05,
    left: camera.x < -dims.width / 2 + 0.05, right: camera.x > dims.width / 2 - 0.05,
  };
}

// ---- Decorating ghost ----
export type GhostStatus = { valid: true; problem: null; message: string } | { valid: false; problem: PlacementProblem | 'surface'; message: string };
/** The existing placement rules, applied to a hover/keyboard candidate before it is committed. */
export function ghostStatus(dorm: Dorm, placements: Placement[], candidate: Placement, surface: 'floor' | 'wall'): GhostStatus {
  const item = dorm.catalog.find(entry => entry.id === candidate.itemId);
  if (item && item.surface !== surface) return { valid: false, problem: 'surface', message: `${item.name} belongs on the ${item.surface === 'wall' ? 'wall' : 'floor'}.` };
  const problem = placementProblem({ ...dorm, placements }, placements, candidate);
  return problem ? { valid: false, problem, message: placementMessages[problem] } : { valid: true, problem: null, message: 'This spot is free.' };
}

// ---- Shared DormHall layout ----
export const HALL_ROOMS_PER_FLOOR = 12;
export const HALL_LENGTH = 26;
export const HALL_WIDTH = 4.2;
export const HALL_HEIGHT = 3.1;
/** Server-validated hall bounds in live percentage units (dormspace_live.operate). */
export const HALL_BOUNDS = { minX: 3, maxX: 97, minY: 5, maxY: 96 };
const DOOR_START = -HALL_LENGTH / 2 + 5.5, DOOR_SPACING = (HALL_LENGTH - 7.5) / (HALL_ROOMS_PER_FLOOR / 2);
export type HallSide = 'north' | 'south';
/** Slots 0-5 line the north wall west to east; 6-11 the south wall west to east. */
export function hallDoorWorld(slot: number): { x: number; z: number; side: HallSide } {
  const side: HallSide = slot < HALL_ROOMS_PER_FLOOR / 2 ? 'north' : 'south';
  const index = slot % (HALL_ROOMS_PER_FLOOR / 2);
  return { x: DOOR_START + (index + 0.5) * DOOR_SPACING, z: side === 'north' ? -HALL_WIDTH / 2 : HALL_WIDTH / 2, side };
}
export const HALL_ELEVATOR = { x: -HALL_LENGTH / 2, z: 0 };
export function hallToWorld(position: Position): Vec2 {
  return { x: (position.x / 100 - 0.5) * HALL_LENGTH, z: (position.y / 100 - 0.5) * HALL_WIDTH };
}
export function worldToHall(point: Vec2): Position {
  return {
    x: Math.min(HALL_BOUNDS.maxX, Math.max(HALL_BOUNDS.minX, (point.x / HALL_LENGTH + 0.5) * 100)),
    y: Math.min(HALL_BOUNDS.maxY, Math.max(HALL_BOUNDS.minY, (point.z / HALL_WIDTH + 0.5) * 100)),
  };
}
/** Hall arrival point in front of a door (stepping out of it), or beside the elevator. */
export function hallArrival(slot: number | null): Position {
  if (slot === null) return worldToHall({ x: HALL_ELEVATOR.x + 1.4, z: 0 });
  const door = hallDoorWorld(slot);
  return worldToHall({ x: door.x, z: door.z + (door.side === 'north' ? 1.05 : -1.05) });
}
/** Spawn view for a hall arrival: the student and the follow camera look along the corridor (never
 * across it into the opposite wall), toward the end with more room. From the elevator (−X end) that is
 * +X; from a door it is whichever end is farther away. `yaw` is the avatar heading (yawFromVector) and
 * `cameraYaw` puts the orbit camera behind the student (orbitOffset). */
export function hallArrivalView(slot: number | null): { yaw: number; cameraYaw: number; heading: 1 | -1 } {
  const heading: 1 | -1 = slot === null || hallDoorWorld(slot).x <= 0 ? 1 : -1;
  return { heading, yaw: heading * Math.PI / 2, cameraYaw: -heading * Math.PI / 2 };
}
/** Next hall position: free movement inside the corridor, which has no furniture to collide with. */
export function moveInHall(position: Position, delta: Vec2): Position {
  const world = hallToWorld(position);
  return worldToHall({ x: world.x + delta.x, z: world.z + delta.z });
}
export type HallTarget = { kind: 'door'; slot: number } | { kind: 'elevator' };
/** The door or elevator within reach of a hall position (nearest wins). */
export function nearbyHallTarget(position: Position): HallTarget | null {
  const point = hallToWorld(position);
  let best: HallTarget | null = null, distance = Infinity;
  if (point.x < HALL_ELEVATOR.x + 2.1 && Math.abs(point.z) < 1.6) { best = { kind: 'elevator' }; distance = point.x - HALL_ELEVATOR.x; }
  for (let slot = 0; slot < HALL_ROOMS_PER_FLOOR; slot++) {
    const door = hallDoorWorld(slot), along = Math.abs(point.x - door.x), across = Math.abs(point.z - door.z);
    if (along <= 0.95 && across <= 1.45 && across + along < distance) { best = { kind: 'door', slot }; distance = across + along; }
  }
  return best;
}
export const hallRoomNumber = (floor: number, slot: number) => `${floor}${String(slot + 1).padStart(2, '0')}`;
export const hallFloorOfIndex = (index: number) => Math.floor(index / HALL_ROOMS_PER_FLOOR) + 1;
export const hallSlotOfIndex = (index: number) => index % HALL_ROOMS_PER_FLOOR;
