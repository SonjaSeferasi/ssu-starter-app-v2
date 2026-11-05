import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };
import { describe, expect, it } from 'vitest';
import { FeedBanner } from '../components/feed/FeedBanner';

// "Customize Your Screen" (additional functionality, not in the official
// SRS): FeedBanner must render identically to before this feature existed
// when headerTheme is null/omitted, and must swap in the chosen theme's
// artwork while keeping the same title/subtitle content when a theme is
// selected. Third-generation: illustrated themes are the student-supplied
// images themselves (public/theme-assets/backgrounds/{id}.webp), not a
// CSS/SVG recreation -- see lib/screen-themes.ts.
describe('FeedBanner header theming', () => {
  it('renders the default gradient banner unchanged when no theme is selected', () => {
    const html = renderToStaticMarkup(createElement(FeedBanner, { tab: 'for-you' }));
    expect(html).toContain('Campus Feed');
    expect(html).toContain('from-emerald-700');
    expect(html).not.toContain('background-image');
  });

  it('renders the themed illustrated artwork while preserving the title/subtitle content', () => {
    const html = renderToStaticMarkup(createElement(FeedBanner, { tab: 'friends', headerTheme: 'night_mode' }));
    expect(html).toContain('Friends Feed');
    expect(html).toContain('/theme-assets/backgrounds/night_mode.webp');
    expect(html).toContain('text-white'); // night_mode's chosen contrast class
    expect(html).toContain('bg-black/20'); // illustrated art gets a legibility scrim
  });

  it('renders a solid color header without the illustrated-art scrim or image', () => {
    const html = renderToStaticMarkup(createElement(FeedBanner, { tab: 'for-you', headerTheme: 'solid_navy_blue' }));
    expect(html).toContain('Campus Feed');
    expect(html).toContain('#1E3A5F');
    expect(html).toContain('text-white'); // solid_navy_blue's chosen contrast class
    expect(html).not.toContain('bg-black/20'); // scrim is illustrated-only, not needed over a flat color
    expect(html).not.toContain('/theme-assets/');
    // Regression guard: FeedBanner's base className always carries a
    // Tailwind bg-gradient-to-br ... class (the untheme'd look), which
    // sets CSS background-image -- a background-image always paints ON
    // TOP of background-color, so without an explicit inline override the
    // solid color would be silently hidden behind that still-active
    // default gradient (a real bug this test caught: the color was
    // genuinely saved and present in the HTML string, just invisible).
    expect(html).toContain('background-image:none');
  });

  it('renders a gradient header without the illustrated-art scrim or image', () => {
    const html = renderToStaticMarkup(createElement(FeedBanner, { tab: 'for-you', headerTheme: 'gradient_midnight' }));
    expect(html).toContain('Campus Feed');
    expect(html).toContain('linear-gradient(135deg, #0f172a, #1e293b, #334155)'); // the header-only gradient palette, not an illustrated theme
    expect(html).toContain('text-white'); // gradient_midnight's chosen contrast class
    expect(html).not.toContain('bg-black/20');
    expect(html).not.toContain('/theme-assets/');
  });
});
