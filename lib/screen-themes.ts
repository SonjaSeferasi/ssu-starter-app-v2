// "Customize Your Screen" -- additional functionality, not in the
// official SRS, and NOT the same as SRS-627's Light/Dark appearance mode
// (owned by SS). Single source of truth for every background/header
// choice, shared by the picker UI, the live preview, and the
// background/header rendering wired into FeedPage/FeedBanner/
// WhisperWallBanner.
//
// Backgrounds stay illustrated-only (9 themes + Default). Headers accept
// three independent KINDS of choice -- illustrated art (the same 9
// themes), a flat solid color, or a CSS gradient -- each with its own id
// namespace so a single TEXT column can store any of the 23 possible
// values unambiguously (illustrated ids are bare, e.g. "emerald_campus";
// solid/gradient ids are prefixed, e.g. "solid_emerald"/"gradient_midnight").

export type ScreenThemeId =
  | 'emerald_campus'
  | 'cherry_blossom'
  | 'campus_illustration'
  | 'dreamy_sky'
  | 'enchanted_garden'
  | 'golden_sunset'
  | 'ocean_breeze'
  | 'midnight_stars'
  | 'coquette';

export const SCREEN_THEME_IDS: ScreenThemeId[] = [
  'emerald_campus',
  'cherry_blossom',
  'campus_illustration',
  'dreamy_sky',
  'enchanted_garden',
  'golden_sunset',
  'ocean_breeze',
  'midnight_stars',
  'coquette',
];

export type ScreenTheme = {
  id: ScreenThemeId;
  label: string;
  description: string;
  backgroundImage: string;
  headerImage: string;
  /** Text color class for content laid over this theme's header art, matched per-theme to the art's brightness. */
  headerTextClass: 'text-white' | 'text-stone-900';
};

export const SCREEN_THEMES: ScreenTheme[] = [
  {
    id: 'emerald_campus', label: 'Emerald Campus',
    description: 'Rich green campus vibes with trees and architecture',
    backgroundImage: '/theme-assets/backgrounds/emerald_campus.webp',
    headerImage: '/theme-assets/headers/emerald_campus.webp',
    headerTextClass: 'text-white',
  },
  {
    id: 'cherry_blossom', label: 'Cherry Blossom',
    description: 'Soft pink blossoms and spring atmosphere',
    backgroundImage: '/theme-assets/backgrounds/cherry_blossom.webp',
    headerImage: '/theme-assets/headers/cherry_blossom.webp',
    headerTextClass: 'text-stone-900',
  },
  {
    id: 'campus_illustration', label: 'Campus Illustration',
    description: 'Clean university illustration with soft colors',
    backgroundImage: '/theme-assets/backgrounds/campus_illustration.webp',
    headerImage: '/theme-assets/headers/campus_illustration.webp',
    headerTextClass: 'text-stone-900',
  },
  {
    id: 'dreamy_sky', label: 'Dreamy Sky',
    description: 'Bright and airy with clouds',
    backgroundImage: '/theme-assets/backgrounds/dreamy_sky.webp',
    headerImage: '/theme-assets/headers/dreamy_sky.webp',
    headerTextClass: 'text-stone-900',
  },
  {
    id: 'enchanted_garden', label: 'Enchanted Garden',
    description: 'Lush flowers and greenery',
    backgroundImage: '/theme-assets/backgrounds/enchanted_garden.webp',
    headerImage: '/theme-assets/headers/enchanted_garden.webp',
    headerTextClass: 'text-stone-900',
  },
  {
    id: 'golden_sunset', label: 'Golden Sunset',
    description: 'Warm sunset tones and mountain view',
    backgroundImage: '/theme-assets/backgrounds/golden_sunset.webp',
    headerImage: '/theme-assets/headers/golden_sunset.webp',
    headerTextClass: 'text-stone-900',
  },
  {
    id: 'ocean_breeze', label: 'Ocean Breeze',
    description: 'Beach aesthetic with ocean and palm trees',
    backgroundImage: '/theme-assets/backgrounds/ocean_breeze.webp',
    headerImage: '/theme-assets/headers/ocean_breeze.webp',
    headerTextClass: 'text-white',
  },
  {
    id: 'midnight_stars', label: 'Midnight Stars',
    description: 'Night sky with stars and a moonlit campus',
    backgroundImage: '/theme-assets/backgrounds/midnight_stars.webp',
    headerImage: '/theme-assets/headers/midnight_stars.webp',
    headerTextClass: 'text-white',
  },
  {
    id: 'coquette', label: 'Coquette',
    description: 'Pink aesthetic with bows and butterflies',
    backgroundImage: '/theme-assets/backgrounds/coquette.webp',
    headerImage: '/theme-assets/headers/coquette.webp',
    headerTextClass: 'text-stone-900',
  },
];

export function getScreenTheme(id: ScreenThemeId | null | undefined): ScreenTheme | null {
  if (!id) return null;
  return SCREEN_THEMES.find((t) => t.id === id) ?? null;
}

