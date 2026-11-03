import { describe, expect, it } from 'vitest';
import atlases from '../lib/avatar-atlases.json';
import { adjustFigure, bodyShapes, figureLandmarks, hexLab, paintedSkin, skinColors, toLab, type Pixels } from '../lib/avatar-figure';
import { cropPixels, readPng } from './helpers/png';

// A flat-coloured stand-in figure: skin head and neck with dark eyes and hair, a navy top
// with skin hands at the pockets, khaki trousers and white shoes.
const skin = [200, 150, 120], navy = [38, 59, 101], khaki = [179, 157, 118], dark = [30, 24, 22];
function figure(): Pixels {
  const width = 200, height = 400, data = new Uint8ClampedArray(width * height * 4);
  const paint = (colour: number[], inside: (x: number, y: number) => boolean) => {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (inside(x, y)) data.set([...colour, 255], (y * width + x) * 4);
  };
  paint(skin, (x, y) => ((x - 100) / 22) ** 2 + ((y - 42) / 30) ** 2 <= 1);
  paint(dark, (x, y) => y < 26 && ((x - 100) / 24) ** 2 + ((y - 30) / 22) ** 2 <= 1);
  paint(dark, (x, y) => (Math.abs(x - 91) <= 2 || Math.abs(x - 109) <= 2) && Math.abs(y - 40) <= 2);
  paint(skin, (x, y) => x >= 91 && x <= 109 && y >= 66 && y < 84);
  paint(navy, (x, y) => x >= 40 && x <= 160 && y >= 84 && y < 205);
  paint(skin, (x, y) => (Math.abs(x - 58) <= 5 || Math.abs(x - 142) <= 5) && y >= 172 && y < 182);
  paint(khaki, (x, y) => ((x >= 60 && x <= 96) || (x >= 104 && x <= 140)) && y >= 205 && y < 380);
  paint([240, 240, 236], (x, y) => ((x >= 56 && x <= 98) || (x >= 102 && x <= 144)) && y >= 380 && y < 392);
  return { width, height, data };
}
const pixel = (image: Pixels, x: number, y: number) => Array.from(image.data.subarray((y * image.width + x) * 4, (y * image.width + x) * 4 + 4));
const rowWidth = (image: Pixels, y: number) => { let count = 0; for (let x = 0; x < image.width; x++) if (image.data[(y * image.width + x) * 4 + 3] > 127) count++; return count; };
const distance = (a: number[], b: [number, number, number]) => { const lab = toLab(a[0], a[1], a[2]); return Math.hypot(lab[0] - b[0], lab[1] - b[1], lab[2] - b[2]); };

describe('complete avatar body shape and skin colour', () => {
  it('offers distinct, valid options', () => {
    expect(new Set(bodyShapes.map(shape => shape.id)).size).toBe(bodyShapes.length);
    expect(bodyShapes.find(shape => shape.id === 'average')!.width).toBe(1);
    expect(skinColors).toHaveLength(12);
    expect(new Set(skinColors.map(color => color.hex)).size).toBe(12);
    // Ordered light to deep.
    const lightness = skinColors.map(color => hexLab(color.hex)[0]);
    expect([...lightness].sort((a, b) => b - a)).toEqual(lightness);
  });

  it('finds the head, neck and shoulders of a figure', () => {
    const marks = figureLandmarks(figure())!;
    expect(marks.top).toBeLessThan(16);
    expect(marks.bottom).toBe(391);
    expect(marks.neck).toBeGreaterThan(60); expect(marks.neck).toBeLessThan(86);
    expect(marks.shoulder).toBeGreaterThanOrEqual(marks.neck);
    expect(marks.center).toBeCloseTo(100, 0);
  });

  it('leaves the figure untouched without a change', () => {
    const source = figure();
    expect(adjustFigure(source, {}).data).toEqual(source.data);
  });

  it('widens or narrows the body but never the head', () => {
    const source = figure();
    for (const shape of bodyShapes) {
      const result = adjustFigure(source, { width: shape.width }, 30);
      expect(result.width).toBe(source.width + 60);
      expect(rowWidth(result, 42)).toBe(rowWidth(source, 42));
      expect(Math.abs(rowWidth(result, 150) - rowWidth(source, 150) * shape.width)).toBeLessThanOrEqual(2);
    }
  });

  it('moves only skin to the chosen colour', () => {
    const source = figure(), base = paintedSkin(source, figureLandmarks(source)!)!;
    expect(distance(skin, base)).toBeLessThan(1);
    for (const color of [skinColors[0], skinColors[11]]) {
      const result = adjustFigure(source, { skin: color.hex }), target = hexLab(color.hex);
      for (const [x, y] of [[100, 55], [100, 75], [58, 177], [142, 177]]) expect(distance(pixel(result, x, y), target)).toBeLessThan(2);
      expect(pixel(result, 100, 150)).toEqual([...navy, 255]);
      expect(pixel(result, 80, 300)).toEqual([...khaki, 255]);
      expect(toLab(...pixel(result, 91, 40).slice(0, 3) as [number, number, number])[0]).toBeLessThan(15);
    }
  });

  it('recolours and reshapes every painted figure in the collection', () => {
    for (const [file, atlas] of Object.entries(atlases)) {
      const sheet = readPng(`public/avatars/v4/${file}`);
      for (let cell = 0; cell < 6; cell++) {
        const column = cell % 3, top = cell < 3 ? 0 : atlas.row;
        const source = cropPixels(sheet, atlas.columns[column], top, atlas.columns[column + 1] - atlas.columns[column], (cell < 3 ? atlas.row : atlas.height) - top);
        const marks = figureLandmarks(source);
        expect(marks, `${file} cell ${cell}`).not.toBeNull();
        expect(paintedSkin(source, marks!), `${file} cell ${cell}`).not.toBeNull();
        const result = adjustFigure(source, { skin: skinColors[11].hex, width: 1.27 });
        const tall = marks!.bottom - marks!.top, faceRow = Math.round(marks!.top + tall * 0.08);
        // The face darkens; nothing below the hands changes colour, and the head keeps its width.
        let darker = 0, changedBelow = 0;
        for (let y = Math.round(marks!.top + tall * 0.05); y < marks!.top + tall * 0.12; y++) for (let x = 0; x < source.width; x++) {
          const before = pixel(source, x, y), after = pixel(result, x, y);
          if (before[3] > 250 && after[0] < before[0] - 40) darker++;
        }
        const lowRow = Math.round(marks!.top + tall * 0.7), plain = adjustFigure(source, { width: 1.27 });
        for (let x = 0; x < source.width; x++) if (pixel(result, x, lowRow).join() !== pixel(plain, x, lowRow).join()) changedBelow++;
        expect(darker, `${file} cell ${cell}`).toBeGreaterThan(tall * tall * 0.0015);
        expect(changedBelow, `${file} cell ${cell}`).toBe(0);
        expect(Math.abs(rowWidth(result, faceRow) - rowWidth(source, faceRow)), `${file} cell ${cell}`).toBeLessThanOrEqual(2);
      }
    }
  }, 60000);
});
