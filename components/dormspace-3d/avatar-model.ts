// SRS-504.16: DormSpace's block avatar uses the saved Game Room look and existing pose anchors.
import * as T from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { dormAvatarStyleKey, resolveDormAvatarStyle, type DormAvatarInput, type DormAvatarStyle } from './avatar-style';
import {
  DEFAULT_BED_HEIGHT, poseAngles, prefersReducedMotion, restSole,
  type DormAvatarPose, type DormPoseOptions, type JointAngles, type LegMetrics,
} from './avatar-pose';

export type DormAvatarOptions = { /** Campus backpack (off indoors by default). */ backpack?: boolean };
type Joints = {
  pivot: T.Group; body: T.Object3D; head: T.Object3D; openEyes: T.Object3D; closedEyes: T.Object3D;
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

function sharedGeometry<G extends T.BufferGeometry>(geometry: G) {
  geometry.userData.shared = true;
  return geometry;
}
const cube = sharedGeometry(new T.BoxGeometry(1, 1, 1));
const headBlock = sharedGeometry(new RoundedBoxGeometry(1, 1, 1, 1, 0.055));
const glassesRing = sharedGeometry(new T.TorusGeometry(0.031, 0.0035, 6, 18));

const matte = (color: T.ColorRepresentation) => new T.MeshStandardMaterial({ color, roughness: 0.78 });
type Vector = [number, number, number];
function add(parent: T.Object3D, geometry: T.BufferGeometry, material: T.Material, position: Vector, size: Vector, name: string) {
  const mesh = new T.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.scale.set(...size);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
const block = (parent: T.Object3D, material: T.Material, position: Vector, size: Vector, name: string) =>
  add(parent, cube, material, position, size, name);
function group(parent: T.Object3D, name: string, position: Vector = [0, 0, 0]) {
  const joint = new T.Group();
  joint.name = name;
  joint.position.set(...position);
  parent.add(joint);
  return joint;
}

function buildHair(head: T.Group, style: DormAvatarStyle) {
  const hair = group(head, `hairstyle-${style.hair}`);
  const material = matte(style.hijabColor ?? style.hairColor);
  const shape = (position: Vector, size: Vector, name = 'hair-block') => block(hair, material, position, size, name);
  if (style.hair === 'hijab') {
    shape([0, 0.155, -0.012], [0.392, 0.1, 0.337]);
    shape([0, -0.048, -0.149], [0.378, 0.343, 0.075]);
    for (const side of [-1, 1]) shape([side * 0.174, -0.062, 0.009], [0.078, 0.328, 0.309]);
    shape([0, -0.201, 0.035], [0.32, 0.1, 0.29], 'scarf-drape');
    return;
  }
  shape([0, 0.149, -0.014], [0.373, 0.094, 0.335], 'hair-cap');
  switch (style.hair) {
    case 'fade':
      shape([0, 0.192, -0.026], [0.318, 0.047, 0.266]);
      break;
    case 'waves':
    case 'long-waves':
      shape([-0.061, 0.15, 0.124], [0.237, 0.092, 0.114]).rotation.z = 0.16;
      shape([0.091, 0.191, -0.014], [0.154, 0.071, 0.264]).rotation.z = -0.14;
      if (style.hair === 'long-waves') {
        shape([0, -0.147, -0.165], [0.393, 0.49, 0.11]);
        for (const side of [-1, 1]) shape([side * 0.178, -0.073, -0.031], [0.097, 0.44, 0.235]).rotation.z = side * 0.09;
      }
      break;
    case 'ponytail':
      shape([0, 0.062, -0.203], [0.15, 0.163, 0.124]);
      shape([0, -0.08, -0.242], [0.15, 0.227, 0.113]).rotation.x = -0.27;
      break;
    case 'bob':
      shape([0, -0.048, -0.158], [0.39, 0.352, 0.097]);
      for (const side of [-1, 1]) shape([side * 0.176, -0.046, -0.014], [0.084, 0.307, 0.265]);
      if (style.curlyBob) {
        for (let i = 0; i < 5; i++) shape([(i - 2) * 0.072, 0.17 + (i % 2) * 0.024, 0.118], [0.082, 0.11, 0.098]).rotation.z = (i - 2) * 0.13;
      } else {
        shape([0, 0.118, 0.142], [0.338, 0.081, 0.076]);
      }
      break;
    case 'locs':
    case 'braids':
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * 0.077;
        const length = style.hair === 'braids' ? 0.41 : 0.29;
        shape([x, 0.121 - length / 2, -0.139], [0.067, length, 0.11]).rotation.z = x * 0.58;
      }
      for (const side of [-1, 1]) {
        shape([side * 0.177, -0.046, 0.085], [0.065, style.hair === 'braids' ? 0.39 : 0.26, 0.071]).rotation.z = side * 0.15;
      }
      break;
    case 'curls':
    case 'coils': {
      const count = style.hair === 'curls' ? 4 : 5;
      for (let row = 0; row < 3; row++) for (let col = 0; col < count; col++) {
        const width = 0.35 / count;
        const tuft = shape([(col - (count - 1) / 2) * width, 0.188 + ((col + row) % 3) * 0.015, (row - 1) * 0.105], [width + 0.008, 0.086, 0.11]);
        tuft.rotation.set(row * 0.08, 0, (col % 2 ? 1 : -1) * 0.12);
      }
      break;
    }
  }
}

function buildFace(head: T.Group, style: DormAvatarStyle, skin: T.Material, ink: T.Material) {
  const openEyes = group(head, 'open-eyes');
  const closedEyes = group(head, 'closed-eyes');
  closedEyes.visible = false;
  for (const side of [-1, 1]) {
    const x = side * 0.064;
    block(openEyes, ink, [x, 0.024, 0.154], [0.024, 0.042, 0.008], 'eye');
    block(closedEyes, skin, [x, 0.024, 0.154], [0.037, 0.026, 0.008], 'closed-eyelid').userData.keep = true;
    block(closedEyes, ink, [x, 0.021, 0.16], [0.03, 0.006, 0.004], 'closed-lash');
    block(head, ink, [side * 0.032, -0.056, 0.154], [0.027, 0.008, 0.007], 'smile-corner').rotation.z = side * 0.52;
  }
  block(head, ink, [0, -0.064, 0.154], [0.047, 0.008, 0.007], 'smile');
  if (style.glasses !== 'none') {
    const glasses = group(head, `${style.glasses}-glasses`);
    for (const side of [-1, 1]) {
      const x = side * 0.064;
      if (style.glasses === 'round') {
        add(glasses, glassesRing, ink, [x, 0.024, 0.164], [1.35, 1.12, 1], 'round-rim');
      } else {
        for (const edge of [-1, 1]) {
          block(glasses, ink, [x, 0.024 + edge * 0.033, 0.164], [0.087, 0.007, 0.009], 'square-rim');
          block(glasses, ink, [x + edge * 0.041, 0.024, 0.164], [0.007, 0.066, 0.009], 'square-rim');
        }
      }
    }
    block(glasses, ink, [0, 0.027, 0.164], [0.042, 0.007, 0.008], 'glasses-bridge');
  }
  if (style.freckles) {
    const freckles = matte(new T.Color(style.skin).multiplyScalar(0.66));
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      block(head, freckles, [side * (0.05 + i * 0.018), -0.022 - (i % 2) * 0.013, 0.154], [0.007, 0.007, 0.004], 'freckle');
    }
  }
  return { openEyes, closedEyes };
}

