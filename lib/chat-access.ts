import { AccountError, accountClient } from './socialu-account';
import { EMOJI_REQUIRED } from './chat-emoji';
import { REACTION_REQUIRED } from './chat-reactions';

// SRS-201.1 / SRS-213.1: one shared answer for missing and forbidden conversations,
// so outsiders cannot discover which conversations exist.
export const CONVERSATION_NOT_AVAILABLE = 'Conversation not available.';

export function conversationIdParam(value: string) {
  if (!/^[1-9]\d{0,17}$/.test(value)) throw new AccountError(CONVERSATION_NOT_AVAILABLE, 404);
  return value;
}

// SRS-205.5 to SRS-205.8: one answer for missing, someone else's, and already answered invitations.
export const INVITATION_NOT_AVAILABLE = 'This invitation is no longer available.';

export function invitationIdParam(value: string) {
  if (!/^[1-9]\d{0,17}$/.test(value)) throw new AccountError(INVITATION_NOT_AVAILABLE, 404);
  return value;
}

// SRS-210.1: the same answer for a message that is missing, in another conversation, or one the student cannot read.
export const MESSAGE_NOT_AVAILABLE = 'This message is no longer available.';

export function messageIdParam(value: string) {
  if (!/^[1-9]\d{0,17}$/.test(value)) throw new AccountError(MESSAGE_NOT_AVAILABLE, 404);
  return value;
}

// SRS-204.1: the same answer whether the chosen student does not exist, is not in this group, or is not a
// regular member, so nobody can use the picker to learn about students outside the group.
export const MEMBER_NOT_AVAILABLE = 'Choose a current member of this group.';

// SRS-204.6: one answer whether the group has no administrator or the named student is not the one holding it.
export const ADMINISTRATOR_NOT_AVAILABLE = 'Choose this group’s current administrator.';

// SRS-202.5: the length rule for group names, shared by the route and the database's answer.
export const GROUP_NAME_LENGTH = 'Group names must be 1 to 50 characters.';

export async function chatOperation(fn: string, args: Record<string, string>) {
  // Server-only: the participant check runs inside the database function (#299).
  const { data, error } = await accountClient().rpc(fn, args);
  if (error) {
    if (!error.code && /fetch failed/i.test(error.message)) throw new AccountError('The server cannot reach Supabase. Check the server network connection and try again.', 503);
    if (error.code === 'SC404') throw new AccountError(CONVERSATION_NOT_AVAILABLE, 404);
    if (error.code === 'SC403') throw new AccountError('You cannot send messages in this conversation right now.', 403);
    if (error.code === 'P0002') throw new AccountError('This profile is not available.', 404);
    // SRS-205.1 / SRS-205.2 / SRS-205.3: group invitations.
    if (error.code === 'SCI01') throw new AccountError('Only the group owner or an administrator can invite people.', 403);
    if (error.code === 'SCI02') throw new AccountError('You can only invite your current friends.', 403);
    if (error.code === 'SCI03') throw new AccountError('This friend is already in the group.', 409);
    if (error.code === 'SCI04') throw new AccountError('Search must be 100 characters or fewer.', 400);
    if (error.code === 'SCI05') throw new AccountError(INVITATION_NOT_AVAILABLE, 404);
    // SRS-201.8: emoji messages.
    if (error.code === 'SCE01') throw new AccountError(EMOJI_REQUIRED, 400);
    // SRS-202.5: group names.
    if (error.code === 'SCG01') throw new AccountError('Only the group owner or an administrator can name the group.', 403);
    if (error.code === 'SCG02') throw new AccountError(GROUP_NAME_LENGTH, 400);
    // SRS-210.1 to SRS-210.6: reactions.
    if (error.code === 'SCR01') throw new AccountError(REACTION_REQUIRED, 400);
    if (error.code === 'SCR03') throw new AccountError('You cannot react to messages in this conversation right now.', 403);
    if (error.code === 'SCR04') throw new AccountError(MESSAGE_NOT_AVAILABLE, 404);
    // SRS-204.1 / SRS-204.2: assign an administrator.
    if (error.code === 'SCA01') throw new AccountError('Only the group owner can assign an administrator.', 403);
    if (error.code === 'SCA02') throw new AccountError('This group already has an administrator.', 409);
    if (error.code === 'SCA03') throw new AccountError(MEMBER_NOT_AVAILABLE, 404);
    // SRS-204.6: revoke administrator privileges.
    if (error.code === 'SCA04') throw new AccountError('Only the group owner can revoke administrator privileges.', 403);
    if (error.code === 'SCA05') throw new AccountError(ADMINISTRATOR_NOT_AVAILABLE, 404);
    // SRS-205.10: remove a regular group member.
    if (error.code === 'SCM01') throw new AccountError('Only the group owner or an administrator can remove members.', 403);
    if (error.code === 'SCM02') throw new AccountError(MEMBER_NOT_AVAILABLE, 404);
    // SRS-207.1: leave a group.
    if (error.code === 'SCL01') throw new AccountError('Assign an administrator before you leave the group.', 409);
    if (error.code === '42501') throw new AccountError('A verified, active university account is required.', 403);
    if (error.code === '22023') throw new AccountError('Messages must contain 1 to 500 characters.', 400);
    throw new AccountError('Chat is unavailable. Check that the chat migration has been applied.', 503);
  }
  return data;
}
