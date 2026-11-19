// SRS-211.4 (#1372): "After a message has been successfully sent, the system shall display a sent status
// for that message to its sender."
//
// Two rules, in two places, because they answer two different questions. showsSentStatus asks about the
// message: is it mine, and does the server have it. latestOwnMessageId asks about the conversation: which
// of my messages is the last one. messageStatus puts them together with the read status (SRS-211.8) and the
// send statuses (SRS-201.16), because only it knows what else the one slot could be saying.

import { describe, expect, it } from 'vitest';
import type { ChatMessageEvent } from '../lib/realtime-client';
import { SENT_LABEL, showsSentStatus } from '../lib/chat-sent-status';
import { READ_LABEL } from '../lib/chat-read-status';
import { latestOwnMessageId, messageStatus } from '../lib/chat-message-status';
import { NOT_SENT_LABEL, localMessageId, markSendFailed, startSending } from '../lib/chat-send-status';

const ME = '7';
const THEM = '2';

function saved(id: string, sender: string, fields: Partial<ChatMessageEvent> = {}): ChatMessageEvent {
  return { id, conversation_id: '1', sender_id: sender, text: `message ${id}`, sent_at: `2026-11-18T20:${id.padStart(2, '0')}:00.000Z`, ...fields };
}

function failed(sequence = 1) {
  const pending = startSending({ localId: localMessageId(sequence), conversationId: '1', senderId: ME, text: 'did not go' });
  return markSendFailed([pending], pending.id)[0];
}

describe('whether a message can say it was sent', () => {
  it('says so for the student’s own saved message', () => {
    expect(showsSentStatus(saved('41', ME), ME, true)).toBe(true);
  });

  it('never says so for a message the student received', () => {
    // Telling a reader that the message they are reading was sent is telling them something they can see.
    expect(showsSentStatus(saved('41', THEM), ME, true)).toBe(false);
  });

  it('never says so for a message the server does not have', () => {
    // The send status (SRS-201.16) speaks for a message that has not been saved. "Sent" on one would be
    // the opposite of true.
    expect(showsSentStatus(saved('41', ME), ME, false)).toBe(false);
  });

  it('says nothing when the student’s own id is not known yet', () => {
    expect(showsSentStatus(saved('41', ME), null, true)).toBe(false);
  });
});

describe('which message is the latest of the student’s own', () => {
  it('finds the last one they sent, not the last one in the conversation', () => {
    const conversation = [saved('41', ME), saved('42', THEM), saved('43', ME), saved('44', THEM)];
    expect(latestOwnMessageId(conversation, ME)).toBe('43');
  });

  it('skips a message that has not been sent', () => {
    // A failed message at the bottom must not take the status off the last message that actually reached
    // the server. The failed one says "Not sent" wherever it sits; this one goes on reporting.
    const conversation = [saved('41', ME), saved('43', ME), failed()];
    expect(latestOwnMessageId(conversation, ME)).toBe('43');
  });

  it('gives nothing when they have said nothing, or when their id is not known', () => {
    expect(latestOwnMessageId([saved('41', THEM)], ME)).toBeNull();
    expect(latestOwnMessageId([saved('41', ME)], null)).toBeNull();
    expect(latestOwnMessageId([], ME)).toBeNull();
  });
});

describe('the status each message ends up showing', () => {
  it('shows "Sent" on the latest own message and nothing on the ones before it', () => {
    // LP's decision, recorded on #1372: a label under every bubble on one side is noise, and the question
    // people ask -- did the last thing I said get through -- is about the last thing they said.
    const conversation = [saved('41', ME), saved('42', THEM), saved('43', ME)];
    const latest = latestOwnMessageId(conversation, ME);
    expect(conversation.map((m) => messageStatus('private', m, ME, m.id === latest)?.label ?? null))
      .toEqual([null, null, SENT_LABEL]);
  });

  it('gives way to "Read" once the other student has read it', () => {
    // Once it has been read it has plainly been sent, and the later state is the one worth the slot.
    const read = saved('43', ME, { read: true });
    expect(messageStatus('private', read, ME, true)).toEqual({ label: READ_LABEL, state: 'read' });
  });

  it('shows "Sent" in a group, where "Read" is not allowed', () => {
    // SRS-211.9 keeps the read status out of groups because "has it been read" has no single answer there.
    // "Was it sent" has exactly one answer everywhere, so SRS-211.4 is not limited the same way.
    expect(messageStatus('group', saved('43', ME), ME, true)).toEqual({ label: SENT_LABEL, state: 'sent' });
    expect(messageStatus('group', saved('43', ME, { read: true }), ME, true)).toEqual({ label: SENT_LABEL, state: 'sent' });
  });

  it('gives way to the send status, which is not limited to the latest message', () => {
    const first = failed(1);
    const second = failed(2);
    const conversation = [saved('43', ME, { read: true }), first, second];
    const latest = latestOwnMessageId(conversation, ME);
    expect(conversation.map((m) => messageStatus('private', m, ME, m.id === latest)?.label ?? null))
      .toEqual([READ_LABEL, NOT_SENT_LABEL, NOT_SENT_LABEL]);
  });

  it('shows nothing on a received message, even the latest one in the conversation', () => {
    expect(messageStatus('private', saved('44', THEM), ME, true)).toBeNull();
  });
});
