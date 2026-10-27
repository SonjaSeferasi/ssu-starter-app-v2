export const FRAME_SHEETS = {
  floral: { src: '/profile-space/avatar-frames-v1.png', width: 1122, height: 1402, columns: 4, rows: 5 },
  retro: { src: '/profile-space/avatar-retro-frames-v1.png', width: 1774, height: 887, columns: 4, rows: 2 },
};
const FLORAL_FRAMES = [
  { id: 'daisy_wreath', label: 'Daisy wreath', shape: 'round', window: [23.8,27.5,54.4,53.8], crop: [20,11,261,273] },
  { id: 'lavender_wreath', label: 'Lavender wreath', shape: 'round', window: [20.4,21.6,58.1,60.2], crop: [290,18,265,264] },
  { id: 'sage_stamp', label: 'Sage stamp', shape: 'square', window: [21.3,18.0,56.9,63.3], crop: [575,30,239,245] },
  { id: 'moon_stars', label: 'Moon & stars', shape: 'round', window: [20.8,21.0,57.0,59.9], crop: [842,17,265,262] },
  { id: 'scrapbook', label: 'Scrapbook', shape: 'square', window: [19.9,20.2,63.7,65.2], crop: [20,288,251,253] },
  { id: 'laurel_wreath', label: 'Laurel wreath', shape: 'round', window: [22.4,18.6,56.3,60.5], crop: [292,292,263,263] },
  { id: 'cherry_blossom', label: 'Cherry blossom', shape: 'round', window: [22.5,17.3,63.2,68.6], crop: [567,295,258,255] },
  { id: 'pixel_hearts', label: 'Pixel hearts', shape: 'square', window: [18.9,23.3,61.7,57.8], crop: [852,294,243,249] },
  { id: 'space_orbit', label: 'Space orbit', shape: 'round', window: [20.9,17.9,60.4,61.5], crop: [19,558,268,257] },
  { id: 'cat_paws', label: 'Cat ears & paws', shape: 'round', window: [17.1,18.9,65.3,65.7], crop: [299,566,251,254] },
  { id: 'bookish', label: 'Bookish', shape: 'square', window: [22.6,21.1,55.6,55.9], crop: [563,563,261,256] },
  { id: 'music_garden', label: 'Music garden', shape: 'round', window: [19.2,16.4,61.9,68.4], crop: [830,554,281,269] },
  { id: 'ocean_waves', label: 'Ocean waves', shape: 'round', window: [24.4,15.7,60.5,63.9], crop: [20,833,266,255] },
  { id: 'sunshine', label: 'Sunshine', shape: 'square', window: [15.1,22.8,62.9,59.5], crop: [309,819,251,259] },
  { id: 'pink_hearts', label: 'Pink hearts', shape: 'round', window: [16.6,15.1,66.4,67.1], crop: [561,831,271,258] },
  { id: 'ivy', label: 'Ivy', shape: 'square', window: [23.0,21.3,55.1,53.6], crop: [840,830,265,263] },
  { id: 'rainbow_clouds', label: 'Rainbow clouds', shape: 'round', window: [25.3,25.4,47.7,54.5], crop: [10,1102,285,268] },
  { id: 'daisy_polaroid', label: 'Daisy polaroid', shape: 'square', window: [12.6,11.5,66.1,59.4], crop: [317,1108,239,261] },
  { id: 'butterfly', label: 'Butterfly garden', shape: 'round', window: [18.5,16.2,66.2,59.4], crop: [566,1097,260,271] },
  { id: 'graduation_laurel', label: 'Graduation laurel', shape: 'round', window: [20.0,16.2,59.3,56.3], crop: [836,1096,275,284] },
] as const;
const RETRO_FRAMES = [
  { id:'varsity_ring', label:'Varsity ring', shape:'round', window: [19.6,19.2,61.1,61.8], crop: [35,30,409,401] },
  { id:'retro_gamer', label:'Retro gamer', shape:'square', window: [20.1,22.0,59.6,57.7], crop: [463,20,423,409] },
  { id:'space_explorer', label:'Space explorer', shape:'round', window: [22.2,21.8,57.8,57.8], crop: [904,23,410,408] },
  { id:'code_notebook', label:'Code notebook', shape:'square', window: [22.9,16.1,60.7,66.1], crop: [1345,45,397,372] },
  { id:'courtside', label:'Courtside', shape:'round', window: [22.4,18.0,60.0,61.3], crop: [24,445,428,406] },
  { id:'mountain_trail', label:'Mountain trail', shape:'square', window: [18.9,23.2,63.3,63.3], crop: [470,439,403,401] },
  { id:'headphone_ring', label:'Headphone ring', shape:'round', window: [16.1,17.1,68.0,67.5], crop: [891,446,441,403] },
  { id:'denim_lightning', label:'Denim lightning', shape:'square', window: [19.3,22.4,61.1,58.9], crop: [1360,449,383,389] },
] as const;
export const ILLUSTRATED_FRAMES = [
  ...FLORAL_FRAMES.map((frame,index)=>({...frame,index,sheet:'floral' as const})),
  ...RETRO_FRAMES.map((frame,index)=>({...frame,index,sheet:'retro' as const})),
];
export const FRAME_OPTIONS = [
  { id: 'rounded', label: 'Soft corners' }, { id: 'circle', label: 'Circle' }, { id: 'postcard', label: 'Postcard' },
  ...ILLUSTRATED_FRAMES,
] as const;
export type ProfileFrame = typeof FRAME_OPTIONS[number]['id'];
export const FRAME_IDS = FRAME_OPTIONS.map(frame => frame.id);
export function illustratedFrame(id: ProfileFrame) { return ILLUSTRATED_FRAMES.find(frame => frame.id === id); }
export const FRAME_COLLECTIONS = [
  { id:'all',label:'All frames' }, { id:'classic',label:'Simple' },
  { id:'floral',label:'Botanical & campus' }, { id:'retro',label:'Retro & adventure' },
] as const;
export type FrameCollection = typeof FRAME_COLLECTIONS[number]['id'];
export function framesInCollection(collection: FrameCollection) {
  return FRAME_OPTIONS.filter(frame=>collection==='all'||(illustratedFrame(frame.id)?.sheet??'classic')===collection);
}
