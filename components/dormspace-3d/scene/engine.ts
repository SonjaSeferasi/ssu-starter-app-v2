// The DormSpace 3D engine. Loaded lazily (dynamic import) only by the 3D DormSpace page. It owns the
// WebGL renderer and an imperative frame loop outside React; React passes a declarative spec with
// setScene() and receives interaction callbacks. Every GPU resource, listener, observer and frame
// request is released by dispose().
import * as T from 'three';
import {
  CAMERA, CELL, HALL_HEIGHT, HALL_LENGTH, HALL_WIDTH, MAX_FRAME_SECONDS, WALL_HEIGHT,
  cameraRelative, clampDistance, clampOrbitDistance, clampPitch, cursorStep, cutawayWalls, facingFromVector, hallArrival, hallArrivalView,
  hallToWorld, moveInHall, orbitOffset, placementTransform, positionToWorld, restAnchor, roomDims, turnToward, walkSpeed,
  worldToFloorCell, worldToWallCell, yawFromFacing, yawFromVector, nearbyHallTarget,
  type HallTarget, type RoomDims, type Vec2,
} from '../../../lib/dormspace-3d-world';
import { moveInRoom, type Direction, type Position } from '../../../lib/dormspace-movement';
import { roomSolidCells, type CatalogItem, type Dorm, type Placement, type Rotation } from '../../../lib/dormspace-rules';
import { nearbyRoomTarget, restTargets, safeRestExit, type RoomTarget } from '../../../lib/dormspace-interactions';
import { liveAvatarKey, type LiveState } from '../../../lib/dormspace-multiplayer';
import type { HallDoor } from '../../../lib/dormspace-hall-contract';
import type { GameRoomData } from '../../../lib/game-room';
import type { DormLive } from '../../dormspace/use-dorm-live';
import { createDormAvatar, disposeDormAvatar, updateDormAvatarPose, type DormAvatarModel } from '../avatar-model';
import { prefersReducedMotion, type DormAvatarPose } from '../avatar-pose';
import { buildFurniture, setWindowNight, type FurnitureModel } from './furniture';
import { buildHall, type HallScene } from './hall';
import { Kit, PALETTE, contact } from './kit';
import { buildRoomShell, type RoomShell } from './room';

export type SceneTarget = RoomTarget | HallTarget;
export type Arrangement = { placements: Placement[]; wallItemId: string | null; floorItemId: string | null };
export type Ghost = { itemId: string; x: number; y: number; rotation: Rotation; valid: boolean };
export type RoomSpec = {
  kind: 'room'; key: string; dorm: Dorm; arrangement: Arrangement;
  resting: { itemId: string } | null; decorating: boolean; selectedItemId: string | null; ghost: Ghost | null; night: boolean;
};
export type HallSpec = { kind: 'hall'; key: string; floor: number; floorCount: number; doors: HallDoor[]; arrivalSlot: number | null };
export type SceneSpec = (RoomSpec | HallSpec) & { self: { username: string; avatar: GameRoomData | null } };
export type Cell = { surface: 'floor' | 'wall'; x: number; y: number };
export type EngineCallbacks = {
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
  onAvatarNotices(notices: readonly string[]): void;
  onContextLost(): void;
  onContextRestored(): void;
  inputBlocked(): boolean;
};
export type EngineSnapshot = { scene: 'room' | 'hall' | 'none'; x: number; y: number; pose: DormAvatarPose | null; target: string; players: number; drawCalls: number; cameraYaw: number };

type Actor = { model: DormAvatarModel; key: string; position: Vec2; yaw: number; shadow: T.Mesh; label: HTMLDivElement; name: HTMLSpanElement; bubble: HTMLSpanElement };
const KEY_DIRECTIONS: Record<string, Direction> = { w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right' };
const isTyping = (target: EventTarget | null) => target instanceof HTMLElement && !!target.closest('input, textarea, select, [contenteditable="true"], [data-dormspace-modal]');
const targetKey = (target: SceneTarget | null) => !target ? '' : target.kind === 'door' ? `door:${target.slot}` : 'itemId' in target && target.itemId ? `${target.kind}:${target.itemId}` : target.kind;
/** Hall shadow camera half-extents around the player; re-centred only after the player moves this far. */
const HALL_SHADOW = { left: -7, right: 7, top: 5, bottom: -5 };
const SHADOW_RECENTRE_METRES = 0.75;

/** Thrown when the browser cannot create the WebGL2 context the renderer needs (the recoverable "unsupported" state). */
export class WebGLUnavailableError extends Error {
  constructor(cause: unknown) { super('WebGL is not available in this browser.'); this.name = 'WebGLUnavailableError'; (this as { cause?: unknown }).cause = cause; }
}
/** Software rasterisers (SwiftShader, llvmpipe, WARP) are far slower than a GPU; render them at a lower rate. */
function softwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext) {
  try {
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '');
    return /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i.test(name);
  } catch { return false; }
}

