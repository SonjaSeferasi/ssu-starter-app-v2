import { expect, it } from 'vitest';
import { placementProblem, placementSize, roomSolidCells, type Dorm, type Rotation } from '../lib/dormspace-rules';
import { restTargets, safeRestExit } from '../lib/dormspace-interactions';

const dorm: Dorm = { owner: 'owner', isOwner: true, version: 1, wallItemId: null, floorItemId: null, visitCount: 0,
  placements: [], owned: ['bed', 'desk', 'plant', 'window', 'rug'], compatible: [['rug', 'bed'], ['rug', 'desk']],
  surfaces: [{ code: 'floor', width: 10, height: 7 }, { code: 'wall', width: 10, height: 5 }],
  reserved: [{ surface: 'floor', x: 4, y: 6 }, { surface: 'floor', x: 5, y: 6 }],
  catalog: [
    { id: 'bed', name: 'Bed', kind: 'furniture', previewKey: 'bed', surface: 'floor', width: 2, height: 3, overlapCategory: 'bed' },
    { id: 'desk', name: 'Desk', kind: 'furniture', previewKey: 'desk', surface: 'floor', width: 3, height: 1, overlapCategory: 'table' },
    { id: 'plant', name: 'Plant', kind: 'decoration', previewKey: 'dorm-plant', surface: 'floor', width: 1, height: 1, overlapCategory: 'plant' },
    { id: 'window', name: 'Window', kind: 'decoration', previewKey: 'window', surface: 'wall', width: 4, height: 4, overlapCategory: 'window' },
    { id: 'rug', name: 'Rug', kind: 'decoration', previewKey: 'dorm-rug', surface: 'floor', width: 3, height: 2, overlapCategory: 'rug' },
  ] };

it.each([0, 90, 180, 270] as Rotation[])('uses the %s degree bed footprint for sitting ranges, waking and collisions', (rotation) => {
  const size = placementSize(dorm.catalog[0], rotation);
  expect(size).toEqual(rotation % 180 ? { width: 3, height: 2 } : { width: 2, height: 3 });
  const placement = { itemId: 'bed', x: 1, y: 1, rotation };
  const solid = roomSolidCells(dorm.catalog, [placement], 7);
  const target = restTargets(dorm.catalog, [placement])[0];
  expect(target).toMatchObject({ ...size, rotation });
  expect(solid.size).toBe(16); // Six bed cells plus the full brown strip.
  const exit = safeRestExit({ x: 1, y: 1 }, target, 10, 7, solid)!;
  expect(solid.has(`${exit.x},${exit.y}`)).toBe(false);
  expect(solid.has(`${size.width},${size.height}`)).toBe(true);
});

it('checks rotated neighbors in both orders and keeps rugs walkable beneath them', () => {
  const desk = { itemId: 'desk', x: 1, y: 1, rotation: 90 as const };
  const plant = { itemId: 'plant', x: 1, y: 3 };
  expect(placementProblem(dorm, [desk], plant)).toBe('overlap');
  expect(placementProblem(dorm, [plant], desk)).toBe('overlap');
  const rug = { itemId: 'rug', x: 1, y: 1, rotation: 90 as const };
  expect(placementProblem(dorm, [desk], rug)).toBeNull();
  expect(roomSolidCells(dorm.catalog, [rug], 7).has('1,3')).toBe(false);
  expect(roomSolidCells(dorm.catalog, [desk, rug], 7).has('1,3')).toBe(true);
});

it('rejects impossible turns and rotated footprints crossing the entrance or room edges', () => {
  expect(placementProblem(dorm, [], { itemId: 'bed', x: 8, y: 0, rotation: 90 })).toBe('bounds');
  expect(placementProblem(dorm, [], { itemId: 'desk', x: 4, y: 4, rotation: 90 })).toBe('entrance');
  expect(placementProblem(dorm, [], { itemId: 'window', x: 0, y: 0, rotation: 90 })).toBe('rotation');
  expect(placementProblem(dorm, [], { itemId: 'bed', x: 1, y: 1, rotation: 45 as Rotation })).toBe('rotation');
});
