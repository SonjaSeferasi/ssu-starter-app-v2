# DormSpace 3D

Approved for implementation by DP on 3 November 2026; scope revision recorded in the SRS on 4 November 2026.
Integration branch: `feature/dormspace-3d-integration`. Each revised or new SRS requirement has a separate branch and focused draft review. Parent card #558;
task cards #1081–#1092 (see `dormspace-3d-task-plan.json`). The production rollout and hosted database migrations are pending. The task board uses In progress for the open work.

## Routes

| Route | What it is |
| --- | --- |
| `/game-room/dormspace` | Default: the walkable 3D game (Three.js loads lazily inside it). Sans-serif UI, no pixel font. |
| `/game-room/dormspace/campus` | The 2D campus redesign, unchanged (`components/dormspace`), with the pixel font. |
| `/game-room/dormspace/classic` | The original 2D version, unchanged (`components/dormspace-classic`), with the pixel font. |
| `/game-room/dormspace/art-credits` | Existing art credits and licences, unchanged, with the pixel font. |
| `/dev/dormspace-3d` | Development only: avatar model review (SRS-504.1). |
| `/dev/dormspace-3d/scene` | Development only: hall, furnished room and shop states with synthetic fixtures; no API calls. |

All versions share the same accounts, saved rooms, ownership, guestbooks and live spaces. No layout or account is
reset or migrated. The legacy routes keep the personalized `GET /api/dorm?view=hall`.

## Code map (by responsibility)

| Responsibility | Files |
| --- | --- |
| Pure world rules: grid↔metres, rotations, seat/bed anchors, camera-relative movement, orbit clamp, wall cut-away, ghost status, shared hall layout | `lib/dormspace-3d-world.ts` |
| Hall directory contract (validation, whitelisting, door labels) | `lib/dormspace-hall-contract.ts` |
| Shop contract (request validation, results, labels, attempt states) | `lib/dormspace-shop-contract.ts` |
| Server bridges | `lib/dormspace-3d-server.ts` |
| APIs | `app/api/dorm/hall/route.ts`, `app/api/dorm/shop/route.ts` |
| Database | `supabase/migrations/20261104050601_dormspace_3d_directory.sql`, `supabase/migrations/20261104050639_dormspace_points_shop.sql` |
| Avatar (SRS-504.1 and SRS-504.16) | `components/dormspace-3d/avatar-style.ts`, `avatar-pose.ts`, `avatar-model.ts` |
| Models | `components/dormspace-3d/scene/kit.ts` (procedural textures, cached geometry/materials), `furniture.ts`, `room.ts`, `hall.ts`, `thumbnails.ts`, `palette.ts` |
| Engine | `components/dormspace-3d/scene/engine.ts` |
| React controller and panels | `components/dormspace-3d/game.tsx`, `hall-layer.tsx`, `room-layer.tsx`, `use-room-editor.ts`, `layer-types.ts`, `api.ts`, `panels/*`, `dormspace-3d.module.css` |
| Live appearance for 3D players | `lib/dormspace-multiplayer.ts` (`avatar` kept on `LivePlayer`, `liveAvatarKey`), `lib/dormspace-live-store.ts` |
| Review | `components/dormspace-3d/scene-review.tsx`, `review-fixtures.ts`, `app/dev/dormspace-3d/scene/page.tsx` |

## Model pipeline

SRS-504.16 adds a block style to the 3D route. DormSpace builds its own rigid avatar from the same Game Room appearance resolver and pose anchors. The hall, rooms and shop share small bevels, clean color fills and geometric fixtures.

Everything in the canvas is built in code with Three.js meshes; there are no sprites, billboards or generated
images of geometry. One cell is 0.62 m. Walking uses 4 cells/s and sprinting uses 1.5× that speed.

