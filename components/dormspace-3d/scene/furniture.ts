// Code-native DormSpace furniture. Each model is built in its unrotated footprint (width along x,
// depth along z, front facing +z, floor at y = 0) at human scale against the 1.6 m student model.
// Wall items are built against the wall plane (z = 0) and protrude into the room (+z).
import * as T from 'three';
import { contact, part, PALETTE, type Kit } from './kit';

export type FurnitureModel = T.Group & { userData: { itemKey: string; glass?: T.Mesh; height: number } };
const seeded = (seed: number) => () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };

function legs(group: T.Object3D, kit: Kit, material: T.Material, xs: number[], zs: number[], height: number, top = 0.02, bottom = 0.016) {
  for (const x of xs) for (const z of zs) part(group, kit.cylinder(top, bottom, height, 12), material, x, height / 2, z, 'leg');
}

function bed(g: T.Group, kit: Kit, w: number, d: number) {
  const oak = kit.oak(PALETTE.oak, 'bed'), dark = kit.oak(PALETTE.oakDark, 'bed-dark');
  legs(g, kit, dark, [-w / 2 + 0.05, w / 2 - 0.05], [-d / 2 + 0.06, d / 2 - 0.05], 0.2, 0.03, 0.026);
  for (const side of [-1, 1]) part(g, kit.rounded(0.05, 0.14, d - 0.08, 0.015), oak, side * (w / 2 - 0.03), 0.26, 0, 'side-rail');
  part(g, kit.rounded(w, 0.24, 0.05, 0.015), oak, 0, 0.32, d / 2 - 0.025, 'footboard');
  part(g, kit.box(w - 0.08, 0.03, d - 0.1), dark, 0, 0.3, 0, 'slats');
  part(g, kit.rounded(w - 0.1, 0.18, d - 0.12, 0.06, 4), kit.fabric('#f4efe4'), 0, 0.41, 0.01, 'mattress');
  const duvetDepth = d * 0.64;
  part(g, kit.rounded(w - 0.03, 0.08, duvetDepth, 0.035, 4), kit.fabric(PALETTE.sage), 0, 0.525, d / 2 - duvetDepth / 2 - 0.04, 'duvet');
  for (const side of [-1, 1]) part(g, kit.rounded(0.04, 0.2, duvetDepth - 0.04, 0.02), kit.fabric(PALETTE.sage), side * (w / 2 - 0.01), 0.45, d / 2 - duvetDepth / 2 - 0.04, 'duvet-drape');
  part(g, kit.rounded(w - 0.02, 0.06, 0.16, 0.03, 4), kit.fabric(PALETTE.cream), 0, 0.555, d / 2 - duvetDepth - 0.06, 'duvet-fold');
  part(g, kit.rounded(w - 0.06, 0.035, 0.34, 0.015), kit.fabric(PALETTE.navy), 0, 0.585, d / 2 - 0.3, 'throw-blanket');
  // Headboard with grooved panel and a capped top rail.
  part(g, kit.rounded(w, 0.86, 0.06, 0.02), oak, 0, 0.58, -d / 2 + 0.03, 'headboard');
  for (let i = 1; i < 5; i++) part(g, kit.box(0.012, 0.56, 0.008), dark, -w / 2 + (i * w) / 5, 0.63, -d / 2 + 0.064, 'headboard-groove');
  part(g, kit.rounded(w + 0.04, 0.05, 0.09, 0.02), dark, 0, 1.03, -d / 2 + 0.035, 'headboard-cap');
  const pillows = w > 1 ? [-0.25, 0.25] : [0];
  for (const x of pillows) {
    const pillow = part(g, kit.rounded(0.46, 0.13, 0.3, 0.06, 4), kit.fabric('#fbf8f1'), x, 0.575, -d / 2 + 0.24, 'pillow');
    pillow.rotation.x = -0.16;
  }
  const cushion = part(g, kit.rounded(0.32, 0.22, 0.09, 0.04, 4), kit.fabric(PALETTE.navy), 0, 0.66, -d / 2 + 0.36, 'accent-pillow');
  cushion.rotation.x = -0.35;
  return 1.08;
}

