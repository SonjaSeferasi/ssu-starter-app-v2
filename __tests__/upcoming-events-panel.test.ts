import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };
import { describe, expect, it } from 'vitest';
import { ComingSoonPanels } from '../components/feed/ComingSoonPanels';

describe('SRS-401.1 Campus Feed events panel', () => {
  it('shows an Events card after the invitations card that opens Events and Trending', () => {
    const html = renderToStaticMarkup(createElement(ComingSoonPanels));
    expect(html.indexOf('Events')).toBeGreaterThan(html.indexOf('You&#x27;re invited'));
    expect(html).toContain('href="/events"');
    expect(html).toContain('See all events');
  });
});
