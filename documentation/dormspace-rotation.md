# DormSpace furniture rotation

In **Decorate**, select floor furniture from the inventory, the room, or the **Placed furniture** picker. Use **Rotate clockwise ↻** or press **R** outside text/select controls. Each turn advances 90 degrees. The selected-item preview shows its next orientation and floor footprint.

An existing item turns and saves in place when there is room. A turn that crosses a wall, the doorway, or incompatible furniture keeps the last saved arrangement and offers the new orientation for placement elsewhere. Cancel leaves the saved item as it was. Moving an item preserves the selected orientation. Wall decorations stay upright.

Floor furniture has front, left, back and right sprites at 0°, 90°, 180° and 270°. Furniture remains upright in each view. Beds have matching sleeping frames; chairs, sofas and armchairs have matching sitting frames with foreground parts hiding the avatar where appropriate. Both action frames are packed into one cached sprite strip per orientation. Animation uses CSS and honors reduced motion; the room does not re-render every animation frame.

Rugs remain walkable and fit beneath furniture in every orientation. Raised furniture uses its rotated footprint for movement, placement checks and safe return spots. Moving or rotating furniture over the avatar relocates the avatar to clear floor space.

## Persistence

Apply `supabase/migrations/20261020021507_dormspace_rotation.sql` after the existing DormSpace migrations. The migration adds a checked rotation column defaulting to 0 for existing placements. It updates the existing placement trigger and patches only placement input/output in the restricted DormSpace bridge, preserving its account, friendship, guestbook and conflict checks and existing permissions. It fails clearly if the bridge no longer has the expected placement statements. Reruns are safe.

The API accepts only numeric 0, 90, 180 or 270 degree rotations. Missing rotation means 0 for older clients. Invalid turns, forbidden wall rotation, overlap, bounds, entrance violations, unowned items, visitor edits and stale versions are rejected server-side.

## Verification and sprite exports

Run `npm test` and `npm run build`. The rotation database test runs through the real service-role bridge in isolated PostgreSQL, including legacy placements and migration reruns.

`npx vitest run --config vitest.dormspace-rotation.config.ts` runs browser coverage against synthetic local test accounts. Use the Playwright and Chrome environment variables documented in `dormspace-furnishings.md` when needed. The suite exports `tmp/dormspace-rotation/furniture-sprites.png` plus JSON coordinates: 44 idle views and 32 sitting/sleeping frames. It also saves labeled furniture/action previews and screenshots of every bed and seat orientation. These exports use the same code-native art as the running game.
