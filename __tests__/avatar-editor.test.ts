import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { avatarEditorPreview } from '../lib/avatar-editor';
import { avatarParts, avatarVariant, completeAvatar } from '../lib/avatar-collection';
import { gameRoomSamples, type AvatarAppearance } from '../lib/game-room';
import { GameRoomContent } from '../components/game-room/game-room';
import { AvatarPreview } from '../components/game-room/avatar-preview';

// Activity illustrations are outside the avatar editor's render contract.
vi.mock('../components/game-room/activity-art', () => ({ ActivityArt: () => null }));

const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };

describe('complete avatar editor', () => {
  it('opens the complete collection directly without the original clothing controls', () => {
    const html = renderToStaticMarkup(createElement(GameRoomContent, { preview: true }));
    expect(html).toContain('aria-label="Complete avatar collection"');
    expect(html).toContain('>Hair</button>');
    expect(html).toContain('>Face</button>');
    expect(html).toContain('>Outfit</button>');
    expect(html).toContain('/avatars/v4/male-1.png');
    expect(html).not.toContain('Use original collection');
    expect(html).not.toContain('Try complete avatars');
    expect(html).not.toContain('Shirt color');
    expect(html).not.toContain('Pants color');
    expect(html).not.toContain('/avatars/student-');
  });

  it('previews a complete look without mutating a saved layered avatar', () => {
    const saved: AvatarAppearance = {
      outfitId: '42', faceId: '11', skinTone: 'tone-3', headStyle: 'ponytail',
      topStyle: 'hoodie', topColor: 'green', bottomStyle: 'straight-jeans', bottomColor: 'dark-denim',
      faceStyle: 'round-glasses',
    };
    const before = structuredClone(saved);
    const preview = avatarEditorPreview(gameRoomSamples, saved);
    expect(saved).toEqual(before);
    expect(preview).toMatchObject({ outfitId: '42', faceId: '11', avatarId: 'campus-v4-female-2-2-glasses' });
    expect(preview).not.toHaveProperty('headStyle');
    expect(avatarParts(completeAvatar(preview.avatarId)!)).toEqual({ outfit: 2, hair: 1, detail: 'glasses' });
  });

  it('retains hijab presentation when previewing a replacement for a layered record', () => {
    const preview = avatarEditorPreview(gameRoomSamples, { outfitId: '42', faceId: null, headStyle: 'hijab-sage', topColor: 'purple' });
    expect(preview.avatarId).toBe('campus-v4-hijab-5-2-natural');
  });

  it('renders complete artwork for legacy records wherever avatars are shown', () => {
    const legacy: AvatarAppearance = { outfitId: 'sample-campus', faceId: 'sample-ponytail' };
    const html = renderToStaticMarkup(createElement(AvatarPreview, { appearance: legacy, outfits: gameRoomSamples.outfits, faces: gameRoomSamples.faces }));
    expect(html).toContain('/avatars/v4/female-4.png');
    expect(html.match(/<image /g)).toHaveLength(1);
    expect(html).not.toContain('/avatars/v2/');
    expect(html).not.toContain('/avatars/student-');
    expect(legacy).toEqual({ outfitId: 'sample-campus', faceId: 'sample-ponytail' });
  });

  it('preserves an existing complete selection exactly and supplies a preview for new accounts', () => {
    const saved = { outfitId: '42', faceId: null, avatarId: avatarVariant('female', 3, 2, 'glasses').id };
    expect(avatarEditorPreview(gameRoomSamples, saved)).toBe(saved);
    expect(avatarEditorPreview(gameRoomSamples, null)).toMatchObject({ outfitId: 'sample-campus', faceId: 'sample-smile', avatarId: 'campus-v4-male-1-1-natural' });
    expect(gameRoomSamples.appearance).toEqual({ outfitId: 'sample-campus', faceId: 'sample-smile' });
  });
});
