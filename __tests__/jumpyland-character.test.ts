import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { characterRig, characterStyle } from '../components/jumpyland/character-rig';
import { customizableAvatars } from '../lib/avatar-collection';
import type { AvatarAppearance } from '../lib/game-room';

const look = (avatarId: string): AvatarAppearance => ({ avatarId, outfitId: 'sample-campus', faceId: 'sample-smile' });

describe('saved campus avatar in the 3D game', () => {
  it('carries the saved hairstyle, face detail, clothing type and scarf color into all 108 choices', () => {
    for (const avatar of customizableAvatars) {
      const style = characterStyle(look(avatar.id));
      expect(style.group).toBe(avatar.group);
      expect(style.glasses).toBe(avatar.detail === 'glasses');
      expect(style.hairstyle).toBe(avatar.group === 'hijab' ? 'hijab' : avatar.group === 'male'
        ? ['waves', 'curls', 'fade'][avatar.hair!] : ['long-waves', 'ponytail', 'bob'][avatar.hair!]);
      expect(style.shirt).toMatch(/^#[0-9a-f]{6}$/); expect(style.pants).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(characterStyle(look('campus-v4-hijab-2-1-natural')).scarf).not.toBe(characterStyle(look('campus-v4-hijab-2-3-natural')).scarf);
    expect(characterStyle(look('campus-v4-female-1-1-natural')).garment).toBe('cardigan');
    expect(characterStyle(look('campus-v4-male-3-1-natural')).garment).toBe('jacket');
    expect(characterStyle(look('campus-v4-male-3-1-natural')).skin).toBe('#4b2f22');
    expect(characterStyle(look('campus-v4-female-1-1-natural')).skin).toBe('#f3d7c6');
    expect(characterStyle(look('campus-v4-hijab-6-3-glasses')).skin).toBe('#4b2f22');
  });

  it('uses the saved face as surface detail on the curved head while retaining a modeled nose', () => {
    const source = new T.Texture({ width: 3072, height: 384 } as TexImageSource);
    const rig = characterRig(source, null, look('campus-v4-female-1-1-natural'));
    rig.tick(16, 0, false, false, 0);
    const skull = rig.root.getObjectByName('sculpted-head') as T.Mesh;
    expect(rig.root.userData.savedFaceSurface).toBe(true);
    expect(skull.geometry.type).toBe('SphereGeometry');
    expect(skull.geometry.groups.some(group => group.materialIndex === 0)).toBe(true);
    expect(skull.geometry.groups.some(group => group.materialIndex === 1)).toBe(true);
    expect((rig.root.getObjectByName('nose-tip') as T.Mesh).geometry.type).toBe('SphereGeometry');
    expect((rig.root.getObjectByName('ear') as T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>).material.color.getHexString()).toBe('f3d7c6');
  });

  it.each(['campus-v4-male-1-2-glasses', 'campus-v4-female-1-1-natural', 'campus-v4-hijab-4-3-glasses'])('models %s with adult proportions, volume and no image-plane head or body', avatarId => {
    const rig = characterRig(new T.Texture(), null, look(avatarId));
    expect(rig.root.getObjectByName('sculpted-head')).toBeDefined();
    expect(rig.root.getObjectByName('nose-tip')).toBeDefined();
    expect(rig.root.getObjectByName('round-glasses') !== undefined).toBe(avatarId.endsWith('glasses'));
    const bounds = new T.Box3().setFromObject(rig.root), size = bounds.getSize(new T.Vector3());
    expect(size.y).toBeGreaterThan(1.5); expect(size.y).toBeLessThan(1.7);
    expect(bounds.min.y).toBeGreaterThan(.015); expect(bounds.min.y).toBeLessThan(.09);
    expect(size.x).toBeLessThan(.51); expect(size.z).toBeGreaterThan(.25);
    rig.root.traverse(object => {
      if (object instanceof T.Mesh) expect(object.geometry.type).not.toBe('PlaneGeometry');
    });
    // Geometry renders immediately while the saved palette image is loading.
    expect(rig.tick(16, 0, false, false, 0)).toBe(true);
    expect(rig.root.visible).toBe(true);
  });

  it('keeps joints finite and clothing attached through running, jumping and crouching', () => {
    const rig = characterRig(new T.Texture(), null, look('campus-v4-female-2-2-glasses'));
    for (let time = 16; time < 2000; time += 16) {
      rig.tick(time, 260, time > 500 && time < 1000, time > 1500, 1, undefined, false, -200);
      rig.root.updateMatrixWorld(true);
      rig.root.traverse(object => {
        expect([...object.position, object.rotation.x, object.rotation.y, object.rotation.z].every(Number.isFinite)).toBe(true);
        if (object instanceof T.SkinnedMesh) {
          object.skeleton.update(); const positions = object.geometry.getAttribute('position');
          for (let i = 0; i < positions.count; i += 79) {
            const point = object.applyBoneTransform(i, new T.Vector3().fromBufferAttribute(positions, i));
            expect([...point].every(Number.isFinite)).toBe(true); expect(point.length()).toBeLessThan(2);
          }
        }
      });
    }
    expect(rig.root.getObjectsByProperty('name', 'hip-joint')).toHaveLength(2);
    expect(rig.root.getObjectsByProperty('name', 'knee-joint')).toHaveLength(2);
    expect(rig.root.getObjectsByProperty('name', 'shoulder-joint')).toHaveLength(2);
    expect(rig.root.getObjectsByProperty('name', 'elbow-joint')).toHaveLength(2);
    expect(rig.root.getObjectsByProperty('isSkinnedMesh', true)).toHaveLength(4);
    rig.dispose();
  });
});
