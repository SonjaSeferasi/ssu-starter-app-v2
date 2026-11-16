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
- `20261116000100_atomic_profile_board_save.sql` adds a service-role-only RPC.
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

Draft PR: https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1257

The API tests cover a competing profile change before the atomic write,
JSONB key-order differences, dropped writes, invalid input, and a missing RPC.
The PostgreSQL-compatible PGlite test executes the actual migration and RPC,
preserves hometown/theme/stickers, covers first-save creation, owner isolation,
restricted execution permissions, and migration reapplication.

These checks are controlled fixtures. PGlite executes one connection; this is
not proof of a live two-connection lock wait or a hosted deployment test.

## Remaining acceptance / evidence

- Review the PR and apply the migration in the intended database environment.
- With a disposable signed-in account, pause a board-save request before its
  database call; commit a hometown change from a second tab; resume the save.
  Reload and confirm both values remain. Repeat for theme/decorations.
- Capture the actual running profile after reload and the relevant API results.
  A screenshot alone does not prove the race; retain the request order too.
- Link the final PR and screenshot to #1223 and parent #1038. Keep them open
  while their acceptance remains incomplete. Do not close the whole SRS or
  existing tasks merely because this individual bug is addressed.

Browser evidence could not be captured in this session: browser-act's command
daemon returned an empty response, and the fallback UI runtime failed to start.
No screenshot or production acceptance is claimed.

Scope: this fixes the board request overwriting a profile change committed
before its database write. Full-profile PUT remains a full-profile replacement;
this change does not add conflict resolution for every profile editor.
