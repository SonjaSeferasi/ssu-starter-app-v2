// SRS-201.17 (#1370): a failed message has to still be there to be retried from, so the rule that builds
// the message list is tested rather than trusted. It moved out of the page for this; nothing in it changed.

import { describe, expect, it } from 'vitest';
import type { ChatMessageEvent } from '../lib/realtime-client';
import { mergeMessages } from '../lib/chat-messages';
import { localMessageId, markSendFailed, startSending } from '../lib/chat-send-status';

function saved(id: string, sentAt: string, fields: Partial<ChatMessageEvent> = {}): ChatMessageEvent {
  return { id, conversation_id: '1', sender_id: '7', text: `message ${id}`, sent_at: sentAt, ...fields };
}

const failed = markSendFailed(
  [startSending({ localId: localMessageId(1), conversationId: '1', senderId: '7', text: 'Running ten minutes late' })],
  localMessageId(1),
)[0];

describe('keeping an unsent message in place', () => {
  it('survives the history being loaded again', () => {
    // The history reloads for all sorts of reasons -- live updates reconnecting, a photo arriving, a sender
    // whose name is not known yet. None of them has ever heard of this message, and none of them may take it.
    const onScreen = [saved('41', '2026-11-18T20:27:00.000Z'), failed];
    const reloaded = [saved('41', '2026-11-18T20:27:00.000Z'), saved('42', '2026-11-18T20:28:00.000Z')];
    const merged = mergeMessages(onScreen, reloaded);
    expect(merged.map((message) => message.id)).toEqual(['41', '42', failed.id]);
    expect(merged[2]).toMatchObject({ text: 'Running ten minutes late', status: 'failed' });
  });

  it('survives someone else sending a message, and stays at the bottom', () => {
    const merged = mergeMessages([saved('41', '2026-11-18T20:27:00.000Z'), failed], [saved('42', '2026-11-18T20:29:00.000Z')]);
    expect(merged[merged.length - 1].id).toBe(failed.id);
  });

  it('keeps what it was answering, so a retry is still a reply', () => {
    const reply = markSendFailed(
      [startSending({ localId: localMessageId(2), conversationId: '1', senderId: '7', text: 'On my way', replyToId: '41' })],
      localMessageId(2),
    )[0];
    const merged = mergeMessages([reply], [saved('41', '2026-11-18T20:27:00.000Z')]);
    expect(merged.find((message) => message.id === reply.id)).toMatchObject({ reply_to_id: '41' });
  });
});

describe('one copy of each message', () => {
  it('lets an incoming message replace the one on screen', () => {
    const merged = mergeMessages([saved('41', '2026-11-18T20:27:00.000Z')], [saved('41', '2026-11-18T20:27:00.000Z', { text: 'edited by the server' })]);
    expect(merged).toHaveLength(1);
    expect(merged[0].text).toBe('edited by the server');
  });

  it('does not duplicate a message that arrives from both the send and the live event', () => {
    const sent = saved('41', '2026-11-18T20:27:00.000Z');
    expect(mergeMessages(mergeMessages([], [sent]), [sent])).toHaveLength(1);
  });
});

describe('the photo link rule it already had (SRS-201.7)', () => {
  it('keeps a link the student is looking at when the live event carries none', () => {
    const withLink = saved('41', '2026-11-18T20:27:00.000Z', { kind: 'photo', text: '', photo_url: 'https://signed/one' });
    const live = saved('41', '2026-11-18T20:27:00.000Z', { kind: 'photo', text: '' });
    expect(mergeMessages([withLink], [live])[0].photo_url).toBe('https://signed/one');
  });

  it('lets a newer link win', () => {
    const withLink = saved('41', '2026-11-18T20:27:00.000Z', { kind: 'photo', text: '', photo_url: 'https://signed/one' });
    const refreshed = saved('41', '2026-11-18T20:27:00.000Z', { kind: 'photo', text: '', photo_url: 'https://signed/two' });
    expect(mergeMessages([withLink], [refreshed])[0].photo_url).toBe('https://signed/two');
  });
});
