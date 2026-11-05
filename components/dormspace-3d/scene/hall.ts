// The shared DormHall corridor: oak floor with a runner, cream walls with sage wainscot, twelve
// numbered doors (six per side) labelled from the shared directory, an elevator at the west end,
// a tall window at the east end, ceiling lamps, noticeboards, benches and plants.
import * as T from 'three';
import { HALL_HEIGHT, HALL_LENGTH, HALL_ROOMS_PER_FLOOR, HALL_WIDTH, hallDoorWorld } from '../../../lib/dormspace-3d-world';
import { doorPresentation, type HallDoor } from '../../../lib/dormspace-hall-contract';
import { buildFurniture } from './furniture';
import { contact, part, PALETTE, type Kit } from './kit';

export type HallScene = { group: T.Group; doors: T.Group[]; elevator: T.Group };
const STATUS_COLOR: Record<HallDoor['state'], string> = { own: PALETTE.brass, friend: '#5ea36e', locked: '#9aa0a6', withheld: '#9aa0a6', vacant: '#c8c2b5' };

export function buildHall(kit: Kit, floor: number, floorCount: number, doors: HallDoor[]): HallScene {
  const group = new T.Group(); group.name = 'dorm-hall';
  const L = HALL_LENGTH, W = HALL_WIDTH, H = HALL_HEIGHT;
  const floorMesh = part(group, kit.plane(L, W), kit.floor('floor-oak', L, W), 0, 0, 0, 'hall-floor');
  floorMesh.rotation.x = -Math.PI / 2; floorMesh.castShadow = false;
  const runner = part(group, kit.rounded(L - 3, 0.01, 1.3, 0.004, 2), kit.material('runner', () => new T.MeshStandardMaterial({
    color: PALETTE.sageDeep, roughness: 1, normalMap: kit.weave(), normalScale: new T.Vector2(0.5, 0.5) })), 0.8, 0.006, 0, 'runner');
  runner.castShadow = false;
  for (const z of [-0.6, 0.6]) part(group, kit.box(L - 3, 0.012, 0.05), kit.paint(PALETTE.cream, 0.9), 0.8, 0.008, z, 'runner-border').castShadow = false;
  const ceiling = part(group, kit.plane(L, W), kit.paint('#f4efe5', 0.95), 0, H, 0, 'ceiling');
  ceiling.rotation.x = Math.PI / 2; ceiling.castShadow = false;

  // Long walls with wainscot, rails and crown; door openings are covered by the door frames.
  for (const side of [-1, 1]) {
    const z = side * W / 2;
    part(group, kit.box(L, H - 1.0, 0.12), kit.plaster(PALETTE.cream), 0, 1.0 + (H - 1.0) / 2, z + side * 0.06, 'hall-wall');
    part(group, kit.box(L, 1.0, 0.14), kit.paint(PALETTE.sage, 0.7), 0, 0.5, z + side * 0.05, 'hall-wainscot');
    part(group, kit.rounded(L, 0.05, 0.05, 0.012), kit.oak(PALETTE.oak, 'rail'), 0, 1.0, z - side * 0.02, 'hall-rail');
    part(group, kit.box(L, 0.14, 0.04), kit.paint(PALETTE.white, 0.5), 0, 0.07, z - side * 0.005, 'hall-baseboard');
  }
  // West end: elevator lobby wall. East end: window wall.
  part(group, kit.box(0.12, H, W), kit.plaster(PALETTE.cream), -L / 2 - 0.06, H / 2, 0, 'west-wall');
  part(group, kit.box(0.12, H, W), kit.plaster(PALETTE.cream), L / 2 + 0.06, H / 2, 0, 'east-wall');
  const glass = part(group, kit.plane(2.4, 1.9), kit.sky(false), L / 2 - 0.01, 1.55, 0, 'east-window');
  glass.rotation.y = -Math.PI / 2; glass.castShadow = false;
  for (const z of [-1.24, 1.24]) part(group, kit.rounded(0.12, 2.04, 0.1, 0.01), kit.paint(PALETTE.white, 0.5), L / 2 - 0.05, 1.55, z, 'window-frame');
  for (const y of [0.58, 2.52]) part(group, kit.rounded(0.12, 0.1, 2.56, 0.01), kit.paint(PALETTE.white, 0.5), L / 2 - 0.05, y, 0, 'window-frame');

  // Elevator: brushed doors, frame, call buttons and a floor indicator.
  const elevator = new T.Group(); elevator.name = 'elevator'; elevator.position.set(-L / 2, 0, 0); group.add(elevator);
  part(elevator, kit.rounded(0.16, 2.5, 1.9, 0.02), kit.paint(PALETTE.navy, 0.45), 0.06, 1.25, 0, 'elevator-frame');
  for (const z of [-0.39, 0.39]) part(elevator, kit.rounded(0.04, 2.2, 0.76, 0.01), kit.metal('#c9ccc8', 0.3), 0.15, 1.12, z, 'elevator-door');
  const indicator = kit.label([{ text: `Floor ${floor} of ${floorCount}`, size: 64, color: '#ffd98a', weight: 700 }], 512, 128, PALETTE.navyDeep);
  const sign = part(elevator, kit.plane(0.8, 0.2), kit.own(new T.MeshBasicMaterial({ map: indicator, toneMapped: false })), 0.15, 2.62, 0, 'elevator-indicator');
  sign.rotation.y = Math.PI / 2; sign.castShadow = false;
  part(elevator, kit.rounded(0.04, 0.24, 0.12, 0.01), kit.metal(), 0.15, 1.15, 1.08, 'call-panel');
  for (const y of [1.2, 1.1]) part(elevator, kit.sphere(10), kit.glow('#ffd98a', 0.9), 0.18, y, 1.08, 'call-button').scale.setScalar(0.018);
  elevator.traverse(object => { object.userData.target = 'elevator'; });

  // Ceiling lamps every few metres, a few warm wall sconces.
  for (let x = -L / 2 + 2; x < L / 2; x += 3.2) {
    part(group, kit.cylinder(0.26, 0.3, 0.05, 24), kit.paint(PALETTE.white, 0.5), x, H - 0.03, 0, 'ceiling-lamp');
    part(group, kit.cylinder(0.22, 0.22, 0.01, 24), kit.glow('#fff1d0', 1.6), x, H - 0.06, 0, 'ceiling-lamp-glow').castShadow = false;
  }

  const doorGroups: T.Group[] = [];
  const bySlot = new Map(doors.map(door => [door.slot, door]));
  for (let slot = 0; slot < HALL_ROOMS_PER_FLOOR; slot++) {
    const door = bySlot.get(slot) ?? { slot, roomNumber: '', state: 'vacant' as const, username: null };
    const at = hallDoorWorld(slot), facing = at.side === 'north' ? 1 : -1;
    const holder = new T.Group(); holder.name = `door-${slot}`; holder.position.set(at.x, 0, at.z); holder.rotation.y = at.side === 'north' ? 0 : Math.PI; group.add(holder);
    const presentation = doorPresentation(door);
    part(holder, kit.box(1.18, 2.3, 0.16), kit.paint(PALETTE.navy, 0.5), 0, 1.15, 0.02, 'door-frame');
    part(holder, kit.rounded(0.96, 2.14, 0.06, 0.012), kit.oak(door.state === 'vacant' ? '#b9ab92' : PALETTE.oak, `door-${door.state}`), 0, 1.07, 0.08, 'door-leaf');
    for (const y of [0.58, 1.5]) part(holder, kit.rounded(0.66, 0.66, 0.012, 0.006), kit.oak(PALETTE.oakDark, 'door-panel'), 0, y, 0.115, 'door-panel');
    part(holder, kit.cylinder(0.02, 0.02, 0.12, 12), kit.metal(), 0.36, 1.02, 0.14, 'door-handle').rotation.x = Math.PI / 2;
    // Room number and name plaque; a lock plate on locked doors.
    const numberTexture = kit.label([{ text: door.roomNumber, size: 110, color: PALETTE.navy, weight: 800 }], 256, 160, PALETTE.cream);
    part(holder, kit.plane(0.3, 0.19), kit.own(new T.MeshStandardMaterial({ map: numberTexture, roughness: 0.5 })), 0, 1.86, 0.12, 'room-number').castShadow = false;
    const name = kit.label([
      { text: presentation.title, size: 58, color: PALETTE.ink, weight: 700 },
      { text: presentation.status, size: 38, color: door.state === 'friend' ? '#2f6f45' : door.state === 'own' ? '#8a6420' : '#5d6266', weight: 600 },
    ], 512, 180, PALETTE.white);
    part(holder, kit.plane(0.62, 0.22), kit.own(new T.MeshStandardMaterial({ map: name, roughness: 0.55 })), 0, 2.5, 0.11, 'name-plaque').castShadow = false;
    part(holder, kit.sphere(10), kit.glow(STATUS_COLOR[door.state], door.state === 'vacant' ? 0.2 : 1.1), 0.36, 1.2, 0.14, 'status-light').scale.setScalar(0.02);
    if (door.state === 'locked' || door.state === 'withheld') part(holder, kit.rounded(0.07, 0.11, 0.02, 0.008), kit.metal('#8e9296', 0.35), 0.36, 0.9, 0.13, 'lock-plate');
    holder.traverse(object => { object.userData.target = 'door'; object.userData.slot = slot; });
    holder.userData.facing = facing;
    doorGroups.push(holder);
  }

  // Noticeboards and benches between doors, plants near the elevator and window.
  const pinned = [PALETTE.cream, '#f6d58e', '#cfe0d4', '#f2c6b4'];
  for (let i = 0; i < HALL_ROOMS_PER_FLOOR / 2 - 1; i++) for (const slot of [i, i + HALL_ROOMS_PER_FLOOR / 2]) {
    const a = hallDoorWorld(slot), b = hallDoorWorld(slot + 1), x = (a.x + b.x) / 2, side = a.side === 'north' ? 1 : -1;
    const board = new T.Group(); board.position.set(x, 0, a.z + side * 0.07); board.rotation.y = a.side === 'north' ? 0 : Math.PI; group.add(board);
    if ((i + (side > 0 ? 0 : 1)) % 2 === 0) {
      part(board, kit.rounded(0.9, 0.62, 0.03, 0.01), kit.oak(PALETTE.oak, 'board-frame'), 0, 1.6, 0, 'noticeboard');
      part(board, kit.box(0.82, 0.54, 0.01), kit.paint('#c79f6e', 0.95), 0, 1.6, 0.017, 'cork');
      for (let k = 0; k < 4; k++) {
        const note = part(board, kit.box(0.17, 0.2, 0.004), kit.paint(pinned[(k + i) % pinned.length], 0.9), -0.28 + k * 0.19, 1.6 + Math.sin(k + i) * 0.1, 0.025, 'notice');
        note.rotation.z = Math.sin(k * 3 + i) * 0.1;
      }
    } else {
      const bench = new T.Group(); bench.position.z = 0.28; board.add(bench);
      part(bench, kit.rounded(0.9, 0.05, 0.36, 0.015), kit.oak(PALETTE.oak, 'bench'), 0, 0.44, 0, 'bench-seat');
      part(bench, kit.rounded(0.84, 0.05, 0.3, 0.02), kit.fabric(PALETTE.sage), 0, 0.485, 0, 'bench-cushion');
      for (const lx of [-0.38, 0.38]) part(bench, kit.rounded(0.05, 0.42, 0.32, 0.01), kit.oak(PALETTE.oakDark, 'bench-leg'), lx, 0.21, 0, 'bench-leg');
      contact(bench, kit, 1, 0.45);
    }
    const sconce = part(board, kit.sphere(12), kit.glow('#ffe1a8', 1.1), 0, 2.25, 0.08, 'sconce');
    sconce.scale.set(0.07, 0.1, 0.05); sconce.castShadow = false;
  }
  for (const [x, z] of [[-L / 2 + 0.6, -W / 2 + 0.5], [-L / 2 + 0.6, W / 2 - 0.5], [L / 2 - 0.5, -W / 2 + 0.5], [L / 2 - 0.5, W / 2 - 0.5]] as [number, number][]) {
    const plant = buildFurniture('dorm-plant', kit, 0.62, 0.62); plant.position.set(x, 0, z); group.add(plant);
  }
  return { group, doors: doorGroups, elevator };
}
