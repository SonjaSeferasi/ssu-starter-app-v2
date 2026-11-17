import { describe, expect, it } from 'vitest';
import { messageDateTimeAttribute, messageTime, messageTimeFull } from '../lib/chat-time';

// Fixed points so the test does not depend on when it runs.
const now = new Date('2026-11-17T15:00:00');
const earlierToday = new Date('2026-11-17T09:15:00').toISOString();
const yesterday = new Date('2026-11-16T18:14:00').toISOString();
const lastYear = new Date('2025-12-02T11:05:00').toISOString();

describe('#1281 (SRS-211.3) what a message shows for its time', () => {
  it('shows the clock time for a message sent today', () => {
    const shown = messageTime(earlierToday, now);
    // Locale decides 09:15 or 9:15 AM, so the assertion is on the parts, not on one formatting.
    expect(shown).toMatch(/\b9[:.]15\b/);
    expect(shown).not.toMatch(/Nov|17/);
  });

  it('adds the date once the message is not from today', () => {
    // A bare "6:14" on a message from another day is worse than no time: it reads as today.
    const shown = messageTime(yesterday, now);
    expect(shown).toMatch(/\b6[:.]14\b|\b18[:.]14\b/);
    expect(shown).toMatch(/16/);
  });

  it('adds the year as well once the message is not from this year', () => {
    const shown = messageTime(lastYear, now);
    expect(shown).toMatch(/2025/);
    expect(messageTime(yesterday, now)).not.toMatch(/2026/);
  });

  it('always gives every message a time, which is the requirement', () => {
    for (const value of [earlierToday, yesterday, lastYear]) {
      expect(messageTime(value, now)).not.toBe('');
    }
  });

  it('shows nothing rather than "Invalid Date" when there is no usable time', () => {
    // socialu_conversation_messages always returns sent_at, but a live event merged into the list is built
    // in the browser, and a missing or malformed value must not put "Invalid Date" beside a message.
    for (const value of ['', 'not a date', null, undefined]) {
      expect(messageTime(value as string, now)).toBe('');
      expect(messageTimeFull(value as string)).toBe('');
      expect(messageDateTimeAttribute(value as string)).toBe('');
    }
  });
});

describe('#1281 the full time behind it', () => {
  it('spells out the day and date, so "when exactly" does not have to be worked out', () => {
    const full = messageTimeFull(yesterday);
    expect(full).toMatch(/Monday/);
    expect(full).toMatch(/November/);
    expect(full).toMatch(/2026/);
  });

  it('gives a machine-readable value for the time element', () => {
    expect(messageDateTimeAttribute(yesterday)).toBe(new Date(yesterday).toISOString());
    // It is a real ISO instant, not whatever string happened to arrive.
    expect(messageDateTimeAttribute('2026-11-16T18:14:00Z')).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
  });
});
