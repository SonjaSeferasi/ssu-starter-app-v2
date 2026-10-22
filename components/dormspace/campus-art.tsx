'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Direction } from '../../lib/dormspace-movement';
import { type Rotation } from '../../lib/dormspace-rules';
import { defaultPixelLook, pixelLookKey, pixelLookLabel, type PixelAvatarLook } from '../../lib/dormspace-avatar';
import { drawSprite, loadSprite, renderRaster, type RasterArt } from './campus-renderer';
import { CAMPUS_AVATAR_SIZE, CAMPUS_SEATED_BOUNDS, campusAnimationFrame, campusAvatarArt, campusAvatarDimensions } from './campus-avatar';
import { CELL_PX, FLOOR_Y_SCALE, CAMPUS_SEAT_FACING, campusFurnitureKeys, campusFurnitureLayout } from './campus-furniture';
import styles from './dormspace.module.css';
export { CELL_PX, FLOOR_Y_SCALE };
export type Art = RasterArt;
// Native 64-pixel tiles, 96×128 avatar frames and real raster artwork. Canvas backing stores
// retain the detail at retina density; no CSS enlargement of the original 24-pixel drawings.
export function PixelArt({ art, className, label, style }: {
    art: Art;
    className?: string;
    label?: string;
    style?: CSSProperties;
}) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let cancelled = false;
        setFailed(false);
        if (canvas.current)
            canvas.current.dataset.ready = 'false';
        void renderRaster(art).then(image => {
            if (cancelled || !canvas.current)
                return;
            const context = canvas.current.getContext('2d')!;
            context.setTransform(2, 0, 0, 2, 0, 0);
            context.clearRect(0, 0, art.w, art.h);
            context.imageSmoothingEnabled = false;
            context.drawImage(image, 0, 0);
            canvas.current.dataset.ready = 'true';
        }).catch(() => { if (!cancelled)
            setFailed(true); });
        return () => { cancelled = true; };
    }, [art.key, art.w, art.h]);
    return <canvas ref={canvas} width={art.w * 2} height={art.h * 2} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} className={className} style={style} data-art={art.key} data-resolution={`${art.w}x${art.h}`} data-art-error={failed || undefined}>{label ?? 'Pixel artwork'}</canvas>;
}
const idleCache = new Map<string, Art>();
function furnitureArt(key: string, rotation: Rotation = 0, night = false): Art | null {
    const layout = campusFurnitureLayout(key, rotation, night);
    if (!layout) return null;
    const cacheKey = `campus-furniture:v2:${key}:${rotation}:${night}`;
    const cached = idleCache.get(cacheKey);
    if (cached)
        return cached;
    const { width, height, source, rect, sprite } = layout;
    const art: Art = { w: width, h: height, key: cacheKey, async draw(context) {
            const image = await loadSprite(source);
            if (layout.rug) {
                context.save();
                context.translate(width / 2, sprite.height / 2);
                context.scale(1, FLOOR_Y_SCALE);
                context.rotate(rotation * Math.PI / 180);
                drawSprite(context, image, rect, [-CELL_PX * 1.5, -CELL_PX, CELL_PX * 3, CELL_PX * 2]);
                context.restore();
            } else drawSprite(context, image, rect, [sprite.x, sprite.y, sprite.width, sprite.height]);
        } };
    idleCache.set(cacheKey, art);
    return art;
}
export const itemArt: Record<string, Art> = Object.fromEntries(campusFurnitureKeys.map(key => [key, furnitureArt(key)!]));
export const nightWindowArt = furnitureArt('window', 0, true)!;
const poseCache = new Map<string, {
    frames: [
        Art,
        Art
    ];
    sheet: Art;
}>();
export function furnitureCaptionAnchor(key:string,rotation:Rotation=0) {
    const layout=campusFurnitureLayout(key,rotation);if(!layout)return{x:50,y:0};
    const {sprite,width,height}=layout,side=rotation===90||rotation===270;
    const {width:w,height:h}=campusAvatarDimensions(CELL_PX),scale=w/CAMPUS_AVATAR_SIZE.width;
    if(key==='bed')return{x:100*(sprite.x+sprite.width*(side?rotation===90?.18:.82:.5))/width,
      y:100*(sprite.y+sprite.height*(side?.35:rotation===180?.36:.27)-27*scale)/height};
    const facing=CAMPUS_SEAT_FACING[rotation],bounds=CAMPUS_SEATED_BOUNDS[facing];
    const seatX=sprite.x+sprite.width*(side?rotation===90?.60:.40:.5)-w/2;
    const x=Math.max(-bounds.left*scale,Math.min(width-bounds.right*scale,seatX));
    const y=Math.min(sprite.y+sprite.height*.60-h*.64,height-bounds.bottom*scale-1);
    return{x:100*(x+w/2)/width,y:100*(y+8*scale)/height};
}
export function furnitureSprites(key: string, rotation: Rotation = 0, look: PixelAvatarLook = defaultPixelLook) {
    const idle = furnitureArt(key, rotation);
    if (!idle)
        return null;
    if (!['bed', 'chair', 'dorm-sofa', 'dorm-armchair'].includes(key))
        return { idle, action: null };
    const cacheKey = `campus-rest:v2:${key}:${rotation}:${pixelLookKey(look)}`;
    let action = poseCache.get(cacheKey);
    if (!action) {
        const frames = ([0, 1] as const).map(frame => ({ w: idle.w, h: idle.h, key: `${cacheKey}:${frame}`, async draw(context: CanvasRenderingContext2D) {
                const base = await renderRaster(idle);
                context.drawImage(base, 0, 0);
                const { sprite } = campusFurnitureLayout(key, rotation)!;
                if (key === 'bed') {
                    const avatar = await renderRaster(campusAvatarArt(look, 'down', 'walk', 0));
                    // Crop only the modular head; the duvet covers the saved clothing while asleep.
                    context.save();
                    const side = rotation === 90 || rotation === 270;
                    const cx = sprite.x + sprite.width * (side ? rotation === 90 ? .18 : .82 : .5);
                    const cy = sprite.y + sprite.height * (side ? .35 : rotation === 180 ? .36 : .27);
                    context.translate(cx, cy);
                    context.rotate(-rotation * Math.PI / 180);
                    const scale = campusAvatarDimensions(CELL_PX).width / CAMPUS_AVATAR_SIZE.width;
                    context.scale(scale, scale);
                    drawSprite(context, avatar, [22, 6, 52, 54], [-26, -27, 52, 54]);
                    // Closed eyes on the same saved face, preserving the glasses layer and hairstyle.
                    context.fillStyle = '#48302b';
                    context.fillRect(-12, 4, 7, 2);
                    context.fillRect(6, 4, 7, 2);
                    context.restore();
                    // The quilt's breathing moves by a single native pixel, without moving the furniture.
                    if (rotation === 0) {
                        const y = Math.round(sprite.y + sprite.height * .43);
                        context.drawImage(base, 0, y, idle.w, idle.h - y, 0, y - frame, idle.w, idle.h - y);
                    }
                    if (rotation === 180) {
                        const y = Math.round(sprite.y + sprite.height * .46);
                        context.drawImage(base, 0, y, idle.w, idle.h - y, 0, y, idle.w, idle.h - y);
                    }
                }
                else {
                    const facing = CAMPUS_SEAT_FACING[rotation];
                    const avatar = await renderRaster(campusAvatarArt(look, facing, 'sit', 2));
                    const sofa = key === 'dorm-sofa', arm = key === 'dorm-armchair', side = rotation === 90 || rotation === 270;
                    const { width: w, height: h } = campusAvatarDimensions(CELL_PX);
                    const bounds = CAMPUS_SEATED_BOUNDS[facing], scale = w / CAMPUS_AVATAR_SIZE.width;
                    const seatX = sprite.x + sprite.width * (side ? rotation === 90 ? .60 : .40 : .5) - w / 2;
                    const x = Math.max(-bounds.left * scale, Math.min(idle.w - bounds.right * scale, seatX));
                    const y = Math.min(sprite.y + sprite.height * .60 - h * .64 + frame, idle.h - bounds.bottom * scale - 1);
                    context.drawImage(avatar, x, y, w, h);
                    // Furniture foreground occludes legs/back when viewed from behind or from the side.
                    if (rotation === 180) {
                        const y0 = Math.round(sprite.y + sprite.height * .18);
                        context.drawImage(base, 0, y0, idle.w, idle.h - y0, 0, y0, idle.w, idle.h - y0);
                    }
                    else if (side) {
                        const y0 = Math.round(sprite.y + sprite.height * (sofa ? .65 : arm ? .66 : .72));
                        context.drawImage(base, 0, y0, idle.w, idle.h - y0, 0, y0, idle.w, idle.h - y0);
                    }
                }
            } })) as [
            Art,
            Art
        ];
        const sheet: Art = { w: idle.w * 2, h: idle.h, key: cacheKey + ':sheet', async draw(context) { const images = await Promise.all(frames.map(renderRaster)); context.drawImage(images[0], 0, 0); context.drawImage(images[1], idle.w, 0); } };
        action = { frames, sheet };
        poseCache.set(cacheKey, action);
        if (poseCache.size > 96)
            poseCache.delete(poseCache.keys().next().value!);
    }
    return { idle, action };
}
export function FurnitureOccupant({ kind, itemKey, rotation = 0, seatName = 'chair', look = defaultPixelLook,caption }: {
    kind: 'bed' | 'chair';
    itemKey: string;
    rotation?: Rotation;
    seatName?: string;
    look?: PixelAvatarLook;
    caption?:ReactNode;
}) {
    const sprites = furnitureSprites(itemKey, rotation, look);
    if (!sprites?.action)
        return null;
    const anchor=furnitureCaptionAnchor(itemKey,rotation);
    return <span className={kind === 'bed' ? styles.sleepingPose : styles.seatedPose} role="img" aria-label={kind === 'bed' ? 'Sleeping in bed' : `Avatar sitting ${seatName === 'sofa' ? 'on' : 'in'} ${seatName}`} data-facing={rotation} data-avatar-facing={kind === 'bed' ? undefined : CAMPUS_SEAT_FACING[rotation]} data-avatar-look={pixelLookKey(look)} title={pixelLookLabel(look)}>
    <span className={styles.poseClip}><PixelArt art={sprites.action.sheet} className={styles.poseStrip}/></span>
    {kind === 'bed' ? <span className={styles.sleepLetters} aria-hidden="true"><span>z</span><span>Z</span><span>Z</span></span> : null}
    {caption?<span className={styles.restCaption} style={{left:`${anchor.x}%`,top:`${anchor.y}%`}}>{caption}</span>:null}
  </span>;
}
export function PixelAvatar({ facing, moving, sprinting = false, look = defaultPixelLook }: {
    facing: Direction;
    moving: boolean;
    sprinting?: boolean;
    look?: PixelAvatarLook;
}) {
    const canvas = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        let cancelled = false, request = 0, previous = -1;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        const pose = sprinting && moving ? 'run' : 'walk';
        const start = performance.now();
        async function draw(now: number) {
            const frame = moving && !reduced.matches ? campusAnimationFrame(sprinting, now - start) : 0;
            if (frame !== previous) {
                previous = frame;
                try {
                    const image = await renderRaster(campusAvatarArt(look, facing, pose, frame));
                    if (cancelled || !canvas.current)
                        return;
                    const context = canvas.current.getContext('2d')!;
                    context.setTransform(2, 0, 0, 2, 0, 0);
                    context.clearRect(0, 0, CAMPUS_AVATAR_SIZE.width, CAMPUS_AVATAR_SIZE.height);
                    context.imageSmoothingEnabled = false;
                    context.drawImage(image, 0, 0);
                    canvas.current.dataset.ready = 'true';
                }
                catch {
                    if (canvas.current)
                        canvas.current.dataset.artError = 'true';
                }
            }
            if (!cancelled && moving)
                request = requestAnimationFrame(draw);
        }
        void draw(start);
        return () => { cancelled = true; cancelAnimationFrame(request); };
    }, [facing, moving, sprinting, look]);
    return <span className={styles.avatar} data-moving={moving} data-sprinting={sprinting} data-facing={facing} data-avatar-look={pixelLookKey(look)} role="img" aria-label={pixelLookLabel(look)}>
    <span className={styles.avatarShadow}/><canvas ref={canvas} width={CAMPUS_AVATAR_SIZE.width * 2} height={CAMPUS_AVATAR_SIZE.height * 2} className={styles.avatarSprite} aria-hidden="true" data-resolution={`${CAMPUS_AVATAR_SIZE.width}x${CAMPUS_AVATAR_SIZE.height}`}/>
  </span>;
}
const procedural = (key: string, w: number, h: number, draw: Art['draw']): Art => ({ key: 'campus-' + key, w, h, draw });
function door(key: string, color: string): Art {
    return procedural('door-' + key, 64, 112, c => {
        c.fillStyle = '#2f3d47';
        c.fillRect(1, 0, 62, 112);
        c.fillStyle = '#cbd2d2';
        c.fillRect(4, 1, 56, 110);
        c.fillStyle = color;
        c.fillRect(7, 4, 50, 108);
        c.fillStyle = '#ffffff22';
        c.fillRect(9, 5, 3, 106);
        c.fillStyle = '#00000025';
        c.fillRect(54, 6, 3, 106);
        c.fillStyle = '#293b47';
        c.fillRect(13, 18, 38, 25);
        c.fillStyle = '#bccdd3';
        c.fillRect(15, 20, 34, 21);
        c.fillStyle = '#e6efec';
        c.fillRect(16, 21, 32, 8);
        c.fillStyle = '#a7b6b8';
        c.fillRect(47, 58, 4, 13);
        c.fillStyle = '#e2e9e6';
        c.fillRect(43, 61, 11, 3);
        c.fillStyle = '#263841';
        c.fillRect(7, 108, 50, 4);
        if (key === 'mine') {
            c.fillStyle = '#6faaa1';
            c.fillRect(23, 49, 18, 3);
        }
        if (key === 'vacant') {
            c.fillStyle = '#75818b';
            c.fillRect(26, 58, 11, 11);
            c.fillStyle = '#b3bec2';
            c.fillRect(28, 55, 7, 4);
        }
        if (key === 'elevator') {
            c.fillStyle = '#9baab2';
            c.fillRect(7, 5, 50, 103);
            c.fillStyle = '#637984';
            c.fillRect(31, 6, 2, 102);
            c.fillStyle = '#e3eceb';
            c.fillRect(10, 8, 2, 96);
            c.fillStyle = '#263d48';
            c.fillRect(20, 0, 24, 7);
            c.fillStyle = '#77c9b2';
            c.fillRect(29, 1, 6, 4);
        }
    });
}
export const doors = { mine: door('mine', '#729b8b'), friend: door('friend', '#b5a38b'), vacant: door('vacant', '#aebbc1'), elevator: door('elevator', '#b5c2c4') };
export const guestbookArt = procedural('guestbook', 128, 64, c => { c.fillStyle = '#344d58'; c.fillRect(22, 10, 84, 40); c.fillStyle = '#f3f0e1'; c.fillRect(26, 12, 36, 34); c.fillRect(66, 12, 36, 34); c.fillStyle = '#c6c8ba'; for (let y = 19; y < 43; y += 6) {
    c.fillRect(32, y, 24, 2);
    c.fillRect(72, y, 24, 2);
} c.fillStyle = '#78aaa0'; c.fillRect(90, 9, 5, 24); c.fillStyle = '#71858e'; c.fillRect(15, 50, 98, 6); });
export const exitArt = procedural('exit', 128, 64, c => { c.fillStyle = '#233b45'; c.fillRect(5, 3, 118, 58); c.fillStyle = '#547a74'; c.fillRect(11, 10, 106, 45); c.fillStyle = '#81aaa0'; for (let x = 18; x < 115; x += 8)
    c.fillRect(x, 14, 2, 36); c.fillStyle = '#d1e8db'; c.fillRect(54, 22, 20, 6); c.fillRect(64, 17, 7, 16); });
