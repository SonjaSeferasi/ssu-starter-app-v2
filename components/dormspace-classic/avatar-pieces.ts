import { defaultPixelLook, pixelLookKey, type PixelAvatarLook } from '../../lib/dormspace-avatar';
import { shirtColors, pantsColors } from '../../lib/game-room';
import type { Direction } from '../../lib/dormspace-movement';
import { Canvas, cropArt, mirrorArt, paint, type Art } from './pixel-painter';

export type AvatarPose = 'walk' | 'sit' | 'sleep';
export type AvatarPiece = 'hair-back' | 'body' | 'pants' | 'shoes' | 'shirt' | 'backpack' | 'head' | 'hair-front' | 'face';
export type AvatarLayer = { piece: AvatarPiece; art: Art };
const ink = '#302824', skin = '#dca47c', skinLight = '#edbb91', skinShade = '#b87855';
const hair = '#332a27', hairLight = '#554039', hairShine = '#725348', hairDark = '#211e20';
const white = '#fff3dc', shoe = '#e6e4df', sole = '#344252';
const tint = (hex: string, amount: number) => '#' + [1, 3, 5].map(i => Math.max(0, Math.min(255, parseInt(hex.slice(i, i + 2), 16) + amount)).toString(16).padStart(2, '0')).join('');
const palettes = (hex: string) => ({ base: hex, light: tint(hex, 28), shade: tint(hex, -26) });
const directions: Direction[] = ['down', 'up', 'right', 'left'];

