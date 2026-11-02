import { describe, expect, it } from 'vitest';
import { canSelectForReply, describeReplyTarget, keepReplyTarget, toggleReplyTarget } from '../lib/chat-reply';

const message = (id: string, text = 'Hello') => ({ id, text });

describe('SRS-209.1 select a message for reply', () => {
  it('allows a group message to be chosen, and refuses anything outside a group', () => {
    expect(canSelectForReply('group', message('12'))).toBe(true);
    // A private conversation is a fixed pair; UR-209 asks for replies in groups.
    expect(canSelectForReply('private', message('12'))).toBe(false);
    // Before the conversation loads its kind is unknown, so nothing is selectable yet.
    expect(canSelectForReply(null, message('12'))).toBe(false);
    expect(canSelectForReply(undefined, message('12'))).toBe(false);
    expect(canSelectForReply('group', null)).toBe(false);
  });

  it('chooses a message, moves the choice to another, and clears it when the same one is chosen again', () => {
    // Nothing chosen yet.
    expect(toggleReplyTarget(null, '12')).toBe('12');
    // A different message moves the choice rather than adding a second one.
    expect(toggleReplyTarget('12', '13')).toBe('13');
    // The same message again abandons the choice.
    expect(toggleReplyTarget('12', '12')).toBe(null);
  });

  it('keeps the choice only while that message is still in the conversation', () => {
    const shown = [message('11'), message('12'), message('13')];
    expect(keepReplyTarget('12', shown)).toBe('12');
    // The chosen message is no longer in the list the page is showing, so the choice is dropped.
    expect(keepReplyTarget('99', shown)).toBe(null);
    expect(keepReplyTarget(null, shown)).toBe(null);
    expect(keepReplyTarget('12', [])).toBe(null);
  });

  it('names the chosen message so the choice is announced, not only outlined', () => {
    expect(describeReplyTarget('Sam', message('12', 'See you at six'))).toBe('Replying to Sam: See you at six');
    expect(describeReplyTarget('Sam', null)).toBe('');
  });
});
