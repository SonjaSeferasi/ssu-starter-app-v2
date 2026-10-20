import { expect, it } from 'vitest';
import { restTargets, safeRestExit } from '../lib/dormspace-interactions';
import { moveInRoom } from '../lib/dormspace-movement';
import { placementProblem, roomSolidCells, type CatalogItem, type Dorm } from '../lib/dormspace-rules';

const item = (id: string, width: number, height: number, category: string): CatalogItem => ({ id, name: id, kind: 'furniture',
  previewKey: `dorm-${id}`, surface: 'floor', width, height, overlapCategory: category });
const catalog = [item('sofa', 3, 2, 'seat'), item('armchair', 2, 1, 'seat'), item('rug', 3, 2, 'rug'), item('plant', 1, 1, 'plant')];
const placements = [{ itemId: 'sofa', x: 2, y: 2 }, { itemId: 'rug', x: 2, y: 2 }, { itemId: 'armchair', x: 7, y: 4 }];

it('sits on both new seats and stands outside their full footprints, including a rug underneath', () => {
  const targets = restTargets(catalog, placements);
  expect(targets.map((target) => target.itemId)).toEqual(['sofa', 'armchair']);
  const solid = roomSolidCells(catalog, placements, 7);
  expect(solid.has('4,3')).toBe(true);
  expect(solid.has('8,4')).toBe(true);
  for (const target of targets) {
    const point = safeRestExit({ x: target.x, y: target.y }, target, 10, 7, solid)!;
    expect(solid.has(`${point.x},${point.y}`)).toBe(false);
  }
});

it('walks across rugs and still stops at raised furniture and the brown strip', () => {
  const rug = [{ itemId: 'rug', x: 2, y: 2 }];
  const rugOnly = roomSolidCells(catalog, rug, 7);
  expect(moveInRoom({ x: 1, y: 2 }, { x: 4, y: 0 }, 10, 6, rugOnly).x).toBeCloseTo(5, 8);
  const furnished = roomSolidCells(catalog, placements, 7);
  expect(moveInRoom({ x: 1, y: 2 }, { x: 4, y: 0 }, 10, 6, furnished).x).toBeLessThan(1.5);
  expect(moveInRoom({ x: 1, y: 6 }, { x: 0, y: 4 }, 10, 6, rugOnly).y).toBe(6);
});

it('uses server-provided rug pairs while preserving ordinary overlap and doorway feedback', () => {
  const dorm: Dorm = { owner: 'owner', isOwner: true, version: 1, wallItemId: null, floorItemId: null, visitCount: 0,
    placements, catalog, owned: catalog.map((item) => item.id), surfaces: [{ code: 'floor', width: 10, height: 7 }],
    reserved: [{ surface: 'floor', x: 4, y: 6 }], compatible: [['rug', 'sofa'], ['rug', 'plant']] };
  expect(placementProblem(dorm, placements, { itemId: 'rug', x: 2, y: 2 })).toBeNull();
  expect(placementProblem(dorm, placements, { itemId: 'plant', x: 3, y: 2 })).toBe('overlap');
  expect(placementProblem(dorm, placements, { itemId: 'rug', x: 4, y: 5 })).toBe('entrance');
});
