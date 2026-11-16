// SRS-504.1 / SRS-504.2: resolves a student's saved Game Room look into the parts of the
// 3D DormSpace model. Read-only: nothing here changes or migrates saved account data.
// Presentation (male/female/hijab silhouette) follows the selected look only; it is never
// an inference about the student's account or gender.
import { characterStyle, type CharacterStyle, type Garment, type Hair } from '../jumpyland/character-rig';
import { completeAvatar, type AvatarGroup } from '../../lib/avatar-collection';
import { bodyShapes, skinColors, type BodyShape } from '../../lib/avatar-figure';
import { bottomColors, bottomStyles, headStyles, skinTones, topColors, topStyles } from '../../lib/avatar-layers';
import { faceDetails, pantsColors, shirtColors, type AvatarAppearance, type GameRoomData } from '../../lib/game-room';

export type DormBottom = 'straight' | 'wide' | 'chinos';
export type DormGlasses = 'none' | 'round' | 'square';
export type DormAvatarSource = 'complete' | 'layered' | 'legacy' | 'default';
export type DormAvatarStyle = {
  source: DormAvatarSource;
  presentation: AvatarGroup;
  hair: Hair; curlyBob: boolean; hairColor: string; hijabColor: string | null;
  top: Garment; topColor: string;
  bottom: DormBottom; bottomColor: string;
  skin: string; bodyShape: BodyShape; bodyWidth: number;
  glasses: DormGlasses; freckles: boolean;
};
/** GameRoomData (own account or a live player's payload) or a bare saved appearance. */
export type DormAvatarInput = GameRoomData | AvatarAppearance | null | undefined;
export type ResolvedDormAvatar = { style: DormAvatarStyle; notices: string[] };

export const DEFAULT_SKIN = '#c99a6e'; // tone-3: the Game 1 rig's default skin
const DARK_HAIR = '#302722', AUBURN = '#75432f';
export const PHOTO_NOTICE = 'Photo faces do not have a 3D version yet, so the default 3D face is shown with your other saved choices.';
export const unsupportedNotice = (piece: string) => `Your saved ${piece} does not have a 3D version yet, so the default ${piece} is shown.`;

type HeadLook = { hair: Hair; presentation: AvatarGroup; curlyBob?: boolean; hairColor?: string; hijabColor?: string; glasses?: boolean };
const defaultHead: HeadLook = { hair: 'waves', presentation: 'male' };

/** Layered head ids, and legacy face asset keys without their `sample-` prefix. */
export function headLook(id: string): HeadLook | null {
  const hijab = headStyles.find(style => style.id === id && style.kind === 'hijab') as { hex: string } | undefined;
  if (hijab) return { hair: 'hijab', presentation: 'hijab', hijabColor: hijab.hex };
  switch (id) {
    case 'short-waves': case 'smile': case 'side-part': return { hair: 'waves', presentation: 'male' };
    case 'glasses': return { hair: 'waves', presentation: 'male', glasses: true };
    case 'curls': return { hair: 'curls', presentation: 'male' };
    case 'coils': return { hair: 'coils', presentation: 'male' };
    case 'locs': return { hair: 'locs', presentation: 'male' };
    case 'fade': case 'crew-cut': return { hair: 'fade', presentation: 'male' };
    case 'long-waves': return { hair: 'long-waves', presentation: 'female' };
    case 'auburn-waves': return { hair: 'long-waves', presentation: 'female', hairColor: AUBURN };
    case 'ponytail': return { hair: 'ponytail', presentation: 'female' };
    case 'curly-bob': return { hair: 'bob', presentation: 'female', curlyBob: true };
    case 'bob-bangs': return { hair: 'bob', presentation: 'female' };
    case 'braids': return { hair: 'braids', presentation: 'female' };
    default: return null;
  }
}

/** Legacy complete outfits, by catalog asset key without `sample-`. */
const legacyOutfits: Record<string, { top: Garment; shirt: (typeof shirtColors)[number]['id'] }> = {
  campus: { top: 'hoodie', shirt: 'navy' }, study: { top: 'crewneck', shirt: 'cream' }, weekend: { top: 'jacket', shirt: 'green' },
};
const garmentOf: Record<(typeof topStyles)[number]['id'], Garment> = { hoodie: 'hoodie', crewneck: 'crewneck', 'zip-jacket': 'jacket', cardigan: 'cardigan' };
const bottomOf: Record<(typeof bottomStyles)[number]['id'], DormBottom> = { 'straight-jeans': 'straight', 'wide-leg': 'wide', chinos: 'chinos' };

