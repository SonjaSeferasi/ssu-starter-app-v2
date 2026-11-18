// SRS-201.16 (#1368) / SRS-211.5 (#1369): a message of the student's own that the server has not saved —
// either still on its way, or refused.
//
// Pure, because vitest runs here with environment 'node' and there is no React testing library, so a rule
// written inside the component could not be covered by a test. The same reason lib/chat-read-status.ts and
// lib/chat-time.ts exist.
//
// The shape of the thing: a message the student sends is put into the conversation straight away, carrying a
// LOCAL id and a status. When the server answers it is dropped and the saved message takes its place; when
// the server refuses it stays, marked. Nothing here is ever written to the database and no other participant
// ever sees it — it is one student's own view of their own unsent message.

import type { ChatMessageEvent } from './realtime-client';

export const SENDING_LABEL = 'Sending…';
export const NOT_SENT_LABEL = 'Not sent';

// Server ids are numeric strings. A local id can never be mistaken for one, in either direction.
const LOCAL_PREFIX = 'local:';

export type SendStatus = 'sending' | 'failed';
export type LocalMessage = ChatMessageEvent & { status: SendStatus };

export function localMessageId(sequence: number): string {
  return `${LOCAL_PREFIX}${sequence}`;
}

export function isLocalMessage(message: { id?: string } | null | undefined): boolean {
  return typeof message?.id === 'string' && message.id.startsWith(LOCAL_PREFIX);
}

// The message to show while the send is in flight. It carries what was sent, because the bubble has to
// render it and because SRS-201.17 retries from it; it carries the browser's clock only so that it sorts
// after everything saved, and that time is never displayed — a message that has not been sent has no
// sent time, and showing one would be a small lie.
export function startSending(fields: {
  localId: string;
  conversationId: string;
  senderId: string | null;
  text: string;
  kind?: 'emoji';
  replyToId?: string | null;
  now?: Date;
}): LocalMessage {
  return {
    id: fields.localId,
    conversation_id: fields.conversationId,
    // Empty when the student's own id is not known yet; their first send is what teaches the page. Nothing
    // reads it for a local message, because isLocalMessage already settles whose message it is.
    sender_id: fields.senderId ?? '',
    text: fields.text,
    sent_at: (fields.now ?? new Date()).toISOString(),
    ...(fields.kind ? { kind: fields.kind } : {}),
    ...(fields.replyToId ? { reply_to_id: fields.replyToId } : {}),
    status: 'sending',
  };
}

// The server answered, so the local copy goes and the saved message takes its place.
export function dropLocalMessage(messages: ChatMessageEvent[], localId: string): ChatMessageEvent[] {
  return messages.filter((message) => message.id !== localId);
}

// The server refused. The message stays where it is, marked, with everything it needs to be sent again.
export function markSendFailed(messages: ChatMessageEvent[], localId: string): ChatMessageEvent[] {
  return messages.map((message) => (message.id === localId ? { ...message, status: 'failed' as const } : message));
}

// What the status slot beside the time should say, or null for nothing to say.
//
// The status is honoured only on a local id. A message that came back from the server cannot carry one,
// whatever its fields claim: 'status' is not part of the chat message shape the server sends, and a
// received message must never be able to show its reader a failed status that belongs to someone else.
export function sendStatusLabel(message: { id?: string; status?: unknown } | null | undefined): string | null {
  if (!isLocalMessage(message)) return null;
  if (message?.status === 'failed') return NOT_SENT_LABEL;
  if (message?.status === 'sending') return SENDING_LABEL;
  return null;
}

export function hasFailedToSend(message: { id?: string; status?: unknown } | null | undefined): boolean {
  return isLocalMessage(message) && message?.status === 'failed';
}

// A message that does not exist on the server cannot be reacted to, replied to, deleted or read.
// Every one of those names a message by its id, and a local id names nothing the server knows.
export function canActOnMessage(message: { id?: string } | null | undefined): boolean {
  return Boolean(message?.id) && !isLocalMessage(message);
}

// Oldest first, with anything unsent after everything saved.
//
// Being local decides the order before any timestamp does. A local message carries the browser's clock,
// which can run behind the server's, and sorting on that alone could drop an unsent message into the
// middle of the conversation. The bottom is where it belongs and the bottom is where it stays; among
// themselves, unsent messages keep the order they were written in.
export function compareMessages(a: ChatMessageEvent, b: ChatMessageEvent): number {
  const local = Number(isLocalMessage(a)) - Number(isLocalMessage(b));
  if (local) return local;
  return Date.parse(a.sent_at) - Date.parse(b.sent_at) || (Number(a.id) || 0) - (Number(b.id) || 0);
}
