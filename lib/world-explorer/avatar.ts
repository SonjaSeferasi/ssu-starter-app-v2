import { storedAccessToken } from '../account/session';
import { roomRequest } from '../game-room-client';
import type { GameRoomData } from '../game-room';

/** Read the saved look anew for each attempt. Never reuse another account's avatar. */
export async function loadExplorerAvatar(signal: AbortSignal): Promise<GameRoomData | null> {
  signal.throwIfAborted();
  // Visitors can still explore; signed-in players must load their own saved look.
  if (!storedAccessToken()) return null;
  try {
    const data = await roomRequest('GET', undefined, signal);
    signal.throwIfAborted();
    return data;
  } catch (error) {
    signal.throwIfAborted();
    throw new Error(`Your Game Room avatar could not load. ${error instanceof Error ? error.message : 'Please try again.'}`);
  }
}