function chair(g: T.Group, kit: Kit) {
  const oak = kit.oak(PALETTE.oak, 'chair'), dark = kit.oak(PALETTE.oakDark, 'chair-dark');
  part(g, kit.rounded(0.44, 0.045, 0.42, 0.015), oak, 0, 0.41, 0.01, 'seat');
  part(g, kit.rounded(0.4, 0.04, 0.37, 0.018), kit.fabric(PALETTE.sage), 0, 0.452, 0.025, 'seat-cushion');
  for (const x of [-0.18, 0.18]) for (const z of [-0.17, 0.18]) {
    const leg = part(g, kit.cylinder(0.017, 0.022, 0.4, 10), oak, x, 0.2, z, 'leg');
    leg.rotation.z = x > 0 ? -0.04 : 0.04;
  }
  for (const x of [-0.18, 0.18]) part(g, kit.cylinder(0.018, 0.018, 0.5, 10), oak, x, 0.66, -0.19, 'back-post');
  part(g, kit.rounded(0.42, 0.09, 0.03, 0.012), oak, 0, 0.86, -0.19, 'top-rail');
  for (const x of [-0.08, 0, 0.08]) part(g, kit.rounded(0.035, 0.32, 0.018, 0.008), oak, x, 0.65, -0.19, 'back-slat');
  part(g, kit.box(0.34, 0.02, 0.02), dark, 0, 0.14, -0.17, 'stretcher');
  part(g, kit.box(0.34, 0.02, 0.02), dark, 0, 0.14, 0.18, 'stretcher');
  return 0.9;
}

