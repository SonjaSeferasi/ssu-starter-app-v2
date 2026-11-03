# West Asia — seventeen TESTING prototypes

This batch implements the seventeen West Asia designs in the existing 47-country Asia specification. The previous thirty testing candidates, East Asia revision 2 / commit `1c7ed65`, and the shared simulation, collision rules and difficulty calibration remain preserved. All **47 Asian countries are TESTING prototypes**. None is released, visually accepted or human-playtest approved.

Open the [actual app capture gallery](index.html), [47-country tracker](asia-tracker.csv), [validation record](validation.json) or [responsive layout gallery](responsive-layouts/index.html). The isolated production preview is at `http://127.0.0.1:3012/world-explorer` while the local server is running.

| Country | Playable setting and route | Signature mechanic | Measured layout tier |
| --- | --- | --- | --- |
| Armenia | Garni basalt gorge: descending trail, column ledges, upper organ-pipe path and overlook | Precision column-shaped ledges | 4 |
| Azerbaijan | Gobustan mud-volcano field: mineral shelves, a waiting terrace and higher ridge | Warned periodic mud bursts | 3 |
| Bahrain | Bahrain Fort coastal setting: wide promenade, pier, moving dock and safe viewpoint | Gentle moving dock | 1 |
| Cyprus | Troodos: village square, hillside stairs, lift, pine trail and balcony | Terraced paths and service lift | 2 |
| Georgia | Svaneti: tower village, steep terraces, wooden lift and high lookout | Vertical mountain lift and successive climbs | 5 |
| Iraq | Ahwar marshes: reed walkway, gentle-current landing, boat, islet and observation area | Moving reed-boat platform and current | 2 |
| Israel | Masada-region desert: foothill ramp, sheltered trail, wind ledge and plateau | Warned wind on exposed ledges | 3 |
| Jordan | Petra/Siq-inspired canyon: narrow passages, sandstone steps, mechanism and facade view | Timed stone gate | 4 |
| Kuwait | Kuwait City waterfront: open promenade, pier, lift, garden and observation deck | Beginner waterfront lift | 1 |
| Lebanon | Qadisha: forested bank, stream crossing, cliff ledges, rope-supported bridge and overlook | Rope-supported valley crossing | 4 |
| Oman | Wadi Shab: limestone climb, pool-bank switch, raised crossing and upper gorge | Climbable face and switch-raised pool platform | 5 |
| Qatar | Doha Corniche: elevated walkway, West Bay lift, rooftop terrace and bay view | Elevated service walkway and lift | 2 |
| Saudi Arabia | AlUla/Hegra-region valley: sandstone climb, marked mechanism court, gate and high rim | Light-marked training switch and gate | 5 |
| Syria | Historical-inspired Palmyra oasis: court, raised stone, colonnade passage and overlook | Stone-raising mechanism and warned wind | 3 |
| Türkiye | Cappadocia: tuff ledges, cave passage, service lift, upper gate and chimney trail | Cave lift and passage puzzle | 4 |
| United Arab Emirates | Dubai: low waterfront decks, maintenance lift, two moving garden bridges and viewpoint | Elevator plus two moving urban bridges | 3 |
| Yemen | Socotra: dragon-tree highlands, irregular ridge, upper plateau and coastal descent | Slopes and changing warned wind | 5 |

These are original stylized procedural 3D scenes, not exact reconstructions or photographic-quality environments. Historic monuments and protected vegetation remain separate scenery. Fictional paths, gates, lifts and hazards do not describe real travel routes or real-world hazard timing.

## Gameplay and verification evidence

- **544 complete input-driven simulation runs:** 17 countries × two routes × four runtime settings × four start delays (`0`, `0.7`, `1.9`, `3.1` seconds). Every run finishes with three hearts and discovery unlocked. Each bonus route collects three stars; each main/bonus pair reaches all placed collectibles at every runtime/timing combination.
- **544 individual edge checks** use four additional timings (`0`, `0.9`, `2.1`, `3.6` seconds). Raised-platform fixtures start at the real controlling pressure switch rather than injecting its state.
- **1,088 checkpoint pause/recovery checks:** pause freezes the clock and platform motion; a controlled missed landing respawns at the saved checkpoint with collected rewards retained and left/right controls working. Fault injection belongs only to these recovery fixtures, never to the route replay tapes.
- **34 rendered route completions** at each country's normal runtime difficulty, using recorded left/right/jump inputs. The actual HUD, rewards, hearts and discovery callbacks must match the simulation tape. See [rendered playthrough results](desktop-playthroughs.json).
- **17 keyboard and 17 emulated-touch checks** use actual browser input events. They verify right, left, released controls, jump, landing and pause/resume. Emulated touch uses browser `touchStart`/`touchEnd` on the visible controls; it is not a physical-phone test. See [controls and content evidence](controls-and-content.json).
- **136 responsive layouts:** every country at `320×568`, `360×640`, `390×844`, `568×320`, `667×375`, `844×390`, `1280×800` and `1600×900`. Checks cover whole country headings, fitting subtitles, separate counters and horizontal overflow.
- **221 actual app captures:** thirteen per country, covering start, mechanism, landmark, overview, phone view, both route gameplay/completion states, keyboard/touch checks, destination card and in-game guide. Camera scans are presentation views; rendered input replays establish traversal.
- Full-suite results, focused-suite results and the production build output are preserved in [test-results.txt](test-results.txt) and [production-build.txt](production-build.txt). The [validation record](validation.json) asserts that all captures, replays, responsive checks and content checks use the same final production build.

