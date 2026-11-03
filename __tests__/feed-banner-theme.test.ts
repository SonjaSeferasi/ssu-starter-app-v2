import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };
import { describe, expect, it } from 'vitest';
import { FeedBanner } from '../components/feed/FeedBanner';

// "Customize Your Screen" (additional functionality, not in the official
// SRS): FeedBanner must render identically to before this feature existed
// when headerTheme is null/omitted, and must swap in the chosen theme's
// header image (via inline backgroundImage) while keeping the same
// title/icon content when a theme is selected.
describe('FeedBanner header theming', () => {
  it('renders the default gradient banner unchanged when no theme is selected', () => {
    const html = renderToStaticMarkup(createElement(FeedBanner, { tab: 'for-you' }));
    expect(html).toContain('Campus Feed');
    expect(html).toContain('from-emerald-700');
    expect(html).not.toContain('background-image');
  });

  it('renders the themed header image while preserving the title/subtitle content', () => {
    const html = renderToStaticMarkup(createElement(FeedBanner, { tab: 'friends', headerTheme: 'cherry_blossom' }));
    expect(html).toContain('Friends Feed');
    expect(html).toContain('/theme-assets/headers/cherry_blossom.webp');
    expect(html).toContain('text-stone-900'); // cherry_blossom's chosen contrast class
    expect(html).toContain('bg-black/25'); // illustrated art gets the legibility scrim
  });

  it('renders a solid color header without the illustrated-art scrim', () => {
    const html = renderToStaticMarkup(createElement(FeedBanner, { tab: 'for-you', headerTheme: 'solid_navy_blue' }));
    expect(html).toContain('Campus Feed');
    expect(html).toContain('#1E3A5F');
    expect(html).toContain('text-white'); // solid_navy_blue's chosen contrast class
    expect(html).not.toContain('bg-black/25'); // scrim is illustrated-only, not needed over a flat color
  });

  it('renders a gradient header without the illustrated-art scrim', () => {
    const html = renderToStaticMarkup(createElement(FeedBanner, { tab: 'for-you', headerTheme: 'gradient_midnight' }));
    expect(html).toContain('Campus Feed');
    expect(html).toContain('linear-gradient');
    expect(html).toContain('text-white'); // gradient_midnight's chosen contrast class
    expect(html).not.toContain('bg-black/25');
  });
});
