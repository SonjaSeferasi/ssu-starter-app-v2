import { describe, expect, it } from 'vitest';
import sharp, { type Create } from 'sharp';
import { SnipePhotoError, validateSnipePhoto } from '../lib/snipe-image';

// SRS-510.2 / 510.3 with the approved B-06 policy: real decoding, not the browser's MIME label.
// Fixtures are typed as sharp's Create, so `channels: 3` and the noise type keep their literal types.
const solidCreate = (width: number, height: number): Create => ({ width, height, channels: 3, background: '#39775e' });
const noisyCreate: Create = { width: 320, height: 240, channels: 3, background: '#000000', noise: { type: 'gaussian', mean: 128, sigma: 40 } };
const solid = (width: number, height: number) => sharp({ create: solidCreate(width, height) });
const noisy = () => sharp({ create: noisyCreate });

function crc32(bytes: Buffer) {
  let crc = ~0;
  for (const byte of bytes) { crc ^= byte; for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  return (~crc) >>> 0;
}
function chunk(type: string, data: Buffer) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
// A tiny file whose header claims 100,000 x 100,000 pixels: a decompression-bomb shape.
function pngHeaderClaiming(width: number, height: number) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IEND', Buffer.alloc(0))]);
}
const rejects = async (bytes: Uint8Array, type: string, message: RegExp) => {
  const error = await validateSnipePhoto(bytes, type).catch((e) => e);
  expect(error).toBeInstanceOf(SnipePhotoError);
  expect(error.message).toMatch(message);
};

describe('Snipe photo validation', () => {
  it('accepts a real JPEG and PNG and reports the decoded type, not the label', async () => {
    const jpeg = await validateSnipePhoto(await solid(64, 48).jpeg().toBuffer(), 'image/jpeg');
    expect(jpeg).toMatchObject({ mimeType: 'image/jpeg', extension: 'jpg', width: 64, height: 48 });
    expect((await sharp(jpeg.bytes).metadata()).format).toBe('jpeg');
    const png = await validateSnipePhoto(await solid(64, 48).png().toBuffer(), '');
    expect(png).toMatchObject({ mimeType: 'image/png', extension: 'png', width: 64, height: 48 });
  });

  it('reports a stable digest of the submitted photo, different for a different photo', async () => {
    const bytes = await solid(64, 48).jpeg().toBuffer();
    const first = await validateSnipePhoto(bytes, 'image/jpeg');
    expect(first.digest).toMatch(/^[0-9a-f]{64}$/);
    expect((await validateSnipePhoto(Buffer.from(bytes), 'image/jpeg')).digest).toBe(first.digest);
    expect((await validateSnipePhoto(await solid(48, 64).jpeg().toBuffer(), 'image/jpeg')).digest).not.toBe(first.digest);
  });

  it('applies EXIF orientation and drops embedded metadata such as location before storage', async () => {
    const rotated = await solid(64, 48).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    expect((await sharp(rotated).metadata()).orientation).toBe(6);
    const upright = await validateSnipePhoto(rotated, 'image/jpeg');
    expect([upright.width, upright.height]).toEqual([48, 64]);
    expect((await sharp(upright.bytes).metadata()).orientation).toBeUndefined();

    const tagged = await solid(64, 48).withExif({ IFD0: { Copyright: 'SocialU test owner' } }).jpeg().toBuffer();
    expect((await sharp(tagged).metadata()).exif).toBeDefined();
    const stored = await sharp((await validateSnipePhoto(tagged, 'image/jpeg')).bytes).metadata();
    expect(stored.exif).toBeUndefined();
  });

  it('accepts exactly 4096 pixels on each axis and rejects 4097', async () => {
    await expect(validateSnipePhoto(await solid(4096, 1).png().toBuffer(), 'image/png')).resolves.toMatchObject({ width: 4096 });
    await expect(validateSnipePhoto(await solid(1, 4096).png().toBuffer(), 'image/png')).resolves.toMatchObject({ height: 4096 });
    await rejects(await solid(4097, 1).png().toBuffer(), 'image/png', /4096 × 4096/);
    await rejects(await solid(1, 4097).jpeg().toBuffer(), 'image/jpeg', /4096 × 4096/);
  });

  it('rejects a decompression-bomb header before decoding pixels', async () => {
    await rejects(pngHeaderClaiming(100_000, 100_000), 'image/png', /4096 × 4096|could not be read/);
  });

  it('rejects files over 10,000,000 bytes before decoding', async () => {
    const big = Buffer.alloc(10_000_001); big.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    await rejects(big, 'image/png', /10 MB/);
    await rejects(new Uint8Array(0), 'image/png', /Choose a photo/);
  });

  it('rejects SVG, GIF and WebP even when labelled as JPEG or PNG', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>');
    await rejects(svg, 'image/png', /Only JPEG and PNG/);
    await rejects(svg, 'image/svg+xml', /Only JPEG and PNG/);
    await rejects(await solid(16, 16).gif().toBuffer(), 'image/jpeg', /Only JPEG and PNG/);
    await rejects(await solid(16, 16).webp().toBuffer(), 'image/png', /Only JPEG and PNG/);
  });

  it('rejects disguised files whose contents do not match their label', async () => {
    await rejects(await solid(16, 16).png().toBuffer(), 'image/jpeg', /does not match/);
    await rejects(await solid(16, 16).jpeg().toBuffer(), 'image/png', /does not match/);
  });

  it('rejects corrupt and truncated images that only look valid at the start', async () => {
    await rejects(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from('not really a jpeg at all')]), 'image/jpeg', /could not be read/);
    const full = await noisy().jpeg().toBuffer();
    await rejects(full.subarray(0, Math.floor(full.length / 2)), 'image/jpeg', /could not be read/);
    const png = await noisy().png().toBuffer();
    await rejects(png.subarray(0, Math.floor(png.length / 2)), 'image/png', /could not be read/);
  });
});
