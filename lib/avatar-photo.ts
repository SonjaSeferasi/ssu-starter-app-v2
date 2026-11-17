export const AVATAR_PHOTO_MAX_BYTES = 10_000_000;
export type FaceCrop = { x: number; y: number; width: number; height: number };
export function validatePhotoFile(file: { name: string; size: number }) {
  if (file.size > AVATAR_PHOTO_MAX_BYTES) throw new Error('Choose a photograph no larger than 10 MB (10,000,000 bytes).');
  if (!file.size) throw new Error('That photograph is empty. Choose another photograph.');
  if (!/\.(jpe?g|png|webp|heic)$/i.test(file.name)) throw new Error('Choose a JPG, JPEG, PNG, WebP, or HEIC photograph.');
}
export function validFaceCrop(value: unknown): value is FaceCrop {
  if (!value || typeof value !== 'object') return false;
  const c = value as FaceCrop;
  return [c.x,c.y,c.width,c.height].every(Number.isFinite) && c.x >= 0 && c.y >= 0 && c.width > 0 && c.height > 0
    && c.x + c.width <= 1 && c.y + c.height <= 1;
}
export function faceCrop(width: number, height: number, zoom: number, horizontal: number, vertical: number): FaceCrop {
  const size = Math.min(width, height) / zoom;
  // Six decimal places keep decimal database bounds valid at the image edges.
  const floor = (value: number) => Math.floor(value * 1_000_000) / 1_000_000;
  return { x: floor((width-size)*horizontal/width), y: floor((height-size)*vertical/height), width: floor(size/width), height: floor(size/height) };
}

/** Decode locally; send only the explicitly saved crop to our server. */
export async function openFacePhoto(file: File): Promise<HTMLImageElement> {
  validatePhotoFile(file);
  let source: Blob = file;
  if (/\.heic$/i.test(file.name)) {
    try {
      const convert = (await import('heic2any')).default;
      const converted = await convert({ blob: file, toType: 'image/jpeg', quality: 0.92 });
      source = Array.isArray(converted) ? converted[0] : converted;
    } catch { throw new Error('This HEIC photograph could not be decoded. Choose another photograph.'); }
  }
  const url = URL.createObjectURL(source);
  try {
    const image = new Image(); image.src = url; await image.decode();
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 80_000_000) throw new Error();
    return image;
  } catch { URL.revokeObjectURL(url); throw new Error('This photograph could not be decoded or is too large to edit. Choose another photograph.'); }
}
export function renderFaceCrop(image: HTMLImageElement, crop: FaceCrop) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Photo editing is unavailable in this browser.');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,512,512);
  ctx.drawImage(image,crop.x*image.naturalWidth,crop.y*image.naturalHeight,crop.width*image.naturalWidth,crop.height*image.naturalHeight,0,0,512,512);
  return canvas.toDataURL('image/jpeg',0.9);
}
