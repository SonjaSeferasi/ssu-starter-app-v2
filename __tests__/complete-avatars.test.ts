import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { completeAvatars, avatarGroups } from '../lib/avatar-collection';
import { CompleteAvatar } from '../components/game-room/complete-avatar';
const { renderToStaticMarkup } = require('react-dom/server') as { renderToStaticMarkup: (element: ReturnType<typeof createElement>) => string };

describe('complete avatar artwork', () => {
  it('has 18 distinct options in three groups, backed by transparent artwork', () => {
    expect(new Set(completeAvatars.map(avatar => avatar.id)).size).toBe(18);
    for (const group of avatarGroups) {
      const avatars = completeAvatars.filter(avatar => avatar.group === group);
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
      expect(svg).toContain('viewBox="0 0 362 724"');
      expect(svg).toContain(`x="${-(avatar.cell % 3) * 362}"`);
      expect(svg).toContain(`y="${-Math.floor(avatar.cell / 3) * 724}"`);
    }
  });
});