function desk(g: T.Group, kit: Kit, w: number, d: number) {
  const oak = kit.oak(PALETTE.oak, 'desk'), dark = kit.oak(PALETTE.oakDark, 'desk-dark'), cream = kit.paint(PALETTE.cream, 0.6);
  part(g, kit.rounded(w, 0.04, d, 0.012), oak, 0, 0.74, 0, 'desktop');
  // Drawer pedestal on the left, tapered legs on the right, modesty panel at the back.
  const pedestal = 0.46;
  part(g, kit.rounded(pedestal, 0.7, d - 0.06, 0.012), oak, -w / 2 + pedestal / 2 + 0.02, 0.37, -0.01, 'drawer-pedestal');
  for (let i = 0; i < 3; i++) {
    part(g, kit.rounded(pedestal - 0.05, 0.19, 0.02, 0.008), cream, -w / 2 + pedestal / 2 + 0.02, 0.15 + i * 0.215, d / 2 - 0.03, 'drawer-front');
    part(g, kit.rounded(0.1, 0.014, 0.02, 0.006), kit.metal(), -w / 2 + pedestal / 2 + 0.02, 0.2 + i * 0.215, d / 2 - 0.012, 'drawer-pull');
  }
  for (const z of [-d / 2 + 0.05, d / 2 - 0.05]) {
    const leg = part(g, kit.cylinder(0.022, 0.016, 0.72, 12), oak, w / 2 - 0.06, 0.36, z, 'leg');
    leg.rotation.x = z > 0 ? 0.03 : -0.03;
  }
  part(g, kit.box(w - pedestal - 0.12, 0.28, 0.018), dark, pedestal / 2 - 0.02, 0.56, -d / 2 + 0.03, 'modesty-panel');
  // Laptop, open, angled toward the seat.
  const laptop = new T.Group(); laptop.position.set(0.15, 0.76, 0.02); g.add(laptop);
  part(laptop, kit.rounded(0.34, 0.016, 0.24, 0.006), kit.metal('#aeb4b8', 0.45), 0, 0.008, 0, 'laptop-base');
  part(laptop, kit.box(0.28, 0.002, 0.1), kit.paint('#3b4046', 0.6), 0, 0.017, -0.02, 'keyboard');
  const lid = new T.Group(); lid.position.set(0, 0.016, -0.12); lid.rotation.x = -0.28; laptop.add(lid);
  part(lid, kit.rounded(0.34, 0.23, 0.012, 0.006), kit.metal('#aeb4b8', 0.45), 0, 0.115, 0, 'laptop-lid');
  part(lid, kit.plane(0.3, 0.19), kit.glow('#c9dde3', 0.55), 0, 0.12, 0.0065, 'laptop-screen');
  // Lamp, books and a mug.
  const lamp = new T.Group(); lamp.position.set(w / 2 - 0.22, 0.76, -0.12); g.add(lamp);
  part(lamp, kit.cylinder(0.07, 0.08, 0.02, 20), kit.paint(PALETTE.navy, 0.5), 0, 0.01, 0, 'lamp-base');
  const arm = part(lamp, kit.cylinder(0.008, 0.008, 0.36, 8), kit.metal(), 0, 0.18, 0.03, 'lamp-arm'); arm.rotation.x = 0.18;
  const head = part(lamp, kit.cylinder(0.035, 0.075, 0.12, 20, ), kit.paint(PALETTE.navy, 0.5), 0, 0.37, 0.1, 'lamp-head'); head.rotation.x = 0.7;
  part(lamp, kit.sphere(10), kit.glow('#ffe7b8', 2), 0, 0.335, 0.13, 'lamp-bulb').scale.setScalar(0.022);
  const colors = [PALETTE.sageDeep, PALETTE.navy, PALETTE.terracotta];
  colors.forEach((color, i) => part(g, kit.rounded(0.22 - i * 0.02, 0.03, 0.16, 0.006), kit.paint(color, 0.8), -w / 2 + 0.3, 0.775 + i * 0.031, -0.1, 'book').rotation.y = i * 0.12);
  part(g, kit.cylinder(0.035, 0.032, 0.09, 16), kit.paint(PALETTE.white, 0.35), -0.32, 0.805, 0.08, 'mug');
  return 1.2;
}

function sofa(g: T.Group, kit: Kit, w: number, d: number, color = PALETTE.sage) {
  const fabric = kit.fabric(color), oak = kit.oak(PALETTE.oakDark, 'sofa-leg');
  legs(g, kit, oak, [-w / 2 + 0.1, w / 2 - 0.1], [-d / 2 + 0.1, d / 2 - 0.12], 0.09, 0.02, 0.016);
  part(g, kit.rounded(w, 0.22, d - 0.08, 0.06, 4), fabric, 0, 0.2, -0.02, 'base');
  part(g, kit.rounded(w, 0.52, 0.2, 0.07, 4), fabric, 0, 0.5, -d / 2 + 0.1, 'back-frame');
  const arm = 0.2, seats = 3, seatWidth = (w - arm * 2) / seats;
  for (let i = 0; i < seats; i++) {
    const x = -w / 2 + arm + seatWidth * (i + 0.5);
    part(g, kit.rounded(seatWidth - 0.012, 0.14, d - 0.44, 0.06, 4), fabric, x, 0.38, 0.12, 'seat-cushion');
    const back = part(g, kit.rounded(seatWidth - 0.02, 0.42, 0.2, 0.09, 4), fabric, x, 0.62, -d / 2 + 0.27, 'back-cushion');
    back.rotation.x = -0.12;
  }
  for (const side of [-1, 1]) part(g, kit.rounded(arm, 0.38, d - 0.08, 0.08, 4), fabric, side * (w / 2 - arm / 2), 0.44, -0.02, 'arm');
  const p1 = part(g, kit.rounded(0.36, 0.34, 0.12, 0.06, 4), kit.fabric(PALETTE.cream), -w / 2 + arm + 0.26, 0.6, -d / 2 + 0.42, 'throw-pillow');
  p1.rotation.set(-0.3, 0.25, 0.1);
  const p2 = part(g, kit.rounded(0.32, 0.3, 0.12, 0.06, 4), kit.fabric(PALETTE.navy), w / 2 - arm - 0.24, 0.58, -d / 2 + 0.42, 'throw-pillow');
  p2.rotation.set(-0.3, -0.2, -0.08);
  return 0.86;
}

