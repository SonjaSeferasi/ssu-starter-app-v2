import { STICKER_CATALOG, type CatalogStickerKind } from './profile-stickers';
import type { ProfileLook } from './profile-space';
export type CornerArtwork = { poll:[CatalogStickerKind,CatalogStickerKind];plan:CatalogStickerKind };
export const DEFAULT_CORNER_ARTWORK:CornerArtwork = {poll:['coffee','books'],plan:'books'};
function sticker(value:unknown):CatalogStickerKind {
  if(!STICKER_CATALOG.some(item=>item.kind===value))throw new Error('Choose a sticker from the library.');
  return value as CatalogStickerKind;
}
export function parseCornerArtwork(value:unknown):CornerArtwork {
  const data=value as CornerArtwork;
  if(!data||!Array.isArray(data.poll)||data.poll.length!==2)throw new Error('Choose one sticker for each poll option.');
  return {poll:[sticker(data.poll[0]),sticker(data.poll[1])],plan:sticker(data.plan)};
}
export function cornerArtworkFor(look:ProfileLook):CornerArtwork {return look.cornerArtwork??DEFAULT_CORNER_ARTWORK;}
export type CornerArtworkPatch={card:'poll';stickers:[CatalogStickerKind,CatalogStickerKind]}|{card:'plan';sticker:CatalogStickerKind};
export function cornerArtworkPatch(value:Record<string,unknown>):CornerArtworkPatch {
  if(value.card==='plan')return {card:'plan',sticker:sticker(value.sticker)};
  if(value.card==='poll'&&Array.isArray(value.stickers)&&value.stickers.length===2)return {card:'poll',stickers:[sticker(value.stickers[0]),sticker(value.stickers[1])]};
  throw new Error('Choose a poll or study-break sticker.');
}
export function applyCornerArtwork(look:ProfileLook,patch:CornerArtworkPatch):ProfileLook {
  const current=cornerArtworkFor(look);
  return {...look,cornerArtwork:patch.card==='poll'?{...current,poll:patch.stickers}:{...current,plan:patch.sticker}};
}
