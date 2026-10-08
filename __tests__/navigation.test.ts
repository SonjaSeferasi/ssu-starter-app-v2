import { createElement } from 'react';
import { createRequire } from 'node:module';
import type { ReactNode } from 'react';
// Keep this server-render smoke test independent of optional react-dom type packages.
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as { renderToStaticMarkup(node: ReactNode): string };
import { describe, expect, it } from 'vitest';
import { SocialNavigation } from '../components/navigation/social-navigation';
import { isCurrentDestination, isStandalonePage } from '../lib/navigation';

describe('UR-600 navigation', () => {
  it('renders five named destinations with one combined Events and Trending link', () => {
    const html = renderToStaticMarkup(createElement(SocialNavigation, { pathname: '/game-room' }));
    const links = [...html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g)]
      .map(([, href, body]) => ({ href, label: body.replace(/<[^>]+>/g, '') }));
    expect(links).toEqual([
      { href: '/', label: 'Home' },
      { href: '/messages', label: 'Messages' },
      { href: '/game-room', label: 'Game Room' },
      { href: '/events', label: 'Events and Trending' },
      { href: '/profile', label: 'Profile' },
    ]);
  });

  it.each(['/', '/messages', '/game-room', '/events', '/profile', '/messages/conversation-123'])
    ('selects exactly one item on %s', (pathname) => {
      const html = renderToStaticMarkup(createElement(SocialNavigation, { pathname }));
      expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    });

  it('moves selection from Home to Events and Trending without matching similar route names', () => {
    expect(isCurrentDestination('/events', '/')).toBe(false);
    expect(isCurrentDestination('/events', '/events')).toBe(true);
    expect(isCurrentDestination('/events-other', '/events')).toBe(false);
    expect(isCurrentDestination('/profile-other', '/profile')).toBe(false);
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