function armchair(g: T.Group, kit: Kit, w: number, d: number) {
  const fabric = kit.fabric(PALETTE.navy), oak = kit.oak(PALETTE.oak, 'armchair-leg');
  const legsX = [-w / 2 + 0.16, w / 2 - 0.16];
  for (const x of legsX) for (const z of [-d / 2 + 0.06, d / 2 - 0.06]) {
    const leg = part(g, kit.cylinder(0.018, 0.012, 0.14, 10), oak, x, 0.07, z, 'leg');
    leg.rotation.set(z > 0 ? 0.15 : -0.15, 0, x > 0 ? -0.15 : 0.15);
  }
  const body = w - 0.2;
  part(g, kit.rounded(body, 0.2, d - 0.04, 0.05, 4), fabric, 0, 0.23, 0, 'base');
  part(g, kit.rounded(body - 0.34, 0.14, d - 0.2, 0.06, 4), fabric, 0, 0.39, 0.07, 'seat-cushion');
  const back = part(g, kit.rounded(body, 0.52, 0.16, 0.07, 4), fabric, 0, 0.57, -d / 2 + 0.09, 'back');
  back.rotation.x = -0.1;
  for (const side of [-1, 1]) part(g, kit.rounded(0.17, 0.32, d - 0.04, 0.07, 4), fabric, side * (body / 2 - 0.085), 0.44, 0, 'arm');
  part(g, kit.rounded(0.34, 0.3, 0.1, 0.05, 4), kit.fabric(PALETTE.sage), 0, 0.6, -d / 2 + 0.22, 'lumbar-pillow').rotation.x = -0.25;
  return 0.86;
}

function bookshelf(g: T.Group, kit: Kit, w: number, d: number) {
  const oak = kit.oak(PALETTE.oak, 'shelf'), height = 1.82, depth = Math.min(d - 0.12, 0.34), back = -d / 2 + 0.08;
  for (const side of [-1, 1]) part(g, kit.rounded(0.035, height, depth, 0.01), oak, side * (w / 2 - 0.0175), height / 2, back + depth / 2, 'side');
  part(g, kit.box(w - 0.07, height - 0.02, 0.012), kit.paint(PALETTE.cream, 0.8), 0, height / 2, back + 0.006, 'back-panel');
  const shelves = 5;
  const random = seeded(19);
  const colors = [PALETTE.navy, PALETTE.sageDeep, PALETTE.terracotta, PALETTE.cream, '#7b5b8a', '#c7a25a', PALETTE.ink];
  for (let i = 0; i <= shelves; i++) {
    const y = 0.06 + (i * (height - 0.1)) / shelves;
    part(g, kit.rounded(w - 0.04, 0.03, depth, 0.008), oak, 0, y, back + depth / 2, 'shelf');
    if (i === shelves) break;
    let x = -w / 2 + 0.05;
    const limit = w / 2 - (i === 2 ? 0.36 : 0.06);
    while (x < limit) {
      const thick = 0.024 + random() * 0.03, tall = 0.18 + random() * 0.1;
      if (x + thick > limit) break;
      const book = part(g, kit.rounded(thick, tall, 0.2 + random() * 0.04, 0.004, 1), kit.paint(colors[(random() * colors.length) | 0], 0.75), x + thick / 2, y + 0.015 + tall / 2, back + 0.13, 'book');
      if (random() > 0.9) { book.rotation.z = -0.22; x += 0.03; }
      x += thick + 0.003;
    }
    if (i === 2) {
      part(g, kit.lathe('shelf-pot', [[0, 0], [0.06, 0], [0.07, 0.1], [0.075, 0.11], [0, 0.11]]), kit.paint(PALETTE.terracotta, 0.8), w / 2 - 0.18, y + 0.015, back + depth / 2, 'pot');
      for (let k = 0; k < 7; k++) {
        const leaf = part(g, kit.sphere(10), kit.paint(k % 2 ? PALETTE.leaf : '#6b9a5e', 0.7), w / 2 - 0.18 + Math.cos(k) * 0.05, y + 0.18, back + depth / 2 + Math.sin(k) * 0.05, 'leaf');
        leaf.scale.set(0.025, 0.09, 0.05); leaf.rotation.set(Math.sin(k) * 0.6, k, Math.cos(k) * 0.6);
      }
    }
  }
  return height;
}

