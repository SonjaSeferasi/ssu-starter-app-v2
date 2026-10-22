import type { Direction } from '../../lib/dormspace-movement';
import type { Rotation } from '../../lib/dormspace-rules';
import atlas from '../../public/dormspace/campus/furniture-atlas.json';
import beds from '../../public/dormspace/campus/bed-atlas.json';

export const CELL_PX = 64;
export const FLOOR_Y_SCALE = .65;

// The side-view artwork shows the backrest on the left at 90°, so the sitter faces right.
// These are sprite directions; the catalog's rotation labels describe the furniture view.
export const CAMPUS_SEAT_FACING: Record<Rotation, Direction> = { 0: 'down', 90: 'right', 180: 'up', 270: 'left' };

const footprints: Record<string, readonly [number, number]> = {
    bed: [2, 3], chair: [1, 1], desk: [3, 1], 'dorm-sofa': [3, 2], 'dorm-armchair': [2, 1],
    'dorm-bookshelf': [2, 1], 'dorm-wardrobe': [2, 1], 'dorm-coffee-table': [2, 1],
    'dorm-nightstand': [1, 1], 'dorm-plant': [1, 1], 'dorm-rug': [3, 2], window: [4, 4],
};

// Furniture is measured against the original ~93px-tall standing character, independently
// of the saved collision footprint. Rotating a sofa must not turn it into a taller object.
const heights: Record<string, number> = {
    bed: 112, chair: 88, desk: 104, 'dorm-sofa': 99, 'dorm-armchair': 70,
    'dorm-bookshelf': 148, 'dorm-wardrobe': 136, 'dorm-coffee-table': 42,
    'dorm-nightstand': 64, 'dorm-plant': 66, window: 172,
};

export function campusFurnitureLayout(key: string, rotation: Rotation = 0, night = false) {
    const rects = key === 'bed' ? beds.rects : (atlas.sprites as Record<string, number[][]>)[key];
    const footprint = footprints[key];
    if (!rects || !footprint) return null;
    const side = rotation === 90 || rotation === 270;
    const width = (side && key !== 'window' ? footprint[1] : footprint[0]) * CELL_PX;
    const floorHeight = (side && key !== 'window' ? footprint[0] : footprint[1]) * CELL_PX * FLOOR_Y_SCALE;
    const rect = rects[key === 'window' ? night ? 2 : 0 : key === 'dorm-rug' ? 0 : rotation / 90];
    const source = key === 'bed' ? beds.source : atlas.source;
    if (key === 'dorm-rug') return { width, height: Math.ceil(floorHeight), source, rect,
        sprite: { x: 0, y: 0, width, height: floorHeight }, rug: true };
    // Pick a height that fits every view once, rather than shrinking only a narrow rotation.
    const modelHeight = Math.min(heights[key], ...rects.map((view, index) => {
        const viewWidth = (key !== 'window' && index % 2 ? footprint[1] : footprint[0]) * CELL_PX;
        return viewWidth * view[3] / view[2];
    }));
    const scale = modelHeight / rect[3];
    const spriteWidth = rect[2] * scale, spriteHeight = rect[3] * scale;
    const headroom = ['chair', 'dorm-sofa', 'dorm-armchair'].includes(key) ? 48 : 0;
    const height = Math.max(Math.ceil(spriteHeight + headroom), Math.ceil(floorHeight));
    return { width, height, source, rect,
        sprite: { x: (width - spriteWidth) / 2, y: height - spriteHeight, width: spriteWidth, height: spriteHeight }, rug: false };
}

export const campusFurnitureKeys = Object.keys(footprints);
