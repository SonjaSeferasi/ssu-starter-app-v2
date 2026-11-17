# Weekly participation and reminders — November 17, 2026

Owner: Sonja Seferasi. Original checkout: `C:\Csc 351\ssu-starter-app-v2`. Existing branch: `sonja/game-room-change-descriptions`.
Status: publication checks completed; see the publication follow-up below. Acceptance remains open.

GitHub: [SRS implementation/evidence record #1311](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1311), assigned to SonjaSeferasi in SocialU Product Backlog. The issue includes requirement mapping, code details, test results and outstanding acceptance. `github-record.jpg` confirms publication of the text record; local code and application screenshots have not been pushed/uploaded by this batch.

## Requirements

| SRS | Behavior |
| --- | --- |
| 612.4 | Game Room shows Sunday through Saturday, dates, today's marker, distinct symbols and an expandable text legend. States: Played, Forgiven Miss, Miss That Reset the Streak, No Active Streak, Today—Not Yet Qualified, Upcoming. |
| 614.1 | Non-game shared pages show an inline flame reminder only for an active streak with zero allowance, no qualification today and no dismissal today. It states the saved-zone midnight deadline. |
| 614.2 | Suppressed for Jumpyland/Game 1, Wordle routes, World Explorer, DormSpace and their included subroutes. Wordle remains conditional/unimplemented; only its route predicate was tested. |
| 614.3 | Dismiss closes the reminder immediately without playing or replacing current page content. Failed persistence explains that it may return after refresh and offers Retry. |
| 614.4 | Participation-change/points events, navigation, focus and periodic refresh obtain new status; a qualified day suppresses the reminder. |
| 614.5 | Dismissal is stored by verified account and participation date. It survives subsequent reads/sign-in; another account/day does not inherit it. Old-day dismissal requests cannot dismiss the new day. |

## Data and implementation

`supabase/migrations/20261117080000_participation_calendar_reminders.sql` adds service-only `socialu_participation_calendar(UUID, DATE)` and reuses existing participation_settings, participation_days, streak_instances and reminder_dismissals tables. It requires the existing `20261117030000_game_participation_streaks.sql` migration and account integration.

The function obtains the same student lock used by participation writers, evaluates elapsed days using the existing settlement function, captures the current instant after the lock, and calculates the Sunday-Saturday window and next midnight in the account's saved time zone. New accounts do not establish a time zone on reads. Before a zone exists, the week uses the existing New York fallback and the UI explains that the zone is set by first participation. The function does not record played activity or grant rewards. It can settle overdue forgiven/reset days, as required by SRS-613.12. Anonymous/authenticated direct execution is revoked; the server service-role bridge is permitted.

`app/api/game-participation/calendar/route.ts` exposes authenticated no-store GET and PUT. Identity comes from verified user/session, never submitted account IDs. PUT validates a real ISO calendar date and passes the displayed day; stale dates return 409. Missing migration returns explicit 503 setup guidance.

`lib/participation-calendar.ts` defines the six labels, response contract, game-route suppression and reminder eligibility. `components/game-room/use-participation-calendar.ts` handles requests, account-change cancellation, retries, focus/navigation/participation refresh and server-relative midnight scheduling (at most 30 seconds between checks). A background tab may be throttled by the browser; focus triggers another read.

`components/game-room/participation-week.tsx` and its CSS render the accessible row and legend; `participation-streak.tsx` receives only its import/render integration, preserving the previously pending reward and celebration work. `components/navigation/participation-reminder.tsx` and its CSS implement the inline reminder, immediate close, server dismissal, failure retry and account/day separation. `social-shell.tsx` connects it inside the signed-in shared frame. Prior appearance changes and unrelated pending files are preserved.

## Test evidence

**41 tests passed in six files** (`unit-tests.txt`):

```
npx vitest run __tests__/database/participation-calendar.test.ts __tests__/api/participation-calendar.test.ts __tests__/participation-reminder.test.ts __tests__/database/game-participation-streaks.test.ts __tests__/api/game-participation.test.ts __tests__/game-participation-client.test.ts
```

The actual migration is applied to disposable PGlite. A test-only clock substitution permits deterministic date-boundary checks; the production function accepts no caller-controlled clock. Checks cover the seven dates and all six states; chronological forgiveness/reset; no new played events or reward duplication from reads; dismissal persistence/idempotency/account separation; old/new-day rejection; qualification suppression; Sunday allowance renewal; New York's 23-hour spring-forward day; saved-zone midnight; service-only permissions; authenticated ownership and API failure paths.

**12 local Edge workflow checks passed, zero uncaught page errors** (`results.json`). Runner: `scripts/tests/participation-calendar.browser.cjs`. It checks the reminder deadline, retained draft, weekly state labels, dismissal across navigation/reload/simulated sign-in, account switch, failed dismissal Retry, post-qualification suppression, no reminder with allowance/zero streak, game-route suppression, new-day reminder, failed calendar Retry and the 390px row layout. DormSpace's fixture deliberately stops at an unavailable hall; that check proves reminder suppression on the route, not a successful gameplay session. Wordle and World Explorer route coverage is unit-level, not a live game acceptance claim.

An initial browser run waited for the wrong DormSpace error text. Inspection showed its unavailable-hall screen; the test was corrected to wait for the actual route heading, with no DormSpace code change. Final run passed.

**Focused TypeScript check: 0 diagnostics**, recorded in `typecheck.txt`. Scope: calendar API, weekly component, reminder and shared shell dependency graph. No full-repository build/test-suite result is claimed.

## Actual local screenshots

- `at-risk-reminder.png`: flame reminder and unfinished feed draft.
- `weekly-states.png`: real Game Room, seven-day row and expanded legend.
- `dismissal-failure.png`: intentionally failed fixture save and Retry.
- `weekly-mobile.png`: seven-day row at 390px.

These show real local UI with intercepted API fixtures, synthetic accounts and January 2025 participation dates. They are not hosted-account evidence or proof of real rewards. Screenshots were visually inspected. The local test server was stopped afterward.

## Still required for completion

1. Review and publish the intended changes on the existing branch, preserving earlier pending work; link the commit/PR and immutable evidence in GitHub.
2. Apply the participation prerequisites and new calendar migration to the intended hosted project. Local file existence and tests do not establish installation.
3. Verify with real signed-in accounts: active risk state, server dismissal, reload, sign-out/return, actual saved-zone midnight, participation qualification and another device/account.
4. Complete supported-device and screen-reader checks and test every available game's suppression in a normal deployed session.

Keep the SRS record open until deployment and acceptance are evidenced. This batch does not change qualification rules, add Wordle, finish friend presence (630.1–630.4), or claim all Sonja SRS are complete.

## Publication follow-up — November 17

- 41 focused tests passed again (`publication-unit-tests.json`); an additional forward-upgrade database test passed (`reward-upgrade-tests.json`): **42 tests total**.
- **15 Edge checks passed**, no page errors (`publication/results.json`), including three added flame/reward checks. Actual server-reported 10 or historical 5 points are displayed; zero/missing points suppress celebration. Mobile flame and weekly-row screenshots visually inspected. Fixtures use synthetic accounts/dates, not hosted reward issuance.
- Presence heartbeat requests are recorded separately in the browser runner; other unexpected writes still fail the check.
- This publication also includes the previously pending 10-point daily rule, confirmed `earnedPointsToday`, idempotent recovery for an already-played day missing a reward, flame celebration and World Explorer reward error/Retry/result display. Only participation hunks of `country-run.tsx` are staged; unrelated scenery and level-completion edits remain local.
- Added `20261117150000_daily_participation_reward_update.sql` for existing databases. It preserves historical ledger entries, can run twice, grants no rewards during migration, and retains service-only permissions. The original installation migration also uses 10 points.
- Live Supabase already had the 10-point rule and the complete reward function. Its visible function body matches the local body after removing comments and whitespace; no replacement was necessary. The appearance and calendar functions were absent and were installed through the signed-in SQL editor. Final permission and signed-in checks are recorded on GitHub.
- No main merge or production web deployment is claimed. Physical second-device, rollover across real days, hosted at-risk dismissal, and full game completion acceptance remain separate from fixture evidence.

- Final indexed publication TypeScript: **0 diagnostics** (publication-typecheck.txt), including World Explorer's published dependency graph. The initial check caught a missing result type in the new upgrade test; its type annotation was corrected. Hosted function permissions are captured in hosted-function-permissions.jpg: all three functions allow service_role and block anon/authenticated direct execution.
