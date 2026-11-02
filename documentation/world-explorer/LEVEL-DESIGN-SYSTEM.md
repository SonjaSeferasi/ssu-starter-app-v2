# World Explorer level design system

This is how World Explorer builds country levels that play differently while sharing one engine. Three proof levels exercise it: Egypt, Brazil and Norway. The production tracker for all 193 countries is in [DESIGN-MANIFEST.md](DESIGN-MANIFEST.md). Earlier per-country notes are in [COUNTRY-LEVELS.md](COUNTRY-LEVELS.md).

Status: all three proof levels can be played from start to finish and pass every automated check below. None has had a human visual or device review, and no level is marked release-ready.

## 1. Audit of the previous system (phase 1)

| Area | What the code did | Problem |
| --- | --- | --- |
| Level structure | All ten country levels (Italy to the USA) followed one eight-section template (A–H). A–H ran: a 12–16-unit start plateau, steps, a bridge section, an upper route with a lift and a star, a single mechanic (gust, ice or a moving platform), an enemy island, a final step and the finish. Every level had exactly 30 coins. | Same rhythm everywhere. The new similarity checker scores the seven remaining template levels 0.96–1.00 against each other. |
| Terrain | Every platform was a `scenic-kit` island: a tapered rock with a flat cap, 3–7 units thick. | "Floating rock" look. There was no continuous ground, stairs, slopes or cliffs to stand on. |
| Camera | Authored levels used a fixed composition camera at z = 24 (player ≈ 9.4 % of view height), following climbs at 0.35–0.42. | Too distant, and jumps moved the horizon. Japan had its own tuned camera. |
| Mechanics | Moving platforms (sine, eased pause, bob), ice, wind gusts and patrol enemies. | No switches, gates, collapsing ledges, swings, bounce pads or walkable stairs. |
| Validation | `routeLeaps` (worst-case jump arc), `headroomConflicts`, and a bot run along the main and star routes. | No route graph, no timing variation, no difficulty calibration, no repetition detection. |
| Difficulty | A level's `difficulty` label plus "Expert challenge", which narrowed later landings. | Not tied to measured jump physics. |

## 2. Reusable components

| Component | File | Role |
| --- | --- | --- |
| `LevelSimulation` | `lib/world-explorer/simulation.ts` | Fixed 60 Hz, pure and deterministic, with `clone()` for look-ahead. Rendering never changes collision. |
| Walking surface | `lib/world-explorer/platform-surface.ts` | One height function for feet, pickups and markers: flat, sagging bridge, slope or stair treads. |
| Manifest validation | `lib/world-explorer/level-manifest.ts` | `validateLevel` bounds-checks every field before a level mounts. |
| Route graph | `lib/world-explorer/route-graph.ts` | Authored graph, or a graph derived from old main and upper routes. Provides critical and optional paths. |
| LevelValidator | `lib/world-explorer/level-validator.ts` | 16 checks: graph structure first, then physics at several timings. |
| DifficultyAnalyzer | `lib/world-explorer/difficulty.ts` | Measures Dmax and Hmax. Holds the tier table, the measured tier and the Explorer-assist transform. |
| LevelSimilarityAnalyzer | `lib/world-explorer/level-similarity.ts` | Structural fingerprints and pairwise scores, with flags for human review. |
| Input-driven bot | `lib/world-explorer/level-analysis.ts` (`playRoute`) | Presses only left, right and jump, guided by a look-ahead clone. It never teleports during play. |
| Design manifest | `lib/world-explorer/design-manifest.ts` | 193-country production tracker, mechanics catalogue, archetypes and card status. |
| Gameplay camera | `lib/world-explorer/game-camera.ts` (`gameplayCameraFrame`) | Per-level camera distance. Follows the ground height, not jumps. |
| Environment contract | `components/world-explorer/countries/types.ts` and `registry.ts` | Lazy per-country scenery modules. |
| Playable terrain kit | `components/world-explorer/kit/landmass.ts` | Ground, cliffs, slopes, stairs, ice and blocks that run down out of view. |
| Mechanism visuals | `components/world-explorer/kit/mechanisms.ts` | Sinking stone gate, pressure plate, swing ropes. |
| Scenery kit | `components/world-explorer/kit/*` | Sky, heightfields, water, vegetation, particles, wildlife, decks, markers, creatures and CC0 surface maps. |

