import * as T from 'three';
import type { AvatarAppearance } from '../../lib/game-room';
import { completeAvatar, avatarParts, type AvatarGroup } from '../../lib/avatar-collection';
import { costumes } from './wardrobe';

type Hair = 'waves' | 'curls' | 'coils' | 'fade' | 'locs' | 'long-waves' | 'ponytail' | 'bob' | 'braids' | 'hijab';
type Garment = 'hoodie' | 'crewneck' | 'jacket' | 'cardigan';
const outfitColors = [
  ['#263b65', '#6e87a0'], ['#ded1b6', '#42464b'], ['#3d664e', '#354b5d'],
  ['#873b50', '#a28c69'], ['#383c43', '#70785a'], ['#897197', '#35475c'],
];
const femaleColors = [
  ['#ded1b6', '#6e87a0'], ['#3d664e', '#354b5d'], ['#897197', '#42464b'],
  ['#263b65', '#a28c69'], ['#873b50', '#35475c'], ['#383c43', '#70785a'],
];
const hijabColors = [
  ['#263b65', '#6e87a0'], ['#ded1b6', '#42464b'], ['#3d664e', '#354b5d'],
  ['#873b50', '#a28c69'], ['#897197', '#35475c'], ['#383c43', '#70785a'],
];
const skinColors = ['#f3d7c6', '#e9bf9f', '#c99a6e', '#a87650', '#7a4f33', '#4b2f22'];

/** Presentation choices come from the saved look, never inferred account gender. */
export function characterStyle(appearance?: AvatarAppearance | null) {
  const avatar = completeAvatar(appearance?.avatarId);
  let group: AvatarGroup = avatar?.group ?? 'male';
  let hairstyle: Hair = 'waves', garment: Garment = 'hoodie';
  let glasses = !!appearance?.faceStyle?.includes('glasses');
  let scarf = '#272a2d', hairColor = '#302722', shirt = '#263b65', pants = '#6e87a0', skin = skinColors[2];
  if (avatar) {
    const selected = avatarParts(avatar), outfit = selected.outfit - 1;
    [shirt, pants] = (group === 'female' ? femaleColors : group === 'hijab' ? hijabColors : outfitColors)[outfit];
    skin = skinColors[(group === 'male' ? [2, 1, 5, 4, 3, 0] : [0, 1, 2, 3, 4, 5])[outfit]];
    glasses = selected.detail === 'glasses';
    if (avatar.outfit) {
      hairstyle = group === 'hijab' ? 'hijab' : group === 'female'
        ? (['long-waves', 'ponytail', 'bob'] as const)[selected.hair]
        : (['waves', 'curls', 'fade'] as const)[selected.hair];
    } else hairstyle = group === 'hijab' ? 'hijab' : group === 'female'
      ? (['long-waves', 'ponytail', 'bob', 'bob', 'braids', 'long-waves'] as const)[outfit]
      : (['waves', 'curls', 'coils', 'locs', 'fade', 'waves'] as const)[outfit];
    garment = group === 'female'
      ? (['cardigan', 'hoodie', 'crewneck', 'jacket', 'cardigan', 'hoodie'] as const)[outfit]
      : (['hoodie', 'crewneck', 'jacket', 'hoodie', 'crewneck', 'cardigan'] as const)[outfit];
    if (group === 'hijab') {
      garment = (['hoodie', 'cardigan', 'jacket', 'crewneck', 'cardigan', 'hoodie'] as const)[outfit];
      scarf = avatar.outfit ? ['#24282c', '#899b84', '#b77e84'][selected.hair]
        : ['#24282c', '#303e59', '#899b84', '#b77e84', '#d6ccb6', '#753848'][outfit];
    }
    if (group === 'female' && outfit === 5) hairColor = '#75432f';
  } else if (appearance?.headStyle) {
    const selected = appearance.headStyle;
    if (selected.startsWith('hijab-')) { group = 'hijab'; hairstyle = 'hijab'; }
    else if (['long-waves', 'ponytail', 'bob-bangs', 'curly-bob', 'auburn-waves', 'braids'].includes(selected)) {
      group = 'female'; hairstyle = selected.includes('bob') ? 'bob' : selected === 'ponytail' ? 'ponytail' : selected === 'braids' ? 'braids' : 'long-waves';
    } else hairstyle = selected === 'short-waves' ? 'waves' : selected as Hair;
    if (selected === 'auburn-waves') hairColor = '#75432f';
    const top = appearance.topStyle;
    garment = top === 'zip-jacket' ? 'jacket' : top === 'cardigan' ? 'cardigan' : top === 'crewneck' ? 'crewneck' : 'hoodie';
    const tone = Number(appearance.skinTone?.split('-')[1]);
    if (tone >= 1 && tone <= 6) skin = skinColors[tone - 1];
  }
  return { group, hairstyle, garment, glasses, scarf, hairColor, shirt, pants, skin };
}

