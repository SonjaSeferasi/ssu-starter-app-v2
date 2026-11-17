// SRS-211.8 / SRS-211.9 (#1283): whether a message shows a read receipt, and what it says.
//
// Pure, because vitest runs here with environment 'node' and there is no React testing library, so a rule
// written inside the component could not be covered by a test.

export const READ_LABEL = 'Read';

export type ReadStatusMessage = { sender_id: string; read?: boolean | null };

// True when this message should show that the other student has read it.
//
// Four things have to be true, and each one is a requirement rather than a preference:
//   - the conversation is private. SRS-211.9 says a group message carries no receipt, and the database
//     does not send one; this is the second lock on the same door.
//   - the message is the student's own. SRS-211.8 tells a sender about their own message. Showing it on a
//     received message would be telling someone what they themselves have read, which is noise at best.
//   - the server actually said read. A server without 20261117160000 sends no 'read' field at all, and an
//     absent field must read as "nothing to show" rather than "not read" -- see below.
//   - it is true. Nothing is shown before the message has been read.
//
// Nothing is shown for "not read yet". Saying "Sent" there would be SRS-211.4, which is a separate
// requirement and not built; silence is the honest state until it is.
export function showsReadReceipt(
  conversationKind: 'private' | 'group' | undefined | null,
  message: ReadStatusMessage,
  myStudentId: string | null,
): boolean {
  if (conversationKind !== 'private') return false;
  if (!myStudentId || message.sender_id !== myStudentId) return false;
  return message.read === true;
}
