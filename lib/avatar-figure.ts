// Body shape and skin colour for complete avatars. The painted figures are not
// repainted: the browser narrows or widens the body below the neck and moves the
// painted skin to another tone, keeping the artwork's own shading.

export const bodyShapes = [
  { id: 'slim', name: 'Slim', width: 0.88 },
  { id: 'average', name: 'Average', width: 1 },
  { id: 'broad', name: 'Broad', width: 1.13 },
  { id: 'plus', name: 'Plus size', width: 1.27 },
] as const;
export type BodyShape = (typeof bodyShapes)[number]['id'];

/**
 * Light to deep, with pink, neutral, golden and olive undertones. Each colour is the
 * median of the recoloured face, shading included, so the button matches the result.
 * Absent = the tone painted in the art.
 */
export const skinColors = [
  { id: 'ivory', name: 'Ivory', hex: '#e4b8a4' }, { id: 'rosy', name: 'Rosy fair', hex: '#deab98' },
  { id: 'beige', name: 'Beige', hex: '#d1a586' }, { id: 'sand', name: 'Sand', hex: '#ca9979' },
  { id: 'olive', name: 'Olive', hex: '#b48f6a' }, { id: 'honey', name: 'Honey', hex: '#ba825a' },
  { id: 'tan', name: 'Tan', hex: '#ac7453' }, { id: 'caramel', name: 'Caramel', hex: '#9c6547' },
  { id: 'chestnut', name: 'Chestnut', hex: '#89573e' }, { id: 'brown', name: 'Brown', hex: '#764a35' },
  { id: 'espresso', name: 'Espresso', hex: '#613e2e' }, { id: 'deep', name: 'Deep', hex: '#4d3328' },
] as const;
export type SkinColor = (typeof skinColors)[number]['id'];

export type Pixels = { width: number; height: number; data: Uint8ClampedArray };
export type FigureAdjustment = { width?: number; skin?: string };

/** Rows (and the centre column) that the warp and skin mask are measured from. */
export type Landmarks = { top: number; bottom: number; center: number; neck: number; shoulder: number };

const solid = 40;

/** Finds the figure from its alpha: head top, narrowest neck row, shoulder line and feet. */
export function figureLandmarks({ width, height, data }: Pixels): Landmarks | null {
  const rowWidth = new Array<number>(height).fill(0), rowLeft = new Array<number>(height).fill(width), rowRight = new Array<number>(height).fill(-1);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > solid) {
    rowWidth[y]++; rowLeft[y] = Math.min(rowLeft[y], x); rowRight[y] = Math.max(rowRight[y], x);
  }
  // Ignore stray specks: the figure is the tallest run of well-filled rows.
  const filled = (y: number) => rowWidth[y] > width * 0.04;
  let top = -1, bottom = -1, runStart = -1;
  for (let y = 0; y <= height; y++) {
    if (y < height && filled(y)) { if (runStart < 0) runStart = y; continue; }
    if (runStart >= 0 && y - runStart > bottom - top) { top = runStart; bottom = y - 1; }
    runStart = -1;
  }
  if (top < 0 || bottom - top < height * 0.3) return null;
  const tall = bottom - top;
  // The neck is the narrowest row under the head; the shoulders are where the body has widened.
  let neck = top + Math.round(tall * 0.1);
  for (let y = neck; y < top + tall * 0.2; y++) if (rowWidth[y] < rowWidth[neck]) neck = y;
  const headWidth = Math.max(...rowWidth.slice(top, neck));
  // Long hair and hijab drapes hide the shoulders' outline, so cap how far down they can be.
  let shoulder = neck;
  while (shoulder < neck + tall * 0.08 && rowWidth[shoulder] < Math.max(headWidth * 1.9, rowWidth[neck] * 2.4)) shoulder++;
  // Centre of the torso, so the body widens evenly about its own middle.
  let mass = 0, sum = 0;
  for (let y = shoulder; y < top + tall * 0.55; y++) for (let x = rowLeft[y]; x <= rowRight[y]; x++) {
    const alpha = data[(y * width + x) * 4 + 3]; mass += alpha; sum += alpha * x;
  }
  return { top, bottom, center: mass ? sum / mass : width / 2, neck, shoulder };
}

