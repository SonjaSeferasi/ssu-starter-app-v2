import sharp from 'sharp';
import { PHOTO_MIME_TYPES, displaySize } from './chat-photo';

// SRS-201.6 (#1023, #1026): reading a sent photo and making the smaller copy the conversation shows.
// This module loads sharp, so it is server-only and must never be imported by a page. The rules it follows
// (which formats are accepted, how large the display copy may be) live in lib/chat-photo.ts, where the page
// reads them too, so the two cannot drift apart.

// The sharp format name for each accepted type. This is what the bytes must actually turn out to be; a file
// renamed from .heic to .png reports image/png to the browser and is caught here.
const SHARP_FORMATS: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/webp': 'webp' };

export class PhotoBytesError extends Error {}

export type ReadPhoto = { width: number; height: number };

// Confirm the bytes really are a photo of the declared format, and report its size in pixels.
// The browser's reported type is a claim about the file name as much as the file, and SRS-201.4 is about what
// the conversation actually accepts, so the claim is checked against the bytes rather than trusted.
export async function readPhoto(bytes: Buffer, declaredType: string): Promise<ReadPhoto> {
  const expected = SHARP_FORMATS[(declaredType ?? '').toLowerCase().trim()];
  if (!expected) throw new PhotoBytesError('Photos must be PNG, JPEG or WebP.');
  let meta;
  try {
    meta = await sharp(bytes).metadata();
  } catch {
    throw new PhotoBytesError('That photo could not be read. Choose it again.');
  }
  if (meta.format !== expected) throw new PhotoBytesError('Photos must be PNG, JPEG or WebP.');
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width < 1 || height < 1) throw new PhotoBytesError('That photo could not be read. Choose it again.');
  return { width, height };
}

export type DisplayCopy = { bytes: Buffer; type: string };

// SRS-201.6 (#1026): a smaller copy of the photo, or null when one is not worth storing.
// Null in three cases, each deliberate:
//   - the photo is already within the display size, so the original is what SRS-201.7 shows;
//   - re-encoding produced something no smaller, which can happen with an already well-compressed file and
//     would mean storing a second object that saves nothing;
//   - the copy could not be made at all, which must not stop the photo being sent. A missing display copy
//     costs a little bandwidth when the photo is shown; a failed send costs the student their message.
// The copy keeps the original's format. Converting everything to WebP would store fewer bytes, but a PNG with
// transparency or a JPEG a student later downloads would come back as something they did not send, and every
// format here is already one the chat_photo policy accepts.
// sharp drops metadata unless asked to keep it, so the copy also carries no EXIF -- no camera serial number
// and no GPS coordinates reach the other participants.
export async function displayCopy(bytes: Buffer, type: string, size: ReadPhoto): Promise<DisplayCopy | null> {
  const target = displaySize(size.width, size.height);
  if (!target) return null;
  const format = SHARP_FORMATS[(type ?? '').toLowerCase().trim()];
  if (!format || !PHOTO_MIME_TYPES.some((accepted) => accepted === type)) return null;
  try {
    const copy = await sharp(bytes)
      .resize(target.width, target.height, { fit: 'inside', withoutEnlargement: true })
      .toFormat(format as 'png' | 'jpeg' | 'webp')
      .toBuffer();
    if (copy.byteLength < 1 || copy.byteLength >= bytes.byteLength) return null;
    return { bytes: copy, type };
  } catch {
    return null;
  }
}
