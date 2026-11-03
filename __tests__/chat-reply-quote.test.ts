import { describe, expect, it } from 'vitest';
import { replyQuote, type ReplyTargets } from '../lib/chat-reply';

const shown = [
  { id: '10', sender_id: '1', text: 'Who is bringing the projector?' },
  { id: '11', sender_id: '2', text: 'I can bring it', reply_to_id: '10' },
  { id: '12', sender_id: '3', text: 'Thanks' },
  { id: '13', sender_id: '1', text: '😀', kind: 'emoji' },
];
const senders = { '1': { name: 'Sam' }, '2': { name: 'Kim' }, '3': { name: 'Lee' } };
const fromHistory: ReplyTargets = {
  '11': { id: '10', sender_id: '1', sender_name: 'Sam', text: 'Who is bringing the projector?' },
};

describe('SRS-209.5 identify the replied-to message', () => {
  it('quotes the target the history reported', () => {
    expect(replyQuote(shown[1], fromHistory, shown, senders, '2')).toEqual({
      id: '10', sender: 'Sam', text: 'Who is bringing the projector?', kind: undefined,
    });
  });

  it('shows nothing for a message that is not a reply', () => {
    expect(replyQuote(shown[0], fromHistory, shown, senders, '2')).toBe(null);
    expect(replyQuote(shown[2], fromHistory, shown, senders, '2')).toBe(null);
  });

  it('falls back to a message on screen for a live reply the history has not described', () => {
    // A reply that arrives over realtime carries only reply_to_id.
    const live = { id: '14', reply_to_id: '12' };
    expect(replyQuote(live, {}, shown, senders, '1')).toEqual({
      id: '12', sender: 'Lee', text: 'Thanks', kind: undefined,
    });
  });

  it('shows nothing when the target is neither described nor on screen', () => {
    // SRS-209.6: a target out of this student's reach leaves the reply unquoted rather than inventing one.
    expect(replyQuote({ id: '14', reply_to_id: '999' }, {}, shown, senders, '1')).toBe(null);
  });

  it("names the student's own message as You rather than by name", () => {
    // The viewer is student 1, who sent the target.
    expect(replyQuote(shown[1], fromHistory, shown, senders, '1')?.sender).toBe('You');
    // And by name when it is somebody else's.
    expect(replyQuote(shown[1], fromHistory, shown, senders, '2')?.sender).toBe('Sam');
  });

  it('keeps an emoji target marked so it can be shown as an emoji', () => {
    const live = { id: '15', reply_to_id: '13' };
    expect(replyQuote(live, {}, shown, senders, '2')).toEqual({ id: '13', sender: 'Sam', text: '😀', kind: 'emoji' });
  });

  it('falls back to the name the history gave when the sender is not in the senders map', () => {
    // The target may be older than the fifty messages loaded, so its sender need not appear in senders.
    const targets: ReplyTargets = { '11': { id: '10', sender_id: '99', sender_name: 'Former member', text: 'Older message' } };
    expect(replyQuote(shown[1], targets, shown, {}, '2')?.sender).toBe('Former member');
  });
});
