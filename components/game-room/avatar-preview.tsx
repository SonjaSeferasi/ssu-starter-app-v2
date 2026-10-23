import React from 'react';
import type { AvatarAppearance, DefaultFace, Outfit } from '../../lib/game-room';
import type { CostumeStyle } from './costume-details';
import { avatarEditorPreview } from '../../lib/avatar-editor';
import { completeAvatar } from '../../lib/avatar-collection';
import { CompleteAvatar } from './complete-avatar';

// Saved legacy fields remain valid, but every public preview uses a complete
// coordinated figure. Resolving this visual fallback never writes account data.
export function AvatarPreview({ appearance, outfits, faces, small = false, portrait = false }: {
  appearance: AvatarAppearance | null;
  outfits: Outfit[];
  faces: DefaultFace[];
  small?: boolean;
  portrait?: boolean;
  costume?: CostumeStyle;
}) {
  const preview = avatarEditorPreview({ outfits, faces }, appearance);
  return <CompleteAvatar avatar={completeAvatar(preview.avatarId)!} small={small} portrait={portrait} />;
}
