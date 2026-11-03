# Asia Phase A — art integration review

**Review decision: changes required; no country released.** This branch implements an East Asia art increment and registers all 47 designs from the supplied specification. It does not complete the 47-country game.

[Open the visual gallery](index.html) · [47-country tracker](asia-tracker.csv) · [Machine-readable tracker](asia-tracker.json) · [Validation](validation.json) · [Browser evidence](browser-evidence.json)

## Scope and preservation

Base commit: `6a0e0ba`. Branch: `feature/asia-phase-a-art`, developed in an isolated worktree with fresh locked dependencies. Separate avatar and South America working changes were excluded. The shared gameplay engine, level JSON, routes, physics values, controls, progress/save code, Japan benchmark and similarity threshold were preserved. Only the four non-Japan East Asia environments and their new terrain helper changed at runtime.

The [supplied specification](../../../ASIA-SPECIFICATION.md) drives the new [structured targets](../../../../../public/world-explorer/data/asia-specification.json). Regional counts are East 5, Southeast 11, South 9, Central 5 and West 17: 47 total. Antarctica remains outside this Asia registry. Changed future settings include Kuang Si, Kinabalu, Hunza, Yangykala, Mesopotamian marshes and Socotra. These 42 future designs are proposals, not completed levels; individual source verification remains pending. Older profile sources are retained separately and are not presented as verification of a new location.

## Runtime art changes

Closed, rounded and fractured country terrain bodies now preserve the authored collision surface. Mongolia uses low banks, China layered sandstone, Paektu volcanic rock, and Seoul architectural roofs rather than recolored rocks. Terrain tests sample the central walking lane and bound the visible surface difference to 0.04 world units. Foliage remains bounded/instanced and each selected environment uses the existing lazy-loaded country contract and material cache. Original code geometry is used; this increment adds no GLB model package, paid assets or runtime dependencies.

The source uses foreground, gameplay, near background, far background and atmosphere groups. That architecture does not establish cinematic quality: the actual captures show further art work is required. No screenshot was substituted with a concept image.

## Test and browser evidence

- Full isolated-branch suite: **958 tests / 96 files passed**. Includes the committed Japan, Brazil, Egypt and Norway regressions; excludes separate uncommitted development.
- Production build including TypeScript: **passed** with fresh `npm ci` and no copied credentials.
- New terrain tests: **9 passed**, including visible-surface alignment, low Mongolian banks, Paektu lake/rim and Seoul roof treatment.
- Final tracker/specification recheck: **6 passed**.
- Five normal gameplay routes and five review routes: HTTP 200, ready WebGL canvases, **zero uncaught page exceptions**.
- **20 desktop captures**: start, mechanic, landmark and overview for each East Asia country. **5 mobile-layout captures** are additional. This is 20 of the requested 188 desktop views, not 188 completed views. PNG evidence occupies 15.8 MiB.
- All five emulated 390×844 layouts fit without horizontal overflow. The three controls remain visible, in the viewport and at least 64 px tall. Holding the right control advanced actual simulation progress. This used an emulated pointer, not a physical touch device.
- Known non-scene console error: missing `/favicon.ico` returns 404. No failed scene request or shader exception was recorded.

Capture tool: headless installed Edge with ANGLE SwiftShader, fresh guest contexts. Start images use the normal gameplay URL. The other three desktop views use the existing paused review camera; they demonstrate geometry rather than a completed human action. Mongolia and Paektu mechanic views advance the real engine clock before pausing. The capture tool never marks approval or modifies saved progress.

### Performance observations — software renderer only

| Country | Canvas load ms | Exposed JS heap bytes | Sample FPS | p95 frame ms |
|---|---:|---:|---:|---:|
| CHN | 13683 | 23216732 | 2.3 | 483.3 |
| JPN | 18166 | 40944851 | 1.5 | 683.2 |
| MNG | 9070 | 27517781 | 5.6 | 208.4 |
| PRK | 9725 | 18904593 | 5.0 | 241.6 |
| KOR | 7227 | 26714116 | 4.4 | 266.7 |

These low software-renderer results do **not** meet or validate the 60 FPS desktop / 30 FPS mobile acceptance targets. Representative hardware benchmarks, sustained frame timing, physical-device testing and hardware memory budgets are **not run**. The raw draw/triangle diagnostics and samples remain in browser-evidence.json; JS heap is not GPU memory.

## Difficulty and mechanics — current route versus new target

| Country | Current measured tier | Requested tier | Revised design calibration |
|---|---:|---:|---|
| China | 4 | 5 | Pending |
| Japan | 2 | 1 | Pending |
| Mongolia | 1 | 2 | Pending |
| North Korea | 3 | 4 | Pending |
| South Korea | 2 | 3 | Pending |

The prior input-driven route evidence remains valid for unchanged route data and was exercised by the full suite. Target labels were not substituted for measured difficulty. Required gameplay work remains: China wind/exposure, Japan easier lower route, Mongolia moving wooden river platform, Paektu warned loose-rock/ridge wind replacing steam, and Seoul optional rooftop-garden/timed urban crossing. Each row carries these gaps in the tracker. Automated duration remains distinct from first-time human completion time.