/**
 * An articulated 3D campus student. The saved collection supplies the style and
 * its painted colors. Head, facial features, hair, glasses, clothes and limbs
 * have volume; no legacy full-figure or head cutout is rendered on this rig.
 */
export function characterRig(source: T.Texture, costume: string | null, appearance?: AvatarAppearance | null) {
  const style = characterStyle(appearance), root = new T.Group(), body = new T.Group();
  root.name = 'campus-avatar-3d'; root.userData.avatarId = appearance?.avatarId ?? null;
  root.userData.style = style; root.add(body);
  const normal = weave();
  const cloth = (color: string) => new T.MeshStandardMaterial({ color, roughness: .91, normalMap: normal, normalScale: new T.Vector2(.05, .05) });
  const shirt = cloth(style.shirt), pants = cloth(style.pants), inner = cloth('#e4e1d6'), scarf = cloth(style.scarf);
  const skin = new T.MeshStandardMaterial({ color: style.skin, roughness: .64 });
  const hair = new T.MeshStandardMaterial({ color: style.hairColor, roughness: .79 });
  const shoe = new T.MeshStandardMaterial({ color: '#eee9dd', roughness: .72 });
  const sole = new T.MeshStandardMaterial({ color: '#c3c0b7', roughness: .86 });
  const seam = new T.MeshStandardMaterial({ color: '#bcb8a6', roughness: .75 });
  const dark = new T.MeshStandardMaterial({ color: '#272c33', roughness: .64 });
  const lip = new T.MeshStandardMaterial({ color: '#976653', roughness: .72 });
  const white = new T.MeshStandardMaterial({ color: '#d8d6ca', roughness: .6 });
  const iris = new T.MeshStandardMaterial({ color: '#493b2c', roughness: .48 });
  const pupil = new T.MeshStandardMaterial({ color: '#171b1b', roughness: .36 });
  const oval = new T.SphereGeometry(1, 24, 18);
  function part(parent: T.Object3D, geometry: T.BufferGeometry, mat: T.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, name = '') {
    const mesh = new T.Mesh(geometry, mat); mesh.name = name; mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function strand(parent: T.Object3D, points: number[][], radius: number, material: T.Material, name = '') {
    return part(parent, new T.TubeGeometry(new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point as [number, number, number]))), 16, radius, 5, false), material, 0, 0, 0, 1, 1, 1, name);
  }
  const feminine = style.group !== 'male', shoulder = feminine ? .177 : .19;
  const opening = style.garment === 'cardigan' ? .4 : style.garment === 'jacket' ? .23 : 0;
  part(body, new T.LatheGeometry([
    new T.Vector2(.143, .795), new T.Vector2(.151, .815), new T.Vector2(feminine ? .13 : .153, .91),
    new T.Vector2(feminine ? .151 : .168, 1.08), new T.Vector2(shoulder, 1.22),
    new T.Vector2(shoulder * .84, 1.266), new T.Vector2(.061, 1.296),
  ], 36, opening, Math.PI * 2 - opening * 2), shirt, 0, 0, 0, 1, 1, .64, 'tailored-top');
  part(body, new T.LatheGeometry([new T.Vector2(.129, .757), new T.Vector2(.147, .78), new T.Vector2(.144, .805)], 32), pants, 0, 0, 0, 1, 1, .7, 'trouser-hips');
  part(body, new T.BoxGeometry(.056, .075, .115), pants, 0, .768, 0, 1, 1, 1, 'trouser-crotch');
  const hem = part(body, new T.TorusGeometry(.144, .009, 8, 36), shirt, 0, .808, 0, 1, .7, .66, 'ribbed-hem'); hem.rotation.x = Math.PI / 2;
  part(body, new T.CapsuleGeometry(.043, .065, 8, 16), skin, 0, 1.325, .005, 1, 1, 1, 'neck');
  const head = new T.Group(); head.name = 'modeled-head'; head.position.set(0, 1.473, .014); body.add(head);
  // A smaller jaw and chin give a continuous head surface, approx. seven heads tall.
  const headGeometry = new T.SphereGeometry(1, 36, 24), positions = headGeometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i), jaw = y < -.2 ? 1 - (-y - .2) * .23 : 1;
    positions.setXYZ(i, positions.getX(i) * .088 * jaw, y * .122, positions.getZ(i) * .082 * (y < -.5 ? .92 : 1));
  }
  headGeometry.computeVertexNormals();
  part(head, headGeometry, skin, 0, 0, 0, 1, 1, 1, 'sculpted-head');
  for (const side of [-1, 1]) {
    part(head, oval, skin, side * .086, -.002, -.002, .016, .028, .017, 'ear');
    part(head, oval, white, side * .031, .025, .074, .017, .0056, .0046, 'eye-white');
    part(head, oval, iris, side * .03, .024, .078, .0055, .0054, .0015, 'iris');
    part(head, oval, pupil, side * .03, .024, .08, .0025, .0033, .001, 'pupil');
    const brow = part(head, oval, hair, side * .031, .046, .078, .022, .003, .003, 'eyebrow'); brow.rotation.z = side * -.07;
    strand(head, [[side * .047, .027, .073], [side * .031, .03, .08], [side * .015, .027, .078]], .0025, skin, 'upper-eyelid');
    part(head, oval, skin, side * .008, -.018, .09, .008, .007, .008, 'nose-wing');
  }
  part(head, oval, skin, 0, .006, .083, .009, .027, .012, 'nose-bridge');
  part(head, oval, skin, 0, -.015, .097, .011, .009, .012, 'nose-tip');
  part(head, oval, lip, 0, -.047, .073, .025, .004, .004, 'upper-lip');
  part(head, oval, lip, 0, -.053, .073, .023, .005, .004, 'lower-lip');
  strand(head, [[-.019, -.048, .076], [0, -.051, .078], [.019, -.048, .076]], .0012, dark, 'mouth');
  if (style.glasses) {
    const glasses = new T.Group(); glasses.name = 'round-glasses'; head.add(glasses);
    for (const side of [-1, 1]) {
      part(glasses, new T.TorusGeometry(.024, .0022, 6, 32), dark, side * .031, .026, .093, 1, .88, 1, 'glasses-rim');
      strand(glasses, [[side * .055, .03, .092], [side * .08, .033, .04], [side * .087, .02, -.002]], .0022, dark, 'glasses-temple');
    }
    strand(glasses, [[-.008, .03, .094], [0, .033, .098], [.008, .03, .094]], .002, dark, 'glasses-bridge');
  }
  addHair(head, style.hairstyle);
  function addHair(parent: T.Group, kind: Hair) {
    const hairGroup = new T.Group(); hairGroup.name = `hairstyle-${kind}`; parent.add(hairGroup);
    if (kind === 'hijab') {
      part(hairGroup, new T.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI * .36), scarf, 0, .005, -.005, .106, .143, .1);
      part(hairGroup, oval, scarf, 0, -.06, -.061, .099, .16, .051);
      for (const side of [-1, 1]) {
        part(hairGroup, oval, scarf, side * .091, -.025, .014, .025, .115, .058);
        strand(hairGroup, [[side * .055, .103, .066], [side * .087, .035, .079], [side * .081, -.082, .062], [side * .05, -.16, .055]], .0035, scarf);
      }
      const drape = part(body, new T.LatheGeometry([new T.Vector2(.105, 1.14), new T.Vector2(.13, 1.19), new T.Vector2(.095, 1.27), new T.Vector2(.05, 1.34)], 32), scarf, 0, 0, -.01, 1, 1, .7, 'scarf-drape');
      drape.rotation.z = 0; return;
    }
    const cap = part(hairGroup, new T.SphereGeometry(1, 28, 18, 0, Math.PI * 2, 0, Math.PI * .4), hair, 0, .019, -.01, .095, kind === 'fade' ? .112 : .129, .09, 'hair-cap'); cap.rotation.z = -.06;
    for (const side of [-1, 1]) part(hairGroup, oval, hair, side * .082, .038, -.008, .012, .045, .044, 'side-hair');
    if (kind === 'curls' || kind === 'coils') {
      for (let i = 0; i < 42; i++) {
        const angle = i * 2.399, latitude = .16 + i / 42 * 1.42, radius = Math.sin(latitude);
        part(hairGroup, oval, hair, Math.cos(angle) * .09 * radius, .025 + Math.cos(latitude) * .125, Math.sin(angle) * .086 * radius - .01, .022, .021, .022);
      }
    } else if (['long-waves', 'ponytail', 'bob', 'braids'].includes(kind)) {
      if (kind === 'bob') {
        for (let i = 0; i < 7; i++) part(hairGroup, oval, hair, (i - 3) * .021, .079, .065, .014, .025, .014, 'fringe');
      } else for (const side of [-1, 1]) {
        strand(hairGroup, [[side * .008, .139, .018], [side * .045, .124, .065], [side * .076, .077, .065], [side * .086, .018, .043]], .011, hair, 'parted-front-lock');
      }
    } else if (kind !== 'fade') {
      for (let i = 0; i < 7; i++) {
        const x = (i - 3) * .021;
        const lock = part(hairGroup, oval, hair, x, .114 - Math.abs(x) * .28, .033, .029, .026, .05, 'swept-hair-lock');
        lock.rotation.z = -.29 + i * .035; lock.rotation.y = -.2;
        strand(hairGroup, [[x, .064, .071], [x - .012, .107, .074], [x + .01, .139 - Math.abs(x) * .35, .003]], .0018, hair);
      }
    }
    if (['long-waves', 'bob', 'braids', 'locs'].includes(kind)) {
      const length = kind === 'bob' ? .17 : kind === 'locs' ? .21 : .31;
      part(hairGroup, oval, hair, 0, -.045 - length * .28, -.068, .096, length * .7, .044, 'back-hair-volume');
      for (let i = 0; i < 12; i++) {
        const angle = (i / 11) * Math.PI * 1.34 + Math.PI * .83, x = Math.cos(angle) * .091, z = Math.sin(angle) * .075;
        strand(hairGroup, [[x, .035, z], [x * 1.04, -.065, z - .005], [x * .97 + Math.sin(i) * .013, -.13, z], [x * 1.05, -.04 - length, z + .018]], kind === 'braids' || kind === 'locs' ? .008 : .011, hair, 'hair-lock');
      }
    } else if (kind === 'ponytail') {
      part(hairGroup, new T.TorusGeometry(.027, .006, 6, 16), dark, 0, .055, -.105, 1, 1, .8);
      for (let i = 0; i < 7; i++) {
        const x = (i - 3) * .007;
        strand(hairGroup, [[x, .057, -.11], [x * 2, -.005, -.16], [x * 2 + .015, -.13, -.15], [x * 1.3 + .02, -.22, -.11]], .01, hair, 'ponytail-strand');
      }
    }
  }
  const arms: T.Group[] = [], elbows: T.Object3D[] = [], legs: T.Group[] = [], knees: T.Object3D[] = [];
  for (const side of [-1, 1]) {
    const arm = new T.Group(); arm.name = 'shoulder-joint'; arm.position.set(side * shoulder, 1.228, 0); body.add(arm); arms.push(arm);
    const elbow = skinCloth(arm, [{ y: .025, r: .041 }, { y: -.025, r: .054 }, { y: -.15, r: .05 }, { y: -.24, r: .044 }, { y: -.34, r: .04 }, { y: -.447, r: .035 }], -.24, shirt, 'continuous-sleeve');
    elbow.name = 'elbow-joint'; elbows.push(elbow);
    part(elbow, new T.TorusGeometry(.035, .005, 6, 20), shirt, 0, -.207, 0).rotation.x = Math.PI / 2;
    part(elbow, oval, skin, 0, -.255, .005, .029, .049, .022, 'hand');
    part(elbow, oval, skin, side * -.022, -.24, .016, .011, .024, .012, 'thumb');
    const leg = new T.Group(); leg.name = 'hip-joint'; leg.position.set(side * .077, .778, 0); body.add(leg); legs.push(leg);
    const knee = skinCloth(leg, [{ y: .025, r: .067 }, { y: -.12, r: .063 }, { y: -.24, r: .057 }, { y: -.335, r: .052 }, { y: -.49, r: .049 }, { y: -.659, r: .043 }], -.335, pants, 'continuous-trouser-leg');
    knee.name = 'knee-joint'; knees.push(knee);
    part(knee, oval, shoe, 0, -.347, .035, .052, .038, .104, 'sneaker');
    part(knee, oval, sole, 0, -.375, .04, .054, .012, .106, 'sneaker-sole');
    for (let i = 0; i < 4; i++) part(knee, new T.CapsuleGeometry(.002, .048, 3, 6), seam, 0, -.32, .026 + i * .014, 1, 1, 1, 'shoelace').rotation.z = Math.PI / 2;
    strand(leg, [[side * .045, -.025, .042], [side * .051, -.13, .03], [side * .045, -.28, .029]], .0016, seam, 'denim-seam');
  }
  const selectedCostume = costumes.find(item => item.id === costume);
  if (style.garment === 'hoodie') {
    part(body, oval, shirt, 0, 1.252, -.077, .123, .069, .048, 'hood');
    // A shallow pouch follows the cloth surface instead of protruding as a pad.
    part(body, oval, shirt, 0, .935, .105, .096, .043, .005, 'kangaroo-pocket');
    for (const side of [-1, 1]) strand(body, [[side * .035, 1.27, .071], [side * .042, 1.19, .112], [side * .041, 1.135, .114]], .0028, seam, 'hoodie-cord');
  } else if (style.garment === 'crewneck') {
    part(body, new T.TorusGeometry(.059, .009, 8, 32), shirt, 0, 1.287, .007, 1, .5, 1, 'crewneck-collar').rotation.x = Math.PI / 2;
  } else {
    part(body, oval, inner, 0, 1.11, .092, .067, .165, .022, 'inner-tee');
    for (const side of [-1, 1]) strand(body, [[side * .062, 1.282, .053], [side * .045, 1.16, .114], [side * .029, 1.04, .114], [side * .025, .82, .1]], .009, shirt, 'jacket-edge');
    if (style.garment === 'jacket') strand(body, [[0, .82, .106], [0, 1.04, .124], [0, 1.2, .12]], .0022, seam, 'zipper');
    else for (let i = 0; i < 4; i++) part(body, oval, dark, .027, .87 + i * .057, .119, .005, .005, .003, 'cardigan-button');
  }
  const backpack = new T.Group(); backpack.name = 'campus-backpack'; body.add(backpack);
  part(backpack, oval, dark, 0, 1.075, -.144, .119, .16, .066);
  part(backpack, oval, dark, 0, 1.022, -.196, .091, .061, .018);
  for (const side of [-1, 1]) strand(body, [[side * .115, 1.26, -.105], [side * .146, 1.217, .07], [side * .127, 1.064, .102], [side * .118, .971, -.096]], .008, dark, 'backpack-strap');
  // Run costumes keep the saved head, hair and eyewear.
  if (selectedCostume) {
    shirt.color.set(selectedCostume.shirt); pants.color.set(selectedCostume.pants);
    if (['goku', 'vegeta', 'piccolo', 'sasuke', 'kakashi'].includes(costume!)) backpack.visible = false;
    if (costume === 'mario' || costume === 'luigi') {
      part(body, new T.BoxGeometry(.19, .22, .018), pants, 0, .947, .107, 1, 1, 1, 'overall-bib');
      for (const side of [-1, 1]) strand(body, [[side * .075, .91, .13], [side * .092, 1.13, .113], [side * .115, 1.26, .04]], .014, pants, 'overall-strap');
    }
  }
  let sampled = false, lastTime = 0, stride = 0, run = 0;
  const baseHair = hair.color.clone();
  function applySavedFace(image: HTMLImageElement) {
    // Preserve the selected painted face as albedo on the curved skull and
    // sculpted nose. This is surface color, not the old floating head image.
    const saved = new T.Texture(image); saved.colorSpace = T.SRGBColorSpace; saved.needsUpdate = true;
    const faceMaterial = new T.MeshStandardMaterial({ map: saved, roughness: .73 });
    const facialSurface = new Set(['sculpted-head', 'nose-bridge', 'nose-tip', 'nose-wing', 'upper-lip', 'lower-lip', 'mouth', 'upper-eyelid']);
    const paintedFeatures = new Set(['eye-white', 'iris', 'pupil', 'eyebrow']);
    head.updateMatrixWorld(true);
    head.traverse(object => {
      if (!(object instanceof T.Mesh)) return;
      if (paintedFeatures.has(object.name)) { object.visible = false; return; }
      if (!facialSurface.has(object.name)) return;
      // Shared primitive spheres must retain independent UVs for every part.
      object.geometry = object.geometry.clone();
      const positions = object.geometry.getAttribute('position'), uv = object.geometry.getAttribute('uv');
      object.updateMatrix();
      for (let i = 0; i < positions.count; i++) {
        const p = new T.Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrix);
        uv.setXY(i, (129 + p.x / .088 * 18) / image.width, 1 - (45 - p.y / .122 * 22) / image.height);
      }
      uv.needsUpdate = true;
      if (object.name === 'sculpted-head') {
        const indices = object.geometry.index!, back: number[] = [], front: number[] = [];
        // Skin-colored back and sides; the saved frontal face appears once.
        for (let i = 0; i < indices.count; i += 3) {
          const z = (positions.getZ(indices.getX(i)) + positions.getZ(indices.getX(i + 1)) + positions.getZ(indices.getX(i + 2))) / 3;
          (z > .022 ? front : back).push(indices.getX(i), indices.getX(i + 1), indices.getX(i + 2));
        }
        // Two batches, rather than one draw call for each interleaved face row.
        object.geometry.setIndex([...back, ...front]); object.geometry.clearGroups();
        object.geometry.addGroup(0, back.length, 0); object.geometry.addGroup(back.length, front.length, 1);
        object.material = [skin, faceMaterial];
      } else object.material = faceMaterial;
    });
    root.userData.savedFaceSurface = true;
  }
  function tick(time: number, speed: number, airborne: boolean, crouch: boolean, _frame: number, texture = source, golden = false, verticalSpeed = 0) {
    const image = texture.image as HTMLImageElement | undefined;
    if (!sampled && image?.width) {
      sampled = true; const palette = samplePalette(source.image as HTMLImageElement, {
        shirt: shirt.color.clone(), pants: pants.color.clone(), skin: skin.color.clone(), hair: hair.color.clone(),
      });
      skin.color.copy(palette.skin); lip.color.copy(palette.skin).multiplyScalar(.69);
      shirt.color.copy(palette.shirt); pants.color.copy(palette.pants);
      if (style.group !== 'hijab') { hair.color.copy(palette.hair); baseHair.copy(palette.hair); }
      if (selectedCostume) { shirt.color.set(selectedCostume.shirt); pants.color.set(selectedCostume.pants); }
      const savedImage = source.image as HTMLImageElement | undefined;
      if (appearance?.avatarId && savedImage?.width) applySavedFace(savedImage);
    }
    const dt = Math.max(0, Math.min(.05, (time - lastTime) / 1000)); lastTime = time;
    const moving = Math.abs(speed) > 1, blend = 1 - Math.exp(-dt * 14); run = T.MathUtils.lerp(run, moving ? 1 : 0, blend);
    stride += Math.abs(speed) / 100 * dt * 5.5;
    for (let i = 0; i < 2; i++) {
      const swing = Math.sin(stride + i * Math.PI) * .72 * run;
      const hip = crouch ? -.67 : airborne ? (i ? .31 : -.69) : swing;
      const knee = crouch ? 1.2 : airborne ? (verticalSpeed < 0 ? 1.03 : .67) : Math.max(0, -swing) * 1.35;
      legs[i].rotation.x = T.MathUtils.lerp(legs[i].rotation.x, hip, blend); legs[i].rotation.z = (i ? 1 : -1) * .017;
      knees[i].rotation.x = T.MathUtils.lerp(knees[i].rotation.x, knee, blend);
      arms[i].rotation.x = T.MathUtils.lerp(arms[i].rotation.x, airborne ? -.6 : -swing * .9, blend); arms[i].rotation.z = (i ? 1 : -1) * .085;
      elbows[i].rotation.x = T.MathUtils.lerp(elbows[i].rotation.x, -.18 - run * .58, blend);
    }
    const bounce = !airborne ? Math.abs(Math.sin(stride)) * .022 * run : 0;
    body.position.y = T.MathUtils.lerp(body.position.y, crouch ? -.24 : bounce + Math.sin(time * .002) * .003, blend);
    body.rotation.y = T.MathUtils.lerp(body.rotation.y, moving ? 1.05 : .32, blend);
    body.rotation.x = T.MathUtils.lerp(body.rotation.x, crouch ? .24 : run * .09, blend); body.rotation.z = Math.sin(stride) * run * .012;
    head.rotation.x = -body.rotation.x * .7; head.rotation.y = -body.rotation.y * .37; head.rotation.z = -body.rotation.z;
    hair.color.copy(golden && style.group !== 'hijab' ? new T.Color('#d9ad43') : baseHair);
    return true;
  }
  return { root, tick, dispose() { root.traverse(object => { if (object instanceof T.SkinnedMesh) object.skeleton.dispose(); }); } };
}

