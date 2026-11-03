# Shader preparation at load: removing the cold-start hitch

**Scope:** shared World Explorer scene code, used by every region. **Status:** the change is in the working tree, uncommitted. **It still needs the shared-scene team's agreement before it is committed** (see "For the shared-scene team"). All twelve South American countries stay at TESTING.

## What was wrong

A level could stall for 250–800 ms once or more in its first seconds of play in a fresh browser. On Ecuador this was the logged cold-start hitch. Tracing every WebGL program link (`scripts/world-explorer/shader-timeline.mjs`) and naming the objects behind each new program (`scripts/world-explorer/shader-diagnose.mjs`) found three causes. All three are in shared code, not in Ecuador:

1. **The shadow type changed after the first frames.** The shared stage asked for `PCFSoftShadowMap`. three.js r186 no longer has it: on the first shadow pass it warns and switches to `PCFShadowMap`. The shadow type is part of every lit shader's program key, so every material then compiled a second time, during play. On Ecuador the first shadow pass came about 3.5 s after the start, which was the logged hitch (`diagnose-ecu-step1-compile-only.json`: every program key differs only in that parameter, `2→1`).
2. **Shaders compiled on first sight.** Nothing compiled programs before the first frame, so any object first drawn later (a wave surge rising, a material off screen at the start) linked its program mid-play. The browser then blocks the frame waiting for the link.
3. **Late material changes.** The photographic surface maps load after the stage mounts and swap their materials' maps, which changes those programs. The coin sparkle burst is created on pickup and disposed after, so its program was linked on the first pickup and could be freed and linked again later.

## The change

`components/world-explorer/scenic-kit.ts`: one constant.

- `renderer.shadowMap.type=T.PCFShadowMap` instead of `PCFSoftShadowMap`. r186 already draws PCF, so the picture is identical (see "Same look"), and program keys no longer change mid-play.

`components/world-explorer/country-scene.ts`: the start of a run.

1. Wait for the photographic surface maps to be applied (at most 3 s; the existing `finalize` callback now also resolves a promise).
2. `renderer.compileAsync(scene, camera)`. This links every material's program, hidden objects included, in parallel (`KHR_parallel_shader_compile`), without blocking the page.
3. One hidden coin-sparkle sample stays in the scene for the run, so its program is compiled with the rest and never freed between pickups. It is created only when bursts are used (authored levels, motion not reduced).
4. Draw one frame, which compiles the shadow-pass programs, then start the loop and report ready.
5. Whatever happens, the run starts within 6 s. The level's own 20 s load limit is unchanged.

## Verification

All measurements use production builds (`next build` with `SOCIALU_BUILD_TARGET`), headless Microsoft Edge with hardware WebGL (ANGLE D3D11), on the development laptop.

Each cold-start trace uses a new browser profile per level, so nothing is cached.

**Build used.** The shared working tree did not build at the time: the West Asia team's in-progress `countries/west-asia.ts` has a type error. So the shared tree was copied at 18:05 into a private scratch folder. The two builds below are made from that copy, with type-checking switched off in the copy only. Nothing in the shared tree was changed to build them. The type error was later fixed by the West Asia team; a normal type-checked production build of the shared tree then passed (see item 5 under "For the shared-scene team").

- **before:** the copy with `scenic-kit.ts` and `country-scene.ts` as committed at HEAD
- **after:** the copy with this change

### Cold-start shader links after ready (26 levels, five regions)

Both builds come from the same 18:05 copy of the shared tree and differ only in the two shared files. Each level was loaded in a new browser profile and traced for 10 s after ready (`ab-before-cold.json`, `ab-after-cold.json`).

