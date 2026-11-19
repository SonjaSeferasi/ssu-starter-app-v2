// SRS-211.4 (#1372): telling the sender their message was saved.
//
// Pure, for the reason lib/chat-read-status.ts gives: vitest runs here with environment 'node' and there
// is no React testing library, so a rule written inside the component could not be covered.

export const SENT_LABEL = 'Sent';

export type SentStatusMessage = { id?: string; sender_id?: string };

// True when this message should say it was sent.
//
// Two conditions, and a third that is not here.
//
//   - it is the student's own message. SRS-211.4 tells a sender about their own message; on a received
//     message the label would be telling someone a message they are reading was sent, which is visible
//     from the fact that they are reading it.
//   - the server has it. A local message has not been sent, whatever it says, and the send status
//     (SRS-201.16) is what speaks for it.
//
// Not here: anything about groups. SRS-211.9 keeps the READ status out of group conversations, because
// "has it been read" has no single answer when several people could have read it. "Was it sent" has
// exactly one answer everywhere, so the sent status is shown in a group as well.
//
// Whether this is the student's LATEST message is also not here. That is a question about the
// conversation rather than about the message, so it is answered by latestOwnMessageId and applied by
// chat-message-status.ts, which is the one place that knows what else the slot could be saying.
export function showsSentStatus(message: SentStatusMessage, myStudentId: string | null, isSaved: boolean): boolean {
  if (!myStudentId || message.sender_id !== myStudentId) return false;
  return isSaved;
}