export class DormEngine {
  private renderer: T.WebGLRenderer;
  private scene = new T.Scene();
  private camera = new T.PerspectiveCamera(48, 1, 0.05, 80);
  private hemi = new T.HemisphereLight('#fff6e8', '#b9a68a', 1.15);
  private sun = new T.DirectionalLight('#fff0da', 2.1);
  private lamp = new T.PointLight('#ffd9a0', 0.8, 9, 1.6);
  private raycaster = new T.Raycaster();
  private sceneKit: Kit | null = null;
  /** Resources for player contact shadows, which outlive any one room or hall. */
  private actorKit = new Kit();
  private world = new T.Group();
  private room: { shell: RoomShell; dims: RoomDims; models: Map<string, { model: FurnitureModel; signature: string }>; solid: ReadonlySet<string>; arrangementKey: string } | null = null;
  private hall: { scene: HallScene; doorsKey: string } | null = null;
  private ghost: { model: FurnitureModel; signature: string } | null = null;
  private selection: T.BoxHelper | null = null;
  private grid: T.Mesh | null = null;
  private spec: SceneSpec | null = null;
  private local: { position: Position; yaw: number; facing: Direction; moving: boolean; sprinting: boolean } = { position: { x: 4, y: 6 }, yaw: Math.PI, facing: 'up', moving: false, sprinting: false };
  private self: Actor | null = null;
  private remotes = new Map<string, Actor>();
  private live: DormLive | null = null;
  private liveCleanup: (() => void) | null = null;
  private keys = new Map<string, Direction>();
  private stick = { right: 0, forward: 0 };
  private shiftHeld = false;
  private runToggle = false;
  private cam = { yaw: 0, pitch: CAMERA.defaultPitch, distance: CAMERA.defaultDistance, target: new T.Vector3(), ready: false };
  private pointers = new Map<number, { x: number; y: number; startX: number; startY: number; dragged: boolean }>();
  private pinch = 0;
  private frame = 0;
  private last = 0;
  private lost = false;
  private disposed = false;
  private currentTarget = '';
  private standRequested = false;
  private observer: ResizeObserver;
  private cleanups: (() => void)[] = [];
  private labelLayer: HTMLDivElement;
  private reducedMotion = prefersReducedMotion();
  private tmp = new T.Vector3();
  private goal = new T.Vector3();
  private shadowCentre: Vec2 | null = null;
  private night = false;
  /** Minimum milliseconds between rendered frames (movement still uses real elapsed time). */
  private minFrameMs: number;

