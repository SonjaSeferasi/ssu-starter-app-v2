// SRS-211.5 (#1369): which of the statuses a message shows, when more than one could apply.
//
// SRS-201.16/SRS-211.5 ("Not sent"), SRS-211.8 ("Read") and, when it is built, SRS-211.4 ("Sent") all draw
// in one place: beside the time, under the message. They are states of one slot rather than labels that
// stack, so something has to choose between them, and that something must be testable.
//
// Until now the choosing lived in the page, as a ternary. It was right, but "a failed status and a read
// status are never shown at once" is a requirement, and a requirement written only inside a component
// cannot be covered -- vitest runs here with environment 'node' and there is no React testing library.
// So the rule moved here and the page asks it.

import { READ_LABEL, showsReadReceipt, type ReadStatusMessage } from './chat-read-status';
import { hasFailedToSend, sendStatusLabel } from './chat-send-status';

export type MessageStatusState = 'sending' | 'failed' | 'read';
export type MessageStatus = { label: string; state: MessageStatusState };

// The order is the point.
//
// What happened to the send comes first. A message that has not reached the server cannot have been read,
// so the two should never be in competition -- but "should never" is not a thing to lean on when the cost
// of being wrong is telling a student their message was read when it was never sent. Asking about the send
// first means that even a message carrying a stale 'read' from somewhere cannot produce a read receipt
// while it is unsent.
//
// Null means the slot shows nothing. That is the ordinary state of a saved message that has not been read,
// and it stays that way until SRS-211.4 (#1372) gives it something to say.
export function messageStatus(
  conversationKind: 'private' | 'group' | undefined | null,
  message: ReadStatusMessage & { id?: string; status?: unknown },
  myStudentId: string | null,
): MessageStatus | null {
  const sending = sendStatusLabel(message);
  if (sending) return { label: sending, state: hasFailedToSend(message) ? 'failed' : 'sending' };
  if (showsReadReceipt(conversationKind, message, myStudentId)) return { label: READ_LABEL, state: 'read' };
  return null;
}
