// SRS-504.1: the DormSpace 3D student. Builds on the articulated Game 1 rig (characterRig) with
// the DormSpace look resolver, then adds square glasses, freckles, closed eyes, curly-bob curls
// and trouser cuts, and merges static parts per material to keep draw calls low.
import * as T from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { characterRig } from '../jumpyland/character-rig';
import { dormAvatarStyleKey, isGameRoomData, resolveDormAvatarStyle, rigStyle, type DormAvatarInput, type DormAvatarStyle } from './avatar-style';
import {
  DEFAULT_BED_HEIGHT, poseAngles, prefersReducedMotion, restSole,
  type DormAvatarPose, type DormPoseOptions, type JointAngles, type LegMetrics,
} from './avatar-pose';

export type DormAvatarOptions = { /** Campus backpack (off indoors by default). */ backpack?: boolean };
type Joints = {
  pivot: T.Group; body: T.Object3D; head: T.Object3D; closedEyes: T.Object3D;
  arms: T.Object3D[]; elbows: T.Object3D[]; legs: T.Object3D[]; knees: T.Object3D[];
};
export type DormAvatarModel = {
  /** Place at the floor point (or seat/bed anchor) and turn with rotation.y; the model faces +Z. */
  readonly root: T.Group;
  readonly style: DormAvatarStyle;
  /** Same key = same look: keep the model and only rebuild when this changes. */
  readonly key: string;
  readonly notices: readonly string[];
  /** Standing height in metres, soles at y = 0. */
  readonly height: number;
  readonly metrics: LegMetrics;
  readonly joints: Joints;
  pose: DormAvatarPose | null;
  disposed: boolean;
};

// ---- Resources shared by every avatar (never disposed with one model) ----
let sharedWeave: T.Texture | null | undefined;
const shared = { sphere: null as T.SphereGeometry | null, box: null as T.BoxGeometry | null };
function markShared<R extends { userData: Record<string, unknown> }>(resource: R) { resource.userData.shared = true; return resource; }
function weave() {
  if (sharedWeave !== undefined) return sharedWeave;
  if (typeof document === 'undefined') return null; // SSR / Node: no cloth normal map
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return (sharedWeave = null);
  ctx.fillStyle = '#8080ff'; ctx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 2) for (let x = 0; x < 64; x += 2) { ctx.fillStyle = (x + y) % 4 ? '#7784fc' : '#897bfc'; ctx.fillRect(x, y, 1, 2); }
  const texture = new T.CanvasTexture(canvas); texture.wrapS = texture.wrapT = T.RepeatWrapping; texture.repeat.set(12, 12);
  return (sharedWeave = markShared(texture));
}
const sphere = () => (shared.sphere ??= markShared(new T.SphereGeometry(1, 14, 10)));
const box = () => (shared.box ??= markShared(new T.BoxGeometry(1, 1, 1)));