function wardrobe(g: T.Group, kit: Kit, w: number, d: number) {
  const oak = kit.oak(PALETTE.oak, 'wardrobe'), dark = kit.oak(PALETTE.oakDark, 'wardrobe-dark'), panel = kit.paint(PALETTE.cream, 0.62);
  const height = 1.95, depth = d - 0.08;
  part(g, kit.box(w - 0.04, 0.08, depth - 0.04), dark, 0, 0.04, 0, 'plinth');
  part(g, kit.rounded(w, height - 0.12, depth, 0.015), oak, 0, 0.08 + (height - 0.12) / 2, 0, 'carcass');
  part(g, kit.rounded(w + 0.04, 0.05, depth + 0.04, 0.015), dark, 0, height - 0.015, 0, 'crown');
  const doorWidth = (w - 0.06) / 2;
  for (const side of [-1, 1]) {
    const x = side * (doorWidth / 2 + 0.008);
    part(g, kit.rounded(doorWidth, height - 0.22, 0.022, 0.008), oak, x, height / 2 + 0.01, depth / 2 + 0.006, 'door');
    part(g, kit.rounded(doorWidth - 0.12, height - 0.42, 0.01, 0.004), panel, x, height / 2 + 0.01, depth / 2 + 0.02, 'door-panel');
    part(g, kit.cylinder(0.008, 0.008, 0.26, 10), kit.metal(), side * 0.04, height / 2 + 0.05, depth / 2 + 0.045, 'door-handle');
  }
  return height;
}

function coffeeTable(g: T.Group, kit: Kit, w: number, d: number) {
  const oak = kit.oak(PALETTE.oak, 'table');
  part(g, kit.rounded(w - 0.04, 0.045, d - 0.1, 0.02), oak, 0, 0.42, 0, 'tabletop');
  part(g, kit.rounded(w - 0.16, 0.025, d - 0.2, 0.01), oak, 0, 0.14, 0, 'lower-shelf');
  legs(g, kit, kit.oak(PALETTE.oakDark, 'table-leg'), [-w / 2 + 0.08, w / 2 - 0.08], [-d / 2 + 0.09, d / 2 - 0.09], 0.4, 0.02, 0.015);
  part(g, kit.cylinder(0.035, 0.032, 0.09, 16), kit.paint(PALETTE.navy, 0.4), 0.2, 0.488, 0.02, 'mug');
  part(g, kit.rounded(0.24, 0.03, 0.17, 0.006), kit.paint(PALETTE.terracotta, 0.8), -0.2, 0.458, 0, 'book').rotation.y = 0.2;
  part(g, kit.rounded(0.22, 0.025, 0.16, 0.006), kit.paint(PALETTE.sageDeep, 0.8), -0.2, 0.486, 0, 'book').rotation.y = -0.1;
  part(g, kit.rounded(0.3, 0.06, 0.2, 0.01), kit.fabric(PALETTE.cream), 0, 0.185, 0, 'basket');
  return 0.5;
}

