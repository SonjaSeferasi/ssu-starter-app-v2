// SRS-201.16 (#1368): a message of the student's own that the server has not saved, and the status shown
// on it. The rules live in lib/chat-send-status.ts rather than in the component, because vitest runs here
// with environment 'node' and no React testing library.

import { describe, expect, it } from 'vitest';
import type { ChatMessageEvent } from '../lib/realtime-client';
import {
  NOT_SENT_LABEL,
  SENDING_LABEL,
  canActOnMessage,
  compareMessages,
  dropLocalMessage,
  hasFailedToSend,
  isLocalMessage,
  localMessageId,
  markSendFailed,
  retainedContent,
  sendStatusLabel,
  startSending,
} from '../lib/chat-send-status';

function saved(id: string, sentAt: string, fields: Partial<ChatMessageEvent> = {}): ChatMessageEvent {
  return { id, conversation_id: '1', sender_id: '7', text: `message ${id}`, sent_at: sentAt, ...fields };
}

describe('telling a local message from a saved one', () => {
  it('recognises the ids it makes itself, and no others', () => {
    expect(isLocalMessage({ id: localMessageId(1) })).toBe(true);
    expect(isLocalMessage({ id: localMessageId(42) })).toBe(true);
    // Server ids are numeric strings. Neither one can be mistaken for the other.
    expect(isLocalMessage({ id: '42' })).toBe(false);
    expect(isLocalMessage({ id: '' })).toBe(false);
    expect(isLocalMessage(null)).toBe(false);
    expect(isLocalMessage(undefined)).toBe(false);
  });

  it('gives each message in a conversation its own id', () => {
    expect(localMessageId(1)).not.toBe(localMessageId(2));
  });
});

describe('the message held while the send is in flight', () => {
  it('carries what was sent, so there is something to show and something to send again', () => {
    const pending = startSending({
      localId: localMessageId(1), conversationId: '9', senderId: '7',
      text: 'Running ten minutes late', now: new Date('2026-11-18T20:28:00.000Z'),
    });
    expect(pending.id).toBe(localMessageId(1));
    expect(pending.conversation_id).toBe('9');
    expect(pending.sender_id).toBe('7');
    expect(pending.text).toBe('Running ten minutes late');
    expect(pending.sent_at).toBe('2026-11-18T20:28:00.000Z');
    expect(pending.status).toBe('sending');
    // An ordinary text message has no kind and no reply target, and must not acquire empty ones.
    expect(pending.kind).toBeUndefined();
    expect(pending.reply_to_id).toBeUndefined();
  });

  it('keeps the emoji kind and the reply target, which are part of what has to be sent again', () => {
    const pending = startSending({
      localId: localMessageId(2), conversationId: '9', senderId: '7',
      text: '👍', kind: 'emoji', replyToId: '31',
    });
    expect(pending.kind).toBe('emoji');
    expect(pending.reply_to_id).toBe('31');
  });

  it('survives the student not knowing their own id yet', () => {
    // The page learns the student's id from the answer to their first send, so the first message of a
    // conversation is created before it is known. Being local is what settles whose message it is.
    const pending = startSending({ localId: localMessageId(1), conversationId: '9', senderId: null, text: 'Hello' });
    expect(pending.sender_id).toBe('');
    expect(isLocalMessage(pending)).toBe(true);
  });
});

describe('what the status slot says', () => {
  it('says it is on its way, then that it did not go', () => {
    const pending = startSending({ localId: localMessageId(1), conversationId: '9', senderId: '7', text: 'Hi' });
    expect(sendStatusLabel(pending)).toBe(SENDING_LABEL);
    expect(hasFailedToSend(pending)).toBe(false);

    const [failed] = markSendFailed([pending], pending.id);
    expect(sendStatusLabel(failed)).toBe(NOT_SENT_LABEL);
    expect(hasFailedToSend(failed)).toBe(true);
  });

  it('says nothing about a message the server has saved', () => {
    expect(sendStatusLabel(saved('41', '2026-11-18T20:28:00.000Z'))).toBeNull();
    expect(hasFailedToSend(saved('41', '2026-11-18T20:28:00.000Z'))).toBe(false);
  });

  it('refuses to believe a status on a server id', () => {
    // Defence in depth. 'status' is not part of the message shape the server sends, and a received message
    // must never be able to show its reader a failed status that is not theirs to see. The status is
    // honoured only on an id this browser made.
    const impostor = { ...saved('41', '2026-11-18T20:28:00.000Z'), status: 'failed' };
    expect(sendStatusLabel(impostor)).toBeNull();
    expect(hasFailedToSend(impostor)).toBe(false);
  });
});

describe('acting on a message', () => {
  it('allows nothing on a message the server has never seen', () => {
    // Reacting, replying, deleting and marking read all name a message by its id, and a local id names
    // nothing the server knows.
    const pending = startSending({ localId: localMessageId(1), conversationId: '9', senderId: '7', text: 'Hi' });
    expect(canActOnMessage(pending)).toBe(false);
    expect(canActOnMessage(markSendFailed([pending], pending.id)[0])).toBe(false);
  });

  it('allows it on a saved message, and on nothing without an id', () => {
    expect(canActOnMessage(saved('41', '2026-11-18T20:28:00.000Z'))).toBe(true);
    expect(canActOnMessage({ id: '' })).toBe(false);
    expect(canActOnMessage(null)).toBe(false);
  });
});

