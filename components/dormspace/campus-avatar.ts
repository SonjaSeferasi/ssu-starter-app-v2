import type { Direction } from '../../lib/dormspace-movement';
import { defaultPixelLook, pixelLookKey, type PixelAvatarLook } from '../../lib/dormspace-avatar';
import { shirtColors, pantsColors } from '../../lib/game-room';
import { drawSprite, loadSprite, type RasterArt } from './campus-renderer';
export type CampusPose = 'walk' | 'run' | 'sit';
export const CAMPUS_AVATAR_SIZE = { width: 96, height: 128 } as const;
// Every pose uses the same model size. A seat changes the anchor, never the scale.
export const CAMPUS_AVATAR_WIDTH_CELLS = 1.4;
export function campusAvatarDimensions(cellPixels: number) {
    const width = cellPixels * CAMPUS_AVATAR_WIDTH_CELLS;
    return { width, height: width * CAMPUS_AVATAR_SIZE.height / CAMPUS_AVATAR_SIZE.width };
}
// Union of the visible pixels in the current modular sit layers (all bodies and hairstyles).
// Full 96px frames include transparent margins; fit the character itself inside narrow seats.
export const CAMPUS_SEATED_BOUNDS: Record<Direction, { left: number; right: number; bottom: number }> = {
    up: { left: 20, right: 80, bottom: 96 }, down: { left: 20, right: 78, bottom: 116 },
    left: { left: 10, right: 70, bottom: 112 }, right: { left: 26, right: 86, bottom: 112 },
};
const root = '/dormspace/campus/lpc/';
const hairPaths: Record<PixelAvatarLook['hair'], string[]> = {
    'sample-smile': ['hair/bedhead/adult/'], 'sample-curls': ['hair/curly_short/adult/'], 'sample-crew-cut': ['hair/buzzcut/adult/'],
    'sample-side-part': ['hair/parted/adult/'], 'sample-locs': ['hair/dreadlocks_short/adult/'],
    'sample-long-waves': ['hair/wavy/adult/bg/', 'hair/wavy/adult/fg/'], 'sample-ponytail': ['hair/high_ponytail/adult/bg/', 'hair/high_ponytail/adult/fg/'], 'sample-curly-bob': ['hair/curly_short2/adult/'],
};
const rows: Record<Direction, number> = { up: 0, left: 1, down: 2, right: 3 };
export const campusFrameCount = (pose: CampusPose) => pose === 'walk' ? 9 : pose === 'run' ? 8 : 3;
export function campusAnimationFrame(running: boolean, elapsed: number) {
    const step = Math.floor(Math.max(0, elapsed) / (running ? 85 / 1.5 : 85));
    return running ? step % 8 : 1 + step % 8;
}
export function campusAvatarSources(look: PixelAvatarLook, pose: CampusPose) {
    const thin = look.body === 'female' ? 'thin' : 'male';
    const hairs = hairPaths[look.hair];
    const paths = [hairs.length > 1 ? hairs[0] + pose + '.png' : null,
        `body/bodies/${look.body}/${pose}.png`, `legs/pants2/${thin}/${pose}.png`, `feet/shoes/basic/${thin}/${pose}.png`,
        `torso/clothes/longsleeve/${look.outfit === 'sample-weekend' ? 'longsleeve' : 'longsleeve2'}/${look.body}/${pose}.png`,
        `head/heads/human/${look.body}/${pose}.png`, hairs[hairs.length - 1] + pose + '.png',
        look.face.includes('glasses') ? `facial/glasses/${look.face === 'square-glasses' ? 'nerd' : 'round'}/adult/${pose}/black.png` : null];
    return paths.filter((path): path is string => Boolean(path));
}
const tints = new Map<string, Promise<HTMLCanvasElement>>();
async function tinted(source: string, hex: string, material: 'hair' | 'cloth') {
    const key = source + hex;
    let pending = tints.get(key);
    if (!pending) {
        pending = (async () => {
            const image = await loadSprite(root + source), c = document.createElement('canvas');
            c.width = image.width;
            c.height = image.height;
            const context = c.getContext('2d', { willReadFrequently: true })!;
            context.drawImage(image, 0, 0);
            const pixels = context.getImageData(0, 0, c.width, c.height), colors = new Map<string, number>();
            for (let i = 0; i < pixels.data.length; i += 4)
                if (pixels.data[i + 3]) {
                    const rgb = [pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]];
                    colors.set(rgb.join(','), .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]);
                }
            const sorted = [...colors.entries()].sort((a, b) => a[1] - b[1]), target = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
            const map = new Map(sorted.map(([color], index) => {
                const n = index / Math.max(1, sorted.length - 1), shade = material === 'hair' ? .35 + n * .9 : .28 + n * .95;
                return [color, target.map(channel => Math.round(Math.min(255, channel * shade + (n > .7 ? (n - .7) * 80 : 0))))];
            }));
            for (let i = 0; i < pixels.data.length; i += 4)
                if (pixels.data[i + 3]) {
                    const color = map.get([pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]].join(','))!;
                    pixels.data[i] = color[0];
                    pixels.data[i + 1] = color[1];
                    pixels.data[i + 2] = color[2];
                }
            context.putImageData(pixels, 0, 0);
            return c;
        })();
        tints.set(key, pending);
        pending.catch(() => tints.delete(key));
        if (tints.size > 128)
            tints.delete(tints.keys().next().value!);
    }
    return pending;
}
export function campusAvatarArt(look: PixelAvatarLook = defaultPixelLook, facing: Direction = 'down', pose: CampusPose = 'walk', frame = 0): RasterArt {
    const count = campusFrameCount(pose), column = Math.max(0, frame % count), row = rows[facing];
    return { w: CAMPUS_AVATAR_SIZE.width, h: CAMPUS_AVATAR_SIZE.height, key: `campus-avatar:${pixelLookKey(look)}:${facing}:${pose}:${column}`, async draw(context) {
            const paths = campusAvatarSources(look, pose), shirt = shirtColors.find(x => x.id === look.shirt)!.hex, pants = pantsColors.find(x => x.id === look.pants)!.hex;
            const layers = await Promise.all(paths.map(path => path.startsWith('hair/') ? tinted(path, '#49352e', 'hair') : path.startsWith('legs/') ? tinted(path, pants, 'cloth') : path.startsWith('torso/') ? tinted(path, shirt, 'cloth') : path.startsWith('feet/') ? tinted(path, '#dddcd5', 'cloth') : loadSprite(root + path)));
            for (const layer of layers) {
                const columns = Math.max(1, Math.floor(layer.width / 64));
                drawSprite(context, layer, [Math.min(column, columns - 1) * 64, Math.min(row, Math.floor(layer.height / 64) - 1) * 64, 64, 64], [-16, -8, 128, 128]);
            }
            // Small garment details distinguish the saved hoodie from the crew-neck sweater layers.
            if (look.outfit === 'sample-campus') {
                const dy = pose === 'sit' ? -4 : column % 2 ? 2 : 0;
                context.fillStyle = shirt;
                if (facing === 'down')
                    context.fillRect(34, 60 + dy, 28, 4);
                if (facing === 'left')
                    context.fillRect(54, 62 + dy, 8, 10);
                if (facing === 'right')
                    context.fillRect(32, 62 + dy, 8, 10);
                context.fillStyle = '#e4e4dc';
                if (facing === 'down') {
                    context.fillRect(38, 62 + dy, 2, 10);
                    context.fillRect(54, 62 + dy, 2, 10);
                }
                if (facing === 'up') {
                    context.fillStyle = '#243443';
                    context.fillRect(34, 52 + dy, 28, 4);
                    context.fillRect(32, 56 + dy, 32, 12);
                    context.fillStyle = shirt;
                    context.fillRect(36, 56 + dy, 24, 8);
                }
            }
            if ((look.face === 'freckles' || look.face === 'glasses-freckles') && facing !== 'up') {
                const dy = pose === 'sit' ? -4 : column % 2 ? 2 : 0;
                context.fillStyle = '#aa6b4d';
                for (const [x, y] of facing === 'down' ? [[32, 44], [36, 46], [58, 44], [62, 46]] : facing === 'left' ? [[28, 44], [32, 46]] : [[62, 44], [66, 46]])
                    context.fillRect(x, y + dy, 2, 2);
            }
        } };
}
