# Sonja main integration — November 17, 2026

The user requested merging the published fixes into main. The original checkout and existing branch were used; no extra repository or worktree was created.

## Integration

- Published feature head: `ab49d6b319e23a074b157cb9d240dfc7716241b9`.
- Incoming main: `0f8b028fdbea3cffb5a789177e90b2c5e200c932` (73 main-only commits).
- Integration merge: `7bf7260030e4f9cd99b923d2d3fdc316c9b05b11`. Git merged both histories without conflicts, including World Explorer's level-complete changes with the participation/reward UI. Team changes are retained.
- Navigation SRS-601/603/604, avatar SRS-608/609, appearance SRS-627, participation/calendar/reminders, and presence SRS-630 are included. References: #1301, #1309, #1333, #923, #1310, #1179, #1311 and #1312. Prior #1320/#1321 recovery commits remain in history; no new Jumpyland development was performed.
- Local unpublished country additions and SRS edits were preserved before integration, separately from the published branch. Incoming files that overlapped local untracked files were backed up first. These unfinished local changes are not silently included in main.

## Validation of the integrated tree

- **293 tests passed in 28 files**, 30.39 seconds. All tests changed by the feature branch, plus World Explorer avatar, progress, account progress, level-complete, API progress and database progress. Includes real in-memory database checks and synthetic API/client cases; no hosted account data was changed by these tests. Raw result: `tests.json`.
- **0 TypeScript diagnostics** for 868 tracked app/components/lib source roots and their transitive dependencies. Untracked files were hidden from this check; installed dependencies and next-env.d.ts remained available. See `typecheck.txt`.
- `git diff --check origin/main...HEAD` passed.
- Earlier batch: 16 responsive navigation layouts and 9 presence browser checks passed. They were not rerun merely for this merge. Prior signed-in appearance/streak and presence/World Explorer startup evidence remains in the referenced feature folders.

## Broader test limits

The initial full-suite attempt failed when its compiler service stopped. A broader 91-file country/feature run stalled and was stopped; neither attempt is represented as a passed suite. The final bounded 28-file run completed successfully.

A separate retest of chat-live-counts and Snipe pagination completed with 10 passes and 5 failures. Four realtime tests use a token without the session identifier now required by the existing realtime implementation; the Snipe test's source-section lookup fails. Their failing realtime source, test fixtures and Snipe helper/migration files are unchanged from main. These are recorded in `existing-test-failures.json`, not hidden or claimed fixed. The message-notification-store cases in that retest passed; Sonja's unread-message-count tests also passed in the final run.

No full production build, full-suite success or deployed-app acceptance is claimed by these results. The existing local workspace contains extensive temporary/generated files, which were not used as source for the TypeScript check.

## Publication and remaining acceptance

The integration uses normal Git publication. A GitHub PR could not be created through the connector (insufficient integration permission), and the large browser comparison form repeatedly stopped responding. A separate stored-credential API approach was rejected by automatic approval review and was not executed. No PR or PR merge number is fabricated; the repository merge commit and test evidence provide the actual integration record.

Keep hosted two-account presence, physical-device/screen-reader checks, real World Explorer completion/retry and new-day/reward acceptance open until demonstrated. Merging alone does not authorize marking those checks Done or counting them as verified fixes in the five-step report.