// ---- Header-only extras: solid colors and gradients ----

export type SolidColorId =
  | 'solid_emerald'
  | 'solid_sage_green'
  | 'solid_blush_pink'
  | 'solid_lavender'
  | 'solid_navy_blue'
  | 'solid_cream'
  | 'solid_burgundy'
  | 'solid_sky_blue';

export type SolidColor = { id: SolidColorId; label: string; hex: string; textClass: 'text-white' | 'text-stone-900' };

export const SOLID_COLORS: SolidColor[] = [
  { id: 'solid_emerald', label: 'Emerald', hex: '#047857', textClass: 'text-white' },
  { id: 'solid_sage_green', label: 'Sage Green', hex: '#9CAF88', textClass: 'text-stone-900' },
  { id: 'solid_blush_pink', label: 'Blush Pink', hex: '#F4C2C2', textClass: 'text-stone-900' },
  { id: 'solid_lavender', label: 'Lavender', hex: '#B19CD9', textClass: 'text-stone-900' },
  { id: 'solid_navy_blue', label: 'Navy Blue', hex: '#1E3A5F', textClass: 'text-white' },
  { id: 'solid_cream', label: 'Cream', hex: '#F5F0E1', textClass: 'text-stone-900' },
  { id: 'solid_burgundy', label: 'Burgundy', hex: '#6D1F2A', textClass: 'text-white' },
  { id: 'solid_sky_blue', label: 'Sky Blue', hex: '#7DD3FC', textClass: 'text-stone-900' },
];

export type GradientId =
  | 'gradient_emerald_forest'
  | 'gradient_pink_sunset'
  | 'gradient_ocean_dream'
  | 'gradient_purple_haze'
  | 'gradient_golden_hour'
  | 'gradient_midnight';

export type Gradient = { id: GradientId; label: string; css: string; textClass: 'text-white' | 'text-stone-900' };

export const GRADIENTS: Gradient[] = [
  { id: 'gradient_emerald_forest', label: 'Emerald Forest', css: 'linear-gradient(135deg, #065f46, #047857, #10b981)', textClass: 'text-white' },
  { id: 'gradient_pink_sunset', label: 'Pink Sunset', css: 'linear-gradient(135deg, #fb7185, #f472b6, #fbbf24)', textClass: 'text-stone-900' },
  { id: 'gradient_ocean_dream', label: 'Ocean Dream', css: 'linear-gradient(135deg, #0ea5e9, #06b6d4, #22d3ee)', textClass: 'text-white' },
  { id: 'gradient_purple_haze', label: 'Purple Haze', css: 'linear-gradient(135deg, #6d28d9, #a855f7, #c084fc)', textClass: 'text-white' },
  { id: 'gradient_golden_hour', label: 'Golden Hour', css: 'linear-gradient(135deg, #d97706, #f59e0b, #fde68a)', textClass: 'text-stone-900' },
  { id: 'gradient_midnight', label: 'Midnight', css: 'linear-gradient(135deg, #0f172a, #1e293b, #334155)', textClass: 'text-white' },
];

export const SOLID_COLOR_IDS: SolidColorId[] = SOLID_COLORS.map((c) => c.id);
export const GRADIENT_IDS: GradientId[] = GRADIENTS.map((g) => g.id);

/** Every value a student can save for HEADER specifically (backgrounds only ever use ScreenThemeId). */
export type HeaderThemeId = ScreenThemeId | SolidColorId | GradientId;
export const HEADER_THEME_IDS: HeaderThemeId[] = [...SCREEN_THEME_IDS, ...SOLID_COLOR_IDS, ...GRADIENT_IDS];

export type ResolvedHeader = {
  kind: 'illustrated' | 'solid' | 'gradient';
  style: { backgroundImage: string } | { backgroundColor: string } | { backgroundImage: string };
  textClass: 'text-white' | 'text-stone-900';
};

/** Resolves ANY header theme id (illustrated art, solid color, or gradient) to a renderable style + readable text color. Null means Default (today's plain banner, unchanged). */
export function resolveHeaderTheme(id: HeaderThemeId | null | undefined): ResolvedHeader | null {
  if (!id) return null;
  const illustrated = SCREEN_THEMES.find((t) => t.id === id);
  if (illustrated) {
    return { kind: 'illustrated', style: { backgroundImage: `url(${illustrated.headerImage})` }, textClass: illustrated.headerTextClass };
  }
  const solid = SOLID_COLORS.find((c) => c.id === id);
  if (solid) {
    return { kind: 'solid', style: { backgroundColor: solid.hex }, textClass: solid.textClass };
  }
  const gradient = GRADIENTS.find((g) => g.id === id);
  if (gradient) {
    return { kind: 'gradient', style: { backgroundImage: gradient.css }, textClass: gradient.textClass };
  }
  return null;
}
