import { placementSize, type CatalogItem, type Placement, type Rotation } from './dormspace-rules';
import type { Position } from './dormspace-movement';

export type RestTarget = {
  kind: 'bed' | 'chair'; itemId: string; name: string;
  x: number; y: number; width: number; height: number; rotation: Rotation;
};
export type RoomTarget = RestTarget | { kind: 'exit' | 'guestbook'; itemId?: never };
export type Resting = { target: RestTarget; returnTo: Position };

export function restTargets(catalog: CatalogItem[], placements: Placement[]): RestTarget[] {
  return placements.flatMap((placement) => {
    const entry = catalog.find((entry) => entry.id === placement.itemId);
    if (entry?.surface !== 'floor') return [];
    const kind = entry.previewKey === 'bed' ? 'bed'
      : ['chair', 'dorm-sofa', 'dorm-armchair'].includes(entry.previewKey) ? 'chair' : null;
    if (!kind) return [];
    return [{ kind, itemId: entry.id, name: entry.name, x: placement.x, y: placement.y, ...placementSize(entry, placement.rotation), rotation: placement.rotation ?? 0 }];
  });
}

export function distanceToFurniture(position: Position, target: Pick<RestTarget, 'x' | 'y' | 'width' | 'height'>) {
  return Math.hypot(
    position.x - Math.max(target.x, Math.min(target.x + target.width - 1, position.x)),
    position.y - Math.max(target.y, Math.min(target.y + target.height - 1, position.y)),
  );
}

// Fixed fixtures are used from the last floor row; the brown strip is outside the walkable area.
export function nearbyRoomTarget(position: Position, targets: RestTarget[], floorHeight: number): RoomTarget | null {
  let nearest: RoomTarget | null = null;
  let distance = Infinity;
  const options: { target: RoomTarget; distance: number; range: number }[] = [
    { target: { kind: 'exit' }, distance: distanceToFurniture(position, { x: 4, y: floorHeight - 1, width: 2, height: 1 }), range: 0.9 },
    { target: { kind: 'guestbook' }, distance: distanceToFurniture(position, { x: 0, y: floorHeight - 1, width: 2, height: 1 }), range: 1.1 },
    ...targets.map((target) => ({ target, distance: distanceToFurniture(position, target), range: 1.1 })),
  ];
  for (const option of options) {
    if (option.distance <= option.range && option.distance < distance) {
      nearest = option.target;
      distance = option.distance;
    }
  }
  return nearest;
}

// Click/tap can start a rest directly. Always keep a clear floor position to return to, including
// when a chair is tucked into a desk or the furniture has no free adjacent square.
export function safeRestExit(position: Position, target: Pick<RestTarget, 'x' | 'y' | 'width' | 'height'>, width: number, height: number, solid: ReadonlySet<string>): Position | null {
  const free = (point: Position) => point.x >= 0 && point.x <= width - 1 && point.y >= 0 && point.y <= height - 1
    && !solid.has(`${Math.round(point.x)},${Math.round(point.y)}`);
  if (free(position) && distanceToFurniture(position, target) <= 1.1) return { ...position };
  const choices: Position[] = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (free({ x, y })) choices.push({ x, y });
  const adjacent = choices.filter((point) => distanceToFurniture(point, target) <= 1.1);
  const candidates = adjacent.length ? adjacent : choices;
  candidates.sort((a, b) => Math.hypot(a.x - position.x, a.y - position.y) - Math.hypot(b.x - position.x, b.y - position.y));
  return candidates[0] ?? null;
}
