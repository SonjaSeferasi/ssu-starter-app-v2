import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
// Keep this server-render smoke test independent of optional react-dom type packages.
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };
import { describe, expect, it } from 'vitest';
import { PostComposer } from '../components/feed/PostComposer';

// SRS-315.3: neither Public nor Friends Only is pre-selected when the
// composer opens, and the Publish button starts disabled until the
// student explicitly chooses one. This is a static-render smoke test
// (no jsdom/fireEvent available in this project) -- it verifies the
// composer's default render, which is exactly the state in question;
// the full select-then-publish interaction was verified manually in the
// browser (see the SRS-315 report).
describe('PostComposer (SRS-315.3)', () => {
  it('renders with neither visibility option selected and the Publish button disabled', () => {
    const html = renderToStaticMarkup(
      createElement(PostComposer, { accessToken: 'token', authorInitial: 'M', onPublished: () => {} })
    );
    const publishButton = html.match(/<button[^>]*>Create post<\/button>/)?.[0] ?? '';
    expect(publishButton).toContain('disabled=""');

    const selectedOptionText = [...html.matchAll(/<button\b[^>]*class="[^"]*bg-emerald-100 text-emerald-800[^"]*"[^>]*>([\s\S]*?)<\/button>/g)]
      .map(([, body]) => body);
    expect(selectedOptionText).toEqual([]);

    expect(html).toContain('Public');
    expect(html).toContain('Friends Only');
  });
});
