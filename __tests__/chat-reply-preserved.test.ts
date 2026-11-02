import { describe, expect, it } from 'vitest';
import { replyIndication, replyQuote, type ReplyTargets } from '../lib/chat-reply';

const quote = { id: '10', sender: 'Sam', text: 'Who is bringing the projector?' };

describe('SRS-209.6 preserve the reply relationship', () => {
  it('shows the quote while the target is still available', () => {
    expect(replyIndication({ reply_to_id: '10' }, quote)).toBe('quote');
  });

  it('says the original is unavailable when the target cannot be shown', () => {
    // The relationship is still recorded on the row; only the view of it is missing.
    expect(replyIndication({ reply_to_id: '10' }, null)).toBe('unavailable');
  });

  it('shows nothing at all for a message that was never a reply', () => {
    expect(replyIndication({}, null)).toBe('none');
    expect(replyIndication({ reply_to_id: null }, null)).toBe('none');
  });

  it('keeps saying unavailable rather than silently dropping the reply', () => {
    // A reply to a message outside the loaded window and not described by history: the page must not render
    // it as though it had never been a reply, because that would misrepresent the conversation.
    const shown = [{ id: '11', sender_id: '2', text: 'I can bring it' }];
    const resolved = replyQuote({ id: '11', reply_to_id: '999' }, {} as ReplyTargets, shown, {}, '2');
    expect(resolved).toBe(null);
    expect(replyIndication({ reply_to_id: '999' }, resolved)).toBe('unavailable');
  });

  it('recovers the quote as soon as the target becomes available again', () => {
    // Scrolling back, or a reload that now includes the target, restores the quote: nothing about the stored
    // relationship had to change for this to work.
    const message = { id: '11', reply_to_id: '10' };
    expect(replyIndication(message, replyQuote(message, {}, [], {}, '2'))).toBe('unavailable');
    const targets: ReplyTargets = { '11': { id: '10', sender_id: '1', sender_name: 'Sam', text: 'Who is bringing the projector?' } };
    expect(replyIndication(message, replyQuote(message, targets, [], {}, '2'))).toBe('quote');
  });
});
