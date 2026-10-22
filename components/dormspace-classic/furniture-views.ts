import type { Rotation } from '../../lib/dormspace-rules';
import { Canvas, cropArt, grain, mirrorArt, paint, P, turnFlat, type Art } from './pixel-painter';

type Seat = { x: number; y: number; facing: 'down' | 'left' | 'up' | 'right' };
type Sleep = { headX: number; headY: number; headTurn: Rotation; quilt: Art; quiltX: number; quiltY: number };
export type FurnitureView = { art: Art; seat?: Seat; sleep?: Sleep; foreground?: Art };
type Views = Record<Rotation, FurnitureView>;
const cache = new Map<string, Views>();

function flipped(view: FurnitureView): FurnitureView {
  return { art: mirrorArt(view.art), foreground: view.foreground ? mirrorArt(view.foreground) : undefined,
    seat: view.seat ? { ...view.seat, x: view.art.w - view.seat.x - 24, facing: 'right' } : undefined,
    sleep: view.sleep ? { ...view.sleep, headX: view.art.w - view.sleep.headX - 23, headTurn: 270,
      quilt: turnFlat(view.sleep.quilt, 180), quiltX: view.art.w - view.sleep.quiltX - view.sleep.quilt.w } : undefined };
}
function legs(c: Canvas, width: number, height: number) {
  for (const x of [3, width - 8]) c.box(x, height - 7, 5, 7, P.woodD, P.woodM, P.out);
}

function bedViews(front: Art): Views {
  const quilt = cropArt(front, 7, 44, 34, 38);
  const side = new Canvas(72, 66);
  side.box(3, 13, 64, 48, P.wood, P.woodL, P.woodD);
  side.box(6, 15, 58, 43, P.cream, P.white, P.creamD);
  side.box(45, 17, 17, 34, P.white, P.white, P.creamS, P.creamD);
  side.rect(48, 20, 1, 27, P.creamS);
  paint(side, turnFlat(quilt, 90), 7, 20);
  side.rect(43, 19, 4, 35, P.cream).rect(43, 19, 1, 35, P.white);
  for (const x of [0, 64]) {
    side.box(x, x === 0 ? 13 : 0, 8, x === 0 ? 53 : 66, P.wood, P.woodL, P.woodD);
    side.box(x, x === 0 ? 13 : 0, 8, 6, P.woodM, P.woodH, P.woodD);
  }
  side.box(6, 58, 59, 7, P.woodD, P.woodM, P.woodD);
  const left: FurnitureView = { art: side.art(), sleep: { headX: 42, headY: 23, headTurn: 90,
    quilt: turnFlat(quilt, 90), quiltX: 7, quiltY: 20 } };
  const back = new Canvas(48, 90);
  back.box(1, 1, 46, 86, P.wood, P.woodL, P.woodD);
  back.box(7, 5, 34, 60, P.cream, P.white, P.creamD);
  paint(back, turnFlat(quilt, 180), 7, 8);
  back.rect(7, 44, 34, 5, P.cream).rect(7, 44, 34, 1, P.white);
  back.box(10, 48, 28, 15, P.white, P.white, P.creamS, P.creamD);
  const frontBoard = new Canvas(48, 90);
  frontBoard.box(0, 66, 48, 24, P.wood, P.woodH, P.woodD);
  frontBoard.box(7, 70, 34, 15, P.woodM, P.woodL, P.woodD);
  grain(frontBoard, 10, 73, 27, 8, P.wood, 91, 6);
  for (const x of [0, 41]) frontBoard.box(x, 63, 7, 7, P.woodM, P.woodH, P.woodD);
  paint(back, frontBoard.art());
  return {
    0: { art: front, sleep: { headX: 12, headY: 22, headTurn: 0, quilt, quiltX: 7, quiltY: 44 } },
    90: left,
    180: { art: back.art(), foreground: frontBoard.art(), sleep: { headX: 12, headY: 44, headTurn: 180,
      quilt: turnFlat(quilt, 180), quiltX: 7, quiltY: 8 } },
    270: flipped(left),
  };
}

