import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };
import { describe, expect, it } from 'vitest';
import { MentionText } from '../components/feed/MentionText';
import type { Mention } from '../components/feed/types';

const mention = (overrides: Partial<Mention> = {}): Mention => ({
  studentId: 7, matchedUsername: 'jordan', username: 'jordan', name: 'Jordan Kim', photoUrl: null, ...overrides,
});

// Decision 3: "Do not automatically turn every @username substring into a
// clickable link." -- only mentions present in the verified `mentions`
// prop (sourced server-side from post_mentions/comment_mentions) get
// linkified; anything else stays plain text, even if it looks like a
// handle. Also covers stable references: the link always points at the
// mention's CURRENT username, even when the historical text (matchedUsername)
// is a since-renamed handle.
describe('MentionText (Tagging/Mentioning Students, additional functionality)', () => {
  it('linkifies only the verified mention, leaving an unverified-looking @word as plain text', () => {
    const html = renderToStaticMarkup(
      createElement(MentionText, { text: 'Hey @jordan, not @randomtypo though', mentions: [mention()] })
    );
    expect(html).toContain('href="/students/jordan"');
    expect(html).toContain('@jordan');
    expect(html).not.toContain('href="/students/randomtypo"');
    expect(html).toContain('@randomtypo'); // still shown as plain text, just not a link
  });

  it('links to the CURRENT username even when the historical text is a renamed handle', () => {
    const html = renderToStaticMarkup(
      createElement(MentionText, {
        text: 'Thanks @oldhandle!',
        mentions: [mention({ matchedUsername: 'oldhandle', username: 'newhandle' })],
      })
    );
    expect(html).toContain('href="/students/newhandle"');
    expect(html).toContain('>@oldhandle<'); // displayed text stays exactly what was typed
  });

  it('renders plain text unchanged when there are no mentions', () => {
    const html = renderToStaticMarkup(createElement(MentionText, { text: 'No mentions here @typo', mentions: [] }));
    expect(html).not.toContain('<a');
    expect(html).toContain('@typo');
  });

  it('supports multiple distinct mentions in one post', () => {
    const html = renderToStaticMarkup(
      createElement(MentionText, {
        text: 'Thanks @jordan and @sam for the help',
        mentions: [mention(), mention({ studentId: 8, matchedUsername: 'sam', username: 'sam', name: 'Sam Lee' })],
      })
    );
    expect(html).toContain('href="/students/jordan"');
    expect(html).toContain('href="/students/sam"');
  });
});