- Students: a rigid block rig with animated joints, driven by the DormSpace style resolver. It represents the saved complete avatar,
  layered pieces, body shape, skin colour, hair or hijab, round/square glasses, freckles, outfit and separate top
  and bottom colours. Poses idle, walk, run, sit and sleep are computed so soles meet the floor and hips meet the
  seat or mattress. Photo faces and unknown pieces show the default 3D piece with an explicit notice and a retry
  for load failures.
- Furniture (`furniture.ts`): bed (frame, slats, mattress, duvet with drape and fold, pillows, throw), chair,
  desk with drawer pedestal, open laptop, lamp, books and mug, sofa with seat/back cushions and throw pillows,
  armchair, bookshelf filled with books and a plant, wardrobe with panelled doors, coffee table, nightstand with a
  lamp, potted plant, rug, window with mullions, sill, rod, curtains and a day/night sky. Beveled blocks with solid colors, graphic floor and rug patterns, and a few cylindrical details. Each model is
  built in its unrotated footprint, front facing +z, and placed by the saved grid position and rotation.
- Room (`room.ts`): saved floor and wall appearance, wainscot, rails, baseboards, a fixture strip with the exit
  door and the physical guestbook lectern. Walls between the camera and the player are cut away.
- Hall (`hall.ts`): a 26 m corridor, twelve doors per floor (six each side) with room number and name plaques,
  status lights and lock plates, an elevator with a floor indicator, a window wall, ceiling lamps, sconces,
  noticeboards, benches and plants.
- Budgets: device pixel ratio capped at 1.75 (1.5 on small screens, 1 on software renderers), one 1024² soft
  shadow map, a hemisphere light and a non-shadowed lamp. Static avatar parts are merged per material. Rendering is
  capped at 60 fps, and at 30 fps on software renderers (SwiftShader, llvmpipe, WARP) and small screens; movement
  uses elapsed time, so walking speed does not change. A hidden tab renders nothing and restarts with fresh timing.
  The hall shadow frustum is set once per hall entry and only re-centred after the player walks 0.75 m.

## Engine and controls

`DormEngine` owns the renderer and a `requestAnimationFrame` loop outside React; React passes a declarative scene
spec. It disposes renderer, kits (geometries, materials, textures), avatars, listeners, the resize observer and the
frame request on unmount. Creating the Three.js renderer is the WebGL2 check (no separate probe context); if it
fails the view shows the "unsupported" state, and any other start failure or context loss shows Retry 3D and Open
campus version. Reduced motion holds poses still and snaps the camera. Every hall arrival (elevator or door) faces
down the corridor toward its longer end, beside the correct door, with the camera behind the student; the camera
is still clamped inside the hall.

- Keyboard: WASD/arrows walk relative to the camera, Shift sprints, E interacts, Q/Z turn the camera, R turns
  furniture while decorating, Enter places, Escape cancels. Keys are ignored while typing (inputs, guestbook,
  chat) and while a modal is open.
- Pointer: drag to orbit, wheel or pinch to zoom, click a seat/bed/guestbook/exit/door/elevator to use it.
- Touch: joystick, Run, Interact, camera turn and zoom buttons. The same buttons work with mouse and keyboard.
- Collisions use the existing `moveInRoom` and `roomSolidCells`; rugs stay walkable; furniture moved onto the
  player relocates them with `safeRestExit`. Seats and beds use the existing rest targets and live occupancy
  (one occupant, `DS410` rejection, shared night window); anchors cover all four rotations.

## Behaviour retained from the 2D versions

Owner-only decorating; footprints, quarter turns, one placement per item, bounds, reserved entrance, overlap and
rug compatibility; wall and floor selection; automatic versioned `PUT /api/dorm` saves with saved/error states and
conflict reload; the last accepted arrangement kept on rejection. Storing returns an item to inventory; it is not a
sale. The 3D view adds a green/red ghost at the pointer or keyboard cursor and typed grid coordinates. Visits
are counted only by the existing `open` operation, never by rendering. The existing `Guestbook` and `DormLiveChat`
components are reused unchanged (welcome editing, notes, pages, counts, chat drafts, bubbles). Live players use
the existing `use-dorm-live` hook, store and server; remote players are interpolated and shown with their saved
appearance; friendship revocation is polled every 2 s and ends the visit.

