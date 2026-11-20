# SRS-107.7 Sprint 5 continuation

Owner: Linh Nguyen (LN). Date: November 20, 2026. Traces to UR-107, SRS issue #880 and defect #1386. Original Sprint 3 implementation and branch timing remain historical; this is new failure-recovery work on `srs-107.7-sprint-5-session-controls`, created before tests/code.

A stalled refresh or logout could keep the confirmation dialog disabled indefinitely. `loginActivityRequest` now applies a ten-second implementation deadline across token refresh, HTTP transport and response decoding. Timeout aborts the local transport and settles independently of an adapter honoring abort. A late refreshed token cannot start an expired logout. Caller cancellation also settles promptly. Existing account/session identity checks and no-store requests remain in place.

The write may already have committed when its response is lost. The message therefore says that logout is unconfirmed and asks the student to refresh activity before trying again. It never claims a rollback or that the remote session is definitely still active. No schema migration is needed.

## Reproduction and checks

Two tests on unmodified main 970917b stayed pending after 12 seconds of simulated time: stalled transport and stalled authentication refresh. Nine existing identity-boundary checks passed. After the fix, the tests cover both cases, stalled body decoding and caller cancellation.

Commands:

```sh
npm ci
npm run build
npx vitest run __tests__/login-activity-session.test.ts __tests__/account-session.test.ts __tests__/api/login-activity.test.ts __tests__/login-session-options.test.ts __tests__/database/login-activity.test.ts
```

Browser evidence runner: `scripts/tests/session-controls-sprint5.browser.ts`. Run through a Vitest config including that file, with `SOCIALU_PLAYWRIGHT_MODULE` pointing to Playwright and `LOGIN_ACTIVITY_BROWSER_EXECUTABLE` to the installed browser. The runner starts the clean production app against disposable PGlite and an Auth/PostgREST adapter; no hosted account is accessed. The default evidence output can be overridden with `LOGIN_ACTIVITY_EVIDENCE_DIR`.

Actual browser checks cover current-session exclusion, another-session action, Cancel and Escape without a write, error/dialog recovery, confirmed selected SQL revocation, caller continuity, timeout feedback and refreshing a write that committed before its response timed out. `evidence/acceptance-trace.json` and numbered screenshots record these checks. Screenshots show the actual local app with synthetic account/session records. They do not prove live Supabase provider termination, a deployed configuration, or full SRS sign-off.

## Hosted acceptance pending approval

`scripts/tests/session-controls-sprint5.live.cjs` is opt-in. It creates exactly one new `qas5_` account in the asserted Supabase project, signs it in in two independent browser contexts, tests Cancel, selected logout, target API/refresh rejection, caller continuity and a new target sign-in, then independently attempts deactivation and app/provider-session revocation. It uploads no image, sends no chat or email, and never targets an existing student's account. Synthetic login/audit records remain, and service failures may prevent full cleanup. Do not run without explicit approval. No credentials or tokens belong in evidence.

This PR fixes #1386 and completes the control/confirmation criteria for #1053/#1054/#1056/#1057 using the running local application and actual disposable SQL. SRS-107.7 requires the eligible option and cancellation behavior, which these checks cover; no real provider termination is asserted. Hosted testing was declined on November 20, 2026. The live runner remains opt-in and was not run. SRS-107.8 (#881) and SRS-107.9 (#882) have separate termination/preservation acceptance and are not silently closed by these local controls checks.
