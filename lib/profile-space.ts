import { STICKER_CATALOG, type CatalogStickerKind } from './profile-stickers';
import { PROFILE_THEMES, type ProfileTheme } from './profile-themes';
import { parseCornerArtwork, type CornerArtwork } from './profile-corner-artwork';
import { countryInput } from './profile-countries';
import { FRAME_IDS } from './profile-frames';

export const SPACE_PALETTES = ['sage', 'lavender', 'peach', 'sky', 'rose'] as const;
export const SPACE_FRAMES = FRAME_IDS;
export const SPACE_COVERS = ['meadow', 'lines', 'plain'] as const;
export const SPACE_STICKERS = [...STICKER_CATALOG.map(sticker=>sticker.kind), 'leaf'] as const;
export const STICKER_SHELF = STICKER_CATALOG.map(sticker=>sticker.kind);
export type SpaceStickerKind = CatalogStickerKind | 'leaf';
export const STICKER_SCALE = { min: 0.5, max: 2 } as const;
// scale is omitted at the default size (1), so looks saved before resizing existed stay identical.
export type SpaceSticker = { id: string; kind: SpaceStickerKind; x: number; y: number; rotation: number; scale?: number; position?: { x: number; y: number } };
export type ProfileLook = {
  palette: typeof SPACE_PALETTES[number]; frame: typeof SPACE_FRAMES[number]; cover: typeof SPACE_COVERS[number];
  layout: 'about-first' | 'campus-first'; stickers: SpaceSticker[]; theme?: ProfileTheme; hometown?: string; homeCountry?: string; cornerArtwork?: CornerArtwork; coverKey?: string; cardStickers?: { about: SpaceSticker[]; notes: SpaceSticker[] }; cardFinishes?: { about: CardFinish; notes: CardFinish };
};
export const DECORATION_AREAS = ['cover','about','notes'] as const;
export type DecorationArea = typeof DECORATION_AREAS[number];
export const CARD_FINISHES = ['paper','sticky','clean'] as const;
export type CardFinish = typeof CARD_FINISHES[number];
export function areaStickers(look: ProfileLook, area: DecorationArea) { return area === 'cover' ? look.stickers : look.cardStickers?.[area] ?? []; }
export function withAreaStickers(look: ProfileLook, area: DecorationArea, stickers: SpaceSticker[]): ProfileLook {
  return area === 'cover' ? {...look,stickers} : {...look,cardStickers:{about:look.cardStickers?.about??[],notes:look.cardStickers?.notes??[],[area]:stickers}};
}
export function stickerPosition(sticker: SpaceSticker) { return sticker.position ?? {x:sticker.x,y:sticker.y}; }
// Keep the legacy anchor fields valid for existing stored looks and database checks.
// The optional percentage position supports the entire surface, including edges.
export function positionedSticker(point: {x:number;y:number}) { return {x:Math.max(10,Math.min(90,point.x)),y:Math.max(20,Math.min(80,point.y)),position:point}; }
export const DEFAULT_LOOK: ProfileLook = { palette: 'sage', frame: 'rounded', cover: 'meadow', layout: 'about-first', stickers: [] };
export const HELLO_COLORS = ['yellow', 'pink', 'green', 'blue', 'lavender'] as const;
export const HELLO_DOODLES = ['none', 'heart', 'smile', 'star', 'sun', 'flower', 'coffee'] as const;
export type HelloColor = typeof HELLO_COLORS[number];
export type HelloDoodle = typeof HELLO_DOODLES[number];
export type ProfileHello = { id: number; text: string; color: HelloColor; doodle: HelloDoodle; username: string; name: string; createdAt: string; canRemove: boolean };

