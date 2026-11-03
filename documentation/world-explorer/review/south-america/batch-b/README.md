# South America Phase 3 — Batch B review package

**Countries:** Argentina, Chile, Colombia, Ecuador, Guyana. **Status:** all five stay at **TESTING**. Human gameplay review and real-phone play have not been done.

Every image here is a capture of the running game in headless Microsoft Edge with hardware WebGL. Captures were only arranged and scaled, never retouched or generated.

## What to look at

| File | Contents |
| --- | --- |
| `../art-polish/compare-{arg,chl,col,ecu,guy}.jpg` | Before (left) and after (right) for the start, main-gameplay, landmark and overview shots |
| `../art-polish/after/{arg,chl,col,ecu,guy}-*.jpg` | The current captures, including the phone viewport |
| `playthroughs/` | Production-build playthroughs: results, input scripts and screenshots |
| `../acceptance/timing-sweep-batch-b.json` | 24-timing sweep of every route at runtime difficulty |
| `performance-production/capture-results.json` | Frame rate, load time, draw calls and triangles on the production build |

## Gameplay fixes (logged timing failures)

Routes, collisions and signature mechanics are otherwise unchanged.

- **Guyana: bonus route could fail on the last spray ledge.** `gy-ledge-3` holds a star in the falls gust zone. On ice, a player who stopped there for the star during a gust slid off into the gorge. At one timing the bot lost all three hearts this way. The ledge now has normal grip, with moss cushions to show it. Ledges 1 and 2 stay slick, so the spray-slick-ledges mechanic remains.
- **Ecuador: one surge hit at one timing.** A running drop off the pahoehoe cliff landed about one stride from the second wave surge and slid into its edge. The surge's left edge moved from x 41.4 to 42.0, with its right edge unchanged at 44.0. A running drop now has room to stop, and the safe gap between the two surges is the same.

Before the fixes, a 24-timing diagnostic sweep of each route gave:

- Guyana: 1 failed run and 2 runs with damage
- Ecuador: 1 run with damage

That sweep was rerun after the fixes and overwritten. The committed 8-timing sweep `../acceptance/timing-sweep.json` records the same failures. After the fixes there are none (`../acceptance/timing-sweep-batch-b.json`). A bot look-ahead change was tried and reverted; it was not needed.

## Art

Each environment now uses sculpted platform bodies of limited visual depth instead of walls running out of view, region-specific vegetation, a landmark set piece and its own lighting and atmosphere. Colombia's climbable faces stay sheer on purpose, so the climb reads.

- **Argentina, Perito Moreno.** A jagged, fluted blue-white ice cliff rises from milky turquoise Lago Argentino, replacing the box seracs, with brash ice at its foot. Other details:
  - Lenga beech in autumn red, orange and gold, with calafate shrubs and coirón grass.
  - Moraine banks sculpted down into the lake.
  - Granite Fitz Roy needles on the horizon.
  - The stray white shards in the old sky were the underside of the glacier-surface heightfield seen from below. It now sits behind the cliff's rim and is double-sided.
- **Chile, El Tatio.** Concave stratovolcano cones with snow caps rise behind the basin. Sinter and lava platforms widen down to the sinter flat, and the ignimbrite pinnacles stand on rock columns.
- **Colombia, Cocora Valley.** Very tall, slender Quindío wax palms with drooping, silver-backed crowns rise above mist bands, with cloud forest on the upper slopes. Other details:
  - Tree ferns, pasture fencing, and a timber mirador at the summit.
  - Rounder ridges instead of thin sheets.
- **Ecuador, Galápagos.** Lava and tide shelves are sculpted down into the sea, with ropy pahoehoe folds on the lava. Other details:
  - Spatter cones on cone bodies, and tuff cones with ash banding.
  - A craggy tuff pinnacle offshore.
  - Opuntia tree cactus and pale palo santo.
  - Scenery wildlife: marine iguanas, Sally Lightfoot crabs, a sea lion.