function chairViews(front: Art): Views {
  const padded = paint(new Canvas(24, 46), front, 0, 8).art();
  const left = new Canvas(24, 46);
  legs(left, 24, 46);
  left.box(1, 25, 21, 9, P.red, P.redL, P.redD);
  left.box(17, 3, 6, 34, P.wood, P.woodL, P.woodD).box(16, 0, 8, 5, P.woodM, P.woodH, P.woodD);
  left.rect(2, 34, 18, 5, P.woodD);
  const side: FurnitureView = { art: left.art(), seat: { x: 0, y: 5, facing: 'left' } };
  const back = new Canvas(24, 46); legs(back, 24, 46);
  back.box(1, 19, 22, 12, P.red, P.redL, P.redD);
  const board = new Canvas(24, 46);
  board.box(3, 18, 18, 23, P.wood, P.woodL, P.woodD);
  board.rect(8, 22, 1, 14, P.woodD).rect(15, 22, 1, 14, P.woodD);
  paint(back, board.art());
  return { 0: { art: padded, seat: { x: 0, y: 5, facing: 'down' } }, 90: side,
    180: { art: back.art(), seat: { x: 0, y: 1, facing: 'up' }, foreground: board.art() }, 270: flipped(side) };
}

function loungeViews(front: Art, sofa: boolean): Views {
  const color = sofa ? P.blue : P.green, light = sofa ? P.blueL : P.greenL, dark = sofa ? P.blueD : P.greenD;
  const w = sofa ? 48 : 24, h = sofa ? 88 : 70;
  const side = new Canvas(w, h); legs(side, w, h);
  side.box(1, 20, w - 2, h - 27, color, light, dark);
  side.box(2, 25, w - 9, h - 42, light, sofa ? P.blueH : '#9bd56f', dark);
  side.box(w - 9, 3, 8, h - 18, color, light, dark);
  for (const y of [14, h - 20]) side.box(0, y, w - 1, 10, color, light, dark);
  const arm = new Canvas(w, h);
  arm.box(0, h - 20, w - 1, 10, color, light, dark);
  const left: FurnitureView = { art: side.art(), seat: { x: sofa ? 9 : 0, y: sofa ? 28 : 17, facing: 'left' }, foreground: arm.art() };
  const back = new Canvas(front.w, front.h); legs(back, front.w, front.h);
  back.box(4, 10, front.w - 8, front.h - 18, color, light, dark);
  const board = new Canvas(front.w, front.h);
  board.box(2, sofa ? 20 : 17, front.w - 4, front.h - (sofa ? 29 : 24), color, light, dark);
  board.rect(7, sofa ? 28 : 23, front.w - 14, 1, dark).rect(7, front.h - 13, front.w - 14, 1, light);
  paint(back, board.art());
  return { 0: { art: front, seat: { x: sofa ? 24 : 12, y: sofa ? 12 : 2, facing: 'down' } },
    90: left, 180: { art: back.art(), seat: { x: sofa ? 24 : 12, y: 1, facing: 'up' }, foreground: board.art() }, 270: flipped(left) };
}

function deskViews(front: Art): Views {
  const side = new Canvas(24, 100); legs(side, 24, 100);
  side.box(1, 25, 22, 68, P.wood, P.woodL, P.woodD);
  side.box(0, 22, 24, 57, P.woodM, P.woodH, P.woodD);
  grain(side, 2, 28, 19, 43, P.wood, 71, 11);
  side.box(15, 0, 5, 24, P.screen, P.metal, P.out).rect(13, 23, 9, 3, P.metalD);
  side.box(2, 42, 8, 15, P.red, P.redL, P.redD).rect(3, 46, 6, 1, P.gold);
  side.box(13, 60, 7, 8, P.white, P.white, P.creamD);
  side.box(2, 8, 10, 8, P.gold, P.goldL, P.goldD).rect(6, 16, 2, 9, P.metalD);
  const back = new Canvas(72, 52); legs(back, 72, 52);
  back.box(0, 17, 72, 30, P.wood, P.woodL, P.woodD);
  grain(back, 4, 22, 64, 20, P.woodD, 81, 15);
  back.box(0, 15, 72, 8, P.woodM, P.woodH, P.woodD);
  back.box(25, 0, 22, 18, P.screen, P.metalD, P.out).rect(29, 5, 14, 1, P.metalD).rect(29, 8, 14, 1, P.metalD);
  back.rect(34, 18, 4, 5, P.metalD);
  back.box(4, 3, 13, 8, P.gold, P.goldL, P.goldD).rect(9, 11, 3, 6, P.metalD);
  for (const x of [54, 60, 65]) back.box(x, 5, 5, 13, P.red, P.redL, P.redD);
  return { 0: { art: front }, 90: { art: side.art() }, 180: { art: back.art() }, 270: { art: mirrorArt(side.art()) } };
}