function nightstand(g: T.Group, kit: Kit) {
  const oak = kit.oak(PALETTE.oak, 'nightstand');
  legs(g, kit, kit.oak(PALETTE.oakDark, 'nightstand-leg'), [-0.2, 0.2], [-0.17, 0.17], 0.1, 0.016, 0.014);
  part(g, kit.rounded(0.48, 0.44, 0.42, 0.015), oak, 0, 0.32, 0, 'carcass');
  part(g, kit.rounded(0.42, 0.16, 0.02, 0.006), kit.paint(PALETTE.cream, 0.6), 0, 0.4, 0.215, 'drawer-front');
  part(g, kit.sphere(10), kit.metal(), 0, 0.4, 0.235, 'knob').scale.setScalar(0.018);
  part(g, kit.box(0.4, 0.02, 0.36), kit.oak(PALETTE.oakDark, 'nightstand-leg'), 0, 0.2, 0, 'open-shelf');
  part(g, kit.lathe('lamp-body', [[0, 0], [0.07, 0], [0.085, 0.06], [0.06, 0.18], [0.02, 0.22], [0, 0.22]]), kit.paint(PALETTE.white, 0.35), -0.06, 0.54, -0.04, 'lamp-body');
  const shade = part(g, kit.cylinder(0.09, 0.13, 0.15, 24), kit.material('lampshade', () => new T.MeshStandardMaterial({ color: '#f3e8d2', emissive: '#ffdca3', emissiveIntensity: 0.45, roughness: 0.9, side: T.DoubleSide })), -0.06, 0.84, -0.04, 'lampshade');
  shade.castShadow = false;
  part(g, kit.rounded(0.16, 0.025, 0.12, 0.004), kit.paint(PALETTE.navy, 0.8), 0.12, 0.555, 0.06, 'book');
  return 0.92;
}

function plant(g: T.Group, kit: Kit) {
  part(g, kit.lathe('pot', [[0, 0], [0.12, 0], [0.15, 0.04], [0.17, 0.3], [0.18, 0.32], [0.165, 0.33], [0, 0.31]], 28), kit.paint(PALETTE.cream, 0.55), 0, 0, 0, 'pot');
  part(g, kit.cylinder(0.16, 0.16, 0.01, 24), kit.paint('#5b4532', 1), 0, 0.31, 0, 'soil');
  const random = seeded(23);
  for (let i = 0; i < 16; i++) {
    const angle = i * 2.4, tilt = 0.25 + random() * 0.5, length = 0.4 + random() * 0.35;
    const stem = new T.Group(); stem.position.set(0, 0.31, 0); stem.rotation.set(Math.sin(angle) * tilt, 0, Math.cos(angle) * tilt); g.add(stem);
    part(stem, kit.cylinder(0.005, 0.007, length, 6), kit.paint('#4e6b3f', 0.8), 0, length / 2, 0, 'stem');
    const leaf = part(stem, kit.sphere(12), kit.paint(i % 3 ? PALETTE.leaf : '#6f9f5f', 0.65), 0, length, 0.02, 'leaf');
    leaf.scale.set(0.07, 0.16, 0.02); leaf.rotation.set(0.6, angle, 0);
  }
  return 1.05;
}

function rug(g: T.Group, kit: Kit, w: number, d: number) {
  const mesh = part(g, kit.rounded(w - 0.06, 0.012, d - 0.06, 0.005, 2), kit.rug(), 0, 0.007, 0, 'rug');
  mesh.castShadow = false;
  return 0.014;
}