function buildTop(body: T.Group, style: DormAvatarStyle, shirt: T.Material) {
  block(body, shirt, [0, 1.064, 0], [0.404, 0.527, 0.27], 'tailored-top');
  if (style.top === 'crewneck') {
    const trim = matte(new T.Color(style.topColor).multiplyScalar(0.73));
    block(body, trim, [0, 1.313, 0.139], [0.129, 0.037, 0.012], 'crewneck-collar');
  } else if (style.top === 'hoodie') {
    block(body, shirt, [0, 1.284, -0.098], [0.257, 0.167, 0.159], 'hood');
    const trim = matte(new T.Color(style.topColor).multiplyScalar(0.75));
    block(body, trim, [0, 0.957, 0.139], [0.194, 0.105, 0.016], 'kangaroo-pocket');
    for (const side of [-1, 1]) block(body, trim, [side * 0.033, 1.237, 0.139], [0.013, 0.113, 0.014], 'hoodie-cord');
  } else {
    const lining = matte('#e7ded2');
    const trim = matte(new T.Color(style.topColor).multiplyScalar(0.65));
    block(body, lining, [0, 1.092, 0.139], [0.11, 0.457, 0.014], 'inner-tee');
    if (style.top === 'jacket') {
      block(body, trim, [0, 1.008, 0.15], [0.011, 0.287, 0.009], 'zipper');
    } else {
      for (let i = 0; i < 4; i++) block(body, trim, [0.055, 0.887 + i * 0.064, 0.153], [0.018, 0.018, 0.012], 'cardigan-button');
    }
  }
}

