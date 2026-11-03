# World Explorer — ten new country levels

> **Update:** Egypt, Brazil and Norway have been rebuilt on the route-graph level design system ([LEVEL-DESIGN-SYSTEM.md](LEVEL-DESIGN-SYSTEM.md)); the other seven levels below still use this first template and are flagged for redesign in [DESIGN-MANIFEST.md](DESIGN-MANIFEST.md).

Italy, Egypt, Brazil, Canada, Australia, India, South Africa, Norway, France and the United States are now playable from start to finish. Japan stays the technical reference. All eleven levels run on one engine: the same student explorer, controls, fixed-60 Hz physics, camera, collectibles, checkpoints, discovery block, HUD and passport saving. Each country only adds a level configuration file and a lazily loaded scenery module.

**Status:** every level is a *playable prototype* (`stage: 'prototype'`, `visualReviewed: false`, `releaseReady: false`). Automated play and headless-browser captures pass. Human visual approval, real-device mobile testing and sustained performance sign-off are still to do (see [Known limitations](#known-limitations)).

## Where things live

| Part | Path |
| --- | --- |
| Level configurations (data only) | `public/world-explorer/levels/{it,eg,br,ca,au,in,za,no,fr,us}-level-01.json` |
| Registry of authored levels | `lib/world-explorer/authored-levels.ts` |
| Runtime validation, difficulty scaling | `lib/world-explorer/level-manifest.ts` |
| Physics (wind, ice, paused/bobbing platforms, enemy turns) | `lib/world-explorer/simulation.ts`, `game-types.ts` |
| Reachability, headroom and the test player | `lib/world-explorer/level-analysis.ts` |
| Country scenery contract and lazy registry | `components/world-explorer/countries/types.ts`, `registry.ts` |
| One scenery module per country | `components/world-explorer/countries/{italy,egypt,brazil,canada,australia,india,south-africa,norway,france,usa}.ts` (Japan: `japan.ts` adapter) |
| Shared environment kit | `components/world-explorer/kit/` — terrain presets, bridges and moving decks, water and waterfalls, sky and clouds, landforms, vegetation, particles, wildlife, animals, architecture, markers, creature rig, wind cues, surface maps |
| Engine scene | `components/world-explorer/country-scene.ts` (no country conditionals; it calls the environment contract) |
| Tests | `__tests__/world-explorer-country-levels.test.ts`, `__tests__/world-explorer-country-environments.test.ts` |
| Review captures | `documentation/world-explorer/review/countries/` |

## Shared architecture

- **One engine, many environments.** `mountCountryStage` receives a `CountryEnvironment`, which provides:
  - lighting
  - `mount` (scenery, animation, camera-follow, review view, disposal)
  - `dressPlatform` (visuals only)
  - `createEnemy` and `createDiscoveryBlock`
  - checkpoint and finish decoration

  Physics never reads scenery. The level JSON is the only gameplay input, and `validateLevel` checks it before anything mounts.
- **Lazy loading.** `countries/registry.ts` maps each `environmentId` to a dynamic `import()`. The production build emits one chunk per country (10–21 KB each; Japan 70 KB). World Explorer only downloads the chosen country's scenery, plus that country's regional surface maps (about 150 KB).
- **Level schema additions.** All are validated at runtime:
  - Platforms gain a rendering `style`, `surface: 'ice'`, an endpoint `pause` and a wave `bob`.
  - Enemies gain `turnPause`.
  - Levels gain wind `zones`, eight `sections` (A–H), `environment` metadata, a `camera`, a `difficulty`, an optional `physics.iceGrip`, and coins that may overhang a gap to draw a jump arc.
- **Mechanics.** Each mechanic lives in the shared simulation and is driven by data, never by country checks:
  - **Wind:** calm → warning (banners flutter, sand or spray stirs, a whoosh plays) → a gust that ramps in and out. A grounded player feels 45% of the push and a jumper the full push, so a gust never blows a player standing still off a ledge.
  - **Ice:** grip drops to 30% only on the marked platform.
  - **Moving platforms:** they ease between held endpoints and carry the rider.
  - **Lifts:** a rising lift never slips through a landing player.
  - **Enemy patrols:** they stay inside their platform and pause (`TURN`) at each end.
- **Physics.** Every level uses Japan's tuned values: run 6 u/s, jump 9 u/s, gravity 20 u/s² (2.0 u maximum jump), 120 ms coyote time and jump buffer, and a 1.83 u character, so the explorer is the same size everywhere.

## Common level structure

Every level is about 120–128 units long, with 30 coins, three optional stars, two checkpoints, one patrolling enemy, one jump-hit discovery block, one discovery trigger on the lower route and a finish gate. The layout follows the brief's sections:

| Section | Layout |
| --- | --- |
| A | 14–15-unit starting platform with country props behind the walking lane |
| B | Two small steps (gaps of about 2 units, rises up to 0.6) |
| C | Lower route: a country bridge dropping about 2 units into a valley, with a jump gap |
| D | Upper route: three or four rising rocks over the bridge, including one moving platform |
| E | Star 1 on the highest rock (y ≈ 3.2–4.4), followed by a safe drop back onto the lower route |
| F | The country mechanic on the lower route |
| G | Enemy island (patrol starts 3.5 units in, leaving a safe landing), then a checkpoint |
| H | Narrow step with star 3 (a precise jump), then a 14-unit finish platform |

Star 2 is a high star above an ordinary platform; you collect it by jumping.

Lower-route gaps are at most 3.5 units, and rises at most 1.25. Every gap in the lower route sits where the upper route overhead clears a full jump, and no platform intrudes into the space above a walking surface. Checkpoint 1 is placed where the two routes have already rejoined, so upper-route players receive it too.

## Country deliverables

Screenshots for each country are in `review/countries/`: `<code>-gameplay.jpg` (normal play), `<code>-midcourse.jpg`, `<code>-overview.jpg` (full level) and `<code>-mobile.jpg` (844 × 390 landscape phone). `selection-panel.png` shows the country cards.

### Italy — Ancient Rome: Colosseum Adventure (easy)

- **Setting:** Mediterranean valley inspired by Rome, with a stylized Colosseum (three arcaded tiers and an attic around an ellipse, the outer ring partly fallen to show the inner ring and seating).
- **Scenery:** a two-tier aqueduct with fallen spans, a Forum colonnade, terracotta houses, cypresses, stone pines, olives, a field-patterned valley with a water channel, swallows and olive leaves.
- **Lower route:** Roman arch bridge with a missing span (gap placed under the moving masonry so the jump clears it).
- **Upper route:** four masonry rocks at 0.8, 1.6, 2.6 (moving) and 3.2 above the start; star column at the top.
- **Mechanic:** a stone slab slides 3.2 units between two columns, holding for 1 s at each end.
- **Enemy:** marble-and-bronze automaton (marble body, bronze belt and cap, glowing eyes). Speed 1.0, turn pause 0.6 s.
- **Discovery:** the Colosseum was completed in AD 80 under Titus and was a centre of public shows. Source: [Parco archeologico del Colosseo](https://colosseo.it/en/area/colosseo/). The official page could not be reached from this environment, so the facts were checked against secondary references; recheck the source before release.

### Egypt — superseded by *Giza Plateau: The Sun Gate* (tier 2)

> Rebuilt as a route-graph level; see [LEVEL-DESIGN-SYSTEM.md](LEVEL-DESIGN-SYSTEM.md). The notes below describe the first template version.

- **Setting:** stepped-course pyramids of Khufu and Khafre (with a smooth casing cap) and Menkaure, plus queens' pyramids on the far plateau.
- **Scenery:** a side-profile Sphinx in a quarried enclosure, dune fields, an oasis with date palms, papyrus columns, obelisks and desert kites.
- **Lower route:** two narrow sandstone bridges with a terrace between.
- **Upper route:** eroded rocks, a rising sandstone slab, and a pedestal looking over the Sphinx.
- **Mechanics:**
  - **Wind:** a desert headwind gust on the exposed ledge (2.2 u/s; 1.8 s warning with banners, sand streams and a sound; 2.2 s gust; 7.5 s cycle).
  - **Timing obstacle:** the moving sandstone slab.
- **Enemy:** gold and turquoise scarab with six animated legs. Speed 0.9.
- **Discovery:** the Great Pyramid of Khufu is the surviving monument of the ancient Seven Wonders. Source: [UNESCO 86](https://whc.unesco.org/en/list/86/).

### Brazil — superseded by *Amazon Canopy Run* (tier 3)

> Rebuilt as a route-graph level; see [LEVEL-DESIGN-SYSTEM.md](LEVEL-DESIGN-SYSTEM.md). The notes below describe the first template version.

- **Setting:** emergent kapok trees with buttress roots, a broadleaf understory, bamboo and flowering shrubs, a jungle river with four waterfalls, foam and low mist.
- **Wildlife:** scarlet macaws and fireflies, as scenery only; no animal is an enemy.
- **Lower route:** rope suspension bridge with a small jump between its two spans.
- **Upper route:** mossy canopy rocks, a fallen log and a swinging log.
- **Mechanic:** hanging logs swing on vines from fixed branches. The vines pivot to follow the moving collider exactly.
- **Enemy:** seed pod with a leaf crown. It stops for 1.2 s at each end and looks around.
- **Discovery:** the Central Amazon Conservation Complex is one of the richest places for biodiversity and has the largest array of electric fish. Source: [UNESCO 998](https://whc.unesco.org/en/list/998/).

### Canada — Rocky Mountains: Alpine Adventure (medium)

- **Setting:** two ridged ranges with snow lines and tree lines, a turquoise glacial lake, spruce, birch and aspen.
- **Scenery:** log cabins with snowy roofs, waterfalls, distant elk, ravens, and light snow at height.
- **Lower route:** a 15-unit timber gorge bridge with support posts, then a broad snowy ledge.
- **Upper route:** snowy rocks with icicles, a narrow jump, a rising slab, and a snowy star island with a pine.
- **Mechanic:** one glossy frozen ledge with icicles where grip drops to 30%. The next platform is a short, safe step down, so sliding off is never fatal.
- **Enemy:** pinecone with layered scales and a needle tuft. Speed 0.8.
- **Discovery:** the Canadian Rocky Mountain Parks hold peaks, glaciers, lakes, waterfalls and canyons, and the Burgess Shale fossils. Source: [UNESCO 304](https://whc.unesco.org/en/list/304/).

### Australia — Great Barrier Reef: Tropical Coast Adventure (easy-medium)

- **Setting:** a semi-transparent turquoise lagoon over a reef floor of branching, brain, plate and fan corals, with sand cays and coconut palms.
- **Wildlife:** fish schools, sea turtles, a manta ray and seabirds; none of them is an enemy.
- **Scenery:** a timber pier at the start and surf foam around every rock.
- **Lower route:** a boardwalk, a jump to a floating coastal rock, then a second boardwalk.
- **Upper route:** coastal rocks, a bobbing raft and a reef lookout.
- **Mechanic:** a floating raft drifts 2.8 units and bobs 0.25 on the waves while carrying the player.
- **Enemy:** driftwood-and-shell creature (log body, ribbed shell). Speed 0.85.
- **Discovery:** the reef is the world's largest collection of coral reefs (about 400 corals, 1,500 fish species and 4,000 molluscs). Source: [UNESCO 154](https://whc.unesco.org/en/list/154/).
- **Profile change:** Australia's place profile changed from the Sydney Opera House to the Great Barrier Reef to match this level.

### India — Taj Mahal: Garden Journey (easy-medium)

- **Setting:** a distant Taj Mahal study (plinth, chamfered hall with pointed iwans, onion dome, chhatris and four minarets) beyond a reflecting pool lined with cypress avenues.
- **Scenery:** a red sandstone gateway, charbagh lawns, fountains, chhatri pavilions, rose-ringed parakeets and floating petals.
- **Protected monument:** no platform touches or represents the monument.
- **Lower route:** carved bridges, a fountain island and water channels.
- **Upper route:** sandstone terraces, a rising garden slab and a garden pavilion with the star.
- **Mechanic:** a moving garden platform crosses the water channel, holding for 1 s at each end.
- **Enemy:** clockwork beetle (brass and terracotta, winding key). Speed 0.8.
- **Discovery:** the Taj Mahal was built in 1631–1648 for Shah Jahan in memory of his wife. Source: [UNESCO 252](https://whc.unesco.org/en/list/252/).

### South Africa — Savanna Wildlife Adventure (easy-medium)

- **Setting:** a Kruger-inspired golden plain with tens of thousands of instanced grass tufts, umbrella acacias, granite kopjes, a river valley and distant hills.
- **Wildlife:** giraffe, elephant, zebra and impala herds walk on distant scenery only.
- **Lower route:** a rustic timber river bridge and earthy rocks.
- **Upper route:** granite rocks, a cable-hung swing and a kopje star with a view.
- **Mechanic:** a wooden platform hangs from a trolley on an overhead beam whose posts stand on the neighbouring islands, and crosses the gap.
- **Enemy:** rolling thorn-bush (soft blunt spines, a rolling body). Speed 0.9.
- **Discovery:** Kruger protects a savanna with many species, including elephants and giraffes. Source: [SANParks](https://www.sanparks.org/parks/kruger/explore/fauna-flora/mammals). SANParks blocked automated fetching in this session; the text was kept from the earlier sourced snapshot.

### Norway — superseded by *Lofoten Cliffs: Ice and Wind* (tier 4)

> Rebuilt as a route-graph level; see [LEVEL-DESIGN-SYSTEM.md](LEVEL-DESIGN-SYSTEM.md). The notes below describe the first template version.

- **Setting:** steep, narrow, glacier-carved peaks rising from dark fjord water, inspired by Lofoten, with a cool late-afternoon sky.
- **Scenery:** red rorbu cabins on stilts, piers, boats, waterfalls, low sea fog, seagulls, and a lighthouse at the finish.
- **Lower route:** a 14-unit timber bridge over the fjord gap.
- **Upper route:** snowy rocks, a rope-swung plank under a timber gallows, and a mountain overlook.
- **Mechanic:** two narrow exposed ledges with predictable gusts (2.0 u/s, 1.6 s warning, 2.2 s gust), with spray streaks and banners.
- **Enemy:** frost lantern (frosted shell, pulsing inner glow, orbiting flakes). Speed 0.75.
- **Discovery:** fjords form where glaciers deepen valleys that the sea later floods; Lofoten's peaks were carved by ice. Sources: [Store norske leksikon — fjord](https://snl.no/fjord) and [Lofoten](https://snl.no/Lofoten).
- **Profile change:** Norway's place profile changed from Bryggen to the Lofoten Islands.

### France — Paris: Eiffel Tower Rooftop Adventure (easy-medium)

- **Setting:** an iron-lattice Eiffel Tower (curved legs, X-bracing, base arches, two platforms) behind rows of Haussmann blocks with zinc mansard roofs, dormers and iron balconies.
- **Scenery:** stone quays on the Seine, plane trees, street lamps, café awnings, pigeons and drifting leaves.
- **Lower route:** a stone bridge over the Seine with arches and lamps, then two floating stones.
- **Upper route:** a balcony, a rooftop terrace, a moving lift plate, a floating stone and a roof garden.
- **Mechanic:** a vertical maintenance lift on guide rails. The terrace beyond it is farther than any running jump, so the player must ride it.
- **Enemy:** clockwork pigeon that flaps its wings when it turns or is alerted. Speed 0.8.
- **Discovery:** the Eiffel Tower was completed in 1889 for the World's Fair. Source: [Tour Eiffel](https://www.toureiffel.paris/en/news/history-and-culture/133-years-and-1083-feet).

### United States — New York Harbor Adventure (medium)

- **Setting:** a Statue of Liberty study on its eleven-point star fort and pedestal (robe, raised torch, tablet and crown rays in copper green), with Liberty Island trees and a Lower Manhattan skyline with lit window grids.
- **Scenery:** ferries, tugs, piers, dock cranes and seagulls.
- **Lower route:** a dock walkway and pier with a jump over the water.
- **Upper route:** brick terraces, a crane platform and a harbor-view star.
- **Mechanic:** a maintenance platform hangs from an overhead gantry rail and travels 3 units, holding for 1 s at each end.
- **Enemy:** red-and-blue maintenance robot with a glowing visor. Speed 0.9.
- **Discovery:** the Statue of Liberty was a gift from France, dedicated on October 28, 1886. Source: [NPS](https://www.nps.gov/npnh/learn/news/fact-sheet-stli.htm).

## Test results

`npx vitest run __tests__/world-explorer-country-levels.test.ts __tests__/world-explorer-country-environments.test.ts` runs 118 tests in about 45 s with two workers.

- **Configuration:**
  - validation, identity, honest availability, a sourced discovery and a matching passport fact ID
  - sections A–H, 30 coins, 3 stars, checkpoints, an enemy and a discovery block
  - a 12–16-unit start, a lower bridge, a lower mechanic
  - an upper route with at least three rocks, a moving platform, a star, a climb of at least 1.5 above the main route, and reconnection
- **Physics:**
  - every route leap is inside the real jump arc (moving platforms judged at their closest approach, after riding a lift)
  - no headroom conflicts
  - lower-route fixed gaps ≤ 3.5 and rises ≤ 1.25
- **Input-driven play.** A test player that only presses left, right and jump, using a look-ahead copy of the simulation, must:
  - finish the lower route at Discovery, Adventure and Expert difficulty with no damage, no upper rock, the discovery found and the final checkpoint active
  - collect all three stars through the upper route at Discovery and Expert
  - between the lower and bonus runs, collect **all 30 coins** in every country
- **Mechanics:** wind warns before the gust, pushes inside the zone and never knocks a standing player off; only the Canadian ice is slippery; paused platforms hold at their ends; the raft bobs; the Paris lift carries a rider; patrols stay on their platform and pause; the look-ahead copy is independent; unsafe mechanic data is rejected.
- **Environments (per country):**
  - named landmarks, at least five depth layers, finite geometry within budget, animation, reduced motion, overview view, less geometry in low quality, clean disposal
  - every dressed platform's walking lane is clear: rays from head height first hit the cap (hairline plank joints excepted)
  - the enemy animates in every state, and the discovery block sits on its collider's bottom

On October 29, 2026 the full suite (`npm test -- --maxWorkers=2 --minWorkers=1`) passed 920 of 921 tests in 90 files, and `SOCIALU_BUILD_TARGET=review npm run build` compiled successfully. The one failure was a Japan camera-bounds assertion in `world-explorer-simulation.test.ts`, which was being reworked at the same time as the Japan camera framing; it does not involve the country levels.

## Performance (point measurements, not sign-off)

Headless Microsoft Edge on this development machine, 1600 × 900, standard quality, at the opening camera:

| Country | FPS | Draw calls | Triangles |
| --- | --- | --- | --- |
| Italy | 120 (frame cap) | 155 | 318k |
| Egypt | 120 | 130 | 153k |
| Brazil | 120 | 162 | 286k |
| Canada | 120 | 136 | 176k |
| Australia | 120 | 124 | 230k |
| India | 120 | 116 | 222k |
| South Africa | 120 | 171 | 203k |
| Norway | 120 | 130 | 151k |
| France | 120 | 115 | 299k |
| United States | 120 | 106 | 79k |

Mid-course readings were 54–87 FPS, but they include the moment the review camera jumps there. These are not sustained benchmarks and not mobile measurements.

Performance techniques:
- Vegetation, grass, rocks, foam, particles, birds and fish are instanced.
- Static scenery is merged per material.
- Particle counts are bounded.
- Low quality removes geometry (verified in tests), disables shadows and the reflection map, and caps pixel ratio at 1.

## Mobile

Emulated landscape phone (844 × 390, 2× pixel density, touch enabled) for all ten levels:
- no horizontal overflow
- the 65-pixel move buttons and the 72-pixel jump button sit inside the screen
- the HUD header is 107 px tall
- a touch-held "right" moved the explorer in every level

Emulation is not a real-device test.

## Asset licensing

- All meshes, characters, creatures, landmarks, vegetation, animals, procedural textures and sounds are original project work.
- Each country uses one CC0 Poly Haven surface set (diffuse plus normal map, reduced to 512 px). Asset names, authors and checksums are in [`public/world-explorer/materials/LICENSES.md`](../../public/world-explorer/materials/LICENSES.md).
- Optional discovery-card photographs still come from Wikimedia Commons with per-image attribution, as before.
- No third-party models or copyrighted game characters are used.

## Adding the next country

1. Write the level specification described in the brief's Part 4: a single location, a primary landmark, biome, palette, routes, mechanic, original enemy, collectibles, checkpoint and finish, a sourced fact, and an asset manifest.
2. Author `public/world-explorer/levels/<iso2>-level-01.json` and add it to `authored-levels.ts`. Reuse existing mechanics (wind zone, ice, paused, bobbing or vertical platforms) before adding new simulation code.
3. Create `components/world-explorer/countries/<name>.ts` that implements `CountryEnvironment` using the kit, and register its `environmentId` in `countries/registry.ts`. Add a regional surface set only if no existing one fits.
4. Add the country to the `codes` lists in both test files and to `levelBlurbs` in `world-explorer.tsx`. Write the discovery in `world-explorer-discoveries.ts` with a source link.
5. Capture review images with `?review=1`; the overview and scan views come from `window.worldExplorerReview.setReviewView('scan', x)`.
6. Get human visual and device review before changing anything to release.

## Known limitations

- **Visual fidelity:** every landmark is a simplified procedural study, not a measured model or a hand-modelled asset pack. Each level is close in spirit to the concept art but less detailed, and none has had human visual approval.
- **Length:** the test player finishes each level in 24–36 s of game time. A human exploring both routes will take longer, but probably less than the brief's 2–4 minutes. Lengthening levels is a tuning decision for playtesting.
- **Shared structure:** the ten layouts share one structural template (start, steps, lower bridge under a rising upper route, mechanic, enemy island, checkpoint, finish step). Country identity comes from the mechanic, materials, landmark and scenery rather than from radically different layouts.
- **Animals:** wildlife models are low-poly and walk on simple lines, and herds can intersect distant scenery.
- **Testing gaps:** real phones, sustained FPS and memory profiling have not been tested.
- **Unverified sources:** the Colosseum and Kruger source pages could not be fetched from this environment; both texts are conservative and need a recheck against those pages.
- **Hosted saving:** account saving still depends on the existing World Explorer progress migration being applied to hosted Supabase.
