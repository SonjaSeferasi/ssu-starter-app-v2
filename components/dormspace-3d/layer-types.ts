// Contract between the 3D DormSpace controller and its hall/room layers. Type-only imports from the
// engine keep Three.js out of the page bundle until the engine is loaded.
import type { Cell, DormEngine, SceneTarget } from './scene/engine';
import type { DormLive } from '../dormspace/use-dorm-live';
import type { GameRoomData } from '../../lib/game-room';

export type LayerHandlers = {
  onTarget(target: SceneTarget | null): void;
  onInteract(): void;
  onActivate(target: SceneTarget): void;
  onRotate(): void;
  onEscape(): void;
  onCursor(cell: Cell): void;
  onNudge(step: { dx: number; dy: number }): void;
  onPlace(): void;
  onSelectPlaced(itemId: string): void;
  onStandUp(): void;
  blocked(): boolean;
};
export type LayerProps = {
  engine: DormEngine | null;
  live: DormLive;
  self: { username: string; avatar: GameRoomData | null };
  /** The active layer registers its engine handlers here every render. */
  register(handlers: LayerHandlers): void;
  /** Label for the on-screen interact button, or null when nothing is in range. */
  onInteractLabel(label: string | null): void;
  notify(message: string): void;
};
export const noHandlers: LayerHandlers = {
  onTarget() {}, onInteract() {}, onActivate() {}, onRotate() {}, onEscape() {}, onCursor() {}, onNudge() {}, onPlace() {},
  onSelectPlaced() {}, onStandUp() {}, blocked: () => false,
};
