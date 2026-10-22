import { accessToken } from './account/session';
import type { AvatarAppearance, GameRoomData } from './game-room';

export class GameRoomRequestError extends Error {
  constructor(message: string, public code?: string) { super(message); }
}

export async function roomRequest(method = 'GET', body?: AvatarAppearance, signal?: AbortSignal): Promise<GameRoomData> {
  const token = await accessToken();
  if (!token) throw new GameRoomRequestError('Please sign in again to connect to your Game Room.', 'SESSION_REQUIRED');
  const response = await fetch('/api/game-room', {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    cache: 'no-store', body: body ? JSON.stringify(body) : undefined, signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new GameRoomRequestError(data?.error || 'The Game Room connection was interrupted. Please try again.', data?.code);
  if (!data || typeof data !== 'object' || !Array.isArray(data.outfits) || !Array.isArray(data.faces)) {
    throw new GameRoomRequestError('The Game Room returned an incomplete response. Please try again.');
  }
  return data;
}