## Distinctness

The unchanged structural analyzer flags scores at or above 0.72. [Committed baseline comparison](structural-similarity.json) covers East Asia against one another plus Brazil, Egypt and Norway. [Additional development snapshot](cross-region-development-snapshot.json) compares all five East Asia routes against all 12 current South America routes plus Egypt and Norway: 19 countries, 80 relevant pairs, zero flagged, maximum 0.4331. The latter records exact level hashes and includes separate uncommitted South America development; it does not approve that work or merge it into this branch. Scores measure route structure, not visual distinctness or cultural correctness.

## Actual image review

### China

Fractured sandstone volumes, a supported natural bridge, distinct pillar depth bands and cliff vegetation replace the earlier plain bodies. Foreground caps remain too regular; vegetation and haze are simpler than the cinematic target.

[Start](chn-start.png) · [Mechanic](chn-mechanic.png) · [Landmark](chn-landmark.png) · [Overview](chn-overview.png) · [Emulated mobile](chn-mobile.png)

### Japan

Preserved the existing Fuji, blossom canopy, organic islands, water and bridge benchmark. This pass does not rebuild Japan. The current route is tier 2, while the revised beginner target is tier 1. Lighting and distant mountain detail still need art review.

[Start](jpn-start.png) · [Mechanic](jpn-mechanic.png) · [Landmark](jpn-landmark.png) · [Overview](jpn-overview.png) · [Emulated mobile](jpn-mobile.png)

### Mongolia

Low, flared riverbanks replace tall cliff columns. The open pasture horizon, gers, Orkhon river and real-signal windsock distinguish the scene. Banks, grass density and river transitions remain visibly stylized and sparse.

[Start](mng-start.png) · [Mechanic](mng-mechanic.png) · [Landmark](mng-landmark.png) · [Overview](mng-overview.png) · [Emulated mobile](mng-mobile.png)

### North Korea

The raised, irregular caldera rim and exposed oval lake identify the volcanic setting. Dark rock terraces and sparse highland foliage replace the earlier generic landmass. Water, shoreline, rock silhouettes and atmospheric depth still need refinement. Existing warned steam remains; the revised wind/loose-rock mechanic is pending.

[Start](prk-start.png) · [Mechanic](prk-mechanic.png) · [Landmark](prk-landmark.png) · [Overview](prk-overview.png) · [Emulated mobile](prk-mobile.png)

### South Korea

Recessed glass facades, roof services, terrace planters, lifts, Han River composition and Namsan tower distinguish this urban route. Facades, skyline layering and evening lighting remain basic. This is a fictional compressed rooftop course, not a reconstruction of a real route.

[Start](kor-start.png) · [Mechanic](kor-mechanic.png) · [Landmark](kor-landmark.png) · [Overview](kor-overview.png) · [Emulated mobile](kor-mobile.png)

## Source and asset provenance

- [China: Wulingyuan sandstone landscape](https://whc.unesco.org/en/list/640/)
- [Mongolia: Orkhon Valley landscape](https://whc.unesco.org/en/list/1081/)
- [North Korea: Mount Paektu geopark and caldera](https://www.unesco.org/en/iggp/mt-paektu-unesco-global-geopark)
- [South Korea: Namsan and N Seoul Tower](https://seoulcitywall.seoul.go.kr/en/wallcourse/4.do)
- [Japan: Fuji reference retained from the existing profile](https://whc.unesco.org/en/list/1418/)

These references support setting characteristics, not exact placement of fictional obstacles. The country art compresses geography for gameplay. [Asset manifest](asset-manifest.json) distinguishes original code geometry, existing CC0 surface maps, existing flag assets and the preserved Japan benchmark. Original surface credits/licenses remain in public/world-explorer/materials/LICENSES.md. No new soundscape or audio approval is claimed.

## Review gates and next work

The brief requires: “Conduct human visual review and gameplay testing before release” and “Do not count automated test completion as human approval.” All 47 release flags therefore remain false. Phase A is still active; Phases B–E remain proposals. Human gameplay review, real account-save persistence, physical mobile checks, country soundscapes, revised mechanic/tier validation, visual approval and hardware performance acceptance remain open.

For review, start the branch with `npm run build` followed by `npm start -- -p 3006`, then open `/world-explorer?country=CHN&play=1` (also JPN, MNG, PRK, KOR). Add `&review=1` only for paused inspection/overview. The gallery preserves the actual captured state. The next art pass should address regular terrain caps, sparse foliage, stronger material/lighting separation and deeper atmospheric composition before the four representative Southeast Asia scenes are accepted for the next production batch.

Reproduction: `node scripts/world-explorer/capture-asia-phase-a.cjs` then `node scripts/world-explorer/report-asia-phase-a.cjs`. Playwright belongs in ignored `tmp/tools/asia-browser` or may be supplied through `EXPLORER_PLAYWRIGHT_MODULE`; it is not an app dependency. Use `EXPLORER_REVIEW_URL` for another preview origin. The separate cross-region snapshot is read-only historical evidence and is not overwritten by the baseline report command.
