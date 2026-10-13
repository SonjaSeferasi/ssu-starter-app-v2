import { AccountError, accountClient, accountOperation, verifiedUser } from './socialu-account';

// Browser requests never select the acting student. Raw socialu tables stay private.
export async function gameRoomOperation(request: Request, action: string, args: Record<string, unknown> = {}) {
  const user = await verifiedUser(request);
  const profile = await accountOperation('read', { p_auth_id: user.id });
  if (!profile) throw new AccountError('Complete your profile before continuing.', 409);
  const customized = action === 'read_customized' || action === 'save_customized';
  let { data, error } = customized
    ? await accountClient().rpc('socialu_avatar_customization', { p_auth_id: user.id, ...args })
    : await accountClient().rpc('socialu_game_room', { p_action: action, p_auth_id: user.id, ...args });
  // The old avatar still loads during rollout; new edits never silently lose fields.
  if (error?.code === 'PGRST202' && action === 'read_customized') {
    ({ data, error } = await accountClient().rpc('socialu_game_room', { p_action: 'read', p_auth_id: user.id }));
  }
  if (error) {
    console.error('Game Room database operation failed', { code: error.code, message: error.message });
    if (error.code === 'PGRST202') {
      if (action === 'save_customized') throw new AccountError('Avatar customization saving needs its database update. Your preview has not been saved.', 503, 'AVATAR_CUSTOMIZATION_SETUP_REQUIRED');
      throw new AccountError('Game Room account saving is not ready yet.', 503, 'GAME_ROOM_SETUP_REQUIRED');
    }
    if (error.code === '42501') throw new AccountError('This appearance is not available to your account.', 403);
    if (error.code === '22023') throw new AccountError('Choose an available face and complete outfit.', 400);
    throw new AccountError('Game Room storage is unavailable. Please try again.', 503);
  }
  return data;
}

