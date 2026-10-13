'use client';

import type { Direction } from './shared';
import styles from './dormspace.module.css';

// DormSpace pixel art: 24 art-pixels per room cell. Sprites are painted onto a small pixel canvas,
// compacted into horizontal runs and rendered as crisp SVG, so they scale without blurring.
type Px = [number, number, number, number, string];
export type Art = { w: number; h: number; px: Px[] };
export const CELL_PX = 24;

// Warm farmhouse palette: dark-brown outlines, saturated colors, stepped highlights and shadows.
const P = {
  out: '#2e1708', woodD: '#6b3518', wood: '#9c5424', woodM: '#bd6f30', woodL: '#de9a4f', woodH: '#f2c27a',
  cream: '#f6ecd2', creamS: '#dccaa0', creamD: '#bfa977', white: '#fffaf0',
  blueD: '#24457a', blue: '#3a6cb4', blueL: '#5d93dc', blueH: '#8ab8f0',
  red: '#b83a2e', redL: '#e0593f', redD: '#7e2219', gold: '#f5c542', goldD: '#b8862a', goldL: '#fde58a',
  green: '#3f8f3a', greenL: '#6cc04a', greenD: '#2a5f2a',
  sky: '#7ec8f2', skyD: '#5fb0e8', skyL: '#c4ecff', cloud: '#ffffff', screen: '#2e3440',
  metal: '#7d8a99', metalL: '#b7c3d0', metalD: '#4b5563', grey: '#9b958c', greyL: '#c2bcb1', greyD: '#625d55',
};

// ---------------------------------------------------------------- painter
class Canvas {
  readonly px: (string | null)[];
  constructor(readonly w: number, readonly h: number) { this.px = Array(w * h).fill(null); }
  set(x: number, y: number, c: string | null) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c; return this; }
  get(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.px[y * this.w + x] : null; }
  rect(x: number, y: number, w: number, h: number, c: string) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); return this; }
  // Outlined box with a light top/left edge and a dark bottom/right edge.
  box(x: number, y: number, w: number, h: number, fill: string, light?: string, dark?: string, outline = P.out) {
    this.rect(x, y, w, h, outline).rect(x + 1, y + 1, w - 2, h - 2, fill);
    if (light) this.rect(x + 1, y + 1, w - 2, 1, light).rect(x + 1, y + 1, 1, h - 2, light);
    if (dark) this.rect(x + 1, y + h - 2, w - 2, 1, dark).rect(x + w - 2, y + 1, 1, h - 2, dark);
    return this;
  }
  // Paint text rows; each character maps through the palette ('.' and unknown characters are skipped).
  rows(x0: number, y0: number, rows: string[], palette: Record<string, string>) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => { if (palette[ch]) this.set(x0 + i, y0 + j, palette[ch]); }));
    return this;
  }
  art(): Art {
    const px: Px[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w;) {
        const c = this.get(x, y);
        let run = 1;
        while (c && this.get(x + run, y) === c) run++;
        if (c) px.push([x, y, run, 1, c]);
        x += run;
      }
    }
    return { w: this.w, h: this.h, px };
  }
}
function rng(seed: number) {
  return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Short darker streaks give wood its grain.
function grain(c: Canvas, x: number, y: number, w: number, h: number, color: string, seed: number, count: number) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) c.rect(x + Math.floor(r() * (w - 4)), y + Math.floor(r() * h), 2 + Math.floor(r() * 4), 1, color);
}
const mirror = (half: string) => half + [...half].reverse().join('');

