// Layered avatar (art brief: documentation/avatar-art/ART_BRIEF.md).
// Painted layers stack pants -> top -> head. Colours and skin tones are painted into
// the art, never recoloured in code. The catalog below is the list of options an
// account may save; the generated manifest says which ones have artwork so far.

export const skinTones = [
  { id: 'tone-1', name: 'Porcelain', hex: '#f3d7c6' }, { id: 'tone-2', name: 'Light', hex: '#e9bf9f' },
  { id: 'tone-3', name: 'Olive', hex: '#c99a6e' }, { id: 'tone-4', name: 'Tan', hex: '#a87650' },
  { id: 'tone-5', name: 'Brown', hex: '#7a4f33' }, { id: 'tone-6', name: 'Deep brown', hex: '#4b2f22' },
] as const;

export const headStyles = [
  { id: 'short-waves', name: 'Short waves', kind: 'hair' }, { id: 'curls', name: 'Full curls', kind: 'hair' },
  { id: 'coils', name: 'Coils', kind: 'hair' }, { id: 'locs', name: 'Locs', kind: 'hair' },
  { id: 'fade', name: 'Fade', kind: 'hair' }, { id: 'long-waves', name: 'Long waves', kind: 'hair' },
  { id: 'ponytail', name: 'High ponytail', kind: 'hair' }, { id: 'curly-bob', name: 'Curly bob', kind: 'hair' },
  { id: 'bob-bangs', name: 'Bob with bangs', kind: 'hair' }, { id: 'braids', name: 'Box braids', kind: 'hair' },
  { id: 'auburn-waves', name: 'Auburn waves', kind: 'hair' },
  { id: 'hijab-black', name: 'Black', kind: 'hijab', hex: '#22232a' }, { id: 'hijab-navy', name: 'Navy', kind: 'hijab', hex: '#263b65' },
  { id: 'hijab-sage', name: 'Sage', kind: 'hijab', hex: '#8fa58a' }, { id: 'hijab-dusty-rose', name: 'Dusty rose', kind: 'hijab', hex: '#c99a9a' },
  { id: 'hijab-cream', name: 'Cream', kind: 'hijab', hex: '#e8d9c0' }, { id: 'hijab-burgundy', name: 'Burgundy', kind: 'hijab', hex: '#7c3445' },
] as const;

export const topStyles = [
  { id: 'hoodie', name: 'Hoodie' }, { id: 'crewneck', name: 'Crewneck' },
  { id: 'zip-jacket', name: 'Zip jacket' }, { id: 'cardigan', name: 'Cardigan' },
] as const;
export const topColors = [
  { id: 'navy', name: 'Navy', hex: '#263b65' }, { id: 'green', name: 'Forest green', hex: '#397359' },
  { id: 'burgundy', name: 'Burgundy', hex: '#984654' }, { id: 'cream', name: 'Cream', hex: '#e8d5b5' },
  { id: 'purple', name: 'Lavender', hex: '#8563af' }, { id: 'charcoal', name: 'Charcoal', hex: '#333740' },
] as const;

export const bottomStyles = [
  { id: 'straight-jeans', name: 'Straight' }, { id: 'wide-leg', name: 'Wide leg' }, { id: 'chinos', name: 'Chinos' },
] as const;
export const bottomColors = [
  { id: 'light-denim', name: 'Light wash', hex: '#8aa9c9' }, { id: 'dark-denim', name: 'Dark wash', hex: '#2f4566' },
  { id: 'black', name: 'Black', hex: '#2b2d33' }, { id: 'khaki', name: 'Khaki', hex: '#b39d76' },
  { id: 'olive', name: 'Olive', hex: '#6e7b55' }, { id: 'brown', name: 'Warm brown', hex: '#7a5c48' },
] as const;

export type LayeredLook = {
  skinTone: (typeof skinTones)[number]['id'];
  headStyle: (typeof headStyles)[number]['id'];
  topStyle: (typeof topStyles)[number]['id'];
  topColor: (typeof topColors)[number]['id'];
  bottomStyle: (typeof bottomStyles)[number]['id'];
  bottomColor: (typeof bottomColors)[number]['id'];
};
export const layeredKeys = ['skinTone', 'headStyle', 'topStyle', 'topColor', 'bottomStyle', 'bottomColor'] as const;
const layeredOptions: Record<(typeof layeredKeys)[number], readonly { id: string }[]> = {
  skinTone: skinTones, headStyle: headStyles, topStyle: topStyles, topColor: topColors, bottomStyle: bottomStyles, bottomColor: bottomColors,
};

