// SRS-201.12 (#1397): choosing a GIF file from the device to send in a conversation.
// The rules live here rather than in the page so they can be tested: vitest runs with
// environment: 'node' and there is no React testing library, so anything left inline in the
// component would have nothing real behind it. lib/chat-photo.ts does the same for photos.
//
// This card covers the choice only. The size limit is SRS-201.13, sending is SRS-201.14 and showing
// the sent GIF is SRS-201.15, so nothing here refuses a file on its size.
//
// A GIF is kept as it arrived. The photo path stores a smaller re-encoded copy for display
// (SRS-201.6, #1026); doing that to a GIF would flatten it to a still image, so there is no
// equivalent here and none is wanted.

import { choosePhoto, formatPhotoSize } from './chat-photo';

// What the page keeps about the GIF the student has chosen. The same shape as ChosenPhoto, so one
// composer can hold either without a second kind of state.
export type ChosenGif = { name: string; size: number; type: string };

// The picker returns a list because an <input type="file"> always does, and a student who opens it
// and cancels leaves an empty list. That rule is identical for a GIF, so it is reused rather than
// written twice: two copies could drift apart, and there is nothing GIF-specific about it.
export const chooseGif = choosePhoto;

// SRS-201.12: the one format a conversation GIF may use. This is exactly the row seeded for the
// chat_gif upload context in 20260929164656_create_socialu.sql -- ('chat_gif','image/gif',15000000) --
// so the three places that judge a GIF agree: this list, the upload route, and the validate_media
// trigger. A format allowed here but not seeded there would be accepted by the page and then refused
// by the database, which is worse than refusing it at once.
export const GIF_MIME_TYPES = ['image/gif'] as const;

// The accept hint for the file input. It only filters what the picker offers by default: a student
// can still pick "All files", so this never replaces the check below.
export const GIF_ACCEPT = GIF_MIME_TYPES.join(',');

export const GIF_FORMAT_REJECTED = 'GIFs must be GIF files.';

export function isSupportedGifType(type: string | null | undefined): boolean {
  return GIF_MIME_TYPES.some((supported) => supported === (type ?? '').toLowerCase().trim());
}

// Why a chosen GIF cannot be sent, or null when its format is fine. A file with no type at all is
// refused here rather than guessed at; the upload route reads the bytes and the database has the
// final say, so a wrong guess would only move the refusal later.
export function gifFormatError(gif: { type: string } | null | undefined): string | null {
  if (!gif) return null;
  return isSupportedGifType(gif.type) ? null : GIF_FORMAT_REJECTED;
}

// A readable size for the chosen GIF. Reused from the photo rules so a 1.2 MB file reads the same
// whichever button the student used, and so both are counted in the MB the 15 MB limit counts.
export const formatGifSize = formatPhotoSize;

// How the chosen GIF is named on screen and to a screen reader. Separate from the photo version only
// because the fallback word differs when a file has no name of its own.
export function describeChosenGif(gif: ChosenGif | null | undefined): string {
  if (!gif) return '';
  const size = formatGifSize(gif.size);
  const name = gif.name.trim() || 'GIF';
  return size ? `${name}, ${size}` : name;
}
