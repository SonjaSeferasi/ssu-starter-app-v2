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
export function choosePhoto(files: ArrayLike<ChosenPhoto> | null | undefined): ChosenPhoto | null {
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