function add(parent: T.Object3D, geometry: T.BufferGeometry, material: T.Material, position: [number, number, number], scale: [number, number, number], name: string) {
  const mesh = new T.Mesh(geometry, material); mesh.name = name;
  mesh.position.set(...position); mesh.scale.set(...scale); mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
const named = (root: T.Object3D, name: string) => { const found: T.Object3D[] = []; root.traverse(o => { if (o.name === name) found.push(o); }); return found; };
const firstMaterial = (root: T.Object3D, name: string) => (named(root, name).find(o => o instanceof T.Mesh) as T.Mesh | undefined)?.material as T.MeshStandardMaterial | undefined;

/** Builds one student model from GameRoomData or a saved appearance. */
export function createDormAvatar(input: DormAvatarInput, options: DormAvatarOptions = {}): DormAvatarModel {
  const { style, notices } = resolveDormAvatarStyle(input);
  const appearance = isGameRoomData(input) ? input.appearance : input ?? null;
  // A blank source texture: the DormSpace look is fully resolved, so no colours are sampled from art.
  const rig = characterRig(new T.Texture(), null, appearance, { style: rigStyle(style), normalMap: weave() });
  const body = rig.root.children[0], head = named(rig.root, 'modeled-head')[0];
  const retired = new Set<T.Mesh>();
  const retire = (object: T.Object3D) => { object.traverse(o => { if (o instanceof T.Mesh) retired.add(o); }); object.removeFromParent(); };

  if (!options.backpack) [...named(body, 'campus-backpack'), ...named(body, 'backpack-strap')].forEach(retire);
  if (style.bottom === 'chinos') named(body, 'denim-seam').forEach(retire);
  if (style.bottom === 'wide') for (const leg of named(body, 'continuous-trouser-leg')) {
    // Wider trousers; shoes keep their size.
    leg.scale.x *= 1.14; leg.scale.z *= 1.14;
    leg.traverse(o => { if (o instanceof T.Mesh && o !== leg) { o.scale.x /= 1.14; o.scale.z /= 1.14; o.position.z /= 1.14; } });
  }

  const skin = firstMaterial(head, 'sculpted-head')!;
  const dark = new T.MeshStandardMaterial({ color: '#272c33', roughness: 0.6 });
  if (style.glasses === 'square') squareGlasses(head, dark);
  if (style.freckles) freckles(head, new T.MeshStandardMaterial({ color: new T.Color(style.skin).multiplyScalar(0.66), roughness: 0.7 }));
  if (style.curlyBob) curls(named(head, 'hairstyle-bob')[0], firstMaterial(head, 'hair-cap')!);
  const closedEyes = new T.Group(); closedEyes.name = 'closed-eyes'; closedEyes.visible = false; closedEyes.userData.keep = true; head.add(closedEyes);
  for (const side of [-1, 1]) {
    add(closedEyes, sphere(), skin, [side * 0.031, 0.026, 0.077], [0.02, 0.0085, 0.007], 'closed-eyelid');
    add(closedEyes, box(), dark, [side * 0.031, 0.019, 0.083], [0.03, 0.0016, 0.002], 'closed-lash');
  }

  const arms = named(body, 'shoulder-joint'), elbows = named(body, 'elbow-joint'), legs = named(body, 'hip-joint'), knees = named(body, 'knee-joint');
  const sole = named(body, 'sneaker-sole') as T.Mesh[];
  sole.forEach(mesh => { mesh.userData.keep = true; });
  const trouser = knees[0].parent!.parent!; // knee bone -> upper bone -> trouser mesh
  const metrics: LegMetrics = {
    hip: legs[0].position.y, knee: -knees[0].position.y,
    soleY: sole[0].position.y, soleZ: sole[0].position.z, soleRY: sole[0].scale.y, soleRZ: sole[0].scale.z, legDepth: trouser.scale.z,
  };

  const root = new T.Group(); root.name = 'dorm-avatar';
  const pivot = new T.Group(); pivot.name = 'pose-pivot'; root.add(pivot); pivot.add(rig.root);
  pivot.position.y = -restSole(metrics);
  root.updateMatrixWorld(true);
  const height = new T.Box3().setFromObject(rig.root).max.y;
  const back = new T.Box3();
  for (const name of ['tailored-top', 'hood', 'scarf-drape']) for (const mesh of named(body, name)) back.expandByObject(mesh, true);
  root.userData.backDepth = back.isEmpty() ? 0.13 : Math.max(0.08, -back.min.z);
  root.userData.height = height;

  mergeStaticParts(rig.root, retired);
  disposeUnused(rig.root, retired);
  // Skinned sleeves/trousers cache bounds from the rest pose; sitting or lying would cull them wrongly.
  rig.root.traverse(object => { if (object instanceof T.SkinnedMesh) object.frustumCulled = false; });

  const model: DormAvatarModel = {
    root, style, key: dormAvatarStyleKey(style), notices, height, metrics,
    joints: { pivot, body, head, closedEyes, arms, elbows, legs, knees }, pose: null, disposed: false,
  };
  root.userData.dormAvatar = model.key;
  updateDormAvatarPose(model, 'idle', 0, { reducedMotion: true });
  return model;
}

/** Applies a pose. Call once per frame with the frame time; furniture yaw goes on `root`. */
export function updateDormAvatarPose(model: DormAvatarModel, pose: DormAvatarPose, timeMs: number, options: DormPoseOptions = {}): JointAngles {
  const reducedMotion = options.reducedMotion ?? prefersReducedMotion();
  const width = model.style.bodyWidth;
  const angles = poseAngles(pose, timeMs, model.metrics, { ...options, reducedMotion }, width);
  const { pivot, body, head, closedEyes, arms, elbows, legs, knees } = model.joints;
  const rest = restSole(model.metrics);
  if (angles.lying) {
    // Lie on the back, face up, head toward local -Z, centred on the root, back on the mattress.
    pivot.rotation.set(-Math.PI / 2, 0, 0);
    // Rig y (soles at `rest`, crown at rest + height) becomes -z; shifting by the midpoint centres it.
    pivot.position.set(0, (options.bedHeight ?? DEFAULT_BED_HEIGHT) + (model.root.userData.backDepth as number), rest + model.height / 2);
  } else {
    pivot.rotation.set(0, 0, 0);
    pivot.position.set(0, -rest, 0);
  }
  body.position.set(0, angles.bodyY, 0);
  body.rotation.set(angles.lean, 0, 0);
  body.scale.set(width, 1, width * (1 + angles.breath * 0.008));
  head.rotation.set(angles.headPitch, 0, 0);
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1;
    legs[i].rotation.set(angles.hips[i], 0, side * 0.017);
    knees[i].rotation.set(angles.knees[i], 0, 0);
    arms[i].rotation.set(angles.shoulders[i], 0, side * angles.shoulderSpread);
    elbows[i].rotation.set(angles.elbows[i], 0, 0);
  }
  closedEyes.visible = angles.eyesClosed;
  model.pose = pose;
  return angles;
}