  constructor(private host: HTMLElement, private callbacks: EngineCallbacks) {
    // Creating the renderer is the WebGL2 check: there is no separate probe context. Failure throws
    // WebGLUnavailableError and the React controller shows the recoverable fallback.
    let renderer: T.WebGLRenderer;
    try { renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
    catch (error) { throw new WebGLUnavailableError(error); }
    this.renderer = renderer;
    const small = Math.min(window.innerWidth, window.innerHeight) < 700;
    const software = softwareRenderer(renderer.getContext());
    // Software rendering and small (usually battery-powered) screens: 30 fps and 1× pixels; otherwise ≤ 60 fps.
    this.minFrameMs = software || small ? 1000 / 30 : 1000 / 60;
    this.renderer.setPixelRatio(software ? 1 : Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = T.PCFShadowMap;
    const canvas = this.renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true'); canvas.style.touchAction = 'none'; canvas.style.display = 'block';
    canvas.dataset.dormspaceCanvas = '';
    host.appendChild(canvas);
    this.labelLayer = document.createElement('div');
    this.labelLayer.className = 'dormspace3d-labels'; this.labelLayer.setAttribute('aria-hidden', 'true');
    Object.assign(this.labelLayer.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden' });
    host.appendChild(this.labelLayer);

    this.scene.background = new T.Color('#e9e1d2');
    this.scene.fog = new T.Fog('#e9e1d2', 18, 40);
    this.scene.add(this.hemi, this.sun, this.sun.target, this.lamp, this.world);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(1024, 1024); this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.02;
    Object.assign(this.sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 30 });
    this.sun.shadow.camera.updateProjectionMatrix();

    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(host); this.resize();
    this.listen(canvas, 'webglcontextlost', (event: Event) => { event.preventDefault(); this.lost = true; this.stopLoop(); this.callbacks.onContextLost(); });
    this.listen(canvas, 'webglcontextrestored', () => { this.callbacks.onContextRestored(); });
    this.listen(canvas, 'pointerdown', (event: PointerEvent) => this.pointerDown(event));
    this.listen(canvas, 'pointermove', (event: PointerEvent) => this.pointerMove(event));
    this.listen(canvas, 'pointerup', (event: PointerEvent) => this.pointerUp(event));
    this.listen(canvas, 'pointercancel', (event: PointerEvent) => { this.pointers.delete(event.pointerId); this.pinch = 0; });
    this.listen(canvas, 'wheel', (event: WheelEvent) => { event.preventDefault(); this.cam.distance = clampDistance(this.cam.distance * Math.exp(event.deltaY * 0.0012)); }, { passive: false });
    this.listen(canvas, 'contextmenu', (event: Event) => event.preventDefault());
    this.listen(window, 'keydown', (event: KeyboardEvent) => this.keyDown(event));
    this.listen(window, 'keyup', (event: KeyboardEvent) => this.keyUp(event));
    this.listen(window, 'blur', () => this.releaseInput());
    // A hidden tab renders nothing; the loop restarts with fresh timing when it is shown again.
    this.listen(document, 'visibilitychange', () => { if (document.visibilityState === 'hidden') { this.releaseInput(); this.stopLoop(); } else this.startLoop(); });
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (motion) this.listen(motion, 'change', () => { this.reducedMotion = motion.matches; });
    this.startLoop();
  }

  private startLoop() {
    if (this.disposed || this.lost || this.frame || document.visibilityState === 'hidden') return;
    this.last = 0;
    this.frame = requestAnimationFrame(this.tick);
  }
  private stopLoop() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0; this.last = 0;
  }

  private listen<E extends Event>(target: EventTarget, type: string, handler: (event: E) => void, options?: AddEventListenerOptions) {
    const listener = handler as EventListener;
    target.addEventListener(type, listener, options);
    this.cleanups.push(() => target.removeEventListener(type, listener, options));
  }

  // ---- Public API used by the React controller ----
  setLive(live: DormLive | null) {
    if (live === this.live) return;
    this.liveCleanup?.(); this.liveCleanup = null; this.live = live;
    this.clearRemotes();
    if (live) {
      // Server corrections (rejoin at the entrance, furniture moved) move the local player.
      const unsubscribe = live.onCorrection(position => { this.local.position = { ...position }; });
      this.liveCleanup = unsubscribe;
    }
  }
  getPosition(): Position { return { ...this.local.position }; }
  setPosition(position: Position) { this.local.position = { ...position }; this.publishLocal(); }
  setStick(right: number, forward: number) { this.stick = { right: Math.max(-1, Math.min(1, right)), forward: Math.max(-1, Math.min(1, forward)) }; }
  setRun(on: boolean) { this.runToggle = on; }
  rotateCamera(radians: number) { this.cam.yaw += radians; }
  zoomCamera(factor: number) { this.cam.distance = clampDistance(this.cam.distance * factor); }
  get running() { return this.runToggle || this.shiftHeld; }

  setScene(spec: SceneSpec) {
    if (this.disposed) return;
    const previous = this.spec;
    const changedPlace = !previous || previous.kind !== spec.kind || previous.key !== spec.key;
    this.spec = spec;
    this.ensureSelf(spec.self.avatar);
    if (changedPlace) this.enterPlace(spec);
    if (spec.kind === 'room') this.syncRoom(spec); else this.syncHall(spec);
  }

  snapshot(): EngineSnapshot {
    return {
      scene: this.spec?.kind ?? 'none', x: Number(this.local.position.x.toFixed(2)), y: Number(this.local.position.y.toFixed(2)),
      pose: this.self?.model.pose ?? null, target: this.currentTarget, players: this.remotes.size,
      drawCalls: this.renderer.info.render.calls, cameraYaw: Number(this.cam.yaw.toFixed(2)),
    };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stopLoop();
    this.observer.disconnect();
    this.cleanups.forEach(cleanup => cleanup()); this.cleanups = [];
    this.liveCleanup?.(); this.liveCleanup = null;
    this.clearRemotes();
    if (this.self) { this.disposeActor(this.self); this.self = null; }
    this.clearPlace();
    this.actorKit.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.labelLayer.remove();
  }

  // ---- Scene construction ----
  private clearPlace() {
    if (this.selection) { this.selection.geometry.dispose(); (this.selection.material as T.Material).dispose(); this.selection.removeFromParent(); this.selection = null; }
    this.ghost?.model.removeFromParent(); this.ghost = null;
    this.grid?.removeFromParent(); this.grid = null;
    this.world.clear();
    this.sceneKit?.dispose(); this.sceneKit = null;
    this.room = null; this.hall = null;
  }

  private enterPlace(spec: SceneSpec) {
    this.clearPlace();
    this.clearRemotes();
    this.sceneKit = new Kit(Math.min(8, this.renderer.capabilities.getMaxAnisotropy()));
    this.releaseInput();
    this.currentTarget = ''; this.callbacks.onTarget(null);
    if (spec.kind === 'room') {
      const dims = roomDims(spec.dorm.surfaces);
      const shell = buildRoomShell(this.sceneKit, dims);
      this.world.add(shell.group);
      this.room = { shell, dims, models: new Map(), solid: new Set(), arrangementKey: '' };
      // Arrive on the entrance cells, facing into the room (the live join applies the same rule).
      const entrance = spec.dorm.reserved.filter(cell => cell.surface === 'floor').sort((a, b) => Math.abs(a.x - (dims.columns - 1) / 2) - Math.abs(b.x - (dims.columns - 1) / 2))[0];
      this.local.position = entrance ? { x: entrance.x, y: entrance.y } : { x: Math.min(4, dims.columns - 1), y: dims.rows - 1 };
      this.local.yaw = Math.PI; this.local.facing = 'up';
      this.cam.yaw = 0; this.cam.pitch = CAMERA.defaultPitch; this.cam.distance = 4.2;
      this.scene.fog = null; this.scene.background = new T.Color('#e6ddcc');
      this.lamp.position.set(0, WALL_HEIGHT - 0.4, dims.floorDepth / 2);
      this.sun.position.set(-2.5, 6, -4); this.sun.target.position.set(0, 0, dims.floorDepth / 2);
      Object.assign(this.sun.shadow.camera, { left: -dims.width / 2 - 1, right: dims.width / 2 + 1, top: dims.depth + 1, bottom: -1.5 });
      this.sun.shadow.camera.updateProjectionMatrix();
    } else {
      // Arrive beside the right door (or the elevator), looking down the corridor rather than across it.
      this.local.position = hallArrival(spec.arrivalSlot);
      const view = hallArrivalView(spec.arrivalSlot);
      this.local.yaw = view.yaw; this.cam.yaw = view.cameraYaw;
      this.cam.pitch = 0.3; this.cam.distance = 3.8;
      this.scene.background = new T.Color('#e9e1d2'); this.scene.fog = new T.Fog('#e9e1d2', 14, 34);
      // The hall shadow frustum has a fixed size; only its centre follows the player (updateCamera).
      Object.assign(this.sun.shadow.camera, HALL_SHADOW);
      this.sun.shadow.camera.updateProjectionMatrix();
      this.shadowCentre = null;
    }
    this.local.facing = facingFromVector({ x: Math.sin(this.local.yaw), z: Math.cos(this.local.yaw) });
    this.cam.ready = false;
    if (this.self) { this.self.position = this.worldOf(this.local.position); this.world.add(this.self.model.root, this.self.shadow); }
    this.publishLocal();
  }

  private syncHall(spec: HallSpec & { self: SceneSpec['self'] }) {
    const doorsKey = JSON.stringify([spec.floor, spec.floorCount, spec.doors]);
    if (this.hall?.doorsKey === doorsKey || !this.sceneKit) return;
    if (this.hall) { this.hall.scene.group.removeFromParent(); this.sceneKit.dispose(); this.sceneKit = new Kit(Math.min(8, this.renderer.capabilities.getMaxAnisotropy())); }
    const scene = buildHall(this.sceneKit, spec.floor, spec.floorCount, spec.doors);
    this.world.add(scene.group);
    this.hall = { scene, doorsKey };
    this.lamp.position.set(0, HALL_HEIGHT - 0.3, 0);
    this.applyLighting(false);
  }

  private syncRoom(spec: RoomSpec & { self: SceneSpec['self'] }) {
    const room = this.room, kit = this.sceneKit;
    if (!room || !kit) return;
    const { dorm, arrangement } = spec;
    const item = (id: string | null) => dorm.catalog.find(entry => entry.id === id);
    room.shell.setAppearance(item(arrangement.wallItemId)?.previewKey ?? 'wall-sage', item(arrangement.floorItemId)?.previewKey ?? 'floor-oak');
    const arrangementKey = JSON.stringify(arrangement.placements);
    if (arrangementKey !== room.arrangementKey) {
      room.arrangementKey = arrangementKey;
      const seen = new Set<string>();
      for (const placement of arrangement.placements) {
        const entry = item(placement.itemId);
        if (!entry?.surface) continue;
        seen.add(entry.id);
        const transform = placementTransform(entry, placement, room.dims);
        const width = (entry.width ?? 1) * CELL, depth = entry.surface === 'wall' ? (entry.height ?? 1) * room.dims.wallCell : (entry.height ?? 1) * CELL;
        let record = room.models.get(entry.id);
        const signature = `${entry.previewKey}|${width}|${depth}`;
        if (!record || record.signature !== signature) {
          record?.model.removeFromParent();
          const model = buildFurniture(entry.previewKey, kit, width, depth, { night: spec.night });
          model.traverse(object => { object.userData.itemId = entry.id; });
          record = { model, signature }; room.models.set(entry.id, record); this.world.add(model);
        }
        record.model.position.set(transform.x, transform.y, transform.z + (transform.surface === 'wall' ? 0.005 : 0));
        record.model.rotation.y = transform.yaw;
      }
      for (const [id, record] of room.models) if (!seen.has(id)) { record.model.removeFromParent(); room.models.delete(id); }
      room.solid = roomSolidCells(dorm.catalog, arrangement.placements, room.dims.rows, room.dims.columns);
      // Furniture moved or turned onto the player: step to the nearest clear floor cell.
      const p = this.local.position;
      if (!spec.resting && room.solid.has(`${Math.round(p.x)},${Math.round(p.y)}`)) {
        const clear = safeRestExit(p, { x: Math.round(p.x), y: Math.round(p.y), width: 1, height: 1 }, room.dims.columns, room.dims.rows, room.solid);
        if (clear) { this.local.position = clear; this.publishLocal(); }
      }
    }
    if (spec.night !== this.night || !this.hall) {
      for (const record of room.models.values()) setWindowNight(record.model, kit, spec.night);
      room.shell.setNight(spec.night);
      this.applyLighting(spec.night);
    }
    this.syncDecorating(spec, kit);
  }

  private applyLighting(night: boolean) {
    this.night = night;
    this.hemi.intensity = night ? 0.32 : 1.15;
    this.hemi.color.set(night ? '#8ea0c8' : '#fff6e8');
    this.sun.intensity = night ? 0.25 : 2.1;
    this.sun.color.set(night ? '#9fb3e0' : '#fff0da');
    this.lamp.intensity = night ? 1.6 : 0.7;
    this.renderer.toneMappingExposure = night ? 0.95 : 1.02;
  }

  private syncDecorating(spec: RoomSpec, kit: Kit) {
    const room = this.room!;
    // Floor grid with reserved entrance cells while decorating.
    if (spec.decorating && !this.grid) {
      const { columns, rows } = room.dims;
      const texture = kit.texture(`grid-${columns}x${rows}`, 512, (ctx, size) => {
        ctx.clearRect(0, 0, size, size);
        ctx.strokeStyle = 'rgba(40,62,92,0.55)'; ctx.lineWidth = 2;
        for (let x = 0; x <= columns; x++) { ctx.beginPath(); ctx.moveTo((x / columns) * size, 0); ctx.lineTo((x / columns) * size, size); ctx.stroke(); }
        for (let y = 0; y <= rows; y++) { ctx.beginPath(); ctx.moveTo(0, (y / rows) * size); ctx.lineTo(size, (y / rows) * size); ctx.stroke(); }
        ctx.fillStyle = 'rgba(190,80,60,0.28)';
        for (const cell of spec.dorm.reserved) if (cell.surface === 'floor') ctx.fillRect((cell.x / columns) * size, (cell.y / rows) * size, size / columns, size / rows);
      });
      const material = kit.material('grid', () => new T.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
      this.grid = new T.Mesh(kit.plane(room.dims.width, room.dims.floorDepth), material);
      this.grid.rotation.x = -Math.PI / 2; this.grid.position.set(0, 0.02, room.dims.floorDepth / 2); this.grid.renderOrder = 2;
      this.world.add(this.grid);
    } else if (!spec.decorating && this.grid) { this.grid.removeFromParent(); this.grid = null; }

    // Translucent green/red ghost at the candidate cell.
    const ghost = spec.decorating ? spec.ghost : null;
    const entry = ghost ? spec.dorm.catalog.find(item => item.id === ghost.itemId) : undefined;
    if (!ghost || !entry?.surface) { this.ghost?.model.removeFromParent(); this.ghost = null; }
    else {
      const width = (entry.width ?? 1) * CELL, depth = entry.surface === 'wall' ? (entry.height ?? 1) * room.dims.wallCell : (entry.height ?? 1) * CELL;
      const signature = `${entry.id}|${ghost.valid}`;
      if (this.ghost?.signature !== signature) {
        this.ghost?.model.removeFromParent();
        const model = buildFurniture(entry.previewKey, kit, width, depth, { night: spec.night });
        const material = kit.material(`ghost|${ghost.valid}`, () => new T.MeshStandardMaterial({
          color: ghost.valid ? '#58b26f' : '#d0544a', emissive: ghost.valid ? '#2f7a45' : '#8c2a22', emissiveIntensity: 0.5,
          transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.6 }));
        model.traverse(object => { if (object instanceof T.Mesh) { object.material = material; object.castShadow = false; if (object.name === 'contact-shadow') object.visible = false; } });
        model.userData.ghost = true;
        this.ghost = { model, signature }; this.world.add(model);
      }
      const transform = placementTransform(entry, { itemId: entry.id, x: ghost.x, y: ghost.y, rotation: ghost.rotation }, room.dims);
      this.ghost!.model.position.set(transform.x, transform.y + (transform.surface === 'floor' ? 0.01 : 0), transform.z + (transform.surface === 'wall' ? 0.03 : 0));
      this.ghost!.model.rotation.y = transform.yaw;
    }

    // Outline the placed item being moved.
    const selected = spec.decorating && spec.selectedItemId ? room.models.get(spec.selectedItemId)?.model : undefined;
    if (!selected && this.selection) { this.selection.geometry.dispose(); (this.selection.material as T.Material).dispose(); this.selection.removeFromParent(); this.selection = null; }
    if (selected) {
      if (!this.selection) { this.selection = new T.BoxHelper(selected, PALETTE.brass); this.world.add(this.selection); }
      this.selection.setFromObject(selected);
    }
  }

  // ---- Avatars ----
  private makeActor(avatar: GameRoomData | null | undefined, name: string, self: boolean): Actor {
    const model = createDormAvatar(avatar ?? null);
    const shadow = contact(new T.Group(), this.actorKit, 0.62, 0.62);
    shadow.removeFromParent();
    const label = document.createElement('div');
    Object.assign(label.style, { position: 'absolute', left: '0', top: '0', transform: 'translate(-9999px,-9999px)', display: 'grid', justifyItems: 'center', gap: '4px', willChange: 'transform' });
    label.className = 'dormspace3d-label';
    const bubble = document.createElement('span'); bubble.className = 'dormspace3d-bubble'; bubble.hidden = true;
    const tag = document.createElement('span'); tag.className = self ? 'dormspace3d-name dormspace3d-self' : 'dormspace3d-name';
    tag.textContent = self ? `${name} · you` : name;
    label.append(bubble, tag); this.labelLayer.appendChild(label);
    return { model, key: '', position: { x: 0, z: 0 }, yaw: 0, shadow, label, name: tag, bubble };
  }
  private disposeActor(actor: Actor) {
    disposeDormAvatar(actor.model);
    actor.shadow.removeFromParent();
    actor.label.remove();
  }
  private ensureSelf(avatar: GameRoomData | null) {
    const key = JSON.stringify(avatar?.appearance ?? null) + (avatar ? liveAvatarKey(avatar) : '');
    const name = this.spec?.self.username ?? '';
    if (this.self && this.self.key === key) { if (this.self.name.textContent !== `${name} · you`) this.self.name.textContent = `${name} · you`; return; }
    const previous = this.self;
    this.self = this.makeActor(avatar, name, true); this.self.key = key;
    this.self.position = this.worldOf(this.local.position); this.self.yaw = this.local.yaw;
    if (previous) this.disposeActor(previous);
    this.world.add(this.self.model.root, this.self.shadow);
    this.callbacks.onAvatarNotices(this.self.model.notices);
  }
  private clearRemotes() {
    for (const actor of this.remotes.values()) this.disposeActor(actor);
    this.remotes.clear();
  }

  private worldOf(position: Position): Vec2 {
    if (this.spec?.kind === 'room' && this.room) return positionToWorld(position, this.room.dims);
    return hallToWorld(position);
  }

  private anchorFor(itemId: string | null | undefined) {
    if (!itemId || this.spec?.kind !== 'room' || !this.room) return null;
    const placement = this.spec.arrangement.placements.find(p => p.itemId === itemId);
    const entry = this.spec.dorm.catalog.find(item => item.id === itemId);
    return placement && entry ? restAnchor(entry, placement, this.room.dims) : null;
  }

  private placeActor(actor: Actor, state: { position: Vec2; yaw: number; moving: boolean; sprinting: boolean; restItemId: string | null }, time: number) {
    const anchor = this.anchorFor(state.restItemId);
    const root = actor.model.root;
    let pose: DormAvatarPose = state.moving ? state.sprinting ? 'run' : 'walk' : 'idle';
    let labelY = actor.model.height + 0.28;
    if (anchor) {
      root.position.set(anchor.x, 0, anchor.z); root.rotation.y = anchor.yaw; pose = anchor.pose;
      updateDormAvatarPose(actor.model, pose, time, { reducedMotion: this.reducedMotion, seatHeight: anchor.seatHeight, bedHeight: anchor.bedHeight });
      labelY = anchor.pose === 'sleep' ? anchor.bedHeight + 0.55 : anchor.seatHeight + actor.model.height * 0.62;
      actor.shadow.visible = false;
    } else {
      root.position.set(state.position.x, 0, state.position.z); root.rotation.y = state.yaw;
      updateDormAvatarPose(actor.model, pose, time, { reducedMotion: this.reducedMotion });
      actor.shadow.visible = true; actor.shadow.position.set(state.position.x, 0.005, state.position.z);
    }
    // Screen-space label (name and speech bubble) above the head.
    this.tmp.set(root.position.x, labelY, root.position.z).project(this.camera);
    const visible = this.tmp.z < 1 && Math.abs(this.tmp.x) < 1.2 && Math.abs(this.tmp.y) < 1.2;
    if (!visible) { actor.label.style.transform = 'translate(-9999px,-9999px)'; return; }
    const width = this.host.clientWidth, height = this.host.clientHeight;
    const x = (this.tmp.x * 0.5 + 0.5) * width, y = (-this.tmp.y * 0.5 + 0.5) * height;
    actor.label.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
  }

  // ---- Input ----
  private keyDown(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (isTyping(event.target) || this.callbacks.inputBlocked()) return;
    const key = event.key.toLowerCase();
    if (key === 'shift') { this.shiftHeld = true; return; }
    const spec = this.spec;
    const placing = spec?.kind === 'room' && spec.decorating && !!spec.ghost;
    const direction = KEY_DIRECTIONS[key];
    if (direction) {
      // Arrow keys/WASD move the placement cursor while an item is being placed; otherwise the player.
      if (placing) { event.preventDefault(); this.callbacks.onNudge(cursorStep(direction, this.cam.yaw)); return; }
      if (event.target instanceof HTMLButtonElement && key.startsWith('arrow')) return;
      event.preventDefault();
      this.keys.set(event.code || key, direction);
      return;
    }
    if (event.repeat) return;
    if (key === 'e') { event.preventDefault(); this.callbacks.onInteract(); }
    else if (key === 'r' && spec?.kind === 'room' && spec.decorating) { event.preventDefault(); this.callbacks.onRotate(); }
    else if (key === 'enter' && placing && !(event.target instanceof HTMLButtonElement)) { event.preventDefault(); this.callbacks.onPlace(); }
    else if (key === 'escape') this.callbacks.onEscape();
    else if (key === 'q') this.rotateCamera(Math.PI / 8);
    else if (key === 'z') this.rotateCamera(-Math.PI / 8);
  }
  private keyUp(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if (key === 'shift') { this.shiftHeld = false; return; }
    this.keys.delete(event.code || key);
  }
  private releaseInput() { this.keys.clear(); this.shiftHeld = false; this.stick = { right: 0, forward: 0 }; this.pointers.clear(); this.pinch = 0; }

  private pointerDown(event: PointerEvent) {
    this.renderer.domElement.setPointerCapture?.(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, dragged: false });
    if (this.pointers.size === 2) { const [a, b] = [...this.pointers.values()]; this.pinch = Math.hypot(a.x - b.x, a.y - b.y); }
  }
  private pointerMove(event: PointerEvent) {
    const pointer = this.pointers.get(event.pointerId);
    if (!pointer) { if (event.pointerType === 'mouse') this.hover(event); return; }
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    pointer.x = event.clientX; pointer.y = event.clientY;
    if (Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 6) pointer.dragged = true;
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()], distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinch) this.cam.distance = clampDistance(this.cam.distance * (this.pinch / Math.max(1, distance)));
      this.pinch = distance; return;
    }
    if (pointer.dragged) {
      // Orbit drag (mouse or one finger on the canvas).
      this.cam.yaw -= dx * 0.0065;
      this.cam.pitch = clampPitch(this.cam.pitch + dy * 0.005);
    } else if (event.pointerType === 'mouse') this.hover(event);
  }
  private pointerUp(event: PointerEvent) {
    const pointer = this.pointers.get(event.pointerId);
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinch = 0;
    if (!pointer || pointer.dragged || event.button > 0) return;
    this.click(event);
  }
  private ray(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(new T.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1), this.camera);
    return this.raycaster.ray;
  }
  /** Floor or back-wall cell under the pointer, from the mathematical planes (not meshes). */
  private cellAt(event: PointerEvent, surface: 'floor' | 'wall'): Cell | null {
    if (!this.room) return null;
    const ray = this.ray(event), point = new T.Vector3();
    if (surface === 'floor') {
      if (!ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), point)) return null;
      const cell = worldToFloorCell({ x: point.x, z: point.z }, this.room.dims);
      return cell && { surface, ...cell };
    }
    if (!ray.intersectPlane(new T.Plane(new T.Vector3(0, 0, 1), 0), point)) return null;
    const cell = worldToWallCell(point.x, point.y, this.room.dims);
    return cell && { surface, ...cell };
  }
  private ghostSurface(): 'floor' | 'wall' | null {
    const spec = this.spec;
    if (spec?.kind !== 'room' || !spec.decorating || !spec.ghost) return null;
    return (spec.dorm.catalog.find(item => item.id === spec.ghost!.itemId)?.surface as 'floor' | 'wall' | undefined) ?? null;
  }
  private hover(event: PointerEvent) {
    const surface = this.ghostSurface();
    if (!surface) return;
    const cell = this.cellAt(event, surface);
    if (cell) this.callbacks.onCursor(this.topLeftFor(cell));
  }
  /** Pointer cell is the item's centre; convert to the top-left cell that placements store. */
  private topLeftFor(cell: Cell): Cell {
    const spec = this.spec as RoomSpec;
    const entry = spec.dorm.catalog.find(item => item.id === spec.ghost?.itemId);
    if (!entry) return cell;
    const rotated = entry.surface === 'floor' && (spec.ghost!.rotation === 90 || spec.ghost!.rotation === 270);
    const width = (rotated ? entry.height : entry.width) ?? 1, height = (rotated ? entry.width : entry.height) ?? 1;
    return { surface: cell.surface, x: cell.x - Math.floor((width - 1) / 2), y: cell.y - Math.floor((height - 1) / 2) };
  }
  private click(event: PointerEvent) {
    const spec = this.spec;
    if (!spec) return;
    const surface = this.ghostSurface();
    if (surface) {
      const cell = this.cellAt(event, surface);
      if (cell) { this.callbacks.onCursor(this.topLeftFor(cell)); this.callbacks.onPlace(); }
      return;
    }
    this.raycaster.ray.copy(this.ray(event));
    const hits = this.raycaster.intersectObjects(this.world.children, true);
    for (const hit of hits) {
      const data = hit.object.userData;
      // Cut-away walls are invisible but still in the scene graph; ghosts and shadows are never targets.
      let hidden = false, ghost = false;
      for (let node: T.Object3D | null = hit.object; node; node = node.parent) { if (!node.visible) hidden = true; if (node.userData.ghost) ghost = true; }
      if (hidden || ghost || hit.object.name === 'contact-shadow') continue;
      if (spec.kind === 'room') {
        if (spec.decorating) { if (data.itemId) { this.callbacks.onSelectPlaced(data.itemId); return; } continue; }
        if (data.target === 'guestbook' || data.target === 'exit') { this.callbacks.onActivate({ kind: data.target }); return; }
        if (data.itemId) {
          const target = restTargets(spec.dorm.catalog, spec.arrangement.placements).find(t => t.itemId === data.itemId);
          if (target) { this.callbacks.onActivate(target); return; }
        }
        if (data.surface) return;
      } else {
        if (data.target === 'door') { this.callbacks.onActivate({ kind: 'door', slot: data.slot as number }); return; }
        if (data.target === 'elevator') { this.callbacks.onActivate({ kind: 'elevator' }); return; }
      }
    }
  }

  // ---- Frame loop ----
  private resize() {
    const width = this.host.clientWidth, height = this.host.clientHeight;
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = '100%'; this.renderer.domElement.style.height = '100%';
    this.camera.aspect = width / height; this.camera.fov = width < height ? 60 : 48; this.camera.updateProjectionMatrix();
  }

  private publishLocal() {
    if (!this.live) return;
    const restItemId = this.spec?.kind === 'room' ? this.spec.resting?.itemId ?? null : null;
    const state: Partial<LiveState> = { x: this.local.position.x, y: this.local.position.y, facing: this.local.facing, moving: this.local.moving, sprinting: this.local.sprinting, restItemId };
    this.live.setLocal(state);
  }

  private step(dt: number) {
    const spec = this.spec;
    if (!spec || !this.self) return;
    const keys = [...this.keys.values()];
    const blocked = this.callbacks.inputBlocked();
    let right = this.stick.right + (keys.includes('right') ? 1 : 0) - (keys.includes('left') ? 1 : 0);
    let forward = this.stick.forward + (keys.includes('up') ? 1 : 0) - (keys.includes('down') ? 1 : 0);
    if (blocked) { right = 0; forward = 0; }
    const direction = cameraRelative({ right, forward }, this.cam.yaw);
    const wants = Math.hypot(direction.x, direction.z) > 0.05;
    const resting = spec.kind === 'room' && !!spec.resting;
    if (resting) {
      // Moving stands up (or wakes) first; React clears the rest and returns a clear position.
      if (wants && !this.standRequested) { this.standRequested = true; this.callbacks.onStandUp(); }
      this.local.moving = false;
    } else {
      this.standRequested = false;
      const sprinting = this.running && wants, distance = walkSpeed(sprinting) * dt;
      const delta = { x: direction.x * distance, z: direction.z * distance };
      const before = this.local.position;
      if (wants) {
        if (spec.kind === 'room' && this.room) {
          // SRS-504.7 / SRS-504.8 (revised): stay on the floor grid and collide with raised furniture.
          this.local.position = moveInRoom(before, { x: delta.x / CELL, y: delta.z / CELL }, this.room.dims.columns, this.room.dims.rows - 1, this.room.solid);
        } else this.local.position = moveInHall(before, delta);
        this.local.yaw = turnToward(this.local.yaw, yawFromVector(direction), this.reducedMotion ? 1 : 1 - Math.exp(-dt * 14));
        this.local.facing = facingFromVector(direction, this.local.facing);
      }
      this.local.moving = wants && (before.x !== this.local.position.x || before.y !== this.local.position.y);
      this.local.sprinting = sprinting && this.local.moving;
    }
    this.publishLocal();
    // Nearby interaction target.
    let target: SceneTarget | null;
    if (spec.kind === 'room' && this.room) target = nearbyRoomTarget(this.local.position, spec.decorating ? [] : restTargets(spec.dorm.catalog, spec.arrangement.placements), this.room.dims.rows);
    else target = nearbyHallTarget(this.local.position);
    const key = targetKey(target);
    if (key !== this.currentTarget) { this.currentTarget = key; this.callbacks.onTarget(target); }
  }

  private updateRemotes(time: number, dt: number) {
    const live = this.live, store = live?.store;
    if (!store) return;
    const selfId = store.getUI().selfId, seen = new Set<string>();
    for (const [id, player] of store.players) {
      if (id === selfId || player.space !== store.space) continue;
      seen.add(id);
      let actor = this.remotes.get(id);
      const key = liveAvatarKey(player.avatar);
      if (!actor || actor.key !== key) {
        const previous = actor;
        actor = this.makeActor(player.avatar, player.username, false); actor.key = key;
        actor.position = this.worldOf(player.state); actor.yaw = yawFromFacing[player.state.facing];
        if (previous) this.disposeActor(previous);
        this.remotes.set(id, actor); this.world.add(actor.model.root, actor.shadow);
      }
      if (actor.name.textContent !== player.username) actor.name.textContent = player.username;
      // Interpolate toward the latest server position; snap after long gaps.
      const goal = this.worldOf(player.state), gap = Math.hypot(goal.x - actor.position.x, goal.z - actor.position.z);
      const alpha = gap > 3 ? 1 : 1 - Math.exp(-dt / 0.085);
      if (gap > 0.01) {
        const heading = yawFromVector({ x: goal.x - actor.position.x, z: goal.z - actor.position.z });
        actor.yaw = turnToward(actor.yaw, gap > 0.05 ? heading : yawFromFacing[player.state.facing], 1 - Math.exp(-dt * 12));
      } else actor.yaw = turnToward(actor.yaw, yawFromFacing[player.state.facing], 1 - Math.exp(-dt * 8));
      actor.position = { x: actor.position.x + (goal.x - actor.position.x) * alpha, z: actor.position.z + (goal.z - actor.position.z) * alpha };
      const visual = store.getVisual(id);
      this.placeActor(actor, { position: actor.position, yaw: actor.yaw, moving: !!visual?.moving && gap > 0.02, sprinting: !!visual?.sprinting, restItemId: player.state.restItemId }, time);
      const speech = visual?.speech?.text ?? '';
      if (actor.bubble.textContent !== speech) { actor.bubble.textContent = speech; actor.bubble.hidden = !speech; }
    }
    for (const [id, actor] of this.remotes) if (!seen.has(id)) { this.disposeActor(actor); this.remotes.delete(id); }
    // Own speech bubble from the server echo.
    if (this.self) {
      const speech = store.getVisual(selfId)?.speech?.text ?? '';
      if (this.self.bubble.textContent !== speech) { this.self.bubble.textContent = speech; this.self.bubble.hidden = !speech; }
    }
  }

  private updateCamera(dt: number) {
    const spec = this.spec, self = this.self;
    if (!spec || !self) return;
    const sleeping = self.model.pose === 'sleep', root = self.model.root.position;
    const goal = this.goal.set(root.x, sleeping ? 0.9 : self.model.pose === 'sit' ? 0.95 : CAMERA.targetHeight, root.z);
    // Over-the-shoulder offset to the camera's right while exploring.
    if (!(spec.kind === 'room' && spec.decorating)) { goal.x += Math.cos(this.cam.yaw) * 0.28; goal.z -= Math.sin(this.cam.yaw) * 0.28; }
    const follow = this.reducedMotion || !this.cam.ready ? 1 : 1 - Math.exp(-dt * 9);
    this.cam.target.lerp(goal, follow); this.cam.ready = true;
    const offset = orbitOffset(this.cam.yaw, this.cam.pitch, 1), target = this.cam.target;
    let distance = this.cam.distance;
    if (spec.kind === 'hall') {
      distance = clampOrbitDistance(target, offset, distance, { minX: -HALL_LENGTH / 2, maxX: HALL_LENGTH / 2, minY: 0.2, maxY: HALL_HEIGHT, minZ: -HALL_WIDTH / 2, maxZ: HALL_WIDTH / 2 });
    } else if (this.room) {
      // The room's open top lets the camera rise above the walls; walls between are cut away.
      distance = clampOrbitDistance(target, offset, distance, { minX: -this.room.dims.width / 2 - 4, maxX: this.room.dims.width / 2 + 4, minY: 0.25, maxY: 9, minZ: -4, maxZ: this.room.dims.depth + 4 });
    }
    this.camera.position.set(target.x + offset.x * distance, target.y + offset.y * distance, target.z + offset.z * distance);
    this.camera.lookAt(target);
    if (spec.kind === 'room' && this.room) {
      const cut = cutawayWalls({ x: this.camera.position.x, z: this.camera.position.z }, this.room.dims);
      for (const side of ['back', 'front', 'left', 'right'] as const) this.room.shell.walls[side].visible = !cut[side];
    } else {
      // Keep the shadow camera centred near the player in the long hall. Its projection never changes
      // here (set once on entry); the light only moves after the player has walked a little way.
      const centre = this.shadowCentre;
      if (!centre || Math.hypot(root.x - centre.x, root.z - centre.z) > SHADOW_RECENTRE_METRES) {
        this.shadowCentre = { x: root.x, z: root.z };
        this.sun.position.set(root.x + 2, 9, root.z + 1.5); this.sun.target.position.set(root.x, 0, root.z);
      }
    }
  }

  private tick = (now: number) => {
    this.frame = 0;
    if (this.disposed || this.lost) return;
    if (document.visibilityState === 'hidden') { this.last = 0; return; } // restarted by visibilitychange
    this.frame = requestAnimationFrame(this.tick);
    // Frame cap: skip this display refresh if too little time has passed. Elapsed time accumulates,
    // so walking speed is the same at any frame rate (dt is still capped by MAX_FRAME_SECONDS).
    if (this.last && now - this.last < this.minFrameMs * 0.75) return;
    const dt = this.last ? Math.min(MAX_FRAME_SECONDS, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    if (!this.spec || !this.self) { this.renderer.render(this.scene, this.camera); return; }
    this.step(dt);
    const goal = this.worldOf(this.local.position);
    this.self.position = goal; this.self.yaw = this.local.yaw;
    this.updateCamera(dt);
    const restItemId = this.spec.kind === 'room' ? this.spec.resting?.itemId ?? null : null;
    this.placeActor(this.self, { position: goal, yaw: this.local.yaw, moving: this.local.moving, sprinting: this.local.sprinting, restItemId }, now);
    this.updateRemotes(now, dt);
    if (this.selection && this.spec.kind === 'room' && this.spec.selectedItemId) {
      const model = this.room?.models.get(this.spec.selectedItemId)?.model;
      if (model) this.selection.setFromObject(model);
    }
    this.renderer.render(this.scene, this.camera);
  };
}

export type { CatalogItem };
