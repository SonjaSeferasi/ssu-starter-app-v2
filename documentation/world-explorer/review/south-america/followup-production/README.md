# South America follow-up — fresh production evidence

This folder holds evidence recorded after the independent Batch B review, on one production build (`SOCIALU_BUILD_TARGET=review next build`, served by `next start` on port 3100). It is kept apart from the earlier replays in `../playthroughs/` and `../batch-b/playthroughs/`, which are unchanged.

**All twelve countries stay at TESTING.** Human desktop and real-phone acceptance remain pending, and so do Bolivia's landing-edge readability and the Brazil and Suriname patrol-fairness judgements.

## Contents

| Path | What it is |
| --- | --- |
| `captures/` | Start, main-gameplay, landmark, overview and phone-viewport captures of the nine Batch B and C levels, with `capture-results.json` (frame rate, load, draw calls, triangles) |
| `replays-stage-a-batch-b/` | The recorded Stage A and Batch B input scripts, copied unchanged and replayed on this build |
| `scoped-tests.log` | The South America, guide and media test files run on their own |
| `../guide-fix/` | The country-guide fix and its production check |
| `../batch-c/` | Batch C review package and production playthroughs |
| `../acceptance/ecu-hitch-profile-*.json` | Ecuador start-up profiles |

## Review findings

**Chile: detached dark platform slivers.** These were the sinter and lava platform bodies, and the pinnacle tops, floating with nothing beneath them. Platform bodies are now sculpted masses that widen down to the sinter flat, and the ignimbrite pinnacles stand on rock columns. The altiplano basin heightfield faced away from the camera, so it was culled into slivers. It now rises toward the camera. See `captures/chl-b-gameplay.jpg` and `chl-d-overview.jpg`.

**Colombia: ribbon-like background terrain.** The background ridges were a heightfield that rose toward the back edge, so from the camera only thin back-facing strips showed. The ridges now rise toward the front and fall away behind, and read as solid green hills (`captures/col-d-overview.jpg`, `col-a-start.jpg`). Colombia's climbable faces stay sheer on purpose, so the climb reads.

**A seam in every sculpted body.** The sculpted platform-body generator in `kit/landmass.ts` closed its ring with an angle that did not wrap, so the noise left a vertical tear in each body. It now wraps (a three-line change). This changes only geometry at that seam: platform positions and colliders are unchanged, and the Stage A replays below still match their recordings.

**Argentina: white mountain caps.** The snow collars on the Fitz Roy needles read as flat white discs around the spires (`captures/arg-a-start.jpg`, `arg-d-overview.jpg`). This was looked at but not changed in this pass. It is an open art item.

## Ecuador cold-run hitch

> **Update:** the cause was later found and fixed in shared scene code, pending the shared-scene team's agreement; see [../shader-prep/README.md](../shader-prep/README.md). Argentina's snow discs (below) were also replaced; see [../argentina-snow/README.md](../argentina-snow/README.md). This section records what was known at the time.

Profiled on the production build without assuming a cause (`scripts/world-explorer/profile-hitch.mjs`, `../acceptance/ecu-hitch-profile-production.json`). There is one cold run from a fresh browser profile, then two warm reloads in the same browser. Each run records a Chromium trace and a JavaScript CPU profile until 10 s after the level is ready.

| Run | Ready | Frames over 50 ms (in the 10 s after ready) | Long frames |
| --- | --- | --- | --- |
| Cold | 5.7 s | 4 | 3.0 s before ready (first render); 339 ms just after ready; **253 ms about 3.3 s after ready** |
| Warm 1 | 2.0 s | 3 | 185 ms and 378 ms around ready; 57 ms shortly after |
| Warm 2 | 1.5 s | 2 | 65 ms, 350 ms and 53 ms, all within about 1 s of ready |

**What the trace shows.** Every long frame is a single animation-frame callback in the three.js renderer. The main thread is waiting on the GPU process:

- `GLES2Implementation::GetProgramiv` with `ImplementationBase::WaitForCmd` (245 of the 253 ms frame)
- `CommandBufferHelper::Finish`
- texture uploads (`texSubImage2D`)

That is a synchronous wait for a WebGL shader program to finish compiling and linking, and for textures to upload, the first time something is drawn. Warm reloads still compile programs in their first frames, but nothing late. Only the cold run shows a hitch seconds after the level is ready.

