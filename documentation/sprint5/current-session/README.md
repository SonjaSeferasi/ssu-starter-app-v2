# SRS-107.9 caller-preservation confirmation

Owner: Linh Nguyen. November 20, 2026. Parent #882, tasks #1065/#1066/#1067/#1069, defect #1389. Branch `srs-107.9-sprint-5-preservation-confirmation` starts from integrated main after PR #1388, before these tests and changes.

## Problem and change

The selected-session database function already changes only the target. However, the API returned `ended: true` immediately after that write and the UI always claimed that the current session stayed active. A separate security action could revoke the caller during the request, making that claim inaccurate.

The API now runs the existing database-backed caller guard after the target write. It returns `currentSessionActive: true` only after that check passes. The UI requires both explicit flags before showing preservation success. An incomplete response shows an unconfirmed message and lets the user refresh. A failed final guard reports the security error. This confirms the caller at check time, not indefinitely after the response.

No migration is needed. A separately revoked caller does not justify restoring access to the target session. Task #1065 now explains this correction to its earlier extra rollback expectation. SRS-107.9 itself remains unchanged.

## Verification and evidence

- Before the fix, both new API regressions failed and the 18 existing API tests passed.
- After the fix, 39 focused checks pass across the API, request helper, account identity, controls and actual PostgreSQL function tests.
- A clean production build passes.
- The new browser scenario runs the real production Next UI/API with disposable PostgreSQL and an Auth adapter. It rejects a response missing caller confirmation, verifies selected-only revocation and a protected caller endpoint, reloads the caller successfully, then injects an independent caller security revocation after another target write. The UI reports the security error and never claims preservation in that final case.
- The earlier SRS-107.7 and SRS-107.8 browser scenarios also pass against this build. The selected-session runner now scopes its alert to the application error text because Next also creates a route-announcement alert.

Screenshots and machine-readable trace are in `evidence/`. Runners are `scripts/tests/current-session-sprint5.browser.ts`, `session-controls-sprint5.browser.ts` and `selected-session-sprint5.browser.ts`. Run them with Vitest configurations that include each browser file, Playwright and an installed Chrome executable. API regressions are in `__tests__/api/login-activity.test.ts`.

## Limits

The user selected local-only testing. Provider authentication/token issuance uses an adapter. These results do not establish current hosted Supabase, real cross-device provider or Vercel behavior. No shared database, account or provider session was changed. Screenshots show synthetic local QA data. The deliberately injected independent security action is a fault test, not ordinary remote-logout behavior.
