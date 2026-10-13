export type NavigationPosition = 'side' | 'bottom';
export const faceDetails = [
  { id: 'natural', name: 'Natural' }, { id: 'round-glasses', name: 'Round glasses' },
  { id: 'square-glasses', name: 'Square glasses' }, { id: 'freckles', name: 'Freckles' },
  { id: 'glasses-freckles', name: 'Glasses & freckles' },
] as const;
export const shirtColors = [
  { id: 'navy', name: 'Navy', hex: '#263b65' }, { id: 'green', name: 'Forest green', hex: '#397359' },
  { id: 'burgundy', name: 'Burgundy', hex: '#984654' }, { id: 'cream', name: 'Cream', hex: '#e8d5b5' },
  { id: 'purple', name: 'Purple', hex: '#8563af' }, { id: 'black', name: 'Black', hex: '#333740' },
] as const;
export const pantsColors = [
  { id: 'denim', name: 'Denim blue', hex: '#678aae' }, { id: 'black', name: 'Black', hex: '#353943' },
  { id: 'slate', name: 'Slate', hex: '#727e8b' }, { id: 'khaki', name: 'Khaki', hex: '#b39d76' },
  { id: 'olive', name: 'Olive', hex: '#7b8960' }, { id: 'burgundy', name: 'Burgundy', hex: '#984654' },
] as const;
export type AvatarAppearance = {
  outfitId: string; faceId: string | null;
  faceStyle?: (typeof faceDetails)[number]['id'];
  shirtColor?: (typeof shirtColors)[number]['id'];
  pantsColor?: (typeof pantsColors)[number]['id'];
};
export type Outfit = { id: string; name: string; assetKey: string };
export type DefaultFace = { id: string; assetKey: string; initial: boolean };
export type Activity = { code: 'game1' | 'dormspace' | 'wordle'; name: string; description: string; included: boolean };
export type GameRoomData = {
  appearance: AvatarAppearance | null;
  outfits: Outfit[];
  faces: DefaultFace[];
  activities: Activity[];
};

// Presentation metadata for Sonja's development samples; not account gender data.
export const sampleFaceStyles: Record<string, { label: string; group: 'male' | 'female'; row: number; sheet: string }> = {
  'sample-smile': { label: 'Short waves', group: 'male', row: 0, sheet: '/avatars/student-realistic-v1.png' },
  'sample-curls': { label: 'Full curls', group: 'male', row: 1, sheet: '/avatars/student-realistic-v1.png' },
  'sample-glasses': { label: 'Waves + glasses', group: 'male', row: 2, sheet: '/avatars/student-realistic-v1.png' },
  'sample-crew-cut': { label: 'Crew cut', group: 'male', row: 0, sheet: '/avatars/student-hairstyles-v1.png' },
  'sample-side-part': { label: 'Side part', group: 'male', row: 1, sheet: '/avatars/student-hairstyles-v1.png' },
  'sample-locs': { label: 'Locs', group: 'male', row: 2, sheet: '/avatars/student-hairstyles-v1.png' },
  'sample-long-waves': { label: 'Long waves', group: 'female', row: 0, sheet: '/avatars/student-female-v1.png' },
  'sample-ponytail': { label: 'High ponytail', group: 'female', row: 1, sheet: '/avatars/student-female-v1.png' },
  'sample-curly-bob': { label: 'Curly bob', group: 'female', row: 2, sheet: '/avatars/student-female-v1.png' },
};

// Local visual-review samples only; these are not catalog seeds or purchase grants.
export const gameRoomSamples: GameRoomData = {
  appearance: { outfitId: 'sample-campus', faceId: 'sample-smile' },
  outfits: [
    { id: 'sample-campus', name: 'Campus hoodie', assetKey: 'sample-campus' },
    { id: 'sample-study', name: 'Study day', assetKey: 'sample-study' },
    { id: 'sample-weekend', name: 'Weekend', assetKey: 'sample-weekend' },
  ],
  faces: [
    { id: 'sample-smile', assetKey: 'sample-smile', initial: true },
    { id: 'sample-curls', assetKey: 'sample-curls', initial: false },
    { id: 'sample-glasses', assetKey: 'sample-glasses', initial: false },
    { id: 'sample-crew-cut', assetKey: 'sample-crew-cut', initial: false },
    { id: 'sample-side-part', assetKey: 'sample-side-part', initial: false },
    { id: 'sample-locs', assetKey: 'sample-locs', initial: false },
    { id: 'sample-long-waves', assetKey: 'sample-long-waves', initial: false },
    { id: 'sample-ponytail', assetKey: 'sample-ponytail', initial: false },
    { id: 'sample-curly-bob', assetKey: 'sample-curly-bob', initial: false },
  ],
  activities: [
    { code: 'game1', name: 'Game 1', description: 'Jump across platforms, collect optional coins, and reach the finish flag.', included: true },
    { code: 'dormspace', name: 'DormSpace', description: 'Decorate your dorm and visit current friends.', included: true },
    { code: 'wordle', name: 'Wordle', description: 'Guess the daily five-letter English word in six accepted guesses.', included: false },
  ],
};

export function validAppearance(value: unknown): value is AvatarAppearance {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  const validId = (id: unknown) => typeof id === 'string' && /^[1-9]\d{0,18}$/.test(id) && BigInt(id) <= 9223372036854775807n;
  const allowed = (key: string, options: readonly { id: string }[]) => data[key] === undefined || options.some(option => option.id === data[key]);
  return validId(data.outfitId) && (data.faceId === null || validId(data.faceId))
    && allowed('faceStyle', faceDetails) && allowed('shirtColor', shirtColors) && allowed('pantsColor', pantsColors);
}

// GitHub #41-44: presentation and entry integration only. Missing feature-owner
// pages stay unavailable instead of advertising a link to a nonexistent route.
export const activityEntrypoints: Record<Activity['code'], { href: string | null; action: string; unavailable: string }> = {
  game1: { href: '/game-1', action: 'Play', unavailable: '' },
  dormspace: { href: '/game-room/dormspace', action: 'Open', unavailable: '' },
  wordle: { href: null, action: 'Play', unavailable: 'Wordle is not connected yet' },
};
