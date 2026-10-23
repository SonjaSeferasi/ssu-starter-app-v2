import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { completeAvatars, originalCompleteAvatars, customizableAvatars, avatarGroups, avatarVariant, avatarParts, avatarFrame } from '../lib/avatar-collection';
import { CompleteAvatar } from '../components/game-room/complete-avatar';
const { renderToStaticMarkup } = require('react-dom/server') as { renderToStaticMarkup: (element: ReturnType<typeof createElement>) => string };

describe('complete avatar artwork', () => {
  it('retains the original 18 looks alongside 108 distinct customizable variants', () => {
    expect(new Set(completeAvatars.map(avatar => avatar.id)).size).toBe(126);
    for (const group of avatarGroups) {
      const avatars = originalCompleteAvatars.filter(avatar => avatar.group === group);
      expect(avatars.map(avatar => avatar.cell)).toEqual([0, 1, 2, 3, 4, 5]);
      const image = readFileSync('public' + avatars[0].sheet);
      expect(image.readUInt32BE(16)).toBe(1086);
      expect(image.readUInt32BE(20)).toBe(1448);
      expect(image[25]).toBe(6);
    }
  });
  it('renders every complete figure with one image and clips to its own cell', () => {
    for (const avatar of completeAvatars) {
      const svg = renderToStaticMarkup(createElement(CompleteAvatar, { avatar }));
      expect(svg.match(/<image /g)).toHaveLength(1);
      expect(svg).toContain('viewBox="0 0 430 760"');
      const frame = avatarFrame(avatar);
      expect(svg).toContain(`x="${-frame.x}"`);
      expect(svg).toContain(`y="${-frame.y}"`);
    }
  });
  it('provides every hair and face choice for every outfit and preserves the other choices', () => {
    expect(customizableAvatars).toHaveLength(108);
    for (const group of avatarGroups) for (let outfit = 1; outfit <= 6; outfit++) for (let hair = 0; hair < 3; hair++) for (const detail of ['natural', 'glasses'] as const) {
      const avatar = avatarVariant(group, outfit, hair, detail);
      expect(avatarParts(avatar)).toEqual({ outfit, hair, detail });
      expect(avatarParts(avatarVariant(group, outfit, (hair + 1) % 3, detail))).toMatchObject({ outfit, detail });
      expect(avatarParts(avatarVariant(group, outfit, hair, detail === 'natural' ? 'glasses' : 'natural'))).toMatchObject({ outfit, hair });
      const png = readFileSync('public' + avatar.sheet);
      expect(Math.abs(png.readUInt32BE(16) - 1086)).toBeLessThanOrEqual(2);
      expect(Math.abs(png.readUInt32BE(20) - 1448)).toBeLessThanOrEqual(2);
    }
  });
});
