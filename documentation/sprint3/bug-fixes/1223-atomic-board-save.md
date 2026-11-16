# Bug #1223 — Save My Board without overwriting a newer profile change

Owner: Linh Nguyen / Dieulinhh23. Severity: Major.
Requirement: SRS-124.1, parent #1038; API task #1040; verification task #1042.
Branch: `srs-124.1-fix-1223-atomic-board-save`, created before this fix's code edits.

## Explanation for class

“The board save used to copy my entire profile, add the board, and save that
copy. If another tab changed my hometown after the copy was taken, saving the
board brought back the old hometown. I moved the merge into a database
transaction. It locks my profile row, reads the latest version, changes only
the board, and saves it before releasing the lock. I checked that newer
hometown, theme, and sticker values survive the board save.”

Example: hometown starts as Original. A profile save changes it to New before
the board writes. Before the fix, the board save could restore Original.
After the fix, New and the new board both remain.

## Implementation

- API keeps the existing board validation, authenticated user check, and fresh
  read confirming the saved board. It sends only the board to the new RPC.
- `20261116210000_atomic_profile_board_save.sql` adds a service-role-only RPC.
  It resolves the student from the verified auth identity, creates a default
  profile-space row if absent, locks that row, and merges the board into its
  latest JSON. It reuses existing profile-look validation and save behavior.
- There is no screen redesign for this data-persistence defect.
- Apply the migration before deploying the API. Without it, saves fail safely
  with the existing preview/setup response rather than using the unsafe path.

## Verified evidence

On November 16, 2026:

`npx vitest run __tests__/api/profile-space.test.ts __tests__/database/profile-board-atomic-save.test.ts`

Result: **39 tests passed in 2 files**.

`npm run build` also passed. The complete `npm test` run finished with
2,916 passed and 5 failed tests in 227 files (223 passed / 4 failed files).
The failures were in World Explorer: design-tier distribution, FJI and VUT
patrol assertions, the Oceania audit baseline, and Saudi gate/plate ordering.
Those are outside this patch's files; no unchanged-baseline rerun is claimed.

PR: https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1257

## Running-application evidence

The fix branch was updated with main (`6c9afe0`) without conflicts. Its
production build and TypeScript check passed. An additional browser regression
runs that Next production app and its actual API routes against disposable
PGlite, with the actual profile migrations and new board-save migration.
Only the Supabase Auth/PostgREST transport is replaced with a local fixture.
Final screenshots were regenerated from a clean `git archive` of commit
`2c5271c25640b400a7ce87a42bf7aaa9577cc96f` and its successful production
build, excluding all uncommitted workspace edits. That browser run passed.
Final browser run: **1 test passed**. The 39 focused API/database tests also
passed again after the migration was renamed to sort after current main's
existing migrations.

The browser edits the board and clicks Save board. The transport holds its
board RPC before execution while a second browser tab commits New Salem,
the supported Midnight theme, and a cover star through the actual API. It then
releases the RPC and checks its successful response and a fresh page load.

| Value | Before | After competing save and board save | After reload |
| --- | --- | --- | --- |
| Hometown | Original | New Salem | New Salem |
| Theme | Default | midnight | midnight |
| Cover stickers | None | new-star | new-star |
| Board note | None | New note | Same new note |

- [Draft in the actual editor](1223-evidence/01-board-draft.png)
- [Successful save](1223-evidence/02-save-confirmed.png)
- [Board after a fresh reload](1223-evidence/03-after-reload.png)
- [Hometown after the fresh reload](1223-evidence/04-hometown-after-reload.png)
- [Executed request order and confirmed values](1223-evidence/request-order.json)
- Reproducible test: `scripts/tests/profile-board-atomic.browser.ts`

Run `npx vitest run --config vitest.board-evidence.config.ts` with
`SOCIALU_PLAYWRIGHT_MODULE` pointing to an installed Playwright module and
`BOARD_BROWSER_EXECUTABLE` pointing to Chrome. Set `BOARD_EVIDENCE_DIR` to
choose the screenshot directory. Run `npm run build` first. The test runs
only on loopback and never uses the hosted credentials from `.env.local`.

These screenshots show the running application, not a mockup. They use a
disposable fixture student and are **local integration evidence**, not proof
of hosted deployment. The request-order log proves the controlled race's
ordering; a screenshot by itself cannot establish it.

The API tests cover a competing profile change before the atomic write,
JSONB key-order differences, dropped writes, invalid input, and a missing RPC.
The PostgreSQL-compatible PGlite test executes the actual migration and RPC,
preserves hometown/theme/stickers, covers first-save creation, owner isolation,
restricted execution permissions, and migration reapplication.

These checks are controlled fixtures. PGlite executes one connection; this is
not proof of a live two-connection lock wait or a hosted deployment test.

## Hosted migration verification — November 16, 2026

After the user signed into Supabase, the dashboard confirmed the SocialU
production project `sfrpokisjlwgknxlzllu`, linked to this repository. The exact
reviewed migration was applied through SQL Editor before API deployment, with
a PostgREST schema-cache refresh. SQL Editor returned **Success. No rows returned**.
This installs the function; it does not update students' saved board rows.

Read-only PostgreSQL metadata checks returned:

| Check | Result |
| --- | --- |
| service_role_can_execute | true |
| anon_can_execute | false |
| authenticated_can_execute | false |
| security_definer | true |
| locks_latest_row | true |
| merges_latest_board | true |

An additional read-only checksum comparison confirmed the installed function
body exactly matches the migration (`MD5 8c44a20f763635c69cf10ef30babc346`).

The independent hosted API probe changed from HTTP 404 / `PGRST202` (function
missing) to HTTP 403 / `42501` (verified, active university account required).
The probe used a nonexistent identity, so no account data was changed.
[Hosted verification record](1223-evidence/hosted-migration-verification.json).

The screenshot and request-order evidence is attached to bug #1223 and parent
#1038. Final merge/deployment status is tracked in [PR #1257](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1257)
and its linked issue comments. Closing this bug does not complete the entire
SRS or existing tasks #1040/#1042. The browser race was verified locally; the
hosted checks establish migration installation and permissions, not a live
two-account production race.

Scope: this fixes the board request overwriting a profile change committed
before its database write. Full-profile PUT remains a full-profile replacement;
this change does not add conflict resolution for every profile editor.