function hairLayers(c: Canvas, look: PixelAvatarLook, side: boolean, back: boolean, front: boolean) {
  const style = look.hair;
  const long = style === 'sample-long-waves', pony = style === 'sample-ponytail';
  const bob = style === 'sample-curly-bob', locs = style === 'sample-locs', curls = style === 'sample-curls';
  if (!front) {
    if (long || bob || locs) {
      const bottom = long ? 29 : locs ? 24 : 21;
      c.rect(3, 8, 18, bottom - 8, ink).rect(4, 8, 16, bottom - 9, hair);
      for (const x of [4, 7, 16, 19]) {
        const y = x % 2 ? 9 : 11;
        c.rect(x, y, 2, bottom - y - (x % 3), hairLight).rect(x + 1, y + 2, 1, bottom - y - 4, hairDark);
        if (long || bob) c.rect(x - 1, y + 5, 2, 3, hairLight).rect(x, y + 11, 2, 3, hairShine);
      }
    }
    if (pony) {
      c.box(side ? 1 : 17, 5, 7, 18, hair, hairLight, hairDark, ink);
      c.rect(side ? 2 : 20, 8, 3, 10, hairLight).rect(side ? 1 : 17, 5, 6, 2, '#9b5c47');
      c.rect(side ? 2 : 19, 21, 4, 3, hair).rect(side ? 3 : 20, 23, 2, 2, hairDark);
    }
    return;
  }
  // An asymmetrical sweep is preserved in profiles; left-facing pieces mirror the right view.
  const crew = style === 'sample-crew-cut', part = style === 'sample-side-part';
  const left = side ? 5 : 4, width = side ? 14 : 16;
  c.rect(left + 3, 0, width - 6, 1, ink).rect(left + 1, 1, width - 2, 2, ink).rect(left, 3, width, crew ? 6 : 7, ink);
  c.rect(left + 2, 2, width - 4, 5, hair).rect(left + 1, 4, width - 2, 3, hair);
  if (back) {
    c.rect(left, 7, width, crew ? 7 : 8, ink).rect(left + 1, 7, width - 2, crew ? 6 : 8, hair);
    if (!crew) c.rect(left + 3, 15, width - 6, 3, hair);
    if (crew) {
      for (const y of [5, 8, 11]) for (let x = left + 2; x < left + width - 2; x += 3) c.set(x + y % 2, y, hairLight);
    } else if (curls || bob) {
      for (const y of [4, 8, 12]) for (let x = left + 1; x < left + width - 2; x += 4) c.rect(x, y, 3, 2, hairLight).set(x + 1, y, hairShine).set(x + 2, y + 2, hairDark);
    } else {
      for (const x of [left + 2, left + 6, left + 10]) c.rect(x, 5, 1, 9, hairLight);
      if (part) c.rect(left + 10, 3, 1, 8, hairDark).rect(left + 2, 6, 7, 1, hairShine);
      if (style === 'sample-smile') c.rect(left + 2, 7, 5, 1, hairShine).rect(left + 7, 8, 5, 1, hairLight);
    }
  } else if (crew) {
    c.rect(left + 1, 6, width - 2, 1, hairLight).rect(left, 7, 2, 4, hair);
    if (!side) c.rect(18, 7, 2, 4, hair);
    for (let x = left + 2; x < left + width - 1; x += 3) c.set(x, 3, hairLight);
  } else if (curls || bob) {
    for (const [x, y] of [[5, 2], [9, 1], [13, 1], [17, 3], [3, 5], [18, 7], [6, 6], [12, 5]]) {
      c.rect(x, y, 4, 3, hairDark).rect(x, y, 3, 2, hairLight).set(x, y, hairShine);
    }
    c.rect(4, 8, 3, bob ? 10 : 4, hair).rect(18, 8, 2, bob ? 10 : 3, hair);
    if (side) c.rect(6, 6, 7, 4, hair);
  } else if (locs) {
    for (const [x, y, h] of [[4, 4, 12], [7, 2, 10], [10, 2, 7], [13, 3, 4], [17, 4, 6], [19, 6, 11]]) {
      c.rect(x, y, 3, h, hairDark).rect(x, y, 2, h - 1, hairLight).set(x, y + 2, hairShine);
    }
  } else {
    // Waves and side part have different fringes; the long/ponytail versions frame the face.
    c.rect(left + 2, 3, 7, 2, hairLight).rect(left + 1, 5, part ? 8 : 5, 3, hairLight);
    c.rect(left, 7, 3, long || pony ? 9 : 4, hair).rect(left + 1, 5, 2, 3, hairShine);
    if (!side) c.rect(18, 6, 2, long || pony ? 10 : 5, hair);
    if (part) c.rect(14, 3, 1, 3, skinShade).rect(9, 6, 4, 2, hairLight);
    else c.rect(11, 5, 4, 2, hair).rect(10, 7, 2, 1, hairLight);
    if (side) c.rect(6, 4, 7, 5, hair).rect(6, 8, 6, 5, hair);
  }
  if (back && (long || bob || locs)) {
    c.rect(5, 12, 14, long ? 13 : bob ? 7 : 9, hair);
    for (const x of [6, 10, 14, 18]) c.rect(x, 10, locs ? 2 : 1, long ? 15 : 8, hairLight).rect(x - 1, 15, 2, 2, hairShine);
    if (bob) for (const y of [12, 16]) for (const x of [5, 9, 13, 17]) c.rect(x, y, 3, 2, hairLight).set(x + 1, y, hairShine);
  }
}

