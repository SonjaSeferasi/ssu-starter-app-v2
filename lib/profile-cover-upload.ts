import { AccountError } from './socialu-account';

export const COVER_MAX_BYTES = 5_000_000;
// Covers are raster photos; SVG and animated formats are intentionally excluded.
export async function coverPhotoType(file: File, noun = 'cover photo') {
  if (!file.size || file.size > COVER_MAX_BYTES) throw new AccountError(`Choose a JPG, PNG, or WebP ${noun} up to 5 MB.`, 400);
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  let type: string | null = null;
  let extension = '';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) { type = 'image/jpeg'; extension = 'jpg'; }
  if ([137,80,78,71,13,10,26,10].every((value,index) => bytes[index] === value)) { type = 'image/png'; extension = 'png'; }
  if (String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP') { type = 'image/webp'; extension = 'webp'; }
  if (!type || (file.type && file.type !== type)) throw new AccountError('Choose a valid JPG, PNG, or WebP photo.', 400);
  return { type, extension };
}
