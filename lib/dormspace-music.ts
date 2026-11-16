export const MUSIC_BUCKET = 'dormspace-music';
export const MAX_MUSIC_BYTES = 20 * 1024 * 1024;
export type DormMusic = { isOwner: boolean; track: { title: string; version: string; url: string } | null };

/** Read the actual MP3 header, not an extension or browser-supplied MIME type. */
export function isMp3(bytes: Uint8Array) {
  if (bytes.length < 32) return false;
  let offset = 0;
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    if (bytes.length < 10 || bytes.slice(6, 10).some(value => value > 127)) return false;
    offset = 10 + (bytes[6] << 21 | bytes[7] << 14 | bytes[8] << 7 | bytes[9]);
    if (bytes[3] === 4 && (bytes[5] & 0x10)) offset += 10;
  }
  for (let i = offset; i < Math.min(bytes.length - 4, offset + 4096); i++) {
    if (bytes[i] === 255 && (bytes[i + 1] & 0xe0) === 0xe0 &&
      (bytes[i + 1] & 0x18) !== 0x08 && (bytes[i + 1] & 6) === 2 &&
      (bytes[i + 2] & 0xf0) !== 0 && (bytes[i + 2] & 0xf0) !== 0xf0 && (bytes[i + 2] & 0x0c) !== 0x0c) return true;
  }
  return false;
}