function samplePalette(image: HTMLImageElement, defaults: { shirt: T.Color; pants: T.Color; skin: T.Color; hair: T.Color }) {
  if (!image || typeof document === 'undefined') return defaults;
  try {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 384;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0, 256, 384, 0, 0, 256, 384); const data = ctx.getImageData(0, 0, 256, 384).data;
    const average = (x1: number, y1: number, x2: number, y2: number, fallback: T.Color, filter?: (r: number, g: number, b: number) => boolean) => {
      let r = 0, g = 0, b = 0, n = 0;
      for (let y = y1; y < y2; y += 2) for (let x = x1; x < x2; x += 2) {
        const i = (y * 256 + x) * 4;
        if (data[i + 3] < 200 || filter && !filter(data[i], data[i + 1], data[i + 2])) continue;
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
      }
      return n ? new T.Color().setRGB(r / n / 255, g / n / 255, b / n / 255, T.SRGBColorSpace) : fallback;
    };
    return {
      shirt: average(90, 140, 168, 210, defaults.shirt), pants: average(95, 245, 160, 320, defaults.pants),
      skin: average(98, 32, 159, 91, defaults.skin, (r, g, b) => r > g * 1.065 && g > b * 1.04 && r > 40 && r + g + b > 115),
      hair: average(85, 15, 172, 48, defaults.hair, (r, g, b) => r + g + b < 260),
    };
  } catch { return defaults; }
}

