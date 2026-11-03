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
