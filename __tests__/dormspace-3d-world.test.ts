import { describe, expect, it } from 'vitest';
import {
  CELL, HALL_BOUNDS, HALL_HEIGHT, HALL_LENGTH, HALL_ROOMS_PER_FLOOR, HALL_WIDTH, cameraRelative, clampOrbitDistance, cursorStep, facingFromVector, ghostStatus,
  hallArrival, hallArrivalView, hallDoorWorld, hallRoomNumber, hallToWorld, moveInHall, nearbyHallTarget, orbitOffset, placementTransform,
  positionToWorld, restAnchor, roomDims, rotateLocal, turnToward, worldToFloorCell, worldToHall, worldToPosition, worldToWallCell,
} from '../lib/dormspace-3d-world';
import { ROTATIONS, roomSolidCells, type CatalogItem, type Dorm } from '../lib/dormspace-rules';
import { moveInRoom } from '../lib/dormspace-movement';

const item = (id: string, previewKey: string, surface: 'floor' | 'wall', width: number, height: number, overlapCategory: string): CatalogItem =>
  ({ id, kind: surface === 'wall' ? 'decoration' : 'furniture', name: previewKey, previewKey, surface, width, height, overlapCategory });
const catalog = [item('1', 'bed', 'floor', 2, 3, 'bed'), item('2', 'window', 'wall', 4, 4, 'window'), item('3', 'desk', 'floor', 3, 1, 'desk'),
  item('4', 'chair', 'floor', 1, 1, 'seat'), item('5', 'dorm-sofa', 'floor', 3, 2, 'seat'), item('6', 'dorm-rug', 'floor', 3, 2, 'rug'), item('7', 'dorm-armchair', 'floor', 2, 1, 'seat')];
const surfaces = [{ code: 'floor', width: 10, height: 7 }, { code: 'wall', width: 10, height: 5 }];
const dorm: Dorm = {
  owner: 'dorm1', isOwner: true, version: 1, wallItemId: null, floorItemId: null, visitCount: 0, placements: [], owned: catalog.map(c => c.id), catalog,
  surfaces, reserved: [{ surface: 'floor', x: 4, y: 6 }, { surface: 'floor', x: 5, y: 6 }], compatible: [['6', '5'], ['3', '4']],
};
const dims = roomDims(surfaces);

describe('room mapping', () => {
  it('maps live room positions to metres and back, and cells under the floor only', () => {
    for (const p of [{ x: 0, y: 0 }, { x: 4.4, y: 6 }, { x: 9, y: 3.25 }]) {
      const back = worldToPosition(positionToWorld(p, dims), dims);
      expect(back.x).toBeCloseTo(p.x); expect(back.y).toBeCloseTo(p.y);
    }
    expect(worldToFloorCell(positionToWorld({ x: 9, y: 6 }, dims), dims)).toEqual({ x: 9, y: 6 });
    // The fixture strip (guestbook and exit) is in front of the grid, not a floor cell.
    expect(worldToFloorCell({ x: 0, z: dims.floorDepth + CELL / 2 }, dims)).toBeNull();
    expect(worldToWallCell(-dims.width / 2 + 0.01, 2.6, dims)).toEqual({ x: 0, y: 0 });
    expect(worldToWallCell(0, 0.2, dims)).toBeNull();
  });
  it('centres rotated footprints on the same cells the 2D rules use', () => {
    const sofa = catalog[4];
    for (const rotation of ROTATIONS) {
      const t = placementTransform(sofa, { itemId: '5', x: 1, y: 1, rotation }, dims);
      const turned = rotation === 90 || rotation === 270, w = turned ? 2 : 3, h = turned ? 3 : 2;
      expect(t.x).toBeCloseTo((1 + w / 2) * CELL - dims.width / 2);
      expect(t.z).toBeCloseTo((1 + h / 2) * CELL);
      expect(t.yaw).toBeCloseTo((rotation * Math.PI) / 180);
    }
    const window = placementTransform(catalog[1], { itemId: '2', x: 3, y: 0 }, dims);
    expect(window).toMatchObject({ surface: 'wall', yaw: 0, z: 0 });
  });
  it('puts seat and bed anchors inside the item and facing its front for every rotation', () => {
    for (const entry of [catalog[0], catalog[3], catalog[4], catalog[6]]) for (const rotation of ROTATIONS) {
      const placement = { itemId: entry.id, x: 2, y: 2, rotation };
      const anchor = restAnchor(entry, placement, dims)!;
      const t = placementTransform(entry, placement, dims);
      expect(Math.abs(anchor.x - t.x)).toBeLessThan(t.width / 2);
      expect(Math.abs(anchor.z - t.z)).toBeLessThan(t.depth / 2);
      const front = rotateLocal({ x: 0, z: 1 }, anchor.yaw);
      const expected = { 0: { x: 0, z: 1 }, 90: { x: 1, z: 0 }, 180: { x: 0, z: -1 }, 270: { x: -1, z: 0 } }[rotation];
      expect(front.x).toBeCloseTo(expected.x); expect(front.z).toBeCloseTo(expected.z);
      expect(anchor.pose).toBe(entry.previewKey === 'bed' ? 'sleep' : 'sit');
    }
    expect(restAnchor(catalog[2], { itemId: '3', x: 0, y: 0 }, dims)).toBeNull();
  });
  it('keeps collisions with raised furniture while rugs stay walkable', () => {
    const placements = [{ itemId: '3', x: 0, y: 2, rotation: 0 as const }, { itemId: '6', x: 5, y: 2, rotation: 0 as const }];
    const solid = roomSolidCells(catalog, placements, 7, 10);
    expect(moveInRoom({ x: 1, y: 4 }, { x: 0, y: -2 }, 10, 6, solid).y).toBeGreaterThan(2.4);
    expect(moveInRoom({ x: 6, y: 4 }, { x: 0, y: -1.5 }, 10, 6, solid).y).toBeCloseTo(2.5);
  });
});

