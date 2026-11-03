import { avatarFrame, type CompleteAvatar } from '../../lib/avatar-collection';
import { adjustFigure, bodyShapes, skinColors, type BodyShape, type SkinColor } from '../../lib/avatar-figure';

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
