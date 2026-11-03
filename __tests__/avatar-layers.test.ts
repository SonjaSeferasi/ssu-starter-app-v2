import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  LAYOUT, bottomColors, bottomStyles, defaultLook, hasLayeredLook, headStyles, layoutAvatar, parseAvatarManifest, skinTones, swatchColor, topColors, topStyles, validLayeredFields,
  type AvatarManifest, type LayerCell, type LayeredLook,
} from '../lib/avatar-layers';

const cells = (make: (index: number) => LayerCell) => Array.from({ length: 6 }, (_, index) => make(index));
const manifest: AvatarManifest = {
  version: 1,
  heads: {
    'long-waves': cells(index => ({ file: `/avatars/v2/head-long-waves-${index + 1}.png`, width: 189, height: 339, anchor: [94, 334], size: 48, eyes: [66, 130, 122, 130] })),
    'hijab-black': cells(index => ({ file: `/avatars/v2/head-hijab-black-${index + 1}.png`, width: 219, height: 349, anchor: [114, 344], size: 178, eyes: null })),
  },
  tops: { hoodie: cells(index => ({ file: `/avatars/v2/top-hoodie-${index + 1}.png`, width: 337, height: 409, anchor: [168, 4], size: 328, hem: 404, color: '#263b6' + index })) },
  bottoms: { 'straight-jeans': cells(index => ({ file: `/avatars/v2/pants-straight-jeans-${index + 1}.png`, width: 217, height: 379, anchor: [108, 4], size: 180, color: '#8aa9c' + index })) },
  skin: ['#f3d7c6', '#e9bf9f', '#c99a6e', '#a87650', '#7a4f33', '#4b2f22'],
};
const look: LayeredLook = { skinTone: 'tone-5', headStyle: 'long-waves', topStyle: 'hoodie', topColor: 'cream', bottomStyle: 'straight-jeans', bottomColor: 'olive' };