const hexOf = (list: readonly { id: string; hex: string }[], id: unknown) => list.find(option => option.id === id)?.hex;
const known = (list: readonly { id: string }[], id: unknown) => list.some(option => option.id === id);
const strip = (key: string) => key.replace(/^sample-/, '');

export function isGameRoomData(value: unknown): value is GameRoomData {
  return !!value && typeof value === 'object' && Array.isArray((value as GameRoomData).faces) && Array.isArray((value as GameRoomData).outfits);
}

/** Saved face details. Complete-avatar glasses come from the chosen variant; a saved `faceStyle`
 * can add square frames or freckles but never removes them, because saves fill `natural` by default. */
function faceDetail(appearance: AvatarAppearance | null, baseGlasses: boolean, notices: string[]) {
  const face = appearance?.faceStyle;
  if (face !== undefined && !known(faceDetails, face)) notices.push(unsupportedNotice('face detail'));
  const glasses: DormGlasses = face === 'square-glasses' ? 'square'
    : face === 'round-glasses' || face === 'glasses-freckles' || baseGlasses ? 'round' : 'none';
  return { glasses, freckles: face === 'freckles' || face === 'glasses-freckles' };
}

/** Body shape and skin colour are authoritative whenever they are saved. */
function figure(appearance: AvatarAppearance | null, fallbackSkin: string, notices: string[]) {
  const shape = bodyShapes.find(option => option.id === appearance?.bodyShape);
  if (appearance?.bodyShape !== undefined && !shape) notices.push(unsupportedNotice('body shape'));
  const skin = hexOf(skinColors, appearance?.skinColor);
  if (appearance?.skinColor !== undefined && !skin) notices.push(unsupportedNotice('skin colour'));
  return { bodyShape: (shape?.id ?? 'average') as BodyShape, bodyWidth: shape?.width ?? 1, skin: skin ?? fallbackSkin };
}

function resolveComplete(appearance: AvatarAppearance, notices: string[]): DormAvatarStyle | null {
  const avatar = completeAvatar(appearance.avatarId);
  if (!avatar) return null;
  // Painted collection defaults, without any saved override applied.
  const base = characterStyle({ outfitId: '', faceId: null, avatarId: avatar.id });
  const detail = faceDetail(appearance, base.glasses, notices);
  const description = avatar.description.toLowerCase();
  return {
    source: 'complete', presentation: base.group,
    hair: base.hairstyle, curlyBob: description.includes('curly bob'), hairColor: base.hairColor,
    hijabColor: base.group === 'hijab' ? base.scarf : null,
    top: base.garment, topColor: base.shirt,
    bottom: description.includes('chinos') ? 'chinos' : description.includes('wide') ? 'wide' : 'straight', bottomColor: base.pants,
    // The collection's own colours are the outfit; the API's default shirt/pants colour ids are not overrides here.
    ...figure(appearance, base.skin, notices), ...detail,
  };
}

