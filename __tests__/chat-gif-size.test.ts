import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  GIF_EMPTY, GIF_FORMAT_REJECTED, GIF_MAX_BYTES, GIF_TOO_LARGE, gifError, gifSizeError,
} from '../lib/chat-gif';

const gif = (size: number, type = 'image/gif') => ({ name: 'party.gif', size, type });

describe('SRS-201.13 enforce the uploaded GIF size limit', () => {
  it('allows a GIF of exactly the limit', () => {
    // validate_media refuses on `byte_count > lim`, so 15,000,000 bytes is allowed. Refusing it here
    // would turn away a GIF the database would have taken.
    expect(gifSizeError(gif(GIF_MAX_BYTES))).toBe(null);
    expect(GIF_MAX_BYTES).toBe(15_000_000);
  });

  it('allows a GIF one byte under the limit', () => {
    expect(gifSizeError(gif(GIF_MAX_BYTES - 1))).toBe(null);
  });

  it('refuses a GIF one byte over the limit', () => {
    expect(gifSizeError(gif(GIF_MAX_BYTES + 1))).toBe(GIF_TOO_LARGE);
  });

  it('names the limit the student is held to', () => {
    // 15 MB counted as 15,000,000 bytes, the same MB formatGifSize shows.
    expect(GIF_TOO_LARGE).toContain('15 MB');
  });

  it('refuses an empty file with its own message, not the size one', () => {
    expect(gifSizeError(gif(0))).toBe(GIF_EMPTY);
    // media_assets has CHECK (byte_count > 0), so nothing of zero bytes could ever be stored.
    expect(GIF_EMPTY).not.toBe(GIF_TOO_LARGE);
  });

  it('refuses a size that is not a real number', () => {
    expect(gifSizeError(gif(-1))).toBe(GIF_EMPTY);
    expect(gifSizeError(gif(Number.NaN))).toBe(GIF_EMPTY);
    expect(gifSizeError(gif(Number.POSITIVE_INFINITY))).toBe(GIF_EMPTY);
  });

  it('judges nothing when nothing was chosen', () => {
    expect(gifSizeError(null)).toBe(null);
    expect(gifSizeError(undefined)).toBe(null);
  });
});

describe('SRS-201.13 format is judged before size', () => {
  it('names the format when a file fails both', () => {
    // What to fix is the file, not its size: a 40 MB PNG is never going to be sendable as a GIF.
    expect(gifError({ type: 'image/png', size: 40_000_000 })).toBe(GIF_FORMAT_REJECTED);
  });

  it('names the size when only the size is wrong', () => {
    expect(gifError(gif(GIF_MAX_BYTES + 1))).toBe(GIF_TOO_LARGE);
  });

  it('lets a GIF within the limit through', () => {
    expect(gifError(gif(2_400_000))).toBe(null);
  });
});

describe('SRS-201.13 the limit matches the database', () => {
  // The page refuses early, the route refuses what arrived, and validate_media refuses as the row is
  // written. All three read the same number, so the number is checked against its source.
  it('matches the max_bytes seeded for chat_gif', () => {
    const schema = readFileSync(process.cwd() + '/supabase/migrations/20260929164656_create_socialu.sql', 'utf8');
    const seeded = [...schema.matchAll(/\('chat_gif','[^']+',(\d+)\)/g)].map((m) => Number(m[1]));
    expect(seeded.length, 'no chat_gif upload policy seeded').toBeGreaterThan(0);
    for (const max of seeded) expect(max).toBe(GIF_MAX_BYTES);
  });

  it('is the same ceiling the photo path uses, and says so in its own words', async () => {
    const { PHOTO_MAX_BYTES, PHOTO_TOO_LARGE } = await import('../lib/chat-photo');
    expect(GIF_MAX_BYTES).toBe(PHOTO_MAX_BYTES);
    // Same number, different sentence: a student who picked a GIF should not be told about photos.
    expect(GIF_TOO_LARGE).not.toBe(PHOTO_TOO_LARGE);
  });
});
