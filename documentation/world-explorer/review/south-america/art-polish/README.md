# South America art polish — Stage A review package

Stage A covers three deliberately different levels: Bolivia (an open landscape), Brazil (a dense environment) and Venezuela (a vertical landscape). The aim was to prove the new visual standard before redoing the other nine.

Every image here is a capture of the actual running game, made in headless Microsoft Edge with hardware WebGL. Captures were only arranged and scaled, never retouched or generated.

**Status:** the first pass was kept, and a second, focused refinement pass followed the Stage A feedback (see [Refinement pass](#refinement-pass) below). All three remain at TESTING until acceptance (human review and real-phone play) is complete. Stage B has not started.

## What to look at

| File | Contents |
| --- | --- |
| `compare-bol.jpg`, `compare-bra.jpg`, `compare-ven.jpg` | Before (the original art) and after (both passes), side by side, for all four shots |
| `before/<code>-{a-start,b-gameplay,c-landmark,d-overview,phone}.jpg` | All 12 countries before the pass (the baseline) |
| `round-1/<code>-…jpg` | Bolivia, Brazil and Venezuela after the first pass, as first reviewed |
| `after/<code>-…jpg` | Bolivia, Brazil and Venezuela after the refinement pass (current) |
| `settings/after/{chl,pry}-…jpg` | Chile (El Tatio) and Paraguay (Trinidad) after the change of setting; their art is still prototype level |
| `../playthroughs/` | Complete desktop playthroughs of the three in the production build (see its README) |
| `before/capture-results.json`, `after/capture-results.json` | Load time, average FPS, 1% low, worst frame, draw calls, triangles, GPU geometries and textures, and JS heap, for desktop and the phone viewport |
| `performance-uncapped/` | All 12 with vsync and the frame-rate limit off, to show the real margin above the 120 FPS cap |
| `performance-isolated/` | Re-measurements of the Stage A levels, each run alone |

The four shots come from `scripts/world-explorer/south-america-shots.json`:

- **A — Start:** the normal gameplay camera at the spawn.
- **B — Main gameplay:** the gameplay camera at ground height over the defining mechanic.
- **C — Landmark:** an explicit review camera on the main landmark.
- **D — Overview:** the development overview.

Re-run with:

```
node --experimental-websocket scripts/world-explorer/capture-levels.mjs --codes BOL,BRA,VEN --gpu 1 --out documentation/world-explorer/review/south-america/art-polish/after
node --experimental-websocket scripts/world-explorer/compose-review.mjs --codes BOL,BRA,VEN
```

## Refinement pass

Requested after the first review: keep the Stage A improvements, and refine three things in each level without changing routes, collisions or mechanics. A test still raycasts every platform to prove the walking surface is at the collision height and clear of decoration.

### Brazil: platform edges, trees and lilies

- **Edges with natural volume.** Every bank and canopy branch now has a rounded moss roll along its front lip: an upper roll hugging the edge, a darker roll below it, and moss strands hanging from both. The ends get moss mounds, banks get stones tucked into their front corners, and half-sunk stones sit at the waterline. All of it stays under the walking cap. The first version placed corner stones outside the body, where they floated; they were moved in.
- **Varied trees.** Each forest layer is split across several template variants, with per-tree proportions and six leaf tints, and smaller emergents break up the mid-canopy line. The kapok crowns vary in the same way.
- **Varied lilies.** Lilies grow in clusters of two to five: adults with rims of different heights, smaller reddish-bronze juveniles, flowers that are white (first night) or pink (second night), and a few closed buds. They are kept to the middle distance, so none fill the bottom of the frame.

### Venezuela: rock detail, cliff silhouettes and clouds

- **Rock detail.** Tepui walls have twice the resolution, fine vertical flutes, deep vertical joints (darkened), recessed bedding planes with green ledges, black runoff stains and pale lichen.
- **Cliff silhouettes.** The rims are broken by notches and a few collapsed sections, the walls flare into an uneven talus skirt, and the escarpment below the route gains buttresses, joints, bedding recesses and a scree apron. Collapses only ever lower the rim, so it never rises into the route.
- **Clouds.** Flat cloud caps cling to the tepui rims and bands wrap their walls, drifting slowly. The valley holds a three-layer cloud sea that scrolls gently. One instanced draw serves the caps, and three planes the sea.

### Bolivia: landing edges against the bright salt

Every salt platform (flats, blocks, piles, the hotel) gets brine-stained edges: a dark outer line and a stained band along both ends and the front, and a shadowed lip on the faces below. The rims lie a few millimetres above the walking cap, well inside the 0.06 tolerance of the walking-surface test. The first version's face lips were too dark and read as black rails, so they were lightened. From the very low start camera the flush ground-level edges are still subtle; the raised blocks and pool edges, where landings matter, read clearly.

### Performance after the refinement (production build, laptop, start view)

Measured with `capture-levels.mjs --perf-only` against the production server, frame rate capped at 120, over 600 frames each (`performance-production/capture-results.json`):

| Level | Desktop 1600×900: average · 1% low · ready | Phone viewport 844×390: average · 1% low · ready | Draw calls | Triangles |
| --- | --- | --- | --- | --- |
| Bolivia | 120 · 116 · 4.4 s (first, cold load) | 120 · 112 · 1.7 s | 86 | 89k |
| Brazil | 120 · 110 · 1.3 s | 117 · 55 · 1.3 s | 106 | 228k |
| Venezuela | 118 · 59 · 1.6 s | 120 · 118 · 1.1 s | 97 | 221k |

The two lower 1% lows come from a few single frames of 17–25 ms in one run each, not sustained drops. The refinement costs about 9 draw calls and 29k triangles in Brazil and 4 draw calls and 32k triangles in Venezuela. The phone column is a viewport on the laptop GPU, not a phone.

**A correction to earlier figures.** The capture scripts left headless Edge instances running after each run: on Windows, stopping the launcher did not stop the browser. By this point about 30 instances were rendering in the background. Development-server figures taken during this session, including the noisy 1% lows above and Bolivia's 7–8 s load in the first playthrough run, were depressed by that load. The scripts now close the browser over DevTools, the instances were stopped, and the table above was measured on a quiet machine. Figures in the first-pass section below may also have been affected.

## What changed in the first pass

### Shared pipeline (usable by all 12)

- **Sculpted platform bodies** (`kit/landmass.ts`). Three new opt-in body profiles replace walls that ran straight down out of view:
  - `island`: tapers into an eroded, off-centre keel.
  - `shelf`: a ledge that recedes into a cliff behind it.
  - `mass`: a rock that widens into water or ground.

  Bodies have limited visual depth, strata, a mossy lip and a darker underside. The collider is unchanged: the walking cap stays at the collision height, and a test raycasts every platform to prove it. `createRockMass` builds the same shapes as scenery.
- **Waterfalls with a source and a destination** (`kit/cascade.ts`). Each has:
  - a feeder river on the cliff top
  - a curved, streaked falling ribbon that can break into spray part-way down
  - foam at the lip and the base
  - impact mist and ripples

  All of a level's falls share one shader draw for the ribbons.
- **South American flora** (`countries/south-america/flora.ts`). Instanced templates, each one draw per stand:
  - rainforest emergents with layered crowns and lianas
  - mid-canopy trees
  - açaí palm clusters
  - heliconia
  - big-leaf understory
  - ferns
  - liana curtains
  - tepui bromeliads and shrubs
  - grass

  A vertex-shader breeze moves foliage at no per-frame CPU cost.
- **Review tooling.** The capture script now takes the four shots and measures frame times (average and 1% low), load time and memory. It also has an uncapped mode and a performance-only mode. Review mode gained an explicit landmark camera and frame-time statistics (`reviewStats`, `setReviewCamera`).
- **Country cards** now show the playable level's own location, featured landmark and an in-game preview image (`public/world-explorer/previews/`). They no longer show the first landmark of the general country profile. Venezuela now reads "Angel Falls (Kerepakupai Merú) on Auyán-tepui · Canaima National Park, Bolívar", and its level is titled "Angel Falls: The Auyán-tepui Descent".

### Bolivia — open landscape

- **Polygonal salt crust:** an irregular hexagonal-plate texture with raised white ridges, used as colour and relief on the foreground flat and on every salt-flat cap.
- **The salt mirror:** beyond the dry crust, a planar reflection (a three.js `Reflector`) mirrors the sky and volcanoes across the far flat. The near landing crust stays dry, so the reflection never hides a landing surface.
- **Rising salt blocks:** they keep their brick strata, gain crystal crowns (behind the lane), and throw up a burst of salt dust with a brine ripple when a plate raises them.
- **Isla Incahuasi:** its ledges and the salt piles are sculpted masses widening into the flat, in pale fossil-coral limestone rather than dark brown rock.
- **Unchanged:** there are no generic brown pillars, and vegetation stays minimal (cacti on the island).

### Brazil — dense environment

- **Setting:** rebuilt as a flooded várzea forest, with the river at the level of the route.
  - Mossy, root-wrapped banks rise from the water with eroded bases.
  - Giant kapok trunks stand in the flood and carry the canopy branches.
  - Lianas hang from the branches.
- **Forest depth:** three layers, simplified with distance: far canopy, mid canopy, and near trees and açaí palms.
  - Light shafts slant through the canopy.
  - River mist drifts over the water.
  - Giant Victoria water lilies float on the open river.
- **Waterfalls:** two cascades pour from a sculpted mossy cliff, each with a source on top and mist where it lands.
- **Foreground:** big leaves and heliconia sit low in front of the water and never rise to the route.
- **Performance:** 278k → 199k triangles and 125 → 97 draw calls on the same start view.
- **Kept:** the vine swings, rafts, bromeliad launch and canopy traversal.

### Venezuela — vertical landscape

- **The route** is a stair of ledges on a tepui escarpment (`shelf` bodies) and free-standing sandstone spires (`island` bodies). The fluted escarpment drops about 45 units below the route into a valley of cloud and rainforest.
- **The view stays open.** The cliff band sits below and behind the ledges, so no single face fills the gameplay view.
- **The start** is a real tabletop summit plateau.
- **Angel Falls** pours from the rim of a separate Auyán-tepui spur, with a feeder river on top. It breaks into spray on its long fall and lands in a plunge pool. More flat-topped tepuis stand on the horizon.
- **The climbable faces** carry hand-holds, roots and vines, so the climb reads before you try it.
- **Kept:** the crumbling blocks, the gusts, the slick spray rock and the climbs. The level was not changed.

### Gameplay

No level data, physics, mechanic or route changed in this pass. The only level-file change is Venezuela's title.

## Visual review checklist (directive section 7)

| | Bolivia | Brazil | Venezuela |
| --- | --- | --- | --- |
| Main silhouette | Endless flat line, low volcano range | Layered tree crowns, cliff with falls | Flat-topped tepuis, sheer escarpment |
| Terrain family | Salt crust, mineral blocks, coral-limestone island | Mud banks, roots, mossy rock | Black quartzite over pink-orange sandstone |
| Ground texture | Polygonal crust | Leaf-litter mud, moss | Weathered summit rock, pools |
| Vegetation | Giant cacti, ichu tufts only | Kapok, açaí, heliconia, big-leaf, lianas, lilies | Tepui shrubs and bromeliads, lowland canopy far below |
| Architecture | Salt-brick hotel, rusted locomotives | None (wild forest) | None |
| Palette | White, sky blue, turquoise brine, ochre | Greens, river jade, red accents | Rust, pink and black rock, green ledges, cloud white |
| Landmark placement | Incahuasi at the finish; volcanoes and the mirror on the horizon | Waterfall cliff behind the lookout | Angel Falls on the mid-distance spur |
| Water | Brine pools, planar salt mirror | River at route level, two waterfalls | Angel Falls, plunge pool, river far below |
| Lighting | Hard high-altitude sun, deep blue sky | Humid filtered sun, light shafts | Warm sun breaking through cloud |
| Atmosphere | Salt glints, crisp air | River mist, pollen, fireflies | Cloud sea in the valley, falls spray |
| Framing | Wide and open; horizon low | Dense mid-ground, open water below | Ledges against open sky and the drop |
| Background density | Sparse by design | Dense, simplified with distance | Large masses, few elements |

## Performance (development laptop)

These were measured while each level idles at its start, at 1600×900 (desktop) and at an 844×390 viewport (phone). The phone column emulates the viewport on the laptop GPU; it is not a phone.

| Level | Before (capped) | After (capped, measured alone) | After, uncapped average | Draw calls before → after | Triangles before → after |
| --- | --- | --- | --- | --- | --- |
| Bolivia | 120 FPS, 1% low 78 | 120 FPS, 1% low 112 (95 with the mirror, in a shared run) | 185 FPS desktop · 312 phone viewport | 86 → 83 | 87k → 88k |
| Brazil | 120 FPS, 1% low 110 | 120 FPS, 1% low 113 | 209 FPS desktop · 225 phone viewport | 125 → 97 | 278k → 199k |
| Venezuela | 120 FPS, 1% low 113 | 120 FPS, 1% low 113 | 230 FPS desktop · 243 phone viewport | 77 → 93 | 166k → 189k |

How to read these numbers:

- **The 1% lows are noisy** on this machine. The app runs on the Next.js development server, which recompiles and hot-reloads, and other captures and tests sometimes ran at the same time. Two clean isolated runs each gave 120 FPS with 1% lows of 112–113. A shared run once showed Venezuela at a 9 FPS 1% low; it did not reproduce when run alone.
- **The uncapped figures** show all 12 well above the 60 FPS desktop aim on this laptop: 185–328 FPS average. The mirror costs Bolivia about a third of its frame time.
- **Load time to ready** is 3–5 s on the development server, about 11 s for Bolivia. The first level in each run also includes the dev server compiling that chunk; a production build was not measured.
- **JS heap** stays at 90–155 MB.
- **No real phone has been tested.** The 30 FPS mobile aim is unverified, and Brazil remains the heaviest scene at 199k triangles.

## Not done yet (needs people or the next stages)

1. **Acceptance of Stage A** (human review and real-phone play) before Stages B and C start.
2. **Human gameplay review** of all 12: input, readability, camera and difficulty. The directive's section 12 checklist has not been answered by a person.
3. **Real device testing:** a lower-powered laptop and at least one phone in landscape. The production build has now been played through on this laptop (see `../playthroughs/`).
4. **Stage B and C art** for the other nine. Their "before" captures are in `before/`. Chile (now El Tatio) and Paraguay (now Trinidad) have their single settings; their art is still at prototype level.
5. **Bolivia's ready time** is 4.4 s on a cold first load of the production build (1.7 s after), against 1.1–1.6 s for Brazil and Venezuela. The procedural salt-crust texture is generated at load and could be cached or shipped as an image.
6. **Licences:** all geometry is original and procedural, and surface maps are the existing CC0 Poly Haven sets (`public/world-explorer/materials/LICENSES.md`). No third-party models were added.
