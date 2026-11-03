# South America — Phase 1 continental release

This is the progress dashboard and final report for Phase 1 of Jumpyland: World Explorer. Phase 1 covers twelve individually designed South American levels on the shared engine.

The figures come from the live code:

- The tracker is `lib/world-explorer/south-america.ts`.
- The measured data is in `review/south-america/validation-report.json`, regenerated with `npx vitest run --config scripts/world-explorer/report.vitest.config.mjs`.
- The captures and in-game performance readings are in `review/south-america/`, made with `scripts/world-explorer/capture-levels.mjs`.

## Status at a glance

| | |
| --- | --- |
| Playable from start to finish | **12 of 12** |
| Pass all 16 LevelValidator checks | **12 of 12** |
| Measured tier equals declared tier | **12 of 12** |
| Every coin and all three stars reachable | **12 of 12** |
| Repetition analyzer flags (vs each other, Japan, Egypt, Norway) | **0** (highest pair 0.51; review threshold 0.72) |
| Human visual and gameplay review | **0 of 12 — pending** |
| RELEASED | **0 of 12** |

Every level is in **TESTING**. All engineering stages are complete: design brief, blockout, gameplay, art and automated testing. A level moves to **RELEASED** only after a person has done three things:

1. approved the design
2. played it on desktop and a phone
3. signed off the visuals

Nothing here has had that review, so nothing is marked released. The design-approval step was also not performed by a person. The briefs below are proposals awaiting sign-off.

Tier locking has been removed. Any built level can be chosen in any order (`cardStatus` in `lib/world-explorer/design-manifest.ts`). A tier describes the route's demands, not the country.

## Dashboard

Statuses: PROPOSED → DESIGN APPROVED → BLOCKOUT → GAMEPLAY IMPLEMENTED → ART INTEGRATION → TESTING → RELEASED.

| Batch | Country | Level | Tier | Signature | Status | Visual quality | Human review |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A | 🇧🇷 Brazil | Amazon Canopy Run | 3 · Challenger | vine swings | TESTING | Stage A refined · awaiting acceptance | pending |
| A | 🇧🇴 Bolivia | Salar de Uyuni: The Salt Mirror | 2 · Adventurer | switch-raised salt blocks | TESTING | Stage A refined · awaiting acceptance | pending |
| A | 🇺🇾 Uruguay | Colonia del Sacramento: Lighthouse Quarter | 1 · Explorer | city-gate plate | TESTING | Batch C polished · awaiting review | pending |
| A | 🇵🇪 Peru | Inca Trail: Terraces to the Sun Gate | 4 · Expert Explorer | terrace step-ups, frayed bridge | TESTING | Batch C polished · awaiting review | pending |
| B | 🇦🇷 Argentina | Los Glaciares: Perito Moreno Valley | 3 · Challenger | calving ice and floes | TESTING | Batch B polished · awaiting review | pending |
| B | 🇨🇱 Chile | El Tatio: Geysers at Dawn | 4 · Expert Explorer | timed geyser jets | TESTING | Batch B polished · awaiting review | pending |
| B | 🇨🇴 Colombia | Cocora Valley: Cloud Forest Climb | 4 · Expert Explorer | climbable walls | TESTING | Batch B polished · awaiting review | pending |
| B | 🇪🇨 Ecuador | Galápagos: Lava Coast | 3 · Challenger | wave surges | TESTING | Batch B polished · awaiting review | pending |
| C | 🇬🇾 Guyana | Kaieteur Falls: Potaro Gorge | 2 · Adventurer | river-current shelves | TESTING | Batch B polished · awaiting review | pending |
| C | 🇵🇾 Paraguay | Trinidad: The Jesuit Mission Trail | 1 · Explorer | collapsing earth banks | TESTING | Batch C polished · awaiting review | pending |
| C | 🇸🇷 Suriname | Paramaribo: Historic Waterfront | 2 · Adventurer | riverboat crossings | TESTING | Batch C polished · awaiting review | pending |
| C | 🇻🇪 Venezuela | Angel Falls: The Auyán-tepui Descent | 5 · Master Explorer | descent with climb-backs | TESTING | Stage A refined · awaiting acceptance | pending |

