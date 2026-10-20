'use client';

import type { Direction } from './shared';
import styles from './dormspace.module.css';

// DormSpace pixel art: 24 art-pixels per room cell. Sprites are painted onto a small pixel canvas,
// compacted into horizontal runs and rendered as crisp SVG, so they scale without blurring.
import { Canvas, CELL_PX, grain, paint, P, rng, turnFlat, type Art, type Px } from './pixel-painter';
import { furnitureView } from './furniture-views';
import { pixelAvatarSprites, type PixelAvatarSprites } from './avatar-pieces';
import { defaultPixelLook, pixelLookKey, pixelLookLabel, type PixelAvatarLook } from '../../lib/dormspace-avatar';
import type { Rotation } from '../../lib/dormspace-rules';
export { CELL_PX, type Art } from './pixel-painter';

function svg({ w, h, px }: Art) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" shape-rendering="crispEdges">${
    px.map(([x, y, pw, ph, c]) => `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="${c}"/>`).join('')}</svg>`;
}
const uri = (art: Art) => `url("data:image/svg+xml,${encodeURIComponent(svg(art))}")`;

// Each sprite is encoded once and drawn as a single image. Rendering hundreds of <rect> elements per
// sprite made React rebuild thousands of nodes on every walking step.
const sources = new WeakMap<Art, string>();
function source(art: Art) {
  let src = sources.get(art);
  if (!src) { src = `data:image/svg+xml,${encodeURIComponent(svg(art))}`; sources.set(art, src); }
  return src;
}

export function PixelArt({ art, className, label, style }: { art: Art; className?: string; label?: string; style?: React.CSSProperties }) {
  // Explicit dimensions keep auto-height sitting poses and inventory thumbnails in proportion.
  return <img src={source(art)} width={art.w} height={art.h} alt={label ?? ''} aria-hidden={label ? undefined : true} draggable={false} className={className} style={style} />;
}

// ---------------------------------------------------------------- furniture (3/4 view)
// Each sprite is as wide as its footprint; any extra height rises above it (headboard, desk front).
const bed: Art = (() => {
  const c = new Canvas(48, 90);
  c.rect(0, 0, 48, 90, P.out);
  // headboard
  c.rect(1, 1, 46, 24, P.wood).rect(1, 1, 46, 2, P.woodL).rect(1, 3, 46, 1, P.woodM);
  c.box(8, 6, 32, 16, P.woodM, P.woodL, P.wood);
  c.box(11, 9, 26, 10, P.wood, P.woodD, P.woodM, P.woodD);
  grain(c, 12, 10, 24, 8, P.woodD, 11, 5);
  // posts with caps
  for (const x of [0, 41]) {
    c.rect(x + 1, 6, 5, 83, P.wood).rect(x + 1, 6, 1, 83, P.woodL).rect(x + 5, 6, 1, 83, P.woodD);
    c.box(x, 0, 7, 7, P.woodM, P.woodH, P.wood);
    grain(c, x + 2, 26, 4, 56, P.woodD, 7 + x, 6);
  }
  // mattress and sheet
  c.rect(7, 25, 34, 58, P.cream).rect(7, 25, 34, 1, P.creamD).rect(39, 26, 2, 57, P.creamS);
  // pillow
  c.box(10, 27, 28, 14, P.white, P.white, P.creamS, P.creamD);
  c.rect(12, 29, 8, 1, P.cloud).rect(12, 30, 3, 1, P.cloud).rect(11, 38, 26, 1, P.creamS).rect(23, 30, 1, 7, P.creamS);
  // blanket with patchwork quilt and stitching
  c.rect(7, 44, 34, 38, P.blue);
  for (let row = 0; row < 6; row++) for (let col = 0; col < 6; col++) {
    if ((row + col) % 2) c.rect(8 + col * 6, 49 + row * 6, 5, 5, P.blueL);
  }
  for (let y = 49; y < 82; y += 2) c.set(24, y, P.blueD);
  for (let x = 8; x < 40; x += 2) c.set(x, 61, P.blueD);
  c.rect(7, 47, 34, 1, P.blueH).rect(7, 78, 34, 4, P.blueD).rect(39, 47, 2, 31, P.blueD);
  // turned-down sheet
  c.rect(7, 42, 34, 5, P.cream).rect(7, 42, 34, 1, P.white).rect(7, 46, 34, 1, P.creamS);
  // footboard
  c.rect(1, 82, 46, 7, P.woodD).rect(1, 82, 46, 2, P.woodM).rect(1, 84, 46, 1, P.wood);
  return c.art();
})();

const desk: Art = (() => {
  const c = new Canvas(72, 52);
  // desktop and front
  c.rect(0, 16, 72, 31, P.out);
  c.rect(1, 17, 70, 10, P.woodM).rect(1, 17, 70, 1, P.woodH).rect(1, 18, 70, 1, P.woodL).rect(1, 26, 70, 1, P.woodD);
  grain(c, 2, 19, 68, 6, P.wood, 21, 9);
  c.rect(1, 27, 70, 19, P.wood).rect(1, 27, 70, 1, P.woodD);
  grain(c, 2, 29, 68, 16, P.woodD, 5, 8);
  // drawers
  for (const x of [3, 48]) {
    c.box(x, 29, 21, 15, P.woodM, P.woodL, P.wood);
    c.rect(x + 2, 35, 17, 1, P.wood);
    c.box(x + 8, 32, 5, 3, P.gold, P.goldL, P.goldD, P.goldD);
    c.box(x + 8, 38, 5, 3, P.gold, P.goldL, P.goldD, P.goldD);
  }
  // knee space and legs
  c.rect(26, 27, 20, 20, P.out).rect(27, 27, 18, 20, '#24110a').rect(27, 27, 18, 2, '#3a1d0d');
  for (const x of [0, 64]) c.rect(x, 46, 8, 6, P.out).rect(x + 1, 46, 6, 5, P.woodD).rect(x + 1, 46, 1, 5, P.wood);
  // monitor
  c.box(25, 0, 22, 18, P.screen, P.metalD, P.out);
  c.rect(27, 2, 18, 12, '#3f8fd0').rect(27, 2, 18, 4, '#5fb3e6').rect(28, 3, 5, 1, P.skyL).rect(28, 4, 2, 2, P.skyL);
  c.rect(29, 8, 10, 1, '#9fd8f2').rect(29, 10, 7, 1, '#9fd8f2');
  c.rect(33, 18, 6, 2, P.metalD).rect(30, 20, 12, 2, P.metal).rect(30, 21, 12, 1, P.metalD);
  // books
  ([[3, 5, P.red, P.redL], [8, 3, P.blue, P.blueL], [13, 6, P.green, P.greenL]] as const).forEach(([x, top, body, light]) => {
    c.box(x, top, 6, 22 - top, body, light, P.out);
    c.rect(x + 1, top + 4, 4, 1, P.gold);
  });
  // lamp and mug
  c.box(56, 2, 13, 8, P.gold, P.goldL, P.goldD);
  c.rect(61, 10, 3, 9, P.metalD).rect(62, 10, 1, 9, P.metal).box(58, 18, 9, 4, P.metal, P.metalL, P.metalD);
  c.box(49, 15, 6, 7, P.white, P.white, P.creamS).rect(55, 17, 2, 3, P.out);
  return c.art();
})();

const chair: Art = (() => {
  const c = new Canvas(24, 38);
  c.box(3, 0, 18, 18, P.wood, P.woodL, P.woodD);
  c.rect(4, 1, 16, 2, P.woodM);
  c.box(7, 4, 3, 12, P.woodD, undefined, undefined, P.out).box(14, 4, 3, 12, P.woodD, undefined, undefined, P.out);
  c.box(1, 16, 22, 11, P.red, P.redL, P.redD);
  c.rect(3, 18, 18, 1, '#f07a5c').rect(11, 19, 2, 1, P.redD);
  for (const x of [2, 17]) c.rect(x, 27, 5, 11, P.out).rect(x + 1, 27, 3, 10, P.woodD).rect(x + 1, 27, 1, 10, P.wood);
  c.rect(7, 32, 10, 3, P.out).rect(7, 33, 10, 1, P.woodD);
  return c.art();
})();

const sofa: Art = (() => {
  const c = new Canvas(72, 64);
  for (const x of [7, 60]) c.box(x, 55, 5, 9, P.woodD, P.wood, P.out);
  c.box(5, 9, 62, 34, P.blue, P.blueL, P.blueD);
  c.box(9, 12, 26, 25, P.blueL, P.blueH, P.blue);
  c.box(36, 12, 26, 25, P.blueL, P.blueH, P.blue);
  c.box(5, 34, 62, 23, P.blue, P.blueL, P.blueD);
  for (const x of [9, 36]) c.box(x, 35, 26, 12, P.blueL, P.blueH, P.blueD);
  c.box(1, 27, 10, 27, P.blue, P.blueH, P.blueD).box(61, 27, 10, 27, P.blue, P.blueH, P.blueD);
  c.rect(12, 49, 48, 2, P.blueD).rect(13, 52, 46, 1, P.blueL);
  c.box(12, 22, 12, 13, P.gold, P.goldL, P.goldD).rect(17, 25, 2, 7, P.cream);
  c.box(49, 22, 11, 13, P.cream, P.white, P.creamD).rect(51, 27, 7, 2, P.red);
  return c.art();
})();

const armchair: Art = (() => {
  const c = new Canvas(48, 46);
  for (const x of [7, 36]) c.box(x, 39, 5, 7, P.woodD, P.wood, P.out);
  c.box(7, 1, 34, 29, P.greenD, P.greenL, P.greenD);
  c.box(11, 4, 26, 22, P.green, P.greenL, P.greenD);
  c.rect(22, 12, 3, 2, P.greenD).rect(23, 12, 1, 1, P.greenL);
  c.box(7, 25, 34, 16, P.green, P.greenL, P.greenD);
  c.box(11, 25, 26, 9, P.greenL, '#9bd56f', P.green);
  c.box(2, 19, 10, 20, P.green, P.greenL, P.greenD).box(36, 19, 10, 20, P.green, P.greenL, P.greenD);
  c.rect(13, 36, 22, 1, P.greenD);
  return c.art();
})();

const bookshelf: Art = (() => {
  const c = new Canvas(48, 64);
  c.box(2, 1, 44, 61, P.wood, P.woodH, P.woodD);
  c.rect(6, 6, 36, 51, P.woodD);
  for (const y of [6, 24, 42]) {
    let x = 8;
    for (const [i, color] of [P.red, P.blue, P.green, P.gold, P.cream].entries()) {
      const top = y + 2 + i % 3;
      c.box(x, top, 5, y + 16 - top, color, undefined, P.out);
      c.rect(x + 1, top + 3, 3, 1, P.creamS);
      x += 6;
    }
    c.box(5, y + 16, 38, 3, P.woodM, P.woodL, P.woodD);
  }
  c.box(0, 0, 48, 5, P.woodM, P.woodH, P.woodD);
  grain(c, 7, 2, 35, 1, P.wood, 43, 4);
  for (const x of [3, 39]) c.rect(x, 61, 6, 3, P.out);
  return c.art();
})();

const wardrobe: Art = (() => {
  const c = new Canvas(48, 70);
  c.box(2, 3, 44, 63, P.wood, P.woodL, P.woodD);
  for (const x of [5, 25]) {
    c.box(x, 8, 18, 42, P.woodM, P.woodL, P.woodD);
    c.box(x + 3, 11, 12, 35, P.wood, P.woodL, P.woodD);
    grain(c, x + 4, 13, 10, 31, P.woodD, x, 6);
  }
  for (const x of [19, 26]) c.box(x, 29, 3, 5, P.gold, P.goldL, P.goldD);
  c.box(5, 52, 38, 11, P.woodM, P.woodL, P.woodD).box(20, 55, 8, 3, P.gold, P.goldL, P.goldD);
  c.box(0, 0, 48, 6, P.woodM, P.woodH, P.woodD);
  for (const x of [4, 38]) c.box(x, 65, 6, 5, P.woodD, P.wood, P.out);
  return c.art();
})();

const coffeeTable: Art = (() => {
  const c = new Canvas(48, 30);
  for (const x of [5, 38]) c.box(x, 17, 5, 13, P.woodD, P.woodM, P.out);
  c.box(4, 22, 40, 4, P.wood, P.woodL, P.woodD);
  c.box(0, 5, 48, 15, P.woodM, P.woodH, P.woodD);
  grain(c, 3, 8, 42, 8, P.wood, 52, 7);
  c.box(8, 3, 13, 8, P.blue, P.blueL, P.blueD).rect(9, 9, 11, 1, P.cream);
  c.box(30, 2, 8, 9, P.cream, P.white, P.creamD).rect(38, 4, 3, 5, P.out).rect(38, 5, 2, 3, P.woodM);
  c.rect(32, 3, 4, 2, P.woodD);
  return c.art();
})();

const nightstand: Art = (() => {
  const c = new Canvas(24, 40);
  for (const x of [2, 17]) c.box(x, 33, 5, 7, P.woodD, P.woodM, P.out);
  c.box(1, 14, 22, 21, P.wood, P.woodL, P.woodD);
  c.box(3, 18, 18, 13, P.woodM, P.woodL, P.woodD).box(10, 22, 4, 3, P.gold, P.goldL, P.goldD);
  c.box(0, 12, 24, 5, P.woodM, P.woodH, P.woodD);
  c.box(5, 0, 14, 8, P.gold, P.goldL, P.goldD);
  c.rect(11, 8, 2, 4, P.metalD).box(8, 11, 8, 3, P.metal, P.metalL, P.metalD);
  return c.art();
})();

const plant: Art = (() => {
  const c = new Canvas(24, 44);
  c.rect(11, 7, 3, 23, P.greenD).rect(12, 9, 1, 20, P.greenL);
  for (const [x, y, w, h] of [[2, 15, 10, 6], [13, 10, 10, 6], [4, 4, 8, 7], [12, 0, 7, 9], [14, 21, 8, 5], [1, 24, 10, 5]]) {
    c.box(x, y, w, h, P.green, P.greenL, P.greenD, P.greenD);
  }
  c.box(3, 29, 18, 5, '#c0643a', '#e99a67', '#8f4424');
  c.box(5, 34, 14, 10, '#c0643a', '#e08a5a', '#8f4424');
  c.rect(8, 35, 2, 7, '#e99a67').rect(6, 42, 12, 1, '#8f4424');
  return c.art();
})();

const rug: Art = (() => {
  const c = new Canvas(72, 48);
  for (let x = 5; x < 68; x += 3) c.rect(x, 0, 1, 48, P.creamD);
  c.box(2, 3, 68, 42, P.redD, P.red, P.redD, P.creamD);
  c.box(5, 6, 62, 36, P.cream, P.white, P.creamS, P.goldD);
  c.box(8, 9, 56, 30, P.blueD, P.blue, P.blueD, P.red);
  for (let y = 12; y <= 33; y += 7) for (let x = 11; x <= 60; x += 7) c.set(x, y, P.gold);
  for (let y = -10; y <= 10; y++) {
    const half = 10 - Math.abs(y);
    c.rect(35 - half, 24 + y, 1 + half * 2, 1, P.cream);
    if (half > 3) c.rect(38 - half, 24 + y, half * 2 - 5, 1, P.red);
  }
  c.rect(34, 22, 3, 5, P.gold).rect(33, 23, 5, 3, P.gold);
  return c.art();
})();

function makeWindow(night: boolean): Art {
  // 4 x 4 cells: four-pane window with curtains, a rod and a sill with a potted plant.
  const c = new Canvas(96, 96);
  // view: sky bands, clouds and rolling hills
  const glass = { x: 14, y: 14, w: 68, h: 62 };
  const bands = night ? ['#142047', '#192953', '#20345f', '#273e68', '#304973', '#38527d']
    : ['#4f9fe0', '#5fb0e8', '#6fbcee', '#7ec8f2', '#94d4f4', '#a9def6'];
  bands.forEach((band, i) => c.rect(glass.x, glass.y + i * 7, glass.w, 7, band));
  c.rect(glass.x, glass.y + 42, glass.w, 20, night ? '#38527d' : '#a9def6');
  if (night) {
    for (const [x, y] of [[22, 22], [35, 29], [26, 37], [54, 36], [74, 21], [77, 39], [39, 19]]) {
      c.set(x, y, '#fff6cf').set(x + 1, y, '#bfcff4');
    }
    c.rect(59, 21, 10, 12, '#fff3bc').rect(57, 23, 14, 8, '#fff3bc')
      .rect(64, 20, 8, 10, '#192953').rect(67, 26, 5, 5, '#20345f');
  } else {
    c.rect(22, 22, 12, 4, P.cloud).rect(25, 20, 7, 2, P.cloud).rect(56, 30, 14, 4, P.cloud).rect(59, 28, 8, 2, P.cloud).rect(54, 33, 3, 1, '#e3f4fd');
  }
  for (let x = glass.x; x < glass.x + glass.w; x++) {
    const far = 56 + Math.round(3 * Math.sin(x / 7));
    const near = 64 + Math.round(3 * Math.sin(x / 5 + 2));
    c.rect(x, far, 1, 76 - far, night ? '#243b48' : '#5aa86a').rect(x, near, 1, 76 - near, night ? '#172e32' : '#4c9a3c')
      .set(x, near, night ? '#38544c' : '#7fd65a').set(x, far, night ? '#4b6470' : '#86c98e');
  }
  // panes, mullions and frame
  c.rect(46, 14, 4, 62, P.wood).rect(46, 14, 1, 62, P.woodL).rect(49, 14, 1, 62, P.woodD);
  c.rect(14, 43, 68, 4, P.wood).rect(14, 43, 68, 1, P.woodL).rect(14, 46, 68, 1, P.woodD);
  for (const [x, y] of [[16, 16], [52, 16], [16, 49], [52, 49]]) {
    const shine = night ? '#7383aa' : P.skyL;
    c.rect(x, y, 6, 1, shine).rect(x, y, 1, 5, shine).rect(x + 2, y + 2, 2, 1, shine);
  }
  c.rect(8, 8, 80, 6, P.out).rect(8, 76, 80, 4, P.out).rect(8, 8, 6, 72, P.out).rect(82, 8, 6, 72, P.out);
  c.rect(9, 9, 78, 4, P.wood).rect(9, 9, 78, 1, P.woodL).rect(9, 9, 4, 70, P.wood).rect(9, 9, 1, 70, P.woodL).rect(83, 9, 4, 70, P.woodD);
  // sill
  c.box(3, 78, 90, 10, P.woodM, P.woodH, P.wood).rect(6, 88, 84, 3, P.out).rect(7, 88, 82, 2, P.woodD);
  // potted plant on the sill
  c.box(66, 66, 14, 13, '#c0643a', '#e08a5a', '#8f4424').rect(66, 66, 14, 3, P.out).rect(67, 67, 12, 1, '#e08a5a');
  c.rect(70, 56, 3, 10, P.greenD).rect(73, 52, 4, 14, P.green).rect(66, 58, 5, 4, P.green).rect(76, 57, 6, 4, P.greenL).rect(71, 50, 4, 4, P.greenL);
  c.set(74, 53, '#9be06a').set(67, 59, P.greenL).set(79, 58, '#9be06a');
  // curtain rod with gold finials
  c.rect(0, 1, 96, 5, P.out).rect(1, 2, 94, 2, P.woodD).rect(1, 2, 94, 1, P.wood);
  c.box(0, 0, 6, 7, P.gold, P.goldL, P.goldD).box(90, 0, 6, 7, P.gold, P.goldL, P.goldD);
  // curtains, gathered by a tie-back two thirds down
  for (const side of [0, 1]) {
    for (let y = 6; y < 84; y++) {
      const tie = 54;
      const width = y < tie ? 14 - Math.round((y - 6) / 9) : y < tie + 4 ? 8 : Math.min(16, 8 + Math.round((y - tie - 4) / 3));
      const x0 = side === 0 ? 2 : 94 - width;
      c.rect(x0, y, width, 1, P.red);
      c.set(side === 0 ? x0 + width : x0 - 1, y, P.out).set(side === 0 ? x0 - 1 : x0 + width, y, P.out);
      c.set(x0 + Math.floor(width / 3), y, P.redD).set(x0 + Math.floor((2 * width) / 3), y, P.redL);
    }
    const tx = side === 0 ? 2 : 86;
    c.box(tx, 54, 8, 4, P.gold, P.goldL, P.goldD);
    c.rect(side === 0 ? 1 : 79, 84, 16, 2, P.out);
  }
  return c.art();
}
const windowArt = makeWindow(false);
export const nightWindowArt = makeWindow(true);
export const itemArt: Record<string, Art> = {
  bed, window: windowArt, desk, chair,
  'dorm-sofa': sofa, 'dorm-armchair': armchair, 'dorm-bookshelf': bookshelf, 'dorm-wardrobe': wardrobe,
  'dorm-coffee-table': coffeeTable, 'dorm-nightstand': nightstand, 'dorm-plant': plant, 'dorm-rug': rug,
};

// ---------------------------------------------------------------- DormHall doors (24 x 42)
function doorArt(body: string, light: string, dark: string, extra?: (c: Canvas) => void): Art {
  const c = new Canvas(24, 42);
  c.box(0, 0, 24, 42, P.woodD, P.wood, P.out);
  c.box(3, 3, 18, 36, body, light, dark);
  c.box(6, 6, 12, 13, dark, undefined, undefined, dark).rect(7, 7, 10, 11, body).rect(7, 7, 10, 1, light).rect(7, 7, 1, 11, light);
  c.box(6, 22, 12, 14, dark, undefined, undefined, dark).rect(7, 23, 10, 12, body).rect(7, 23, 10, 1, light).rect(7, 23, 1, 12, light);
  c.box(16, 19, 3, 3, P.gold, P.goldL, P.goldD, P.goldD);
  extra?.(c);
  return c.art();
}
export const doors = {
  mine: doorArt('#3f8f55', '#6cc07a', '#2a6a3c', (c) => c.box(8, 0, 8, 5, P.gold, P.goldL, P.goldD).rect(11, 2, 2, 1, P.out)),
  friend: doorArt(P.wood, P.woodL, P.woodD),
  vacant: doorArt(P.grey, P.greyL, P.greyD, (c) => {
    c.box(1, 12, 22, 5, '#c9a46a', '#e3c48c', '#9c7c46').box(1, 26, 22, 5, '#c9a46a', '#e3c48c', '#9c7c46');
    c.set(3, 14, P.greyD).set(20, 14, P.greyD).set(3, 28, P.greyD).set(20, 28, P.greyD);
  }),
  elevator: (() => {
    const c = new Canvas(24, 42);
    c.box(0, 0, 24, 42, P.metalD, P.metal, P.out);
    c.box(3, 6, 9, 33, P.metal, P.metalL, P.metalD).box(12, 6, 9, 33, P.metal, P.metalL, P.metalD);
    c.box(7, 1, 10, 5, P.out).rect(9, 2, 2, 2, '#e05a4a').rect(13, 2, 2, 2, P.gold);
    return c.art();
  })(),
};

export const guestbookArt: Art = (() => {
  const c = new Canvas(48, 24);
  c.box(13, 14, 22, 10, P.woodM, P.woodL, P.wood);
  c.rect(20, 22, 8, 2, P.woodD);
  c.rect(3, 2, 42, 14, P.out).rect(4, 3, 19, 12, P.cream).rect(25, 3, 19, 12, P.cream).rect(23, 3, 2, 12, P.woodD);
  for (const x of [6, 27]) for (let y = 5; y < 14; y += 2) c.rect(x, y, y % 4 ? 13 : 10, 1, P.creamS);
  c.rect(4, 14, 19, 1, P.creamD).rect(25, 14, 19, 1, P.creamD).rect(36, 0, 3, 9, P.red).set(37, 9, P.red);
  return c.art();
})();
export const exitArt: Art = (() => {
  const c = new Canvas(48, 24);
  c.rect(0, 0, 48, 24, P.out).rect(1, 1, 46, 23, '#2a170c').rect(1, 1, 46, 3, '#1d1008');
  c.box(4, 13, 40, 11, P.green, P.greenL, P.greenD);
  for (let x = 7; x < 42; x += 4) c.rect(x, 16, 2, 5, P.greenD);
  return c.art();
})();

// ---------------------------------------------------------------- saved Game Room avatar and furniture poses
const actionSprites = new WeakMap<PixelAvatarSprites, Map<string, { frames: [Art, Art]; sheet: Art }>>();
export function furnitureSprites(key: string, rotation: Rotation = 0, look: PixelAvatarLook = defaultPixelLook) {
  const base = itemArt[key];
  if (!base) return null;
  const view = furnitureView(key, base, rotation);
  if (!view.seat && !view.sleep) return { idle: view.art, action: null };
  const avatar = pixelAvatarSprites(look);
  let poses = actionSprites.get(avatar);
  if (!poses) { poses = new Map(); actionSprites.set(avatar, poses); }
  const cacheKey = `${key}:${rotation}`;
  let action = poses.get(cacheKey);
  if (!action) {
    const frames = ([0, 1] as const).map((frame) => {
      const c = paint(new Canvas(view.art.w, view.art.h), view.art);
      if (view.seat) paint(c, avatar.sit[view.seat.facing][frame], view.seat.x, view.seat.y);
      if (view.sleep) {
        const sleep = view.sleep;
        paint(c, turnFlat(avatar.sleep, sleep.headTurn), sleep.headX, sleep.headY);
        paint(c, sleep.quilt, sleep.quiltX, sleep.quiltY - frame);
      }
      if (view.foreground) paint(c, view.foreground);
      return c.art();
    }) as [Art, Art];
    const sheet = paint(paint(new Canvas(view.art.w * 2, view.art.h), frames[0]), frames[1], view.art.w).art();
    action = { frames, sheet }; poses.set(cacheKey, action);
  }
  return { idle: view.art, action };
}

export function FurnitureOccupant({ kind, itemKey, rotation = 0, seatName = 'chair', look = defaultPixelLook }: { kind: 'bed' | 'chair'; itemKey: string; rotation?: Rotation; seatName?: string; look?: PixelAvatarLook }) {
  const sprites = furnitureSprites(itemKey, rotation, look);
  if (!sprites?.action) return null;
  return (
    <span className={kind === 'bed' ? styles.sleepingPose : styles.seatedPose} role="img"
      aria-label={kind === 'bed' ? 'Sleeping in bed' : `Avatar sitting ${seatName === 'sofa' ? 'on' : 'in'} ${seatName}`} data-facing={rotation} data-avatar-look={pixelLookKey(look)} title={pixelLookLabel(look)}>
      <span className={styles.poseClip}><PixelArt art={sprites.action.sheet} className={styles.poseStrip} /></span>
      {kind === 'bed' ? <span className={styles.sleepLetters} aria-hidden="true"
        style={rotation === 90 ? { left: '78%', top: '22%' } : rotation === 180 ? { left: '58%', top: '42%' } : rotation === 270 ? { left: '10%', top: '22%' } : undefined}>
        <span>z</span><span>Z</span><span>Z</span>
      </span> : null}
    </span>
  );
}

// SRS-504.1, SRS-504.2: saved Game Room pieces are composed once; CSS animates the cached images.
export function PixelAvatar({ facing, moving, sprinting = false, look = defaultPixelLook }: { facing: Direction; moving: boolean; sprinting?: boolean; look?: PixelAvatarLook }) {
  const [standing, stepping] = pixelAvatarSprites(look).walk[facing];
  return (
    <span className={styles.avatar} data-moving={moving} data-sprinting={sprinting} data-avatar-look={pixelLookKey(look)} data-facing={facing} role="img" aria-label={pixelLookLabel(look)}>
      <span className={styles.avatarShadow} />
      <PixelArt art={standing} className={`${styles.avatarSprite} ${styles.frameA}`} />
      <PixelArt art={stepping} className={`${styles.avatarSprite} ${styles.frameB}`} />
    </span>
  );
}

// ---------------------------------------------------------------- surface textures
// Each texture covers `span` x `span` room cells at 24 art-pixels per cell.
function planks(colors: string[], gap: string, light: string, dark: string, seed: number): Art {
  const c = new Canvas(48, 48);
  const r = rng(seed);
  for (let row = 0; row < 8; row++) {
    const y = row * 6;
    c.rect(0, y, 48, 6, colors[row % colors.length]).rect(0, y, 48, 1, light).rect(0, y + 5, 48, 1, gap);
    const seam = Math.floor(r() * 40) + 4;
    c.rect(seam, y, 1, 5, gap).set(seam + 1, y + 1, light);
    grain(c, 0, y + 2, 48, 2, dark, seed + row, 3);
    if (r() < 0.3) c.rect(Math.floor(r() * 40) + 4, y + 2, 2, 2, gap);
  }
  return c.art();
}
function wallpaper(base: string, stripe: string, motif: string, dot: string): Art {
  const c = new Canvas(24, 24);
  c.rect(0, 0, 24, 24, base).rect(0, 0, 3, 24, stripe).rect(12, 0, 1, 24, stripe);
  c.rect(17, 7, 1, 5, motif).rect(15, 9, 5, 1, motif).set(17, 9, dot).set(16, 8, motif).set(18, 10, motif);
  c.set(6, 18, motif).set(5, 19, motif).set(7, 19, motif).set(6, 20, motif).set(6, 19, dot);
  return c.art();
}
const tile = (() => {
  const c = new Canvas(24, 24);
  c.rect(0, 0, 24, 24, '#b9a77e');
  c.box(1, 1, 11, 11, '#e8dcc0', '#fbf3df', '#d2c39f', '#b9a77e').box(12, 12, 11, 11, '#e8dcc0', '#fbf3df', '#d2c39f', '#b9a77e');
  c.box(12, 1, 11, 11, '#d6c7a3', '#e8dcc0', '#c4b48d', '#b9a77e').box(1, 12, 11, 11, '#d6c7a3', '#e8dcc0', '#c4b48d', '#b9a77e');
  return c.art();
})();
const carpet = (() => {
  const c = new Canvas(24, 24);
  const r = rng(3);
  c.rect(0, 0, 24, 24, '#7d5aa0');
  for (let i = 0; i < 70; i++) c.set(Math.floor(r() * 24), Math.floor(r() * 24), r() < 0.5 ? '#9572b8' : '#6a4a8a');
  return c.art();
})();
export const textures: Record<string, { image: string; span: number }> = {
  'floor-oak': { image: uri(planks(['#c27a3e', '#b56f36', '#c98446', '#b97338'], '#6e3a1a', '#d99a5c', '#a8642e', 9)), span: 2 },
  'floor-tile': { image: uri(tile), span: 1 },
  'floor-carpet': { image: uri(carpet), span: 1 },
  'wall-sage': { image: uri(wallpaper('#97c18d', '#86b07d', '#b6dbab', '#5f8f58')), span: 1 },
  'wall-sky': { image: uri(wallpaper('#8fb6dd', '#7fa5cc', '#bcd7f2', '#4f77a8')), span: 1 },
  'wall-cream': { image: uri(wallpaper('#efdcb0', '#e2cb98', '#fff1cf', '#b8935a')), span: 1 },
  hallWall: { image: uri(wallpaper('#d9b98a', '#caa673', '#ecd3a8', '#9c7444')), span: 1 },
  hallFloor: { image: uri(planks(['#a8642e', '#9c5a28', '#b06c34', '#a05e2b'], '#5a2e12', '#c27a3e', '#8a4f22', 4)), span: 2 },
};

// ---------------------------------------------------------------- title banner
const BANNER_W = 240;
const BANNER_H = 60;
function ridge(seed: number, base: number, amp: number) {
  return (x: number) => Math.round(base - amp * (Math.sin(x / 13 + seed) * 0.6 + Math.sin(x / 5.3 + seed * 2) * 0.25 + Math.sin(x / 29 + seed * 3) * 0.5));
}
const bannerArt: Art = (() => {
  const px: Px[] = [];
  ['#14215e', '#1b2f7a', '#24489a', '#2f63b5', '#3b82cc', '#4da3dd', '#69c2e8', '#8edcf0'].forEach((c, i) => px.push([0, i * 5, BANNER_W, 5, c]));
  [[12, 3], [40, 8], [77, 2], [131, 6], [168, 3], [205, 9], [226, 4], [96, 11]].forEach(([x, y]) => px.push([x, y, 1, 1, P.cloud]));
  [[20, 22, 26], [150, 18, 34]].forEach(([x, y, w]) => px.push([x, y, w, 3, '#9fd8f2'], [x + 4, y - 2, w - 10, 2, '#9fd8f2']));
  const far = ridge(1.7, 34, 7);
  const near = ridge(4.2, 43, 6);
  for (let x = 0; x < BANNER_W; x += 2) {
    const f = far(x);
    px.push([x, f, 2, BANNER_H - f, '#3f8f78'], [x, f, 2, 1, '#7cc9a0']);
    const n = near(x);
    px.push([x, n, 2, BANNER_H - n, '#2f8a3a'], [x, n, 2, 1, '#8ee05a'], [x, n + 1, 2, 1, '#5cbf45']);
  }
  px.push([0, 50, BANNER_W, 10, '#3f9a3a'], [0, 50, BANNER_W, 1, '#7fd65a']);
  for (let x = 2; x < BANNER_W; x += 8) px.push([x, 44, 2, 10, P.out], [x, 45, 1, 8, P.woodM]);
  px.push([0, 46, BANNER_W, 2, P.woodD], [0, 46, BANNER_W, 1, P.woodL], [0, 50, BANNER_W, 2, P.woodD], [0, 50, BANNER_W, 1, P.woodL]);
  px.push([0, 55, BANNER_W, 5, '#d9a25a'], [0, 55, BANNER_W, 1, '#f0c27a']);
  return { w: BANNER_W, h: BANNER_H, px };
})();

export function DormSpaceBanner() {
  return (
    <header className={styles.banner}>
      <svg viewBox={`0 0 ${BANNER_W} ${BANNER_H}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden="true" className={styles.bannerArt}>
        {bannerArt.px.map(([x, y, w, h, fill], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />)}
      </svg>
      <h1 className={styles.logo}>DormSpace</h1>
    </header>
  );
}
