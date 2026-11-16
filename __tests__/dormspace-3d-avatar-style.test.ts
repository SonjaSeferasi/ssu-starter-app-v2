import { describe, expect, it } from 'vitest';
import {
  PHOTO_NOTICE, dormAvatarStyleKey, resolveDormAvatarStyle, rigStyle, unsupportedNotice,
} from '../components/dormspace-3d/avatar-style';
import { DORM_AVATAR_POSES, poseAngles, restSole, soleBottom, type LegMetrics } from '../components/dormspace-3d/avatar-pose';
import { characterStyle } from '../components/jumpyland/character-rig';
import { gameRoomSamples, type AvatarAppearance, type GameRoomData } from '../lib/game-room';

const data = (appearance: AvatarAppearance | null): GameRoomData => ({ ...gameRoomSamples, appearance });
const look = (appearance: AvatarAppearance | null) => resolveDormAvatarStyle(data(appearance));
const base = { outfitId: 'sample-campus', faceId: 'sample-smile' } as const;

describe('SRS-504.1 complete avatars', () => {
  it('uses the chosen collection look and its painted defaults', () => {
    const { style, notices } = look({ ...base, avatarId: 'campus-v4-male-2-2-glasses' });
    const painted = characterStyle({ outfitId: '', faceId: null, avatarId: 'campus-v4-male-2-2-glasses' });
    expect(notices).toEqual([]);
    expect(style).toMatchObject({ source: 'complete', presentation: 'male', hair: 'curls', top: painted.garment,
      topColor: painted.shirt, bottomColor: painted.pants, skin: painted.skin, glasses: 'round', bodyShape: 'average', bodyWidth: 1 });
  });

  it('treats saved body shape and skin colour as authoritative', () => {
    const { style } = look({ ...base, avatarId: 'campus-v4-male-2-2-glasses', bodyShape: 'broad', skinColor: 'chestnut' });
    expect(style).toMatchObject({ bodyShape: 'broad', bodyWidth: 1.13, skin: '#89573e' });
    expect(look({ ...base, avatarId: 'campus-v4-male-2-2-glasses', bodyShape: 'plus' }).style.bodyWidth).toBe(1.27);
    expect(look({ ...base, avatarId: 'campus-v4-male-2-2-glasses', bodyShape: 'slim' }).style.bodyWidth).toBe(0.88);
  });

  it('keeps the collection outfit colours when the save carries default shirt/pants ids', () => {
    const plain = look({ ...base, avatarId: 'campus-v4-male-2-2-glasses' }).style;
    const saved = look({ ...base, avatarId: 'campus-v4-male-2-2-glasses', shirtColor: 'navy', pantsColor: 'denim', faceStyle: 'natural' }).style;
    expect(saved.topColor).toBe(plain.topColor);
    expect(saved.bottomColor).toBe(plain.bottomColor);
    expect(saved.glasses).toBe('round'); // `natural` never removes the variant's glasses
  });

  it('adds square frames and freckles from saved face details', () => {
    expect(look({ ...base, avatarId: 'campus-v4-male-1-1-natural', faceStyle: 'square-glasses' }).style.glasses).toBe('square');
    expect(look({ ...base, avatarId: 'campus-v4-male-1-1-natural', faceStyle: 'freckles' }).style).toMatchObject({ glasses: 'none', freckles: true });
    expect(look({ ...base, avatarId: 'campus-v4-male-2-2-glasses', faceStyle: 'freckles' }).style).toMatchObject({ glasses: 'round', freckles: true });
  });

  it('maps hijab colour, auburn hair, curly bob and chinos', () => {
    expect(look({ ...base, avatarId: 'campus-v4-hijab-3-2-natural' }).style).toMatchObject({ presentation: 'hijab', hair: 'hijab', hijabColor: '#899b84' });
    expect(look({ ...base, avatarId: 'campus-female-6' }).style).toMatchObject({ hair: 'long-waves', hairColor: '#75432f' });
    expect(look({ ...base, avatarId: 'campus-female-3' }).style).toMatchObject({ hair: 'bob', curlyBob: true });
    expect(look({ ...base, avatarId: 'campus-male-4' }).style.bottom).toBe('chinos');
  });

  it('explains an avatar id this build does not know and falls back to the other saved fields', () => {
    const { style, notices } = look({ ...base, avatarId: 'campus-v9-future' });
    expect(notices).toContain(unsupportedNotice('avatar'));
    expect(style.source).toBe('legacy');
  });
});