// Each piece shares an origin and transparent 24×44 canvas. Pieces can be exported individually,
// tinted independently, and recombined in every pose without scaling a photograph or SVG avatar.
export function pixelAvatarLayers(look: PixelAvatarLook, facing: Direction, pose: AvatarPose = 'walk', frame: 0 | 1 = 0): AvatarLayer[] {
  const side = facing === 'left' || facing === 'right', back = facing === 'up';
  const seated = pose === 'sit', asleep = pose === 'sleep';
  const offset = seated ? frame : 0;
  const top = palettes(shirtColors.find(x => x.id === look.shirt)!.hex);
  const bottom = palettes(pantsColors.find(x => x.id === look.pants)!.hex);
  const layers: AvatarLayer[] = [];
  const add = (piece: AvatarPiece, draw: (c: Canvas) => void, dy = 0) => {
    const c = new Canvas(24, 44); draw(c);
    let art = dy ? paint(new Canvas(24, 44), c.art(), 0, dy).art() : c.art();
    if (facing === 'left') art = mirrorArt(art);
    layers.push({ piece, art });
  };
  add('hair-back', c => hairLayers(c, look, side, back, false), offset);
  if (!asleep) {
    add('body', c => {
      c.rect(9, 17, 6, 5, ink).rect(10, 17, 4, 5, skin).rect(13, 17, 1, 5, skinShade);
      if (side) c.box(16, 27, 3, 5, skin, skinLight, skinShade, ink);
      else for (const x of [4, 17]) c.box(x, 27 - (frame && !seated && x === 4 ? 1 : 0), 3, 5, skin, skinLight, skinShade, ink);
    }, offset);
    add('pants', c => {
      if (seated) {
        if (side) c.box(9, 29, 13, 6, bottom.base, bottom.light, bottom.shade, ink).box(17, 32, 5, 4, bottom.base, bottom.light, bottom.shade, ink);
        else { c.box(6, 29, 12, 4, bottom.base, bottom.light, bottom.shade, ink);
          for (const x of [6, 13]) c.box(x, 31, 5, 4, bottom.base, bottom.light, bottom.shade, ink); }
      } else {
        c.box(side ? 9 : 6, 30, side ? 9 : 12, 5, bottom.base, bottom.light, bottom.shade, ink);
        const legs = side ? (frame ? [[7, 38], [14, 39]] : [[11, 39]]) : [[6, frame ? 38 : 39], [13, 39]];
        for (const [x, end] of legs) c.box(x, 33, 5, end - 31, bottom.base, bottom.light, bottom.shade, ink);
        if (!side) c.rect(11, 34, 2, 5, ink);
      }
    });
    add('shoes', c => {
      const feet = seated ? (side ? [[17, 34]] : [[6, 34], [13, 34]])
        : side ? (frame ? [[6, 39], [14, 40]] : [[11, 40]]) : [[5, frame ? 39 : 40], [13, 40]];
      for (const [x, y] of feet) c.rect(x, y, 7, 4, ink).rect(x + 1, y, 5, 2, shoe).rect(x + 1, y + 2, 5, 1, sole).set(x + 4, y, white);
    });
    add('shirt', c => {
      const narrow = look.body === 'female', x = side ? 9 : narrow ? 6 : 5, w = side ? 9 : narrow ? 12 : 14;
      c.box(x, 20, w, 12, top.base, top.light, top.shade, ink);
      c.rect(x + 2, 30, w - 4, 1, top.shade);
      const sleeves = side ? [15] : [4, 17];
      for (const sx of sleeves) c.box(sx, 22 - (frame && !seated && sx === 4 ? 1 : 0), 4, 7, top.base, top.light, top.shade, ink);
      if (look.outfit === 'sample-campus') {
        if (back) c.box(side ? 8 : 7, 19, side ? 6 : 10, 5, top.shade, top.base, ink, ink);
        else {
          c.rect(side ? 15 : 9, 20, side ? 3 : 6, 2, top.shade);
          if (!side) c.set(9, 23, white).set(14, 23, white).rect(8, 27, 8, 2, top.shade).rect(9, 27, 6, 1, top.light);
          else c.rect(16, 23, 1, 2, white);
        }
      } else {
        c.rect(side ? 15 : 9, 20, side ? 3 : 6, 1, top.shade);
        if (look.outfit === 'sample-study') { // fine knit and ribbed cuffs
          for (const sx of sleeves) c.rect(sx + 1, 27, 2, 1, top.light);
          for (const sx of [8, 11, 14]) c.set(sx, 30, top.light);
        } else { // wider crew collar and raglan shoulder seams
          c.rect(side ? 15 : 8, 21, side ? 2 : 8, 1, top.light);
          c.rect(x + 2, 23, 1, 3, top.shade);
        }
      }
    }, offset);
    add('backpack', c => {
      if (back) {
        c.box(6, 22, 12, 12, '#39383a', '#59504b', '#23252b', ink).box(8, 28, 8, 5, '#444046', '#655d57', '#24252b', ink);
        c.rect(9, 24, 1, 3, '#7d7467').rect(14, 24, 1, 3, '#24252b');
      } else if (side) c.box(5, 21, 5, 12, '#39383a', '#59504b', '#23252b', ink).rect(14, 21, 2, 8, '#39383a').rect(14, 22, 1, 6, '#746a5d');
      else for (const sx of [7, 16]) c.rect(sx, 21, 2, 8, '#39383a').rect(sx, 22, 1, 6, '#746a5d');
    }, offset);
  }
  add('head', c => {
    if (side) {
      c.rect(8, 5, 12, 12, ink).rect(9, 5, 10, 12, skin).rect(10, 6, 9, 9, skinLight);
      c.rect(19, 10, 3, 4, ink).rect(19, 10, 2, 3, skin).rect(10, 16, 8, 2, skinShade).box(10, 11, 3, 4, skin, skinLight, skinShade, skinShade);
    } else {
      c.rect(5, 4, 14, 12, ink).rect(6, 4, 12, 12, skin).rect(7, 5, 10, 10, skinLight);
      c.rect(7, 16, 10, 2, ink).rect(8, 16, 8, 2, skin).rect(9, 18, 6, 1, skinShade);
      for (const sx of [4, 18]) c.rect(sx, 9, 2, 5, skinShade).rect(sx, 10, 1, 3, skinLight);
      if (asleep) c.rect(9, 18, 6, 4, skin).rect(9, 21, 6, 1, skinShade);
    }
  }, offset);
  add('hair-front', c => hairLayers(c, look, side, back, true), offset);
  add('face', c => {
    if (back) return;
    if (side) {
      c.rect(17, 9, 2, 1, hairDark);
      if (asleep) c.rect(17, 11, 2, 1, ink); else c.rect(18, 11, 1, 2, ink).set(18, 11, white);
      c.rect(18, 16, 2, 1, '#8c493e');
    } else {
      for (const sx of [7, 14]) {
        c.rect(sx, 9, 3, 1, hairLight);
        if (asleep) c.rect(sx, 12, 3, 1, ink);
        else c.rect(sx + 1, 11, 2, 3, ink).set(sx + 1, 11, white);
        if (look.body === 'female') c.set(sx, 11, ink);
      }
      c.set(11, 14, skinShade).rect(10, 16, 4, 1, '#995446').rect(11, 16, 2, 1, white);
    }
    if (look.face === 'freckles' || look.face === 'glasses-freckles') {
      for (const [x, y] of side ? [[17, 14], [19, 14]] : [[6, 14], [8, 15], [9, 14], [14, 14], [16, 15], [17, 14]]) c.set(x, y, '#9f6347');
    }
    if (look.face.includes('glasses')) {
      const square = look.face === 'square-glasses';
      for (const x of side ? [16] : [5, 13]) {
        if (square) c.rect(x, 10, 6, 1, sole).rect(x, 14, 6, 1, sole).rect(x, 10, 1, 5, sole).rect(x + 5, 10, 1, 5, sole);
        else c.rect(x + 1, 10, 4, 1, sole).rect(x + 1, 14, 4, 1, sole).rect(x, 11, 1, 3, sole).rect(x + 5, 11, 1, 3, sole);
        c.set(x + 1, 11, '#d6e6e6');
      }
      if (side) c.rect(12, 11, 4, 1, sole); else c.rect(11, 11, 2, 1, sole);
    }
  }, offset);
  return layers;
}

