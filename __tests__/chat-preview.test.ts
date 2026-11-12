import { describe, expect, it } from 'vitest';
import { PHOTO_PREVIEW, conversationPreview, notificationPreview, previewBody } from '../lib/chat-preview';

describe('#1217 what a photo looks like in the Messages list', () => {
  it('names the photograph instead of showing nothing', () => {
    // Before this fix the list said "No messages yet" for a conversation whose only message was a photo.
    expect(conversationPreview({ kind: 'photo', text: null, sender_id: '7' }, '8')).toBe('Photo');
  });

  it('marks the student own photo the same way it marks their own text', () => {
    expect(conversationPreview({ kind: 'photo', text: null, sender_id: '7' }, '7')).toBe('You: Photo');
    expect(conversationPreview({ kind: 'text', text: 'hello', sender_id: '7' }, '7')).toBe('You: hello');
  });

  it('leaves text and emoji messages exactly as they were', () => {
    expect(conversationPreview({ kind: 'text', text: 'hello', sender_id: '7' }, '8')).toBe('hello');
    expect(conversationPreview({ kind: 'emoji', text: '\u{1F389}', sender_id: '7' }, '8')).toBe('\u{1F389}');
  });

  it('treats a message with no kind as text, so a page talking to a server without the migration still works', () => {
    // 20261112120000 adds 'kind' to last_message. Until it is applied the field is simply absent.
    expect(conversationPreview({ text: 'hello', sender_id: '7' }, '8')).toBe('hello');
  });

  it('never shows the word null when a photo arrives with no text', () => {
    // The schema forces text_content IS NULL for a photo, so this is the normal case, not an edge one.
    expect(conversationPreview({ kind: 'photo', text: null, sender_id: '7' }, '8')).not.toMatch(/null/);
    expect(previewBody('photo', null)).toBe(PHOTO_PREVIEW);
  });
});

describe('#1217 what a photo looks like in the notification bell', () => {
  it('names the photograph rather than quoting an empty string', () => {
    expect(notificationPreview('photo', null)).toBe('Photo');
    expect(notificationPreview('photo', null)).not.toMatch(/[“”]/);
  });

  it('does not throw on a photo, which has no text to measure', () => {
    // The previous code read item.text.length directly. With text null that is a TypeError, and it would
    // have taken down the entire notifications list the moment anyone sent a photo.
    expect(() => notificationPreview('photo', null)).not.toThrow();
    expect(() => notificationPreview('text', null)).not.toThrow();
    expect(() => notificationPreview(undefined, undefined)).not.toThrow();
  });

  it('still quotes text and still leaves an emoji unquoted', () => {
    expect(notificationPreview('text', 'hello')).toBe('“hello”');
    expect(notificationPreview('emoji', '\u{1F389}')).toBe('\u{1F389}');
  });

  it('clips a long message and marks that it was clipped', () => {
    const long = 'a'.repeat(200);
    const shown = notificationPreview('text', long);
    expect(shown).toMatch(/…”$/);
    expect(shown.length).toBeLessThan(long.length);
  });

  it('does not clip a photo, whose label is already short', () => {
    expect(notificationPreview('photo', null, 2)).toBe(PHOTO_PREVIEW);
  });
});