function weave() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d'); if (!ctx) return null;
  ctx.fillStyle = '#8080ff'; ctx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 2) for (let x = 0; x < 64; x += 2) { ctx.fillStyle = (x + y) % 4 ? '#7784fc' : '#897bfc'; ctx.fillRect(x, y, 1, 2); }
  const texture = new T.CanvasTexture(canvas); texture.wrapS = texture.wrapT = T.RepeatWrapping; texture.repeat.set(12, 12); return texture;
}

/** Continuous weighted cloth bends through a joint instead of separating into toy-like segments. */
function skinCloth(parent: T.Group, profile: { y: number; r: number }[], jointY: number, material: T.Material, name: string) {
  const points: T.Vector2[] = [];
  // Lathe rings go bottom to top. Extra rings make knee/elbow blending smooth.
  for (let row = profile.length - 1; row > 0; row--) {
    const low = profile[row], high = profile[row - 1];
    for (let i = 0; i < 4; i++) {
      const t = i / 4;
      points.push(new T.Vector2(T.MathUtils.lerp(low.r, high.r, t) * (1 + Math.sin((row + t) * 7) * .008), T.MathUtils.lerp(low.y, high.y, t)));
    }
  }
  points.push(new T.Vector2(profile[0].r, profile[0].y));
  points.unshift(new T.Vector2(0, points[0].y)); points.push(new T.Vector2(0, points[points.length - 1].y));
  const geometry = new T.LatheGeometry(points, 24), vertices = geometry.getAttribute('position');
  const indices: number[] = [], weights: number[] = [];
  for (let i = 0; i < vertices.count; i++) {
    const lower = 1 - T.MathUtils.smoothstep(vertices.getY(i), jointY - .065, jointY + .065);
    indices.push(0, 1, 0, 0); weights.push(1 - lower, lower, 0, 0);
  }
  geometry.setAttribute('skinIndex', new T.Uint16BufferAttribute(indices, 4)); geometry.setAttribute('skinWeight', new T.Float32BufferAttribute(weights, 4));
  const mesh = new T.SkinnedMesh(geometry, material), upper = new T.Bone(), lower = new T.Bone();
  mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; mesh.scale.z = .96;
  lower.position.y = jointY; upper.add(lower); mesh.add(upper); parent.add(mesh);
  mesh.updateWorldMatrix(true, true); mesh.bind(new T.Skeleton([upper, lower]));
  return lower;
}
