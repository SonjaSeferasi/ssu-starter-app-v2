// SRS-201.3 (#1013): choosing a photo from the device to send in a conversation.
// The rules live here rather than in the page so they can be tested: vitest runs with
// environment: 'node' and there is no React testing library, so anything left inline in the
// component would have nothing real behind it.
//
// This card covers the choice only. Which formats are accepted is SRS-201.4, the size limit is
// SRS-201.5, and uploading and sending the photo is SRS-201.6, so nothing here refuses a file on
// its type or its size.

// What the page keeps about the photo the student has chosen. Only the fields it actually shows,
// so a real File satisfies it without the tests needing one.
export type ChosenPhoto = { name: string; size: number; type: string };

// The picker returns a list because an <input type="file"> always does. A student who opens it and
// cancels leaves an empty list, which must clear nothing and choose nothing.
// Generic in the file type so a real FileList gives back a real File, which SRS-201.6 needs in order to upload
// it. The rule is unchanged; only the type travels through.
export function choosePhoto<T extends ChosenPhoto>(files: ArrayLike<T> | null | undefined): T | null {
  if (!files || files.length === 0) return null;
  return files[0] ?? null;
}

// SRS-201.4 (#1015): the formats a conversation photo may use. These are exactly the rows seeded for the
// chat_photo upload context in 20260929164656_create_socialu.sql, so the three places that judge a photo agree:
// this list, the upload route, and socialu.media_assets' validate_media trigger. A format allowed here but not
// seeded there would be accepted by the page and then refused by the database, which is worse than refusing it
// at once.
export const PHOTO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

// The accept hint for the file input. It only filters what the picker offers by default: a student can still
// pick "All files", so this never replaces the check below.
export const PHOTO_ACCEPT = PHOTO_MIME_TYPES.join(',');

export const PHOTO_FORMAT_REJECTED = 'Photos must be PNG, JPEG or WebP.';

export function isSupportedPhotoType(type: string | null | undefined): boolean {
  return PHOTO_MIME_TYPES.some((supported) => supported === (type ?? '').toLowerCase().trim());
}

// Why a chosen photo cannot be sent, or null when its format is fine. Choosing is SRS-201.3 and stays
// unchanged: the picker still reports whatever the student selected, and this judges it afterwards.
// A file with no type at all is refused here rather than guessed at; the upload route reads the bytes
// (SRS-201.6) and the database has the final say, so a wrong guess would only move the refusal later.
export function photoFormatError(photo: { type: string } | null | undefined): string | null {
  if (!photo) return null;
  return isSupportedPhotoType(photo.type) ? null : PHOTO_FORMAT_REJECTED;
}

// SRS-201.5 (#1018): the largest a conversation photo may be. This is the max_bytes seeded for every
// chat_photo row, and validate_media refuses on `byte_count > lim`, so a file of exactly this many bytes is
// allowed. Refusing at 15,000,000 here would turn away a photo the database would have accepted.
export const PHOTO_MAX_BYTES = 15_000_000;

export const PHOTO_TOO_LARGE = 'Photos must be 15 MB or smaller.';
// media_assets has CHECK (byte_count > 0), so an empty file could never be stored. Saying so here is kinder
// than letting the upload fail later with a database message.
export const PHOTO_EMPTY = 'That file is empty. Choose a photo.';

export function photoSizeError(photo: { size: number } | null | undefined): string | null {
  if (!photo) return null;
  if (!Number.isFinite(photo.size) || photo.size <= 0) return PHOTO_EMPTY;
  return photo.size > PHOTO_MAX_BYTES ? PHOTO_TOO_LARGE : null;
}

// Why a chosen photo cannot be sent, or null when it may be. Format is judged before size so a file that
// fails both is named by what it is rather than by how big it is, which is the more useful thing to fix.
export function photoError(photo: { type: string; size: number } | null | undefined): string | null {
  return photoFormatError(photo) ?? photoSizeError(photo);
}

// A readable size for the chosen photo, in the same MB that SRS-201.5 counts (1 MB = 1,000,000
// bytes), so what the student reads here matches the limit they are later held to.
export function formatPhotoSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1000) return `${Math.round(bytes)} B`;
  if (bytes < 1000000) return `${Math.round(bytes / 1000)} KB`;
  const mb = bytes / 1000000;
  // One decimal below 10 MB, where the difference matters next to a 15 MB limit; none above.
  return mb < 10 ? `${mb.toFixed(1)} MB` : `${Math.round(mb)} MB`;
}

// How the chosen photo is named on screen and to a screen reader.
export function describeChosenPhoto(photo: ChosenPhoto | null | undefined): string {
  if (!photo) return '';
  const size = formatPhotoSize(photo.size);
  const name = photo.name.trim() || 'Photo';
  return size ? `${name}, ${size}` : name;
}

// SRS-201.6 (#1023, #1026): what the server needs to store a sent photo. These are rules rather than work, so
// they live beside the ones the page already uses and are covered by the same kind of test. The work itself --
// decoding the bytes and re-encoding a smaller copy -- is in lib/chat-photo-image.ts, which loads sharp and
// therefore cannot be imported by the page.

// The extension each accepted format is stored under. Storage serves an object by its recorded content type,
// so this only has to be honest and stable; it is what makes a stored key readable when something goes wrong.
const PHOTO_EXTENSIONS: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

export function photoExtension(type: string): string {
  return PHOTO_EXTENSIONS[(type ?? '').toLowerCase().trim()] ?? 'bin';
}

// Where a conversation photo is stored. The sender and the conversation are in the path so an object can be
// traced back to the message that references it, and the random part makes one upload unable to overwrite
// another -- media_assets.storage_key is UNIQUE, so a collision would otherwise refuse a legitimate send.
// The display copy sits beside its original under the same random name, so the pair is obvious.
export function photoStorageKey(ownerId: string, conversationId: string, unique: string, type: string,
  variant?: 'display'): string {
  const suffix = variant === 'display' ? '-display' : '';
  return `chat_photo/${ownerId}/${conversationId}/${unique}${suffix}.${photoExtension(type)}`;
}

// SRS-201.6 (#1026): the longest edge a stored display copy may have. A conversation shows photos at a few
// hundred pixels at most, so 1280 still looks right on a high-density screen while being a fraction of the
// bytes of a 15 MB original. The original is kept untouched; this is only the copy the conversation shows.
export const PHOTO_DISPLAY_MAX_EDGE = 1280;

// The size of the display copy, or null when the photo is already small enough to show as it is. Returning null
// rather than the same size matters: it is what tells the route not to store a second object for nothing.
// The aspect ratio is kept, and neither edge is ever rounded down to zero.
export function displaySize(width: number, height: number): { width: number; height: number } | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return null;
  const longest = Math.max(width, height);
  if (longest <= PHOTO_DISPLAY_MAX_EDGE) return null;
  const scale = PHOTO_DISPLAY_MAX_EDGE / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

// What the student is told when the photo was chosen correctly but could not be sent. The format and size
// refusals above name what to fix; this one does not pretend to, because nothing about the file is wrong.
export const PHOTO_SEND_FAILED = 'Your photo could not be sent. Please try again.';
