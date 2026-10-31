# East Asia review — prototypes, not releases

Review date: 2026-10-30T17:35:23.360Z. Scope: China, Japan, Mongolia, North Korea and South Korea. **Milestone decision: hold expansion. Automated routes pass; cinematic visual acceptance, human playthroughs, real-device mobile testing and live account-save validation are not approved.**

## Changes and setting decisions

The user explicitly requested Mount Paektu and Seoul instead of the earlier Kaesong and Suwon prototypes. The superseded courtyard/gate and fortress scenes are not the current evidence. Paektu now has a new volcanic terrace route and warned steam hazards; Seoul uses rooftops, stairs, service lifts and a moving skybridge. Fictional obstacles and compressed scenic arrangements are not real visitor routes or measurements of the places.

Ground bodies now continue into the landscape rather than hanging as thin slabs; China's arches have abutments, sandstone surface detail and bounded vegetation. Mongolia has a visible windsock tied to the real gust signal. Playable collision coordinates remain independent of decorative depth. All five use the same JavaScript simulation and Three.js renderer. No countries are released or locked behind another country's completion.

## Routing and capture verification

Package scripts are standard Next dev/start/build. The route is app/world-explorer/page.tsx, and the client reads country, play and review query parameters. The review production build uses SOCIALU_BUILD_TARGET=review and .next-review; the final verified server was started with next start -p 3004. Each URL below returned HTTP 200 and its actual WebGL canvas reported ready with loaded surface materials.

Native Computer Use previously could not establish the browser URL. The user-authorized fallback successfully used Playwright with the installed Edge executable, a fresh guest context, 1600×900 viewport and ANGLE SwiftShader. These are genuine rendered screenshots, not mockups. Software-renderer FPS is **not** a desktop hardware benchmark. The mechanic screenshots use the engine's paused scan camera; they show geometry, not completed human actions.

## Test evidence

32 input-driven complete routes for the four new levels at four start delays; 148 individual mandatory/optional transition checks at four motion phases. Both Japan routes were regression-run. Every full run finishes with three hearts; all three stars and all coin IDs are reachable across the main/optional runs. Paektu's steam corridor is crossed using the actual warning cycle. Additional fault-injection tests verify both checkpoints, retained rewards, respawn and left/right backtracking for each new country. Fault injection is not counted as an input-only full run.

Focused simulation, progress, Japan camera/water and Asia tracker checks:

```text
 Test Files  6 passed (6)
      Tests  57 passed (57)
   Duration  5.51s (transform 1.34s, setup 0ms, collect 2.88s, tests 4.39s, environment 2ms, prepare 1.59s)
```

Full current-tree suite (which also includes concurrent South America development):

```text
 Test Files  96 passed (96)
      Tests  1006 passed (1006)
   Duration  284.62s (transform 6.56s, setup 0ms, collect 20.60s, tests 477.86s, environment 40ms, prepare 26.72s)

```

Production build including TypeScript: passed (tmp/tools/asia-review/build-final.log). No test/build result establishes visual approval or live cloud saving.

## Isolated commit verification

The staged source snapshot passed **946 tests across 94 files** and a production build with fresh locked dependencies and no copied credentials. Separate avatar and South America work remains outside this commit. [Recorded validation](validation.json). The working-tree 1,006-test run above includes that separate development work. The only browser console failure was the missing `/favicon.ico` (404); no uncaught page exception occurred.

## Duration and tier calibration

| Country | Tier | Intended seconds | Automated main seconds | Automated bonus seconds | Human seconds |
|---|---:|---:|---:|---:|---|
| China | 4 | 45 | 14.9–19.1 | 14.9–19.1 | Not run |
| Japan | 2 | Not set | 17.9–17.9 | 18.0–18.0 | Not run |
| Mongolia | 1 | 40 | 17.6–20.7 | 17.6–20.7 | Not run |
| North Korea | 3 | 48 | 26.4–26.4 | 26.4–26.4 | Not run |
| South Korea | 2 | 42 | 16.0–17.4 | 16.3–21.2 | Not run |

Times are deterministic simulation time, not human completion time. The intended lengths have not been validated with first-time players. Paektu measured tier 3, so its declared tier was calibrated to 3. China remains tier 4, Mongolia tier 1, Japan tier 2 and Seoul tier 2. The short automated times make human length/pace review necessary.

