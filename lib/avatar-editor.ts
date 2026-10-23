import { avatarVariant, completeAvatar, type AvatarGroup } from './avatar-collection';
import { headStyles, layeredKeys } from './avatar-layers';
import type { AvatarAppearance, GameRoomData } from './game-room';

// A preview of the current collection, never an automatic account migration.
// The saved value remains intact until the student selects and saves a look.
export function avatarEditorPreview(data: Pick<GameRoomData, 'outfits' | 'faces'>, value: AvatarAppearance | null): AvatarAppearance {
  const current = value || {
    outfitId: data.outfits[0]?.id || '',
    faceId: data.faces.find(face => face.initial)?.id || data.faces[0]?.id || null,
  };
  if (completeAvatar(current.avatarId)) return current;

  const head = current.headStyle || data.faces.find(face => face.id === current.faceId)?.assetKey.replace(/^sample-/, '') || 'short-waves';
  const feminine = headStyles.some(style => style.id === head && ['long-waves', 'ponytail', 'curly-bob', 'bob-bangs', 'braids', 'auburn-waves'].includes(style.id));
  const group: AvatarGroup = head.startsWith('hijab-') ? 'hijab' : feminine ? 'female' : 'male';
  const hair = group === 'hijab' ? (head === 'hijab-sage' ? 1 : head === 'hijab-dusty-rose' ? 2 : 0)
    : group === 'female' ? (head === 'ponytail' ? 1 : head === 'bob-bangs' || head === 'curly-bob' ? 2 : 0)
      : head === 'curls' || head === 'coils' ? 1 : head === 'fade' || head === 'crew-cut' ? 2 : 0;
  const outfitKey = data.outfits.find(outfit => outfit.id === current.outfitId)?.assetKey;
  const color = current.topColor || current.shirtColor || (outfitKey === 'sample-study' ? 'cream' : outfitKey === 'sample-weekend' ? 'green' : 'navy');
  const palettes: Record<AvatarGroup, string[]> = {
    male: ['navy', 'cream', 'green', 'burgundy', 'charcoal', 'purple'],
    female: ['cream', 'green', 'purple', 'navy', 'burgundy', 'charcoal'],
    hijab: ['navy', 'cream', 'green', 'burgundy', 'purple', 'charcoal'],
  };
  const outfit = Math.max(0, palettes[group].indexOf(color === 'black' ? 'charcoal' : color)) + 1;
  const detail = current.faceStyle?.includes('glasses') || head === 'glasses' ? 'glasses' : 'natural';
  const next: AvatarAppearance = { ...current, avatarId: avatarVariant(group, outfit, hair, detail).id };
  for (const key of layeredKeys) delete next[key];
  return next;
}