## Data and security contracts

Both new public functions are `SECURITY INVOKER` wrappers with `search_path = ''`, executable only by
`service_role`. They call `SECURITY DEFINER` functions in private schemas (`dormspace_directory`,
`dormspace_shop`) with `search_path = ''`, which resolve the student from `p_auth_id` with
`socialu_require_student`. The API routes run `verifiedUser()` (token and application session guard), pass only
whitelisted fields, return `Cache-Control: no-store`, and map a missing function to 503 with an explicit code.

### Directory — `public.socialu_dorm_directory(p_auth_id uuid, p_action text, p_payload jsonb)`

- Table `dormspace_directory.room_assignments(university_id, room_index, student_id, assigned_at)`, unique per
  school by index and by student, RLS on, no grants, update/delete refused by trigger (doors never move).
- Eligible students (active, verified, linked account) of the caller's school get the next indices in account
  order the first time any schoolmate opens the directory; a per-school advisory lock serializes allocation.
- `directory {floor?}` → `{ floor, floorCount, roomsPerFloor: 12, me: { username, floor, slot }, doors: [{ slot, state, username }] }`
  for one floor only. `state` is `own`, `friend`, `locked` (schoolmate, not a current friend) or `withheld`
  (blocked either way, inactive or unverified, no username). Missing slots are filled as `vacant` by the API.
- `locate {username}` → `{ location: { username, floor, slot } | null }` for visible schoolmates.
- `GET /api/dorm/hall?floor=n` and `GET /api/dorm/hall?locate=username`. Errors: 400 invalid floor or name,
  401/403 account, 503 `DORMSPACE_DIRECTORY_UNAVAILABLE`.
- Live hall spaces stay `hall:<floor>`; the existing school guard (`community_unavailable`) already limits who
  is seen there, so no live change was needed. Room entry is still `GET /api/dorm?owner=…` (owner or current friend).

### Shop — `public.socialu_dorm_shop(p_auth_id uuid, p_action text, p_payload jsonb)`

- Reuses `socialu.catalog_items`, `owned_items`, `point_transactions` (with `validate_points_transaction` and
  `grant_purchase`) and `points_balances`. No new balance.
- Provisional, adjustable implementation-default prices in shared points (not a recorded pricing decision; SRS
  Appendix B-04 stays open), set once only for never-priced items: Plant 150, Armchair 300,
  Sofa 1500, Rug 200, Coffee table 250, Bookshelf 450, Wardrobe 600, Nightstand 150. Bed, desk, chair and
  window starters stay free. Everyone who already owns the eight earlier included items keeps them; future owners
  no longer receive them free (the existing grant trigger only grants unpriced items). A new trigger refuses any
  new free ownership row for a priced DormSpace item.
- `catalog` → `{ balance, offers: [{ id, name, previewKey, kind, surface, width, height, overlapCategory, price, state, reason }] }`
  with `state` in `owned`, `included`, `available`, `insufficient`, `unavailable`.
- `purchase { itemId, expectedPrice, actionKey }`: locks the buyer's account row; the same key returns the
  original outcome (even after a price change); a key used for another item or another ledger entry is
  `key_mismatch`; otherwise `owned`, `unavailable`, `price_changed` (current price returned) or `insufficient`
  are returned without writing anything; a valid purchase inserts one ledger row whose triggers re-check price,
  ownership and balance and grant ownership in the same transaction.
  Result: `{ status: 'completed', replayed, itemId, charged, balance, owned }` or
  `{ status: 'rejected', reason, itemId, price, balance }`.
