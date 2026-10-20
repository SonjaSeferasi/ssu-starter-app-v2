// Pure DormSpace rules shared by the game UI and its tests. The server (public.socialu_dorm and
// the socialu placement triggers) remains the authority; these give immediate feedback.

export type CatalogItem = {
  id: string; kind: string; name: string; previewKey: string;
  surface: string | null; width: number | null; height: number | null; overlapCategory: string | null;
};
export const ROTATIONS = [0, 90, 180, 270] as const;
export type Rotation = typeof ROTATIONS[number];
export const rotationFacing: Record<Rotation, string> = { 0: 'front', 90: 'left', 180: 'back', 270: 'right' };
export function isRotation(value: unknown): value is Rotation { return typeof value === 'number' && ROTATIONS.includes(value as Rotation); }
export type Placement = { itemId: string; x: number; y: number; rotation?: Rotation };

export function placementSize(item: CatalogItem, rotation: Rotation = 0) {
  const width = item.width ?? 1, height = item.height ?? 1;
  return item.surface === 'floor' && (rotation === 90 || rotation === 270) ? { width: height, height: width } : { width, height };
}
export type Surface = { code: string; width: number; height: number };
export type ReservedCell = { surface: string; x: number; y: number };
export type Dorm = {
  owner: string; isOwner: boolean; version: number; wallItemId: string | null; floorItemId: string | null;
  visitCount: number; placements: Placement[]; owned: string[]; catalog: CatalogItem[];
  surfaces: Surface[]; reserved: ReservedCell[]; compatible: [string, string][];
};
export type Friend = { username: string; pictureUrl: string | null };

export const FIRST_FLOOR_FRIEND_DOORS = 9;
export const UPPER_FLOOR_FRIEND_DOORS = 10;

// SRS-507.9: one first floor plus the minimum ten-door floors for friends beyond the first nine.
export function floorCount(friendCount: number) {
  return 1 + Math.ceil(Math.max(0, friendCount - FIRST_FLOOR_FRIEND_DOORS) / UPPER_FLOOR_FRIEND_DOORS);
}

// SRS-507.5 to SRS-507.7: floor 1 holds friends 1-9 after My Dorm; floor f > 1 holds friends
// (10f - 10) through (10f - 1), counting the oldest friend as friend 1. Missing friends are Vacant (null).
export function floorDoors<T>(friends: T[], floor: number): (T | null)[] {
  const doors = floor === 1 ? FIRST_FLOOR_FRIEND_DOORS : UPPER_FLOOR_FRIEND_DOORS;
  const first = floor === 1 ? 1 : 10 * floor - 10;
  return Array.from({ length: doors }, (_, i) => friends[first + i - 1] ?? null);
}

// The floor holding a friend's current door (SRS-507.15), or 1 when the door no longer exists.
export function floorOfFriend(friends: Friend[], username: string) {
  const position = friends.findIndex((friend) => friend.username === username) + 1;
  if (position === 0 || position <= FIRST_FLOOR_FRIEND_DOORS) return 1;
  return Math.floor(position / 10) + 1;
}

export type PlacementProblem = 'not-owned' | 'rotation' | 'bounds' | 'entrance' | 'overlap';

export const placementMessages: Record<PlacementProblem, string> = {
  'not-owned': 'You can only place items you own.',
  rotation: 'Floor furniture can turn in quarter turns. Wall decorations stay upright.',
  bounds: 'That spot is outside the room. Keep the whole item inside the room.',
  entrance: 'That spot blocks the doorway. Leave the entrance clear.',
  overlap: 'Those items cannot overlap. Choose an empty spot.',
};

function cells(item: CatalogItem, x: number, y: number, rotation: Rotation = 0) {
  const { width, height } = placementSize(item, rotation);
  const list: [number, number][] = [];
  for (let dx = 0; dx < width; dx++) for (let dy = 0; dy < height; dy++) list.push([x + dx, y + dy]);
  return list;
}

// Raised furniture blocks walking; rugs sit beneath it and stay walkable. Visitors have no owned items.
export function roomSolidCells(catalog: CatalogItem[], placements: Placement[], doorwayRow: number, width = 10) {
  // The entire brown strip, including the guestbook and exit artwork, is scenery, not floor.
  const solid = new Set(Array.from({ length: width }, (_, x) => `${x},${doorwayRow}`));
  for (const placement of placements) {
    const item = catalog.find((entry) => entry.id === placement.itemId);
    if (!item || item.surface !== 'floor' || item.overlapCategory === 'rug') continue;
    for (const [x, y] of cells(item, placement.x, placement.y, placement.rotation)) solid.add(`${x},${y}`);
  }
  return solid;
}

// SRS-500.2, SRS-500.6 and SRS-500.8 to SRS-500.10, checked in the same order as the server trigger.
export function placementProblem(dorm: Dorm, placements: Placement[], candidate: Placement): PlacementProblem | null {
  const item = dorm.catalog.find((entry) => entry.id === candidate.itemId);
  if (!item || !item.surface || !dorm.owned.includes(candidate.itemId)) return 'not-owned';
  const rotation = candidate.rotation === undefined ? 0 : candidate.rotation;
  if (!isRotation(rotation) || (item.surface !== 'floor' && rotation !== 0)) return 'rotation';
  if (!Number.isInteger(candidate.x) || !Number.isInteger(candidate.y)) return 'bounds';
  // Moving an item re-checks it against everything else; one placement per item is kept by the caller.
  const others = placements.filter((placement) => placement.itemId !== candidate.itemId);
  const surface = dorm.surfaces.find((entry) => entry.code === item.surface);
  const size = placementSize(item, rotation);
  if (!surface || candidate.x < 0 || candidate.y < 0
    || candidate.x + size.width > surface.width || candidate.y + size.height > surface.height) return 'bounds';
  const footprint = cells(item, candidate.x, candidate.y, rotation);
  if (dorm.reserved.some((cell) => cell.surface === item.surface && footprint.some(([x, y]) => x === cell.x && y === cell.y))) return 'entrance';
  for (const other of others) {
    const otherItem = dorm.catalog.find((entry) => entry.id === other.itemId);
    if (!otherItem || otherItem.surface !== item.surface) continue;
    const overlaps = cells(otherItem, other.x, other.y, other.rotation).some(([ox, oy]) => footprint.some(([x, y]) => x === ox && y === oy));
    const permitted = dorm.compatible.some(([a, b]) => (a === item.id && b === otherItem.id) || (b === item.id && a === otherItem.id));
    if (overlaps && !permitted) return 'overlap';
  }
  return null;
}

// SRS-508.13, SRS-508.14: page 0 is the welcome page; later pages hold three notes each.
export const NOTES_PER_PAGE = 3;
export function guestbookPageCount(noteCount: number) {
  return 1 + Math.ceil(noteCount / NOTES_PER_PAGE);
}
export function guestbookPage<T>(notes: T[], page: number) {
  return page < 1 ? [] : notes.slice((page - 1) * NOTES_PER_PAGE, page * NOTES_PER_PAGE);
}

// SRS §2.3: DP character limits count Unicode code points.
export const DP_TEXT_LIMIT = 500;
export function codePointLength(text: string) {
  return Array.from(text).length;
}
