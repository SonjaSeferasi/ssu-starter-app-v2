export type Px = [number, number, number, number, string];
export type Art = { w: number; h: number; px: Px[] };
export const CELL_PX = 24;

// Warm farmhouse palette: dark-brown outlines, saturated colors, stepped highlights and shadows.
export const P = {
  out: '#2e1708', woodD: '#6b3518', wood: '#9c5424', woodM: '#bd6f30', woodL: '#de9a4f', woodH: '#f2c27a',
  cream: '#f6ecd2', creamS: '#dccaa0', creamD: '#bfa977', white: '#fffaf0',
  blueD: '#24457a', blue: '#3a6cb4', blueL: '#5d93dc', blueH: '#8ab8f0',
  red: '#b83a2e', redL: '#e0593f', redD: '#7e2219', gold: '#f5c542', goldD: '#b8862a', goldL: '#fde58a',
  green: '#3f8f3a', greenL: '#6cc04a', greenD: '#2a5f2a',
  sky: '#7ec8f2', skyD: '#5fb0e8', skyL: '#c4ecff', cloud: '#ffffff', screen: '#2e3440',
  metal: '#7d8a99', metalL: '#b7c3d0', metalD: '#4b5563', grey: '#9b958c', greyL: '#c2bcb1', greyD: '#625d55',
};

// ---------------------------------------------------------------- painter
export class Canvas {
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
export function rng(seed: number) {
  return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Short darker streaks give wood its grain.
export function grain(c: Canvas, x: number, y: number, w: number, h: number, color: string, seed: number, count: number) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) c.rect(x + Math.floor(r() * (w - 4)), y + Math.floor(r() * h), 2 + Math.floor(r() * 4), 1, color);
}
export const mirror = (half: string) => half + [...half].reverse().join('');

export function paint(canvas: Canvas, art: Art, x = 0, y = 0) {
  for (const [px, py, w, h, color] of art.px) canvas.rect(x + px, y + py, w, h, color);
  return canvas;
}
export function mirrorArt(art: Art): Art {
  return { ...art, px: art.px.map(([x, y, w, h, color]): Px => [art.w - x - w, y, w, h, color]) };
}
// Flat textiles and lying heads may turn in the image plane. Upright furniture uses drawn views.
export function turnFlat(art: Art, rotation: 0 | 90 | 180 | 270): Art {
  if (rotation === 0) return art;
  const side = rotation === 90 || rotation === 270;
  return { w: side ? art.h : art.w, h: side ? art.w : art.h, px: art.px.map(([x, y, w, h, color]): Px =>
    rotation === 90 ? [art.h - y - h, x, h, w, color]
      : rotation === 180 ? [art.w - x - w, art.h - y - h, w, h, color] : [y, art.w - x - w, h, w, color]) };
}
export function cropArt(art: Art, x: number, y: number, width: number, height: number) {
  return paint(new Canvas(width, height), art, -x, -y).art();
}

