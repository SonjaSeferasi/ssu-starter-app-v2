// SRS-201.10 / SRS-201.11: builds the bundled GIF library in public/gif-library/.
//
// The library is generated rather than downloaded so the repository owns every frame: no API key, no
// third-party terms, no attribution to carry, and anyone can rebuild it byte for byte with
// `node scripts/make-gif-library.mjs`. Giphy and Tenor both need a key before they return anything, and
// a student sending a reaction should not wait on that. A GIF from somewhere else reaches a conversation
// by its link or by upload instead.
//
// Each GIF is a handful of SVG frames rendered to raw pixels, stacked into one tall strip, and saved as
// an animated GIF -- the shape libvips expects for a multi-page image.

import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const W = 220;
const H = 160;
const OUT = join(process.cwd(), 'public', 'gif-library');

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
// A value that goes 0 -> 1 -> 0 across the loop, so the last frame meets the first without a jump.
const pulse = (i, n) => Math.sin((i / n) * Math.PI * 2) * 0.5 + 0.5;

function frame(background, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${background}"/>${body}</svg>`;
}

function label(text, y, size = 30, fill = '#ffffff') {
  return `<text x="${W / 2}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}"
    font-weight="bold" fill="${fill}" text-anchor="middle">${text}</text>`;
}

const gifs = {
  // A star that swells and settles, over a word that holds still so it stays readable at thumbnail size.
  'nice': { frames: 12, delay: 80, draw: (i, n) => {
    const s = 0.7 + pulse(i, n) * 0.5;
    const spin = (i / n) * 360;
    return frame('#1f6feb', `<g transform="translate(110 66) rotate(${spin}) scale(${s})">
      <path d="M0 -34 L10 -11 L35 -11 L15 4 L22 28 L0 14 L-22 28 L-15 4 L-35 -11 L-10 -11 Z" fill="#ffd33d"/>
    </g>${label('NICE!', 132)}`);
  } },

  // Two hands meeting and parting.
  'clap': { frames: 10, delay: 70, draw: (i, n) => {
    const gap = 6 + (1 - pulse(i, n)) * 26;
    const hand = (x, flip) => `<g transform="translate(${x} 70) scale(${flip} 1)">
      <rect x="-26" y="-26" width="34" height="52" rx="14" fill="#ffd33d"/>
      <rect x="-30" y="-14" width="14" height="30" rx="7" fill="#f0b429"/></g>`;
    return frame('#8957e5', `${hand(110 - gap, 1)}${hand(110 + gap, -1)}${label('CLAP', 140, 24)}`);
  } },

  // A heart beating on the off-beat, the way a real one does: quick squeeze, slow release.
  'heart': { frames: 12, delay: 70, draw: (i, n) => {
    const t = i / n;
    const beat = t < 0.25 ? ease(t / 0.25) : 1 - ease((t - 0.25) / 0.75);
    const s = 0.85 + beat * 0.35;
    return frame('#e85d75', `<g transform="translate(110 78) scale(${s})">
      <path d="M0 26 C-30 4 -42 -12 -30 -26 C-20 -38 -4 -32 0 -20 C4 -32 20 -38 30 -26 C42 -12 30 4 0 26 Z"
        fill="#ffffff"/></g>`);
  } },

  // The thumb rises once and holds, which reads as approval rather than as a bounce.
  'thumbs-up': { frames: 10, delay: 80, draw: (i, n) => {
    const lift = ease(Math.min(1, (i / n) * 1.6)) * 22;
    return frame('#2ea043', `<g transform="translate(110 ${86 - lift})">
      <rect x="-30" y="-10" width="26" height="44" rx="8" fill="#f0b429"/>
      <path d="M-2 34 L-2 -4 C-2 -14 6 -16 10 -24 C13 -30 11 -40 18 -40 C26 -40 28 -30 24 -18 L22 -12 L40 -12
        C47 -12 50 -6 48 2 L42 26 C40 32 36 34 30 34 Z" fill="#ffd33d"/></g>${label('NICE WORK', 140, 20)}`);
  } },

  // Confetti falling at different speeds, wrapping so the loop never shows an empty sky.
  'confetti': { frames: 14, delay: 70, draw: (i, n) => {
    const bits = [];
    const colors = ['#ffd33d', '#2ea043', '#1f6feb', '#e85d75', '#ffffff'];
    for (let k = 0; k < 22; k += 1) {
      const x = ((k * 37) % (W - 20)) + 10;
      const speed = 1 + (k % 3) * 0.6;
      const y = (((i / n) * H * speed + k * 23) % (H + 20)) - 10;
      const r = (i * 24 + k * 50) % 360;
      bits.push(`<rect x="-5" y="-3" width="10" height="6" rx="1" fill="${colors[k % colors.length]}"
        transform="translate(${x} ${y}) rotate(${r})"/>`);
    }
    return frame('#101822', `${bits.join('')}${label('CONGRATS', 92, 26)}`);
  } },

  // The word arrives from far away and stops, so it is legible for most of the loop.
  'lets-go': { frames: 12, delay: 70, draw: (i, n) => {
    const t = Math.min(1, (i / n) * 1.8);
    // Starts at 0.45 rather than near nothing: the first frame is also the still a grid shows before a
    // browser starts animating, and an almost-empty tile looks like a broken image.
    const s = 0.45 + ease(t) * 0.55;
    return frame('#2ea043', `<g transform="translate(110 88) scale(${s})">
      ${label("LET'S GO", 12, 40).replace(`x="${W / 2}"`, 'x="0"')}</g>`);
  } },

  // A dot runs the track once per loop: "I have left, I am moving".
  'on-my-way': { frames: 12, delay: 70, draw: (i, n) => {
    const x = 24 + ease(i / n) * (W - 48);
    return frame('#1f6feb', `<rect x="20" y="86" width="${W - 40}" height="6" rx="3" fill="#ffffff" opacity="0.3"/>
      <circle cx="${x}" cy="89" r="13" fill="#ffd33d"/>
      <circle cx="${x - 20}" cy="89" r="7" fill="#ffd33d" opacity="0.5"/>
      <circle cx="${x - 36}" cy="89" r="4" fill="#ffd33d" opacity="0.25"/>
      ${label('ON MY WAY', 48, 24)}`);
  } },

  // Shaken rather than scaled, because laughing is a wobble and not a zoom.
  'lol': { frames: 10, delay: 60, draw: (i, n) => {
    const a = Math.sin((i / n) * Math.PI * 4) * 8;
    return frame('#ffd33d', `<g transform="translate(110 96) rotate(${a})">
      ${label('LOL', 0, 56, '#101822').replace(`x="${W / 2}"`, 'x="0"')}</g>`);
  } },
};

async function build(name, spec) {
  // Rendered to PNG and joined with { join: { animated: true } }. Handing sharp one tall raw strip with
  // pageHeight does NOT produce an animation in libvips 8.18 -- it writes a single very tall frame.
  const pages = [];
  for (let i = 0; i < spec.frames; i += 1) {
    pages.push(await sharp(Buffer.from(spec.draw(i, spec.frames))).png().toBuffer());
  }
  const out = join(OUT, `${name}.gif`);
  await sharp(pages, { join: { animated: true } })
    .gif({ loop: 0, delay: new Array(spec.frames).fill(spec.delay) })
    .toFile(out);
  return out;
}

mkdirSync(OUT, { recursive: true });
const report = [];
for (const [name, spec] of Object.entries(gifs)) {
  const file = await build(name, spec);
  const meta = await sharp(file, { animated: true }).metadata();
  report.push({ name, pages: meta.pages, bytes: meta.size });
}
writeFileSync(join(OUT, 'README.txt'),
  'Generated by scripts/make-gif-library.mjs. Do not edit by hand; rebuild instead.\n');
console.log(report.map((r) => `${r.name}: ${r.pages} frames`).join('\n'));