const combine = (layers: AvatarLayer[], height = 44) => {
  const c = new Canvas(24, height);
  for (const layer of layers) paint(c, layer.art);
  return c.art();
};
export type PixelAvatarSprites = { walk: Record<Direction, [Art, Art]>; sit: Record<Direction, [Art, Art]>; sleep: Art };
// Bound resident appearances; furniture caches are weakly keyed to these sprite sets.
const sprites = new Map<string, PixelAvatarSprites>();
export function pixelAvatarSprites(look: PixelAvatarLook = defaultPixelLook): PixelAvatarSprites {
  const key = pixelLookKey(look), cached = sprites.get(key);
  if (cached) { sprites.delete(key); sprites.set(key, cached); return cached; }
  const poses = (pose: 'walk' | 'sit') => Object.fromEntries(directions.map(direction => [direction,
    ([0, 1] as const).map(frame => combine(pixelAvatarLayers(look, direction, pose, frame), pose === 'sit' ? 38 : 44))])) as Record<Direction, [Art, Art]>;
  const result = { walk: poses('walk'), sit: poses('sit'), sleep: cropArt(combine(pixelAvatarLayers(look, 'down', 'sleep')), 0, 0, 24, 23) };
  if (sprites.size >= 64) sprites.delete(sprites.keys().next().value!);
  sprites.set(key, result);
  return result;
}
