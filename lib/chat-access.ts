import { AccountError, accountClient } from './socialu-account';

// SRS-201.1 / SRS-213.1: one shared answer for missing and forbidden conversations,
// so outsiders cannot discover which conversations exist.
export const CONVERSATION_NOT_AVAILABLE = 'Conversation not available.';

export function conversationIdParam(value: string) {
  if (!/^[1-9]\d{0,17}$/.test(value)) throw new AccountError(CONVERSATION_NOT_AVAILABLE, 404);
  return value;
}

export async function chatOperation(fn: string, args: Record<string, string>) {
  // Server-only: the participant check runs inside the database function (#299).
  const { data, error } = await accountClient().rpc(fn, args);
  if (error) {
    if (!error.code && /fetch failed/i.test(error.message)) throw new AccountError('The server cannot reach Supabase. Check the server network connection and try again.', 503);
    if (error.code === 'SC404') throw new AccountError(CONVERSATION_NOT_AVAILABLE, 404);
    if (error.code === 'SC403') throw new AccountError('You cannot send messages in this conversation right now.', 403);
    if (error.code === '42501') throw new AccountError('A verified, active university account is required.', 403);
    if (error.code === '22023') throw new AccountError('Messages must contain 1 to 500 characters.', 400);
    throw new AccountError('Chat is unavailable. Check that the chat migration has been applied.', 503);
  }
  return data;
}
