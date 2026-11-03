import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { PHOTO_DISPLAY_MAX_EDGE } from '../lib/chat-photo';
import { PhotoBytesError, displayCopy, readPhoto } from '../lib/chat-photo-image';

// SRS-201.6 (#1023, #1026): what the server does with the bytes that actually arrive.
// The photos here are made rather than committed as fixtures, so the test reads the same decoder the route
// does instead of trusting a file somebody checked in.
// Detail that does not compress away, so a resized copy is genuinely smaller than its original the way a real
// photograph's is. A plain fill or a repeating pattern would not be: PNG stores a periodic image so well that
// the smoother, smaller copy comes out LARGER, and the test would then be measuring the pattern, not the code.
// Seeded, so the same bytes are produced on every run.
function detail(width: number, height: number) {
  const pixels = Buffer.alloc(width * height * 3);
  let seed = 0x9e3779b9;
  for (let i = 0; i < pixels.length; i++) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    pixels[i] = (seed >>> 16) & 0xff;
  }
  return pixels;
}

const made = (width: number, height: number, format: 'png' | 'jpeg' | 'webp') =>
  sharp(detail(width, height), { raw: { width, height, channels: 3 } }).toFormat(format).toBuffer();

describe('SRS-201.6 reading the photo that arrived', () => {
  it('accepts each supported format and reports its size', async () => {
    expect(await readPhoto(await made(60, 40, 'png'), 'image/png')).toEqual({ width: 60, height: 40 });
    expect(await readPhoto(await made(60, 40, 'jpeg'), 'image/jpeg')).toEqual({ width: 60, height: 40 });
    expect(await readPhoto(await made(60, 40, 'webp'), 'image/webp')).toEqual({ width: 60, height: 40 });
  });

  it('refuses a file whose bytes are not the format it claims', async () => {
    // This is the case the page cannot catch: a .heic renamed to .png is reported as image/png by the
    // browser, passes SRS-201.4 there, and is only found out by decoding it.
    const jpeg = await made(40, 40, 'jpeg');
    await expect(readPhoto(jpeg, 'image/png')).rejects.toBeInstanceOf(PhotoBytesError);
  });

  it('refuses bytes that are not an image at all', async () => {
    await expect(readPhoto(Buffer.from('not a photo'), 'image/png')).rejects.toBeInstanceOf(PhotoBytesError);
    await expect(readPhoto(Buffer.alloc(0), 'image/jpeg')).rejects.toBeInstanceOf(PhotoBytesError);
  });

  it('refuses a format the conversation does not accept, whatever the bytes are', async () => {
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } }).gif().toBuffer();
    await expect(readPhoto(gif, 'image/gif')).rejects.toBeInstanceOf(PhotoBytesError);
  });
});

describe('SRS-201.6 the smaller copy stored for display', () => {
  it('makes a smaller copy of a large photo in the same format', async () => {
    const original = await made(2400, 1800, 'jpeg');
    const copy = await displayCopy(original, 'image/jpeg', { width: 2400, height: 1800 });
    expect(copy).not.toBe(null);
    expect(copy!.type).toBe('image/jpeg');
    expect(copy!.bytes.byteLength).toBeLessThan(original.byteLength);
    const meta = await sharp(copy!.bytes).metadata();
    expect(meta.format).toBe('jpeg');
    expect(Math.max(meta.width!, meta.height!)).toBe(PHOTO_DISPLAY_MAX_EDGE);
    expect(meta.height).toBe(960);
  });

  it('keeps a PNG a PNG', async () => {
    // Converting to a smaller format would hand back something the student did not send -- a PNG's
    // transparency, for one, does not survive a trip through JPEG.
    const original = await made(1600, 1600, 'png');
    const copy = await displayCopy(original, 'image/png', { width: 1600, height: 1600 });
    expect(copy!.type).toBe('image/png');
    expect((await sharp(copy!.bytes).metadata()).format).toBe('png');
  });

  it('makes no copy of a photo that is already small enough', async () => {
    const original = await made(800, 600, 'png');
    expect(await displayCopy(original, 'image/png', { width: 800, height: 600 })).toBe(null);
  });

  it('makes no copy when re-encoding would not save anything', async () => {
    // A photo just over the edge can re-encode to the same size or larger. Storing that second object would
    // cost a write and save nothing, so null means "show the original".
    const original = await made(1281, 1, 'png');
    const copy = await displayCopy(original, 'image/png', { width: 1281, height: 1 });
    if (copy) expect(copy.bytes.byteLength).toBeLessThan(original.byteLength);
  });

  it('leaves no EXIF on the copy, so no camera or location data reaches the conversation', async () => {
    const original = await sharp({ create: { width: 2000, height: 1500, channels: 3, background: '#2b6e5a' } })
      .withExif({ IFD0: { Copyright: 'Loens', Software: 'Camera' } }).jpeg().toBuffer();
    expect((await sharp(original).metadata()).exif).toBeTruthy();
    const copy = await displayCopy(original, 'image/jpeg', { width: 2000, height: 1500 });
    expect(copy).not.toBe(null);
    expect((await sharp(copy!.bytes).metadata()).exif).toBeFalsy();
  });

  it('refuses to copy a format the conversation does not accept', async () => {
    const gif = await sharp({ create: { width: 2000, height: 1500, channels: 3, background: '#fff' } }).gif().toBuffer();
    expect(await displayCopy(gif, 'image/gif', { width: 2000, height: 1500 })).toBe(null);
  });

  it('reports no copy rather than throwing when the bytes cannot be re-encoded', async () => {
    // A copy is a convenience; failing to make one must never stop the photo being sent.
    expect(await displayCopy(Buffer.from('not a photo'), 'image/png', { width: 4000, height: 3000 })).toBe(null);
  });
});
