import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
// Keep this server-render smoke test independent of optional react-dom type packages.
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };
import { describe, expect, it } from 'vitest';
import { SocialNavigation, NavigationFrame } from '../components/navigation/social-navigation';
import { isCurrentDestination, isStandalonePage } from '../lib/navigation';

describe('UR-600 navigation', () => {
  it('renders four live, clickable destinations with one combined Events and Trending link', () => {
    const html = renderToStaticMarkup(createElement(SocialNavigation, { pathname: '/game-room' }));
    const links = [...html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)]
      .map(([, href, body]) => ({ href, text: body.replace(/<[^>]+>/g, '') }));
    expect(links.map((l) => l.href)).toEqual(['/', '/messages', '/game-room', '/events']);
    expect(links[0].text).toBe('Campus Feed');
  });

  it('tags teammates\' already-working features as "Soon" without disabling them', () => {
    const html = renderToStaticMarkup(createElement(SocialNavigation, { pathname: '/game-room' }));
    for (const href of ['/messages', '/game-room', '/events']) {
      const tag = html.match(new RegExp(`<a\\b[^>]*href="${href}"[^>]*>([\\s\\S]*?)<\\/a>`))?.[1] ?? '';
      expect(tag.replace(/<[^>]+>/g, ' ')).toMatch(/\bSoon\b/);
    }
  });

  it('renders not-yet-built destinations as disabled, non-navigable placeholders', () => {
    const html = renderToStaticMarkup(createElement(SocialNavigation, { pathname: '/game-room' }));
    const disabledText = [...html.matchAll(/<span\b[^>]*aria-disabled="true"[^>]*>(.*?)<\/span>/g)]
      .map(([, body]) => body.replace(/<[^>]+>/g, ''));
    expect(disabledText.join(' ')).toContain('Sniping');
    expect(disabledText.join(' ')).toContain('Invitations');
    expect(html).not.toContain('Study Hub');
    expect(html).not.toMatch(/<a\b[^>]*href="#"/);
  });

  it.each(['/', '/messages', '/game-room', '/events', '/messages/conversation-123'])
    ('selects exactly one sidebar item on %s', (pathname) => {
      const html = renderToStaticMarkup(createElement(SocialNavigation, { pathname }));
      expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    });

  it('moves selection from Campus Feed to Events and Trending without matching similar route names', () => {
    expect(isCurrentDestination('/events', '/')).toBe(false);
    expect(isCurrentDestination('/events', '/events')).toBe(true);
    expect(isCurrentDestination('/events-other', '/events')).toBe(false);
    expect(isCurrentDestination('/profile-other', '/profile')).toBe(false);
  });

  it('highlights the header profile link only on /profile', () => {
    function profileLinkTag(pathname: string) {
      const html = renderToStaticMarkup(createElement(NavigationFrame, { pathname, children: null }));
      return html.match(/<a\b[^>]*aria-label="Your profile"[^>]*>/)?.[0] ?? '';
    }
    expect(profileLinkTag('/profile')).toContain('aria-current="page"');
    expect(profileLinkTag('/')).not.toContain('aria-current="page"');
  });

  it.each(['/login', '/register', '/game-1', '/game-1/levels/1', '/wordle', '/wordle/results', '/game-room/game-1/pause', '/game-room/wordle'])
    ('excludes shared navigation on %s', (pathname) => {
      expect(isStandalonePage(pathname)).toBe(true);
    });

  it.each(['/', '/game-room', '/profile', '/messages', '/events'])
    ('allows shared navigation on %s', (pathname) => {
      expect(isStandalonePage(pathname)).toBe(false);
    });
});
