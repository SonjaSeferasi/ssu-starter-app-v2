import { AccountError, accountClient } from './socialu-account';

// Server-only: events live in the socialu schema, which is outside the Data API,
// so every event read and write goes through a server-only database function.
export async function eventOperation(fn: string, args: Record<string, unknown>, invalidMessage = 'Title, description, location, date, and time are required.') {
  const { data, error } = await accountClient().rpc(fn, args);
  if (error) {
    if (!error.code && /fetch failed/i.test(error.message)) throw new AccountError('The server cannot reach Supabase. Check the server network connection and try again.', 503);
    if (error.code === '42501') throw new AccountError('A verified, active university account is required. Finish setting up your profile, then try again.', 403);
    if (error.code === 'SE404') throw new AccountError('This event is not available.', 404);
    if (error.code === 'SE403') throw new AccountError('Only the event’s creator can invite students.', 403);
    if (error.code === 'SE409') throw new AccountError(fn === 'socialu_event_invite' ? 'This event has already started, so invitations are closed.' : 'This event has already started, so attendance can no longer change.', 409);
    if (error.code === 'SE422') throw new AccountError('One or more selected students cannot be invited. Search again and reselect.', 422);
    if (error.code === '22023') throw new AccountError(invalidMessage, 400);
    throw new AccountError('Events are unavailable. Check that the event migrations have been applied.', 503);
  }
  return data;
}

// Event IDs are positive whole numbers; anything else is simply "not available".
export function eventIdParam(value: string) {
  if (!/^[1-9]\d{0,17}$/.test(value)) throw new AccountError('This event is not available.', 404);
  return value;
}

// Like/unlike or going/not going for the signed-in student; returns the event's updated counts.
export async function reactToEvent(authId: string, eventId: string, action: 'like' | 'unlike' | 'going' | 'not_going') {
  return eventOperation('socialu_event_react', { p_auth_id: authId, p_event_id: eventId, p_action: action });
}