describe('SRS-504.1 layered looks', () => {
  it('honours every layered field', () => {
    const { style, notices } = look({ ...base, skinTone: 'tone-6', headStyle: 'braids', topStyle: 'cardigan', topColor: 'purple',
      bottomStyle: 'wide-leg', bottomColor: 'khaki', faceStyle: 'square-glasses' });
    expect(notices).toEqual([]);
    expect(style).toEqual(expect.objectContaining({ source: 'layered', presentation: 'female', hair: 'braids', skin: '#4b2f22',
      top: 'cardigan', topColor: '#8563af', bottom: 'wide', bottomColor: '#b39d76', glasses: 'square', freckles: false }));
  });

  it('applies colour precedence: layered colour, then shirt/pants colour, then outfit', () => {
    expect(look({ ...base, topStyle: 'hoodie', topColor: 'green', shirtColor: 'burgundy' }).style.topColor).toBe('#397359');
    expect(look({ ...base, topStyle: 'hoodie', shirtColor: 'burgundy' }).style.topColor).toBe('#984654');
    expect(look({ ...base, bottomStyle: 'chinos', pantsColor: 'olive' }).style).toMatchObject({ bottom: 'chinos', bottomColor: '#7b8960' });
  });

  it('prefers the saved skin colour over the layered skin tone', () => {
    expect(look({ ...base, skinTone: 'tone-1', skinColor: 'deep' }).style.skin).toBe('#4d3328');
    expect(look({ ...base, skinTone: 'tone-1' }).style.skin).toBe('#f3d7c6');
  });

  it('uses the hijab colour and glasses-with-freckles', () => {
    expect(look({ ...base, headStyle: 'hijab-dusty-rose', faceStyle: 'glasses-freckles' }).style)
      .toMatchObject({ presentation: 'hijab', hijabColor: '#c99a9a', glasses: 'round', freckles: true });
  });

  it('reports an unknown layered option instead of choosing an unrelated look', () => {
    const { style, notices } = look({ ...base, headStyle: 'mohawk' as never });
    expect(notices).toContain(unsupportedNotice('hairstyle'));
    expect(style.hair).toBe('waves'); // the saved legacy face, sample-smile
  });
});

describe('SRS-504.1 / SRS-504.2 legacy and default looks', () => {
  it('resolves legacy face and outfit from the catalog asset keys', () => {
    const { style, notices } = look({ outfitId: 'sample-study', faceId: 'sample-ponytail', shirtColor: 'burgundy', pantsColor: 'black', faceStyle: 'round-glasses' });
    expect(notices).toEqual([]);
    expect(style).toMatchObject({ source: 'legacy', presentation: 'female', hair: 'ponytail', top: 'crewneck',
      topColor: '#984654', bottomColor: '#353943', glasses: 'round' });
    expect(look({ outfitId: 'sample-weekend', faceId: 'sample-curls' }).style).toMatchObject({ top: 'jacket', topColor: '#397359', hair: 'curls' });
  });

  it('keeps the glasses that belong to the legacy glasses face', () => {
    expect(look({ outfitId: 'sample-campus', faceId: 'sample-glasses', faceStyle: 'natural' }).style.glasses).toBe('round');
  });

  it('shows the Game Room default when nothing is saved', () => {
    const { style, notices } = look(null);
    expect(notices).toEqual([]);
    expect(style).toMatchObject({ source: 'default', hair: 'waves', top: 'hoodie', topColor: '#263b65', glasses: 'none', bodyShape: 'average' });
  });

  it('gives an explicit notice for a photo face', () => {
    const { style, notices } = look({ outfitId: 'sample-weekend', faceId: null });
    expect(notices).toEqual([PHOTO_NOTICE]);
    expect(style).toMatchObject({ hair: 'waves', top: 'jacket' });
  });

  it('gives a notice for catalog keys without 3D pieces', () => {
    const catalog: GameRoomData = { ...gameRoomSamples, faces: [{ id: '7', assetKey: 'future-face', initial: true }],
      outfits: [{ id: '8', assetKey: 'future-outfit', name: 'Future' }], appearance: { outfitId: '8', faceId: '7' } };
    expect(resolveDormAvatarStyle(catalog).notices).toEqual([unsupportedNotice('hairstyle'), unsupportedNotice('outfit')]);
  });

  it('accepts a bare saved appearance', () => {
    expect(resolveDormAvatarStyle({ outfitId: '1', faceId: '2', avatarId: 'campus-v4-hijab-1-1-natural', skinColor: 'ivory' }).style)
      .toMatchObject({ source: 'complete', presentation: 'hijab', skin: '#e4b8a4' });
  });
});