**What was tested.** A material first becoming visible late, such as a wave surge rising, was one candidate. On the development build, the first two surges were delayed by 3 s. No stall moved with them, and none appeared late at all, so the trigger of the late cold-run compile is **not identified** (`../acceptance/ecu-hitch-profile-dev-surges-delayed.json`).

In the capture run, Ecuador came fourth in a browser that had already drawn three levels; its worst frame was 8.5 ms. The hitch shows only when the shaders are new to the browser.

**Not changed.** The likely remedy is to compile the scene's programs while the level loads (for example `renderer.compileAsync(scene, camera)` before the first frame). That belongs in the shared scene code used by every region, so it needs agreement with the other team first. No shared code was changed.

## Colombia on a real phone

**Not measured.** I can't run a physical phone here. Colombia is the heaviest South American scene: 285k triangles and 88 draw calls, mostly the ringed wax-palm trunks. On this laptop it held 120 FPS (1% low 113–114) on desktop and in the phone viewport. That is not a phone result. A person needs to play it on a real mid-range phone over the LAN build (`http://<laptop-ip>:3100/world-explorer?country=COL&play=1`) and note frame rate and heat before deciding whether to thin the palms.

## Production performance, Batch B (this build)

| Level | Desktop: average · 1% low · worst frame · ready | Phone viewport: average · 1% low · worst frame · ready | Draw calls | Triangles |
| --- | --- | --- | --- | --- |
| Argentina | 120 · 117 · 8.8 ms · 3.2 s (first level, cold) | 120 · 117 · 8.6 ms · 0.8 s | 86 | 100k |
| Chile | 120 · 114 · 9.2 ms · 0.9 s | 120 · 118 · 8.5 ms · 0.6 s | 82 | 118k |
| Colombia | 120 · 114 · 9.2 ms · 0.7 s | 120 · 113 · 8.9 ms · 0.9 s | 88 | 285k |
| Ecuador | 120 · 118 · 8.5 ms · 0.8 s | 120 · 115 · 8.8 ms · 0.7 s | 85 | 120k |
| Guyana | 119 · 77 · 33.3 ms · 1.3 s | 120 · 114 · 8.9 ms · 1.1 s | 104 | 181k |

Guyana's 33 ms desktop frame happened once in this run and was not seen in Batch B's run (1% low 112). It is noted, not investigated. Batch C's numbers are in `../batch-c/README.md`.

## Stage A and Batch B replays on this build

The 24 recorded input scripts for Bolivia, Brazil, Venezuela, Argentina, Chile, Colombia, Ecuador and Guyana were copied unchanged from `../playthroughs/` and `../batch-b/playthroughs/`. They were replayed on this build, and the results are in `replays-stage-a-batch-b/playthrough-results.json` with screenshots in `screens/`.

- **Replays.** All 24 passed: two completion routes and a hazard run per country. Each reached exactly its recorded outcome: status, hearts, coins and their ids, stars, discovery and events. So the art changes since those recordings (Chile, Colombia, Argentina, Guyana and the sculpted-body seam) did not move a platform, collider, patrol or hazard on the tested routes. Brazil's main route ends with 2 hearts, as it was recorded.
- **Saved progress, keyboard and emulated touch.** Passed for all eight. The touch check is Chromium emulation on a laptop, not a phone.

## Tests

| Scope | Command | Result |
| --- | --- | --- |
| Scoped: South America, guide and media test files | `npx vitest run __tests__/world-explorer-south-america.test.ts __tests__/world-explorer-guide-destination.test.ts __tests__/world-explorer-media.test.ts` | 161 passed of 161 (`scoped-tests.log`) |
| Full suite, **shared working tree** (HEAD `9f4dcc0` plus everyone's uncommitted work, including the Asia stream's) | `npx vitest run` | 1206 passed of 1206 (103 files) |
| Full suite, **isolated checkout** (a separate worktree at HEAD `9f4dcc0` plus only the 19 South America paths changed in this follow-up) | `npx vitest run` | 1120 passed of 1120 (99 files) |

The scoped run covers all twelve countries:

- the validator with physics at every timing
- zero damage at every challenge setting, including the runtime difficulty
- every coin and star without damage at runtime difficulty, on both routes at start delays of 0, 1.8 and 3.6 s
- untidy play
- the environment build, walking-cap and sculpted-depth checks

The shared working tree also has others' uncommitted changes, so its count differs from the isolated checkout. Neither run had failures.
