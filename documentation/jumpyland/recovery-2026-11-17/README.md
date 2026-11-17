# Jumpyland completion and return recovery — November 17, 2026

Implementation snapshot: tested locally in Sonja's existing checkout on `sonja/game-room-change-descriptions`, based on `df52ea619fa21fc281609ca93669310dd5613679`. That base commit contains earlier work, not this fix. Sonja subsequently requested publication; the follow-up on issue #1320 records the resulting commit and verified branch push. No database migration is required for this client change. A branch push does not establish merge, deployment, or live acceptance.

Published records: [recovery issue #1320](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1320), assigned to Sonja and added to SocialU, with detailed results and two labeled component screenshots; [SRS-620.1 decision on #388](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/388#issuecomment-6942111989). Both were verified after reloading GitHub. Publication proof is saved in `github-1320-recovery.jpg` and `github-388-decision.jpg`.

## Requirements and observed gaps

SRS-619.7–619.9 and SRS-622.6–622.10 cover ambiguous completion saves, retaining a result for retry, blocking another attempt until confirmation, and returning safely to the Game Room. NFR-65 proposes a 10-second return-wait limit, still pending team agreement.

Before this change, a failed completion request displayed “Your result has not been saved.” A lost response cannot establish that: the server may have already saved it. The previous 10-second fetch timeout started after authentication refresh, so a stalled refresh was outside the bound. A successful HTTP response was accepted without validating confirmation of the completed level. Selecting Back while saving did not automatically return when the save later succeeded.

## Resulting behavior

- The completion result stays in memory for retry, with wording that saving is not confirmed. Replay and Next remain unavailable until confirmation.
- A response must confirm the current level in a valid completed-level list. Optional reward and balance values must be nonnegative safe integers. Invalid HTTP-200 data cannot unlock another attempt or claim a reward.
- Authentication refresh, transport, and response decoding share a nine-second request budget. The explicit deadline also bounds promises that do not honor abort. An expired refresh cannot send its completion request later.
- Back during saving waits for confirmation, then returns automatically. Stay cancels that navigation intent while saving continues.
- An unconfirmed return offers Stay and Retry, preserving the same attempt ID and coins, or Leave Without Saving with a warning. A confirmed result returns directly.
- Repeated Back clicks do not restart the existing deadline. Late responses from expired requests cannot overwrite the retry result.
- Retention is in the open component, not durable offline storage. Refreshing or closing the page can still lose the unconfirmed local attempt.

## Files

- `components/jumpyland/game.tsx`: save validation, uncertainty wording, pending return and recovery choices.
- `lib/jumpyland-request.ts`: bounded operation and completion-response validation.
- `__tests__/jumpyland-request.test.ts`: deadline, late response, cleanup and validation regression tests.
- `scripts/tests/jumpyland-recovery.browser.cjs`: repeatable component browser checks.
- `documentation/SocialU_SRS_Editable.md`: SRS-620.1 revision flag only for this batch; unrelated pending document edits were preserved.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Request helper tests | 17 passed | `unit-tests.json` |
| Jumpyland API tests | 12 passed | `unit-tests.json` |
| Reward database tests using PGlite | 5 passed | `unit-tests.json` |
| Existing three-heart life tests | 4 passed | `unit-tests.json` |
| Total focused tests | 38 passed in 4 files | `unit-tests.json` |
| Scoped TypeScript check | 0 diagnostics | `typecheck.txt` |
| Publication TypeScript check against staged files, hiding unrelated untracked files | 0 diagnostics | `publication-typecheck.txt` |
| Headless Microsoft Edge component checks | 11 passed, no recorded errors | `results.json` |
| Pending-return timeout with repeated Back | recovery visible in 9,063 ms | `results.json` |
| Mobile recovery controls | both choices visible at 390 px | `recovery-mobile.png` |

An initial 10-second request budget yielded controls at 10,059 ms, slightly outside the proposed return target. The budget was reduced to nine seconds to allow rendering time. The final run measured 9,063 ms. This is an observed local measurement, not a guarantee under all device scheduling conditions.

The 11 browser checks cover ambiguous failure, same-attempt retry, confirmed direct return, leaving without confirmed saving, malformed success, automatic return after a delayed confirmation, Stay cancelling return, repeated-Back timing, stale responses after retry, stalled authentication with no expired POST, and mobile controls.

### Reproduction commands

```powershell
npx vitest run __tests__/jumpyland-request.test.ts __tests__/api/jumpyland.test.ts __tests__/database/jumpyland-rewards.test.ts __tests__/jumpyland-life.test.ts --reporter=default --reporter=json --outputFile.json=documentation/jumpyland/recovery-2026-11-17/unit-tests.json
$env:SOCIALU_PLAYWRIGHT_MODULE='C:\Csc 351\ssu-starter-app-v2\tmp\tools\asia-browser\node_modules\playwright'
$env:SOCIALU_BROWSER_EXECUTABLE='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
node scripts/tests/jumpyland-recovery.browser.cjs
```

### Screenshot and browser evidence limits

`unconfirmed-completion.png`, `unconfirmed-exit.png`, `bounded-return.png`, and `recovery-mobile.png` are actual screenshots of the production React component under a labeled local test harness. The harness replaces the game engine, map, avatar, audio, and router with test adapters and intercepts API responses. It triggers a simulated completion and verifies navigation intent. These screenshots do not show a real level playthrough, a real Next.js route transition, a hosted account save, or points being granted in the live database.

The browser captures were made in the working checkout, which also contains pending styling changes excluded from this recovery commit. Treat them as recovery-behavior evidence, not an exact visual snapshot of the published branch. Publication includes only the recovery code, tests, runner, evidence, and the two-line SRS-620.1 revision flag; unrelated work remains local.

Before marking Done: complete a real level on the integrated app, check success and interrupted-connection recovery with an authenticated account, verify the return route and persisted progress after reload, and confirm retry does not grant duplicate rewards. No full-suite or production-build result is claimed for this batch.

## SRS-620.1 decision

Sonja explicitly selected “Keep three hearts; flag the SRS for revision.” The existing three-heart and checkpoint gameplay is unchanged. The original single-fall/single-hazard requirement and acceptance criterion remain for traceability, with a revision note. Team approval of revised wording is still needed; this does not satisfy the original one-hit criterion. Track the decision in existing issue #388, related to #375.
