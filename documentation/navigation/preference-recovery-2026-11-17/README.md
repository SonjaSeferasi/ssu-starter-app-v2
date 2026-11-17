# Navigation placement recovery — SRS-601.4–601.7

Owner: Sonja Seferasi (SS). Date: November 17, 2026. Severity: Medium.

Status: prepared for publication to `sonja/game-room-change-descriptions` under issue #1333 at the user's request. The issue's publication comment records the resulting commit and verified push. Not merged, deployed, or accepted on a live account. Baseline: `5503931e89eea01b711d8014a2a5ef44adf05973`.

## Requirements and confirmed defects

- **601.4:** restore the account's last successfully saved placement. A successful GET with an invalid/missing position previously silently left Side selected without reporting a load failure.
- **601.5:** show a failed-save message and Retry. A PUT returning HTTP 200 with a different position previously cleared saving without warning. A stalled request could leave controls disabled indefinitely.
- **601.6:** Retry the same selected placement. Preserve the selection and page content while retrying.
- **601.7:** save automatically, without a separate Save button. Use the existing session refresh flow rather than a potentially expired stored access token.

Ordinary HTTP-error messages and Retry existed before this fix. This batch fixes the unhandled confirmation, refresh, and timeout cases; it does not claim to introduce all recovery UI. Related issue #1301 addresses SRS-601.3 narrow-Profile layout, a distinct defect.

## Reproduce before the fix

1. Run the browser runner with `SOCIALU_NAV_BASELINE=1`. It loads SocialShell from baseline commit 5503931e while retaining the local navigation component/styles and test adapters.
2. Return HTTP 200 with an invalid position from GET `/api/preferences`. Open Preferences: Side remains selected with no load error or Retry.
3. Select Bottom, but return HTTP 200 with `{ "position": "side" }` from PUT `/api/preferences`. Bottom remains selected, saving stops, and no unconfirmed-save warning appears.
4. Expected: reject invalid loading/confirmation, show an appropriate error and Retry, and only regard the selected placement as saved when the server confirms that exact value.

Both baseline assertions passed. See `before/results.json` and `before/mismatched-save.png`.

## Implementation

- New `lib/navigation-preferences-client.ts` refreshes authentication with the existing `accessToken()` helper and handles GET/PUT. It validates Side, Bottom, or Top, and a save must confirm the exact requested position.
- One nine-second deadline covers token refresh, request, and response decoding. Nine seconds is an implementation choice, not a timing requirement specified by SRS-601. A deadline rejects independently of whether an adapter respects abort.
- Cancelled/expired requests cannot send a late preference request after authentication resolves. Component cancellation prevents obsolete results from updating the UI.
- `components/navigation/social-shell.tsx` uses the helper for initial load, automatic save, and Retry. Invalid loads offer a read retry; failed saves keep the selected placement and retry that placement. Existing page content is retained.
- A timeout means saving is **unconfirmed**, not proof that the server did not save. Server-side ordering/version control was not added.
- New regression tests: `__tests__/navigation-preferences-client.test.ts`. Browser runner: `scripts/tests/navigation-preference-recovery.browser.cjs`.
- No database migration is required. Existing preference API and navigation database behavior are covered by regression checks. Preexisting appearance/reminder changes in SocialShell were preserved and are not part of this batch.

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| New preference client tests | 17 passed | unit-tests.json |
| Navigation regression tests | 28 passed | unit-tests.json |
| Game Room API regression tests | 40 passed | unit-tests.json |
| PGlite navigation placement migration/account isolation | 1 passed | unit-tests.json |
| Total focused tests | **86 passed, 4 files** | unit-tests.json |
| Baseline Edge defect reproduction | 2 passed | before/results.json |
| Fixed behavior in Microsoft Edge 157.0.4341.60 | **13 passed**, no recorded browser errors | results.json |
| Scoped TypeScript | **0 diagnostics** | typecheck.txt |

The 13 Edge checks cover valid Bottom restoration; malformed-load error; read-only Retry restoring Top; mismatched-save error retaining Bottom; exact-selection automatic retry with draft preservation; restoration after fixture reload; HTTP failure and Top retry; refreshed-token use; stalled-save recovery (9,060 ms); same-selection retry ignoring the late expired response; stalled-load recovery; stalled-refresh prevention of a late PUT and subsequent retry; and visible Retry at 390 px.

Screenshots `mismatched-save.png`, `invalid-load.png`, `save-timeout.png`, and `mobile-retry.png` are actual local Edge captures, visibly labeled as simulated account/API QA. Before/after desktop and mobile captures were visually inspected.

## Reproduction commands

Run from the existing repository root:

```powershell
npx vitest run __tests__/navigation-preferences-client.test.ts __tests__/navigation.test.ts __tests__/api/game-room.test.ts __tests__/database/navigation-placement.test.ts --reporter=default --reporter=json --outputFile.json=documentation/navigation/preference-recovery-2026-11-17/unit-tests.json
$env:SOCIALU_PLAYWRIGHT_MODULE='C:\Csc 351\ssu-starter-app-v2\tmp\tools\asia-browser\node_modules\playwright'
$env:SOCIALU_BROWSER_EXECUTABLE='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$env:SOCIALU_NAV_BASELINE='1'
node scripts/tests/navigation-preference-recovery.browser.cjs
$env:SOCIALU_NAV_BASELINE='0'
node scripts/tests/navigation-preference-recovery.browser.cjs
```

The scoped TypeScript check uses the repository tsconfig with noEmit, incremental disabled, and roots `next-env.d.ts`, `components/navigation/social-shell.tsx`, `lib/navigation-preferences-client.ts`, and `__tests__/navigation-preferences-client.test.ts`, including transitive imports.

## Evidence limits and remaining acceptance

The browser runner uses the production SocialShell, NavigationFrame, and session/preference helpers, with simulated APIs and adapters for unrelated appearance, chat, presence, points, reminders, Next links, and routing. It is not the complete Next application. Fixture reload persistence is not proof of hosted database persistence or cross-device/account isolation in production. Current pending local styling appears in screenshots. No real account records were changed by these tests. No full-suite or production-build result is claimed.

Before marking Done: verify Side/Bottom/Top saving and restoration with a real signed-in account; interrupt connectivity and recover with Retry; verify real page content remains intact; and check separate-device/account restoration. Keep the issue open until integrated acceptance is evidenced.

## Publication scope

The commit includes only the navigation preference helper, its SocialShell integration, focused tests, browser runner, and this evidence folder. Pending appearance/reminder integrations in SocialShell and other unrelated working changes are excluded. The initial 86 tests and 13 Edge checks above were completed before publication; they are not represented as newly rerun tests. The additional publication TypeScript check reads indexed repository sources and hides unrelated untracked sources, retaining installed dependencies and next-env.d.ts. Its result is recorded in `publication-typecheck.txt`. No production build or live acceptance is implied by this check.
