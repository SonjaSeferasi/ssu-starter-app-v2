import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PHOTO_ACCEPT, PHOTO_FORMAT_REJECTED, PHOTO_MIME_TYPES, isSupportedPhotoType, photoFormatError } from '../lib/chat-photo';

describe('SRS-201.4 restrict supported photo formats', () => {
  it('accepts PNG, JPEG and WebP', () => {
    expect(isSupportedPhotoType('image/png')).toBe(true);
    expect(isSupportedPhotoType('image/jpeg')).toBe(true);
    expect(isSupportedPhotoType('image/webp')).toBe(true);
  });

  it('refuses every other format, including ones that look close', () => {
    for (const type of ['image/gif', 'image/heic', 'image/jpg', 'image/svg+xml', 'image/bmp', 'application/pdf', 'text/plain']) {
      expect(isSupportedPhotoType(type), type).toBe(false);
    }
  });

  it('refuses a file that reports no type at all', () => {
    // Some browsers report an empty type for an unknown extension. Guessing would only move the
    // refusal to the upload route or the database, so it is refused here.
    expect(isSupportedPhotoType('')).toBe(false);
    expect(isSupportedPhotoType(null)).toBe(false);
    expect(isSupportedPhotoType(undefined)).toBe(false);
  });

  it('is not fooled by case or stray whitespace', () => {
    expect(isSupportedPhotoType('IMAGE/PNG')).toBe(true);
    expect(isSupportedPhotoType('  image/jpeg  ')).toBe(true);
  });

  it('explains a refusal and stays silent about an acceptable photo', () => {
    expect(photoFormatError({ type: 'image/heic' })).toBe(PHOTO_FORMAT_REJECTED);
    expect(photoFormatError({ type: 'image/png' })).toBe(null);
    // Nothing chosen is not an error; it is just nothing chosen.
    expect(photoFormatError(null)).toBe(null);
    expect(photoFormatError(undefined)).toBe(null);
  });

  it('offers the same formats to the picker that it accepts', () => {
    expect(PHOTO_ACCEPT.split(',')).toEqual([...PHOTO_MIME_TYPES]);
  });

  // The page, the upload route and socialu.media_assets' validate_media trigger all judge a photo. If this
  // list ever drifts from the seeded chat_photo policy, the page would accept a photo the database then
  // refuses. This reads the migration so the two cannot disagree silently.
  it('matches the chat_photo rows seeded in the database', () => {
    const schema = readFileSync(process.cwd() + '/supabase/migrations/20260929164656_create_socialu.sql', 'utf8');
    const seeded = [...schema.matchAll(/\('chat_photo','([^']+)',(\d+)\)/g)].map((m) => ({ type: m[1], max: Number(m[2]) }));
    expect(seeded.length).toBeGreaterThan(0);
    expect(seeded.map((row) => row.type).sort()).toEqual([...PHOTO_MIME_TYPES].sort());
    // Every accepted format carries the same 15 MB limit, which SRS-201.5 enforces.
    expect(new Set(seeded.map((row) => row.max))).toEqual(new Set([15000000]));
  });
});