/** Horizontal scale for each row: 1 for the head, the chosen width for the body, eased in between. */
export function widthProfile(marks: Landmarks, scale: number, height: number) {
  const ease = (from: number, to: number, y: number) => { const t = Math.min(1, Math.max(0, (y - from) / Math.max(1, to - from))); return t * t * (3 - 2 * t); };
  const tall = marks.bottom - marks.top, feet = marks.top + tall * 0.86;
  return Array.from({ length: height }, (_, y) => {
    const body = 1 + (scale - 1) * ease(marks.neck - tall * 0.01, marks.shoulder + tall * 0.03, y);
    // Shoes stay closer to their painted size.
    return body - (body - 1) * 0.55 * ease(feet, marks.bottom, y);
  });
}

// ---- Colour: sRGB <-> CIE Lab (D65) ----
const linear = Array.from({ length: 256 }, (_, v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
const fInverse = (t: number) => (t > 0.206893 ? t * t * t : (t - 16 / 116) / 7.787);
const gamma = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
export function toLab(r: number, g: number, b: number): [number, number, number] {
  const R = linear[r], G = linear[g], B = linear[b];
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047), y = f(0.2126 * R + 0.7152 * G + 0.0722 * B), z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
export function fromLab(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16) / 116, X = fInverse(fy + a / 500) * 0.95047, Y = fInverse(fy), Z = fInverse(fy - b / 200) * 1.08883;
  return [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.204 * Y + 1.057 * Z].map(gamma) as [number, number, number];
}
export function hexLab(hex: string) {
  return toLab(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16));
}

const hue = (a: number, b: number) => Math.atan2(b, a) * 180 / Math.PI;
const ramp = (value: number, zero: number, one: number) => Math.min(1, Math.max(0, (value - zero) / (one - zero)));
/** Loose test used only to measure the painted tone from the face. */
const skinLike = (L: number, a: number, b: number) => L > 18 && L < 92 && a > 4 && b > 6 && hue(a, b) > 25 && hue(a, b) < 80;

/** Median painted skin colour, measured on the face and neck. */
export function paintedSkin({ width, data }: Pixels, marks: Landmarks): [number, number, number] | null {
  const Ls: number[] = [], as: number[] = [], bs: number[] = [];
  const headTop = marks.top + (marks.neck - marks.top) * 0.3;
  for (let y = Math.round(headTop); y < marks.shoulder; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4; if (data[i + 3] < 250) continue;
    const lab = toLab(data[i], data[i + 1], data[i + 2]);
    if (skinLike(...lab)) { Ls.push(lab[0]); as.push(lab[1]); bs.push(lab[2]); }
  }
  if (Ls.length < 200) return null;
  const median = (values: number[]) => values.sort((p, q) => p - q)[values.length >> 1];
  return [median(Ls), median(as), median(bs)];
}

/**
 * How sure we are that a pixel is painted skin (0-1), judged against the measured face tone.
 * `strict` narrows the colour match for the hands, which rest beside khaki and cream clothes.
 */
export function skinWeight(lab: [number, number, number], base: [number, number, number], strict = false) {
  const [L, a, b] = lab, chroma = Math.hypot(a, b), baseChroma = Math.hypot(base[1], base[2]);
  let turn = Math.abs(hue(a, b) - hue(base[1], base[2])); if (turn > 180) turn = 360 - turn;
  const [hueFull, hueNone] = strict ? [6, 13] : [12, 24];
  return (1 - ramp(turn, hueFull, hueNone)) * ramp(chroma, baseChroma * (strict ? 0.55 : 0.3), baseChroma * (strict ? 0.75 : 0.55))
    * (1 - ramp(chroma, baseChroma * 1.6, baseChroma * 2))
    * ramp(L, base[0] - (strict ? 30 : 42), base[0] - (strict ? 18 : 28)) * (1 - ramp(L, base[0] + (strict ? 14 : 26), base[0] + (strict ? 24 : 40)));
}

/**
 * Skin weight for every pixel. Face and neck: skin-coloured pixels connected to the
 * middle of the face, so cream knits and khaki beside the neck are left alone. Hands
 * (in the pockets): a strict colour match in that band only.
 */