describe('placement ghost', () => {
  it('uses the existing rules and names the problem', () => {
    const placements = [{ itemId: '5', x: 1, y: 1, rotation: 0 as const }];
    expect(ghostStatus(dorm, placements, { itemId: '6', x: 1, y: 1, rotation: 0 }, 'floor').valid).toBe(true); // rug under sofa
    expect(ghostStatus(dorm, placements, { itemId: '1', x: 2, y: 1, rotation: 0 }, 'floor')).toMatchObject({ valid: false, problem: 'overlap' });
    expect(ghostStatus(dorm, placements, { itemId: '4', x: 4, y: 6, rotation: 0 }, 'floor')).toMatchObject({ valid: false, problem: 'entrance' });
    expect(ghostStatus(dorm, placements, { itemId: '1', x: 9, y: 0, rotation: 0 }, 'floor')).toMatchObject({ valid: false, problem: 'bounds' });
    expect(ghostStatus(dorm, placements, { itemId: '2', x: 0, y: 0 }, 'floor')).toMatchObject({ valid: false, problem: 'surface' });
    expect(ghostStatus({ ...dorm, owned: ['5'] }, placements, { itemId: '4', x: 7, y: 2 }, 'floor')).toMatchObject({ valid: false, problem: 'not-owned' });
  });
});

describe('camera and controls', () => {
  it('moves relative to the camera with unit speed at most', () => {
    const forward = cameraRelative({ right: 0, forward: 1 }, 0);
    expect(forward.x).toBeCloseTo(0); expect(forward.z).toBeCloseTo(-1);
    const turned = cameraRelative({ right: 0, forward: 1 }, Math.PI / 2);
    expect(turned.x).toBeCloseTo(-1); expect(turned.z).toBeCloseTo(0);
    const diagonal = cameraRelative({ right: 1, forward: 1 }, 0.4);
    expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(1);
    // The forward vector points from the camera toward its target.
    const offset = orbitOffset(1.1, 0, 1), dir = cameraRelative({ right: 0, forward: 1 }, 1.1);
    expect(dir.x).toBeCloseTo(-offset.x); expect(dir.z).toBeCloseTo(-offset.z);
    expect(facingFromVector({ x: 0.2, z: 0.9 })).toBe('down');
    expect(facingFromVector({ x: -0.9, z: 0.2 })).toBe('left');
    expect(facingFromVector({ x: 0, z: 0 }, 'up')).toBe('up');
  });
  it('turns the decorating cursor with the nearest quarter view', () => {
    expect(cursorStep('up', 0)).toEqual({ dx: 0, dy: -1 });
    expect(cursorStep('up', Math.PI)).toEqual({ dx: 0, dy: 1 });
    expect(cursorStep('up', Math.PI / 2)).toEqual({ dx: -1, dy: 0 });
    expect(cursorStep('right', -Math.PI / 2)).toEqual({ dx: 0, dy: 1 });
  });
  it('shortens the orbit so the camera stays inside a box, and turns the short way', () => {
    const target = { x: 0, y: 1.2, z: 0 }, box = { minX: -2, maxX: 2, minY: 0, maxY: 3, minZ: -2, maxZ: 2 };
    const direction = orbitOffset(0, 0.3, 1);
    const distance = clampOrbitDistance(target, direction, 8, box);
    expect(target.z + direction.z * distance).toBeLessThanOrEqual(2);
    expect(target.y + direction.y * distance).toBeLessThanOrEqual(3);
    // 3 rad to -3 rad is a 0.28 rad turn across ±π, not a 6 rad spin.
    const turnedFully = turnToward(3, -3, 1);
    expect(Math.cos(turnedFully)).toBeCloseTo(Math.cos(-3)); expect(Math.sin(turnedFully)).toBeCloseTo(Math.sin(-3));
    expect(Math.abs(turnedFully - 3)).toBeLessThan(0.3);
    expect(Math.abs(turnToward(3.1, -3.1, 0.5) - 3.1)).toBeLessThan(0.1);
  });
});

