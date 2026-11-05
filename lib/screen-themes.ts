// "Customize Your Screen" -- additional functionality, not in the
// official SRS, and NOT the same as SRS-627's Light/Dark appearance mode
// (owned by SS). Single source of truth for every background/header
// choice, shared by the picker UI, the live preview, and the
// background/header rendering wired into FeedPage/FeedBanner/
// WhisperWallBanner/the shell chrome (social-navigation.tsx).
//
// Third-generation redesign: each theme is the student-supplied
// illustrated artwork itself (public/theme-assets/backgrounds/{id}.webp),
// used as-is with background-size:cover -- not a CSS/SVG recreation (that
// approach, tried in the second generation, was explicitly rejected:
// "these are not the pictures I just sent you"). `background` is kept as
// a plain-color fallback shown while the image loads or if it fails, not
// the primary visual. The same single image is reused for both the
// full-page background AND the header banner (cropped differently via
// cover at whatever aspect ratio each context needs) -- one asset per
// theme, matching the original (pre-CSS/SVG) architecture.
//
// Backgrounds stay illustrated-only (9 themes + Default). Headers accept
// three independent KINDS of choice -- illustrated art (the same 9
// themes), a flat solid color, or a CSS gradient -- each with its own id
// namespace so a single TEXT column can store any of the 23 possible
// values unambiguously.

export type ScreenThemeId =
  | 'emerald_gradient'
  | 'campus_illustration'
  | 'minimal_wave'
  | 'sky_clouds'
  | 'leaves'
  | 'sunset_gradient'
  | 'abstract_bubbles'
  | 'night_mode'
  | 'watercolor';

export const SCREEN_THEME_IDS: ScreenThemeId[] = [
  'emerald_gradient',
  'campus_illustration',
  'minimal_wave',
  'sky_clouds',
  'leaves',
  'sunset_gradient',
  'abstract_bubbles',
  'night_mode',
  'watercolor',
];

export type ScreenTheme = {
  id: ScreenThemeId;
  label: string;
  description: string;
  /** The theme's artwork -- the same file used for both the full-page background and the header banner. */
  image: string;
  /** Plain-color fallback shown while the image loads or if it fails -- not the primary visual. */
  background: string;
  /** True for themes dark enough that the shell chrome (sidebar/top nav) and content cards should switch to a coordinated dark surface + light text, not stay white-on-dark. */
  isDark: boolean;
  /** Text color class for content laid directly over this theme's art (header titles, etc). */
  headerTextClass: 'text-white' | 'text-stone-900';
};

export const SCREEN_THEMES: ScreenTheme[] = [
  {
    id: 'emerald_gradient', label: 'Emerald Gradient',
    description: 'Rich dark emerald green with soft waves',
    image: '/theme-assets/backgrounds/emerald_gradient.webp',
    background: '#0b4a30',
    isDark: true,
    headerTextClass: 'text-white',
  },
  {
    id: 'campus_illustration', label: 'Campus Illustration',
    description: 'Soft illustrated university building and trees',
    image: '/theme-assets/backgrounds/campus_illustration.webp',
    background: '#d7f0e6',
    isDark: false,
    headerTextClass: 'text-stone-900',
  },
  {
    id: 'minimal_wave', label: 'Minimal Wave',
    description: 'Pale mint and cream with gentle waves (Default style)',
    image: '/theme-assets/backgrounds/minimal_wave.webp',
    background: '#eef6ef',
    isDark: false,
    headerTextClass: 'text-stone-900',
  },
  {
    id: 'sky_clouds', label: 'Sky & Clouds',
    description: 'Soft blue sky with illustrated clouds',
    image: '/theme-assets/backgrounds/sky_clouds.webp',
    background: '#9fd0f0',
    isDark: false,
    headerTextClass: 'text-stone-900',
  },
  {
    id: 'leaves', label: 'Leaves',
    description: 'Fresh green botanical leaves around the edges',
    image: '/theme-assets/backgrounds/leaves.webp',
    background: '#eaf6ec',
    isDark: false,
    headerTextClass: 'text-stone-900',
  },
  {
    id: 'sunset_gradient', label: 'Sunset Gradient',
    description: 'Peach, pink, and lavender sunset with mountains',
    image: '/theme-assets/backgrounds/sunset_gradient.webp',
    background: '#f3c6d9',
    isDark: false,
    headerTextClass: 'text-stone-900',
  },
  {
    id: 'abstract_bubbles', label: 'Abstract Bubbles',
    description: 'Light aqua and mint with translucent circles',
    image: '/theme-assets/backgrounds/abstract_bubbles.webp',
    background: '#e2f6f1',
    isDark: false,
    headerTextClass: 'text-stone-900',
  },
  {
    id: 'night_mode', label: 'Night Mode',
    description: 'Deep navy with moon, stars, and a moonlit campus',
    image: '/theme-assets/backgrounds/night_mode.webp',
    background: '#141b3d',
    isDark: true,
    headerTextClass: 'text-white',
  },
  {
    id: 'watercolor', label: 'Watercolor',
    description: 'Soft sage-green watercolor-style washes',
    image: '/theme-assets/backgrounds/watercolor.webp',
    background: '#dcefe0',
    isDark: false,
    headerTextClass: 'text-stone-900',
  },
];

export function getScreenTheme(id: ScreenThemeId | null | undefined): ScreenTheme | null {
  if (!id) return null;
  return SCREEN_THEMES.find((t) => t.id === id) ?? null;
}

// ---- Header-only extras: solid colors and gradients (unchanged by this
// redesign -- only the 9 illustrated themes above were redone). ----

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
  /**
   * Every variant explicitly sets `backgroundImage` (even solid: `'none'`).
   * Consumers like FeedBanner/WhisperWallBanner have a default Tailwind
   * `bg-gradient-to-br ...` class for the untheme'd look, which sets CSS
   * `background-image` -- a background-image always paints ON TOP of
   * background-color, so a style object that set only `backgroundColor`
   * would be silently hidden behind that still-active default gradient.
   * Explicitly overriding backgroundImage on every branch (not just the
   * ones that have real image/gradient art) is what actually clears it.
   */
  style: { backgroundImage: string; backgroundColor: string; backgroundSize: string; backgroundPosition: string } | { backgroundImage: string; backgroundColor: string } | { backgroundImage: string };
  textClass: 'text-white' | 'text-stone-900';
};

/** Resolves ANY header theme id (illustrated art, solid color, or gradient) to a renderable style + readable text color. Null means Default (today's plain banner, unchanged). */
export function resolveHeaderTheme(id: HeaderThemeId | null | undefined): ResolvedHeader | null {
  if (!id) return null;
  const illustrated = SCREEN_THEMES.find((t) => t.id === id);
  if (illustrated) {
    return {
      kind: 'illustrated',
      style: { backgroundImage: `url(${illustrated.image})`, backgroundColor: illustrated.background, backgroundSize: 'cover', backgroundPosition: 'center' },
      textClass: illustrated.headerTextClass,
    };
  }
  const solid = SOLID_COLORS.find((c) => c.id === id);
  if (solid) {
    return { kind: 'solid', style: { backgroundImage: 'none', backgroundColor: solid.hex }, textClass: solid.textClass };
  }
  const gradient = GRADIENTS.find((g) => g.id === id);
  if (gradient) {
    return { kind: 'gradient', style: { backgroundImage: gradient.css }, textClass: gradient.textClass };
  }
  return null;
}
