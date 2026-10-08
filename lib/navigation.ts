// UR-600: one shared destination list, including one combined Events and Trending page.
export const navigationDestinations = [
  { label: 'Home', href: '/', icon: 'home' },
  { label: 'Messages', href: '/messages', icon: 'messages' },
  { label: 'Game Room', href: '/game-room', icon: 'game' },
  { label: 'Events and Trending', href: '/events', icon: 'events' },
  { label: 'Profile', href: '/profile', icon: 'profile' },
] as const;

export function isCurrentDestination(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
}

export function isStandalonePage(pathname: string) {
  return ['/login', '/register', '/game-1', '/wordle', '/game-room/game-1', '/game-room/wordle', '/dev/navigation']
    .some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