/** Each layered field is optional, but when present it must be a catalog id. */
export function validLayeredFields(data: Record<string, unknown>) {
  return layeredKeys.every(key => data[key] === undefined || layeredOptions[key].some(option => option.id === data[key]));
}
export function hasLayeredLook(value: Partial<LayeredLook> | null | undefined): value is LayeredLook {
  return !!value && layeredKeys.every(key => typeof value[key] === 'string') && validLayeredFields(value);
}

// ---- Generated manifest (scripts/avatar_import.py writes public/avatars/v2/manifest.json) ----
/** One cut-out piece. Coordinates are pixels inside its own file. */
export type LayerCell = {
  file: string; width: number; height: number;
  /** Heads: neck base (hair) or drape base (hijab). Tops: collar. Pants: waistband. */
  anchor: [number, number];
  /** Heads: neck width (hair) or head width (hijab). Tops: shoulder width. Pants: waist width. */
  size: number;
  /** Tops only: y of the hem. */
  hem?: number;
  /** Heads only, optional: [left x, left y, right x, right y]. Glasses and freckles need it. */
  eyes?: [number, number, number, number] | null;
  /** Measured face width keeps different hair and hijab silhouettes in proportion. */
  faceWidth?: number;
  /** Sampled from the art so colour buttons match what is painted. */
  color?: string;
};
export type AvatarManifest = {
  version: 1;
  heads: Record<string, LayerCell[]>;    // 6 cells: skin tones in catalog order
  tops: Record<string, LayerCell[]>;     // 6 cells: topColors order
  bottoms: Record<string, LayerCell[]>;  // 6 cells: bottomColors order
  skin?: string[];                       // sampled skin tone colours
};