- `status { actionKey }` → the completed result or `{ status: 'not_found', balance }`.
- `GET /api/dorm/shop`, `GET /api/dorm/shop?purchase=<key>`, `POST /api/dorm/shop`. The POST accepts exactly
  `itemId`, `expectedPrice` and `actionKey` (UUID); 201 new, 200 replayed, 409 `PRICE_CHANGED` /
  `INSUFFICIENT_POINTS` / `ALREADY_OWNED` / `ITEM_UNAVAILABLE`, 422 `ACTION_KEY_MISMATCH`.
- `GET /api/dorm/shop` also returns `buyer`, an opaque per-account scope (truncated SHA-256 of the verified auth
  id; no id, username or token). It is not a credential; the server always charges the session's own account.
- Client: one key per confirmed attempt, kept in `sessionStorage` under `dormspace-pending-purchase:<buyer>` as
  `{ buyer, key, itemId, name, expectedPrice }` (no token) until a definite outcome: completed for that item or
  rejected. Network loss, 5xx, sign-in errors, `not_found` and unreadable responses keep it. A same-key check or
  retry first re-reads the catalog and only proceeds if the buyer scope still matches, so another account signed
  in later in the same tab can never check or retry it. Retries resend the originally confirmed `expectedPrice`;
  if the price changed, the server rejects with `price_changed` and the student must confirm again. A lost
  response shows "Purchase not confirmed" with Check purchase and Try again (same key); "Not now" keeps the attempt
  for the next shop opening, and "Don't buy" (only after `not_found`) discards it. Success refreshes the balance
  and the owner's room so the item can be placed immediately. The DormSpace toolbar shows "Shared points: N" only
  from a server catalog or purchase response (nothing before the first response).

## Migration order

1. `20261104050601_dormspace_3d_directory.sql` (after DormSpace, friendships, multiplayer and school communities).
2. `20261104050639_dormspace_points_shop.sql` (after the furnishings migration; independent of 1).

Both are additive, rerunnable and wrapped in a transaction. Neither has been applied to a hosted database.

## Tests (run by Codex with one worker)

```bash
npx tsc --noEmit
npx vitest run __tests__/dormspace-3d-world.test.ts __tests__/dormspace-3d-contracts.test.ts __tests__/api/dorm-hall-shop.test.ts
npx vitest run --no-file-parallelism __tests__/database/dormspace-3d-directory.test.ts __tests__/database/dormspace-shop.test.ts
npx vitest run __tests__/dormspace-3d-avatar-style.test.ts __tests__/dormspace-3d-avatar-model.test.ts
npx vitest run --no-file-parallelism __tests__/dormspace-*.test.ts __tests__/api/dorm-*.test.ts __tests__/database/dormspace-*.test.ts __tests__/database/school-dormspace.test.ts
npm test
npm run build
node_modules/.bin/vitest run --config vitest.dormspace-3d.config.ts
node_modules/.bin/vitest run --config vitest.dormspace-campus.config.ts
node_modules/.bin/vitest run --config vitest.dormspace-multiplayer.config.ts
```

The PGlite tests cover: identical doors for two same-school viewers including non-friends, non-friend entry
denial, block (both directions) and deactivation withholding identity without moving doors, cross-school
exclusion and lookups, friendship removal without reassignment, floors of twelve, one-floor responses,
immutability, privileges and RLS, migration rerun; prices, free starters, existing grants and layouts kept,
new-owner pricing, ownership guard, one charge per key, key reuse for another item, changed prices, insufficient
balance, unavailable items, competing deliveries without overspend, injected student ids ignored, immediate
placement and migration rerun. Balances in these tests come from a test-only reward-rule credit row inserted with
foreign keys bypassed (`session_replication_role`) for that row only; purchases use the real triggers. The shared
helper `createDorm3dDatabase(students, DIRECTORY_ONLY | SHOP_ONLY)` applies only the migration each file tests
(the directory group also applies the school community migration), so either file can run alone.