export function profileLookInput(value: unknown): ProfileLook {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Choose a valid profile look.');
  const look = value as Record<string, unknown>;
  if (!SPACE_PALETTES.includes(look.palette as ProfileLook['palette']) || !SPACE_FRAMES.includes(look.frame as ProfileLook['frame'])
    || !SPACE_COVERS.includes(look.cover as ProfileLook['cover']) || !['about-first','campus-first'].includes(look.layout as string)) throw new Error('Choose a palette, photo frame, cover, and layout.');
  if (!Array.isArray(look.stickers) || look.stickers.length > 8) throw new Error('Use up to eight stickers.');
  if (look.coverKey !== undefined && (typeof look.coverKey !== 'string' || !/^profile-covers\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(look.coverKey))) throw new Error('Choose a valid cover photo.');
  if (look.theme !== undefined && !PROFILE_THEMES.some(item=>item.id===look.theme)) throw new Error('Choose a valid profile theme.');
  const homeCountry = look.homeCountry === undefined ? undefined : countryInput(look.homeCountry);
  const hometown = look.hometown === undefined ? undefined : hometownInput(look.hometown);
  const cornerArtwork = look.cornerArtwork === undefined ? undefined : parseCornerArtwork(look.cornerArtwork);
  const ids = new Set<string>();
  const parseStickers = (list: unknown): SpaceSticker[] => {
    if (!Array.isArray(list) || list.length > 8) throw new Error('Use up to eight stickers per area.');
    return list.map((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Choose a valid sticker.');
    const sticker = item as SpaceSticker;
    if (typeof sticker.id !== 'string' || !/^[a-zA-Z0-9-]{1,40}$/.test(sticker.id) || ids.has(sticker.id)
      || !SPACE_STICKERS.includes(sticker.kind) || !Number.isFinite(sticker.x) || sticker.x < 10 || sticker.x > 90
      || !Number.isFinite(sticker.y) || sticker.y < 20 || sticker.y > 80 || !Number.isFinite(sticker.rotation) || Math.abs(sticker.rotation) > 180) throw new Error('Keep stickers inside the cover.');
    if (sticker.scale !== undefined && (!Number.isFinite(sticker.scale) || sticker.scale < STICKER_SCALE.min || sticker.scale > STICKER_SCALE.max)) throw new Error('Keep stickers between half and double size.');
    if (sticker.position !== undefined && (!sticker.position || typeof sticker.position !== 'object' || !Number.isFinite(sticker.position.x) || !Number.isFinite(sticker.position.y) || sticker.position.x < 0 || sticker.position.x > 100 || sticker.position.y < 0 || sticker.position.y > 100)) throw new Error('Keep sticker positions within the selected area.');
    ids.add(sticker.id);
    return { id: sticker.id, kind: sticker.kind, x: sticker.x, y: sticker.y, rotation: sticker.rotation, ...(sticker.scale !== undefined && sticker.scale !== 1 ? { scale: sticker.scale } : {}), ...(sticker.position ? {position:{x:sticker.position.x,y:sticker.position.y}} : {}) };
  });
  };
  const stickers = parseStickers(look.stickers);
  let cardStickers: ProfileLook['cardStickers'];
  if (look.cardStickers !== undefined) {
    const cards = look.cardStickers as ProfileLook['cardStickers'];
    if (!cards || typeof cards !== 'object' || Array.isArray(cards)) throw new Error('Choose valid card decorations.');
    cardStickers={about:parseStickers(cards.about),notes:parseStickers(cards.notes)};
  }
  let cardFinishes: ProfileLook['cardFinishes'];
  if (look.cardFinishes !== undefined) {
    const finishes = look.cardFinishes as ProfileLook['cardFinishes'];
    if (!finishes || !CARD_FINISHES.includes(finishes.about) || !CARD_FINISHES.includes(finishes.notes)) throw new Error('Choose a valid card finish.');
    cardFinishes={about:finishes.about,notes:finishes.notes};
  }
  return { palette: look.palette as ProfileLook['palette'], frame: look.frame as ProfileLook['frame'], cover: look.cover as ProfileLook['cover'], layout: look.layout as ProfileLook['layout'], stickers, ...(hometown!==undefined?{hometown}:{}), ...(homeCountry!==undefined?{homeCountry}:{}), ...(cornerArtwork?{cornerArtwork}:{}), ...(look.theme ? {theme:look.theme as ProfileTheme}:{}), ...(look.coverKey ? { coverKey: look.coverKey as string } : {}), ...(cardStickers?{cardStickers}:{}), ...(cardFinishes?{cardFinishes}:{}) };
}

export function helloText(value: unknown) {
  if (typeof value !== 'string' || !value.trim() || value.length > 160) throw new Error('Write a hello of 1–160 characters.');
  return value.trim();
}

export function helloStyle(color: unknown = 'yellow', doodle: unknown = 'none') {
  if (!HELLO_COLORS.includes(color as HelloColor) || !HELLO_DOODLES.includes(doodle as HelloDoodle)) throw new Error('Choose a note color and doodle.');
  return { color: color as HelloColor, doodle: doodle as HelloDoodle };
}

export function hometownInput(value:unknown):string {
  if(typeof value!=='string'||value.trim().length>80)throw new Error('Enter a city or country of up to 80 characters.');
  return value.trim();
}
