import { AccountError, accountClient } from './socialu-account';

// Server-only DormSpace bridge. The caller's account always comes from verifiedUser();
// dorm owners are addressed by username and authorized inside public.socialu_dorm.
export async function dormOperation(authId: string, action: string, owner: string | null = null, payload: Record<string, unknown> = {}) {
  const { data, error } = await accountClient().rpc('socialu_dorm', {
    p_action: action, p_auth_id: authId, p_owner: owner || null, p_payload: payload,
  });
  if (error) {
    if (!error.code && /fetch failed/i.test(error.message)) throw new AccountError('The server cannot reach Supabase. Check the server network connection and try again.', 503);
    // These codes carry messages written for students by socialu_dorm and the placement triggers.
    if (error.code === '42501') throw new AccountError(error.message, 403);
    if (error.code === 'DS409') throw new AccountError(error.message, 409);
    if (error.code === '22023') throw new AccountError(placementMessage(error.message), 400);
    throw new AccountError('DormSpace is unavailable. Check that the DormSpace migration has been applied.', 503);
  }
  return data;
}

// SRS-500.11: tell the owner which placement rule was violated.
function placementMessage(message: string) {
  const rules: Record<string, string> = {
    'Placement exceeds room bounds': 'That spot is outside the room. Keep the whole item inside the room.',
    'Placement blocks a reserved entrance or exit': 'That spot blocks the doorway. Leave the entrance clear.',
    'Items are not permitted to overlap': 'Those items cannot overlap. Choose an empty spot.',
    'Wall selection requires a wall item': 'Choose one of your wall colors.',
    'Floor selection requires a floor item': 'Choose one of your floor styles.',
  };
  return rules[message] ?? message;
}

export function ownerParam(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 100) : '';
}
