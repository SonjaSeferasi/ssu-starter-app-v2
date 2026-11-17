# Sonja submission readiness — November 17, 2026

Scope: Sonja's navigation, Game Room, appearance, streak and World Explorer integration. Jumpyland is no longer under active development. This is a readiness record, not a claim that every SRS or the entire team project is complete.

## Work now evidenced

| Area | Evidence and status |
| --- | --- |
| Navigation Top/Bottom spacing and Create access — SRS-601.3, 604.1–604.3 | Fixed locally and covered by 16 responsive Edge checks; see `navigation/submission-2026-11-17/README.md` and #1333 |
| Friends playing — SRS-630.1–630.4 | Published migration now installed with security verified; 84 tests and 9 browser checks; signed-in missing-migration error resolved. See `presence/submission-2026-11-17/README.md` and #1312 |
| Appearance/backgrounds | Previously published work and signed-in save/reload evidence: #923/#1310; original Light and Campus Day settings restored |
| Shared daily streak and calendar | Previously published work and existing real-account reward/calendar evidence: #1179/#1311; see `participation/srs-fixes-2026-11-17/live-verification.md` |
| World Explorer saved avatar/startup | Signed-in Japan level loaded with saved Cream knit avatar. Navigation/Explorer regression run: 78 tests passed. No new level completion or reward was manufactured |

The two follow-up findings in the earlier live verification record (missing presence migration and overlapping Top navigation) are addressed by this batch. Historical records are retained as evidence of what was observed then.

## Remaining release/acceptance gates

1. Integrate the branch with current main through a reviewed PR, resolve any conflicts, and verify the integrated build/deployed application. At this check, main had 73 commits absent from this branch; branch-only fixes must not be described as already deployed.
2. Finish the hosted two-account presence checks. No second test account was available; synthetic tests are clearly labeled.
3. Complete a real World Explorer level and verify confirmed passport/progress saving, reward idempotency, and failure/retry behavior. Current live evidence covers startup/avatar and reading an existing daily reward.
4. Verify physical-device/screen-reader behavior and the time-dependent streak cases that fixtures cannot prove live (new day, at-risk reminder, rollover).
5. Reconcile the SRS with the approved game scope. The user chose three hearts instead of SRS-620.1's immediate termination and subsequently stopped Jumpyland development. Do not silently claim that obsolete requirement is fulfilled or transfer every Jumpyland requirement to World Explorer.

## Before rerunning the five steps

- Use the current GitHub issue state, not the November 12 baseline. Preserve the original baseline for before/after comparison.
- Close only verified completed issues as completed. Duplicate/form-test/not-a-bug closures remain not planned and are not credited as fixes. Fill assignee, severity and SRS from evidence, not guesses.
- Step 1: export the refreshed issue report, open and closed, with author, assignee, close reason, dates, severity and SRS.
- Step 2: reconcile totals, check five issues against GitHub, and review missing fields and duplicates.
- Step 3: calculate daily found/closed totals, per-member filed/fixed counts, SRS clusters and defects per KLOC using a documented source-only count. The earlier 85,169-line count is not automatically a current or author-attributed result.
- Step 4: verify the last cumulative row, per-person sums and SRS sums; trace one person's numbers to exact issues; inspect LOC exclusions.
- Step 5: render charts from those exact checked tables, with readable labels and zero-based numerical axes. Put the supporting tables under the charts in the submission slides.

The assignment additionally requires merged PR links, SRS/card/task traceability, screenshots for demonstrated requirements, and an integrated running demo. Team reporting includes defects filed against the other team as well; repository-only data may not cover that. The existing branch name does not meet the rubric's SRS-named-branch convention retrospectively; do not invent historical compliance. Confirm the Canvas links to the board, SRS, merged PRs and team metrics slides before submitting.
