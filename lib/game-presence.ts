export const presenceLabels = { 'game-room': 'Game Room', jumpyland: 'Playing Jumpyland', dormspace: 'Playing DormSpace', 'world-explorer': 'Playing World Explorer' } as const;
export type PresenceLocation = keyof typeof presenceLabels;
export function presenceLocation(path: string): PresenceLocation | null {
  if (path === '/game-room') return 'game-room';
  if (path === '/game-1' || path.startsWith('/game-1/') || path === '/game-room/game-1' || path.startsWith('/game-room/game-1/')) return 'jumpyland';
  if (path === '/world-explorer' || path.startsWith('/world-explorer/')) return 'world-explorer';
  if (['/game-room/dormspace', '/game-room/dormspace/classic', '/game-room/dormspace/campus'].includes(path)) return 'dormspace';
  return null;
}
export type PlayingFriend = { username: string; name: string; location: PresenceLocation; expiresAt: string };
export type PresenceSnapshot = { visible: boolean; serverTime: string; friends: PlayingFriend[] };
export function validPresence(data: unknown): data is PresenceSnapshot {
  const d = data as PresenceSnapshot;
  return !!d && typeof d.visible === 'boolean' && Number.isFinite(Date.parse(d.serverTime)) && Array.isArray(d.friends) && d.friends.every(f =>
    !!f && typeof f.username === 'string' && typeof f.name === 'string' && Object.prototype.hasOwnProperty.call(presenceLabels, f.location) && Number.isFinite(Date.parse(f.expiresAt)));
}