/** Incomplete or malformed imports fall back to the existing collection. */
export function parseAvatarManifest(value: unknown): AvatarManifest | null {
  if (!value || typeof value !== 'object' || (value as AvatarManifest).version !== 1) return null;
  const manifest = value as AvatarManifest;
  const point = (v: unknown, count: number) => Array.isArray(v) && v.length === count && v.every(n => typeof n === 'number' && Number.isFinite(n));
  const cell = (v: LayerCell) => v && typeof v.file === 'string' && /^\/avatars\/v2\/[a-z0-9-]+\.png$/.test(v.file)
    && Number.isFinite(v.width) && v.width > 0 && Number.isFinite(v.height) && v.height > 0
    && Number.isFinite(v.size) && v.size > 0 && point(v.anchor, 2)
    && (v.hem === undefined || Number.isFinite(v.hem))
    && (v.faceWidth === undefined || Number.isFinite(v.faceWidth) && v.faceWidth > 0)
    && (v.eyes == null || point(v.eyes, 4));
  for (const group of ['heads', 'tops', 'bottoms'] as const) {
    const items = manifest[group];
    if (!items || typeof items !== 'object' || Array.isArray(items)) return null;
    for (const cells of Object.values(items)) if (!Array.isArray(cells) || cells.length !== 6 || !cells.every(cell)) return null;
  }
  if (manifest.skin && (!Array.isArray(manifest.skin) || manifest.skin.length !== 6 || !manifest.skin.every(c => /^#[0-9a-f]{6}$/i.test(c)))) return null;
  return manifest;
}

// Where each piece lands on the 341.33 x 512 avatar canvas (same canvas as the v1 avatar).
export const LAYOUT = {
  canvas: { width: 341.333333, height: 512, margin: 10 },
  centerX: 170,
  top: { collarY: 128, shoulderWidth: 150 },
  hair: { neckWidth: 30, neckOverlap: 14 },          // neck base tucks this far into the collar
  hijab: { headWidth: 92, drapeOverlap: 40 },        // drape lies over the top of the shirt
  faceWidth: 60,
  bottom: { waistWidth: 112, hemOverlap: 24 },       // waistband hides under the top's hem
};

export type PlacedLayer = { href: string; x: number; y: number; width: number; height: number; part: 'bottom' | 'top' | 'head' };
export type AvatarLayout = {
  layers: PlacedLayer[];
  head: { x: number; y: number; width: number; height: number };
  eyes: [number, number, number, number] | null;
};

const indexOf = (options: readonly { id: string }[], id: string) => Math.max(0, options.findIndex(option => option.id === id));
const headKind = (id: string) => headStyles.find(style => style.id === id)?.kind || 'hair';

/** Picks the manifest pieces for a look and stacks them; null when any piece has no art yet. */
export function layoutAvatar(manifest: AvatarManifest, look: LayeredLook): AvatarLayout | null {
  const head = manifest.heads[look.headStyle]?.[indexOf(skinTones, look.skinTone)];
  const top = manifest.tops[look.topStyle]?.[indexOf(topColors, look.topColor)];
  const bottom = manifest.bottoms[look.bottomStyle]?.[indexOf(bottomColors, look.bottomColor)];
  if (!head || !top || !bottom) return null;
  const { centerX } = LAYOUT;
  const place = (cell: LayerCell, scale: number, anchorX: number, anchorY: number, part: PlacedLayer['part']): PlacedLayer => ({
    href: cell.file, part, width: cell.width * scale, height: cell.height * scale,
    x: anchorX - cell.anchor[0] * scale, y: anchorY - cell.anchor[1] * scale,
  });
  const topScale = LAYOUT.top.shoulderWidth / top.size;
  const topLayer = place(top, topScale, centerX, LAYOUT.top.collarY, 'top');
  const hemY = LAYOUT.top.collarY + ((top.hem ?? top.height) - top.anchor[1]) * topScale;
  const bottomLayer = place(bottom, LAYOUT.bottom.waistWidth / bottom.size, centerX, hemY - LAYOUT.bottom.hemOverlap, 'bottom');
  const hijab = headKind(look.headStyle) === 'hijab';
  const headScale = head.faceWidth ? LAYOUT.faceWidth / head.faceWidth : hijab ? LAYOUT.hijab.headWidth / head.size : LAYOUT.hair.neckWidth / head.size;
  const headLayer = place(head, headScale, centerX, LAYOUT.top.collarY + (hijab && !head.faceWidth ? LAYOUT.hijab.drapeOverlap : LAYOUT.hair.neckOverlap), 'head');
  // Fit the whole figure inside the canvas without distorting it.
  const layers = [bottomLayer, topLayer, headLayer];
  const minY = Math.min(...layers.map(layer => layer.y)), maxY = Math.max(...layers.map(layer => layer.y + layer.height));
  const { height, margin } = LAYOUT.canvas;
  const fit = Math.min(1, (height - margin * 2) / (maxY - minY));
  const fitted = layers.map(layer => ({ ...layer,
    x: centerX + (layer.x - centerX) * fit, y: margin + (layer.y - minY) * fit, width: layer.width * fit, height: layer.height * fit }));
  const placedHead = fitted[2];
  const eyes = head.eyes ? [0, 1, 2, 3].map(index => index % 2 === 0
    ? placedHead.x + head.eyes![index] * headScale * fit
    : placedHead.y + head.eyes![index] * headScale * fit) as [number, number, number, number] : null;
  return { layers: fitted, head: { x: placedHead.x, y: placedHead.y, width: placedHead.width, height: placedHead.height }, eyes };
}

/** The first look that has art for every piece, used as the starting avatar. */
export function defaultLook(manifest: AvatarManifest): LayeredLook | null {
  const headStyle = headStyles.find(style => manifest.heads[style.id]?.length)?.id;
  const topStyle = topStyles.find(style => manifest.tops[style.id]?.length)?.id;
  const bottomStyle = bottomStyles.find(style => manifest.bottoms[style.id]?.length)?.id;
  if (!headStyle || !topStyle || !bottomStyle) return null;
  return { skinTone: 'tone-3', headStyle, topStyle, topColor: 'navy', bottomStyle, bottomColor: 'light-denim' };
}

/** Colour to show on a button: sampled from the art when imported, else the catalog colour. */
export function swatchColor(manifest: AvatarManifest | null, group: 'skin' | 'tops' | 'bottoms', styleId: string, index: number, fallback: string) {
  if (!manifest) return fallback;
  if (group === 'skin') return manifest.skin?.[index] || fallback;
  return manifest[group][styleId]?.[index]?.color || fallback;
}