## Art polish (in progress)

A visual production pass is under way. It keeps every route, mechanic and test result; only scenery, terrain bodies, water, vegetation, lighting and the country cards change. The pass works in stages:

- **Stage A, refined and awaiting acceptance:** Bolivia (an open landscape), Brazil (a dense rainforest) and Venezuela (a vertical tepui landscape). These prove the new standard. After the first review, a focused refinement pass gave Brazil rounded mossy platform edges and varied trees and lilies, Venezuela finer tepui rock, broken cliff silhouettes and layered clouds, and Bolivia stained, readable landing edges against the salt.
- **Batch B, done and awaiting review:** Argentina, Chile, Colombia, Ecuador and Guyana. Guyana's and Ecuador's logged timing failures were fixed in this batch. Review package: [review/south-america/batch-b/README.md](review/south-america/batch-b/README.md).
- **Batch C, done and awaiting review:** Paraguay, Peru, Suriname and Uruguay. Suriname's logged timing hit was reproduced and traced to the test bot, not the level. Review package: [review/south-america/batch-c/README.md](review/south-america/batch-c/README.md).
- **Follow-up to the Batch B review:** country guides now describe each level's own place, Chile's detached slivers and Colombia's ribbon ridges are fixed, and Ecuador's cold-start hitch was profiled. Fresh production evidence: [review/south-america/followup-production/README.md](review/south-america/followup-production/README.md) and [review/south-america/guide-fix/README.md](review/south-america/guide-fix/README.md).

All twelve countries are polished and stay at TESTING until people have reviewed them. What a person still has to do, country by country, is in the [acceptance checklist](review/south-america/ACCEPTANCE-CHECKLIST.md). The review package, with before-and-after sheets for every shot, the visual checklist and the performance results, is in [review/south-america/art-polish/README.md](review/south-america/art-polish/README.md).

Shared improvements now available to every country:

- sculpted platform bodies (`island`, `shelf` and `mass`) with limited visual depth, so no wall runs straight down out of view; the colliders are unchanged
- waterfalls with a source river, a falling ribbon, spray, mist and an impact pool
- an instanced South American flora library with breeze animation
- a capture tool for four review shots per country, with frame-time, load and memory measurement

**Country cards.** Each card now shows the playable level's own location, featured landmark and an in-game preview image, instead of the first landmark of the general country profile. Venezuela's card now names Angel Falls and Canaima, not Coro, and its level is titled "Angel Falls: The Auyán-tepui Descent". A test checks every built level's card against its discovery and landmark list. The in-level Country guide follows the same rule: its Place, Landscape and photograph come from the level (El Tatio, Cocora Valley, the Galápagos), not the general profile (Rapa Nui, Cartagena, Quito), while the capital stays as catalogued. `__tests__/world-explorer-guide-destination.test.ts` covers it.

## Stage A acceptance testing

After the refinement pass, Bolivia, Brazil and Venezuela were played through completely in the production build. Results, screenshots and the method are in [review/south-america/playthroughs/README.md](review/south-america/playthroughs/README.md). All three remain at **TESTING**: a person still needs to review them and play them on a real phone.

The game plays each built level at the difficulty its data names: difficulty 1 for Bolivia, Uruguay, Guyana, Paraguay and Suriname; 2 for Brazil, Argentina and Ecuador; 3 for Peru, Chile, Colombia and Venezuela. For route-graph levels this only speeds up patrols. The collectible acceptance test now plays every country at that runtime difficulty, on both routes, at start delays of 0, 1.8 and 3.6 s; all twelve pass. The zero-damage critical-route test also includes each runtime difficulty. Method, data and findings: [review/south-america/acceptance/README.md](review/south-america/acceptance/README.md).