function storageViews(front: Art, wardrobe: boolean): Views {
  const h = wardrobe ? 94 : 88;
  const side = new Canvas(24, h); legs(side, 24, h);
  side.box(2, 2, 20, h - 7, P.wood, P.woodL, P.woodD);
  side.box(0, 0, 24, 5, P.woodM, P.woodH, P.woodD);
  side.box(5, 10, 13, h - 25, P.woodM, P.woodL, P.woodD);
  grain(side, 7, 13, 9, h - 31, P.wood, wardrobe ? 49 : 48, 13);
  side.rect(2, 6, 2, h - 14, P.woodD);
  const back = new Canvas(front.w, front.h); legs(back, front.w, front.h);
  back.box(2, 2, front.w - 4, front.h - 6, P.woodD, P.woodL, P.out);
  for (let x = 5; x < front.w - 5; x += 7) back.box(x, 5, 7, front.h - 12, P.wood, P.woodM, P.woodD, P.woodD);
  back.box(0, 0, front.w, 5, P.woodM, P.woodH, P.woodD);
  back.rect(4, 18, front.w - 8, 3, P.woodD).rect(4, front.h - 20, front.w - 8, 3, P.woodD);
  return { 0: { art: front }, 90: { art: side.art() }, 180: { art: back.art() }, 270: { art: mirrorArt(side.art()) } };
}

function tableViews(front: Art): Views {
  const side = new Canvas(24, 54); legs(side, 24, 54);
  side.box(2, 42, 20, 5, P.wood, P.woodL, P.woodD);
  side.box(0, 5, 24, 38, P.woodM, P.woodH, P.woodD);
  grain(side, 3, 9, 18, 27, P.wood, 36, 7);
  side.box(3, 10, 11, 9, P.blue, P.blueL, P.blueD).rect(4, 17, 9, 1, P.cream);
  side.box(12, 29, 8, 8, P.cream, P.white, P.creamD).rect(14, 30, 4, 2, P.woodD);
  // The far-side view keeps the tabletop level while the objects change sides.
  return { 0: { art: front }, 90: { art: side.art() }, 180: { art: mirrorArt(front) }, 270: { art: mirrorArt(side.art()) } };
}

function nightstandViews(front: Art): Views {
  const side = new Canvas(24, 40); legs(side, 24, 40);
  side.box(1, 14, 22, 21, P.wood, P.woodL, P.woodD).box(4, 19, 16, 12, P.woodM, P.woodL, P.woodD);
  grain(side, 6, 21, 12, 8, P.wood, 92, 4);
  side.box(0, 12, 24, 5, P.woodM, P.woodH, P.woodD);
  side.box(5, 0, 14, 8, P.gold, P.goldL, P.goldD).rect(11, 8, 2, 5, P.metalD);
  const back = paint(new Canvas(24, 40), side.art());
  for (const x of [7, 15]) back.rect(x, 18, 1, 14, P.woodD);
  return { 0: { art: front }, 90: { art: side.art() }, 180: { art: back.art() }, 270: { art: mirrorArt(side.art()) } };
}

function plantViews(front: Art): Views {
  const alternate = new Canvas(24, 44);
  alternate.rect(11, 6, 3, 26, P.greenD);
  for (const [x, y, w, h] of [[1, 8, 10, 6], [12, 2, 9, 9], [2, 20, 10, 7], [13, 15, 10, 6], [13, 25, 8, 5]]) {
    alternate.box(x, y, w, h, P.green, P.greenL, P.greenD, P.greenD);
  }
  alternate.box(3, 29, 18, 5, '#c0643a', '#e99a67', '#8f4424').box(5, 34, 14, 10, '#c0643a', '#e08a5a', '#8f4424');
  return { 0: { art: front }, 90: { art: alternate.art() }, 180: { art: mirrorArt(front) }, 270: { art: mirrorArt(alternate.art()) } };
}

export function furnitureView(key: string, front: Art, rotation: Rotation = 0): FurnitureView {
  let views = cache.get(key);
  if (!views) {
    views = key === 'bed' ? bedViews(front) : key === 'chair' ? chairViews(front)
      : key === 'desk' ? deskViews(front) : key === 'dorm-sofa' ? loungeViews(front, true)
      : key === 'dorm-armchair' ? loungeViews(front, false)
      : key === 'dorm-bookshelf' ? storageViews(front, false) : key === 'dorm-wardrobe' ? storageViews(front, true)
      : key === 'dorm-coffee-table' ? tableViews(front) : key === 'dorm-nightstand' ? nightstandViews(front)
      : key === 'dorm-plant' ? plantViews(front)
      : key === 'dorm-rug' ? { 0: { art: front }, 90: { art: turnFlat(front, 90) }, 180: { art: turnFlat(front, 180) }, 270: { art: turnFlat(front, 270) } }
      : { 0: { art: front }, 90: { art: front }, 180: { art: front }, 270: { art: front } };
    cache.set(key, views);
  }
  return views[rotation];
}