export function skinMask({ width, height, data }: Pixels, marks: Landmarks, base: [number, number, number]) {
  const tall = marks.bottom - marks.top, mask = new Float32Array(width * height);
  const headEnd = Math.min(height, Math.round(marks.top + tall * 0.3));
  const handsStart = Math.round(marks.top + tall * 0.36), handsEnd = Math.min(height, Math.round(marks.top + tall * 0.56));
  // Lab colour of the head band, worked out once.
  const loose = new Float32Array(width * headEnd), lab = new Float32Array(width * headEnd * 3);
  for (let i = 0; i < width * headEnd; i++) {
    if (data[i * 4 + 3] < 8) continue;
    const colour = toLab(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    lab[i * 3] = colour[0]; lab[i * 3 + 1] = colour[1]; lab[i * 3 + 2] = colour[2];
    loose[i] = skinWeight(colour, base);
  }
  const neighbours = [-1, 1, -width, width], strong = 0.3, reached = new Uint8Array(width * headEnd), queue: number[] = [];
  const faceTop = Math.round(marks.top + tall * 0.04), faceBottom = Math.round(marks.top + tall * 0.12), reach = tall * 0.05;
  for (let y = faceTop; y < faceBottom; y++) for (let x = Math.max(0, Math.round(marks.center - reach)); x < Math.min(width, marks.center + reach); x++) {
    const i = y * width + x; if (loose[i] > 0.8) { reached[i] = 1; queue.push(i); }
  }
  // Below the shoulders only the neck and collar can show skin; hair ends there lie over clothes.
  const collar = Math.round(marks.shoulder) * width, collarReach = tall * 0.08;
  while (queue.length) {
    const i = queue.pop()!, x = i % width;
    for (let step = 0; step < 4; step++) {
      const j = i + neighbours[step];
      if (j < 0 || j >= reached.length || reached[j] || loose[j] < strong || Math.abs((j % width) - x) > 1) continue;
      if (j >= collar && Math.abs((j % width) - marks.center) > collarReach) continue;
      reached[j] = 1; queue.push(j);
    }
  }
  // Keep the soft, partly-skin pixels along the edge of the connected skin.
  for (let i = 0; i < reached.length; i++) {
    const x = i % width, near = reached[i] || (x > 0 && reached[i - 1]) || (x < width - 1 && reached[i + 1]) || reached[i - width] || reached[i + width];
    if (near) mask[i] = loose[i];
  }
  // Inside the face's outline, the redder skin (blush and lips) follows the skin too, so it
  // never stays pale on a deep tone. A rose hijab lies outside the outline. Features darker
  // than the skin (brows, lashes) are marked so they can stay darker than a deeper tone.
  const baseHue = hue(base[1], base[2]), baseChroma = Math.hypot(base[1], base[2]), features = new Float32Array(width * height);
  for (let y = 0; y < headEnd; y++) {
    let left = width, right = -1;
    for (let x = 0; x < width; x++) if (reached[y * width + x]) { left = Math.min(left, x); right = x; }
    for (let x = left + 1; x < right; x++) {
      const i = y * width + x;
      const L = lab[i * 3], a = lab[i * 3 + 1], b = lab[i * 3 + 2], redder = baseHue - hue(a, b);
      mask[i] = Math.max(mask[i], ramp(redder, -4, 4) * (1 - ramp(redder, 40, 55)) * ramp(Math.hypot(a, b), baseChroma * 0.7, baseChroma * 0.95)
        * ramp(L, base[0] - 40, base[0] - 30) * (1 - ramp(L, base[0] + 18, base[0] + 26)));
      features[i] = 1 - ramp(L, base[0] - 15, base[0] - 5);
    }
  }
  // Small gaps enclosed by the skin with nothing dark in them are shine on the skin. Eyes
  // (lashes, iris) and the mouth (lip line) always contain dark pixels, so they stay.
  const seen = new Uint8Array(reached.length), speck = tall * tall * 0.0003;
  for (let start = 0; start < reached.length; start++) {
    if (reached[start] || seen[start]) continue;
    const hole = [start]; let shine = true; seen[start] = 1;
    for (let n = 0; n < hole.length; n++) {
      const i = hole[n], x = i % width;
      if (x === 0 || x === width - 1 || i < width || i >= reached.length - width || data[i * 4 + 3] < 8) shine = false;
      if (lab[i * 3] < base[0] - 15) shine = false;
      for (let step = 0; step < 4; step++) {
        const j = i + neighbours[step];
        if (j < 0 || j >= reached.length || reached[j] || seen[j] || Math.abs((j % width) - x) > 1) continue;
        seen[j] = 1; hole.push(j);
      }
    }
    if (shine && hole.length <= speck) for (const i of hole) mask[i] = 1;
  }
  // Glints surrounded by skin follow their surroundings, so no pale ring is left. Only light
  // pixels: thin eyebrows are surrounded by skin too. Eyes are not mostly surrounded by skin.
  let top = headEnd, bottom = 0, left = width, right = 0;
  for (let i = 0; i < reached.length; i++) if (reached[i]) {
    const x = i % width, y = (i - x) / width; top = Math.min(top, y); bottom = Math.max(bottom, y); left = Math.min(left, x); right = Math.max(right, x);
  }
  for (let pass = 0; pass < 2; pass++) for (let y = Math.max(2, top); y < Math.min(headEnd - 2, bottom + 1); y++) for (let x = Math.max(2, left); x < Math.min(width - 2, right + 1); x++) {
    let sum = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) sum += mask[(y + dy) * width + x + dx];
    const i = y * width + x, around = (sum - mask[i]) / 24;
    if (around > 0.6 && mask[i] < around && data[i * 4 + 3] >= 8 && lab[i * 3] >= base[0] - 10) mask[i] = around;
  }
  for (let y = handsStart; y < handsEnd; y++) for (let x = 0; x < width; x++) {
    // Skin is redder than it is blue; denim, navy and greens are skipped before the Lab maths.
    const i = y * width + x, r = data[i * 4], b = data[i * 4 + 2];
    if (data[i * 4 + 3] >= 8 && r > b && r >= data[i * 4 + 1]) mask[i] = skinWeight(toLab(r, data[i * 4 + 1], b), base, true);
  }
  return { skin: mask, features };
}

