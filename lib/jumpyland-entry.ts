import { accessToken } from './account/session';
import type { GameRoomData } from './game-room';
import { boundedJumpylandRequest } from './jumpyland-request';

// SRS-607.3: the entry deadline includes session refresh and both response bodies.
export async function loadJumpylandEntry(cancelled?: AbortSignal): Promise<{ room: GameRoomData; completed: number[]; balance: number | null }> {
  return boundedJumpylandRequest(async signal => {
    const token = await accessToken();
    if (signal.aborted || cancelled?.aborted) throw new Error('Opening this activity was cancelled.');
    if (!token) throw new Error('Please sign in again.');
    const read = async (url: string) => {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) throw new Error('Your saved avatar or level progress could not be loaded. Please retry.');
      return data;
    };
    const [progress, room] = await Promise.all([read('/api/jumpyland'), read('/api/game-room')]);
    if (!Array.isArray(progress.completed) || !progress.completed.every((level: unknown) => Number.isInteger(level) && Number(level) >= 1 && Number(level) <= 3)
      || !Array.isArray(room.outfits) || !Array.isArray(room.faces)) {
      throw new Error('The activity returned incomplete information. Please retry.');
    }
    return { room, completed: progress.completed, balance: Number.isSafeInteger(progress.balance) ? progress.balance : null };
  });
}
