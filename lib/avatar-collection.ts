// Each option is one complete painted figure. Never assemble these from layers.
export const avatarGroups = ['male', 'female', 'hijab'] as const;
export type AvatarGroup = typeof avatarGroups[number];
export type CompleteAvatar = { id: string; name: string; description: string; group: AvatarGroup; cell: number; sheet: string };
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
export const completeAvatars: CompleteAvatar[] = avatarGroups.flatMap(group => designs[group].map(([name, description], cell) => ({
  id: `campus-${group}-${cell + 1}`, name, description, group, cell, sheet: `/avatars/v3/${group}.png`,
})));
export function completeAvatar(id: unknown): CompleteAvatar | undefined {
  return typeof id === 'string' ? completeAvatars.find(avatar => avatar.id === id) : undefined;
}
