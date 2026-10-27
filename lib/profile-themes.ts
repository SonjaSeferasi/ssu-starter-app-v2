import type { ProfileLook } from './profile-space';

export const PROFILE_THEMES = [
  { id:'scrapbook', label:'Campus scrapbook', palette:'sage', finish:'paper' },
  { id:'midnight', label:'Midnight navy', palette:'sky', finish:'clean' },
  { id:'botanical', label:'Botanical sage', palette:'sage', finish:'paper' },
  { id:'notebook', label:'Notebook cream', palette:'peach', finish:'paper' },
  { id:'pixel', label:'Pixel club', palette:'lavender', finish:'clean' },
  { id:'minimal', label:'Minimal white', palette:'sage', finish:'clean' },
] as const;
export type ProfileTheme = typeof PROFILE_THEMES[number]['id'];
export function applyProfileTheme(look:ProfileLook,theme:ProfileTheme):ProfileLook {
  const preset=PROFILE_THEMES.find(item=>item.id===theme);
  if(!preset)throw new Error('Choose a profile theme.');
  return {...look,theme,palette:preset.palette,cover:'meadow',cardFinishes:{about:preset.finish,notes:theme==='scrapbook'?'sticky':preset.finish}};
}
