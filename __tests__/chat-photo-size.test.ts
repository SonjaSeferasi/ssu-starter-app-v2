import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  PHOTO_EMPTY, PHOTO_FORMAT_REJECTED, PHOTO_MAX_BYTES, PHOTO_TOO_LARGE,
  formatPhotoSize, photoError, photoSizeError,
} from '../lib/chat-photo';

const png = (size: number) => ({ type: 'image/png', size });

describe('SRS-201.5 enforce the photo size limit', () => {
  it('allows a photo under the limit', () => {
    expect(photoSizeError(png(1))).toBe(null);
    expect(photoSizeError(png(14_999_999))).toBe(null);
  });

  it('allows a photo of exactly the limit, because the database does', () => {
    // validate_media refuses on `byte_count > lim`, so 15,000,000 bytes is acceptable there.
    // Refusing it here would turn away a photo the database would have stored.
    expect(photoSizeError(png(PHOTO_MAX_BYTES))).toBe(null);
  });

  it('refuses a photo one byte over the limit', () => {
    expect(photoSizeError(png(PHOTO_MAX_BYTES + 1))).toBe(PHOTO_TOO_LARGE);
    expect(photoSizeError(png(90_000_000))).toBe(PHOTO_TOO_LARGE);
  });

  it('refuses an empty file, which the database could never store', () => {
    // media_assets has CHECK (byte_count > 0).
    expect(photoSizeError(png(0))).toBe(PHOTO_EMPTY);
    expect(photoSizeError(png(Number.NaN))).toBe(PHOTO_EMPTY);
  });

  it('treats nothing chosen as no error', () => {
    expect(photoSizeError(null)).toBe(null);
    expect(photoSizeError(undefined)).toBe(null);
  });

  it('names the format first when a photo fails both rules', () => {
    // A 90 MB HEIC is both unsupported and oversized. The format is the more useful thing to be told,
    // because converting it is what the student has to do either way.
    expect(photoError({ type: 'image/heic', size: 90_000_000 })).toBe(PHOTO_FORMAT_REJECTED);
    // And when only the size is wrong, the size is named.
    expect(photoError({ type: 'image/png', size: 90_000_000 })).toBe(PHOTO_TOO_LARGE);
    expect(photoError({ type: 'image/png', size: 1_200_000 })).toBe(null);
  });

  it('states the same limit the message claims', () => {
    // The wording says 15 MB; the number must agree, counted the way formatPhotoSize counts.
    expect(formatPhotoSize(PHOTO_MAX_BYTES)).toBe('15 MB');
    expect(PHOTO_TOO_LARGE).toContain('15 MB');
  });

  it('matches the max_bytes seeded for chat_photo in the database', () => {
    const schema = readFileSync(process.cwd() + '/supabase/migrations/20260929164656_create_socialu.sql', 'utf8');
    const seeded = [...schema.matchAll(/\('chat_photo','[^']+',(\d+)\)/g)].map((m) => Number(m[1]));
    expect(seeded.length).toBeGreaterThan(0);
    expect(new Set(seeded)).toEqual(new Set([PHOTO_MAX_BYTES]));
  });

  it('refuses on the same comparison the database uses', () => {
    // The trigger reads: IF lim IS NULL OR NEW.byte_count > lim THEN RAISE ...
    // Anything this function allows must therefore satisfy size <= lim.
    const schema = readFileSync(process.cwd() + '/supabase/migrations/20260929164656_create_socialu.sql', 'utf8');
    expect(schema).toContain('NEW.byte_count > lim');
    for (const size of [1, PHOTO_MAX_BYTES - 1, PHOTO_MAX_BYTES]) {
      expect(photoSizeError(png(size)), String(size)).toBe(null);
      expect(size > PHOTO_MAX_BYTES).toBe(false);
    }
  });
});
