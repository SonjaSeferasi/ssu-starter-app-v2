// UR-600: one shared destination list, including one combined Events and Trending page.
// `status: 'soon'` entries are layout placeholders for a teammate's not-yet-built
// feature (visual only, per MS's SRS-301-304 work) — not real routes.
// `tag: 'soon'` on a `status: 'live'` entry keeps the real, working route
// clickable but visually marks it as a teammate's feature, not MS's.
export const navigationDestinations = [
  { label: 'Campus Feed', href: '/', icon: 'home', status: 'live', tag: undefined },
  { label: 'Messages', href: '/messages', icon: 'messages', status: 'live', tag: 'soon' },
  { label: 'Sniping', href: '#', icon: 'sniping', status: 'soon', tag: undefined },
  { label: 'Game Room', href: '/game-room', icon: 'game', status: 'live', tag: 'soon' },
  { label: 'Invitations', href: '#', icon: 'invitations', status: 'soon', tag: undefined },
  { label: 'Events and Trending', href: '/events', icon: 'events', status: 'live', tag: 'soon' },
] as const;

export function isCurrentDestination(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
}

export function isStandalonePage(pathname: string) {
  return ['/login', '/register', '/game-1', '/wordle', '/game-room/game-1', '/game-room/wordle', '/dev/navigation']
    .some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
