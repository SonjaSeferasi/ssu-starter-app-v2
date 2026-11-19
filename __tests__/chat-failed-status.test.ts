// SRS-211.5 (#1369): "When a message fails to send, the system shall display a failed status for that
// message to its sender."
//
// The same behaviour SRS-201.16 asks for, written a second time in the SRS from the UR-211 side — "I want
// to know what happened to my message" rather than "I want to send a message". The work is #1368's; these
// tests pin the three properties UR-211 cares about, so that a later change to the status slot cannot
// quietly break this requirement while leaving SRS-201.16's own tests green.
//
// The three are: the sender is told; nobody else is; and it never collides with the read status, because
// both live in the same slot beside the time.

import { describe, expect, it } from 'vitest';
import type { ChatMessageEvent } from '../lib/realtime-client';
import { READ_LABEL, showsReadReceipt } from '../lib/chat-read-status';
import { messageStatus } from '../lib/chat-message-status';
import {
  NOT_SENT_LABEL,
  SENDING_LABEL,
  localMessageId,
  markSendFailed,
  sendStatusLabel,
  startSending,
} from '../lib/chat-send-status';

const ME = '7';
const THEM = '2';

function failed(text = 'Running ten minutes late', sequence = 1) {
  const pending = startSending({ localId: localMessageId(sequence), conversationId: '1', senderId: ME, text });
  return markSendFailed([pending], pending.id)[0];
}

function received(fields: Partial<ChatMessageEvent> = {}): ChatMessageEvent {
  return { id: '41', conversation_id: '1', sender_id: THEM, text: 'Sounds good', sent_at: '2026-11-18T20:28:00.000Z', ...fields };
}

describe('the sender is told', () => {
  it('shows a failed status on a message of their own that did not go', () => {
    expect(sendStatusLabel(failed())).toBe(NOT_SENT_LABEL);
  });

  it('shows it in a group as well as a private conversation', () => {
    // Unlike the read status, which SRS-211.9 keeps out of groups, a failed status has nothing to do with
    // who else is in the conversation. It is between the student and the server, so it does not depend on
    // the conversation's kind at all -- sendStatusLabel is not even given one.
    expect(sendStatusLabel(failed('Posting the sprint plan here'))).toBe(NOT_SENT_LABEL);
  });

  it('says it is still going rather than that it failed, until it has', () => {
    const pending = startSending({ localId: localMessageId(9), conversationId: '1', senderId: ME, text: 'On my way' });
    expect(sendStatusLabel(pending)).toBe(SENDING_LABEL);
  });
});

describe('nobody else is', () => {
  it('shows nothing on a message the student received', () => {
    expect(sendStatusLabel(received())).toBeNull();
  });

  it('shows nothing on a received message even if it arrives claiming a status', () => {
    // 'status' is not part of the message shape the server sends. If one ever appeared -- a bad migration,
    // a confused cache, someone else's field -- the reader must not be shown a failure that is not theirs.
    expect(sendStatusLabel({ ...received(), status: 'failed' })).toBeNull();
    expect(sendStatusLabel({ id: '41', status: 'sending' })).toBeNull();
  });

  it('shows nothing on the student’s own message once the server has saved it', () => {
    // A saved message of the student's own did not fail; it is just a message.
    expect(sendStatusLabel(received({ sender_id: ME }))).toBeNull();
  });
});

describe('one slot, one status', () => {
  it('never shows a failed status and a read receipt at the same time', () => {
    // SRS-211.5 and SRS-211.8 draw in the same place, beside the time, so something has to choose. It
    // chooses the send status, and that is what messageStatus exists to make testable.
    const message = failed();
    expect(messageStatus('private', message, ME, true)).toEqual({ label: NOT_SENT_LABEL, state: 'failed' });
  });

  it('shows "Not sent" rather than "Read" on a failed message that claims to have been read', () => {
    // A message that never reached the server cannot have been read, so this should be impossible -- and
    // "should be impossible" is not a thing to lean on when the cost of being wrong is telling a student
    // their message was read when it was never sent. The rule is asked in the order that cannot be wrong.
    const message = { ...failed(), read: true };
    expect(showsReadReceipt('private', message, ME)).toBe(true);
    expect(messageStatus('private', message, ME, true)).toEqual({ label: NOT_SENT_LABEL, state: 'failed' });
  });

  it('shows the read receipt once the message is a saved one', () => {
    const saved = received({ sender_id: ME, read: true });
    expect(messageStatus('private', saved, ME, true)).toEqual({ label: READ_LABEL, state: 'read' });
  });

  it('shows "Sending…" ahead of anything else while a message is on its way', () => {
    const pending = startSending({ localId: localMessageId(4), conversationId: '1', senderId: ME, text: 'On my way' });
    expect(messageStatus('private', { ...pending, read: true }, ME, true)).toEqual({ label: SENDING_LABEL, state: 'sending' });
  });

  it('shows nothing on a message the student received, latest or not', () => {
    expect(messageStatus('private', received(), ME, true)).toBeNull();
    expect(messageStatus('private', received(), ME, false)).toBeNull();
  });

  it('shows nothing on the student’s own message once it is no longer their latest', () => {
    // SRS-211.4 (#1372) limited "Sent" and "Read" to the latest own message. The send statuses above are
    // not limited that way -- a failed message says so wherever it sits -- which is why this case sits
    // here rather than only in the SRS-211.4 tests.
    expect(messageStatus('private', received({ sender_id: ME, read: true }), ME, false)).toBeNull();
  });

  it('gives exactly one answer for every message in a conversation that has one of each', () => {
    // A failed message at the bottom, and above it the last message that actually reached the server.
    const read = received({ id: '42', sender_id: ME, read: true });
    const conversation = [received(), read, failed()];
    const latest = read.id;
    expect(conversation.map((message) => messageStatus('private', message, ME, message.id === latest)?.state ?? null))
      .toEqual([null, 'read', 'failed']);
  });
});
