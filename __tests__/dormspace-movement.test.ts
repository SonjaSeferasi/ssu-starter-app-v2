import { describe, expect, it } from 'vitest';
import { hallMovement, moveInRoom, movementDelta, movementVector, roomInteraction } from '../lib/dormspace-movement';

describe('DormSpace movement', () => {
  it('runs exactly 1.5 times as far as walking for the same elapsed time', () => {
    const walk = movementDelta(['right'], 40, false);
    const run = movementDelta(['right'], 40, true);
    expect(walk.x).toBeCloseTo(0.16);
    expect(run.x / walk.x).toBeCloseTo(1.5);
    expect(run.y).toBe(0);
  });

  it('covers the same distance diagonally as in a straight line', () => {
    for (const running of [false, true]) {
      const straight = movementDelta(['up'], 32, running);
      const diagonal = movementDelta(['up', 'right'], 32, running);
      expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(Math.abs(straight.y));
      expect(diagonal.x).toBeCloseTo(-diagonal.y);
    }
  });

  it('does not double speed for keyboard aliases and cancels opposing inputs', () => {
    expect(movementVector(['right', 'right'])).toEqual({ x: 1, y: 0 });
    expect(movementVector(['right', 'left', 'up'])).toEqual({ x: 0, y: -1 });
    expect(movementVector(['up', 'down', 'left', 'right'])).toEqual({ x: 0, y: 0 });
    expect(movementVector([])).toEqual({ x: 0, y: 0 });
  });

  it('moves the same distance at different normal frame rates', () => {
    const at20fps = movementDelta(['left'], 50, true).x * 20;
    const at60fps = movementDelta(['left'], 1000 / 60, true).x * 60;
    const at120fps = movementDelta(['left'], 1000 / 120, true).x * 120;
    expect(at20fps).toBeCloseTo(-6);
    expect(at60fps).toBeCloseTo(at20fps);
    expect(at120fps).toBeCloseTo(at20fps);
  });

  it('caps a stalled frame and ignores invalid or negative elapsed time', () => {
    expect(movementDelta(['down'], 10000, true).y).toBeCloseTo(0.3);
    for (const elapsed of [-5, NaN, Infinity]) expect(movementDelta(['down'], elapsed, true)).toEqual({ x: 0, y: 0 });
  });

  it('uses avatar widths for both hall axes at different viewport sizes', () => {
    for (const [width, height] of [[880, 180], [1300, 220]]) {
      const movement = hallMovement({ x: 2, y: -2 }, width, height);
      expect(movement.x / 100 * width / 52).toBeCloseTo(2);
      expect(movement.y / 100 * height / 52).toBeCloseTo(-2);
    }
    expect(hallMovement({ x: 1, y: 1 }, 0, 180)).toEqual({ x: 0, y: 0 });
  });
});

describe('continuous room movement', () => {
  it('stays within every room edge', () => {
    const empty = new Set<string>();
    expect(moveInRoom({ x: 0, y: 0 }, { x: -1, y: -1 }, 10, 7, empty)).toEqual({ x: 0, y: 0 });
    expect(moveInRoom({ x: 9, y: 7 }, { x: 1, y: 1 }, 10, 7, empty)).toEqual({ x: 9, y: 7 });
  });

  it('blocks the chair even when a displacement could cross its entire cell', () => {
    const next = moveInRoom({ x: 3, y: 7 }, { x: 0, y: -3 }, 10, 7, new Set(['3,6']));
    expect(next.x).toBe(3);
    expect(next.y).toBeGreaterThanOrEqual(6.5);
    expect(next.y).toBeLessThan(7);
  });

  it('slides along a solid cell without cutting diagonally through its corner', () => {
    const next = moveInRoom({ x: 2, y: 6 }, { x: 1, y: -1 }, 10, 7, new Set(['3,6']));
    expect(next.x).toBeLessThan(3);
    expect(next.y).toBeCloseTo(5);
    expect(Math.round(next.x) === 3 && Math.round(next.y) === 6).toBe(false);
  });

  it('allows furniture traversal unless its cell is marked solid', () => {
    const next = moveInRoom({ x: 3, y: 7 }, { x: 0, y: -2 }, 10, 7, new Set());
    expect(next.x).toBe(3);
    expect(next.y).toBeCloseTo(5);
  });

  it('blocks the guestbook stand but leaves its approach accessible', () => {
    const next = moveInRoom({ x: 2, y: 7 }, { x: -2, y: 0 }, 10, 7, new Set(['0,7', '1,7']));
    expect(next.x).toBeGreaterThanOrEqual(1.5);
    expect(roomInteraction(next, 7)).toBe('guestbook');
  });

  it('keeps exit and guestbook interactions reachable at fractional positions', () => {
    expect(roomInteraction({ x: 4.25, y: 6.4 }, 7)).toBe('exit');
    expect(roomInteraction({ x: 1.75, y: 6.8 }, 7)).toBe('guestbook');
    expect(roomInteraction({ x: 4, y: 4 }, 7)).toBeNull();
    expect(roomInteraction({ x: 8, y: 7 }, 7)).toBeNull();
  });
});