| Level | Region | Shader links after ready | Worst frame after ready (ms) | Ready from navigation (s) |
| --- | --- | --- | --- | --- |
| JPN | East Asia | 5 → **0** | 633 → 34 | 4.9 → 2.6 |
| CHN | East Asia | 2 → **0** | 626 → 117 | 2.3 → 1.5 |
| KOR | East Asia | 0 → **0** | 450 → 108 | 1.3 → 1.4 |
| MNG | East Asia | 0 → **0** | 117 → 117 | 2.4 → 1.5 |
| THA | Southeast Asia | 3 → **0** | 223 → 34 | 2.5 → 2.7 |
| IDN | Southeast Asia | 2 → **0** | 217 → 142 | 2.9 → 2.3 |
| IND | South Asia | 2 → **0** | 325 → 67 | 7.2 → 4.3 |
| NPL | South Asia | 2 → **0** | 234 → 92 | 3.4 → 2.5 |
| KAZ | Central Asia | 2 → **0** | 442 → 133 | 7.2 → 2.4 |
| UZB | Central Asia | 2 → **0** | 200 → 35 | 2.3 → 2.3 |
| ITA | Reference | 1 → **0** | 450 → 117 | 3.9 → 3.5 |
| USA | Reference | 1 → **0** | 300 → 100 | 4.3 → 2.6 |
| EGY | Reference | 1 → **0** | 417 → 36 | 4.5 → 4.7 |
| NOR | Reference | 1 → **0** | 217 → 159 | 4.9 → 3.9 |
| BRA | South America | 1 → **0** | 217 → 159 | 4.6 → 3.0 |
| BOL | South America | 0 → **0** | 83 → 67 | 6.1 → 7.2 |
| VEN | South America | 1 → **0** | 200 → 50 | 5.4 → 3.2 |
| ARG | South America | 1 → **0** | 559 → 108 | 4.7 → 2.5 |
| CHL | South America | 1 → **0** | 349 → 125 | 5.6 → 2.7 |
| COL | South America | 1 → **0** | 458 → 108 | 5.5 → 2.7 |
| ECU | South America | 2 → **0** | 309 → 100 | 5.1 → 2.4 |
| GUY | South America | 1 → **0** | 333 → 67 | 6.3 → 4.3 |
| PRY | South America | 1 → **0** | 309 → 36 | 4.5 → 2.8 |
| PER | South America | 1 → **0** | 259 → 108 | 4.7 → 2.4 |
| SUR | South America | 0 → **0** | 109 → 109 | 4.3 → 2.4 |
| URY | South America | 1 → **0** | 317 → 124 | 5.2 → 2.7 |

**Summary**

- **Shader links after ready:** 35 → **0**. No level links a shader during play.
- **Median worst frame after ready:** 309 → 108 ms. It was better in 24 levels and the same in 2: Mongolia, and Suriname at 109 ms in both builds.
- **Long frames with GL work:** 29 of the 48 frames over 50 ms after ready had shader or texture work before; 0 of 24 do after. The one exception is a 2.5 ms status query on India, not a link.
- **Median time to ready:** 4.6 → 2.6 s. It was sooner in 21 levels. It was later in 5, because ready now waits for the shaders: Uzbekistan by 0.0 s, Korea, Thailand and Egypt by 0.1 s, and Bolivia by 1.1 s (Bolivia prepares the most programs, 46).

**Not explained.** About one frame per level of 100–160 ms remains, with no GL work in it, in both builds at similar sizes: Mongolia 117 ms and Suriname 109 ms in both. It is not shader-related. It may come from headless Edge and still needs checking on a real browser and phone (checklist C6).

### Same look, same play

`compare-builds.json` (`scripts/world-explorer/compare-builds.mjs`) checks the same 26 levels on both builds. Each level is loaded with reduced motion, its run paused, and only the 3D canvas captured.

- **Pixels:** in all 26, the before and after captures are identical. The mean absolute difference is 0 and no pixel differs. Six pairs are kept in `compare/`: Japan, Thailand, India, Kazakhstan, Italy and Ecuador.
- **Play:** in every level and both builds, the player jumps (about 1.95) and runs (about 4.2–4.6 in 0.7 s).
- **Page errors:** none in either build.

