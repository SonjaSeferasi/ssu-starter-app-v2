// How the list of messages on screen is put together: saved history, live events and the student's own
// unsent messages, as one list with one copy of each message in it.
//
// Lifted out of app/messages/[conversationId]/page.tsx for SRS-201.17 (#1370). It had always lived in the
// page, where no test could reach it, and the rule SRS-201.17 needs — that an unsent message is still there
// after the history reloads and after other people's messages arrive — is a property of exactly this
// function. Nothing about it changed in the move.

import { mergePhotoUrl } from './chat-photo-links';
import { compareMessages } from './chat-send-status';
import type { ChatMessageEvent } from './realtime-client';

// Saved history and live events can overlap; keep one copy of each message, oldest first.
//
// A message already on screen is kept unless the incoming list names it. That is what holds a failed
// message in place (SRS-201.17) — the server never sends it, so nothing incoming can ever name it — and it
// is the same rule that keeps a signed photo link the student is looking at.
export function mergeMessages(current: ChatMessageEvent[], incoming: ChatMessageEvent[]): ChatMessageEvent[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  // SRS-201.7 (#1029): a live photo arrives with no signed link, so merging keeps the one already known
  // rather than blanking out a photo the student is looking at. A newer link still wins.
  for (const message of incoming) byId.set(message.id, mergePhotoUrl(byId.get(message.id), message));
  // SRS-201.16 (#1368): compareMessages is the old comparator with one rule in front of it -- a message the
  // server has not saved sorts after every message it has.
  return [...byId.values()].sort(compareMessages);
}
