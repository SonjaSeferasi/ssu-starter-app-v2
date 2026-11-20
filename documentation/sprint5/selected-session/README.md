# SRS-107.8 selected-session acceptance

Owner: Linh Nguyen (LN). Date: November 20, 2026. SRS issue #881; tasks #1059/#1060/#1062/#1063; traces to UR-107. New branch `srs-107.8-sprint-5-logout-acceptance` was created from integrated main after PR #1387 merged, before this acceptance runner was written. Original implementation PR #1073 and its historical branch remain the implementation source; this PR supplies the missing integrated local acceptance.

## Actual checks

The runner opens two isolated browser contexts for one synthetic local student. Each sign-in issues a distinct session in the actual disposable PostgreSQL schema, through an Auth adapter. The real production login/history/logout/refresh API routes and real session functions run against that database.

- Cancel leaves the target authorized.
- Foreign, current-session and unconfirmed targets are refused.
- Confirmed logout changes only the selected owned row, retains history and denies that browser's next protected API request.
- The caller remains Active and can still use a second protected API endpoint.
- The Auth adapter deliberately returns a refreshed token for the revoked provider session ID; the actual app guard refuses it with 401.
- A new normal local sign-in creates a different session and works, while the old history row remains Ended.

The passing trace and four screenshots are in `evidence/`. The denied-request capture shows an actual rendered application error, not an invented success screen. Runner: `scripts/tests/selected-session-sprint5.browser.ts`, using a Vitest config that includes it, Playwright and the installed Chrome executable. Production application code is unchanged from the clean build verified for PR #1387; existing selected-session SQL/API checks remain applicable.

## Limits

The production Next UI/API and real disposable PostgreSQL execute. Supabase provider authentication and token issuance are adapters, so this is local-only acceptance, not a claim of current hosted provider, cross-device or Vercel production behavior. The user explicitly declined hosted tests. No shared account, database, provider session or migration was changed. Existing hosted WebSocket evidence for defect #1228 remains historical and was not rerun.

SRS-107.9 has separate caller-preservation feedback/verification work. No peer approval, historical task movement or hosted test is fabricated. The SRS branch, original merged implementation and these new checks provide the trace from UR-107 through the database/API/UI and verification layers.
