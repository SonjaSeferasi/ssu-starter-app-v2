import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  GIF_ACCEPT, GIF_FORMAT_REJECTED, GIF_MIME_TYPES, chooseGif, describeChosenGif, gifFormatError, isSupportedGifType,
} from '../lib/chat-gif';

const gif = (name: string, size: number, type = 'image/gif') => ({ name, size, type });

describe('SRS-201.12 select a GIF file from a device', () => {
  it('takes the chosen file from the picker', () => {
    const chosen = chooseGif([gif('party.gif', 2_400_000)]);
    expect(chosen?.name).toBe('party.gif');
  });

  it('chooses nothing when the picker is cancelled', () => {
    // An <input type="file"> reports an empty list when the student closes the dialog.
    expect(chooseGif([])).toBe(null);
    expect(chooseGif(null)).toBe(null);
    expect(chooseGif(undefined)).toBe(null);
  });

  it('takes only the first file when a picker returns several', () => {
    const chosen = chooseGif([gif('first.gif', 10), gif('second.gif', 20)]);
    expect(chosen?.name).toBe('first.gif');
  });

  it('accepts a GIF', () => {
    expect(isSupportedGifType('image/gif')).toBe(true);
    expect(gifFormatError(gif('party.gif', 10))).toBe(null);
  });

  it('refuses every other format, including the ones the photo button takes', () => {
    // A student who picks "All files" can hand this anything. PNG, JPEG and WebP belong to the photo
    // button (SRS-201.4); sending one through the GIF button would store it under the wrong upload
    // context and the database would refuse it, so it is refused here instead.
    for (const type of ['image/png', 'image/jpeg', 'image/webp', 'image/apng', 'video/mp4', 'text/plain', '']) {
      expect(gifFormatError(gif('not-a.gif', 10, type)), type).toBe(GIF_FORMAT_REJECTED);
    }
  });

  it('ignores case and stray spacing in the reported type', () => {
    expect(isSupportedGifType(' IMAGE/GIF ')).toBe(true);
    expect(isSupportedGifType(null)).toBe(false);
    expect(isSupportedGifType(undefined)).toBe(false);
  });

  it('offers only GIFs in the picker', () => {
    expect(GIF_ACCEPT).toBe('image/gif');
  });

  it('names the chosen GIF with its size', () => {
    expect(describeChosenGif(gif('party.gif', 2_400_000))).toBe('party.gif, 2.4 MB');
    expect(describeChosenGif(null)).toBe('');
  });

  it('falls back to a plain word when the file has no name', () => {
    expect(describeChosenGif(gif('   ', 1_000))).toBe('GIF, 1 KB');
  });

  // The page, the route and the database each judge a GIF, and they must judge the same thing.
  // chat-photo-formats.test.ts reads the migration for the photo policy; this does it for chat_gif.
  it('matches the chat_gif row seeded in the database', () => {
    const schema = readFileSync(process.cwd() + '/supabase/migrations/20260929164656_create_socialu.sql', 'utf8');
    const seeded = [...schema.matchAll(/\('chat_gif','([^']+)',(\d+)\)/g)].map((m) => ({ type: m[1], max: Number(m[2]) }));
    expect(seeded.length, 'no chat_gif upload policy seeded').toBeGreaterThan(0);
    expect(seeded.map((row) => row.type).sort()).toEqual([...GIF_MIME_TYPES].sort());
    // SRS-201.13 holds the limit itself; this only pins that the database agrees there is one.
    expect(new Set(seeded.map((row) => row.max))).toEqual(new Set([15000000]));
  });

  // A GIF must reach the conversation as the student chose it. Re-encoding it to a smaller still
  // image is what the photo path does (SRS-201.6, #1026), and it would stop the GIF animating.
  it('keeps no display-copy rule of its own', async () => {
    const chatGif = await import('../lib/chat-gif');
    expect(Object.keys(chatGif)).not.toContain('displaySize');
    expect(Object.keys(chatGif)).not.toContain('GIF_DISPLAY_MAX_EDGE');
  });
});