function svg({ w, h, px }: Art) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" shape-rendering="crispEdges">${
    px.map(([x, y, pw, ph, c]) => `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" fill="${c}"/>`).join('')}</svg>`;
}
const uri = (art: Art) => `url("data:image/svg+xml,${encodeURIComponent(svg(art))}")`;

export function PixelArt({ art, className, label, style }: { art: Art; className?: string; label?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox={`0 0 ${art.w} ${art.h}`} shapeRendering="crispEdges" preserveAspectRatio="none" style={style}
      className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {art.px.map(([x, y, w, h, fill], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />)}
    </svg>
  );
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

const windowArt: Art = (() => {
  // 4 x 4 cells: four-pane window with curtains, a rod and a sill with a potted plant.
  const c = new Canvas(96, 96);
  // view: sky bands, clouds and rolling hills
  const glass = { x: 14, y: 14, w: 68, h: 62 };
  ['#4f9fe0', '#5fb0e8', '#6fbcee', '#7ec8f2', '#94d4f4', '#a9def6'].forEach((band, i) => c.rect(glass.x, glass.y + i * 7, glass.w, 7, band));
  c.rect(glass.x, glass.y + 42, glass.w, 20, '#a9def6');
  c.rect(22, 22, 12, 4, P.cloud).rect(25, 20, 7, 2, P.cloud).rect(56, 30, 14, 4, P.cloud).rect(59, 28, 8, 2, P.cloud).rect(54, 33, 3, 1, '#e3f4fd');
  for (let x = glass.x; x < glass.x + glass.w; x++) {
    const far = 56 + Math.round(3 * Math.sin(x / 7));
    const near = 64 + Math.round(3 * Math.sin(x / 5 + 2));
    c.rect(x, far, 1, 76 - far, '#5aa86a').rect(x, near, 1, 76 - near, '#4c9a3c').set(x, near, '#7fd65a').set(x, far, '#86c98e');
  }
  // panes, mullions and frame
  c.rect(46, 14, 4, 62, P.wood).rect(46, 14, 1, 62, P.woodL).rect(49, 14, 1, 62, P.woodD);
  c.rect(14, 43, 68, 4, P.wood).rect(14, 43, 68, 1, P.woodL).rect(14, 46, 68, 1, P.woodD);
  for (const [x, y] of [[16, 16], [52, 16], [16, 49], [52, 49]]) c.rect(x, y, 6, 1, P.skyL).rect(x, y, 1, 5, P.skyL).rect(x + 2, y + 2, 2, 1, P.skyL);
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
})();
export const itemArt: Record<string, Art> = { bed, window: windowArt, desk, chair };

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

// ---------------------------------------------------------------- player avatar (24 x 44)
// Default student avatar: long strawberry-auburn hair with a bow, green eyes with lashes, and a
// pink puff-sleeve dress with a white collar and sash, white socks and Mary Jane shoes.
// Palette: k outline · h/H/j hair · p/q bow · s/S skin · r blush · w/e/E eyes · m lips ·
// d/D/f dress · c collar · a sash.
const AV: Record<string, string> = {
  k: P.out, h: '#c4572a', H: '#ee8a4a', j: '#8a3418', p: '#ff7aa8', q: '#c94680',
  s: '#f8d3ac', S: '#e0a87c', r: '#f49aa0', w: '#ffffff', e: '#4a9a5a', E: '#1b2f1f', m: '#d8546a',
  d: '#f39ac0', D: '#cf6f9b', f: '#ffc6dd', c: '#fffaf0', a: '#fff7e0',
};
const SOCK = '#ffffff';
const SOCK_SHADE = '#e3dbe8';
const SHOE = '#7e2c3a';
const SHOE_LIGHT = '#b04a5a';
// Front and back views are symmetric: author the left 12 columns and mirror them.
const FRONT_HEAD = [
  '........kkkk', '......kkhhHH', '.....khhHHHH', '....khhHHHhh', '...khhHHhhhh', '...khhhhhhhh', '..khhhhhhhhh',
  '..khhhjhhhhh', '..khhjhhhhjh', '.khhhjsshjss', '.khhhsssssss', '.khhsskkksss', '.khhssswesss', '.khhssseesss',
  '.khhrrsEEsss', '.khhhSsssssm', '.khhhhkSssss', '.khhhhhkSSss', '.khhhhhhkkSs',
];
const BACK_HEAD = [
  '........kkkk', '......kkhhHH', '.....khhHHHH', '....khhHHHhh', '...khhHHhhhh', '...khhhhhhhh', '..khhhhhhhhh',
  '..khhhhjhhhj', '..khhhhjhhhj', '.khhhhjhhhjh', '.khhhhjhhhjh', '.khhhhjhhhjh', '.khhhhjhhhjh', '.khhhhjhhhjh',
  '.khhhhjhhhjh', '.khhhhjhhhjh', '.khhhhjhhhjh', '.khhhhjhhhjh', '.khhhhjhhhjh',
];
const FRONT_BODY = [
  '.khhhhhkkccc', '.khhhkfffkcd', '.khhkffddkdd', '.kjhkfdDDkdd', '..kjkdDDkfdd', '..kjkksSkddd', '...kkksSkddd',
  '....ksSkaaaa', '....ksSkdddd', '....ksskdddd', '...kkkdddDdd', '..kddddddDdd', '..kDDDDDDDDD',
];
const BACK_BODY = [
  '.khhhhjhhhjh', '.khhhkfffkhh', '.khhkffddkhh', '.kjhkfdDDkjh', '..kjkdDDkjjh', '..kjkksSkkjj', '...kkksSkddd',
  '....ksSkaaaa', '....ksSkdddd', '....ksskdddd', '...kkkdddDdd', '..kddddddDdd', '..kDDDDDDDDD',
];
// The right-facing profile is asymmetric and authored at full width; left is its mirror image.
const SIDE = [
  '..........kkkkkk........',
  '........kkhhHHHhkk......',
  '.......khhHHHHhhhhk.....',
  '......khhHHhhhhhhhhk....',
  '.....khhHhhhhhhhhhhhk...',
  '.....khhhhhhhhhhhhhhk...',
  '....khhhjhhhhhhhhhhhhk..',
  '....khhhjhhhhhhhhhhhsk..',
  '....khhhjhhhhhhhjssssk..',
  '....khhhjhhhhhhjsssssk..',
  '....khhhjhhhhhhSssssssk.',
  '....khhhjhhhhhhSssskksk.',
  '....khhhjhhhhhhSssswesk.',
  '....khhhjhhhhhhSssseEsk.',
  '....khhhjhhhhhSsrrsssSk.',
  '....khhhjhhhhhhSsssmsk..',
  '....khhhjhhhhhhkSsssk...',
  '....khhhjhhhhhhhkSSk....',
  '....kjhhjhhhhhhhkSk.....',
  '....kjhhhhhhhkkcck......',
  '....kjhhhhhhkdfccdk.....',
  '.....kjhhhhhkdfddddk....',
  '.....kjjhhhhkdfkkkdk....',
  '......kjjhhkdkfffkdk....',
  '.......kjjkddkfDfkdk....',
  '........kjkddksSkddk....',
  '.........kkddksSkddk....',
  '..........kaaksSkaak....',
  '..........kddksskddk....',
  '.........kdddkkkdddk....',
  '........kdddDddddDdk....',
  '.......kdddDdddddDdk....',
  '.......kDDDDDDDDDDDk....',
];
const BOW = ['.k...k.', 'kpk.kpk', 'kppqppk', 'kpk.kpk', '.k...k.'];

function leg(c: Canvas, x: number, top: number, bottom: number) {
  c.rect(x, top, 5, bottom - top, P.out).rect(x + 1, top, 3, bottom - top, AV.s).rect(x + 3, top, 1, bottom - top, AV.S);
  c.rect(x + 1, bottom - 3, 3, 3, SOCK).rect(x + 3, bottom - 3, 1, 3, SOCK_SHADE);
  c.rect(x - 1, bottom, 7, 4, P.out).rect(x, bottom, 5, 3, SHOE).rect(x, bottom, 5, 1, SHOE_LIGHT);
}
function legsFront(c: Canvas, frame: 0 | 1) {
  // While walking, the left foot lifts two pixels on the second frame.
  leg(c, 7, 32, frame === 1 ? 37 : 39);
  leg(c, 12, 32, 39);
}
function legsSide(c: Canvas, frame: 0 | 1) {
  // Standing: legs together. Stepping: the back leg lifts behind while the front leg strides.
  if (frame === 0) leg(c, 12, 33, 39);
  else { leg(c, 9, 33, 38); leg(c, 14, 33, 39); }
}
function avatarArt(direction: Direction, frame: 0 | 1): Art {
  const c = new Canvas(24, 44);
  if (direction === 'down' || direction === 'up') {
    legsFront(c, frame);
    c.rows(0, 0, (direction === 'down' ? FRONT_HEAD : BACK_HEAD).map(mirror), AV);
    c.rows(0, 19, (direction === 'down' ? FRONT_BODY : BACK_BODY).map(mirror), AV);
    c.rows(14, 1, BOW, AV);
    if (direction === 'down') c.set(8, 3, AV.H).set(9, 4, AV.H); // hair shine is lit from one side
  } else {
    legsSide(c, frame);
    c.rows(0, 0, SIDE, AV);
    c.rows(6, 1, BOW, AV);
  }
  const art = c.art();
  if (direction !== 'left') return art;
  return { ...art, px: art.px.map(([x, y, w, h, color]): Px => [art.w - x - w, y, w, h, color]) };
}
const avatars = (['down', 'up', 'left', 'right'] as Direction[]).reduce(
  (all, d) => ({ ...all, [d]: [avatarArt(d, 0), avatarArt(d, 1)] }), {} as Record<Direction, [Art, Art]>);

// SRS-504.1, SRS-504.2: the Game Room default avatar until customized avatars are available.
export function PixelAvatar({ facing, moving, sprinting = false }: { facing: Direction; moving: boolean; sprinting?: boolean }) {
  const [standing, stepping] = avatars[facing];
  return (
    <span className={styles.avatar} data-moving={moving} data-sprinting={sprinting} aria-hidden="true">
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
