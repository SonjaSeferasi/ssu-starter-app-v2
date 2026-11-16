import { describe, expect, it } from 'vitest';
import {
  CELL, CAMERA, HALL_HEIGHT, HALL_LENGTH, HALL_WIDTH, cameraRelative, clampOrbitDistance, clampOrbitTarget,
  hallFloorOfIndex, hallSlotOfIndex, hallToWorld, orbitOffset,
  positionToWorld, roomDims, walkSpeed, worldToFloorCell, worldToPosition,
} from '../lib/dormspace-3d-world';
import { readHallDirectory, readFloorParam } from '../lib/dormspace-hall-contract';
import { readPendingPurchase, readPurchaseRequest } from '../lib/dormspace-shop-contract';

// Additional acceptance boundaries, 2026-11-10. Tests assert the user-visible
// contract independently of the current implementation, including fixed regressions.
describe('DormSpace 3D acceptance boundaries', () => {
  const dims = roomDims([{ code: 'floor', width: 10, height: 7 }, { code: 'wall', width: 10, height: 5 }]);
  it('maps every usable floor-cell centre back to its original saved position', () => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 10; x++) {
      const point = positionToWorld({ x, y }, dims);
      expect(worldToFloorCell(point, dims)).toEqual({ x, y });
      const saved = worldToPosition(point, dims);
      expect(saved.x).toBeCloseTo(x); expect(saved.y).toBeCloseTo(y);
    }
  });
  it('does not allow the fixture strip or outside edges to become placement cells', () => {
    for (const point of [{ x: -dims.width / 2 - 0.001, z: CELL },
      { x: dims.width / 2 + 0.001, z: CELL }, { x: 0, z: -0.001 },
      { x: 0, z: dims.floorDepth + 0.001 }]) expect(worldToFloorCell(point, dims)).toBeNull();
  });
  it('keeps running at 1.5 times walking and preserves partial joystick input at any camera angle', () => {
    expect(walkSpeed(true) / walkSpeed(false)).toBeCloseTo(1.5);
    for (let step = -16; step <= 16; step++) {
      const yaw = step * Math.PI / 8;
      for (const [right, forward] of [[0, 0], [0.3, 0.4], [1, 1], [-1, -1]]) {
        const direction = cameraRelative({ right, forward }, yaw);
        expect(Math.hypot(direction.x, direction.z)).toBeCloseTo(Math.min(1, Math.hypot(right, forward)));
      }
    }
  });
  it('allocates the thirteenth and twenty-fifth students to the next floor without changing earlier slots', () => {
    expect([11, 12, 23, 24].map(i => [hallFloorOfIndex(i), hallSlotOfIndex(i)]))
      .toEqual([[1, 11], [2, 0], [2, 11], [3, 0]]);
  });
  it.each(['0', '01', '1000', '-1', '1.0', '1e2', ' 1', 'Infinity'])('rejects malformed floor %s', floor => {
    expect(readFloorParam(floor)).toBe('invalid');
  });
  it('strips private fields from the directory and recomputes server-supplied door labels', () => {
    const result = readHallDirectory({ floor: 1, floorCount: 1, roomsPerFloor: 12,
      email: 'private@example.invalid', me: { username: 'owner', floor: 1, slot: 0, authId: 'private-id' },
      doors: [{ slot: 0, roomNumber: '999', state: 'own', username: 'owner', email: 'private@example.invalid' }] });
    expect(result?.doors[0]).toEqual({ slot: 0, roomNumber: '101', state: 'own', username: 'owner' });
    expect(JSON.stringify(result)).not.toMatch(/private|999/);
  });
  it.each([NaN, Infinity, -1, 0.5, Number.MAX_SAFE_INTEGER + 1])('rejects unsafe confirmed price %s', expectedPrice => {
    expect(typeof readPurchaseRequest({ itemId: '7', expectedPrice, actionKey: '22222222-2222-4222-8222-222222222222' })).toBe('string');
  });
  it('ignores a pending purchase copied from a different signed-in account', () => {
    const stored = JSON.stringify({ buyer: 'buyerScopeAAAAAAAAAAAAAAAAAAAAAA', key: '22222222-2222-4222-8222-222222222222', itemId: '7', name: 'Plant', expectedPrice: 150 });
    expect(readPendingPurchase(stored, 'buyerScopeBBBBBBBBBBBBBBBBBBBBBB')).toBeNull();
  });
});