**Stage A, still open:**

- human desktop playthroughs and real-phone play of all three
- a person's judgement of Bolivia's landing edges
- a person's judgement of Brazil's far-bank patrol

Venezuela's missing coin (reachable at difficulty 3) and the black shards in its falling view (fixed) are closed.

**Found for Batches B and C:**

- Fixed in Batch B: Guyana's bonus route could fail on the slick spray ledge in a gust (the ledge now has grip), and Ecuador's route took a hit at one timing (the second surge's left edge moved). A 24-timing sweep of all five Batch B levels shows no damage or failures.
- Batch C: Suriname's hit reproduces in 2 of 72 runs of a 24-timing sweep, both on `sr-market` behind the mango beetle. The trace shows the bot hopping short behind the beetle after the drop; the mechanics are unchanged and a person's judgement is wanted. Paraguay, Peru and Uruguay show no damage in 72 runs each.
- Ecuador's cold-start hitch is traced and fixed in shared scene code, which waits for the shared-scene team's agreement. The cause was a shadow type three.js r186 swaps on the first shadow pass, plus shaders compiled on first sight. No level in the five regions checked now links a shader after it is ready, and every capture is pixel-identical ([review/south-america/shader-prep/README.md](review/south-america/shader-prep/README.md)).
- Argentina's Fitz Roy snow discs are replaced by snow caps that follow the rock ([review/south-america/argentina-snow/README.md](review/south-america/argentina-snow/README.md)).
- Still open, for people: Colombia on a real phone (285k triangles), and Brazil's and Suriname's patrol fairness. Suriname's two damaging sweep timings stay documented until then.
- By design: Argentina's `ar-coin-20` is reached by a step back at difficulty 2.

## Validation results

From the LevelValidator, the DifficultyAnalyzer and the input-driven bot:

- **Gap and step** are the hardest mandatory jump, as a percentage of the measured envelope (Dmax 5.40, Hmax 1.95).
- **Bot time** is a fast, tidy run. A person exploring takes longer.
- **Strategies:**
  - *Forward:* a straight run.
  - *Assist:* Explorer assist timing.
  - *Backtrack:* walk back at each checkpoint.
  - *Pause:* idle 2.3 s at each checkpoint.

  Start delays of 0, 0.7, 1.9 and 3.1 s are part of the validator itself.

| Country | Tier (score) | Gap / step | Checks | Bot / target | Coins | Stars | Forward · Assist · Backtrack · Pause |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Brazil | 3 (3.36) | 63% / 41% | 16/16 | 28.1 s / 60 s | 29/29 | 3/3 | ✓ · ✓ · ✓ · ✓ |
| Bolivia | 2 (2.24) | 48% / 38% | 16/16 | 28.0 s / 70 s | 33/33 | 3/3 | ✓ · ✓ · ✓ · ✓ |
| Uruguay | 1 (1.24) | 37% / 26% | 16/16 | 25.5 s / 55 s | 35/35 | 3/3 | ✓ · ✓ · ✓ · ✓ |
| Peru | 4 (4.45) | 69% / 56% | 16/16 | 36.2 s / 85 s | 28/28 | 3/3 | ✓ · ✓ · ✓ · ✓ |
| Argentina | 3 (3.45) | 56% / 46% | 16/16 | 35.1 s / 70 s | 27/27 | 3/3 | ✓ · ✓ · ✓ · ✓ |
| Chile | 4 (4.36) | 70% / 56% | 16/16 | 22.1 s / 55 s | 24/24 | 3/3 | ✓ · ✓ · ✓ · ✓ |
| Colombia | 4 (4.45) | 70% / 21%¹ | 16/16 | 21.3 s / 55 s | 21/21 | 3/3 | ✓ · ✓ · ✓ · ✓ |
| Ecuador | 3 (3.36) | 59% / 41% | 16/16 | 22.1 s / 50 s | 19/19 | 3/3 | ✓ · ✓ · ✓ · ✓ |
| Guyana | 2 (2.45) | 48% / 36% | 16/16 | 21.3 s / 48 s | 25/25 | 3/3 | ✓ · ✓ · ✓ · ✓ |
| Paraguay | 1 (1.24) | 41% / 26% | 16/16 | 20.8 s / 55 s | 27/27 | 3/3 | ✓ · ✓ · ✓ · ✓ |
| Suriname | 2 (2.36) | 48% / 31% | 16/16 | 28.7 s / 65 s | 25/25 | 3/3 | ✓ · ✓ · ✓ · ✓ |
| Venezuela | 5 (5.45) | 81% / 0%² | 16/16 | 32.3 s / 65 s | 24/24 | 3/3 | ✓ · ✓ · ✓ · ✓ |

¹ Colombia's big rises are climbs up climbable faces. They are excluded from jump tiers, like bounce launches.
² Venezuela is a descent: every mandatory jump goes level or down, and its difficulty is in the length of the leaps (up to 81% of Dmax).

**Repetition analyzer.** It compared the 12 levels with each other and with Japan, Egypt and Norway: 102 pairs, none flagged. The highest scores were:

- Guyana ~ Paraguay 0.51
- Chile ~ Ecuador 0.48
- Bolivia ~ Guyana 0.45

Every level has a different signature mechanic.

## Performance

These are in-game HUD readings from the running app in headless Microsoft Edge, with hardware WebGL (ANGLE D3D11), on the development laptop.

| Country | Desktop 1600×900 | Phone-landscape viewport 844×390 |
| --- | --- | --- |
| Brazil | 120 FPS · 125 draws · 278k tris | 120 FPS · 137 draws · 283k tris |
| Bolivia | 120 FPS · 86 draws · 87k tris | 120 FPS · 94 draws · 90k tris |
| Uruguay | 120 FPS · 76 draws · 135k tris | 120 FPS · 80 draws · 142k tris |
| Peru | 120 FPS · 80 draws · 111k tris | 120 FPS · 87 draws · 114k tris |
| Argentina | 120 FPS · 78 draws · 91k tris | 120 FPS · 89 draws · 93k tris |
| Chile | 120 FPS · 76 draws · 86k tris | 120 FPS · 79 draws · 87k tris |
| Colombia | 120 FPS · 84 draws · 173k tris | 120 FPS · 90 draws · 175k tris |
| Ecuador | 120 FPS · 78 draws · 98k tris | 120 FPS · 84 draws · 99k tris |
| Guyana | 120 FPS · 86 draws · 133k tris | 120 FPS · 92 draws · 133k tris |
| Paraguay | 120 FPS · 87 draws · 145k tris | 120 FPS · 92 draws · 146k tris |
| Suriname | 120 FPS · 84 draws · 119k tris | 120 FPS · 88 draws · 121k tris |
| Venezuela | 120 FPS · 77 draws · 166k tris | 120 FPS · 82 draws · 168k tris |

How to read these numbers:

- **120 FPS is the headless browser's frame cap**, so it shows headroom, not a ceiling.
- The phone column is the **phone viewport on the laptop GPU**. It is not a phone, and no real mobile device has been measured yet.
- With software rendering (SwiftShader) the same scenes ran at 3–8 FPS. That is not representative of any real GPU.

Asset loading and reuse:

- Each environment is a separate lazily loaded chunk. Nothing loads until its country is chosen.
- Vegetation, rocks, cacti and piles use instanced meshes.
- Static scenery is batched by material.
- Low graphics mode builds fewer vertices for every country (this is tested).

## What changed in the engine

All of these are shared and data-driven. None of them contains a country check.

| Mechanic | Level data | Used by |
| --- | --- | --- |
| **Climbable faces.** Hold jump against a face to climb; without jump you slide down slowly; you mantle over the top. | `platform.climbable`, `physics.climbSpeed` | Colombia, Venezuela |
| **Switch-raised platforms.** A plate raises sunk blocks for a window, and a block never sinks under a player standing on it. | `platform.raise={switchId,drop,seconds}`. Switches may now raise platforms without gates. | Bolivia |
| **Warned timed hazards.** Calm, then a visible warning, then an active spell (geyser, wave, calving ice). | `hazards[].cycle`, `style` | Chile, Ecuador, Argentina |
| **Water current.** Carries a standing player. | `platform.current` | Guyana |
| New terrain kinds | `salt-flat`, `terrace`, `climb-wall`, `dune`, `lava`, `tepui` | scenery only |

Also changed:

- **Explorer assist** now also lengthens raise windows, adds calm time between hazard eruptions and weakens currents.
- **The validator**
  - times edges across nearby hazard cycles
  - starts edges onto raised platforms from their plate
- **The difficulty analyzer** treats climbs like bounce launches.
- **The bot** (`playRoute`) is still input-only. It never teleports. It gained these behaviours:
  - a climb plan that holds jump
  - waiting at a hazard until it can stop safely
  - walking onto pressure plates rather than hopping over them
  - preferring the next platform on its route, so optional branches are followed
  - `detours` for backtracking and pausing strategies

  All of the earlier levels (Japan, the ten first-template countries, and the Egypt, Brazil and Norway proof levels) still pass their existing tests with the new bot.
- **The timed-hazard visuals** are a shared kit module: `components/world-explorer/kit/hazards.ts`.

## Where things live

| Part | Path |
| --- | --- |
| Level configurations (JavaScript modules) | `lib/world-explorer/levels/south-america/*.ts` (Brazil stays `public/world-explorer/levels/br-level-01.json`) |
| Authoring helpers | `lib/world-explorer/levels/author.ts` |
| Tracker and briefs | `lib/world-explorer/south-america.ts` |
| Scenery (one lazily loaded chunk each) | `components/world-explorer/countries/{argentina,bolivia,chile,colombia,ecuador,guyana,paraguay,peru,suriname,uruguay,venezuela}.ts` and the shared `countries/south-america/shell.ts` |
| Verified discovery facts | `lib/world-explorer-discoveries.ts` (showcase entries) |
| Tests | `__tests__/world-explorer-south-america.test.ts` (127 tests) |
| Evidence | `review/south-america/*.jpg`, `capture-results.json`, `validation-report.json` |

## Country deliverables

Every country has the following:

- an authored JavaScript level configuration
- an original procedural 3D environment (with CC0 surface maps where noted in its module)
- main and optional route definitions in its route graph
- the validation results above
- a gameplay capture (`<code>-gameplay.jpg`), two mid-course captures (`-midcourse`, `-late-course`), a full-level overview (`-overview`) and a phone-viewport capture (`-phone-landscape`)
- a sourced discovery fact

Human gameplay review is **pending** for all twelve.

### Batch A — prove variety

**🇧🇷 Brazil — Amazon Canopy Run (tier 3).**

- **Status:** kept as designed and reviewed against the new suite; it passes unchanged.
- **Route:** a bromeliad bounce launches you into the canopy, then two vine swings, a drop to the riverbank, drifting rafts over the river, root stairs and a waterfall lookout.
- **Optional:** high branches over the river, with a star.
- **Fact:** the Central Amazon Conservation Complex and its electric fish ([UNESCO 998](https://whc.unesco.org/en/list/998/)).
- **Review note:** it is the heaviest scene of the twelve (278k triangles) and should be checked first on phones.

**🇧🇴 Bolivia — Salar de Uyuni: The Salt Mirror (tier 2).**

- **Route:** an open, flat level built on puzzles rather than height.
  - A plate raises three salt-brick blocks out of a brine channel for 8 s.
  - A two-switch sequence follows: the first plate raises steps to the roof of a salt-brick hotel, where a second plate raises the bridge.
  - Then the rusted train-cemetery wagons, with a crust patrol, and a stair climb up Isla Incahuasi among giant cacti.
- **Optional:** two higher blocks in the first channel (raised by the same plate) hold a star.
- **Recovery:** missing a window is recoverable. Walk back onto the plate (this is tested).
- **Fact:** the largest salt flat on Earth, about 3,650 m up and roughly 9,500–10,000 km² ([Guinness World Records](https://www.guinnessworldrecords.com/world-records/82679-largest-salt-flat)).

**🇺🇾 Uruguay — Colonia del Sacramento: Lighthouse Quarter (tier 1).**

- **Route:** a beginner's urban-coastal walk.
  - The Rambla promenade.
  - A plate opens the Portón de Campo gate over the moat for 8 s.
  - The Plaza Mayor, past a parked vintage van and down the cobbled Calle de los Suspiros.
  - A café awning launches you onto tiled rooftops.
  - Down to the convent ruins, then a moored boat to the lighthouse quay.
- **Enemies:** none.
- **Optional:** a chimney and belfry route with two stars.
- **Fact:** founded by the Portuguese in 1680 on the Río de la Plata; World Heritage since 1995 ([UNESCO 747](https://whc.unesco.org/en/list/747/)).

**🇵🇪 Peru — Inca Trail: Terraces to the Sun Gate (tier 4).**

- **Route:** an ascent.
  - Tall terrace risers, each 56% of Hmax.
  - A washed-out rope bridge whose frayed plank sections fall 0.8 s after you land.
  - An oroya cable basket across the gorge.
  - A headwind at Inti Punku, then the stair down to the citadel under Huayna Picchu.
- **Optional:** a fall from the bridge lands on a gorge ledge with a star, and a lift returns you to the bridge.
- **Fact:** Machu Picchu is about 2,430 m up, was built in the 15th century and has been a World Heritage site since 1983 ([UNESCO 274](https://whc.unesco.org/en/list/274/)).

### Batch B — expand terrain systems

**🇦🇷 Argentina — Los Glaciares: Perito Moreno Valley (tier 3).**

- **Route:** a down-then-up valley.
  - Drop from a moraine lookout to the moraine flat.
  - Cross Lago Argentino on three drifting ice floes.
  - Pass the glacier front, where two warned serac falls calve on staggered cycles.
  - Climb snow-crusted serac steps into a katabatic headwind, then follow the moraine to a Fitz Roy view.
- **Optional:** a high ridge over the moraine flat holds a star.
- **Fact:** the glacier front is about 5 km wide and ends in Lago Argentino; the park has been World Heritage since 1981 ([UNESCO 145](https://whc.unesco.org/en/list/145/)).

**🇨🇱 Chile — El Tatio: Geysers at Dawn (tier 4).**

- **Setting:** one place, the El Tatio geyser field, about 4,300 m up in the Andes of the Antofagasta Region, at dawn, when the steam is strongest. Valle de la Luna, the dunes and Licancabur were removed.
- **Route:**
  - Run down a scree slope off the caldera rim.
  - Cross sinter crusts that crack underfoot.
  - Climb lava ledges to an ignimbrite arch.
  - Drop into the geyser field and time three warned jets.
  - Leap fragile sinter terraces to the Tatio lookout.
- **Optional:** ignimbrite pinnacles above the geysers hold a star.
- **Scenery:** a pale sinter flat, sinter mounds with background steam vents, boiling pools with orange and green mineral runoff, scalloped sinter terraces, paja brava and llareta cushions, stone path cairns, and snow-capped volcanoes around the basin. The playable geysers keep their own warning and jet; no constant steam is placed on them.
- **Fact:** El Tatio is the largest geyser field in the Southern Hemisphere, more than 4,200 m up ([El Tatio](https://en.wikipedia.org/wiki/El_Tatio)).
- **Unchanged:** every platform position, size, terrain, collapse timing, hazard and route edge. Only titles, styles, platform names and scenery changed.

**🇨🇴 Colombia — Cocora Valley: Cloud Forest Climb (tier 4).**

- **Route:** the vertical level.
  - Three climbable moss faces.
  - Crumbling moss ledges.
  - A cable basket over the valley.
  - Leaps between the crowns of Quindío wax palms.
  - A misty summit.
- **Optional:** a fall from the palms lands on the valley stream (with a star), and the ridge's mossy face climbs back.
- **Fact:** the Quindío wax palm is Colombia's national tree and the world's tallest palm; one was measured at 59.2 m ([Guinness World Records](https://www.guinnessworldrecords.com/world-records/633650-tallest-living-palm-tree)).

**🇪🇨 Ecuador — Galápagos: Lava Coast (tier 3).**

- **Route:** a shoreline timed by the sea.
  - Warned wave surges sweep two tide shelves.
  - Lava crust cracks under a standing player.
  - Then a lava tube with a shore crab patrol, and tuff steps to an overlook.
- **Optional:** spatter cones above the surf hold a star.
- **Fact:** about 1,000 km from the coast, the islands helped inspire Darwin's theory of evolution; they were among the first World Heritage sites, in 1978 ([UNESCO 1](https://whc.unesco.org/en/list/1/)).

### Batch C — finish the continent

**🇬🇾 Guyana — Kaieteur Falls: Potaro Gorge (tier 2).**

- **Route:**
  - River shelves whose current carries you toward the brink, or holds you back in an upstream eddy.
  - The falls rim, then a drop to the cliff path.
  - Spray-slick ledges and gusts thrown off the falls.
  - A lookout and steps to the view.
- **Optional:** giant tank bromeliads on a spur, home to golden rocket frogs (as scenery only), hold a star.
- **Fact:** a single drop of about 226 m on the Potaro River ([Protected Areas Commission](https://www.pac.gov.gy/kaieteur-national-park/)).

**🇵🇾 Paraguay — Trinidad: The Jesuit Mission Trail (tier 1).**

- **Setting:** one place, the red-earth countryside of Itapúa around the Jesuit mission of La Santísima Trinidad de Paraná. The Chaco dry forest and bottle trees were removed.
- **Route:** a beginner trail where the ground is the lesson.
  - Cracked earth banks over a dry arroyo crumble 1.4 s after you stand on them.
  - An orchard clearing with one slow patrol.
  - A low hill, a drop to the arroyo meadow and more banks.
  - Sandstone steps up to the ruins of Trinidad.
- **Optional:** flowering lapacho crowns hold a star.
- **Scenery:** the arcaded red sandstone church with pilasters, a frieze band and an apse; the stone bell tower; two rows of roofless houses where Guaraní families lived; lapacho trees in flower, pindó palms, orchard trees, and green pasture over red earth. The ruins are scenery and are never breakable; only the earth banks crumble.
- **Fact:** the missions were built in the 17th and 18th centuries and have been World Heritage since 1993 ([UNESCO 648](https://whc.unesco.org/en/list/648/)).
- **Unchanged:** every platform position, size, terrain, collapse timing, hazard and route edge.

**🇸🇷 Suriname — Paramaribo: Historic Waterfront (tier 2).**

- **Route:**
  - Wooden stairs and timber galleries to a warehouse roof.
  - A drop into the market, with one patrol.
  - A plate opens Fort Zeelandia's gate.
  - Two riverboats and a cargo hoist.
  - Old-town galleries to the cathedral square.
- **Optional:** shop signs above the market hold a star.
- **Fact:** a Dutch colonial town of mainly wooden buildings; World Heritage since 2002 ([UNESCO 940](https://whc.unesco.org/en/list/940/)).

**🇻🇪 Venezuela — Angel Falls: The Auyán-tepui Descent (tier 5).**

- **Route:** the continent's advanced challenge, built downward.
  - Leaps of up to 81% of Dmax across crumbling sandstone (0.75 s).
  - Two climbable faces where the route doubles back up.
  - Pillars crossed in escarpment gusts.
  - Spray-slick rock beside Angel Falls.
- **Optional:** a crag above the plunge-pool rim holds a star.
- **Fact:** Angel Falls drops about 979 m from Auyán-tepui, the world's highest uninterrupted waterfall; Canaima has been World Heritage since 1994 ([UNESCO 701](https://whc.unesco.org/en/list/701/)).

## Outstanding issues

1. **Human review has not happened.** No level has had a person's design approval, desktop playthrough, phone playthrough or visual sign-off. RELEASED stays at 0 until it does.
2. **No real-device testing yet.** All performance figures are from one laptop, and the touch check used Chromium touch emulation. Real-phone play of the Stage A levels (checklist in `review/south-america/playthroughs/README.md`) and phone performance, especially Brazil's 228k-triangle scene, are still needed before acceptance.
3. **Art polish found in the captures, for reviewers to judge:**
   - Several landforms read as smooth sheets from some angles (for example, Colombia's cloud-forest ridges).
   - Deep platform faces dominate the bottom of the frame in Peru, Argentina, Colombia and Paraguay.
4. **Fact sourcing:**
   - The UNESCO pages block automated fetching, so UNESCO facts were checked against UNESCO-derived and secondary sources.
   - The El Tatio fact cites Wikipedia.
   - Each figure was cross-checked in several sources, and disputed figures were left out, such as the glacier front's height and Kaieteur's "largest" claims.
   - A person should re-check each source before release.
5. **Bot coverage:** the bot moves rightward with optional backtracking within a platform. Re-pressing Bolivia's plates after a window lapses is tested directly in the mechanics tests, not by the bot.
6. **Resolved: one place per level.** Chile is now El Tatio only and Paraguay is now Trinidad only, as preferred. Titles, cards, locations, landmarks, briefs and scenery match; the discovery facts were already El Tatio and Trinidad.
7. **Source control.** The South America work is in one focused commit on `feature/world-explorer-japan-prototype` (not pushed). It depends on two commits made by the parallel Asia work, which already carry shared files this phase changed:
   - `6a0e0ba` ("Add country environment framework and East Asia review prototypes"): the new mechanics in `simulation.ts`, `game-types.ts`, `level-manifest.ts`, `level-validator.ts`, `difficulty.ts` and `design-manifest.ts`, plus `kit/hazards.ts`, `levels/author.ts`, the environment registry and the first Brazil environment.
   - `6b2a0ca` ("Refine East Asia Phase A routes and art for review"): the review hooks in `country-scene.ts` that the capture and playthrough scripts use (the landmark camera, frame timings, `reviewState` and the `?autoplay=1` replay).

   The South America commit contains no Asia files. Of two files that also hold other people's uncommitted work, only this work's lines were committed: the World Explorer card text in `game-room.tsx` and the South America section of `README.md`.
8. **Resolved: country-card metadata.** Cards now use each level's own location, landmark and in-game preview (see Art polish above). The general country profiles were left unchanged, because other World Explorer work shares them.
9. **Art polish for nine countries.** Stages B and C have not started. Their "before" captures are in `review/south-america/art-polish/before/`.
10. **Timing-sensitive tests.** The shared environment-registry test imports every environment within the default 5 s timeout, and the Bolivia environment tests build its salt-crust texture on first use. These timed out in full-suite runs while headless browsers left over from capture runs were loading the machine. The capture scripts now close their browsers, and the tests pass on a quiet machine.

The selection screen with all twelve playable is captured in `review/south-america/selection-south-america.png`. Venezuela, tier 5, is selected with nothing completed and its Play button enabled.