The browser suite (`scripts/tests/dormspace-3d.browser.ts`) runs the real app and APIs with four synthetic
accounts: shared doors and locks, a block, keyboard decorating with rotation and a rejected doorway placement,
reload persistence, collision-stopped walking to sit and to sleep with the night window, the guestbook, a live
friend visitor (no decorating, owner layout unchanged by their save request), revocation eviction, purchase with
final confirmation, a dropped response reconciled to a single charge, insufficient points, placing a bought item,
a phone layout with the joystick, and the campus and classic routes. Chromium needs WebGL (SwiftShader flags are
passed). Contexts use a 1024 × 720 desktop or 390 × 844 phone viewport at DPR 1; the stranger's context closes
after the first case and the owner's and friend's before the phone case. Sign-in lets the login page redirect
itself (`?redirect=`), and a failed sign-in saves `signin-failure-dorm<n>.png` and reports the route, engine and
scene state, alerts and recent redacted console/page/request errors. The existing 2D browser suites now open
`/game-room/dormspace/campus`.

## Local verification and limits

- On 5 November 2026, 260 focused checks passed in 24 suites, including the real directory and shop SQL in disposable PostgreSQL, request validation, avatar and world rules, and existing DormSpace regressions.
- All six Chromium scenarios passed across focused runs with synthetic accounts. They covered shared doors and locks, decoration and restoration, sitting and sleeping, the guestbook, live room presence and friendship revocation, purchase recovery without a second charge, and mobile and legacy routes. The local provider stand-in uses the app’s HTTP snapshot fallback for live updates. The owner’s roster assertion passed even though the optional two-canvas screenshot timed out. Evidence is tracked in #1092.
- The repository-wide type check reports seven pre-existing errors in `__tests__/world-explorer-asia-puzzles.test.ts`. It reports no DormSpace errors.
- PGlite runs one connection, so "concurrent" purchases are delivered together but executed in turn; hosted
  concurrency relies on the account row lock, the catalog share lock and the ledger's unique keys.
- Live positions keep the four-way `facing` of the existing protocol; remote players turn toward their movement,
  so the 3D facing between packets is interpolated rather than exact.
- The shared hall uses the existing `hall:<floor>` live spaces, so the 2D campus hall and the 3D hall on the same
  floor number share presence and chat. Their door layouts differ (personalized vs. shared directory).
- Remote 3D appearance relies on the live server's existing `avatar` payload; any saved field it does not send
  cannot be shown for other players.
- Visual quality and frame rate on low-end phones have only been designed for (DPR cap, one shadow map, merged
  avatar parts); they need measurement on real devices.
- The concept image is referenced from `../../output/dormspace-3d-preview/dormspace-3d-concept.png`, outside this
  checkout; Codex places it in documentation if wanted.

## Separate SRS reviews

Each draft shows its own changes. A specification draft uses the related implementation branch as its base. The integration branch brings the reviews together for local acceptance.

