import { AccountError, accountClient } from './socialu-account';

export async function gameParticipation(accountId: string, activity?: 'dormspace' | 'explorer', zone?: string) {
  const { data, error } = await accountClient().rpc('socialu_game_participation', {
    p_auth_id: accountId,
    ...(activity ? { p_activity: activity, p_zone: zone } : {}),
  });
  if (error?.code === '22023') throw new AccountError('Choose a valid participation time zone.', 400);
  if (error || !data) throw new AccountError('Participation streaks are temporarily unavailable.', 503);
  return data;
}
