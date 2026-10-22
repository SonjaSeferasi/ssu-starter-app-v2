export type RasterArt = {
    w: number;
    h: number;
    key: string;
    draw: (context: CanvasRenderingContext2D) => void | Promise<void>;
};
const images = new Map<string, Promise<HTMLImageElement>>();
export function loadSprite(source: string) {
    let pending = images.get(source);
    if (!pending) {
        pending = new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => { images.delete(source); reject(new Error('Sprite could not load: ' + source)); };
            image.src = source;
        });
        images.set(source, pending);
    }
    return pending;
}
const rendered = new Map<string, Promise<HTMLCanvasElement>>();
export function renderRaster(art: RasterArt) {
    let pending = rendered.get(art.key);
    if (!pending) {
        pending = (async () => {
            const canvas = document.createElement('canvas');
            canvas.width = art.w;
            canvas.height = art.h;
            const context = canvas.getContext('2d')!;
            context.imageSmoothingEnabled = false;
            await art.draw(context);
            return canvas;
        })();
        rendered.set(art.key, pending);
        pending.catch(() => rendered.delete(art.key));
        if (rendered.size > 256)
            rendered.delete(rendered.keys().next().value!);
    }
    return pending;
}
export function drawSprite(context: CanvasRenderingContext2D, image: CanvasImageSource, source: readonly number[], target: readonly number[]) {
    context.imageSmoothingEnabled = false;
    context.drawImage(image, source[0], source[1], source[2], source[3], target[0], target[1], target[2], target[3]);
}