- **Guyana, Kaieteur.** The falls are a wide single curtain pouring from the back of a horseshoe notch in the far rim of the gorge, seen from the trail's viewpoints along the near rim. Other details:
  - The gorge has a forested floor, a river and haze.
  - The plateau river runs on its own cliff, with giant tank bromeliads and golden frogs on the rim.
  - The landmark camera now faces the falls, not the river.

A shared helper, `countries/south-america/terrain.ts`, builds the cliff bands. Joints shade only in proportion to depth and the faces receive no shadows, so close views stay readable.

## Tests (scoped)

| Scope | What ran | Result |
| --- | --- | --- |
| Batch B level and environment tests, shared working tree | Validator, tiers, collectible acceptance at runtime difficulty (3 timings × 2 routes), challenge settings, walking-cap raycasts, sculpted-depth check | 55 passed |
| 24-timing sweep at runtime difficulty | Critical, main and bonus routes; 72 runs per country | 0 damaged, 0 failed; every coin and star collected without damage |
| Full suite, shared working tree (includes others' uncommitted Asia work) | `npx vitest run` | 1169 passed of 1169 (101 files) |
| Full suite, isolated checkout (HEAD `9f4dcc0` plus only this batch's changes) | `npx vitest run` | 1103 passed of 1103 (98 files) |

Runtime difficulties are Argentina 2, Chile 3, Colombia 3, Ecuador 2 and Guyana 1.

## Production-build playthroughs

These ran on the production build (`SOCIALU_BUILD_TARGET=review next build`, served by `next start`). See `playthroughs/playthrough-results.json`.

**Replays.** All 15 scripted playthroughs passed: two completion routes and a hazard run per country. In each, the page reached exactly the recorded outcome: status, hearts, coins and their ids, stars, discovery and events. Coverage:

- Discovery dialogs, result screens and both checkpoints in every completion run.
- One heart lost and a respawn on the checkpoint in every hazard run.
- Across the two routes, every star in all five countries, and every coin except one of Chile's 24. That coin is collected in the 3-timing acceptance test and the 24-timing sweep, but not at this recording's single start time.

**Saved progress.** Passed for all five: `localStorage` held each as completed, and each card read Completed after a reload.

**Keyboard and emulated touch.** Passed for all five. The keyboard check first failed for Guyana: it ran right before jumping and hit the "?" block at the spawn. It now jumps in place first, as the touch check does, and was rerun for all five.

**Load and frame rate.** On a quiet laptop:

| Level | Desktop: average · 1% low · ready | Phone viewport: average · 1% low · ready | Draw calls | Triangles |
| --- | --- | --- | --- | --- |
| Argentina | 120 · 113 · 4.5 s (first, cold) | 120 · 113 · 1.2 s | 86 | 100k |
| Chile | 120 · 113 · 1.4 s | 120 · 113 · 0.9 s | 82 | 118k |
| Colombia | 120 · 113 · 1.3 s | 120 · 113 · 1.1 s | 88 | 285k |
| Ecuador | 116 · 28 · 1.1 s | 120 · 98 · 0.9 s | 85 | 120k |
| Guyana | 120 · 112 · 1.7 s | 120 · 112 · 1.2 s | 104 | 181k |

## Open items

1. **Ecuador hitch.** There is a single frame of about 167 ms roughly 4 s after load, on desktop. It reproduced across separate runs, and frames stay under 10 ms afterwards. It is probably first-use shader or texture work and needs investigation, likely in the shared scene code.
2. **Colombia's triangle count.** At 285k triangles, mostly the ringed palm trunks, it is the heaviest South American scene. Measure it on a real phone before reducing it.
3. **People and devices.** Human gameplay review, desktop and physical-phone play for all five are not done. Stage A's checks (human desktop, physical phone, Bolivia readability, Brazil patrol fairness) also remain pending.
