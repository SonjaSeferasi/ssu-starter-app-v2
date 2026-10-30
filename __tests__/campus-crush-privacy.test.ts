import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };
import { describe, expect, it } from 'vitest';
import { CampusCrushPrivacy } from '../components/profile/campus-crush-privacy';

// Relocated from the Whisper Wall's (now-removed) Community Guidelines
// card into Profile Settings. Static-render smoke test (no jsdom here,
// matching every other component test in this project) -- it verifies
// the default render before the opt-out fetch resolves (useEffect never
// runs during a server render), which is exactly the disabled/loading
// state a real page shows for an instant before the real value loads.
describe('CampusCrushPrivacy', () => {
  it('renders the positively-framed toggle disabled before the saved value loads', () => {
    const html = renderToStaticMarkup(createElement(CampusCrushPrivacy));
    expect(html).toContain('Allow mentions in Campus Crush guesses');
    expect(html).toContain('Privacy');
    const checkbox = html.match(/<input[^>]*type="checkbox"[^>]*>/)?.[0] ?? '';
    expect(checkbox).toContain('disabled=""');
    // Loading state (optOut still null) must never render as "checked" --
    // that would misleadingly claim mentions are allowed before the real
    // saved value is known.
    expect(checkbox).not.toContain('checked=""');
  });
});