## 3. Level schema additions

All of these fields are optional, so existing levels behave exactly as before. Every field is checked by `validateLevel`.

```jsonc
{
  "difficultyTier": 2,                       // 1–5, see section 6
  "design": {
    "archetype": "desert-ruins-mechanism",
    "signatureMechanic": "pressure-plate-timed-gate",
    "mechanics": ["pressure-plate", "timed-gate", "sand-gusts"],
    "terrain": ["ground", "sand", "stairs", "cliff", "arch"],
    "verticality": "medium",
    "enemyProfile": "light",
    "targetDurationSeconds": 60,
    "seed": 2026101
  },
  "camera": { "height": 2.6, "look": 1.75, "follow": 1, "maxRise": 0, "distance": 20.5 },
  "platforms": [
    { "id": "eg-stairs-1", "terrain": "stairs", "slope": 1.2, "steps": 4 },  // walkable stairs
    { "id": "br-swing-1", "motion": "pendulum", "length": 5, "amplitude": 2.2 },
    { "id": "no-ice-1", "surface": "ice", "collapse": { "delay": 0.9, "respawn": 4 } },
    { "id": "br-bromeliad", "bounce": 14 }
  ],
  "gates":    [{ "id": "eg-sun-gate", "x": 90.15, "y": 0.4, "width": 0.9, "height": 2.4, "openSeconds": 6 }],
  "switches": [{ "id": "eg-sun-plate", "platformId": "eg-dais", "offset": 1, "gateIds": ["eg-sun-gate"] }],
  "routeGraph": {
    "nodes": [{ "id": "eg-start", "type": "START", "platformId": "eg-start" }],
    "edges": [{ "from": "eg-canyon-far", "to": "eg-col-1", "action": "JUMP", "mandatory": false }]
  },
  "physics": { "stepHeight": 0.4 }            // opt-in step-up onto low risers
}
```

- **Terrain kinds:** `ground`, `cliff`, `slope`, `stairs`, `arch`, `cave`, `rooftop`, `canopy`, `ice-shelf`, `sand`, `water-raft`, `mechanical`, `rock`, `bridge`. The terrain kind tells the scenery what to build; it never changes collision.
- **Route node types:** START, SAFE_PLATFORM, JUMP_PLATFORM, MOVING_PLATFORM, CHECKPOINT, PUZZLE, ENEMY_AREA, DISCOVERY, OPTIONAL_REWARD, FINISH.
- **Edge actions:** WALK, JUMP, DROP, RIDE_PLATFORM, ACTIVATE_SWITCH, CLIMB, PASS_GATE.
- **Sections:** levels now declare between 3 and 12 sections, so the eight-section template is no longer mandatory.

## 4. Mechanics library

Implemented in the shared simulation, each driven by level data:

- moving platforms (eased pauses and bobbing)
- lifts
- pendulum swings
- collapsing ledges that shake, fall and return once the player is clear
- ice
- warned wind gusts (a grounded player feels 30 % of the push)
- water hazards
- pressure plates and timed gates (the gate warns before closing and never closes on the player)
- bounce pads
- walkable stairs and slopes, plus opt-in step-up onto low risers
- patrol enemies

Added for South America (see [SOUTH-AMERICA.md](SOUTH-AMERICA.md)):

- climbable faces (`platform.climbable`)
- switch-raised platforms (`platform.raise`)
- warned timed hazards, which also cover falling debris such as calving ice (`hazards[].cycle`)
- water currents (`platform.current`)

Still only planned (listed as `planned` in the mechanics catalogue): circular platforms, pushable blocks, breakable obstacles, conveyors and low visibility.

## 5. Route graph and LevelValidator

`validateLevelDesign(level)` runs these checks in order:

