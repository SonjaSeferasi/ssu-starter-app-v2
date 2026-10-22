import { expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { campusAnimationFrame, campusAvatarArt, campusAvatarSources, campusFrameCount } from '../components/dormspace/campus-avatar';
import { defaultPixelLook, pixelHairstyles, pixelOutfits } from '../lib/dormspace-avatar';
import { furnitureSprites, CELL_PX, FLOOR_Y_SCALE } from '../components/dormspace/campus-art';
import { campusFurnitureKeys, campusFurnitureLayout } from '../components/dormspace/campus-furniture';
import atlas from '../public/dormspace/campus/furniture-atlas.json';
import beds from '../public/dormspace/campus/bed-atlas.json';
import credits from '../public/dormspace/campus/lpc/credits.json';
import { ROTATIONS } from '../lib/dormspace-rules';
it('uses genuinely larger native sprites and complete walk/run/sit cycles', () => {
    expect(CELL_PX).toBeGreaterThan(24);
    expect(FLOOR_Y_SCALE).toBeGreaterThan(.5);
    expect(campusFrameCount('walk')).toBe(9);
    expect(campusFrameCount('run')).toBe(8);
    expect(campusFrameCount('sit')).toBe(3);
    for (const hair of pixelHairstyles)
        for (const body of ['male', 'female'] as const)
            for (const outfit of pixelOutfits) {
                for (const pose of ['walk', 'run', 'sit'] as const) {
                    const look = { ...defaultPixelLook, hair, body, outfit, face: 'glasses-freckles' as const };
                    for (const source of campusAvatarSources(look, pose)) {
                        expect(existsSync(join(process.cwd(), 'public/dormspace/campus/lpc', source)), source).toBe(true);
                        expect(credits.some(row => row.filename === source), source + ' attribution').toBe(true);
                    }
                    for (const facing of ['up', 'down', 'left', 'right'] as const) {
                        const art = campusAvatarArt(look, facing, pose, 0);
                        expect(art.w).toBe(96);
                        expect(art.h).toBe(128);
                        expect(art.key).not.toBe(campusAvatarArt(look, facing, pose, 1).key);
                    }
                }
            }
});
it('cycles all eight moving frames and runs the animation at 1.5 times walking cadence', () => {
    const walking = Array.from({ length: 8 }, (_, i) => campusAnimationFrame(false, i * 85));
    const running = Array.from({ length: 8 }, (_, i) => campusAnimationFrame(true, i * 85 / 1.5 + .001));
    expect(walking).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(running).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(campusAnimationFrame(false, 680)).toBe(1);
    expect(campusAnimationFrame(true, 680 / 1.5 + .001)).toBe(0);
});
it('keeps sprite crops inside their own atlas and preserves geometry in every furniture direction', () => {
    for (const rects of Object.values(atlas.sprites))
        for (const [x, y, w, h] of rects) {
            expect(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= atlas.size[0] && y + h <= atlas.size[1]).toBe(true);
        }
    for (const [x, y, w, h] of beds.rects)
        expect(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 1536 && y + h <= 1024).toBe(true);
    const look = { ...defaultPixelLook, hair: 'sample-ponytail' as const, shirt: 'purple' as const };
    for (const key of Object.keys(atlas.sprites))
        for (const rotation of ROTATIONS) {
            const first = furnitureSprites(key, rotation)!, second = furnitureSprites(key, rotation, look)!;
            expect(first.idle.w).toBeGreaterThanOrEqual(64);
            expect(first.idle.h).toBeGreaterThan(30);
            expect(second.idle).toBe(first.idle);
            if (['bed', 'chair', 'dorm-sofa', 'dorm-armchair'].includes(key)) {
                expect(first.action!.sheet.w).toBe(first.idle.w * 2);
                expect(first.action!.sheet.h).toBe(first.idle.h);
                expect(first.action!.sheet.key).not.toBe(second.action!.sheet.key);
                expect(first.action!.frames[0].key).not.toBe(first.action!.frames[1].key);
            }
        }
});
it('keeps a separate classic renderer and attributes every imported file', () => {
    expect(existsSync('app/game-room/dormspace/classic/page.tsx')).toBe(true);
    const classic = readFileSync('components/dormspace-classic/dorm-room.tsx', 'utf8');
    expect(classic).toContain("from './pixel-art'");
    expect(classic).not.toContain('FLOOR_Y_SCALE');
    expect(credits).toHaveLength(72);
    expect(credits.every(row => row.authors.length > 0 && row.urls.startsWith('https://') && ['OGA-BY 3.0', 'CC-BY-SA 3.0'].includes(row.selectedLicense))).toBe(true);
});
it('sizes furniture around the existing player without stretching it or enlarging it when rotated', () => {
    for (const key of campusFurnitureKeys.filter(key => key !== 'dorm-rug')) {
        const heights = ROTATIONS.map(rotation => {
            const { width, height, rect, sprite } = campusFurnitureLayout(key, rotation)!;
            expect(sprite.width / sprite.height, `${key} at ${rotation}° keeps the source proportions`).toBeCloseTo(rect[2] / rect[3], 8);
            expect(sprite.x).toBeGreaterThanOrEqual(-.001);
            expect(sprite.y).toBeGreaterThanOrEqual(-.001);
            expect(sprite.x + sprite.width).toBeLessThanOrEqual(width + .001);
            expect(sprite.y + sprite.height).toBeCloseTo(height, 8);
            return sprite.height;
        });
        expect(Math.max(...heights) / Math.min(...heights), key + ' stays the same height').toBeLessThan(1.03);
    }
    const sofa = campusFurnitureLayout('dorm-sofa', 90)!, armchair = campusFurnitureLayout('dorm-armchair', 0)!;
    expect(sofa.sprite.height).toBeLessThan(105); // Previously 166px beside a ~93px player.
    expect(armchair.sprite.height).toBeLessThan(80); // Previously 129px.
    expect(campusFurnitureLayout('dorm-rug', 90)!.sprite.height / campusFurnitureLayout('dorm-rug')!.sprite.height).toBeCloseTo(1.5);
});