/** Builds one student model from GameRoomData or a saved appearance. */
export function createDormAvatar(input: DormAvatarInput, options: DormAvatarOptions = {}): DormAvatarModel {
  const { style, notices } = resolveDormAvatarStyle(input);
  const skin = matte(style.skin), ink = matte('#282333'), shirt = matte(style.topColor), pants = matte(style.bottomColor);
  const shoe = matte('#363a50'), rubber = matte('#efe9dc');
  const root = new T.Group();
  root.name = 'dorm-avatar';
  const pivot = group(root, 'pose-pivot');
  const body = group(pivot, 'block-avatar-body');
  const head = group(body, 'modeled-head', [0, 1.515, 0]);
  head.scale.set(1 / style.bodyWidth, 1, 1 / style.bodyWidth);
  add(head, headBlock, skin, [0, 0, 0], [0.352, 0.336, 0.302], 'block-head');
  block(body, skin, [0, 1.354, 0], [0.151, 0.094, 0.139], 'neck');
  buildHair(head, style);
  const eyes = buildFace(head, style, skin, ink);
  buildTop(body, style, shirt);
  if (options.backpack) {
    const backpack = group(body, 'campus-backpack');
    block(backpack, shoe, [0, 1.072, -0.187], [0.276, 0.341, 0.136], 'pack-body');
    block(backpack, ink, [0, 1.006, -0.261], [0.207, 0.148, 0.034], 'pack-pocket');
    for (const side of [-1, 1]) block(body, shoe, [side * 0.145, 1.085, 0.144], [0.036, 0.414, 0.018], 'backpack-strap');
  }
  const arms: T.Group[] = [], elbows: T.Group[] = [], legs: T.Group[] = [], knees: T.Group[] = [];
  const metrics: LegMetrics = { hip: 0.788, knee: 0.335, soleY: -0.365, soleZ: 0.034, soleRY: 0.025, soleRZ: 0.114, legDepth: 1, soleShape: 'box' };
  const legWidth = style.bottom === 'wide' ? 0.183 : 0.158;
  const cuff = style.bottom === 'wide' ? 0.179 : style.bottom === 'chinos' ? 0.134 : 0.148;
  for (const side of [-1, 1]) {
    const shoulder = group(body, 'shoulder-joint', [side * 0.279, 1.272, 0]);
    const elbow = group(shoulder, 'elbow-joint', [0, -0.228, 0]);
    arms.push(shoulder);
    elbows.push(elbow);
    block(shoulder, shirt, [0, -0.095, 0], [0.151, 0.266, 0.187], 'upper-sleeve');
    block(elbow, shirt, [0, -0.083, 0], [0.143, 0.191, 0.17], 'forearm-sleeve');
    block(elbow, skin, [0, -0.201, 0.005], [0.137, 0.112, 0.157], 'block-hand');
    const hip = group(body, 'hip-joint', [side * 0.1, metrics.hip, 0]);
    const knee = group(hip, 'knee-joint', [0, -metrics.knee, 0]);
    legs.push(hip);
    knees.push(knee);
    block(hip, pants, [0, -0.147, 0], [legWidth, 0.374, 0.169], 'upper-trouser');
    block(knee, pants, [0, -0.143, 0], [cuff, 0.306, 0.157], 'lower-trouser');
    block(knee, shoe, [0, -0.315, metrics.soleZ], [0.165, 0.08, 0.209], 'sneaker');
    block(knee, rubber, [0, metrics.soleY, metrics.soleZ], [0.17, metrics.soleRY * 2, metrics.soleRZ * 2], 'sneaker-sole');
  }

  body.scale.set(style.bodyWidth, 1, style.bodyWidth);
  pivot.position.y = -restSole(metrics);
  root.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(root, true);
  const height = bounds.max.y;
  root.userData.backDepth = -bounds.min.z;
  root.userData.height = height;
  mergeStaticParts(root);
  const model: DormAvatarModel = {
    root, style, key: dormAvatarStyleKey(style), notices, height, metrics,
    joints: { pivot, body, head, ...eyes, arms, elbows, legs, knees }, pose: null, disposed: false,
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
  const { pivot, body, head, openEyes, closedEyes, arms, elbows, legs, knees } = model.joints;
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
  body.scale.set(width, 1, width);
  head.rotation.set(angles.headPitch, 0, 0);
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1;
    legs[i].rotation.set(angles.hips[i], 0, 0);
    knees[i].rotation.set(angles.knees[i], 0, 0);
    arms[i].rotation.set(angles.shoulders[i], 0, side * angles.shoulderSpread);
    elbows[i].rotation.set(angles.elbows[i], 0, 0);
  }
  openEyes.visible = !angles.eyesClosed;
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

/** Joins sibling static meshes that share a material into one mesh (fewer draw calls). Groups stay separate so the joints and expressions can move independently. */
function mergeStaticParts(root: T.Object3D) {
  const parents: T.Object3D[] = [];
  root.traverse(object => { if (!object.userData.keep) parents.push(object); });
  for (const parent of parents) {
    const buckets = new Map<string, T.Mesh[]>();
    for (const child of parent.children) {
      if (!(child instanceof T.Mesh) || child.children.length || child.userData.keep
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
      meshes.forEach(part => part.removeFromParent());
      parent.add(mesh);
    }
  }
}
