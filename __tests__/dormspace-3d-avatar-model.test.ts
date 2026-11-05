import * as T from 'three';
import { describe, expect, it } from 'vitest';
import { createDormAvatar, disposeDormAvatar, updateDormAvatarPose, type DormAvatarModel } from '../components/dormspace-3d/avatar-model';
import { DEFAULT_BED_HEIGHT, DORM_AVATAR_POSES } from '../components/dormspace-3d/avatar-pose';
import { resolveDormAvatarStyle, rigStyle } from '../components/dormspace-3d/avatar-style';
import { reviewLooks } from '../components/dormspace-3d/review-looks';
import { characterRig, characterStyle } from '../components/jumpyland/character-rig';
import { gameRoomSamples, type AvatarAppearance } from '../lib/game-room';

const build = (appearance: AvatarAppearance | null) => createDormAvatar({ ...gameRoomSamples, appearance });
const base = { outfitId: 'sample-campus', faceId: 'sample-smile' } as const;
const meshes = (root: T.Object3D) => { const list: T.Mesh[] = []; root.traverse(o => { if (o instanceof T.Mesh) list.push(o); }); return list; };
const visibleMeshes = (root: T.Object3D) => { const list: T.Mesh[] = []; root.traverseVisible(o => { if (o instanceof T.Mesh) list.push(o); }); return list; };
const named = (root: T.Object3D, name: string) => { const list: T.Object3D[] = []; root.traverse(o => { if (o.name === name) list.push(o); }); return list; };
function lowestSole(model: DormAvatarModel) {
  model.root.updateMatrixWorld(true);
  const box = new T.Box3();
  for (const sole of named(model.root, 'sneaker-sole')) box.expandByObject(sole, true);
  return box.min.y;
}
const world = (object: T.Object3D) => { object.updateWorldMatrix(true, false); return object.getWorldPosition(new T.Vector3()); };