### South American routes unchanged

`replays/` holds the 36 recorded input scripts for all twelve countries, copied unchanged from `../followup-production/replays-stage-a-batch-b/` and `../batch-c/playthroughs/`. They were replayed on the after build. **All 36 replays reached exactly their recorded outcome**: status, hearts, coins and their ids, stars, discovery and events. Saved progress, keyboard and emulated touch passed for all twelve (`replays/playthrough-results.json`). Argentina's replays include the new snow caps.

### Tests

| Scope | Result |
| --- | --- |
| Full suite, **isolated checkout**: a worktree at HEAD `9f4dcc0` with only the 21 South America and shared-scene paths of this work. The West Asia team's additions to `guide-destination.ts` and `media.ts` were left out. | 1120 passed of 1120 (99 files) |
| Full suite, **shared working tree**: everyone's uncommitted work, including the Asia and West Asia streams | 1291 passed of 1291 (104 files) |

The unit suites run in Node and do not mount a WebGL stage, so the shader change is covered by the browser checks above, not by them.

## Timeout paths: can shaders still compile after ready?

The start-up sequence has two time limits: it waits at most 3 s for the surface maps, and it starts the run at most 6 s after mounting. Each path was forced with fault injection in `scripts/world-explorer/shader-timeline.mjs`. Each case ran on Ecuador, Japan and Italy, each level in a fresh cold browser traced for 14 s after ready (`timeouts/*.json`).

| Case | How it was forced | Ready (s) | Shader links after ready | Worst frame after ready |
| --- | --- | --- | --- | --- |
| Control | none | 1.8–2.0 | 0 | 9–92 ms |
| Surface maps late, inside the 3 s wait | maps held 2 s (`--delay-textures 2000`) | 3.7–3.8 | 0 | 25–67 ms |
| **Surface maps arrive after ready** | maps held 4.5 s; they land 1.2–1.4 s after ready | 4.9–5.0 | **1–2 per level** | **183–275 ms** |
| **Surface maps very late** | maps held 9 s; they land 5.7–5.8 s after ready | 4.6–5.0 | **1–2 per level** | **184–258 ms** |
| Surface maps fail to load | requests failed (`--fail-textures 1`) | 4.9–6.1 | 0 | 42–67 ms |
| Slow preparation, inside the 6 s cap | links reported unfinished for 4 s (`--slow-compile 4000`) | 4.1–4.3 | 0 | 67–83 ms |
| Slow preparation, past the 6 s cap | links reported unfinished for 9 s (`--slow-compile 9000`) | 7.0–7.8 | 0 | 17–33 ms |
| No parallel compilation | `KHR_parallel_shader_compile` hidden (`--no-parallel 1`) | 1.5–2.1 | 0 | 50–100 ms |

**Yes: one path still compiles shaders after ready.** That is when the photographic surface maps arrive after the 3 s wait has expired. When they land, `loadSurfaceMaps` swaps the maps on its materials (`needsUpdate`), which needs new programs. The next frame then blocks for 156–195 ms while the browser links 1–2 programs. That is the old hitch, smaller (one material set instead of every material), and only on a slow or stalled texture download.

**The other paths do not, with one caveat.**

- **Failed maps:** the materials never change. Ready waits the full 3 s.
- **Slow preparation, inside or past the 6 s cap:** `start()` draws one warm-up frame *before* it reports ready. three.js r186 draws a program whether or not its link has finished, and waits for it on first use. So any unfinished link is waited for during that draw, before ready.
  - Ready moves later, to about 7–8 s from navigation past the cap.
  - **Caveat:** the fault injection only reports links as unfinished. It cannot make the GPU slower. On a genuinely slow device, the warm-up draw blocks the loading screen until linking ends. The 6 s cap limits how long the run waits for `compileAsync`, not how long that final draw takes.
- **No parallel compilation:** three treats every program as ready at once, so `compileAsync` resolves immediately and the linking cost falls in the warm-up draw, before ready.

