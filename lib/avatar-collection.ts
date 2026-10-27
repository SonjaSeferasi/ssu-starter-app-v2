// Each option is one complete painted figure. Never assemble these from layers.
import atlasMetadata from './avatar-atlases.json';
export const avatarGroups = ['male', 'female', 'hijab'] as const;
export type AvatarGroup = typeof avatarGroups[number];
export type CompleteAvatar = { id: string; name: string; description: string; group: AvatarGroup; cell: number; sheet: string; outfit?: number; hair?: number; detail?: 'natural' | 'glasses' };
const designs: Record<AvatarGroup, readonly [string, string][]> = {
  male: [
    ['Campus blue', 'Dark waves, navy hoodie and light denim'],
    ['Study day', 'Curls and glasses, cream sweatshirt and charcoal chinos'],
    ['Forest walk', 'Natural coils, green jacket and dark denim'],
    ['Burgundy break', 'Locs, burgundy hoodie and khaki chinos'],
    ['Everyday charcoal', 'Fade, charcoal sweatshirt and olive chinos'],
    ['Lavender lounge', 'Dark waves, lavender cardigan and dark denim'],
  ],
  female: [
    ['Cream knit', 'Long waves, cream cardigan and light denim'],
    ['Green campus', 'High ponytail, green hoodie and dark denim'],
    ['Lavender study', 'Curly bob and glasses, lavender sweatshirt and charcoal trousers'],
    ['Navy weekend', 'Bob with bangs, navy jacket and khaki chinos'],
    ['Burgundy knit', 'Box braids, burgundy cardigan and dark denim'],
    ['Olive afternoon', 'Auburn waves, charcoal hoodie and olive trousers'],
  ],
  hijab: [
    ['Midnight campus', 'Black hijab, navy hoodie and light denim'],
    ['Navy and cream', 'Navy hijab, long cream cardigan and charcoal trousers'],
    ['Sage forest', 'Sage hijab, long green jacket and dark denim'],
    ['Rose afternoon', 'Dusty rose hijab, burgundy sweatshirt and khaki chinos'],
    ['Soft lavender', 'Cream hijab, long lavender cardigan and dark denim'],
    ['Burgundy olive', 'Burgundy hijab, charcoal hoodie and olive trousers'],
  ],
};
export const originalCompleteAvatars: CompleteAvatar[] = avatarGroups.flatMap(group => designs[group].map(([name, description], cell) => ({
  id: `campus-${group}-${cell + 1}`, name, description, group, cell, sheet: `/avatars/v3/${group}.png`,
})));
export const collectionHair: Record<AvatarGroup, readonly string[]> = {
  male: ['Short waves', 'Curls', 'Fade'],
  female: ['Long waves', 'High ponytail', 'Bob with bangs'],
  hijab: ['Black hijab', 'Sage hijab', 'Rose hijab'],
};
export const collectionFaces = [{ id: 'natural', name: 'Natural' }, { id: 'glasses', name: 'Round glasses' }] as const;
export const customizableAvatars: CompleteAvatar[] = avatarGroups.flatMap(group => designs[group].flatMap(([name, outfitDescription], index) =>
  collectionFaces.flatMap((face, row) => collectionHair[group].map((hair, column) => ({
    id: `campus-v4-${group}-${index + 1}-${column + 1}-${face.id}`, name,
    description: `${hair}, ${face.name.toLowerCase()}, ${outfitDescription.substring(outfitDescription.indexOf(', ') + 2)}`,
    group, outfit: index + 1, hair: column, detail: face.id, cell: row * 3 + column,
    sheet: `/avatars/v4/${group}-${index + 1}.png`,
  })))));
export const completeAvatars = [...originalCompleteAvatars, ...customizableAvatars];
export function avatarParts(avatar: CompleteAvatar) {
  return { outfit: avatar.outfit ?? avatar.cell + 1, hair: avatar.hair ?? 0, detail: avatar.detail ?? (avatar.cell === 1 && avatar.group === 'male' || avatar.cell === 2 && avatar.group === 'female' ? 'glasses' : 'natural') } as const;
}
export function avatarVariant(group: AvatarGroup, outfit: number, hair: number, detail: 'natural' | 'glasses') {
  return customizableAvatars.find(avatar => avatar.group === group && avatar.outfit === outfit && avatar.hair === hair && avatar.detail === detail)!;
}
export function completeAvatar(id: unknown): CompleteAvatar | undefined {
  return typeof id === 'string' ? completeAvatars.find(avatar => avatar.id === id) : undefined;
}
export function avatarFrame(avatar: CompleteAvatar) {
  const metadata = (atlasMetadata as Record<string, { width: number; height: number; columns: number[]; row: number }>)[avatar.sheet.split('/').pop()!];
  const atlas = avatar.outfit && metadata ? metadata : { width: 1086, height: 1448, columns: [0, 362, 724, 1086], row: 724 };
  const column = avatar.cell % 3, row = Math.floor(avatar.cell / 3);
  return { x: atlas.columns[column], y: row ? atlas.row : 0, width: atlas.columns[column + 1] - atlas.columns[column], height: row ? atlas.height - atlas.row : atlas.row, atlasWidth: atlas.width, atlasHeight: atlas.height };
}
