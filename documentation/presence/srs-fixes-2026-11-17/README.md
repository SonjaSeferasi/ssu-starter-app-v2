# SRS-630.1–630.4 — Friends playing now

Owner: Sonja Seferasi (SS). Source: `documentation/SocialU_SRS_Editable.md`, UR-630. Original checkout: `C:\Csc 351\ssu-starter-app-v2`; existing branch: `sonja/game-room-change-descriptions`.

GitHub record: [#1312](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1312), assigned to SonjaSeferasi, SocialU Product Backlog, open. Detailed requirement mapping, implementation and test limitations are published. Three actual local QA screenshots are attached: friends-playing, visibility-failure, and friends-dark. `github-record.jpg` captures the initial record before publication. The latest issue comment records the published commit and immutable evidence links.

This publication contains only SRS-630 presence code, its integration, tests and evidence. Earlier pending appearance, calendar and unrelated World Explorer changes are excluded and preserved locally. No merge or hosted deployment is included; the new migration still needs to be applied to the intended database.

## Requirement mapping

| Requirement | Implementation |
| --- | --- |
| 630.1 | Game Room lists accepted friends' names and their current Game Room/Jumpyland/DormSpace/World Explorer location. Profile links use encoded usernames. Empty, loading, failure and retry states are explicit. No invented friends. |
| 630.2 | Each server read rechecks accepted friendship, both directions of blocking, active account and verification status. Identity comes from the verified session, never a client-supplied student id. |
| 630.3 | Account-level Show me as online setting. Privacy-preserving default off; the requirement does not prescribe the default. Turning off deletes all that account's presence sessions. Later heartbeats cannot republish while hidden. Save confirmation is required before changing the switch; failed writes offer Retry. |
| 630.4 | Heartbeat every 30 seconds, server expiry after 60 seconds, list refresh every 15 seconds, and independent client expiry each second. Leaving sends best-effort authenticated cleanup. Stale data clears on refresh failure. Multiple tabs are deduplicated and closing one only removes its own session. |

Browser suspension, network loss and abrupt termination can prevent cleanup requests. Expiry uses server time and does not depend on successful cleanup; foreground refresh reconciles blocked/removed/hidden friends. An already-rendered list can retain a changed friendship/privacy state until its next refresh (normally 15 seconds). Background timers can be throttled. Hosted 90-second acceptance still requires real-account verification.

## Files

- `supabase/migrations/20261117090000_game_friend_presence.sql`: separate account preference and ephemeral session tables, RLS, service-only RPC, own-account serialization, server timestamp, accepted-friend/block filters, bounded 32 active sessions per account. Read returns only username, display name, current location and expiry; no game history or email. Expired rows are ignored; old rows are pruned when their owner next calls the RPC.
- `app/api/game-room/presence/route.ts`: authenticated no-store GET, visibility PUT, heartbeat POST and leave DELETE. Validates UUID, boolean and supported location. Revoked/unverified sessions rejected. Missing migration/storage failures are explicit.
- `lib/game-presence.ts`: shared location types, labels, route scope and response validation. Preview/developer pages, art credits and unimplemented Wordle do not publish presence.
- `components/game-room/friend-presence.tsx` and CSS: publisher and responsive accessible panel; cancellation, account reset, save/read race protection, cross-tab refresh signals and server-relative expiry independent of local clock skew.
- `components/navigation/social-shell.tsx`: publisher outside navigation so standalone games are covered.
- `components/game-room/game-room.tsx`: panel only for the real signed-in room, not preview.

## Verification

84 tests passed in 5 files: 18 new PostgreSQL presence tests, 23 new API tests, 14 route/validation tests, 28 existing friends API tests and 1 comprehensive existing friendship database test. PGlite executes the actual schema, prerequisites and new migration with disposable synthetic users. Checks cover accepted/pending/stranger/block relationships, account hiding and fresh reads, inactive/reverification accounts, expiry, ownership, multi-tab cleanup, session cap, invalid arguments and role privileges. The schema's existing block trigger ends friendships; the test explicitly re-accepts after unblocking to avoid false empty-list assertions.

Command: `npx vitest run __tests__/database/game-friend-presence.test.ts __tests__/api/game-friend-presence.test.ts __tests__/game-presence.test.ts __tests__/database/friendships.test.ts __tests__/api/friends.test.ts`.

Focused TypeScript check: 0 diagnostics for the new implementation, tests and transitive imports (`typecheck.txt`). This is not a full-project build or full test-suite claim.

Final browser result: 10 checks passed with zero uncaught page errors. Desktop, failure and mobile dark captures were visually reviewed. The unrelated weekly calendar fixture was supplied with all seven days so the final evidence does not show an artificial calendar error.

Browser runner: `scripts/tests/friend-presence.browser.cjs`. See `results.json` for final checks and synthetic request evidence. Actual local Next application in headless Microsoft Edge with intercepted API fixtures. Screenshots are actual rendered app captures with QA fixture names; they do not prove hosted two-account behavior. The tests check display, saving/reload, failure/retry, account switch, expiry without another fetch, stale-list clearing, 390px/dark appearance, route cleanup and standalone-game publication. Initial attempts corrected test waits for server-confirmed checkboxes, used app navigation to observe cleanup (unload keepalive can bypass interception), and allowed time for World Explorer compilation. The local server uses dummy credentials and no hosted writes.

The original browser run and screenshots include other pending local appearance and calendar work in the surrounding page; those features are not included in the presence commit. The presence component and publisher integration are unchanged. The publication check separately validates the exact staged source and dependencies so it cannot depend on those excluded files. Test and evidence files are included in the commit; prior failed-attempt `failure.png` is excluded.

Publication verification on November 17: reran the same 84 tests in 5 files successfully (8.22 seconds); full machine-readable results are in `publication-tests.json`. `publication-typecheck.txt` reports 0 diagnostics with the exact staged shared integration files and with all untracked dependencies hidden. Existing browser evidence is retained from the completed 10-check run; it was not rerun for this publication-only step. The staged whitespace check passed. No full-project build or hosted acceptance is claimed.

## Acceptance still pending

- Apply the migration after existing account/friendship prerequisites to the intended database.
- With two verified accepted-friend accounts, enable presence, open each real game, verify the other account's Game Room, hide/show, sign out/in, and check account persistence.
- Check both block directions, pending/non-friends, removed friendship, and two simultaneously open game tabs.
- Close the final SocialU tab without relying on cleanup. Confirm the other account removes it within 90 seconds on refresh, including reconnect/focus behavior.
- Confirm keyboard/screen-reader and physical-device behavior. Keep the issue open until these deployment/acceptance checks are evidenced.