## Structural similarity — every East Asia pair

Analyzer: lib/world-explorer/level-similarity.ts. Range 0–1; scores at or above 0.72 are flagged. The score compares route rhythm, gaps/rises, terrain, mechanics, archetype and signature, excluding flags/colors/names. It is a design aid, not human proof of distinctness.

| A | B | Score | Result |
|---|---|---:|---|
| PRK | KOR | 0.433 | Below threshold |
| MNG | PRK | 0.406 | Below threshold |
| MNG | KOR | 0.377 | Below threshold |
| CHN | JPN | 0.375 | Below threshold |
| JPN | KOR | 0.371 | Below threshold |
| CHN | PRK | 0.349 | Below threshold |
| CHN | KOR | 0.338 | Below threshold |
| JPN | MNG | 0.300 | Below threshold |
| JPN | PRK | 0.270 | Below threshold |
| CHN | MNG | 0.267 | Below threshold |

Exact source hashes, runs and per-part scores: public/world-explorer/data/east-asia-evidence.json.

## Actual captures and visual findings

### China — Wulingyuan sandstone ravines

Vertical sandstone scenery is distinct, with supported stone bridges and a lift/crumbling ridge. The rock caps and distant forest remain visibly simpler than the cinematic target.

- [Normal gameplay](chn-gameplay.png)
- [Full-level overview](chn-overview.png)
- [Distinctive mechanic](chn-mechanic.png)
- Verified route: http://127.0.0.1:3004/world-explorer?country=CHN&play=1&review=1 (HTTP 200).
- Console/network evidence: 0 page exceptions; [{"message":"Failed to load resource: the server responded with a status of 404 (Not Found)","location":{"url":"http://127.0.0.1:3004/favicon.ico","line":0,"column":0,"lineNumber":0,"columnNumber":0}},{"message":"Failed to load resource: the server responded with a status of 404 (Not Found)","location":{"url":"http://127.0.0.1:3004/favicon.ico","line":0,"column":0,"lineNumber":0,"columnNumber":0}}]; HTTP failures [].

### Japan — Mount Fuji spring mountain gardens

The existing organic islands, blossom canopy, bridges and layered Fuji scenery are the closest reference slice. Dense scenery and sustained hardware performance still need review.

- [Normal gameplay](jpn-gameplay.png)
- [Full-level overview](jpn-overview.png)
- [Distinctive mechanic](jpn-mechanic.png)
- Verified route: http://127.0.0.1:3004/world-explorer?country=JPN&play=1&review=1 (HTTP 200).
- Console/network evidence: 0 page exceptions; [{"message":"Failed to load resource: the server responded with a status of 404 (Not Found)","location":{"url":"http://127.0.0.1:3004/favicon.ico","line":0,"column":0,"lineNumber":0,"columnNumber":0}}]; HTTP failures [].

### Mongolia — Orkhon Valley pasture and riverbanks

Wide connected grass banks, sparse settlement and an animated windsock establish an open steppe layout. Grass, river edges and horizon transitions still need a stronger art pass.

- [Normal gameplay](mng-gameplay.png)
- [Full-level overview](mng-overview.png)
- [Distinctive mechanic](mng-mechanic.png)
- Verified route: http://127.0.0.1:3004/world-explorer?country=MNG&play=1&review=1 (HTTP 200).
- Console/network evidence: 0 page exceptions; [{"message":"Failed to load resource: the server responded with a status of 404 (Not Found)","location":{"url":"http://127.0.0.1:3004/favicon.ico","line":0,"column":0,"lineNumber":0,"columnNumber":0}}]; HTTP failures [].

### North Korea — Mount Paektu volcanic highlands

User-approved replacement: Mount Paektu caldera and lake, volcanic terraces, basalt details and two warned steam vents. The caldera silhouette is readable but cliff/cap surfaces still look too regular.

- [Normal gameplay](prk-gameplay.png)
- [Full-level overview](prk-overview.png)
- [Distinctive mechanic](prk-mechanic.png)
- Verified route: http://127.0.0.1:3004/world-explorer?country=PRK&play=1&review=1 (HTTP 200).
- Console/network evidence: 0 page exceptions; [{"message":"Failed to load resource: the server responded with a status of 404 (Not Found)","location":{"url":"http://127.0.0.1:3004/favicon.ico","line":0,"column":0,"lineNumber":0,"columnNumber":0}}]; HTTP failures [].

