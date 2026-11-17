# SRS-607.3 follow-up — Recover when a selected Jumpyland level stalls during startup

Owner: Sonja Seferasi (SS). Date: November 17, 2026. Severity: Medium. Existing issue: #1321; related progression requirement SRS-618.5 and regression issue #1320.

**Status:** implemented locally in `C:\Csc 351\ssu-starter-app-v2` on `sonja/game-room-change-descriptions`. This follow-up is not committed or pushed. Baseline HEAD is `083137d24edaa94b601930fc1dd1fb4cbcefacfe`; that commit is the earlier navigation fix, not this startup fix. The earlier opening-recovery commit `5503931e` remains published; this report extends its coverage to selected-level startup.

## Confirmed remaining gap

The earlier fix bounded initial account loading and supplied route error screens. In `components/jumpyland/game.tsx`, `start()` still awaited avatar conversion and engine import outside that bound, then mounted the renderer without a readiness deadline. A pending conversion or renderer-ready callback could leave “Preparing your adventure…” displayed indefinitely with Back disabled. No error, Retry, or Return appeared.

Two local Edge baseline checks against Game from commit `083137d2` reproduced this: unresolved avatar conversion and a renderer that never signals readiness. Both still showed the preparing screen with Back disabled after ten seconds. See `before/results.json`, `before/texture-stuck.png`, and `before/renderer-stuck.png`.

SRS-607.3 requires a recoverable opening-failure message, Retry, and Return to Game Room. SRS-618.5 requires starting the selected available/completed level; Retry retains that level and the chosen run loadout. This is recorded on the existing #1321 to avoid a duplicate requirement issue.

## Changes

- `components/jumpyland/game.tsx`: the existing nine-second bounded-operation helper now surrounds the entire level startup: first render frame, avatar preparation, engine import, authenticated start request/response, mount, and readiness notification. Nine seconds is an implementation choice, not a new SRS deadline.
- Failure disposes the incomplete engine, clears the cached avatar-preparation promise, stops audio, and offers **Retry level** and **Return to Game Room** on a separate readable recovery screen. Retry preserves the selected level/loadout and creates a fresh attempt identifier.
- A local opening generation plus the request signal guard late avatar/engine/API results and engine state callbacks. Expired preparation cannot send a later start POST or mount an engine. An obsolete renderer's ready callback destroys that old handle rather than replacing the retry controller.
- The start API uses the outer operation signal, including checking it after sign-in refresh. Ordinary completion-save behavior retains the existing bounded request flow.
- Previously confirmed progression is not reset. No schema, migration, reward rules, level design, or three-heart rules changed. Other pending changes remain untouched.

The recovery does **not** undo a start request already accepted by the server. If renderer readiness fails after a successful start POST, that record may already exist; a retry is a fresh attempt. No completion is sent by startup recovery, and this client change makes no claim that a failed render could never have recorded participation under existing server rules.

## Reproduction

From the existing repository root:

```powershell
$env:SOCIALU_PLAYWRIGHT_MODULE='C:\Csc 351\ssu-starter-app-v2\tmp\tools\asia-browser\node_modules\playwright'
$env:SOCIALU_BROWSER_EXECUTABLE='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$env:SOCIALU_START_BASELINE='1'
node scripts/tests/jumpyland-start-recovery.browser.cjs
$env:SOCIALU_START_BASELINE='0'
node scripts/tests/jumpyland-start-recovery.browser.cjs
npx vitest run __tests__/jumpyland-request.test.ts __tests__/jumpyland-entry.test.ts __tests__/api/jumpyland.test.ts --reporter=default --reporter=json --outputFile.json=documentation/jumpyland/start-recovery-2026-11-17/unit-tests.json
$env:SOCIALU_EVIDENCE_DIR='documentation/jumpyland/start-recovery-2026-11-17/completion-regression'
node scripts/tests/jumpyland-recovery.browser.cjs
Remove-Item Env:SOCIALU_EVIDENCE_DIR
```

The startup runner uses a production Game component with controlled avatar/engine/map/audio adapters and intercepted API responses. Select the fixture's Level 1; its avatar conversion or engine-ready callback remains pending. In the fixed run, wait for recovery, retry after restoring the fixture, and release the expired callback. The same level opens once; the expired callback cannot start/replace the new attempt. The renderer test also checks that its incomplete engine was disposed. No hosted account records are touched.

## Evidence

| Check | Result | File |
| --- | --- | --- |
| Original stalls reproduced in Edge | 2 confirmed cases | before/results.json |
| New startup recovery checks in Edge 157.0.4341.60 | **7 passed**, no recorded page errors | results.json |
| Existing completion/return browser regression | **11 passed**, no recorded page errors | completion-regression/results.json |
| Existing bounded-request tests | 17 passed | unit-tests.json |
| Existing entry-loader tests | 11 passed | unit-tests.json |
| Existing Jumpyland API tests | 12 passed | unit-tests.json |
| Total unit/API regressions | **40 passed, 3 files** | unit-tests.json |
| Scoped TypeScript | **0 diagnostics** | typecheck.txt |
| Changed-file whitespace check | Passed | git diff --check |

The seven new browser checks cover: stalled avatar recovery with no start POST (9,044 ms); same-level retry and ignored late avatar resolution; renderer timeout/disposal; fresh-attempt retry and ignored stale renderer readiness; Pause/Resume after successful startup; no late start/mount after leaving during preparation; and 390 px recovery with keyboard access to Return and real anchor navigation to `/game-room` in the fixture server. Across the two fixed-behavior browser runners, **18 checks passed**. The two baseline defect reproductions are counted separately.

The 11 completion regressions cover ambiguous/malformed saves, retained same-attempt retry, confirmed/unconfirmed exits, pending-return confirmation, cancelling return, bounded repeated Back, ignored late completion, stalled refresh, and phone controls. Repeated-Back recovery appeared in 9,010 ms. These checks ran after the startup logic change, before the final isolated startup-error-screen layout adjustment. The seven startup checks and scoped TypeScript were rerun after that layout adjustment. Unit/API tests are existing regressions; the new coverage for this change is the browser runner.

Scoped TypeScript uses the repository configuration with no emit/incremental and roots for Game, the entry/request helpers through imports, the three activity route errors, shared activity error, and entry tests. It checks the working checkout, not a selectively staged publication tree. No full-suite or production-build result is claimed.

## Screenshots and acceptance limits

The baseline and final desktop/phone screenshots were visually inspected. Final recovery is a separate centered card, avoiding the game header overlap found during visual review. Screenshot captions visibly identify local simulated QA. These captures show real React recovery UI, but not Three.js gameplay, physical-device testing, hosted persistence, or live rewards. Pending local game styling appears in baseline and completion-regression captures; the final startup recovery reuses the already committed activity-error stylesheet.

Before marking #1321 Done, test the integrated signed-in app with real avatar assets and renderer startup, recover from interrupted loading, retry the same level, return to the actual Game Room, and confirm saved progression remains available. This follow-up adds evidence for the remaining startup gap and does not declare every Sonja SRS complete.