/**
 * Returns a new image `pad` pixels wider on each side, with the body width and
 * skin colour applied. The figure keeps its place; only rows below the neck move.
 */
export function adjustFigure(source: Pixels, adjust: FigureAdjustment, pad = 0): Pixels {
  const { width, height, data } = source, outWidth = width + pad * 2;
  const out = new Uint8ClampedArray(outWidth * height * 4);
  const marks = figureLandmarks(source);
  const scale = marks && adjust.width && adjust.width !== 1 ? widthProfile(marks, adjust.width, height) : null;
  const center = marks?.center ?? width / 2;
  // Resample each row about the centre column (bilinear in x).
  for (let y = 0; y < height; y++) {
    const s = scale ? scale[y] : 1;
    for (let x = 0; x < outWidth; x++) {
      const sx = (x - pad + 0.5 - center) / s + center - 0.5, x0 = Math.floor(sx), t = sx - x0, o = (y * outWidth + x) * 4;
      if (x0 < -1 || x0 >= width) continue;
      const i0 = (y * width + x0) * 4, w0 = x0 >= 0 ? (1 - t) * data[i0 + 3] : 0, w1 = x0 + 1 < width ? t * data[i0 + 7] : 0;
      const alpha = w0 + w1; if (!alpha) continue;
      for (let k = 0; k < 3; k++) out[o + k] = ((w0 ? w0 * data[i0 + k] : 0) + (w1 ? w1 * data[i0 + 4 + k] : 0)) / alpha;
      out[o + 3] = alpha;
    }
  }
  const result = { width: outWidth, height, data: out };
  if (!adjust.skin || !marks) return result;
  const base = paintedSkin(source, marks);
  if (!base) return result;
  const target = hexLab(adjust.skin);
  const lightness = Math.min(1.8, Math.max(0.5, target[0] / base[0]));
  const colourfulness = Math.min(1.5, Math.max(0.6, Math.hypot(target[1], target[2]) / Math.max(1, Math.hypot(base[1], base[2]))));
  const { skin, features } = skinMask(result, { ...marks, center: marks.center + pad }, base);
  const darken = Math.min(1, target[0] / base[0]);
  for (let i = 0; i < out.length; i += 4) {
    const weight = skin[i / 4], feature = darken < 1 ? features[i / 4] * (1 - weight) : 0;
    if (!weight && !feature) continue;
    const lab = toLab(out[i], out[i + 1], out[i + 2]);
    const moved = feature
      ? fromLab(lab[0] * darken, lab[1] * darken, lab[2] * darken).map((value, k) => out[i + k] + (value - out[i + k]) * feature)
      : [out[i], out[i + 1], out[i + 2]];
    if (weight) {
      const recoloured = fromLab(target[0] + (lab[0] - base[0]) * lightness, target[1] + (lab[1] - base[1]) * colourfulness, target[2] + (lab[2] - base[2]) * colourfulness);
      for (let k = 0; k < 3; k++) moved[k] += (recoloured[k] - moved[k]) * weight;
    }
    for (let k = 0; k < 3; k++) out[i + k] = moved[k];
  }
  return result;
}