1. Manifest schema and bounds.
2. One START on the spawn and one FINISH on the goal.
3. Every playable platform is part of the graph.
4. FINISH is reachable by mandatory edges.
5. Every node is reachable from START.
6. No dead ends: every node can still reach FINISH.
7. Checkpoints lie on the critical path, and no stretch without one exceeds 60 % of the course.
8. Collectibles sit on graph nodes, and at least one star rewards an optional route.
9. Headroom is clear on the critical path.
10. Every mandatory jump fits the measured envelope (at most 85 % of Dmax and 70 % of Hmax).
11. The measured tier equals the declared tier.
12. Every gate has a plate placed before it.
13. **Physics:** each mandatory edge is replayed by the bot from its source platform at four timings across the slowest relevant cycle (moving platform, swing or gust).
14. **Physics:** the same for every optional edge.
15. **Physics:** full runs after start delays of 0, 0.7, 1.9 and 3.1 s all finish with no damage.
16. Bot completion time falls between 0.35× and 1.3× of the target duration.

## 6. Difficulty tiers

Dmax and Hmax are measured with the real simulation: a full-speed running jump from flat ground. With the shared physics they come to **Dmax 5.40** and **Hmax 1.95**.

| Tier | Name | Gap (% of Dmax) | Step up (% of Hmax) | Share of 193 |
| --- | --- | --- | --- | --- |
| 1 | Explorer | 25–45 | ≤ 30 | 39 |
| 2 | Adventurer | 35–55 | ≤ 40 | 39 |
| 3 | Challenger | 45–65 | ≤ 50 | 39 |
| 4 | Expert Explorer | 55–75 | ≤ 60 | 38 |
| 5 | Master Explorer | 65–85 | ≤ 70 | 38 |

Each mandatory jump gets the lowest tier that holds both its gap and its step up. The level's tier is the mean of its hardest third of jumps (at least three), plus up to 0.45 for timing mechanics on the critical path. Bounce launches are excluded.

There is no tier lock: every built level is playable from the start, in any order. The tier on a card tells a player how demanding the route is.

**Explorer assist** is a preference. It keeps the same route and gentles the timing:

- longer coyote time and jump buffer
- moving platforms 1.3× slower
- collapsing ledges take twice as long to fall
- wind at half strength
- gate windows 1.5× longer
- patrols 30 % slower

Player-chosen challenge never reshapes a route-graph level. It only quickens patrols.

## 7. Repetition detection

`fingerprint(level)` records what a player does, never what the level looks like:

- archetype and signature mechanic
- the mechanics set and terrain kinds
- a move rhythm (walk, jump, long jump, climb, drop, moving, gate)
- shape metrics: move count, gap mean and spread, vertical range, continuous-ground share, optional share and moving share

`compareLevels` weights these into a score from 0 to 1. A pair at 0.72 or above is flagged **for human review**; the tool never rejects a level by itself.

| Pair | Score |
| --- | --- |
| Egypt ~ Norway | 0.37 |
| Egypt ~ Brazil | 0.26 |
| Brazil ~ Norway | 0.29 |
| Any new level ~ a template level | ≤ 0.32 |
| Template levels with each other | 0.96–1.00, all flagged for review |

## 8. The three proof levels

| | Egypt: Giza Plateau, The Sun Gate | Brazil: Amazon Canopy Run | Norway: Lofoten Cliffs, Ice and Wind |
| --- | --- | --- | --- |
| Archetype | desert ruins with a mechanism puzzle | canopy and river traversal | vertical cliff precision |
| Tier (declared and measured) | 2 · Adventurer (score 2.36) | 3 · Challenger (3.36) | 4 · Expert Explorer (4.36) |
| Hardest gap / step | 48 % / 21 % | 63 % / 41 % | 70 % / 56 % |
| Signature | pressure plate opens a timed sinking gate | vine swings | collapsing ice ledges |
| Other mechanics | warned canyon gusts, scarab patrol, stone stairs | bromeliad bounce launch, drifting rafts over a river hazard, root stairs, seed-pod patrol | slippery ice, headwind ridge, crane lift in a sea cave, rooftop run; no enemies |
| Terrain | plateau ground, sand slope, cut stairs, hoodoo pillars, colonnade lintels | riverbank mud, canopy branches on kapok trunks, rafts, root stairs, waterfall rock | quay, stair path, ledge climb, ice shelves, rorbu rooftops, pier |
| Optional route | three colonnade lintels over the courtyard, with a star | four high branches over the river, with a star | sea cave below the ice, crane lift back up, with a star; it also catches a fall |
| Coins / stars | 33 / 3 | 29 / 3 | 28 / 3 |
| Bot critical run | 26.8 s, no damage | 28.1 s, no damage | 25.7 s, no damage |