/** Window centred on its wall cells: frame, mullions, sky glass (day/night), sill, rod and curtains. */
function windowModel(g: FurnitureModel, kit: Kit, w: number, h: number, night: boolean) {
  const frame = kit.paint(PALETTE.white, 0.5), oak = kit.oak(PALETTE.oak, 'sill');
  const glassW = w - 0.5, glassH = h - 0.2;
  const glass = part(g, kit.plane(glassW, glassH), kit.sky(night), 0, 0, 0.012, 'window-glass');
  glass.castShadow = false; glass.receiveShadow = false; g.userData.glass = glass;
  for (const side of [-1, 1]) part(g, kit.rounded(0.07, glassH + 0.12, 0.08, 0.01), frame, side * (glassW / 2 + 0.03), 0, 0.04, 'frame-side');
  for (const side of [-1, 1]) part(g, kit.rounded(glassW + 0.12, 0.07, 0.08, 0.01), frame, 0, side * (glassH / 2 + 0.03), 0.04, 'frame-rail');
  part(g, kit.box(0.035, glassH, 0.05), frame, 0, 0, 0.035, 'mullion');
  part(g, kit.box(glassW, 0.035, 0.05), frame, 0, glassH * 0.12, 0.035, 'transom');
  part(g, kit.rounded(glassW + 0.3, 0.045, 0.2, 0.012), oak, 0, -glassH / 2 - 0.08, 0.1, 'sill');
  part(g, kit.cylinder(0.014, 0.014, w + 0.1, 12), kit.metal(), 0, glassH / 2 + 0.14, 0.12, 'curtain-rod').rotation.z = Math.PI / 2;
  const curtain = kit.fabric(PALETTE.sage);
  for (const side of [-1, 1]) for (let fold = 0; fold < 4; fold++) {
    const x = side * (glassW / 2 + 0.02 + fold * 0.055);
    part(g, kit.rounded(0.07, h + 0.12, 0.035, 0.016, 2), curtain, x, -0.02, 0.1 + (fold % 2) * 0.025, 'curtain-fold');
  }
  return h;
}

/** A neutral oak storage cabinet for catalog keys that do not have a dedicated model yet. */
function cabinet(g: T.Group, kit: Kit, w: number, d: number) {
  const oak = kit.oak(PALETTE.oak, 'cabinet');
  part(g, kit.rounded(w - 0.06, 0.7, d - 0.1, 0.02), oak, 0, 0.37, 0, 'cabinet');
  part(g, kit.rounded(w - 0.14, 0.5, 0.02, 0.008), kit.paint(PALETTE.cream, 0.6), 0, 0.38, d / 2 - 0.04, 'cabinet-door');
  return 0.74;
}

/** Builds a placed item. `width`/`depth` are the unrotated footprint in metres (wall items: width × height). */
export function buildFurniture(key: string, kit: Kit, width: number, depth: number, options: { night?: boolean } = {}): FurnitureModel {
  const g = new T.Group() as FurnitureModel;
  g.name = `furniture-${key}`; g.userData = { itemKey: key, height: 0 };
  let height: number;
  switch (key) {
    case 'bed': height = bed(g, kit, width, depth); break;
    case 'chair': height = chair(g, kit); break;
    case 'desk': height = desk(g, kit, width, depth); break;
    case 'dorm-sofa': height = sofa(g, kit, width, depth); break;
    case 'dorm-armchair': height = armchair(g, kit, width, depth); break;
    case 'dorm-bookshelf': height = bookshelf(g, kit, width, depth); break;
    case 'dorm-wardrobe': height = wardrobe(g, kit, width, depth); break;
    case 'dorm-coffee-table': height = coffeeTable(g, kit, width, depth); break;
    case 'dorm-nightstand': height = nightstand(g, kit); break;
    case 'dorm-plant': height = plant(g, kit); break;
    case 'dorm-rug': height = rug(g, kit, width, depth); break;
    case 'window': return (windowModel(g, kit, width, depth, !!options.night), g.userData.height = depth, g);
    default: height = cabinet(g, kit, width, depth);
  }
  if (key !== 'dorm-rug') contact(g, kit, width * 1.08, depth * 1.08);
  g.userData.height = height;
  return g;
}

/** Day/night window swap without rebuilding the model. */
export function setWindowNight(model: FurnitureModel, kit: Kit, night: boolean) {
  if (model.userData.glass) model.userData.glass.material = kit.sky(night);
}