function resolveBuilt(appearance: AvatarAppearance | null, catalog: GameRoomData | null, notices: string[]): DormAvatarStyle {
  let source: DormAvatarSource = appearance ? 'legacy' : 'default';
  let head = defaultHead;
  let top: Garment = 'hoodie', shirt: string = hexOf(shirtColors, 'navy')!;
  // SRS-504.2: no saved appearance -> the Game Room default (initial face, first outfit).
  const faceId = appearance ? appearance.faceId : catalog?.faces.find(face => face.initial)?.id ?? catalog?.faces[0]?.id ?? null;
  const outfitId = appearance ? appearance.outfitId : catalog?.outfits[0]?.id;
  if (appearance && appearance.faceId === null) notices.push(PHOTO_NOTICE);
  else if (faceId !== null && !known(headStyles, appearance?.headStyle)) {
    const face = catalog?.faces.find(option => option.id === faceId);
    const look = face ? headLook(strip(face.assetKey)) : null;
    if (look) head = look; else if (appearance || catalog?.faces.length) notices.push(unsupportedNotice('hairstyle'));
  }
  if (!known(topStyles, appearance?.topStyle) && outfitId !== undefined) {
    const outfit = catalog?.outfits.find(option => option.id === outfitId);
    const look = outfit ? legacyOutfits[strip(outfit.assetKey)] : undefined;
    if (look) { top = look.top; shirt = hexOf(shirtColors, look.shirt)!; } else if (appearance || catalog?.outfits.length) notices.push(unsupportedNotice('outfit'));
  }
  let pants: string = hexOf(pantsColors, 'denim')!, bottom: DormBottom = 'straight', skin = DEFAULT_SKIN;

  // Layered fields override the legacy catalog look piece by piece.
  const layered = (key: 'headStyle' | 'topStyle' | 'topColor' | 'bottomStyle' | 'bottomColor' | 'skinTone', list: readonly { id: string }[], piece: string) => {
    const value = appearance?.[key];
    if (value === undefined) return undefined;
    if (!known(list, value)) { notices.push(unsupportedNotice(piece)); return undefined; }
    source = 'layered'; return value as string;
  };
  const headStyle = layered('headStyle', headStyles, 'hairstyle');
  if (headStyle) head = headLook(headStyle) ?? head;
  const topStyle = layered('topStyle', topStyles, 'top');
  if (topStyle) top = garmentOf[topStyle as keyof typeof garmentOf];
  const bottomStyle = layered('bottomStyle', bottomStyles, 'bottoms');
  if (bottomStyle) bottom = bottomOf[bottomStyle as keyof typeof bottomOf];
  // Colours: layered colour > separate shirt/pants colour > outfit default.
  const topColor = layered('topColor', topColors, 'top colour'), bottomColor = layered('bottomColor', bottomColors, 'bottoms colour');
  if (topColor) shirt = hexOf(topColors, topColor)!;
  else if (appearance?.shirtColor !== undefined) shirt = hexOf(shirtColors, appearance.shirtColor) ?? (notices.push(unsupportedNotice('shirt colour')), shirt);
  if (bottomColor) pants = hexOf(bottomColors, bottomColor)!;
  else if (appearance?.pantsColor !== undefined) pants = hexOf(pantsColors, appearance.pantsColor) ?? (notices.push(unsupportedNotice('pants colour')), pants);
  const tone = layered('skinTone', skinTones, 'skin tone');
  if (tone) skin = hexOf(skinTones, tone)!;

  return {
    source, presentation: head.presentation, hair: head.hair, curlyBob: !!head.curlyBob,
    hairColor: head.hairColor ?? DARK_HAIR, hijabColor: head.hijabColor ?? null,
    top, topColor: shirt, bottom, bottomColor: pants,
    ...figure(appearance, skin, notices), ...faceDetail(appearance, !!head.glasses, notices),
  };
}

/** Saved look -> 3D parts. Precedence: complete avatarId, else layered fields over the legacy
 * faceId/outfitId catalog look, then saved colours, body shape, skin colour and face details. */
export function resolveDormAvatarStyle(input: DormAvatarInput): ResolvedDormAvatar {
  const catalog = isGameRoomData(input) ? input : null;
  const appearance = catalog ? catalog.appearance : (input as AvatarAppearance | null | undefined) ?? null;
  const notices: string[] = [];
  let style: DormAvatarStyle | null = null;
  if (appearance?.avatarId !== undefined) {
    style = resolveComplete(appearance, notices);
    if (!style) notices.push(unsupportedNotice('avatar'));
  }
  style ??= resolveBuilt(appearance, catalog, notices);
  return { style, notices: [...new Set(notices)] };
}

/** Stable identity for reuse: rebuild a player's model only when this changes. */
export function dormAvatarStyleKey(style: DormAvatarStyle) {
  return [style.presentation, style.hair, style.curlyBob, style.hairColor, style.hijabColor, style.top, style.topColor,
    style.bottom, style.bottomColor, style.skin, style.bodyShape, style.glasses, style.freckles].join('|');
}

/** The Game 1 rig's style record for the same look (its body shape scales torso and limbs). */
export function rigStyle(style: DormAvatarStyle): CharacterStyle {
  return {
    group: style.presentation, hairstyle: style.hair, garment: style.top,
    glasses: style.glasses === 'round', scarf: style.hijabColor ?? '#272a2d', hairColor: style.hairColor,
    shirt: style.topColor, pants: style.bottomColor, skin: style.skin, bodyWidth: style.bodyWidth,
  };
}
