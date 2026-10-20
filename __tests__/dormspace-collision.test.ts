import { describe, expect, it } from 'vitest';
import { roomSolidCells, type Dorm } from '../lib/dormspace-rules';

const dorm: Dorm = {
  owner: 'friend', isOwner: false, version: 1, wallItemId: null, floorItemId: null, visitCount: 1,
  owned: [],
  catalog: [
    { id: 'bed', kind: 'furniture', name: 'Bed', previewKey: 'bed', surface: 'floor', width: 2, height: 3, overlapCategory: 'bed' },
    { id: 'desk', kind: 'furniture', name: 'Desk', previewKey: 'desk', surface: 'floor', width: 3, height: 1, overlapCategory: 'desk' },
    { id: 'chair', kind: 'furniture', name: 'Chair', previewKey: 'chair', surface: 'floor', width: 1, height: 1, overlapCategory: 'seat' },
    { id: 'window', kind: 'decoration', name: 'Window', previewKey: 'window', surface: 'wall', width: 4, height: 4, overlapCategory: 'window' },
  ],
  placements: [
    { itemId: 'bed', x: 2, y: 1 }, { itemId: 'desk', x: 6, y: 4 },
    { itemId: 'chair', x: 8, y: 5 }, { itemId: 'window', x: 0, y: 0 },
  ],
  surfaces: [{ code: 'floor', width: 10, height: 7 }], reserved: [], compatible: [['desk', 'chair']],
};
const strip = (row: number, width = 10) => Array.from({ length: width }, (_, x) => `${x},${row}`);

describe('DormSpace furniture collision', () => {
  it.each([false, true])('blocks full bed, desk and chair footprints when isOwner=%s', (isOwner) => {
    const room = { ...dorm, isOwner, owned: isOwner ? ['bed', 'desk', 'chair', 'window'] : [] };
    const solid = roomSolidCells(room.catalog, room.placements, 7);

    expect(solid).toEqual(new Set([
      ...strip(7),
      '2,1', '3,1', '2,2', '3,2', '2,3', '3,3',
      '6,4', '7,4', '8,4', '8,5',
    ]));
    // Wall decorations, paths beside furniture, and the floor above the exit stay accessible.
    for (const cell of ['0,0', '1,1', '4,1', '2,4', '5,4', '9,4', '4,6', '5,6']) {
      expect(solid.has(cell), cell).toBe(false);
    }
  });

  it('keeps an overlapping desk and tucked chair solid without blocking extra cells', () => {
    const solid = roomSolidCells(dorm.catalog, [
      { itemId: 'desk', x: 6, y: 4 }, { itemId: 'chair', x: 7, y: 4 },
    ], 7);
    expect(solid).toEqual(new Set([...strip(7), '6,4', '7,4', '8,4']));
  });

  it('uses the displayed arrangement after moving or removing furniture', () => {
    expect(roomSolidCells(dorm.catalog, [{ itemId: 'desk', x: 0, y: 5 }], 7))
      .toEqual(new Set([...strip(7), '0,5', '1,5', '2,5']));
    expect(roomSolidCells(dorm.catalog, [], 7)).toEqual(new Set(strip(7)));
  });

  it('uses footprints independently of artwork and defaults missing dimensions to one cell', () => {
    const catalog = [{ ...dorm.catalog[2], previewKey: 'another-chair', width: null, height: null }];
    expect(roomSolidCells(catalog, [{ itemId: 'chair', x: 3, y: 2 }], 9))
      .toEqual(new Set([...strip(9), '3,2']));
  });

  it('blocks the complete brown fixture strip at the room width, including guestbook and exit art', () => {
    expect(roomSolidCells([], [], 7, 12)).toEqual(new Set(strip(7, 12)));
  });
});
