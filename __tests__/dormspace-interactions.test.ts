import { describe, expect, it } from 'vitest';
import { distanceToFurniture, nearbyRoomTarget, restTargets, safeRestExit } from '../lib/dormspace-interactions';
import { moveInRoom } from '../lib/dormspace-movement';
import { roomSolidCells, type CatalogItem } from '../lib/dormspace-rules';

const catalog: CatalogItem[] = [
  { id: 'bed', kind: 'furniture', name: 'Bed', previewKey: 'bed', surface: 'floor', width: 2, height: 3, overlapCategory: 'bed' },
  { id: 'chair', kind: 'furniture', name: 'Chair', previewKey: 'chair', surface: 'floor', width: 1, height: 1, overlapCategory: 'seat' },
  { id: 'desk', kind: 'furniture', name: 'Desk', previewKey: 'desk', surface: 'floor', width: 3, height: 1, overlapCategory: 'desk' },
  { id: 'window', kind: 'decoration', name: 'Window', previewKey: 'window', surface: 'wall', width: 4, height: 4, overlapCategory: 'window' },
];
const placements = [{ itemId: 'bed', x: 1, y: 1 }, { itemId: 'chair', x: 7, y: 4 }, { itemId: 'window', x: 0, y: 0 }];
const targets = restTargets(catalog, placements);
const solid = roomSolidCells(catalog, placements, 7);

describe('DormSpace furniture interactions', () => {
  it('offers only placed floor beds and chairs, including visitor catalogs without ownership data', () => {
    expect(targets.map((target) => target.kind)).toEqual(['bed', 'chair']);
    expect(restTargets(catalog, [])).toEqual([]);
    expect(restTargets(catalog, [{ itemId: 'unknown', x: 1, y: 1 }])).toEqual([]);
  });

  it('uses the full bed footprint for nearby interactions', () => {
    expect(nearbyRoomTarget({ x: 3, y: 2 }, targets, 7)?.kind).toBe('bed');
    expect(nearbyRoomTarget({ x: 2, y: 4 }, targets, 7)?.kind).toBe('bed');
    expect(nearbyRoomTarget({ x: 7, y: 5 }, targets, 7)?.kind).toBe('chair');
    expect(nearbyRoomTarget({ x: 9, y: 0 }, targets, 7)).toBeNull();
  });

  it('keeps exit and guestbook usable from the last walkable floor row', () => {
    expect(nearbyRoomTarget({ x: 4, y: 6 }, targets, 7)?.kind).toBe('exit');
    expect(nearbyRoomTarget({ x: 1, y: 6 }, targets, 7)?.kind).toBe('guestbook');
  });

  it('prioritizes the closer fixture rather than an adjacent chair at the exit', () => {
    const nearby = restTargets(catalog, [{ itemId: 'chair', x: 3, y: 6 }]);
    expect(nearbyRoomTarget({ x: 4, y: 6 }, nearby, 7)?.kind).toBe('exit');
  });

  it('returns to the same clear fractional position when already beside the bed', () => {
    const point = { x: 2.7, y: 2 };
    expect(safeRestExit(point, targets[0], 10, 7, solid)).toEqual(point);
  });

  it('finds a clear spot beside the bed after direct click/tap from farther away', () => {
    const point = safeRestExit({ x: 4, y: 6 }, targets[0], 10, 7, solid)!;
    expect(distanceToFurniture(point, targets[0])).toBeLessThanOrEqual(1.1);
    expect(solid.has(`${Math.round(point.x)},${Math.round(point.y)}`)).toBe(false);
    expect(point.y).toBeLessThan(7);
  });

  it('stands outside both the chair and desk when the chair is tucked into the desk', () => {
    const arrangement = [{ itemId: 'desk', x: 6, y: 4 }, { itemId: 'chair', x: 7, y: 4 }];
    const blocked = roomSolidCells(catalog, arrangement, 7);
    const point = safeRestExit({ x: 4, y: 6 }, restTargets(catalog, arrangement)[0], 10, 7, blocked)!;
    expect(blocked.has(`${point.x},${point.y}`)).toBe(false);
    expect(distanceToFurniture(point, restTargets(catalog, arrangement)[0])).toBeLessThanOrEqual(1.1);
  });

  it('uses clear floor farther away when every adjacent square is blocked', () => {
    const blocked = new Set<string>();
    for (let y = 0; y < 7; y++) for (let x = 0; x < 10; x++) if (x !== 4 || y !== 6) blocked.add(`${x},${y}`);
    expect(safeRestExit({ x: 0, y: 0 }, targets[0], 10, 7, blocked)).toEqual({ x: 4, y: 6 });
  });

  it('declines a rest if no clear return position exists', () => {
    expect(safeRestExit({ x: 0, y: 0 }, targets[0], 1, 1, new Set(['0,0']))).toBeNull();
  });

  it('never walks or runs onto any part of the brown strip or guestbook', () => {
    const fixtures = roomSolidCells([], [], 7);
    for (let x = 0; x < 10; x++) {
      const point = moveInRoom({ x, y: 6 }, { x: 0, y: 5 }, 10, 6, fixtures);
      expect(point).toEqual({ x, y: 6 });
      expect(point.y + 0.9).toBeLessThan(7); // The avatar's feet remain above the strip.
    }
  });
});
