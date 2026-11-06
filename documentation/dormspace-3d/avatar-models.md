# DormSpace 3D avatar models (SRS-504.1)

Approved 3 November 2026. This is the avatar foundation for the third-person 3D DormSpace. Hall, room, decorating, live presence and shop integration follow on their own SRS branches. Production `/game-room/dormspace` still serves the current campus version, and `/game-room/dormspace/classic` remains unchanged.

## Files

| File | Purpose |
| --- | --- |
| `components/dormspace-3d/avatar-style.ts` | Pure resolver: saved Game Room look → 3D parts and notices |
| `components/dormspace-3d/avatar-pose.ts` | Pure pose maths: joint angles, floor contact, reduced motion |
| `components/dormspace-3d/avatar-model.ts` | Three.js model: create, pose and dispose |
| `components/dormspace-3d/review-looks.ts` | Synthetic looks for review and tests (not account data) |
| `components/dormspace-3d/avatar-review.tsx`, `app/dev/dormspace-3d/page.tsx` | Development-only review page |
| `components/jumpyland/character-rig.ts` | Existing Game 1 rig. It gains an optional, backward-compatible `options` argument (`style`, `normalMap`) and exported types. Calls without options behave exactly as before. |

## API

```ts
import { createDormAvatar, updateDormAvatarPose, disposeDormAvatar } from 'components/dormspace-3d/avatar-model';

const model = createDormAvatar(gameRoomData);  // GameRoomData, a saved AvatarAppearance, or null
scene.add(model.root);                        // place at a floor point / seat / bed anchor
model.root.rotation.y = yaw;                  // the model faces +Z
updateDormAvatarPose(model, 'walk', now, { reducedMotion, seatHeight, bedHeight });
model.notices;                                // explicit messages for pieces without a 3D version
model.key;                                    // same key = same look; rebuild only when it changes
disposeDormAvatar(model);
```

- **Poses:** `idle`, `walk`, `run`, `sit`, `sleep`.
  - Poses rotate the rig's real shoulder, elbow, hip and knee joints and its head pivot.
  - Poses are deterministic for a given time, so every client draws remote players the same way.
- **Floor contact:** standing, walking and running keep the lowest sole at y = 0. The offset is calculated exactly from the leg chain measured on the built rig.
- **`sit`:**
  - The root is the seat anchor. The hips rest at `seatHeight + 0.065` (default seat 0.42 m) and the thighs face +Z.
  - On a high seat, the thighs tilt down by up to about 35° so the soles reach the floor.
  - On a low seat, the hips rise just enough to keep the soles above the floor.
- **`sleep`:**
  - The model lies on its back, face up, with its head toward local −Z, centred on the root and resting on `bedHeight` (default 0.5 m).
  - The eyes close.
  - The furniture's yaw goes on `root`, so every orientation works.
- **Reduced motion:** `reducedMotion` defaults to the viewer's `prefers-reduced-motion` setting. When it is on, stride, sway and breathing stop, and the scene shows movement by moving the root.
- **Disposal:** `disposeDormAvatar` frees the model's geometries, materials, textures and skeletons. Resources marked `userData.shared` stay: the shared cloth normal map, and the sphere and box primitives used by details. Calling it twice is safe.

## Saved look → 3D parts

The resolver reads saved data only and never changes, migrates or writes it.

**Precedence**

1. **Complete `avatarId`.** The collection variant supplies the presentation silhouette, hair or hijab and its colour, garment, outfit colours, glasses and the painted skin tone.
   - A saved `bodyShape` and `skinColor` override these and are authoritative.
   - Saves fill `shirtColor: navy`, `pantsColor: denim` and `faceStyle: natural` by default. These are **not** applied as overrides to complete avatars, because the variant already is the outfit.
   - `faceStyle` can add square frames or freckles. It never removes the variant's glasses.
2. **Otherwise, the layered fields** (`headStyle`, `topStyle`, `topColor`, `bottomStyle`, `bottomColor`, `skinTone`) override, piece by piece, the legacy look resolved from the catalog asset keys of `faceId` and `outfitId` (`sample-` prefix removed).
3. **Colours:** a layered colour, then the separate `shirtColor`/`pantsColor`, then the outfit default.
4. **Skin:** `skinColor`, then `skinTone`, then the default tone.
5. **Body shape:** `bodyShape` width (slim 0.88, average 1, broad 1.13, plus 1.27), otherwise average. Torso and limbs widen in 3D; the head keeps its size.
6. **Face details:** `square-glasses` gives square frames; `round-glasses`, `glasses-freckles` or a glasses face gives round frames; `freckles` and `glasses-freckles` add freckles.
7. **No saved appearance (SRS-504.2):** the Game Room default, which is the initial face and the first outfit.

**When a piece has no 3D version**
- A photo face (`faceId: null`), an unknown avatar id, an unknown catalog asset key or an invalid option keeps the default for that piece only.
- It also adds a notice to `model.notices`. No unrelated look is chosen.

**Presentation**
- `male`, `female` or `hijab` describes the selected look's silhouette only.
- It is never an inference about the student's account or gender, and the style record has no gender field.

**What each saved choice maps to**

| Saved choice | 3D result |
| --- | --- |
| Hair | waves, curls, coils, locs, fade, long waves, ponytail, bob (with a curl ring for curly bob), braids; auburn hair colour |
| Hijab | modelled hijab and drape in the saved colour |
| Top | hoodie (hood, pocket, cords), crewneck collar, zip jacket (zip, inner tee), cardigan (buttons) |
| Bottoms | straight jeans (seams), wide leg (wider trousers, same shoes), chinos (no denim seams) |
| Glasses | round rims, or square box frames with temples |
| Freckles | small spots in a darker shade of the saved skin |

## Assets and performance

- The model is entirely procedural Three.js geometry, reused from the Game 1 rig.
  - There are no image textures, billboards, generated PNGs, new model files or new dependencies (Three.js 0.186 was already installed).
  - Indoors, the backpack is off by default (`{ backpack: true }` turns it on).
- Static sibling meshes that share a material are merged once at creation, so one model draws far fewer meshes than the unmerged rig.
  - Joints, skinned sleeves and trousers, soles and the closed-eye group are not merged.
  - Skinned limbs are not frustum-culled, because their cached rest-pose bounds would be wrong once sitting or lying.
- The cloth normal map is one shared texture for every model.
- Scenes should keep one model per player and rebuild it only when `model.key` changes.

## Review page

`/dev/dormspace-3d` is available only in development (`next dev`), like `/dev/game-room`.
- It loads Three.js dynamically and renders every synthetic look over a room-coloured floor with directional and contact shadows.
- Controls choose the look, pose, furniture yaw and reduced motion. The page shows notices and the draw-call count.
- Plain grey blocks stand in for the seat and the bed (pillow at −Z).
- It reads no API and no accounts. If WebGL is unavailable, it shows a message instead of the scene.

## Verification

Pending. Codex runs it; no result is claimed here.

```sh
npx vitest run __tests__/dormspace-3d-avatar-style.test.ts __tests__/dormspace-3d-avatar-model.test.ts
npm test
npm run build
```

Then open `/dev/dormspace-3d` with `npm run dev` for the visual review.
