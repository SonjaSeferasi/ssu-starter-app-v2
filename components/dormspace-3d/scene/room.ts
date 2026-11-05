// The dorm room shell around the saved grid: floor (saved flooring), four walls (saved wall colour)
// with wainscot and baseboards, the fixture strip with the physical guestbook stand and the exit
// door. Tall wall parts are grouped per side so the engine can cut away walls between the camera
// and the player; low baseboard stubs stay so the room outline is always visible.
import * as T from 'three';
import { CELL, WALL_HEIGHT, type RoomDims } from '../../../lib/dormspace-3d-world';
import { contact, part, PALETTE, WALL_COLORS, type Kit } from './kit';

export type WallSide = 'back' | 'front' | 'left' | 'right';
export type RoomShell = {
  group: T.Group; floor: T.Mesh; backWall: T.Mesh;
  walls: Record<WallSide, T.Group>;
  setAppearance(wallKey: string, floorKey: string): void;
  setNight(night: boolean): void;
};
const WAINSCOT = 0.95;

export function buildRoomShell(kit: Kit, dims: RoomDims): RoomShell {
  const group = new T.Group(); group.name = 'dorm-room-shell';
  const { width, depth, floorDepth } = dims, half = width / 2;
  const floor = part(group, kit.plane(width, floorDepth), kit.floor('floor-oak', width, floorDepth), 0, 0, floorDepth / 2, 'floor-surface');
  floor.rotation.x = -Math.PI / 2; floor.castShadow = false; floor.userData.surface = 'floor';
  // Fixture strip: a darker oak threshold the student cannot walk onto.
  const strip = part(group, kit.box(width, 0.02, CELL), kit.oak(PALETTE.oakDark, 'threshold'), 0, 0.01, floorDepth + CELL / 2, 'fixture-strip');
  strip.castShadow = false;
  const mat = part(group, kit.rounded(CELL * 2 - 0.1, 0.014, CELL - 0.14, 0.006), kit.fabric(PALETTE.navy), -half + CELL * 5, 0.026, floorDepth + CELL / 2, 'door-mat');
  mat.castShadow = false;

  const walls = { back: new T.Group(), front: new T.Group(), left: new T.Group(), right: new T.Group() } as Record<WallSide, T.Group>;
  const plasterKey = { current: 'wall-sage' };
  const wallMeshes: T.Mesh[] = [];
  function wall(side: WallSide, length: number, position: [number, number], yaw: number, openings: [number, number][] = []) {
    const holder = walls[side]; holder.name = `wall-${side}`; group.add(holder);
    const root = new T.Group(); root.position.set(position[0], 0, position[1]); root.rotation.y = yaw; group.add(root);
    const stub = part(root, kit.box(length, 0.16, 0.08), kit.paint(PALETTE.white, 0.5), 0, 0.08, 0.04, 'baseboard-stub');
    stub.castShadow = false;
    const tall = new T.Group(); tall.position.copy(root.position); tall.rotation.copy(root.rotation); holder.add(tall);
    // Split the wall around door openings (x ranges along the wall, centred coordinates).
    const spans: [number, number][] = []; let cursor = -length / 2;
    for (const [from, to] of openings) { spans.push([cursor, from]); cursor = to; }
    spans.push([cursor, length / 2]);
    for (const [from, to] of spans) {
      if (to - from < 0.01) continue;
      const mid = (from + to) / 2, span = to - from;
      const plaster = part(tall, kit.box(span, WALL_HEIGHT - WAINSCOT, 0.1), kit.plaster(WALL_COLORS['wall-sage']), mid, WAINSCOT + (WALL_HEIGHT - WAINSCOT) / 2, -0.05, `wall-${side}`);
      wallMeshes.push(plaster);
      part(tall, kit.box(span, WAINSCOT, 0.12), kit.paint(PALETTE.cream, 0.62), mid, WAINSCOT / 2, -0.04, 'wainscot');
      part(tall, kit.rounded(span, 0.05, 0.05, 0.012), kit.oak(PALETTE.oak, 'rail'), mid, WAINSCOT, 0.02, 'chair-rail');
      part(tall, kit.box(span, 0.06, 0.06), kit.paint(PALETTE.white, 0.5), mid, WALL_HEIGHT - 0.03, -0.02, 'crown');
      for (let x = from + 0.45; x < to - 0.3; x += 0.62) part(tall, kit.box(0.42, 0.55, 0.012), kit.paint(PALETTE.creamDeep, 0.65), x, 0.47, 0.025, 'wainscot-panel');
    }
    return tall;
  }
  wall('back', width, [0, 0], 0);
  const exitFrom = -half + CELL * 4, exitTo = -half + CELL * 6;
  // The front wall faces into the room (turned around); its door opening is mirrored.
  const front = wall('front', width, [0, depth], Math.PI, [[-exitTo + 0.08, -exitFrom - 0.08]]);
  wall('left', depth, [-half, depth / 2], Math.PI / 2);
  wall('right', depth, [half, depth / 2], -Math.PI / 2);
  const backWall = wallMeshes[0]; backWall.userData.surface = 'wall';

  // Exit door in the front wall, above the door mat: frame, panelled oak leaf, handle, sign.
  const door = new T.Group(); door.name = 'exit-door'; door.position.set(-(exitFrom + exitTo) / 2, 0, 0); front.add(door);
  door.userData.target = 'exit';
  const doorWidth = exitTo - exitFrom - 0.16;
  part(door, kit.box(doorWidth + 0.12, 2.18, 0.14), kit.paint(PALETTE.white, 0.5), 0, 1.09, -0.06, 'door-frame');
  part(door, kit.rounded(doorWidth - 0.04, 2.06, 0.05, 0.012), kit.oak(PALETTE.oak, 'door'), 0, 1.04, 0.0, 'door-leaf');
  for (const y of [0.55, 1.45]) part(door, kit.rounded(doorWidth - 0.3, 0.62, 0.012, 0.006), kit.oak(PALETTE.oakDark, 'door-panel'), 0, y, 0.03, 'door-panel');
  part(door, kit.cylinder(0.02, 0.02, 0.12, 12), kit.metal(), doorWidth / 2 - 0.12, 1.0, 0.06, 'door-handle').rotation.x = Math.PI / 2;
  const signTexture = kit.label([{ text: 'EXIT TO DORMHALL', size: 54, color: PALETTE.cream, weight: 700 }], 512, 96, PALETTE.navy);
  const sign = part(door, kit.plane(0.9, 0.17), kit.own(new T.MeshStandardMaterial({ map: signTexture, roughness: 0.6 })), 0, 2.33, 0.02, 'exit-sign');
  sign.castShadow = false;
  door.traverse(object => { object.userData.target = 'exit'; });

  // Physical guestbook: an oak lectern with an open book on the fixture strip (cells 0-1).
  const book = new T.Group(); book.name = 'guestbook'; book.position.set(-half + CELL, 0, floorDepth + CELL / 2); group.add(book);
  part(book, kit.cylinder(0.16, 0.2, 0.03, 24), kit.oak(PALETTE.oakDark, 'lectern'), 0, 0.015, 0, 'lectern-base');
  part(book, kit.rounded(0.08, 0.92, 0.08, 0.02), kit.oak(PALETTE.oak, 'lectern-post'), 0, 0.48, 0, 'lectern-post');
  const desk = new T.Group(); desk.position.set(0, 0.98, 0); desk.rotation.x = -0.42; book.add(desk);
  part(desk, kit.rounded(0.46, 0.035, 0.34, 0.012), kit.oak(PALETTE.oak, 'lectern-top'), 0, 0, 0, 'lectern-top');
  part(desk, kit.rounded(0.44, 0.03, 0.31, 0.01), kit.fabric(PALETTE.navy), 0, 0.03, 0, 'book-cover');
  for (const side of [-1, 1]) {
    const page = part(desk, kit.rounded(0.2, 0.02, 0.29, 0.008), kit.paint('#fbf6ea', 0.85), side * 0.105, 0.052, 0, 'book-page');
    page.rotation.z = side * -0.06;
  }
  part(desk, kit.cylinder(0.006, 0.006, 0.2, 8), kit.paint(PALETTE.ink, 0.6), 0.14, 0.07, 0.05, 'pen').rotation.set(0, 0.6, Math.PI / 2);
  contact(book, kit, 0.6, 0.6);
  book.traverse(object => { object.userData.target = 'guestbook'; });

  // A slim ceiling-height pendant glow so the room reads lit even with no ceiling geometry.
  const pendant = part(group, kit.sphere(16), kit.glow('#ffe4b0', 1.2), 0, WALL_HEIGHT - 0.25, floorDepth / 2, 'pendant');
  pendant.scale.set(0.12, 0.08, 0.12); pendant.castShadow = false;

  return {
    group, floor, backWall, walls,
    setAppearance(wallKey, floorKey) {
      plasterKey.current = wallKey;
      const plaster = kit.plaster(WALL_COLORS[wallKey] ?? WALL_COLORS['wall-sage']);
      for (const mesh of wallMeshes) mesh.material = plaster;
      floor.material = kit.floor(floorKey, width, floorDepth);
    },
    setNight(night) { pendant.visible = !night; },
  };
}