| Requirement | Branch | Draft |
| --- | --- | --- |
| SRS-500.7 | [`srs-500.7-3d-fixed-item-orientation`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-500.7-3d-fixed-item-orientation) | [#1125](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1125) |
| SRS-500.16 | [`srs-500.16-placement-preview`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-500.16-placement-preview) | [#1120](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1120) |
| SRS-504.1 | [`srs-504.1-3d-avatar-representation`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-504.1-3d-avatar-representation) | [#1093](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1093) |
| SRS-504.8 | [`srs-504.8-3d-furniture-traversal`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-504.8-3d-furniture-traversal) | [#1126](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1126) |
| SRS-504.10 | [`srs-504.10-third-person-camera`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-504.10-third-person-camera) | [#1118](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1118) |
| SRS-504.11 | [`srs-504.11-running`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-504.11-running) | [#1127](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1127) |
| SRS-504.12 | [`srs-504.12-sitting-sleeping`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-504.12-sitting-sleeping) | [#1113](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1113) |
| SRS-504.13 | [`srs-504.13-live-co-presence`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-504.13-live-co-presence) | [#1112](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1112) |
| SRS-504.14 | [`srs-504.14-legacy-versions`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-504.14-legacy-versions) | [#1111](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1111) |
| SRS-504.15 | [`srs-504.15-3d-recovery`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-504.15-3d-recovery) | [#1123](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1123) |
| SRS-504.16 | [`srs-504.16-dormspace-block-style`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-504.16-dormspace-block-style) | [#1166](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1166) · [card #1165](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1165) |
| SRS-507.1 | [`srs-507.1-3d-game-room-entry`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-507.1-3d-game-room-entry) | [#1122](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1122) |
| SRS-507.2 | [`srs-507.2-3d-own-dorm-door`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-507.2-3d-own-dorm-door) | [#1128](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1128) |
| SRS-507.3 | [`srs-507.3-3d-friend-door-identity`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-507.3-3d-friend-door-identity) | [#1129](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1129) |
| SRS-507.4 | [`srs-507.4-3d-friend-ordering`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-507.4-3d-friend-ordering) | [#1109](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1109) |
| SRS-507.5 | [`srs-507.5-3d-first-floor-allocation`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-507.5-3d-first-floor-allocation) | [#1130](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1130) |
| SRS-507.6 | [`srs-507.6-3d-additional-floor-allocation`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-507.6-3d-additional-floor-allocation) | [#1131](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1131) |
| SRS-507.7 | [`srs-507.7-3d-vacant-doors`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-507.7-3d-vacant-doors) | [#1132](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1132) |
| SRS-507.8 | [`srs-507.8-3d-vacant-door-interaction`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-507.8-3d-vacant-door-interaction) | [#1119](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1119) |
| SRS-507.9 | [`srs-507.9-3d-floor-count`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-507.9-3d-floor-count) | [#1133](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1133) |
| SRS-507.15 | [`srs-507.15-3d-return-through-exit`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-507.15-3d-return-through-exit) | [#1134](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1134) |
| SRS-507.16 | [`srs-507.16-3d-friend-removal-compaction`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-507.16-3d-friend-removal-compaction) | [#1135](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1135) |
| SRS-507.18 | [`srs-507.18-3d-removed-floor-recovery`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-507.18-3d-removed-floor-recovery) | [#1136](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1136) |
| SRS-507.20 | [`srs-507.20-shared-school-directory`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-507.20-shared-school-directory) | [#1116](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1116) |
| SRS-507.21 | [`srs-507.21-friends-only-room-locks`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-507.21-friends-only-room-locks) | [#1124](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1124) |
| SRS-507.22 | [`srs-507.22-withheld-identity`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-507.22-withheld-identity) | [#1137](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1137) |
| SRS-507.23 | [`srs-507.23-own-room-shortcut`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-507.23-own-room-shortcut) | [#1138](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1138) |
| SRS-507.24 | [`srs-507.24-bounded-directory-data`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-507.24-bounded-directory-data) | [#1139](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1139) |
| SRS-508.1 | [`srs-508.1-3d-open-guestbook`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-508.1-3d-open-guestbook) | [#1114](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1114) |
| SRS-522.11 | [`srs-522.11-preserved-free-furnishings`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-522.11-preserved-free-furnishings) | [#1140](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1140) |
| SRS-522.12 | [`srs-522.12-shop-prices-from-the-catalog`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-522.12-shop-prices-from-the-catalog) | [#1141](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1141) |
| SRS-523.1 | [`srs-523.1-3d-atomic-purchase-outcome`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-523.1-3d-atomic-purchase-outcome) | [#1110](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1110) |
| SRS-523.4 | [`srs-523.4-3d-purchase-retry-uniqueness`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-523.4-3d-purchase-retry-uniqueness) | [#1117](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1117) |
| SRS-529.1 | [`srs-529.1-3d-catalog-offer-details`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/srs-529.1-3d-catalog-offer-details) | [#1121](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1121) |
