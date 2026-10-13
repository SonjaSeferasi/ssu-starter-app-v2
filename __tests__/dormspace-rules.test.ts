import { describe, expect, it } from 'vitest';
import {
  codePointLength, floorCount, floorDoors, floorOfFriend, guestbookPage, guestbookPageCount, placementProblem, type Dorm,
} from '../lib/dormspace-rules';

const friends = (n: number) => Array.from({ length: n }, (_, i) => ({ username: `fr${i + 1}`, pictureUrl: null }));

describe('DormHall floors (SRS-507.5 to SRS-507.9)', () => {
  it.each([[0, 1], [1, 1], [9, 1], [10, 2], [19, 2], [20, 3], [29, 3], [30, 4]])('%i friends need %i floors', (n, floors) => {
    expect(floorCount(n)).toBe(floors);
  });

  it('puts friends 1-9 on floor 1 and 10f-10 to 10f-1 on later floors, with Vacant doors', () => {
    const list = friends(20);
    expect(floorDoors(list, 1).map((f) => f?.username)).toEqual(['fr1', 'fr2', 'fr3', 'fr4', 'fr5', 'fr6', 'fr7', 'fr8', 'fr9']);
    expect(floorDoors(list, 2).map((f) => f?.username)).toEqual(['fr10', 'fr11', 'fr12', 'fr13', 'fr14', 'fr15', 'fr16', 'fr17', 'fr18', 'fr19']);
    expect(floorDoors(list, 3)).toEqual([list[19], null, null, null, null, null, null, null, null, null]);
    expect(floorDoors([], 1)).toEqual(Array(9).fill(null));
  });

  it('finds the floor of a friend’s current door, or floor 1 when it is gone (SRS-507.15)', () => {
    const list = friends(25);
    expect(floorOfFriend(list, 'fr9')).toBe(1);
    expect(floorOfFriend(list, 'fr10')).toBe(2);
    expect(floorOfFriend(list, 'fr19')).toBe(2);
    expect(floorOfFriend(list, 'fr20')).toBe(3);
    expect(floorOfFriend(list, 'gone')).toBe(1);
  });
});

describe('placement rules (SRS-500.2 to SRS-500.10)', () => {
  const dorm: Dorm = {
    owner: 'me', isOwner: true, version: 1, wallItemId: null, floorItemId: null, visitCount: 0, placements: [],
    owned: ['bed', 'desk', 'chair', 'window'],
    catalog: [
      { id: 'bed', kind: 'furniture', name: 'Bed', previewKey: 'bed', surface: 'floor', width: 2, height: 3, overlapCategory: 'bed' },
      { id: 'desk', kind: 'furniture', name: 'Desk', previewKey: 'desk', surface: 'floor', width: 3, height: 1, overlapCategory: 'desk' },
      { id: 'chair', kind: 'furniture', name: 'Chair', previewKey: 'chair', surface: 'floor', width: 1, height: 1, overlapCategory: 'seat' },
      { id: 'window', kind: 'decoration', name: 'Window', previewKey: 'window', surface: 'wall', width: 2, height: 1, overlapCategory: 'window' },
      { id: 'lamp', kind: 'decoration', name: 'Lamp', previewKey: 'lamp', surface: 'floor', width: 1, height: 1, overlapCategory: 'lamp' },
    ],
    surfaces: [{ code: 'floor', width: 10, height: 7 }, { code: 'wall', width: 10, height: 2 }],
    reserved: [{ surface: 'floor', x: 4, y: 6 }, { surface: 'floor', x: 5, y: 6 }],
    compatible: [['desk', 'chair']],
  };

  it('accepts an item flush with the far edges and rejects one cell beyond', () => {
    expect(placementProblem(dorm, [], { itemId: 'bed', x: 8, y: 4 })).toBeNull();
    expect(placementProblem(dorm, [], { itemId: 'bed', x: 9, y: 4 })).toBe('bounds');
    expect(placementProblem(dorm, [], { itemId: 'bed', x: 8, y: 5 })).toBe('bounds');
    expect(placementProblem(dorm, [], { itemId: 'chair', x: -1, y: 0 })).toBe('bounds');
    expect(placementProblem(dorm, [], { itemId: 'chair', x: 0.5, y: 0 })).toBe('bounds');
  });

  it('keeps the entrance clear but allows adjacent cells', () => {
    expect(placementProblem(dorm, [], { itemId: 'chair', x: 4, y: 6 })).toBe('entrance');
    expect(placementProblem(dorm, [], { itemId: 'desk', x: 3, y: 6 })).toBe('entrance');
    expect(placementProblem(dorm, [], { itemId: 'chair', x: 3, y: 6 })).toBeNull();
    expect(placementProblem(dorm, [], { itemId: 'chair', x: 4, y: 5 })).toBeNull();
  });

  it('allows only compatible overlaps, and moving an item does not collide with itself', () => {
    const placed = [{ itemId: 'desk', x: 0, y: 0 }];
    expect(placementProblem(dorm, placed, { itemId: 'chair', x: 1, y: 0 })).toBeNull();
    expect(placementProblem(dorm, placed, { itemId: 'bed', x: 2, y: 0 })).toBe('overlap');
    expect(placementProblem(dorm, placed, { itemId: 'bed', x: 3, y: 0 })).toBeNull();
    expect(placementProblem(dorm, placed, { itemId: 'desk', x: 1, y: 0 })).toBeNull();
  });

  it('rejects items the owner does not own (SRS-500.6)', () => {
    expect(placementProblem(dorm, [], { itemId: 'lamp', x: 0, y: 0 })).toBe('not-owned');
  });
});

describe('guestbook pages (SRS-508.14)', () => {
  it.each([[0, 1], [1, 2], [3, 2], [4, 3], [6, 3], [7, 4]])('%i notes give %i pages including the welcome page', (n, pages) => {
    expect(guestbookPageCount(n)).toBe(pages);
  });

  it('shows three notes per page and none on the welcome page', () => {
    const notes = [1, 2, 3, 4, 5, 6, 7];
    expect(guestbookPage(notes, 0)).toEqual([]);
    expect(guestbookPage(notes, 1)).toEqual([1, 2, 3]);
    expect(guestbookPage(notes, 3)).toEqual([7]);
  });
});

describe('DP character counting (SRS §2.3)', () => {
  it('counts Unicode code points, so some emoji count as several characters', () => {
    expect(codePointLength('a'.repeat(500))).toBe(500);
    expect(codePointLength('👍🏽')).toBe(2);
    expect(codePointLength('👨‍👩‍👧')).toBe(5);
  });
});
