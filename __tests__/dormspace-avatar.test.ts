import { describe, expect, it } from 'vitest';
import { defaultPixelLook, pixelHairstyles, pixelOutfits, resolveDormAvatar } from '../lib/dormspace-avatar';
import { faceDetails, gameRoomSamples, pantsColors, shirtColors } from '../lib/game-room';
import { pixelAvatarLayers, pixelAvatarSprites } from '../components/dormspace/avatar-pieces';
import { furnitureSprites } from '../components/dormspace/pixel-art';
import { ROTATIONS } from '../lib/dormspace-rules';
import type { Direction } from '../lib/dormspace-movement';

const directions: Direction[] = ['down', 'up', 'left', 'right'];
const keys = { hair: pixelHairstyles, outfit: pixelOutfits, face: faceDetails.map(x => x.id), shirt: shirtColors.map(x => x.id), pants: pantsColors.map(x => x.id) };
describe('saved Game Room to pixel pieces', () => {
  it('resolves account IDs through asset keys and uses exactly the Game Room legacy defaults', () => {
    const data = { ...gameRoomSamples, faces: gameRoomSamples.faces.map((x, i) => ({ ...x, id: String(100 + i) })), outfits: gameRoomSamples.outfits.map((x, i) => ({ ...x, id: String(200 + i) })),
      appearance: { outfitId: '201', faceId: '108' } };
    expect(resolveDormAvatar(data)).toEqual({ look: { ...defaultPixelLook, body: 'female', hair: 'sample-curly-bob', outfit: 'sample-study', shirt: 'cream' }, notice: '' });
    expect(resolveDormAvatar({ ...data, appearance: { outfitId: '202', faceId: '102' } }).look).toEqual({ ...defaultPixelLook, outfit: 'sample-weekend', shirt: 'green', face: 'square-glasses' });
    expect(resolveDormAvatar({ ...data, appearance: { outfitId: '202', faceId: '102', faceStyle: 'natural', shirtColor: 'purple', pantsColor: 'olive' } }).look)
      .toEqual({ ...defaultPixelLook, outfit: 'sample-weekend', face: 'natural', shirt: 'purple', pants: 'olive' });
  });
  it('uses the catalog default before customization and explains unavailable pieces without losing clothing', () => {
    expect(resolveDormAvatar({ ...gameRoomSamples, appearance: null })).toEqual({ look: defaultPixelLook, notice: '' });
    const photo = resolveDormAvatar({ ...gameRoomSamples, appearance: { outfitId: 'sample-study', faceId: null, shirtColor: 'burgundy', pantsColor: 'khaki' } });
    expect(photo.notice).toContain('Photo faces'); expect(photo.look.shirt).toBe('burgundy'); expect(photo.look.pants).toBe('khaki');
    const unknown = resolveDormAvatar({ ...gameRoomSamples, faces: [{ id: 'new', assetKey: 'future-hair', initial: true }], appearance: { outfitId: 'sample-campus', faceId: 'new', faceStyle: 'freckles' } });
    expect(unknown.notice).toContain('does not have pixel art'); expect(unknown.look.face).toBe('freckles');
  });
});

describe('individual transparent pixel pieces', () => {
  for (const [axis, values] of Object.entries(keys)) {
    it.each(values)(`draws ${axis} option %s in all walking and sitting directions`, value => {
      const look = { ...defaultPixelLook, [axis]: value };
      const sprites = pixelAvatarSprites(look);
      for (const direction of directions) for (const pose of ['walk', 'sit'] as const) for (const frame of [0, 1] as const) {
        const art = sprites[pose][direction][frame];
        expect(art.w).toBe(24); expect(art.h).toBe(pose === 'sit' ? 38 : 44);
        expect(art.px.length).toBeGreaterThan(60);
        expect(art.px.every(([x, y, w, h, color]) => Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(w) && Number.isInteger(h)
          && x >= 0 && y >= 0 && x + w <= art.w && y + h <= art.h && /^#[0-9a-f]{6}$/i.test(color))).toBe(true);
      }
      for (const direction of directions) {
        expect(sprites.walk[direction][0].px).not.toEqual(sprites.walk[direction][1].px);
        expect(sprites.sit[direction][0].px).not.toEqual(sprites.sit[direction][1].px);
      }
      expect(sprites.sleep.h).toBe(23); expect(pixelAvatarSprites({ ...look })).toBe(sprites);
    });
    it(`keeps ${axis} choices visibly distinct and confined to their own pieces`, () => {
      const signatures = values.map(value => JSON.stringify(pixelAvatarSprites({ ...defaultPixelLook, [axis]: value }).walk.down[0].px));
      expect(new Set(signatures).size).toBe(values.length);
      const original = pixelAvatarLayers(defaultPixelLook, 'down');
      const changed = pixelAvatarLayers({ ...defaultPixelLook, [axis]: values[values.length - 1] }, 'down');
      const permitted = axis === 'hair' ? ['hair-back', 'hair-front'] : axis === 'face' ? ['face'] : axis === 'pants' ? ['pants'] : ['shirt'];
      original.forEach((piece, index) => { if (!permitted.includes(piece.piece)) expect(changed[index]).toEqual(piece); });
    });
  }
  it('keeps saved looks in every rotated resting pose and isolates cached users', () => {
    const other = { ...defaultPixelLook, hair: 'sample-ponytail' as const, body: 'female' as const, face: 'glasses-freckles' as const, shirt: 'purple' as const, pants: 'olive' as const };
    for (const key of ['bed', 'chair', 'dorm-sofa', 'dorm-armchair']) for (const rotation of ROTATIONS) {
      const first = furnitureSprites(key, rotation, defaultPixelLook)!;
      const second = furnitureSprites(key, rotation, other)!;
      expect(first.idle).toBe(second.idle);
      expect(first.action!.frames[0].px).not.toEqual(second.action!.frames[0].px);
      expect(furnitureSprites(key, rotation, defaultPixelLook)!.action).toBe(first.action);
      expect(furnitureSprites(key, rotation, other)!.action).toBe(second.action);
    }
  });
});
