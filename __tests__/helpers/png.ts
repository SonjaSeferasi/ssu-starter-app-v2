import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import type { Pixels } from '../../lib/avatar-figure';

/** Reads an 8-bit RGBA, non-interlaced PNG (the format of the avatar atlases). */
export function readPng(file: string): Pixels {
  const png = readFileSync(file), width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  if (png[24] !== 8 || png[25] !== 6 || png[28] !== 0) throw new Error(`${file} is not 8-bit RGBA`);
  const parts: Buffer[] = [];
  for (let i = 8; i < png.length;) {
    const length = png.readUInt32BE(i);
    if (png.toString('ascii', i + 4, i + 8) === 'IDAT') parts.push(png.subarray(i + 8, i + 8 + length));
    i += length + 12;
  }
  const raw = inflateSync(Buffer.concat(parts)), stride = width * 4, data = new Uint8ClampedArray(stride * height);
  let previous = new Uint8Array(stride), offset = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[offset++], row = new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? row[x - 4] : 0, b = previous[x], c = x >= 4 ? previous[x - 4] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const predicted = filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : filter === 4 ? (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) : 0;
      row[x] = (raw[offset++] + predicted) & 255;
    }
    data.set(row, y * stride); previous = row;
  }
  return { width, height, data };
}

export function cropPixels(image: Pixels, x: number, y: number, width: number, height: number): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) data.set(image.data.subarray(((y + row) * image.width + x) * 4, ((y + row) * image.width + x + width) * 4), row * width * 4);
  return { width, height, data };
}
