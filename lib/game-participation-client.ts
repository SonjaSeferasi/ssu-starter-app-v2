import { accessToken } from './account/session';

export const participationZoneHeader = 'x-socialu-participation-zone';

type Game = 'dormspace' | 'explorer';
export type ParticipationStatus = {
  count: number;
  qualifiedToday: boolean;
  forgivenRemaining: number;
  rewardPoints: number;
  leaderboards: Partial<Record<Game, { username: string; days: number }[]>>;
};

function browserZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
}

export function dormParticipationHeaders(path: string, method?: string): Record<string, string> {
  return (!method || method === 'GET') && (path === '/api/dorm' || path.startsWith('/api/dorm?owner='))
    ? { [participationZoneHeader]: browserZone() }
    : {};
}

async function requestParticipation(init: RequestInit) {
  const token = await accessToken();
  if (!token) throw new Error('Sign in to see your participation streak.');
  const response = await fetch('/api/game-participation', {
    ...init, cache: 'no-store', headers: { Authorization: `Bearer ${token}`, ...init.headers },
  });
  if (!response.ok) throw new Error('Participation streaks are temporarily unavailable.');
  return response;
}

export async function readParticipation(signal: AbortSignal): Promise<ParticipationStatus> {
  return (await requestParticipation({ signal })).json();
}

export async function recordExplorerParticipation(country: string) {
  await requestParticipation({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ country, timeZone: browserZone() }),
  });
  window.dispatchEvent(new Event('socialu-points-changed'));
}
