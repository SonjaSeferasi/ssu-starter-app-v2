# Bug #1225 — Warn before browser history discards a board draft

Owner: Linh Nguyen / Dieulinhh23. Severity: Major.
Requirement: SRS-124.1 (#1038); editor task #1041; verification task #1042.
Branch: `srs-124.1-fix-1225-board-history-warning`, created from main before editing.

## What to say in class

“The board warned when I clicked a link or closed the page, but browser Back
uses a different navigation event. It could remove the editor and lose my
draft without asking. I added a warning for Back and Forward that runs before
the router removes the editor. Stay keeps the exact draft. Leave without
saving continues the requested navigation. I checked repeated Stay actions,
confirmed departure, and saving the retained draft.”

## Implementation

- The root layout initializes the history tracker before Next's router starts,
  using its documented `beforeInteractive` Script strategy. Startup ordering
  matters: a later Window listener cannot stop an earlier router listener
  that already removed the board.
- The tracker adds a namespaced index to history entries and preserves their
  existing router metadata. It adds no extra entries. On a guarded traversal,
  it restores the current history entry before displaying the warning.
- The board registers a guard only while it is mounted. Its current dirty
  state decides whether a warning is needed. Stay keeps the editor mounted;
  Leave replays the requested history traversal once.
- The existing confirmation dialog gains an optional cancel-button label,
  allowing this warning to say Stay. Other uses retain the default Cancel.
- Existing link-click, profile-tab and unload guards remain in place. Clean
  navigation and navigation after saving continue without a draft warning.
- The authenticated save API, database storage and schema are reused.
  No migration is required.

The bootstrap and board share one tracker stored on the current Window. The
same self-contained factory supplies the early script and the tested logic.
The [Next 14 Script reference](https://nextjs.org/docs/14/app/api-reference/components/script#beforeinteractive)
documents its startup timing and placement in the root layout.

## Actual verification — November 16, 2026

The clean pre-fix production app reproduced the bug: Back opened Campus Feed
without the warning; Forward returned to an empty board. The regression failed
as expected and recorded zero occurrences of the discarded draft after return.

The fixed clean production app passed these checks:

| Action | Verified result |
| --- | --- |
| Back with unsaved note | Warning appears; profile/editor remain mounted |
| Choose Stay | Exact unsaved text remains |
| Forward with unsaved note | Same warning and draft preservation |
| Repeat Back / Stay | Works again; history length remains unchanged |
| Cancel a profile-tab change | Existing warning retains draft |
| Cancel a clicked navigation link | Existing warning retains draft |
| Confirm Leave without saving | Reaches Campus Feed; saved database board remains empty |
| Forward after confirmed discard | Returns normally; discarded draft is absent |
| Stay, then Save board | HTTP 200 and successful-save confirmation |
| Back after saving | Normal navigation without warning |
| Forward to the saved board | Saved note is restored |

Validation: production build and TypeScript validation passed; **54 focused
tests passed** (four history/bootstrap tests plus existing board/API/database
checks); **all three actual-app browser regressions passed**, including #1223
overlapping saves and #1224 rotation persistence.

The fixed source is a clean main archive plus only this bug's source changes.
The trace records the base commit and SHA-256 hashes of the exact tested files,
excluding unrelated local edits. Temporary investigation diagnostics were
removed before the final build and verification.

## Evidence

- [Before: lost draft after Back and Forward](1225-evidence/before-lost-draft.png)
- [Before: failed regression and lost-draft observation](1225-evidence/before-history-trace.json)
- [Back warning](1225-evidence/01-back-warning.png)
- [Forward warning](1225-evidence/02-forward-warning.png)
- [Stay preserves the draft](1225-evidence/03-stay-retains-draft.png)
- [Confirmed discard](1225-evidence/04-confirmed-discard.png)
- [Retained draft saved and restored](1225-evidence/05-saved-draft-restored.png)
- [Executed navigation/save trace and source hashes](1225-evidence/history-trace.json)

Screenshots show the actual local Next production UI/API and real SQL on a
disposable PGlite database. Supabase Auth/PostgREST transport is replaced by a
loopback fixture. No hosted account data was edited, and no production-account
browser test is claimed. The baseline and fixed traces distinguish the
expected pre-fix failure from the final passing verification.

## Repeat the checks

```sh
npx vitest run __tests__/board-history-guard.test.ts __tests__/profile-board.test.ts __tests__/api/profile-space.test.ts __tests__/database/profile-board-atomic-save.test.ts
npm run build
npx vitest run --config vitest.board-evidence.config.ts
```

For browser verification, set `SOCIALU_PLAYWRIGHT_MODULE` to Playwright,
`BOARD_BROWSER_EXECUTABLE` to Chrome, `BOARD_HISTORY_EVIDENCE_DIR` to the #1225
output directory, and `BOARD_EVIDENCE_DIR` / `BOARD_ROTATION_EVIDENCE_DIR` to
separate #1223/#1224 regression-output folders. The actual-app cases are in
`scripts/tests/profile-board-atomic.browser.ts`.

PR, merge and deployment results are linked in final comments on bug #1225
and parent #1038. Completing this defect does not complete the entire SRS or
tasks #1041/#1042. The separate repository migration-history mismatch noted
in #1223 is outside this browser-navigation fix.