describe('shared hall layout', () => {
  it('places twelve distinct doors inside the server bounds and reaches each from its arrival point', () => {
    const seen = new Set<string>();
    for (let slot = 0; slot < HALL_ROOMS_PER_FLOOR; slot++) {
      const door = hallDoorWorld(slot);
      seen.add(`${door.x.toFixed(2)},${door.z.toFixed(2)}`);
      const arrival = hallArrival(slot);
      expect(arrival.x).toBeGreaterThanOrEqual(HALL_BOUNDS.minX); expect(arrival.x).toBeLessThanOrEqual(HALL_BOUNDS.maxX);
      expect(arrival.y).toBeGreaterThanOrEqual(HALL_BOUNDS.minY); expect(arrival.y).toBeLessThanOrEqual(HALL_BOUNDS.maxY);
      expect(nearbyHallTarget(arrival)).toEqual({ kind: 'door', slot });
    }
    expect(seen.size).toBe(HALL_ROOMS_PER_FLOOR);
    expect(nearbyHallTarget(hallArrival(null))).toEqual({ kind: 'elevator' });
    expect(nearbyHallTarget({ x: 50, y: 50 })).toBeNull();
    expect(hallRoomNumber(3, 0)).toBe('301');
    expect(hallRoomNumber(1, 11)).toBe('112');
  });
  it('spawns every hall view looking down the corridor toward the longer side, not into a wall', () => {
    const box = { minX: -HALL_LENGTH / 2, maxX: HALL_LENGTH / 2, minY: 0.2, maxY: HALL_HEIGHT, minZ: -HALL_WIDTH / 2, maxZ: HALL_WIDTH / 2 };
    for (const slot of [null, ...Array.from({ length: HALL_ROOMS_PER_FLOOR }, (_, i) => i)]) {
      const view = hallArrivalView(slot), start = hallToWorld(hallArrival(slot));
      // Avatar heading is along ±X only, toward the end with more corridor ahead.
      expect(Math.sin(view.yaw)).toBeCloseTo(view.heading); expect(Math.abs(Math.cos(view.yaw))).toBeLessThan(1e-9);
      const ahead = view.heading > 0 ? HALL_LENGTH / 2 - start.x : start.x + HALL_LENGTH / 2;
      expect(ahead).toBeGreaterThanOrEqual(HALL_LENGTH / 2 - 0.01);
      // The camera looks the same way as the student (camera sits behind, at −heading along X).
      const behind = orbitOffset(view.cameraYaw, 0.3, 1);
      expect(Math.sign(behind.x)).toBe(-view.heading); expect(Math.abs(behind.z)).toBeLessThan(1e-9);
      // The clamp always keeps the camera strictly inside the hall with a positive distance.
      const target = { x: start.x, y: 1.25, z: start.z };
      const distance = clampOrbitDistance(target, behind, 3.8, box);
      const camera = { x: target.x + behind.x * distance, y: target.y + behind.y * distance, z: target.z + behind.z * distance };
      expect(distance).toBeGreaterThan(0); expect(distance).toBeLessThanOrEqual(3.8);
      expect(camera.x).toBeGreaterThan(box.minX); expect(camera.x).toBeLessThan(box.maxX);
      expect(camera.y).toBeGreaterThan(box.minY); expect(camera.y).toBeLessThan(box.maxY);
      expect(camera.z).toBeGreaterThan(box.minZ); expect(camera.z).toBeLessThan(box.maxZ);
      // Corridor behind the student along X (the camera's side); the orbit can only reach rear / |behind.x|.
      const rear = view.heading > 0 ? start.x - box.minX : box.maxX - start.x;
      if (slot === null) {
        // The elevator sits ~1.4 m from the end wall, so the safe clamp is short (~1.28 m), never past the wall.
        expect(distance).toBeLessThan(rear / Math.abs(behind.x));
      } else {
        // Every door spawn has room behind for most of the default distance, and gets it.
        expect(rear / Math.abs(behind.x)).toBeGreaterThan(3);
        expect(distance).toBeGreaterThan(3);
      }
    }
    expect(hallArrivalView(null).heading).toBe(1);
  });
  it('clamps hall movement to the bounds the live server accepts', () => {
    expect(moveInHall({ x: 50, y: 50 }, { x: 100, z: 100 })).toEqual({ x: HALL_BOUNDS.maxX, y: HALL_BOUNDS.maxY });
    const p = worldToHall(hallToWorld({ x: 40, y: 30 }));
    expect(p.x).toBeCloseTo(40); expect(p.y).toBeCloseTo(30);
  });
});
