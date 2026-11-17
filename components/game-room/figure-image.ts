import { avatarFrame, type CompleteAvatar } from '../../lib/avatar-collection';
import { adjustFigure, figureLandmarks, bodyShapes, skinColors, type BodyShape, type SkinColor } from '../../lib/avatar-figure';

export type FigureLook = { bodyShape?: BodyShape; skinColor?: SkinColor };

/** Room on each side of the cut-out frame for a wider body. */
export const figurePad = (frameWidth: number) => Math.ceil(frameWidth * 0.12);
export function changesFigure(look: FigureLook | undefined) {
  return !!look && (!!look.skinColor || (!!look.bodyShape && look.bodyShape !== 'average'));
}

const sheets = new Map<string, Promise<HTMLImageElement>>();
// Most recently used last; old object URLs are released.
const figures = new Map<string, Promise<string>>();
const keep = 48;

export type PhotoFaceFrame = { cx: number; cy: number; rx: number; ry: number };
const photoFrames = new Map<string, Promise<PhotoFaceFrame>>();
/** Measure each painted head rather than assuming every atlas cell is centered. */
export function photoFaceFrame(avatar: CompleteAvatar): Promise<PhotoFaceFrame> {
  const existing = photoFrames.get(avatar.id); if (existing) return existing;
  const result = (async () => {
    const image = await sheet(avatar.sheet), frame = avatarFrame(avatar);
    const canvas = document.createElement('canvas'); canvas.width = frame.width; canvas.height = frame.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Avatar rendering is unavailable.');
    ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height, 0, 0, frame.width, frame.height);
    const pixels = ctx.getImageData(0, 0, frame.width, frame.height), marks = figureLandmarks(pixels);
    if (!marks) throw new Error('Avatar head could not be measured.');
    const tall = marks.bottom - marks.top;
    let total = 0, weighted = 0;
    for (let y = Math.round(marks.top + tall * .06); y < marks.top + tall * .1; y++) {
      for (let x = 0; x < frame.width; x++) {
        const alpha = pixels.data[(y * frame.width + x) * 4 + 3];
        if (alpha > 40) { total += alpha; weighted += x * alpha; }
      }
    }
    return { cx: (430 - frame.width) / 2 + (total ? weighted / total : marks.center),
      cy: (760 - frame.height) / 2 + marks.top + tall * .1, rx: tall * .046, ry: tall * .061 };
  })();
  photoFrames.set(avatar.id, result); result.catch(() => photoFrames.delete(avatar.id)); return result;
}

function sheet(href: string) {
  let image = sheets.get(href);
  if (!image) {
    image = new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image(); element.onload = () => resolve(element); element.onerror = () => reject(new Error('Avatar artwork could not be loaded.')); element.src = href;
    });
    image.catch(() => sheets.delete(href));
    sheets.set(href, image);
  }
  return image;
}

/**
 * Object URL of one figure with its body shape and skin colour applied, `figurePad` wider
 * on each side. Thumbnails use `resolution` 0.5: a quarter of the pixels to process.
 */
export function adjustedFigure(avatar: CompleteAvatar, look: FigureLook, resolution = 1): Promise<string> {
  const key = [avatar.id, look.bodyShape || 'average', look.skinColor || 'painted', resolution].join('|');
  const cached = figures.get(key);
  if (cached) { figures.delete(key); figures.set(key, cached); return cached; }
  const url = (async () => {
    const image = await sheet(avatar.sheet), frame = avatarFrame(avatar);
    const width = Math.round(frame.width * resolution), height = Math.round(frame.height * resolution);
    const source = document.createElement('canvas'); source.width = width; source.height = height;
    const context = source.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Avatar rendering is unavailable.');
    context.drawImage(image, frame.x, frame.y, frame.width, frame.height, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height);
    const adjusted = adjustFigure(pixels, {
      width: bodyShapes.find(shape => shape.id === look.bodyShape)?.width,
      skin: skinColors.find(color => color.id === look.skinColor)?.hex,
    }, Math.round(figurePad(frame.width) * resolution));
    const output = document.createElement('canvas'); output.width = adjusted.width; output.height = adjusted.height;
    output.getContext('2d')!.putImageData(new ImageData(adjusted.data, adjusted.width, adjusted.height), 0, 0);
    const blob = await new Promise<Blob | null>(resolve => output.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Avatar rendering is unavailable.');
    return URL.createObjectURL(blob);
  })();
  url.catch(() => figures.delete(key));
  figures.set(key, url);
  while (figures.size > keep) {
    const [oldest, released] = figures.entries().next().value!;
    figures.delete(oldest); void released.then(URL.revokeObjectURL, () => {});
  }
  return url;
}