describe('SRS-504.1 3D avatar model', () => {
  it('builds every review look from real geometry without picture billboards', () => {
    for (const look of reviewLooks) {
      const model = createDormAvatar(look.data);
      let sprites = 0, pictures = 0;
      model.root.traverse(o => {
        if (o instanceof T.Sprite) sprites++;
        if (o instanceof T.Mesh) for (const material of [o.material].flat() as T.MeshStandardMaterial[]) if (material.map) pictures++;
      });
      expect(sprites).toBe(0);
      expect(pictures).toBe(0);
      expect(model.height).toBeGreaterThan(1.45);
      expect(model.height).toBeLessThan(1.9);
      expect(named(model.root, 'modeled-head')).toHaveLength(1);
      expect(named(model.root, 'shoulder-joint')).toHaveLength(2);
      expect(named(model.root, 'knee-joint')).toHaveLength(2);
      disposeDormAvatar(model);
    }
  });

  it('draws fewer meshes than the unmerged Game 1 rig', () => {
    const model = build({ ...base, avatarId: 'campus-v4-male-2-2-glasses' });
    const raw = characterRig(new T.Texture(), null, null, { style: rigStyle(model.style), normalMap: null });
    expect(visibleMeshes(model.root).length).toBeLessThan(meshes(raw.root).length * 0.7);
    disposeDormAvatar(model);
  });

  it('distinguishes round glasses, square glasses and no glasses', () => {
    const round = build({ ...base, avatarId: 'campus-v4-male-2-2-glasses' });
    const square = build({ ...base, avatarId: 'campus-v4-male-1-1-natural', faceStyle: 'square-glasses' });
    const none = build({ ...base, avatarId: 'campus-v4-male-1-1-natural' });
    expect(named(round.root, 'round-glasses')).toHaveLength(1);
    expect(named(round.root, 'square-glasses')).toHaveLength(0);
    expect(named(square.root, 'square-glasses')).toHaveLength(1);
    expect(named(square.root, 'round-glasses')).toHaveLength(0);
    expect(named(none.root, 'round-glasses').length + named(none.root, 'square-glasses').length).toBe(0);
    [round, square, none].forEach(disposeDormAvatar);
  });

  it('shows freckles in a darker shade of the saved skin colour', () => {
    const model = build({ ...base, avatarId: 'campus-v4-male-1-1-natural', skinColor: 'sand', faceStyle: 'freckles' });
    const freckle = new T.Color('#ca9979').multiplyScalar(0.66).getHex();
    const head = named(model.root, 'modeled-head')[0];
    expect(meshes(head).some(mesh => (mesh.material as T.MeshStandardMaterial).color?.getHex() === freckle)).toBe(true);
    disposeDormAvatar(model);
  });

  it('uses the saved skin colour on the skin surfaces', () => {
    const model = build({ ...base, avatarId: 'campus-v4-hijab-2-1-natural', skinColor: 'espresso' });
    const lid = named(model.root, 'closed-eyelid')[0] as T.Mesh;
    expect((lid.material as T.MeshStandardMaterial).color.getHexString()).toBe('613e2e');
    disposeDormAvatar(model);
  });

  it('gives body shapes a visible width while the head keeps its size', () => {
    const width = (shape: AvatarAppearance['bodyShape']) => {
      const model = build({ ...base, avatarId: 'campus-v4-female-1-1-natural', bodyShape: shape });
      model.root.updateMatrixWorld(true);
      const size = new T.Box3().setFromObject(named(model.root, 'shoulder-joint')[1]).getSize(new T.Vector3());
      const shoulder = world(named(model.root, 'shoulder-joint')[1]).x;
      const head = new T.Box3().expandByObject(named(model.root, 'modeled-head')[0], true).getSize(new T.Vector3()).x;
      disposeDormAvatar(model);
      return { shoulder, sleeve: size.x, head };
    };
    const slim = width('slim'), average = width('average'), plus = width('plus');
    expect(plus.shoulder).toBeGreaterThan(average.shoulder * 1.2);
    expect(slim.shoulder).toBeLessThan(average.shoulder * 0.92);
    expect(plus.head).toBeCloseTo(slim.head, 3);
  });

  it('keeps the soles on the floor while standing, walking and running', () => {
    const model = build({ ...base, avatarId: 'campus-v4-male-3-1-natural' });
    for (const pose of ['idle', 'walk', 'run'] as const) for (let time = 0; time < 1500; time += 53) {
      updateDormAvatarPose(model, pose, time, { reducedMotion: false });
      expect(Math.abs(lowestSole(model))).toBeLessThan(0.006);
    }
    disposeDormAvatar(model);
  });

  it('sits on the seat anchor and sleeps along the bed for every furniture yaw', () => {
    const model = build({ ...base, avatarId: 'campus-v4-hijab-1-2-glasses', bodyShape: 'broad' });
    model.root.position.set(2, 0, -3);
    for (const yaw of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      model.root.rotation.y = yaw;
      updateDormAvatarPose(model, 'sit', 0, { reducedMotion: true, seatHeight: 0.45 });
      const hip = world(named(model.root, 'hip-joint')[0]);
      expect(Math.hypot(hip.x - 2, hip.z + 3)).toBeLessThan(0.16);
      expect(hip.y).toBeCloseTo(0.45 + 0.065, 2);
      expect(lowestSole(model)).toBeGreaterThan(-0.006);

      updateDormAvatarPose(model, 'sleep', 0, { reducedMotion: true });
      const head = world(named(model.root, 'modeled-head')[0]);
      const pillow = new T.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)); // local -Z
      const offset = new T.Vector3(head.x - 2, 0, head.z + 3);
      expect(offset.dot(pillow)).toBeGreaterThan(0.5);
      expect(offset.clone().sub(pillow.clone().multiplyScalar(offset.dot(pillow))).length()).toBeLessThan(0.1);
      expect(head.y).toBeGreaterThan(DEFAULT_BED_HEIGHT);
      expect(head.y).toBeLessThan(DEFAULT_BED_HEIGHT + 0.4);
      expect(lowestSole(model)).toBeGreaterThan(DEFAULT_BED_HEIGHT - 0.01);
      expect(named(model.root, 'closed-eyes')[0].visible).toBe(true);

      updateDormAvatarPose(model, 'idle', 0, { reducedMotion: true });
      expect(named(model.root, 'closed-eyes')[0].visible).toBe(false);
      expect(Math.abs(lowestSole(model))).toBeLessThan(0.006);
    }
    disposeDormAvatar(model);
  });

  it('accepts every pose', () => {
    const model = build(null);
    for (const pose of DORM_AVATAR_POSES) expect(() => updateDormAvatarPose(model, pose, 1234)).not.toThrow();
    disposeDormAvatar(model);
  });

  it('disposes its own resources and leaves shared ones for other students', () => {
    const first = build({ ...base, avatarId: 'campus-v4-male-1-1-natural', faceStyle: 'freckles' });
    const second = build({ ...base, avatarId: 'campus-v4-male-1-1-natural', faceStyle: 'freckles' });
    let disposedGeometries = 0, disposedMaterials = 0, sharedDisposed = 0;
    const own = new Set<T.BufferGeometry>(), materials = new Set<T.Material>();
    for (const mesh of meshes(first.root)) {
      if (!mesh.geometry.userData.shared) own.add(mesh.geometry);
      [mesh.material].flat().forEach(material => materials.add(material));
    }
    own.forEach(geometry => geometry.addEventListener('dispose', () => disposedGeometries++));
    materials.forEach(material => material.addEventListener('dispose', () => disposedMaterials++));
    for (const mesh of meshes(second.root)) mesh.geometry.addEventListener('dispose', () => sharedDisposed++);
    disposeDormAvatar(first);
    expect(disposedGeometries).toBe(own.size);
    expect(disposedMaterials).toBe(materials.size);
    expect(sharedDisposed).toBe(0);
    expect(first.disposed).toBe(true);
    expect(() => disposeDormAvatar(first)).not.toThrow();
    disposeDormAvatar(second);
  });

  it('carries the resolver notices', () => {
    const model = build({ outfitId: 'sample-weekend', faceId: null });
    expect(model.notices).toEqual(resolveDormAvatarStyle({ ...gameRoomSamples, appearance: { outfitId: 'sample-weekend', faceId: null } }).notices);
    disposeDormAvatar(model);
  });
});

describe('Game 1 rig compatibility', () => {
  it('builds exactly as before when no options are passed', () => {
    const appearance: AvatarAppearance = { ...base, avatarId: 'campus-v4-female-2-2-natural', bodyShape: 'plus', skinColor: 'honey' };
    const rig = characterRig(new T.Texture(), null, appearance);
    expect(rig.root.name).toBe('campus-avatar-3d');
    expect(rig.root.userData.style).toEqual(characterStyle(appearance));
    expect(named(rig.root, 'campus-backpack')).toHaveLength(1);
    expect(typeof rig.tick).toBe('function');
  });
});
