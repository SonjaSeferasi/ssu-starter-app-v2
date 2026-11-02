# East Asia Phase A — revised review candidate

**Return for review; no expansion and no release approval.** Account-save verification and physical-phone testing remain pending at the user’s explicit request. The other 42 Asia designs remain PROPOSED, and all 47 release flags remain false.

[Open actual game captures](index.html) · [47-country tracker](asia-tracker.csv) · [Validation](validation.json) · [Rendered playthroughs and GPU timings](desktop-playthroughs.json)

## Implementation

- **CHN:** Varied sandstone pillar heights, widths, offsets and weathered silhouettes; broken moss caps; broadleaf vegetation grounded on the valley mesh; ridge wind, lift and crumbling ledges.
- **JPN:** Original scenery models, materials, Fuji, blossom canopy and optional route retained. The lower bridge sits below the overhead rock, and six exit risers replace the mandatory high jump. Its entry coin follows the revised drop.
- **MNG:** Low riverbanks join near-bank and foreground ground meshes. A curved river and gently moving wooden ferry replace the static crossing. The mobile country title has a full-width row.
- **PRK:** Irregular dark volcanic rim, restrained snow, depth-colored caldera lake and basalt shoreline. Warned loose-rock hazards and ridge wind replace steam; the rock shelf crumbles.
- **KOR:** Grounded pavement supports all street trees. Recessed glass, mullions, roof services, skyline setbacks, warm lights, a planted optional service lift and a switch-timed skywalk distinguish Seoul.

The 47-country specification is unchanged. Japan’s art modules are unchanged; only beginner-route geometry/collision data and the first entry-arc coin changed. No jump physics, difficulty analyzer threshold, similarity weights or country unlock rule was weakened to obtain the requested tiers.

## Measured difficulty

| Country | Target tier | Measured tier |
|---|---:|---:|
| China | 5 | 5 |
| Japan | 1 | 1 |
| Mongolia | 2 | 2 |
| North Korea | 4 | 4 |
| South Korea | 3 | 3 |

Measurements use the real running-jump envelope and authored route graph. Human completion time and perceived difficulty still require review.

## Checks

- Full suite: **1114 tests / 98 files passed** with two workers.
- Production build, including TypeScript: **passed**, output .next-asia-phase-a.
- Final art/route/tracker recheck after the image review: **38 passed**.
- Existing-route reporter regenerated: **32 input-driven runs and 148 transition/timing checks**, plus both Japan runs.
- **10 rendered desktop playthroughs**: main and bonus for each country, all finishing with three hearts; every bonus run earns all three stars. Reward counts agree with the recorded simulation.
- **35 actual game images**: four review views, one emulated mobile view and two completed-run views for each country. Earlier Phase A captures are preserved in the sibling folder.
- Five normal and review URLs returned HTTP 200 with ready canvases. Zero uncaught scene exceptions. The missing favicon 404 is a known non-scene request.
- Emulated 390×844 controls respond; all country headings fit their boxes and the layouts have no horizontal overflow. This is not physical-phone evidence.

The first broad test run exposed an outdated Japan test driver and coin placement, plus test timeouts while the build competed for CPU. Those were addressed before the successful full run. Windows also held the original review trace file, so a fixed, opt-in output folder was added. The verified preview is **http://127.0.0.1:3011/world-explorer?country=CHN&play=1**, build **um9nGOnV6b5-uBzo7h9C6**. Port 3006 serves an older build and must not be used as current evidence.

## Actual desktop playthrough method

Input tapes come from the actual simulation drivers. The opt-in review controller replays each left/right/jump frame through the real in-page simulation, renderer, HUD and result callback. It never injects coordinates, hearts, rewards, checkpoints or completion. Discovery pauses are resumed through the UI. These are automated playthroughs, not human approval. [Input tapes](input-tapes.json), [runtime source hashes](source-snapshot.json) and [raw results](desktop-playthroughs.json) make the evidence traceable.

## Desktop hardware measurements

Detected adapter: Intel Arc Graphics; browser renderer: ANGLE (Intel, Intel(R) Arc(TM) Graphics (0x00007D55) Direct3D11 vs_5_0 ps_5_0, D3D11). Measurements use hardware-accelerated headless Edge, Direct3D11, standard quality, 1600×900 and device scale 1, after the test suite completed. The sample discards the first 120 rendered frames.

| Country | Route | Average FPS | p95 frame ms | Draw calls | Triangles |
|---|---|---:|---:|---:|---:|
| CHN | main | 29.1 | 33.5 | 96 | 245,696 |
| CHN | bonus | 29.4 | 33.6 | 92 | 245,460 |
| JPN | main | 29.9 | 33.5 | 144 | 220,467 |
| JPN | bonus | 29.9 | 33.5 | 144 | 220,467 |
| MNG | main | 29.9 | 33.5 | 47 | 59,208 |
| MNG | bonus | 29.9 | 33.5 | 47 | 59,208 |
| PRK | main | 30.0 | 33.5 | 49 | 61,182 |
| PRK | bonus | 29.7 | 33.5 | 49 | 61,182 |
| KOR | main | 29.8 | 33.6 | 53 | 129,800 |
| KOR | bonus | 29.8 | 33.7 | 53 | 129,800 |

**The 60 FPS desktop acceptance target is not approved.** These results are actual observations, not the earlier SwiftShader numbers. Do not treat a hardware renderer string or a successful run as proof of a sustained 60 FPS target. Physical-phone 30 FPS testing remains pending. The visible blank-page baseline also measures 30.0 FPS; disabling the browser frame limit/vsync yields 57.2 FPS on that empty page. This indicates an environment/browser refresh constraint and does not prove the game meets 60 FPS. See frame-baseline.json. No display or operating-system setting was changed.

## Distinctness and review limits

The unchanged structural analyzer compared five East Asia routes against one another, all 12 current South America routes, Egypt and Norway: 80 relevant pairs, 0 flagged at the unchanged 0.72 threshold. South America remains separate development and is included only as a comparand; no next Asia region was started. [Full comparison](structural-similarity.json).

These compressed scenery studies remain stylized rather than survey-accurate reconstructions. The screenshots are the acceptance evidence; this report does not claim they exactly reproduce a cinematic concept. Review China’s pillar distribution, Mongolia’s bank transitions, the visible caldera/water, Seoul’s grounded streets and lighting, plus Japan’s easier lower path. Human visual and gameplay approval remains pending.

## Reproduction

Build with SOCIALU_BUILD_TARGET=asia-phase-a, then start Next on port 3011 with the same environment value. Verify the served build ID against .next-asia-phase-a/BUILD_ID. Set EXPLORER_REVIEW_URL=http://127.0.0.1:3011, EXPLORER_REVIEW_OUTPUT=documentation/world-explorer/review/asia/phase-a-revision-2 and EXPLORER_GPU=hardware. Run record-asia-inputs.cjs to regenerate the input tapes, capture-asia-phase-a.cjs, then review-asia-desktop.cjs with EXPLORER_INPUT_TAPES pointing at input-tapes.json, then this reporter. Playwright is a review-tool dependency under ignored tmp/tools/asia-browser, not an app runtime dependency.
