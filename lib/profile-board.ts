import { STICKER_CATALOG, type CatalogStickerKind } from './profile-stickers';
type SpaceStickerKind = CatalogStickerKind | 'leaf';
const SPACE_STICKERS: readonly string[] = [...STICKER_CATALOG.map(item=>item.kind),'leaf'];
import { spotifyMusic } from './profile-personality';
export type BoardItem = {
  id: string; kind: 'note'|'photo'|'sticker'|'project'|'music'; x: number; y: number; width: number; rotation: number;
  text?: string; title?: string; url?: string; memoryId?: number; sticker?: SpaceStickerKind; color?: 'cream'|'pink'|'sage';
};
export type ProfileBoard = { items: BoardItem[] };
export const MAX_BOARD_ITEMS=20;
export function boardInput(value:unknown):ProfileBoard {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Choose a valid board.');
  const items=(value as ProfileBoard).items;
  if(!Array.isArray(items)||items.length>MAX_BOARD_ITEMS)throw new Error('Use up to 20 board items.');
  const ids=new Set<string>();
  return {items:items.map(item=>{
    if(!item||typeof item!=='object'||typeof item.id!=='string'||! /^[a-zA-Z0-9-]{1,40}$/.test(item.id)||ids.has(item.id)
      ||!['note','photo','sticker','project','music'].includes(item.kind)
      ||![item.x,item.y,item.width,item.rotation].every(Number.isFinite)
      ||item.x<0||item.y<0||item.width<10||item.width>44||item.x+item.width>100||item.y>68||Math.abs(item.rotation)>15)
      throw new Error('Keep board items within the canvas.');
    ids.add(item.id);
    const result:BoardItem={id:item.id,kind:item.kind,x:item.x,y:item.y,width:item.width,rotation:item.rotation};
    const text=(value:unknown,max:number)=>{if(typeof value!=='string'||value.length>max)throw new Error(`Use up to ${max} characters.`);return value.trim();};
    if(item.kind==='note'||item.kind==='project')result.text=text(item.text??'',item.kind==='note'?160:180);
    if(item.kind==='project'){
      result.title=text(item.title??'',60);
      if(item.url){const url=new URL(text(item.url,500));if(url.protocol!=='https:'||url.username||url.password)throw new Error('Use an HTTPS project link.');result.url=url.href;}
    }
    if(item.kind==='note'){if(!['cream','pink','sage'].includes(item.color??'cream'))throw new Error('Choose a note color.');result.color=item.color??'cream';}
    if(item.kind==='photo'){if(!Number.isSafeInteger(item.memoryId)||item.memoryId!<1)throw new Error('Choose a saved photo.');result.memoryId=item.memoryId;}
    if(item.kind==='sticker'){if(!SPACE_STICKERS.includes(item.sticker!))throw new Error('Choose a sticker from the library.');result.sticker=item.sticker;}
    if(item.kind==='music'){const music=spotifyMusic(text(item.url??'',500));if(!music)throw new Error('Use a Spotify song, album, or playlist link.');result.url=music.url;}
    return result;
  })};
}