Runtime challenge settings (`1–4`) differ from measured layout tiers (`1–5`). The authored geometry targets are checked against the supplied specification, while the simulation runs cover every runtime setting. Structural similarity is screened at `0.72`; no new flagged pair is automatically accepted.

The full-suite rerun includes a correction to three legacy architecture fixtures: tests for Geghard-style monasteries, Georgian monastery roofs and Yemeni earthen tower-houses now use their fixed historical profiles independently of today's Garni, Svaneti and Socotra playable settings. Their geometry assertions remain intact. No shared renderer or simulation behavior was changed to satisfy those tests.

## Title, card, guide and photograph consistency

Each country has one source-reviewed destination identity in `lib/world-explorer/west-asia.ts`. Its playable title, profile/card details, field-guide landscape, discovery and photograph metadata are checked together in unit tests and the rendered app. Administrative country facts such as capital and language stay separate from the chosen adventure setting.

The seventeen bundled Wikimedia Commons photographs were inspected by the developer for their subjects. Attribution, author, individual license, original image URL and Commons file-page links are retained in [photograph-attribution.json](photograph-attribution.json) and shown in the app. Local copies make guide photos independent of live search availability. The reference photos illustrate real places; they are not used as 3D scene backgrounds or represented as game captures. Historical city photographs are labeled with their original file titles and dates, not claimed as current imagery.

## Preservation and open art work

Protected East Asia/Japan source files are compared against `1c7ed65`. Existing Southeast, South and Central Asia scenery, route, metadata and shared-engine files are checked against the pre-batch [source hashes](preserved-source-baseline.json). The CSS comparison permits only West Asia selectors/name rules, and the guide comparison permits only the added West Asia branch; previous destination behavior is retained.

**Approved separate renderer difference:** a shader-startup change appeared in `components/world-explorer/country-scene.ts` during this work. The user chose to keep it separate and document the difference. It prepares initial shaders, prepares material-swap programs on stand-in meshes, and retains a hidden collectible-effect shader sample. Its related changes in `kit/surface-maps.ts` and `japan-materials.ts` prepare materials before applying texture swaps. Japan's texture paths, normal scale, roughness settings and authored geometry remain unchanged. This startup work is present in the reviewed build, but is not part of the West Asia level implementation or a claim of improved/verified 60 FPS. Exact patches and source snapshots for all three files are listed in the [hash/decision record](external-renderer/review.json). These preparation paths are explicitly exceptions to a byte-for-byte revision-2 comparison; the level art data, routes, collision rules and simulation remain preserved. The fixed review copy is under ignored `tmp/tools/west-asia-candidate`, with [source, test and reference-photo hashes](candidate-source-hashes.json). Its build and browser evidence use port 3012. Continuing working-tree startup edits remain outside this batch. Packaging checks the fixed snapshot hashes, not the actively edited working tree.

The **six Southeast Asia art tasks remain PLANNED** in [southeast-art-pass.csv](southeast-art-pass.csv): repeated platform bodies, Laos's pools, Philippine terraces, Cambodia's temple forms, Myanmar's temple forms and Vietnam's cave opening. The **nine South Asia visual refinements remain PLANNED separately** in [south-art-pass.csv](south-art-pass.csv). Neither queue changes validated collisions or marks art acceptance complete.

West Asia still needs human art review. The capture review identified simple repeated rock bodies, simplified village/facade detail and skyline materials, and compressed scenic scale. The final pass improves the visibility of mud cones, reed structures, Petra's facade, Masada's supporting plateau and Socotra's dragon trees, but does not establish a match to cinematic reference art.

Two specification mechanisms use the existing shared engine's supported vocabulary in these prototypes: Oman's water-transition challenge is a switch-raised crossing over a visible pool; Saudi Arabia's light-sensitive concept is represented by a light-marked pressure switch and timed gate. A changing fluid simulation or directional-light/beam puzzle is not implemented or claimed.

## Pending acceptance gates

Human playtests remain **PENDING / NOT_RUN**. The existing ten East Asia sessions remain queued with **Japan's beginner route first**; see [the unchanged queue](east-asia-human-playtests.csv) and [human test instructions](../phase-a-revision-2/mongolia-seam/HUMAN-PLAYTESTS.md). The [34 West Asia human route sessions](west-asia-human-playtests.csv) are also PENDING, with reviewer, date, timing and findings left blank. Input playback, developer visual inspection and automated control checks are not human playtests.

Account-save verification and physical-phone testing remain **PENDING**. **60 FPS remains UNVERIFIED** until measured in a confirmed 60+ Hz browser environment. Headless frame statistics are diagnostic, especially with concurrent review contexts, and do not complete that gate. All release flags remain **false**.

## Reproduce

Run `node scripts/world-explorer/report-west-asia.cjs`, the full test suite and the final focused tests. Build with `SOCIALU_BUILD_TARGET=asia-phase-a` (PowerShell environment-variable syntax on Windows), then run that isolated production build on port 3012. The capture, replay and responsive scripts accept review URL/output/build-ID environment variables; use the West Asia input tapes and country list. The control/content review script is `scripts/world-explorer/review-west-asia-controls.cjs`.

Set `EXPLORER_CANDIDATE_ROOT=tmp/tools/west-asia-candidate` and `EXPLORER_REVIEW_URL=http://127.0.0.1:3012` to package this fixed review copy. After evidence collection, run `node scripts/world-explorer/package-west-asia.cjs`, `node scripts/world-explorer/validate-west-asia-gallery.cjs`, then the packager again to incorporate gallery validation. Review-only Playwright is installed under ignored `tmp/tools/asia-browser`; it is not a new app dependency.
