import { describe, expect, it } from 'vitest';
import { REPLY_PREVIEW_LIMIT, findReplyTarget, replyPreview } from '../lib/chat-reply';

const message = (id: string, text = 'Hello') => ({ id, text });

describe('SRS-209.2 compose a reply', () => {
  it('finds the chosen message so the composer can name it', () => {
    const shown = [message('11', 'first'), message('12', 'second'), message('13', 'third')];
    expect(findReplyTarget(shown, '12')?.text).toBe('second');
    expect(findReplyTarget(shown, null)).toBe(null);
    // A choice that names nothing on screen shows no bar at all, rather than an empty one.
    expect(findReplyTarget(shown, '99')).toBe(null);
    expect(findReplyTarget([], '12')).toBe(null);
  });

  it('shows a short message in full', () => {
    expect(replyPreview('See you at six')).toBe('See you at six');
  });

  it('keeps a multi-line message on one line, so the bar cannot grow', () => {
    expect(replyPreview('first line\nsecond line')).toBe('first line second line');
    expect(replyPreview('  padded \t out  ')).toBe('padded out');
  });

  it('cuts a long message to the limit and marks it as cut', () => {
    const long = 'a'.repeat(200);
    const preview = replyPreview(long);
    expect(preview).toHaveLength(REPLY_PREVIEW_LIMIT);
    expect(preview.endsWith('…')).toBe(true);
    // A message exactly at the limit is shown whole, not cut.
    const exact = 'b'.repeat(REPLY_PREVIEW_LIMIT);
    expect(replyPreview(exact)).toBe(exact);
    expect(replyPreview('c'.repeat(REPLY_PREVIEW_LIMIT + 1)).endsWith('…')).toBe(true);
  });

  it('handles a message with no text without throwing', () => {
    expect(replyPreview(null)).toBe('');
    expect(replyPreview(undefined)).toBe('');
    expect(replyPreview('')).toBe('');
  });
});