### South Korea — Seoul rooftops and Namsan skyline

User-approved replacement: Seoul rooftop buildings, service stairs, vertical lifts, a moving skybridge and Namsan tower. The skyline is identifiable, but building facades and roof edges are simplified.

- [Normal gameplay](kor-gameplay.png)
- [Full-level overview](kor-overview.png)
- [Distinctive mechanic](kor-mechanic.png)
- Verified route: http://127.0.0.1:3004/world-explorer?country=KOR&play=1&review=1 (HTTP 200).
- Console/network evidence: 0 page exceptions; []; HTTP failures [].

## Human and device validation — pending

No human has completed these five levels in this review. No human time has been invented. No physical phone was available through the testing tools; a desktop viewport or software renderer cannot substitute for a real-device test. Signed-in Supabase persistence has not been tested in a real account; progress unit tests are separate evidence.

For **each** of the five levels, a tester must record device/browser, difficulty, main/optional-route completion times, deaths, coins/stars, backtracking, checkpoint recovery, moving-platform behavior and (where present) hazard/enemy behavior. Japan has a patrol; the new four intentionally do not all add the same enemy. Steps are walkable; none of these new routes claims a ladder-climbing mechanic. Verify completion, reload/return to the map, passport and account saving. Record N/A for an absent mechanic.

| Country | Tester/device | Main time | Optional time | Checkpoint/respawn | Saved after reload | Visual acceptance |
|---|---|---|---|---|---|---|
| China | Pending | Pending | Pending | Pending | Pending | Pending |
| Japan | Pending | Pending | Pending | Pending | Pending | Pending |
| Mongolia | Pending | Pending | Pending | Pending | Pending | Pending |
| North Korea | Pending | Pending | Pending | Pending | Pending | Pending |
| South Korea | Pending | Pending | Pending | Pending | Pending | Pending |

The four new scenes still fall short of the supplied cinematic reference in authored rock shapes, vegetation density/variety, facade detail and lighting depth. Their current visual decision is **changes required**, not complete. Japan also remains unapproved; previous native review measured about 23 FPS under non-representative power conditions, and sustained representative-hardware/mobile targets remain unproven.

## Tracker and next gate

[47-country tracker (CSV)](asia-tracker.csv) · [machine-readable tracker](asia-tracker.json) · [browser evidence](browser-evidence.json) · [screenshot gallery](index.html). Five East Asia levels remain prototypes; the other 42 regional proposals are not newly completed levels. India's older template is tracked separately as existing code. Human/visual completion and release flags remain false. Do not expand production into the next Asia batch until these five pass the review gate.

## Geographic references

- China: [UNESCO Wulingyuan](https://whc.unesco.org/en/list/640/).
- Mongolia: [UNESCO Orkhon Valley](https://whc.unesco.org/en/list/1081/).
- North Korea: [UNESCO Mount Paektu Global Geopark](https://www.unesco.org/en/iggp/mt-paektu-unesco-global-geopark).
- South Korea: [Seoul City Wall — Namsan / N Seoul Tower](https://seoulcitywall.seoul.go.kr/en/wallcourse/4.do).
- Japan: retain the existing Mount Fuji discovery source and separate Japan correction review.

## Reproduce

```powershell
$env:SOCIALU_BUILD_TARGET='review'
npm run build
node node_modules/next/dist/bin/next start -p 3004
# In a separate terminal, after the server is ready:
npm install --prefix tmp/tools/asia-browser --no-package-lock playwright
$env:EXPLORER_REVIEW_URL='http://127.0.0.1:3004'
node scripts/world-explorer/capture-east-asia.cjs
node scripts/world-explorer/report-east-asia.cjs
node scripts/world-explorer/review-east-asia.cjs
```

Run the tests successfully and preserve their logs in `tmp/tools/asia-review/full-final.log` and `review-tests.log` before regenerating this report; the report generator reads those logs. No app dependency or paid service is required for the capture tool. Capture installation is isolated under the ignored tools folder.
