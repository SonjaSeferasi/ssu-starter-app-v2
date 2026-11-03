import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  PHOTO_DISPLAY_MAX_EDGE, PHOTO_MIME_TYPES, PHOTO_SEND_FAILED,
  displaySize, photoExtension, photoStorageKey,
} from '../lib/chat-photo';

describe('SRS-201.6 send a supported photo', () => {
  it('stores each accepted format under a readable extension', () => {
    expect(photoExtension('image/png')).toBe('png');
    expect(photoExtension('image/jpeg')).toBe('jpg');
    expect(photoExtension('image/webp')).toBe('webp');
    // Case and whitespace are handled the same way the format check handles them.
    expect(photoExtension(' IMAGE/PNG ')).toBe('png');
  });

  it('gives every accepted format an extension of its own', () => {
    // Two formats sharing an extension would make a stored object's name a lie about what is in it.
    const extensions = PHOTO_MIME_TYPES.map(photoExtension);
    expect(new Set(extensions).size).toBe(PHOTO_MIME_TYPES.length);
    expect(extensions).not.toContain('bin');
  });

  it('names a key that records who sent the photo and where', () => {
    const key = photoStorageKey('auth-1', '42', 'abc', 'image/jpeg');
    expect(key).toBe('chat_photo/auth-1/42/abc.jpg');
  });

  it('puts the display copy beside its original under the same name', () => {
    // SRS-201.6 (#1026): the pair has to be recognisable, because one is removed with the other when a send
    // is refused after the upload.
    expect(photoStorageKey('auth-1', '42', 'abc', 'image/jpeg', 'display')).toBe('chat_photo/auth-1/42/abc-display.jpg');
  });

  it('never gives two sends the same key', () => {
    // media_assets.storage_key is UNIQUE, so a repeated key would refuse a legitimate send. The random part
    // is what keeps them apart, including for the same student in the same conversation.
    const a = photoStorageKey('auth-1', '42', 'one', 'image/png');
    const b = photoStorageKey('auth-1', '42', 'two', 'image/png');
    expect(a).not.toBe(b);
  });

  it('starts the key with the upload context the database records', () => {
    // require_media insists a chat photo's asset was uploaded for 'chat_photo'. Naming the key the same way
    // means a stored object can be traced to the workflow that accepted it.
    expect(photoStorageKey('auth-1', '42', 'abc', 'image/webp').startsWith('chat_photo/')).toBe(true);
    const schema = readFileSync(process.cwd() + '/supabase/migrations/20260929164656_create_socialu.sql', 'utf8');
    expect(schema).toContain("PERFORM require_media(NEW.asset_id,NEW.sender_id,'chat_photo')");
  });
});

describe('SRS-201.6 the smaller copy stored for display', () => {
  it('leaves a photo that is already small enough alone', () => {
    // Null means "no second object", not "a copy the same size".
    expect(displaySize(800, 600)).toBe(null);
    expect(displaySize(PHOTO_DISPLAY_MAX_EDGE, 400)).toBe(null);
    expect(displaySize(400, PHOTO_DISPLAY_MAX_EDGE)).toBe(null);
  });

  it('shrinks a larger photo to the display edge, keeping its shape', () => {
    expect(displaySize(4000, 3000)).toEqual({ width: 1280, height: 960 });
    expect(displaySize(3000, 4000)).toEqual({ width: 960, height: 1280 });
    expect(displaySize(PHOTO_DISPLAY_MAX_EDGE + 1, PHOTO_DISPLAY_MAX_EDGE + 1)).toEqual({ width: 1280, height: 1280 });
  });

  it('keeps the aspect ratio of an extreme photo without losing an edge', () => {
    // A panorama scaled by the long edge would round its short edge to zero, which is not an image.
    const panorama = displaySize(12000, 3);
    expect(panorama).not.toBe(null);
    expect(panorama!.width).toBe(PHOTO_DISPLAY_MAX_EDGE);
    expect(panorama!.height).toBeGreaterThanOrEqual(1);
  });

  it('refuses to describe a size that is not a size', () => {
    expect(displaySize(0, 100)).toBe(null);
    expect(displaySize(100, 0)).toBe(null);
    expect(displaySize(Number.NaN, 100)).toBe(null);
    expect(displaySize(-4000, 3000)).toBe(null);
  });

  it('never enlarges a photo', () => {
    for (const [w, h] of [[4000, 3000], [1281, 20], [9000, 9000]] as const) {
      const target = displaySize(w, h)!;
      expect(target.width).toBeLessThanOrEqual(w);
      expect(target.height).toBeLessThanOrEqual(h);
      expect(Math.max(target.width, target.height)).toBe(PHOTO_DISPLAY_MAX_EDGE);
    }
  });
});

describe('SRS-201.6 what a failed send says', () => {
  it('does not blame the photo when the photo is fine', () => {
    // The format and size messages name something to fix. This one must not, because nothing about the file
    // is wrong -- saying "photos must be PNG, JPEG or WebP" after a storage failure would send the student
    // off to convert a file that was already acceptable.
    expect(PHOTO_SEND_FAILED).not.toMatch(/PNG|JPEG|WebP|MB|empty/i);
    expect(PHOTO_SEND_FAILED).toMatch(/try again/i);
  });
});
