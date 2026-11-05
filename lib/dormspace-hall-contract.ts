// Shared DormHall directory contract (SRS-507 stable shared doors). Pure: used by the API route to
// validate requests and whitelist the bridge's response, and by the 3D client to read it.
import { HALL_ROOMS_PER_FLOOR, hallRoomNumber } from './dormspace-3d-world';

/** own: the viewer's room. friend: a current friend (may enter). locked: a schoolmate who is not a
 * current friend (name shown, entry denied). withheld: blocked/inactive/unavailable — the door keeps
 * its number but shows no identity. vacant: no room assigned yet. */
export const DOOR_STATES = ['own', 'friend', 'locked', 'withheld', 'vacant'] as const;
export type DoorState = typeof DOOR_STATES[number];
export type HallDoor = { slot: number; roomNumber: string; state: DoorState; username: string | null };
export type HallDirectory = {
  floor: number; floorCount: number; roomsPerFloor: number;
  me: { username: string; floor: number; slot: number; roomNumber: string };
  doors: HallDoor[];
};
export type HallLocation = { username: string; floor: number; slot: number; roomNumber: string } | null;

export const MAX_HALL_FLOOR = 999;
const USERNAME = /^[^\u0000-\u001f]{1,100}$/;

/** `?floor=` is optional (own floor); otherwise a whole number 1-999. */
export function readFloorParam(value: string | null): number | null | 'invalid' {
  if (value === null || value === '') return null;
  if (!/^[1-9]\d{0,2}$/.test(value)) return 'invalid';
  return Number(value);
}
export function readUsernameParam(value: string | null) {
  const trimmed = (value ?? '').trim();
  return trimmed && trimmed.length <= 100 && USERNAME.test(trimmed) ? trimmed : null;
}

const integer = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

/** Validates the bridge result and keeps only the fields the client is allowed to see. */
export function readHallDirectory(value: unknown): HallDirectory | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>, me = raw.me as Record<string, unknown> | undefined;
  if (!integer(raw.floor, 1, MAX_HALL_FLOOR) || !integer(raw.floorCount, 1, MAX_HALL_FLOOR) || (raw.floor as number) > (raw.floorCount as number)) return null;
  if (raw.roomsPerFloor !== HALL_ROOMS_PER_FLOOR || !me || typeof me.username !== 'string' || !USERNAME.test(me.username)
    || !integer(me.floor, 1, MAX_HALL_FLOOR) || !integer(me.slot, 0, HALL_ROOMS_PER_FLOOR - 1) || !Array.isArray(raw.doors)) return null;
  const floor = raw.floor as number, seen = new Set<number>();
  const doors: HallDoor[] = [];
  for (const entry of raw.doors) {
    const door = entry as Record<string, unknown>;
    if (!door || !integer(door.slot, 0, HALL_ROOMS_PER_FLOOR - 1) || seen.has(door.slot as number)
      || !DOOR_STATES.includes(door.state as DoorState)) return null;
    const state = door.state as DoorState;
    const named = state === 'own' || state === 'friend' || state === 'locked';
    if (named ? typeof door.username !== 'string' || !USERNAME.test(door.username) : door.username !== null && door.username !== undefined) return null;
    seen.add(door.slot as number);
    doors.push({ slot: door.slot as number, roomNumber: hallRoomNumber(floor, door.slot as number), state, username: named ? door.username as string : null });
  }
  // Every slot is present so all viewers see the same doors in the same places.
  for (let slot = 0; slot < HALL_ROOMS_PER_FLOOR; slot++) if (!seen.has(slot)) doors.push({ slot, roomNumber: hallRoomNumber(floor, slot), state: 'vacant', username: null });
  doors.sort((a, b) => a.slot - b.slot);
  return {
    floor, floorCount: raw.floorCount as number, roomsPerFloor: HALL_ROOMS_PER_FLOOR, doors,
    me: { username: me.username, floor: me.floor as number, slot: me.slot as number, roomNumber: hallRoomNumber(me.floor as number, me.slot as number) },
  };
}

export function readHallLocation(value: unknown): HallLocation {
  if (!value || typeof value !== 'object') return null;
  const raw = (value as Record<string, unknown>).location as Record<string, unknown> | null | undefined;
  if (!raw || typeof raw.username !== 'string' || !USERNAME.test(raw.username) || !integer(raw.floor, 1, MAX_HALL_FLOOR) || !integer(raw.slot, 0, HALL_ROOMS_PER_FLOOR - 1)) return null;
  return { username: raw.username, floor: raw.floor as number, slot: raw.slot as number, roomNumber: hallRoomNumber(raw.floor as number, raw.slot as number) };
}

/** Door labels and whether walking up to it may request entry. Entry itself is still authorized by /api/dorm. */
export function doorPresentation(door: HallDoor) {
  switch (door.state) {
    case 'own': return { title: 'Your room', subtitle: door.username ?? '', enterable: true, status: 'Your room' };
    case 'friend': return { title: door.username ?? '', subtitle: 'Friend', enterable: true, status: 'Friend · open' };
    case 'locked': return { title: door.username ?? '', subtitle: 'Locked', enterable: false, status: 'Locked · friends only' };
    case 'withheld': return { title: 'Private', subtitle: 'Locked', enterable: false, status: 'Locked' };
    default: return { title: 'Vacant', subtitle: '', enterable: false, status: 'Vacant' };
  }
}
