# Bug #1224 — Keep Rotate within the board's valid range

Owner: Linh Nguyen / Dieulinhh23. Severity: Minor.
Requirement: SRS-124.1 (#1038); editor task #1041; verification task #1042.
Branch: `srs-124.1-fix-1224-board-rotation`, created from main before this fix's edits.

## What to say in class

“The Rotate button checked the current angle before adding three degrees.
Starting at eight degrees, three clicks produced 11, 14, then 17. But saving
only allows angles from minus 15 to plus 15, so an ordinary button click made
the board invalid. I capped the next angle at 15. The same clicks now produce
11, 14, then 15; the next click wraps to minus 15. I verified that the rotated
star saves and returns at the same angle after reloading.”

## Code change

The change is in `components/profile/profile-board.tsx`, in the Rotate handler:

```ts
// Before
rotation: item.rotation >= 15 ? -15 : item.rotation + 3
// After
rotation: item.rotation >= 15 ? -15 : Math.min(15, item.rotation + 3)
```

The existing validator still enforces the same -15 to 15 range. This UI fix
reuses the existing authenticated save API and database persistence from
#1223. No database migration or schema change is needed.

## Actual before/after verification — November 16, 2026

| Check | Before fix | After fix |
| --- | --- | --- |
| Starter star after three Rotate clicks | 8 → 11 → 14 → 17 | 8 → 11 → 14 → 15 |
| Save board | “Keep board items within the canvas.” | HTTP 200 and saved confirmation |
| Star after fresh reload | Invalid draft could not save | Saved star returns at 15° |

The browser regression failed on the clean pre-fix production build with
`[8, 11, 14, 17]`, as expected. It then passed on the clean fixed production
build. It uses the actual starter-layout button, star selection, Rotate,
Save board and reload, rather than duplicating the rotation implementation.

It also checks 120 Rotate clicks across ten starting values: all seven
starter-layout angles (-3, 8, -4, -8, -5, 4, -2), both limits (-15 and 15),
and 14.5 degrees. Each observed angle passes the actual board validator.
Each sequence is saved through the real API and checked again after reload.

Validation:

- Production build and TypeScript check passed on the clean fixed source.
- 50 focused board/API/database tests passed.
- Both browser regressions passed: #1223 overlapping-save preservation and
  #1224 rotation/save/reload.

The clean fixed source was a `git archive` of main plus only this fix's
component and browser-test changes. The evidence trace records the base
commit and SHA-256 hashes of those files. Unrelated local edits are excluded.

## Evidence

- [Before: actual save validation error](1224-evidence/before-save-error.png)
- [Before: observed 17° sequence and error](1224-evidence/before-rotation-trace.json)
- [After: valid rotated star in editor](1224-evidence/01-valid-rotation.png)
- [After: successful save](1224-evidence/02-save-confirmed.png)
- [After: star restored after reload](1224-evidence/03-rotation-after-reload.png)
- [Actual angle sequences, saved values and source hashes](1224-evidence/rotation-trace.json)

These screenshots show the actual local Next production application and
API with real SQL/migrations on disposable PGlite. Only Supabase's
Auth/PostgREST transport is replaced with a loopback fixture. No hosted
account data was edited. This is local end-to-end evidence, not a claim of
a production-account browser test.

## Reproduce the checks

```sh
npx vitest run __tests__/profile-board.test.ts __tests__/api/profile-space.test.ts __tests__/database/profile-board-atomic-save.test.ts
npm run build
npx vitest run --config vitest.board-evidence.config.ts
```

For the browser run, set `SOCIALU_PLAYWRIGHT_MODULE` to an installed Playwright
module, `BOARD_BROWSER_EXECUTABLE` to Chrome, `BOARD_EVIDENCE_DIR` to a separate
#1223 regression-output folder, and `BOARD_ROTATION_EVIDENCE_DIR` to the
desired #1224 screenshot directory. Test implementation:
`scripts/tests/profile-board-atomic.browser.ts`.

PR, merge and deployment results are linked in the final comments on bug
#1224 and parent #1038. Completing this bug does not complete the whole SRS
or tasks #1041/#1042. The next requested bug remains separate.
