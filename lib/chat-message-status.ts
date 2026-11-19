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
import { hasFailedToSend, isLocalMessage, sendStatusLabel } from './chat-send-status';
import { SENT_LABEL, showsSentStatus } from './chat-sent-status';
import type { ChatMessageEvent } from './realtime-client';

export type MessageStatusState = 'sending' | 'failed' | 'sent' | 'read';
export type MessageStatus = { label: string; state: MessageStatusState };

// The order is the point.
//
// What happened to the send comes first. A message that has not reached the server cannot have been read,
// so the two should never be in competition -- but "should never" is not a thing to lean on when the cost
// of being wrong is telling a student their message was read when it was never sent. Asking about the send
// first means that even a message carrying a stale 'read' from somewhere cannot produce a read receipt
// while it is unsent.
//
// Null means the slot shows nothing -- which is every message except the student's latest, and a received
// message anywhere.

// SRS-211.4 (#1372): the student's most recent SAVED message of their own, or null.
//
// Saved, not merely their own: a message that failed at the bottom of the conversation must not take the
// "Read" off the message above it. The failed one says "Not sent" wherever it sits, and the last message
// that actually reached the server goes on reporting what happened to it.
export function latestOwnMessageId(messages: ChatMessageEvent[], myStudentId: string | null): string | null {
  if (!myStudentId) return null;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (isLocalMessage(message)) continue;
    if (message.sender_id === myStudentId) return message.id;
  }
  return null;
}

export function messageStatus(
  conversationKind: 'private' | 'group' | undefined | null,
  message: ReadStatusMessage & { id?: string; status?: unknown },
  myStudentId: string | null,
  isLatestOwn: boolean,
): MessageStatus | null {
  const sending = sendStatusLabel(message);
  if (sending) return { label: sending, state: hasFailedToSend(message) ? 'failed' : 'sending' };
  // SRS-211.4 (#1372): "Sent" and "Read" are shown on the student's latest message only, which is LP's
  // decision and recorded on #1372. A label under every bubble on one side of the conversation is noise,
  // and the question people actually ask -- did the last thing I said get through -- is about the last
  // thing they said. The send statuses above are NOT limited this way: a message that failed has to say
  // so wherever it sits, and several can be sitting failed at once.
  if (!isLatestOwn) return null;
  if (showsReadReceipt(conversationKind, message, myStudentId)) return { label: READ_LABEL, state: 'read' };
  // Read before Sent: once it has been read it has plainly been sent, and the later state is the one
  // worth the slot.
  if (showsSentStatus(message, myStudentId, !isLocalMessage(message))) return { label: SENT_LABEL, state: 'sent' };
  return null;
}
