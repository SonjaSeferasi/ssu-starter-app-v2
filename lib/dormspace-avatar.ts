import { faceDetails, pantsColors, sampleFaceStyles, shirtColors, type GameRoomData } from './game-room';

export const pixelHairstyles = ['sample-smile', 'sample-curls', 'sample-crew-cut', 'sample-side-part', 'sample-locs',
  'sample-long-waves', 'sample-ponytail', 'sample-curly-bob'] as const;
export const pixelOutfits = ['sample-campus', 'sample-study', 'sample-weekend'] as const;
export type PixelAvatarLook = {
  hair: typeof pixelHairstyles[number]; body: 'male' | 'female'; outfit: typeof pixelOutfits[number];
  face: typeof faceDetails[number]['id']; shirt: typeof shirtColors[number]['id']; pants: typeof pantsColors[number]['id'];
};
export const defaultPixelLook: PixelAvatarLook = Object.freeze({ hair: 'sample-smile', body: 'male', outfit: 'sample-campus', face: 'natural', shirt: 'navy', pants: 'denim' });
export const pixelLookKey = (look: PixelAvatarLook) => [look.body, look.hair, look.outfit, look.face, look.shirt, look.pants].join(':');
export function pixelLookLabel(look: PixelAvatarLook) {
  return `${look.body === 'female' ? 'Female' : 'Male'} pixel avatar: ${sampleFaceStyles[look.hair].label}, ${faceDetails.find(x => x.id === look.face)!.name.toLowerCase()}, ${
    look.outfit === 'sample-campus' ? 'Campus hoodie' : look.outfit === 'sample-study' ? 'Study day' : 'Weekend'}, ${
    shirtColors.find(x => x.id === look.shirt)!.name.toLowerCase()} shirt, ${pantsColors.find(x => x.id === look.pants)!.name.toLowerCase()} pants`;
}

// IDs belong to the account's catalog. Asset keys, rather than sample IDs or array positions,
// connect the saved Game Room appearance to the independently drawn DormSpace pieces.
export function resolveDormAvatar(data: GameRoomData): { look: PixelAvatarLook; notice: string } {
  const saved = data.appearance;
  const face = saved ? data.faces.find(x => x.id === saved.faceId) : data.faces.find(x => x.initial) ?? data.faces[0];
  const outfit = saved ? data.outfits.find(x => x.id === saved.outfitId) : data.outfits[0];
  const hairKey = face?.assetKey === 'sample-glasses' ? 'sample-smile' : face?.assetKey;
  const hair = pixelHairstyles.find(key => key === hairKey) ?? defaultPixelLook.hair;
  const outfitKey = pixelOutfits.find(key => key === outfit?.assetKey) ?? defaultPixelLook.outfit;
  const look: PixelAvatarLook = {
    hair, body: sampleFaceStyles[hair].group, outfit: outfitKey,
    face: saved?.faceStyle ?? (face?.assetKey === 'sample-glasses' ? 'square-glasses' : 'natural'),
    shirt: saved?.shirtColor ?? (outfitKey === 'sample-study' ? 'cream' : outfitKey === 'sample-weekend' ? 'green' : 'navy'),
    pants: saved?.pantsColor ?? 'denim',
  };
  const photo = saved?.faceId === null;
  const unavailable = (face && !pixelHairstyles.some(key => key === hairKey)) || (outfit && !pixelOutfits.some(key => key === outfit.assetKey)) || (saved && (!outfit || (!face && !photo)));
  return { look, notice: photo ? 'Photo faces do not have a pixel version yet. Your saved clothing and face details are shown with the default pixel hairstyle.'
    : unavailable ? 'A saved avatar piece does not have pixel art yet. Available saved pieces are shown with a default for that piece.' : '' };
}
