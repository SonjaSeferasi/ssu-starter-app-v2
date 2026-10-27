import { EXTRA_STICKERS } from './profile-sticker-extension';

export const STICKER_CATEGORIES = [
  { id:'all', label:'All' }, { id:'animals', label:'Animals' }, { id:'food', label:'Food' },
  { id:'campus', label:'Campus' }, { id:'play', label:'Play' }, { id:'creative', label:'Creative' },
  { id:'nature', label:'Nature' }, { id:'fun', label:'Fun' },
  { id:'sports', label:'Sports' }, { id:'outdoors', label:'Outdoors' }, { id:'tech', label:'Tech' }, { id:'style', label:'Style' },
] as const;
export type StickerCategory = typeof STICKER_CATEGORIES[number]['id'];

export const STICKER_SHEETS = {
  classic: { src:'/profile-space/campus-stickers-v2.png', width:1254, height:1254 },
  expanded: { src:'/profile-space/campus-stickers-expanded-v1.png', width:887, height:1774 },
  hobbies: { src:'/profile-space/campus-hobbies-stickers-v1.png', width:1024, height:1536 },
} as const;

// The original nine keep their existing art. The new illustrations use the expanded atlas.
export const STICKER_CATALOG = [
  { kind:'star', label:'Star', category:'fun', sheet:'classic', crop:'40 65 390 395' },
  { kind:'coffee', label:'Coffee', category:'food', sheet:'classic', crop:'475 20 325 445' },
  { kind:'headphones', label:'Headphones', category:'creative', sheet:'classic', crop:'825 65 410 405' },
  { kind:'books', label:'Books', category:'campus', sheet:'classic', crop:'25 485 415 340' },
  { kind:'flower', label:'Flower', category:'nature', sheet:'classic', crop:'440 455 375 375' },
  { kind:'gamepad', label:'Game controller', category:'play', sheet:'classic', crop:'810 485 430 345' },
  { kind:'laptop', label:'Laptop', category:'campus', sheet:'classic', crop:'50 840 395 375' },
  { kind:'planet', label:'Planet', category:'nature', sheet:'classic', crop:'435 845 425 365' },
  { kind:'smile', label:'Smile', category:'fun', sheet:'classic', crop:'855 845 370 370' },
  { kind:'graduation_cap', label:'Graduation cap', category:'campus', sheet:'expanded', crop:'701 218 174 122' },
  { kind:'cat', label:'Cat', category:'animals', sheet:'expanded', crop:'13 375 176 125' },
  { kind:'puppy', label:'Puppy', category:'animals', sheet:'expanded', crop:'201 368 147 144' },
  { kind:'frog', label:'Frog', category:'animals', sheet:'expanded', crop:'381 366 130 144' },
  { kind:'bunny', label:'Bunny', category:'animals', sheet:'expanded', crop:'563 358 115 162' },
  { kind:'ghost', label:'Ghost', category:'fun', sheet:'expanded', crop:'722 368 145 139' },
  { kind:'bubble_tea', label:'Bubble tea', category:'food', sheet:'expanded', crop:'38 519 112 151' },
  { kind:'strawberry_milk', label:'Strawberry milk', category:'food', sheet:'expanded', crop:'212 527 124 142' },
  { kind:'ramen', label:'Ramen', category:'food', sheet:'expanded', crop:'370 525 162 146' },
  { kind:'pizza', label:'Pizza', category:'food', sheet:'expanded', crop:'546 535 144 143' },
  { kind:'croissant', label:'Croissant', category:'food', sheet:'expanded', crop:'707 539 168 126' },
  { kind:'avocado', label:'Avocado', category:'food', sheet:'expanded', crop:'24 689 132 149' },
  { kind:'cherries', label:'Cherries', category:'food', sheet:'expanded', crop:'195 687 154 146' },
  { kind:'strawberry', label:'Strawberry', category:'food', sheet:'expanded', crop:'381 693 128 147' },
  { kind:'peach', label:'Peach', category:'food', sheet:'expanded', crop:'541 686 147 155' },
  { kind:'egg', label:'Fried egg', category:'food', sheet:'expanded', crop:'708 692 163 143' },
  { kind:'backpack', label:'Backpack', category:'campus', sheet:'expanded', crop:'17 851 156 151' },
  { kind:'pencil', label:'Pencil', category:'campus', sheet:'expanded', crop:'214 853 122 150' },
  { kind:'notebook', label:'Notebook', category:'campus', sheet:'expanded', crop:'354 856 180 141' },
  { kind:'highlighters', label:'Highlighters', category:'campus', sheet:'expanded', crop:'545 857 160 145' },
  { kind:'calculator', label:'Calculator', category:'campus', sheet:'expanded', crop:'727 854 132 162' },
  { kind:'basketball', label:'Basketball', category:'play', sheet:'expanded', crop:'19 1024 141 140' },
  { kind:'soccer', label:'Soccer ball', category:'play', sheet:'expanded', crop:'195 1028 139 135' },
  { kind:'skateboard', label:'Skateboard', category:'play', sheet:'expanded', crop:'355 1024 176 134' },
  { kind:'roller_skate', label:'Roller skate', category:'play', sheet:'expanded', crop:'543 1022 155 150' },
  { kind:'sneaker', label:'Sneaker', category:'play', sheet:'expanded', crop:'709 1039 162 118' },
  { kind:'camera', label:'Camera', category:'creative', sheet:'expanded', crop:'17 1189 159 131' },
  { kind:'vinyl', label:'Vinyl record', category:'creative', sheet:'expanded', crop:'193 1184 153 149' },
  { kind:'music_player', label:'Music player', category:'creative', sheet:'expanded', crop:'370 1183 153 163' },
  { kind:'art_palette', label:'Art palette', category:'creative', sheet:'expanded', crop:'537 1190 169 151' },
  { kind:'guitar', label:'Guitar', category:'creative', sheet:'expanded', crop:'706 1162 171 184' },
  { kind:'moon', label:'Moon', category:'nature', sheet:'expanded', crop:'22 1347 141 151' },
  { kind:'sun', label:'Sun', category:'nature', sheet:'expanded', crop:'192 1353 152 150' },
  { kind:'rainbow', label:'Rainbow', category:'nature', sheet:'expanded', crop:'347 1362 208 131' },
  { kind:'succulent', label:'Succulent', category:'nature', sheet:'expanded', crop:'560 1366 119 139' },
  { kind:'mushroom', label:'Mushroom', category:'nature', sheet:'expanded', crop:'723 1359 141 135' },
  { kind:'robot', label:'Robot', category:'fun', sheet:'expanded', crop:'22 1514 155 163' },
  { kind:'paper_plane', label:'Paper airplane', category:'fun', sheet:'expanded', crop:'178 1528 167 136' },
  { kind:'heart', label:'Heart', category:'fun', sheet:'expanded', crop:'361 1540 178 130' },
  { kind:'sprout_book', label:'Growing ideas', category:'campus', sheet:'expanded', crop:'538 1530 165 139' },
  { kind:'campus', label:'Campus building', category:'campus', sheet:'expanded', crop:'705 1519 177 146' },
  ...EXTRA_STICKERS.map(sticker => ({ ...sticker, sheet: 'hobbies' as const })),
] as const;

export type CatalogStickerKind = typeof STICKER_CATALOG[number]['kind'];
export const STICKERS_BY_KIND = Object.fromEntries(STICKER_CATALOG.map(sticker=>[sticker.kind,sticker])) as Record<CatalogStickerKind,typeof STICKER_CATALOG[number]>;

export function findStickers(category:StickerCategory,query:string) {
  const search=query.trim().toLowerCase().replace(/[_-]/g,' ');
  return STICKER_CATALOG.filter(sticker=>(category==='all'||sticker.category===category)
    && `${sticker.label} ${sticker.kind.replace(/_/g,' ')} ${sticker.kind==='bubble_tea'?'boba':''}`.toLowerCase().includes(search));
}