**Follow-ups:** the late-map path is now fixed (next section). For slow devices, the warm-up draw still needs measuring on real low-end phones (checklist C6) before anything changes.

## Late surface maps: prepared before the swap (fixed 3 Nov 2026)

**Change.** Maps that arrive after ready no longer change a live material.
- `country-scene.ts` sets `scene.userData.prepareMaterials`.
- `loadSurfaceMaps` (`kit/surface-maps.ts`) and Japan's `japan-materials.ts` call `changeMaterialsPrepared`:
  1. It builds copies of the affected materials with the new maps. `onBeforeCompile` and `customProgramCacheKey` are copied too.
  2. It compiles the copies with `renderer.compileAsync` in a staging scene. The scene holds `object.clone(false)` stand-ins of the real meshes, so instancing, instance colours, skinning and fog give the same program keys. The scene's own lights, fog and environment are used.
  3. Only then does it apply the maps to the live materials.
- Without `KHR_parallel_shader_compile`, three cannot tell when a link has finished, so the swap waits 1.5 s more.
- If preparation fails, or the stage closes, the swap is skipped: the level keeps its plain materials. Routes, collisions, mechanics and difficulty are untouched; only material maps change, as before.

**Why the stand-ins are clones.** A first version used plain `Mesh` stand-ins. Japan still linked one program on the swap, because its instanced rocks carry `instanceColor`, which is part of the program key. `object.clone(false)` keeps every key-relevant flag.

**Late-texture fault matrix** (`late-textures/*.json`; Ecuador, Japan, Italy and China; fresh cold browser; 14 s traced after ready):

| Case | Before: links after ready / worst frame | After: links after ready / frames blocked by a link |
| --- | --- | --- |
| Cold, warm | 0 / — | 0 / 0 |
| Maps held 2 s (inside the wait) | 0 | 0 / 0 |
| Maps held 4.5 s (land after ready) | 1–2 per level / 156–725 ms | **0 / 0** |
| Maps held 9 s | 1–2 per level / 184–258 ms | **0 / 0** |
| Maps fail | 0 | 0 / 0 |
| Slow compile 4 s, 9 s | 0 | 0 / 0 |
| No parallel compile; and no parallel with maps held 4.5 s | — | 0 / 0 |

**What remains.** Uploading the textures to the GPU still costs one frame when they land: Japan 70–115 ms, Italy about 40 ms, the others under 30 ms. This is a texture upload, not a shader compile. Decoding the images first (`image.decode()`) was tried and did not help, so it was reverted. Recorded as a Japan note in the acceptance findings.

**Cross-region regression (67 adventures, `review/acceptance-67/shader/`).**

| | Before | After |
| --- | --- | --- |
| Shader links after ready (67 cold) | 110 | 0 |
| Frames blocked by a link (67 cold) | 99 | 1 (the warm-up frame straddling ready) |
| Median worst frame after ready (67 cold) | 358 ms | 83 ms |
| Median time to ready (67 cold) | 4.23 s | 3.15 s (sooner in 49) |
| Links / blocked frames (14 warm) | 27 / 16 | 0 / 0 |

- **Pixel and play comparison (`compare-builds.json`):** 45 levels are identical, with play matching. Vietnam (0.08 %) and the UAE (0.02 %) differ by a few pixels, probably animation phase.
- **20 levels are not a result.** The after build was not ready within 45 s while the machine was loaded, so their captures were blank: JPN, ITA, EGY, BRA, CAN, AUS, IND, ZAF, NOR, FRA, USA, CHN, MNG, PRK, KOR, URY, BOL, PER, ARG, VNM. Their pixel and play check must be rerun on a quiet machine. Their cold-start traces above did complete.
- Mongolia's one-off 425 ms frame was not a GL call and did not recur in 3 × 2 reruns.