describe('resolver contract', () => {
  it('never changes the saved data and records no account gender', () => {
    const input = data({ ...base, avatarId: 'campus-v4-female-2-2-natural', bodyShape: 'plus', skinColor: 'honey', faceStyle: 'freckles' });
    const before = JSON.stringify(input);
    const { style } = resolveDormAvatarStyle(Object.freeze(input));
    expect(JSON.stringify(input)).toBe(before);
    expect(Object.keys(style)).not.toContain('gender');
  });

  it('keys looks by every visible part and maps to the Game 1 rig style', () => {
    const a = look({ ...base, avatarId: 'campus-v4-male-1-1-natural' }).style;
    const b = look({ ...base, avatarId: 'campus-v4-male-1-1-natural', skinColor: 'espresso' }).style;
    expect(dormAvatarStyleKey(a)).toBe(dormAvatarStyleKey({ ...a }));
    expect(dormAvatarStyleKey(a)).not.toBe(dormAvatarStyleKey(b));
    expect(rigStyle({ ...a, glasses: 'square' }).glasses).toBe(false); // square frames are added by the DormSpace model
    expect(rigStyle({ ...a, glasses: 'round' })).toMatchObject({ glasses: true, skin: a.skin, bodyWidth: a.bodyWidth });
  });
});

describe('pose maths', () => {
  const m: LegMetrics = { hip: 0.778, knee: 0.335, soleY: -0.375, soleZ: 0.04, soleRY: 0.012, soleRZ: 0.106, legDepth: 0.96 };

  it('finds the resting sole from the leg chain', () => {
    expect(restSole(m)).toBeCloseTo(0.778 - 0.335 - 0.375 - 0.012, 6);
    expect(soleBottom(m, -0.5, 0)).toBeGreaterThan(restSole(m)); // a swung leg lifts its sole
  });

  it('keeps the lowest sole on the floor while walking and running', () => {
    for (const pose of ['idle', 'walk', 'run'] as const) for (let time = 0; time < 2000; time += 37) {
      const a = poseAngles(pose, time, m);
      const lowest = Math.min(soleBottom(m, a.hips[0], a.knees[0], a.lean), soleBottom(m, a.hips[1], a.knees[1], a.lean));
      expect(a.bodyY + lowest - restSole(m)).toBeCloseTo(0, 6);
    }
  });

  it('holds every pose still with reduced motion', () => {
    for (const pose of DORM_AVATAR_POSES) expect(poseAngles(pose, 777, m, { reducedMotion: true })).toEqual(poseAngles(pose, 0, m, { reducedMotion: true }));
    expect(poseAngles('walk', 250, m).hips).not.toEqual(poseAngles('walk', 0, m).hips);
  });

  it('seats the hips on the seat without pushing the soles through the floor', () => {
    for (const seat of [0.3, 0.42, 0.55]) {
      const a = poseAngles('sit', 0, m, { seatHeight: seat });
      const hipWorld = a.bodyY + m.hip * Math.cos(a.lean) - restSole(m);
      const sole = a.bodyY + soleBottom(m, a.hips[0], a.knees[0], a.lean) - restSole(m);
      expect(sole).toBeGreaterThanOrEqual(-1e-9);
      expect(hipWorld).toBeGreaterThanOrEqual(seat + 0.065 - 1e-9);
      if (seat >= 0.42) expect(hipWorld).toBeCloseTo(seat + 0.065, 6);
    }
  });

  it('lies down with closed eyes to sleep', () => {
    expect(poseAngles('sleep', 0, m)).toMatchObject({ lying: true, eyesClosed: true });
    expect(poseAngles('sit', 0, m)).toMatchObject({ lying: false, eyesClosed: false });
  });
});
