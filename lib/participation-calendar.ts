export const participationDayLabels = {
  played: 'Played', forgiven: 'Forgiven Miss', reset: 'Miss That Reset the Streak', inactive: 'No Active Streak',
  'today-unqualified': 'Today—Not Yet Qualified', upcoming: 'Upcoming',
} as const;
export type ParticipationDayState = keyof typeof participationDayLabels;
export type ParticipationCalendar = {
  accountId: string; today: string; timeZone: string | null; serverTime: string; deadline: string;
  count: number; qualifiedToday: boolean; forgivenRemaining: number; dismissedToday: boolean; atRisk: boolean;
  days: { date: string; state: ParticipationDayState }[];
};

export function isParticipationGame(pathname: string) {
  return ['/game-1', '/wordle', '/game-room/game-1', '/game-room/wordle', '/world-explorer', '/game-room/dormspace', '/dev/jumpyland', '/dev/dormspace-3d']
    .some(path => pathname === path || pathname.startsWith(path + '/'));
}

export function needsParticipationReminder(data: ParticipationCalendar) {
  return data.atRisk && data.count > 0 && data.forgivenRemaining === 0 && !data.qualifiedToday && !data.dismissedToday;
}
