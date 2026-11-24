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

// SRS-201.13 (#1401): the largest a conversation GIF may be. This is the max_bytes of the seeded
// ('chat_gif','image/gif',15000000) row, and validate_media refuses on `byte_count > lim`, so a file of
// exactly this many bytes is allowed. Refusing at 15,000,000 here would turn away a GIF the database
// would have accepted.
export const GIF_MAX_BYTES = 15_000_000;

export const GIF_TOO_LARGE = 'GIFs must be 15 MB or smaller.';
// media_assets has CHECK (byte_count > 0), so an empty file could never be stored. Saying so here is
// kinder than letting the upload fail later with a database message.
export const GIF_EMPTY = 'That file is empty. Choose a GIF.';

export function gifSizeError(gif: { size: number } | null | undefined): string | null {
  if (!gif) return null;
  if (!Number.isFinite(gif.size) || gif.size <= 0) return GIF_EMPTY;
  return gif.size > GIF_MAX_BYTES ? GIF_TOO_LARGE : null;
}

// Why a chosen GIF cannot be sent, or null when it may be. Format is judged before size so a file that
// fails both is named by what it is rather than by how big it is, which is the more useful thing to fix.
// The upload route applies this same function to what actually arrived, so the page and the server
// cannot give different answers.
export function gifError(gif: { type: string; size: number } | null | undefined): string | null {
  return gifFormatError(gif) ?? gifSizeError(gif);
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

// SRS-201.14 (#1405): what the server needs to store a sent GIF. Rules rather than work, so they live
// beside the ones the page already uses and are covered by the same kind of test.

// Where a conversation GIF is stored. The sender and the conversation are in the path so an object can be
// traced back to the message that references it, and the random part makes one upload unable to overwrite
// another -- media_assets.storage_key is UNIQUE, so a collision would otherwise refuse a legitimate send.
// There is no '-display' sibling: unlike a photo, a GIF has no second copy (re-encoding would stop it
// animating), so the key names the one object there is.
export function gifStorageKey(ownerId: string, conversationId: string, unique: string): string {
  return `chat_gif/${ownerId}/${conversationId}/${unique}.gif`;
}

// A GIF file begins with 'GIF87a' or 'GIF89a'. The reported type is a claim about the file name as much as
// about the file, so the route checks the bytes that actually arrived. This is the GIF equivalent of the
// photo route decoding its image, and it deliberately only reads the header: decoding or re-encoding the
// frames is what would flatten the animation.
export function isGifBytes(bytes: ArrayLike<number> | null | undefined): boolean {
  if (!bytes || bytes.length < 6) return false;
  const header = Array.from({ length: 6 }, (_, i) => String.fromCharCode(bytes[i]));
  return header.join('') === 'GIF87a' || header.join('') === 'GIF89a';
}

export const GIF_BYTES_REJECTED = 'That file is not a GIF. Choose it again.';

// What the student is told when the GIF was chosen correctly but could not be sent. The format and size
// refusals name what to fix; this one does not pretend to, because nothing about the file is wrong.
export const GIF_SEND_FAILED = 'Your GIF could not be sent. Please try again.';
