// The games the Game Room presents (SRS-629.2). Only games SocialU really
// offers are listed; availability of DormSpace and Jumpyland still follows the
// account's activity list.
export type GameCard = {
  key: 'dormspace' | 'jumpyland' | 'explorer';
  /** The account activity that must be included, or null when always offered. */
  activityCode: 'dormspace' | 'game1' | null;
  name: string;
  description: string;
  action: string;
  href: string;
  /** A real image of the game, or null to use the drawn artwork. */
  image: string | null;
  accent: 'dorm' | 'jumpy' | 'explorer';
};

export const gameCards: GameCard[] = [
  { key: 'dormspace', activityCode: 'dormspace', name: 'DormSpace 3D', description: 'Create your own campus corner. Decorate your room and explore DormSpace.',
    action: 'Enter DormSpace', href: '/game-room/dormspace', image: null, accent: 'dorm' },
  { key: 'jumpyland', activityCode: 'game1', name: 'Jumpyland', description: 'Jump into colorful worlds, collect coins, and take on the next challenge.',
    action: 'Play Jumpyland', href: '/game-1', image: '/game-room/jumpyland-card.jpg', accent: 'jumpy' },
  { key: 'explorer', activityCode: null, name: 'World Explorer', description: 'Travel through country adventures, discover landmarks, and fill your passport.',
    action: 'Explore the World', href: '/world-explorer', image: '/game-room/world-explorer-card.jpg', accent: 'explorer' },
];

export function availableGameCards(activities: { code: string; included: boolean }[] | undefined): GameCard[] {
  const included = new Set((activities ?? []).filter(activity => activity.included).map(activity => activity.code));
  return gameCards.filter(card => card.activityCode === null || included.has(card.activityCode));
}
