// #1222 (SRS-205.13, SRS-207.5, SRS-208.7, SRS-213.5): what the page shows a student who still has a
// group conversation but is no longer in the group.
//
// A membership can end three ways -- the student left, an owner or administrator removed them, or they
// handed ownership over and then left -- and the wording has to be true of all three, so it says what is
// the case now rather than how it came about. It also has to be true of a group that renamed itself or
// moved on since: the student is told about their own position, not about the group.
//
// Pure, because vitest here runs with environment 'node' and there is no React testing library, so a rule
// written inside the component cannot be covered by a test.

export const FORMER_MEMBER_NOTICE =
  'You are no longer in this group. You can still read the messages from while you were a member.';

// Short enough to sit beside a conversation name in the Messages list.
export const FORMER_MEMBER_BADGE = 'Past group';

export type ConversationInfo = { kind: 'private' | 'group'; role?: string | null; former?: boolean | null } | null | undefined;

// True when the conversation opens for reading but every write would be refused. Private conversations are
// never read-only this way: a DM has no membership to end. A conversation whose info has not loaded yet is
// not treated as read-only, so the composer does not flicker away and back on a slow load.
export function isReadOnly(info: ConversationInfo): boolean {
  return info?.kind === 'group' && info.former === true;
}

// SRS-207.6 (#1264): the option to delete a group conversation from this student's own view, offered only
// where SRS-207.6 says it exists -- after they have left. It is the same condition as read-only, named
// separately so the page reads as the requirement does and so a change to one does not silently change the
// other.
export function canDeleteConversation(info: ConversationInfo): boolean {
  return isReadOnly(info);
}

export const DELETE_CONVERSATION_LABEL = 'Delete conversation';

// Says whose copy goes and whose does not, because that distinction is the whole of SRS-207.7 and it is the
// thing a student is most likely to get wrong about a button labelled "delete". "Remove it from your
// Messages" rather than "delete it" for the same reason.
export const DELETE_CONVERSATION_CONFIRM =
  'Remove this conversation from your Messages? The group keeps it, and you will not be able to read it again unless you rejoin.';

export const DELETE_CONVERSATION_FAILED = 'This conversation could not be deleted. Please try again.';
