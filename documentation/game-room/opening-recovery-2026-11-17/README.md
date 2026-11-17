# SRS-607.3 — Recover when an activity fails to open

Owner: Sonja Seferasi (SS). Date: November 17, 2026.
GitHub record: [issue #1321](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1321), assigned to Sonja and added to the SocialU project. The issue contains the report, two screenshots and the [downloadable evidence archive](https://github.com/user-attachments/files/34959534/srs-607-3-opening-evidence.zip). Publication was verified after reloading GitHub. The archive is the pre-publication report snapshot; this issue-link note was added afterward.
Implementation snapshot: tested locally in the existing checkout on `sonja/game-room-change-descriptions`, based on `41904e7416912886a439dcd6e3be6334ada72ce1` (the previously published completion-recovery fix, not this opening fix). Sonja subsequently requested publication; the follow-up on issue #1321 records the resulting commit and verified branch push. A branch push does not establish merge, deployment, or live acceptance.

## Requirement and confirmed gaps

SRS-607.3 requires an opening-failure message with Retry and Return to Game Room. Related entry requirement: #42, SRS-607.2. Existing #42 explicitly leaves opening-failure recovery separate.

- `/game-1`, `/world-explorer`, and `/game-room/dormspace` had no dedicated route error boundary. A render/lazy-component failure could fall through to Next.js's generic error screen without the required recovery choices.
- Jumpyland awaited `accessToken()` before starting its initial data-request timeout. If token refresh never resolved, the loading message stayed open without an error or Retry.
- The initial avatar/progress responses were not checked for the minimum list shapes before rendering the game map. Malformed progression could trigger a rendering exception.

## Changes

- Added `error.tsx` to all three existing game entry routes, using the shared `components/game-room/activity-error.tsx` and its CSS module. The screen names the activity, explains the failure, and offers Retry and Return to Game Room without showing raw exception details.
- Retry reloads the same URL, so it also reattempts a rejected lazy bundle rather than relying only on a cached component reset. The screen warns that an unfinished attempt may need to restart.
- Return uses a normal `/game-room` link, so recovery does not depend on the failed game's controller.
- Added `lib/jumpyland-entry.ts`. One refreshed token is used for both authenticated reads. The existing nine-second bounded-request helper now covers authentication refresh, both GET requests, and their response bodies during entry. There are no gameplay-start/completion writes in this loader.
- Expired or cancelled entry requests cannot start account reads after a late token refresh. The component ignores results after leaving or replacing an opening request. Timeouts and invalid/non-JSON responses show Retry and Return to Game Room.
- Valid saved progression and avatar data are loaded again on Retry. Completed levels are not reset by the recovery screen.

The game engines, DormSpace feature internals, three-heart rules, rewards, and database schema were not changed. Existing handled WebGL/API errors inside other games retain their own recovery paths; this route boundary catches uncaught render errors, not arbitrary asynchronous callbacks or an entire site outage.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| New Jumpyland entry tests | 11 passed | `unit-tests.json` |
| Existing bounded-request tests | 17 passed | `unit-tests.json` |
| Existing Jumpyland API tests | 12 passed | `unit-tests.json` |
| Total unit/API checks | 40 passed across 3 files | `unit-tests.json` |
| Scoped TypeScript check | 0 diagnostics | `typecheck.txt` |
| Publication check against staged files, unrelated untracked files hidden | 0 diagnostics | `publication-typecheck.txt` |
| Opening recovery in headless Microsoft Edge | 18 passed | `results.json` |
| Earlier #1320 completion/return recovery regression | 11 passed | `completion-regression/results.json` |
| Stalled initial token refresh | controls appeared in 9,336 ms; no late entry GETs | `results.json` |
| Mobile and keyboard | controls fit at 390 px and follow keyboard tab order | `mobile-error.png`, `results.json` |

The 18 browser checks exercise each actual route error component inside the installed Next 14 `ErrorBoundaryHandler`: injected render failure, persistent failure after Retry, successful same-URL reload after the fixture recovers, and Return navigation for each of the three activities (12 checks). Six further checks cover Jumpyland HTTP failure/retry with saved Level 1, malformed progression, stalled-refresh recovery/no late reads, retry after refresh resolves, phone layout, and keyboard focus order.

The scoped TypeScript check includes the modified Game component, entry loader, three route error files, shared error component, new tests, and their transitive imports. No full-suite or production-build result is claimed.

The prior completion-recovery runner was rerun after this entry change and passed all 11 checks, including same-attempt retry, malformed completion, pending return, late responses, and phone controls. Its repeated-Back recovery measurement was 9,023 ms. Set `SOCIALU_EVIDENCE_DIR=documentation/game-room/opening-recovery-2026-11-17/completion-regression` and run `node scripts/tests/jumpyland-recovery.browser.cjs` to reproduce it without replacing #1320's earlier evidence. Across the two browser runners, 29 checks passed.

## Reproduction

```powershell
npx vitest run __tests__/jumpyland-entry.test.ts __tests__/jumpyland-request.test.ts __tests__/api/jumpyland.test.ts --reporter=default --reporter=json --outputFile.json=documentation/game-room/opening-recovery-2026-11-17/unit-tests.json
$env:SOCIALU_PLAYWRIGHT_MODULE='C:\Csc 351\ssu-starter-app-v2\tmp\tools\asia-browser\node_modules\playwright'
$env:SOCIALU_BROWSER_EXECUTABLE='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
node scripts/tests/activity-opening.browser.cjs
```

## Evidence limits and remaining acceptance

Screenshots are actual Edge captures with a visible local-QA label. The route tests use real error components and Next's installed error-boundary handler but simulated render failures and fixture pages. Router/storage support is adapted; the Game Room destination is a fixture. The Jumpyland entry tests use production loading/UI with intercepted APIs and map/engine adapters. There is no real level playthrough, hosted save, live points award, or full Next application-routing acceptance in this evidence.

The working checkout contains unrelated pending styling, so the Jumpyland captures are not a guarantee of the published branch's appearance. The new recovery screen uses its own stylesheet.

Before marking Done: verify actual authenticated navigation from Game Room to all three games; reproduce a recoverable load failure in the integrated app; restore connectivity and retry the same game; return to the real Game Room with the saved navigation placement; and confirm previously saved account progress still loads. Test failures inside the shared application layout separately because a route error boundary does not cover its parent layout.

Framework reference checked against installed Next 14.2.15: [Next 14 error handling](https://nextjs.org/docs/14/app/building-your-application/routing/error-handling). The installed package has no `dist/docs` directory; its `error-boundary` implementation and declarations were also inspected.