/** Frees this model's geometries, materials, textures and skeletons. Shared resources stay. */
export function disposeDormAvatar(model: DormAvatarModel) {
  if (model.disposed) return;
  model.root.removeFromParent();
  const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>();
  model.root.traverse(object => {
    if (object instanceof T.SkinnedMesh) object.skeleton.dispose();
    if (object instanceof T.Mesh) {
      geometries.add(object.geometry);
      (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
    }
  });
  geometries.forEach(geometry => { if (!geometry.userData.shared) geometry.dispose(); });
  materials.forEach(disposeMaterial);
  model.disposed = true;
}

function disposeMaterial(material: T.Material) {
  if (material.userData.shared) return;
  for (const value of Object.values(material)) if (value instanceof T.Texture && !value.userData.shared) value.dispose();
  material.dispose();
}

function squareGlasses(head: T.Object3D, frame: T.Material) {
  const glasses = new T.Group(); glasses.name = 'square-glasses'; head.add(glasses);
  const bar = 0.0042, w = 0.048, h = 0.034, z = 0.095;
  for (const side of [-1, 1]) {
    const x = side * 0.032;
    add(glasses, box(), frame, [x, 0.026 + h / 2, z], [w + bar, bar, bar], 'square-rim');
    add(glasses, box(), frame, [x, 0.026 - h / 2, z], [w + bar, bar, bar], 'square-rim');
    add(glasses, box(), frame, [x - w / 2, 0.026, z], [bar, h, bar], 'square-rim');
    add(glasses, box(), frame, [x + w / 2, 0.026, z], [bar, h, bar], 'square-rim');
    add(glasses, box(), frame, [side * 0.071, 0.028, 0.046], [0.003, 0.003, 0.1], 'square-temple').rotation.y = -side * 0.33;
  }
  add(glasses, box(), frame, [0, 0.031, z + 0.002], [0.016, 0.003, 0.003], 'square-bridge');
}

function freckles(head: T.Object3D, material: T.Material) {
  // On the sculpted head ellipsoid (x .088, y .122, z .082), just proud of the cheeks and nose.
  const spots: [number, number][] = [[0.036, -0.004], [0.047, 0.003], [0.052, -0.012], [0.041, -0.017], [0.058, -0.002], [0.03, -0.013]];
  const surface = (x: number, y: number) => 0.082 * Math.sqrt(Math.max(0, 1 - (x / 0.088) ** 2 - (y / 0.122) ** 2)) + 0.0012;
  for (const side of [-1, 1]) for (const [x, y] of spots) add(head, sphere(), material, [side * x, y, surface(x, y)], [0.0042, 0.0042, 0.0015], 'freckle');
  for (const x of [-0.008, 0, 0.008]) add(head, sphere(), material, [x, 0.004, 0.091], [0.0034, 0.0034, 0.0013], 'freckle');
}

function curls(hair: T.Object3D | undefined, material: T.Material) {
  if (!hair) return;
  for (let i = 0; i < 16; i++) {
    const angle = Math.PI * 0.85 + (i / 15) * Math.PI * 1.3;
    add(hair, sphere(), material, [Math.cos(angle) * 0.098, -0.075 + Math.sin(i * 1.7) * 0.008, Math.sin(angle) * 0.084 - 0.012], [0.022, 0.024, 0.022], 'bob-curl');
  }
}

/** Joins sibling static meshes that share a material into one mesh (fewer draw calls). Joints,
 * skinned meshes, the soles and the closed-eye group are left as they are. */
function mergeStaticParts(root: T.Object3D, retired: Set<T.Mesh>) {
  const parents: T.Object3D[] = [];
  root.traverse(object => { if (!object.userData.keep) parents.push(object); });
  for (const parent of parents) {
    const buckets = new Map<string, T.Mesh[]>();
    for (const child of parent.children) {
      if (!(child instanceof T.Mesh) || child instanceof T.SkinnedMesh || child.children.length || child.userData.keep
        || Array.isArray(child.material) || !child.visible) continue;
      const g = child.geometry, signature = `${child.material.uuid}|${!!g.index}|${Object.keys(g.attributes).sort().join()}`;
      buckets.set(signature, [...(buckets.get(signature) ?? []), child]);
    }
    for (const meshes of buckets.values()) {
      if (meshes.length < 2) continue;
      const pieces = meshes.map(mesh => { mesh.updateMatrix(); return mesh.geometry.clone().applyMatrix4(mesh.matrix); });
      const merged = mergeGeometries(pieces, false);
      pieces.forEach(piece => piece.dispose());
      if (!merged) continue;
      const mesh = new T.Mesh(merged, meshes[0].material);
      mesh.name = `merged-${parent.name || 'parts'}`; mesh.castShadow = mesh.receiveShadow = true;
      meshes.forEach(part => { part.removeFromParent(); retired.add(part); });
      parent.add(mesh);
    }
  }
}

/** Disposes geometries/materials only used by removed meshes (shared rig primitives stay while in use). */
function disposeUnused(root: T.Object3D, retired: Set<T.Mesh>) {
  const liveGeometries = new Set<T.BufferGeometry>(), liveMaterials = new Set<T.Material>();
  root.traverse(object => {
    if (!(object instanceof T.Mesh)) return;
    liveGeometries.add(object.geometry);
    (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => liveMaterials.add(material));
  });
  for (const mesh of retired) {
    if (!liveGeometries.has(mesh.geometry) && !mesh.geometry.userData.shared) mesh.geometry.dispose();
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) if (!liveMaterials.has(material)) disposeMaterial(material);
  }
}