describe('layered avatar layout', () => {
  it('stacks pants, then top, then head, using the pieces for the chosen skin tone and colours', () => {
    const layout = layoutAvatar(manifest, look)!;
    expect(layout.layers.map(layer => layer.part)).toEqual(['bottom', 'top', 'head']);
    expect(layout.layers.map(layer => layer.href)).toEqual([
      '/avatars/v2/pants-straight-jeans-5.png', '/avatars/v2/top-hoodie-4.png', '/avatars/v2/head-long-waves-5.png']);
  });

  it('tucks the neck into the collar and the waistband under the hem', () => {
    const [bottom, top, head] = layoutAvatar(manifest, look)!.layers;
    const topScale = top.width / 337, headScale = head.width / 189;
    const fit = topScale * 328 / LAYOUT.top.shoulderWidth;
    const collarY = top.y + 4 * topScale, hemY = top.y + 404 * topScale;
    expect(head.y + 334 * headScale).toBeCloseTo(collarY + LAYOUT.hair.neckDepth * fit, 3);
    expect(bottom.y + 4 * bottom.height / 379).toBeLessThan(hemY);
    for (const layer of [bottom, top, head]) expect(layer.x + layer.width / 2).toBeGreaterThan(100);
  });

  it('keeps every top in its painted proportions and the legs the same length for every top', () => {
    const top = layoutAvatar(manifest, look)!.layers[1];
    expect(top.width / top.height).toBeCloseTo(337 / 409, 5);
    const tall = { ...manifest, tops: { hoodie: manifest.tops.hoodie.map(cell => ({ ...cell, height: 459, hem: 454 })) } };
    const legs = (m: AvatarManifest) => { const [bottom, top] = layoutAvatar(m, look)!.layers; return bottom.height / (top.width / 337 * 328 / LAYOUT.top.shoulderWidth); };
    expect(legs(tall)).toBeCloseTo(legs(manifest), 5);
  });

  it('puts the neck of a hair head behind the collar opening and a hijab fully in front', () => {
    const withNeck = { ...manifest, tops: { hoodie: manifest.tops.hoodie.map(cell => ({ ...cell, neck: [18, 60, 50] as [number, number, number] })) } };
    const layout = layoutAvatar(withNeck, look)!;
    const top = layout.layers[1], topScale = top.width / 337;
    expect(layout.neckBehind!.frontY).toBeCloseTo(top.y + (18 + LAYOUT.hair.edgeCover) * topScale, 5);
    expect(layout.neckBehind!.opening!.width).toBeCloseTo(100 * topScale, 5);
    expect(layout.neckBehind!.opening!.color).toMatch(/^#[0-9a-f]{6}$/);
    expect(layoutAvatar(withNeck, { ...look, headStyle: 'hijab-black' })!.neckBehind).toBeNull();
    // A painted collar (no opening) puts the front line at its front edge and needs no backing.
    const painted = { ...manifest, tops: { hoodie: manifest.tops.hoodie.map(cell => ({ ...cell, neck: [13, 22, 0] as [number, number, number] })) } };
    expect(layoutAvatar(painted, look)!.neckBehind!.opening).toBeNull();
  });

  it('keeps the whole figure inside the avatar canvas', () => {
    const { layers } = layoutAvatar(manifest, look)!;
    expect(Math.min(...layers.map(layer => layer.y))).toBeGreaterThanOrEqual(LAYOUT.canvas.margin - 0.001);
    expect(Math.max(...layers.map(layer => layer.y + layer.height))).toBeLessThanOrEqual(LAYOUT.canvas.height - LAYOUT.canvas.margin + 0.001);
  });

  it('maps measured eyes onto the canvas, and offers none when a head has no eye positions', () => {
    const layout = layoutAvatar(manifest, look)!;
    const head = layout.layers[2];
    expect(layout.eyes![0]).toBeCloseTo(head.x + 66 * head.width / 189, 3);
    expect(layoutAvatar(manifest, { ...look, headStyle: 'hijab-black' })!.eyes).toBeNull();
  });

  it('returns nothing when a chosen piece has no artwork yet', () => {
    expect(layoutAvatar(manifest, { ...look, topStyle: 'cardigan' })).toBeNull();
    expect(layoutAvatar(manifest, { ...look, headStyle: 'braids' })).toBeNull();
  });

  it('starts from a look that has art for every layer', () => {
    expect(defaultLook(manifest)).toEqual({ skinTone: 'tone-3', headStyle: 'long-waves', topStyle: 'hoodie', topColor: 'navy', bottomStyle: 'straight-jeans', bottomColor: 'light-denim' });
    expect(defaultLook({ ...manifest, tops: {} })).toBeNull();
  });

  it('colours buttons from the imported art when available', () => {
    expect(swatchColor(manifest, 'tops', 'hoodie', 2, '#000000')).toBe('#263b62');
    expect(swatchColor(manifest, 'skin', '', 5, '#000000')).toBe('#4b2f22');
    expect(swatchColor(null, 'tops', 'hoodie', 2, '#123456')).toBe('#123456');
  });
});

describe('layered avatar options', () => {
  it('requires a complete valid look before replacing an existing avatar', () => {
    expect(hasLayeredLook(look)).toBe(true);
    expect(hasLayeredLook({headStyle:'long-waves'})).toBe(false);
    expect(hasLayeredLook({...look,skinTone:'tone-99'} as unknown as LayeredLook)).toBe(false);
  });

  it('rejects broken imports instead of rendering missing or invalid pieces', () => {
    expect(parseAvatarManifest(manifest)).toEqual(manifest);
    expect(parseAvatarManifest({version:1})).toBeNull();
    expect(parseAvatarManifest({...manifest,heads:{'long-waves':manifest.heads['long-waves'].slice(0,5)}})).toBeNull();
    expect(parseAvatarManifest({...manifest,tops:{hoodie:cells(()=>({...manifest.tops.hoodie[0],size:0}))}})).toBeNull();
    expect(parseAvatarManifest({...manifest,tops:{hoodie:cells(()=>({...manifest.tops.hoodie[0],file:'https://example.com/tracker.png'}))}})).toBeNull();
  });
  it('accepts catalog ids and rejects anything else', () => {
    expect(validLayeredFields(look)).toBe(true);
    expect(validLayeredFields({ headStyle: 'hijab-sage' })).toBe(true);
    expect(validLayeredFields({ skinTone: 'tone-9' })).toBe(false);
    expect(validLayeredFields({ topColor: null })).toBe(false);
  });

  it('includes six skin tones and a hijab in several colours', () => {
    expect(skinTones).toHaveLength(6);
    expect(headStyles.filter(style => style.kind === 'hijab').length).toBeGreaterThanOrEqual(4);
  });

  it('keeps the database allow-list in step with the catalog', () => {
    const sql = readFileSync('supabase/migrations/20261018020000_avatar_layers.sql', 'utf8');
    for (const [key, options] of [['skinTone', skinTones], ['headStyle', headStyles], ['topStyle', topStyles], ['topColor', topColors], ['bottomStyle', bottomStyles], ['bottomColor', bottomColors]] as const) {
      const line = sql.split('\n').find(text => text.includes(`customization->>'${key}' IN`))!;
      expect(line, key).toBeDefined();
      for (const option of options) expect(line, `${key}: ${option.id}`).toContain(`'${option.id}'`);
    }
  });
});