### Egypt as designed

The level follows the requested seven-beat sequence:

1. A broad plateau entrance with clustered palms, an obelisk and distant pyramids.
2. Sandstone stairs with one missing section to jump.
3. A wind canyon crossed on standing hoodoo pillars. Banners and a sand stream show the gust direction, and the player can wait the gust out.
4. An optional elevated route of three jumps with a star.
5. A pressure plate on a dais that opens a timed stone gate.
6. A scarab patrolling a terrace.
7. A pyramid overlook finish.

Supporting scenery:

- The pyramids are true pyramids in Giza order, with Khafre's casing cap, instead of stacked boxes.
- The Sphinx stands in profile beside the overlook.
- Foreground dunes, and a desert floor below the plateau, make every gap read as a real drop.

## 9. Gameplay camera

`gameplayCameraFrame` runs for any level that declares `camera.distance`:

- At distance 20.5, the 1.83-unit player fills 10.9 % of the view height (the target is 9–12 %).
- A look-ahead of 18 % of the view width puts the player at about 32 % from the left.
- The camera follows the **ground height** (`cameraTrackingHeight`), so ordinary jumps leave the view still.
- Portrait screens pull back 1.25×.

The full-level overview stays available as a debug tool in Developer view.

## 10. How to add a country

1. **Pick the design** from [DESIGN-MANIFEST.md](DESIGN-MANIFEST.md) (archetype, signature mechanic, tier), and have a person approve it.
2. **Author the level** as JSON in `public/world-explorer/levels/<iso2>-level-01.json`. Include terrain kinds, the route graph, the design block and the camera distance. Use only mechanics marked `implemented`.
3. **Register it** in `lib/world-explorer/authored-levels.ts`.
4. **Write the environment** in `components/world-explorer/countries/<country>.ts` and add it to `registry.ts`:
   - `dressPlatform` should switch on `definition.terrain` and use `dressLandmass` for ground, cliffs, stairs and ice.
   - Keep decoration out of the walking lane (|z| < 0.55).
   - Provide a landmark, sky, lighting, an enemy and the checkpoint and finish markers.
5. **Validate:**
   - `validateLevelDesign(level)` must pass all 16 checks.
   - `analyzeDifficulty(level).measuredTier` must equal the declared tier.
   - `compareLevels` must not flag the level against any existing one.
   - If the similarity check does flag it, change the structure, not the art.
6. **Test:** add the code to the `redesigned` list in `__tests__/world-explorer-level-design.test.ts`. That test checks validation, tier, play at three challenge levels, every coin and all three stars, and Explorer assist.
7. **Review:** capture screenshots at desktop and phone sizes, check performance on real devices, then have a person mark the manifest entry `reviewed`.

## 11. Measured results

- **Tests:** `__tests__/world-explorer-level-design.test.ts` covers:
  - the three proof levels: validator, tier, play, collection and assist
  - the mechanics library
  - the camera
  - the similarity and difficulty tools
  - the design manifest

  The environment tests raycast every redesigned platform to confirm a flat walking cap at the collision height, including on slopes and stairs.
- **Screenshots:** `documentation/world-explorer/review/redesign/` holds desktop captures at 1600×900 from headless Microsoft Edge.
- **Performance,** as reported by the in-game HUD in headless Edge on the development laptop (software-assisted GPU, so not representative of a phone):

| Level | FPS | Draw calls | Triangles |
| --- | --- | --- | --- |
| Egypt | 49–64 | 80–141 | 128 k–153 k |
| Brazil | 43–49 | 170–184 | 280 k–291 k |
| Norway | 50–54 | 111–135 | 133 k–141 k |

Brazil is the heaviest because of its trees and waterfalls; low-graphics mode reduces vertices (this is tested).

## 12. Known limitations

- None of the three levels has had a human visual or device review, and no level is release-ready.
- The bot moves rightward. Its `detours` option can backtrack along a platform or pause at it, but it does not replay whole sections backwards. Going back to a plate after a window lapses is tested directly in the mechanics tests.
- Seven countries (Italy, Canada, Australia, India, South Africa, France, the USA), plus Japan's own reference level, still use the first template and are flagged for redesign.
- Five mechanics in the catalogue are planned but not implemented.
- The remaining 182 manifest entries are generated proposals, not designs.