function texture(kind: string, colors: string[]) {
    const rects: string[] = [];
    const add = (x: number, y: number, w: number, h: number, color: string) => rects.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`);
    add(0, 0, 128, 128, colors[0]);
    if (kind === 'wood') {
        for (let y = 0; y < 128; y += 16) {
            add(0, y, 128, 15, colors[(y / 16) % colors.length]);
            add((y * 7 + 20) % 115, y, 1, 15, '#9b907b');
            add(0, y + 15, 128, 1, '#9b907b');
            add(3, y + 3, 40, 1, '#ffffff0e');
        }
    }
    else if (kind === 'tile') {
        for (let y = 0; y < 128; y += 32)
            for (let x = 0; x < 128; x += 32) {
                add(x, y, 31, 31, colors[(x + y) / 32 % colors.length]);
                add(x + 1, y + 1, 29, 1, '#ffffff22');
            }
    }
    else {
        for (let y = 6; y < 128; y += 17)
            for (let x = 8; x < 128; x += 23)
                add(x, y, 2, 1, colors[1] || colors[0]);
    }
    return 'url("data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" preserveAspectRatio="none" shape-rendering="crispEdges">${rects.join('')}</svg>`) + '")';
}
export const textures: Record<string, {
    image: string;
    span: number;
}> = {
    'floor-oak': { image: texture('wood', ['#c3b49c', '#bcac92', '#c8baa2', '#b8aa94']), span: 2 }, 'floor-tile': { image: texture('tile', ['#d6dddd', '#c9d4d6']), span: 2 }, 'floor-carpet': { image: texture('fabric', ['#647a8e', '#708699']), span: 2 },
    'wall-sage': { image: texture('wall', ['#c9d5cd', '#c5d1c9']), span: 2 }, 'wall-sky': { image: texture('wall', ['#cad7df', '#c4d2da']), span: 2 }, 'wall-cream': { image: texture('wall', ['#e4e3d7', '#dcdbd0']), span: 2 },
    hallWall: { image: texture('wall', ['#d5dedd', '#cad5d4']), span: 2 }, hallFloor: { image: texture('tile', ['#b9c6cc', '#adbdc5']), span: 2 },
};
export function DormSpaceBanner() { return <header className={styles.banner}><div className={styles.bannerMark} aria-hidden="true"><i /><i /><i /><i /></div><div><p className={styles.eyebrow}>A little room for you</p><h1 className={styles.logo}>DormSpace<span> / campus living</span></h1><p className={styles.bannerSubtitle}>Make yourself at home. Leave a little of you in every corner.</p></div><span className={styles.edition}>Campus edition</span></header>; }