describe('SRS-504.10 camera wall boundary regression', () => {
  const box = { minX: -2, maxX: 2, minY: 0, maxY: 3, minZ: -2, maxZ: 2 };
  it('keeps the shoulder target and orbit inside every hall corner across all camera angles', () => {
    const bounds = { minX: -HALL_LENGTH / 2, maxX: HALL_LENGTH / 2, minY: 0.2,
      maxY: HALL_HEIGHT, minZ: -HALL_WIDTH / 2, maxZ: HALL_WIDTH / 2 };
    for (const x of [3, 50, 97]) for (const y of [5, 50, 96]) {
      const player = hallToWorld({ x, y });
      for (let step = 0; step < 32; step++) for (const pitch of [CAMERA.minPitch, CAMERA.defaultPitch, CAMERA.maxPitch]) {
        const yaw = step * Math.PI / 16;
        const target = clampOrbitTarget({ x: player.x + Math.cos(yaw) * 0.28,
          y: CAMERA.targetHeight, z: player.z - Math.sin(yaw) * 0.28 }, bounds);
        const offset = orbitOffset(yaw, pitch, 1);
        const distance = clampOrbitDistance(target, offset, CAMERA.defaultDistance, bounds);
        expect(distance).toBeGreaterThan(0);
        expect(distance).toBeLessThanOrEqual(CAMERA.defaultDistance);
        for (const [axis, low, high] of [['x', bounds.minX, bounds.maxX],
          ['y', bounds.minY, bounds.maxY], ['z', bounds.minZ, bounds.maxZ]] as const) {
          const position = target[axis] + offset[axis] * distance;
          expect(position).toBeGreaterThanOrEqual(low);
          expect(position).toBeLessThanOrEqual(high);
        }
      }
    }
  });
  it('keeps the actual hall camera inside at the reachable south movement boundary', () => {
    const player = hallToWorld({ x: 50, y: 96 });
    // Match engine.updateCamera, including its over-the-shoulder offset at yaw 0.
    const target = { x: player.x + 0.28, y: CAMERA.targetHeight, z: player.z };
    const offset = orbitOffset(0, CAMERA.defaultPitch, 1);
    const distance = clampOrbitDistance(target, offset, CAMERA.defaultDistance, {
      minX: -HALL_LENGTH / 2, maxX: HALL_LENGTH / 2, minY: 0.2,
      maxY: HALL_HEIGHT, minZ: -HALL_WIDTH / 2, maxZ: HALL_WIDTH / 2,
    });
    expect(target.z + offset.z * distance).toBeLessThanOrEqual(HALL_WIDTH / 2);
  });
  // Near a wall, keeping the camera inside takes precedence over minimum zoom.
  // These inputs are valid targets already inside the configured 0.18 m margin.
  it.each([
    ['right', { x: 1.75, y: 1.2, z: 0 }, { x: 1, y: 0, z: 0 }],
    ['left', { x: -1.75, y: 1.2, z: 0 }, { x: -1, y: 0, z: 0 }],
    ['front', { x: 0, y: 1.2, z: 1.75 }, { x: 0, y: 0, z: 1 }],
    ['back', { x: 0, y: 1.2, z: -1.75 }, { x: 0, y: 0, z: -1 }],
  ] as const)('keeps the camera inside the %s wall when the player is close', (_wall, target, direction) => {
    const distance = clampOrbitDistance(target, direction, 4.6, box);
    const x = target.x + direction.x * distance, z = target.z + direction.z * distance;
    expect(x).toBeGreaterThanOrEqual(box.minX);
    expect(x).toBeLessThanOrEqual(box.maxX);
    expect(z).toBeGreaterThanOrEqual(box.minZ);
    expect(z).toBeLessThanOrEqual(box.maxZ);
  });
});