describe('marking and dropping', () => {
  const first = startSending({ localId: localMessageId(1), conversationId: '9', senderId: '7', text: 'first' });
  const second = startSending({ localId: localMessageId(2), conversationId: '9', senderId: '7', text: 'second' });
  const list = [saved('41', '2026-11-18T20:27:00.000Z'), first, second];

  it('marks only the message that failed', () => {
    const marked = markSendFailed(list, second.id);
    expect(sendStatusLabel(marked[2])).toBe(NOT_SENT_LABEL);
    expect(sendStatusLabel(marked[1])).toBe(SENDING_LABEL);
    expect(sendStatusLabel(marked[0])).toBeNull();
    // The original list is untouched; React is told about a new one.
    expect(sendStatusLabel(list[2])).toBe(SENDING_LABEL);
  });

  it('drops only the message the server answered for', () => {
    const left = dropLocalMessage(list, first.id);
    expect(left.map((message) => message.id)).toEqual(['41', second.id]);
  });

  it('leaves the list alone when the id is not in it', () => {
    expect(dropLocalMessage(list, localMessageId(99))).toHaveLength(3);
    expect(markSendFailed(list, localMessageId(99)).every((message) => sendStatusLabel(message) !== NOT_SENT_LABEL)).toBe(true);
  });
});

describe('where an unsent message sits', () => {
  it('leaves saved messages in the order they were already in', () => {
    const a = saved('41', '2026-11-18T20:27:00.000Z');
    const b = saved('42', '2026-11-18T20:28:00.000Z');
    // Two messages saved in the same instant fall back to the id, as they did before this change.
    const c = saved('43', '2026-11-18T20:28:00.000Z');
    expect([c, b, a].sort(compareMessages).map((message) => message.id)).toEqual(['41', '42', '43']);
  });

  it('puts an unsent message last even when the browser clock is behind the server', () => {
    const recent = saved('41', '2026-11-18T20:28:00.000Z');
    // A browser five minutes slow. Sorting on the timestamp alone would drop this into the middle of the
    // conversation; it belongs at the bottom, where the student just typed it.
    const pending = startSending({
      localId: localMessageId(1), conversationId: '9', senderId: '7', text: 'late clock',
      now: new Date('2026-11-18T20:23:00.000Z'),
    });
    expect([pending, recent].sort(compareMessages).map((message) => message.id)).toEqual(['41', pending.id]);
  });

  it('keeps unsent messages among themselves in the order they were written', () => {
    const first = startSending({ localId: localMessageId(1), conversationId: '9', senderId: '7', text: 'first', now: new Date('2026-11-18T20:28:00.000Z') });
    const second = startSending({ localId: localMessageId(2), conversationId: '9', senderId: '7', text: 'second', now: new Date('2026-11-18T20:28:01.000Z') });
    expect([second, first].sort(compareMessages).map((message) => message.text)).toEqual(['first', 'second']);
  });
});

// SRS-201.17 (#1370): once the message box is cleared, the failed message is the only place the content
// lives, so reading it back off the message has to give everything a send needs.
describe('what a failed message keeps', () => {
  it('keeps the text', () => {
    const pending = startSending({ localId: localMessageId(1), conversationId: '9', senderId: '7', text: 'Running ten minutes late' });
    expect(retainedContent(markSendFailed([pending], pending.id)[0])).toEqual({ text: 'Running ten minutes late' });
  });

  it('keeps that it was an emoji, which is a kind of its own', () => {
    const pending = startSending({ localId: localMessageId(2), conversationId: '9', senderId: '7', text: '👍', kind: 'emoji' });
    expect(retainedContent(pending)).toEqual({ text: '👍', kind: 'emoji' });
  });

  it('keeps what it was answering', () => {
    // A retry that had lost the reply target would quietly send an ordinary message instead, which is not
    // the message the student wrote.
    const pending = startSending({ localId: localMessageId(3), conversationId: '9', senderId: '7', text: 'On my way', replyToId: '41' });
    expect(retainedContent(pending)).toEqual({ text: 'On my way', replyToId: '41' });
  });

  it('keeps it whether the send is still going or has already failed', () => {
    const pending = startSending({ localId: localMessageId(4), conversationId: '9', senderId: '7', text: 'Hello' });
    expect(retainedContent(pending)).toEqual({ text: 'Hello' });
    expect(retainedContent(markSendFailed([pending], pending.id)[0])).toEqual({ text: 'Hello' });
  });

  it('gives nothing back for a message the server has saved', () => {
    // A saved message needs no retry, and its text is the server's rather than a draft. Content for one
    // would invite a "retry" that sent a second copy of something already sent.
    expect(retainedContent(saved('41', '2026-11-18T20:28:00.000Z'))).toBeNull();
    expect(retainedContent({ ...saved('41', '2026-11-18T20:28:00.000Z'), status: 'failed' })).toBeNull();
  });

  it('gives nothing back when there is nothing to send', () => {
    const empty = startSending({ localId: localMessageId(5), conversationId: '9', senderId: '7', text: '' });
    expect(retainedContent(empty)).toBeNull();
    expect(retainedContent(null)).toBeNull();
  });
});