Tests: `__tests__/world-explorer-material-prepare.test.ts` covers three cases:
- no hook: the maps apply at once;
- with the hook: the copies are prepared before the live change, including instanced meshes and copied compile hooks;
- the hook rejects: the materials are left unchanged.

## For the shared-scene team

Everything below is uncommitted in the shared working tree, waiting for your review:

| File | Change |
| --- | --- |
| `components/world-explorer/scenic-kit.ts` | `PCFSoftShadowMap` → `PCFShadowMap` (1 line plus a comment) |
| `components/world-explorer/country-scene.ts` | start-up sequence: surface maps, `compileAsync`, coin-burst sample, one warm-up draw, 6 s cap (about 11 lines); `scene.userData.prepareMaterials` for late maps (about 10 lines) |
| `components/world-explorer/kit/surface-maps.ts` | `changeMaterialsPrepared`; `loadSurfaceMaps` swaps maps only after preparation |
| `components/world-explorer/japan-materials.ts` | Japan's rock maps use the same prepared swap |
| `__tests__/world-explorer-material-prepare.test.ts` | new: 3 tests |

What to check on your side:

1. **Ready fires later.** `onReady` and `canvas[data-ready]` now fire after the shaders are prepared, not straight after mounting. Measured from navigation, ready came sooner in 21 of 26 levels, because programs no longer compile twice, and later by up to 1.1 s in the other five (Bolivia the most). Any script that assumed ready meant the first frame had just been queued still works: the loop starts in the same call.
2. **One hidden object.** A sample named `collectible-burst-shader-sample` is added to the scene in authored levels. A test that counts scene children, or names every object, would see it.
3. **The scene must be complete when mounting ends.** Objects an environment adds later (after `mount`) are not prepared. They still compile on first sight, as before.
4. **Surface maps that arrive after the 3 s wait are prepared off-screen and swapped in afterwards.** They arrive up to 1.5 s later on browsers without parallel compilation. If preparation fails, the level keeps plain materials. See "Late surface maps".
5. **A normal production build passes:** `SOCIALU_BUILD_TARGET=review next build`, type-checking on, from the shared working tree on 2 Nov 2026 at 21:03, once the West Asia type error was fixed. On that build, Ecuador, Colombia, Bolivia, Brazil, Suriname, Argentina, Japan and Kazakhstan link no shader after ready (`normal-build-cold.json`).
6. **Reproduce:** `node --experimental-websocket scripts/world-explorer/shader-timeline.mjs --codes <CODES> --base <url>` (cold traces), `shader-diagnose.mjs --code <CODE>` (which objects own late programs) and `compare-builds.mjs --before <url> --after <url> --codes <CODES>` (pixels and play).

To withdraw it, restore the four source files from HEAD and delete the new test; no other file depends on them.

## Files

| File | Contents |
| --- | --- |
| `ab-before-cold.json`, `ab-after-cold.json` | Cold-start traces for 26 levels, before and after, from the same copy of the tree |
| `ecu-timeline-before.json` | Ecuador cold trace before, with program names |
| `ecu-timeline-step3-surfaces.json` | Ecuador after steps 1–3, before the burst sample |
| `diagnose-ecu-step1-compile-only.json` | `compileAsync` alone: every program recompiled at +3.8 s (the shadow-type switch) |
| `diagnose-ecu-step2-shadow-type.json` | With the shadow-type fix: only the surface-map materials still recompile |
| `diagnose-jpn-step3-before-burst-sample.json` | The coin sparkle as the last late program (Asia levels collect a coin at the spawn) |
| `diagnose-ecu-final.json`, `diagnose-jpn-final.json` | Final build: every program prepared before ready |
| `compare-builds.json`, `compare/` | Pixel and play comparison, before and after |
| `replays/` | South American route replays on the after build |
| `late-textures/` | Late, failed and slow-compile fault matrix, before and after the prepared swap |
| `../../acceptance-67/shader/` | Cold (67) and warm (14) traces before and after, and the pixel/play comparison |
