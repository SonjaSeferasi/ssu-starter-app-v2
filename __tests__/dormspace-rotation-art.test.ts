import { expect, it } from 'vitest';
import { furnitureSprites } from '../components/dormspace/pixel-art';
import { placementSize, ROTATIONS, type CatalogItem } from '../lib/dormspace-rules';

const sizes: [string, number, number][] = [['bed', 2, 3], ['desk', 3, 1], ['chair', 1, 1], ['dorm-sofa', 3, 2],
  ['dorm-armchair', 2, 1], ['dorm-bookshelf', 2, 1], ['dorm-wardrobe', 2, 1], ['dorm-coffee-table', 2, 1],
  ['dorm-nightstand', 1, 1], ['dorm-plant', 1, 1], ['dorm-rug', 3, 2]];

it.each(sizes)('keeps %s sprites aligned with every rotated footprint and caches action frames', (key, width, height) => {
  const item = { surface: 'floor', width, height } as CatalogItem;
  const views = [];
  for (const rotation of ROTATIONS) {
    const sprites = furnitureSprites(key, rotation)!;
    const size = placementSize(item, rotation);
    expect(sprites.idle.w).toBe(size.width * 24);
    expect(sprites.idle.h).toBeGreaterThanOrEqual(size.height * 24);
    expect(sprites.idle.px.length).toBeGreaterThan(0);
    expect(furnitureSprites(key, rotation)!.idle).toBe(sprites.idle);
    if (['bed', 'chair', 'dorm-sofa', 'dorm-armchair'].includes(key)) {
      expect(sprites.action).not.toBeNull();
      const action = sprites.action!;
      expect(action.frames[0].w).toBe(sprites.idle.w);
      expect(action.frames[0].h).toBe(sprites.idle.h);
      expect(action.sheet.w).toBe(sprites.idle.w * 2);
      expect(action.sheet.h).toBe(sprites.idle.h);
      expect(action.frames[0].px).not.toEqual(action.frames[1].px);
      expect(furnitureSprites(key, rotation)!.action).toBe(action);
    } else expect(sprites.action).toBeNull();
    views.push(sprites.idle.px);
  }
  expect(views[0]).not.toEqual(views[1]);
});
