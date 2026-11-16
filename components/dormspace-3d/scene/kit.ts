// Shared geometries, materials and graphic textures for one DormSpace 3D scene.
import * as T from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import { PALETTE, WALL_COLORS } from './palette';
export { PALETTE, WALL_COLORS };

type Painter = (ctx: CanvasRenderingContext2D, size: number) => void;
const rand = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

export class Kit {
  private materials = new Map<string, T.Material>();
  private geometries = new Map<string, T.BufferGeometry>();
  private textures = new Map<string, T.Texture>();
  private loose = new Set<{ dispose(): void }>();
  constructor(readonly anisotropy = 4) {}

  /** A cached canvas texture; `repeat` tiles it over a surface measured in metres. */
  texture(key: string, size: number, paint: Painter, options: { color?: boolean; repeat?: [number, number] } = {}) {
    const id = `${key}|${options.repeat?.join('x') ?? ''}`;
    const cached = this.textures.get(id);
    if (cached) return cached;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) paint(ctx, size);
    const texture = new T.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = T.RepeatWrapping; texture.anisotropy = this.anisotropy;
    if (options.color !== false) texture.colorSpace = T.SRGBColorSpace;
    if (options.repeat) texture.repeat.set(...options.repeat);
    this.textures.set(id, texture);
    return texture;
  }
  material<M extends T.Material>(key: string, create: () => M): M {
    let material = this.materials.get(key) as M | undefined;
    if (!material) { material = create(); this.materials.set(key, material); }
    return material;
  }
  geometry<G extends T.BufferGeometry>(key: string, create: () => G): G {
    let geometry = this.geometries.get(key) as G | undefined;
    if (!geometry) { geometry = create(); this.geometries.set(key, geometry); }
    return geometry;
  }
  /** Something created outside the caches (per-door label textures etc.) that dies with the kit. */
  own<R extends { dispose(): void }>(resource: R) { this.loose.add(resource); return resource; }
  release(resource: { dispose(): void }) { if (this.loose.delete(resource)) resource.dispose(); }

  // ---- Geometry ----
  beveled(w: number, h: number, d: number, radius = 0.02) {
    const r = Math.min(radius, 0.016, w / 2.01, h / 2.01, d / 2.01);
    return this.geometry(`bevel|${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r.toFixed(3)}`, () => new RoundedBoxGeometry(w, h, d, 1, r));
  }
  box(w: number, h: number, d: number) { return this.geometry(`b|${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`, () => new T.BoxGeometry(w, h, d)); }
  cylinder(top: number, bottom: number, h: number, segments = 16) { return this.geometry(`c|${top}|${bottom}|${h}|${segments}`, () => new T.CylinderGeometry(top, bottom, h, segments)); }
  sphere(segments = 16) { return this.geometry(`s|${segments}`, () => new T.SphereGeometry(1, segments, Math.max(8, segments * 0.66 | 0))); }
  plane(w: number, h: number) { return this.geometry(`p|${w.toFixed(3)}|${h.toFixed(3)}`, () => new T.PlaneGeometry(w, h)); }
  lathe(key: string, points: [number, number][], segments = 24) { return this.geometry(`l|${key}`, () => new T.LatheGeometry(points.map(([x, y]) => new T.Vector2(x, y)), segments)); }

  // ---- Surfaces ----
  oak(tone = PALETTE.oak) { return this.paint(tone, 0.72); }
  paint(color: string, roughness = 0.7) { return this.material(`paint|${color}|${roughness}`, () => new T.MeshStandardMaterial({ color, roughness })); }
  fabric(color: string) {
    return this.paint(color, 0.94);
  }
  metal(color = PALETTE.brass, roughness = 0.38) { return this.material(`metal|${color}|${roughness}`, () => new T.MeshStandardMaterial({ color, roughness, metalness: 0.7 })); }
  glow(color: string, intensity = 1.4) { return this.material(`glow|${color}|${intensity}`, () => new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.5 })); }
  shadowBlob() {
    return this.material('contact', () => new T.MeshBasicMaterial({
      map: this.texture('contact', 64, (ctx, s) => {
        const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        g.addColorStop(0, 'rgba(44,34,24,0.5)'); g.addColorStop(0.6, 'rgba(44,34,24,0.2)'); g.addColorStop(1, 'rgba(44,34,24,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
      }), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    }));
  }

  plaster(color: string) { return this.paint(color, 0.92); }
  floor(key: string, width: number, depth: number) {
    if (key === 'floor-carpet') return this.paint('#809a9d', 1);
    const tile = key === 'floor-tile';
    return this.material(`floor|${tile}|${width}|${depth}`, () => new T.MeshStandardMaterial({
      roughness: tile ? 0.53 : 0.77,
      map: this.texture(`floor-graphic|${tile}`, 256, (ctx, size) => {
        const columns = tile ? 4 : 2;
        const rows = tile ? 4 : 6;
        const tones = tile ? ['#e7dbca', '#f5e8d6'] : ['#c38b60', '#d59e6d', '#cb9367', '#dda677'];
        const w = size / columns, h = size / rows;
        ctx.fillStyle = tile ? '#c6baab' : '#ad7954';
        ctx.fillRect(0, 0, size, size);
        for (let y = 0; y < rows; y++) {
          const offset = !tile && y % 2 ? -w / 2 : 0;
          for (let x = 0; x <= columns; x++) {
            ctx.fillStyle = tones[(y + x + (tile ? 0 : Math.floor(y / 2))) % tones.length];
            ctx.fillRect(x * w + offset + 1, y * h + 1, w - 2, h - 2);
          }
        }
      }, { repeat: [width / (tile ? 2 : 2.4), depth / (tile ? 2 : 2.4)] }),
    }));
  }
  rug() {
    return this.material('rug', () => new T.MeshStandardMaterial({
      roughness: 1,
      map: this.texture('rug-pattern', 256, (ctx, s) => {
        ctx.fillStyle = PALETTE.cream; ctx.fillRect(0, 0, s, s);
        ctx.strokeStyle = PALETTE.navy; ctx.lineWidth = 14; ctx.strokeRect(14, 14, s - 28, s - 28);
        ctx.strokeStyle = PALETTE.sageDeep; ctx.lineWidth = 5; ctx.strokeRect(34, 34, s - 68, s - 68);
        ctx.fillStyle = PALETTE.sage;
        for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(s / 2, s / 2); ctx.rotate(Math.PI / 4); const k = 18 + i * 16; ctx.strokeStyle = i % 2 ? PALETTE.navy : PALETTE.sageDeep; ctx.lineWidth = 3; ctx.strokeRect(-k, -k, k * 2, k * 2); ctx.restore(); }
      }),
    }));
  }
  sky(night: boolean) {
    return this.material(`sky|${night}`, () => new T.MeshBasicMaterial({
      toneMapped: false,
      map: this.texture(`sky-${night}`, 256, (ctx, s) => {
        const g = ctx.createLinearGradient(0, 0, 0, s);
        if (night) { g.addColorStop(0, '#0f1a33'); g.addColorStop(1, '#2b3e63'); } else { g.addColorStop(0, '#9cc6e4'); g.addColorStop(0.7, '#e8f0ec'); g.addColorStop(1, '#f6ecd8'); }
        ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
        const r = rand(night ? 29 : 31);
        if (night) {
          for (let i = 0; i < 70; i++) { ctx.fillStyle = `rgba(255,250,230,${0.4 + r() * 0.6})`; ctx.fillRect(r() * s, r() * s * 0.7, 1.4, 1.4); }
          ctx.fillStyle = '#f5ecd0'; ctx.beginPath(); ctx.arc(s * 0.72, s * 0.24, 16, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#1a2846'; ctx.beginPath(); ctx.arc(s * 0.75, s * 0.22, 14, 0, Math.PI * 2); ctx.fill();
        } else {
          for (let i = 0; i < 4; i++) {
            const x = r() * s, y = 30 + r() * 60;
            ctx.fillStyle = 'rgba(255,255,255,0.82)';
            ctx.fillRect(x, y, 42, 10); ctx.fillRect(x + 8, y - 7, 22, 8);
          }
        }
        // Campus treeline and a distant building, in silhouette.
        ctx.fillStyle = night ? '#16233b' : '#7d9a75';
        for (let x = -8; x < s; x += 18) ctx.fillRect(x, s * 0.76 + Math.sin(x) * 8, 20, s * 0.16);
        ctx.fillStyle = night ? '#223150' : '#c9b79a'; ctx.fillRect(s * 0.18, s * 0.66, s * 0.22, s * 0.2);
        ctx.fillStyle = night ? '#e8c87a' : '#e9e1cf';
        for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) ctx.fillRect(s * 0.2 + x * s * 0.05, s * 0.69 + y * s * 0.05, s * 0.025, s * 0.03);
        ctx.fillStyle = night ? '#121c30' : '#6e8b68'; ctx.fillRect(0, s * 0.88, s, s * 0.12);
      }),
    }));
  }
  /** A text plaque texture (door names, room numbers). Usernames are drawn as canvas text, never HTML. */
  label(lines: { text: string; size: number; color: string; weight?: number }[], width = 512, height = 256, background = PALETTE.cream) {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
      const total = lines.reduce((sum, line) => sum + line.size * 1.25, 0);
      let y = (height - total) / 2;
      for (const line of lines) {
        ctx.font = `${line.weight ?? 600} ${line.size}px ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif`;
        ctx.fillStyle = line.color; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        let text = line.text;
        while (text.length > 1 && ctx.measureText(text).width > width * 0.9) text = text.slice(0, -2) + '…';
        ctx.fillText(text, width / 2, y); y += line.size * 1.25;
      }
    }
    const texture = this.own(new T.CanvasTexture(canvas)); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = this.anisotropy;
    return texture;
  }

  dispose() {
    for (const material of this.materials.values()) material.dispose();
    for (const geometry of this.geometries.values()) geometry.dispose();
    for (const texture of this.textures.values()) texture.dispose();
    for (const resource of this.loose) resource.dispose();
    this.materials.clear(); this.geometries.clear(); this.textures.clear(); this.loose.clear();
  }
}

/** Adds a mesh with shadows; returns it for further transforms. */
export function part(parent: T.Object3D, geometry: T.BufferGeometry, material: T.Material, x: number, y: number, z: number, name = '') {
  const mesh = new T.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.name = name;
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
/** Soft contact shadow under an object footprint (cheap ambient occlusion). */
export function contact(parent: T.Object3D, kit: Kit, width: number, depth: number, y = 0.004) {
  const mesh = new T.Mesh(kit.plane(1, 1), kit.shadowBlob());
  mesh.rotation.x = -Math.PI / 2; mesh.scale.set(width, depth, 1); mesh.position.y = y; mesh.renderOrder = 1; mesh.name = 'contact-shadow';
  parent.add(mesh); return mesh;
}
