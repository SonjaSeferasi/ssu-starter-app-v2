import { createHash } from 'node:crypto';
import sharp, { type Metadata, type OutputInfo, type SharpOptions } from 'sharp';
import { SNIPE_PHOTO_POLICY, type SnipeMimeType } from './snipe-policy';

// Server-only. SRS-510.2 / 510.3: a Snipe photo must really decode as one JPEG or PNG within the
// approved byte and pixel limits. The browser's MIME label is only compared, never trusted.
export class SnipePhotoError extends Error {}

export type ValidatedSnipePhoto = {
  bytes: Buffer;
  mimeType: SnipeMimeType;
  extension: 'jpg' | 'png';
  width: number;
  height: number;
  // SHA-256 (hex) of the submitted file, computed only after it validated. Stable across retries of the
  // same photo regardless of re-encoding, so a reused submission key cannot carry a different photo.
  digest: string;
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const UNSUPPORTED = 'Only JPEG and PNG photos are supported.';
const UNREADABLE = 'This photo could not be read. Choose a different JPEG or PNG photo.';
const TOO_LARGE = 'Photos can be at most 10 MB.';
const TOO_WIDE = `Photos can be at most ${SNIPE_PHOTO_POLICY.maxWidth} × ${SNIPE_PHOTO_POLICY.maxHeight} pixels.`;

// Signature check first, so SVG, GIF, WebP, HEIC and other decoders never see the bytes.
function sniff(bytes: Uint8Array): 'jpeg' | 'png' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes.length >= 8 && PNG_SIGNATURE.every((value, index) => bytes[index] === value)) return 'png';
  return null;
}

export async function validateSnipePhoto(input: Uint8Array, declaredType: string): Promise<ValidatedSnipePhoto> {
  if (input.byteLength === 0) throw new SnipePhotoError('Choose a photo to submit.');
  if (input.byteLength > SNIPE_PHOTO_POLICY.maxBytes) throw new SnipePhotoError(TOO_LARGE);
  const format = sniff(input);
  if (!format) throw new SnipePhotoError(UNSUPPORTED);
  const mimeType: SnipeMimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  // A PNG labelled as JPEG (or the reverse) is a disguised file, not a typo to fix silently.
  if (declaredType && declaredType !== mimeType) throw new SnipePhotoError('The file type does not match its contents. Choose a real JPEG or PNG photo.');

  // Decompression bombs: header dimensions are checked before any pixel is decoded, and the
  // decoder itself refuses more input pixels than the policy allows. 'warning' is sharp's
  // recommended strictness for untrusted input, so truncated or corrupt data is rejected.
  const options: SharpOptions = { failOn: 'warning', limitInputPixels: SNIPE_PHOTO_POLICY.maxWidth * SNIPE_PHOTO_POLICY.maxHeight };
  let metadata: Metadata;
  try { metadata = await sharp(input, options).metadata(); } catch { throw new SnipePhotoError(UNREADABLE); }
  if (metadata.format !== format) throw new SnipePhotoError(UNSUPPORTED);
  if (!metadata.width || !metadata.height) throw new SnipePhotoError(UNREADABLE);
  if (metadata.width > SNIPE_PHOTO_POLICY.maxWidth || metadata.height > SNIPE_PHOTO_POLICY.maxHeight) throw new SnipePhotoError(TOO_WIDE);
  if ((metadata.pages ?? 1) > 1) throw new SnipePhotoError(UNSUPPORTED);

  // Fully decode and re-encode in the same format. This proves the whole image is readable, applies
  // the EXIF orientation, and drops embedded metadata such as GPS location before anyone sees it.
  let output: { data: Buffer; info: OutputInfo };
  try {
    const image = sharp(input, { ...options, autoOrient: true });
    output = await (format === 'jpeg' ? image.jpeg({ quality: 90 }) : image.png()).toBuffer({ resolveWithObject: true });
  } catch { throw new SnipePhotoError(UNREADABLE); }
  if (output.data.byteLength > SNIPE_PHOTO_POLICY.maxBytes) throw new SnipePhotoError(TOO_LARGE);
  return { bytes: output.data, mimeType, extension: format === 'jpeg' ? 'jpg' : 'png', width: output.info.width, height: output.info.height,
    digest: createHash('sha256').update(input).digest('hex') };
}
