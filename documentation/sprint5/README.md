# Sprint 5 QA evidence and metrics

Darrin Phimphisane (DP), 17 November 2026. AI-assisted preparation, checking,
implementation and browser acceptance. Student/team review and demo attendance
remain required; this record does not attest that students performed the checks.

## Required links

- [SocialU Project board](https://github.com/users/SonjaSeferasi/projects/2)
- [Shared team QA metrics slides](https://docs.google.com/presentation/d/1j0uLENXXGliVutBaazKIXuCrhAOD7CViYrTLshMHFYk/edit)
- [Formula-backed chart data and defect audit](https://docs.google.com/spreadsheets/d/1xHwkN-OrbpGbJhOcpRuRNIVqVJd2YD3knU9CL_aB6tw/edit)
- [Running integrated application](https://socialu-social-u.vercel.app/game-room/dormspace)

| Requirement | SRS issue | Actual implementation branch | Merged PR | Task sub-issues | Running-app evidence |
| --- | --- | --- | --- | --- | --- |
| SRS-500.5, DP — One placement per item. | [#543](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/543) | `srs-500.5-duplicate-placement-validation` | [#1294](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1294) | #1287, #1288 | [Acceptance comment and screenshot](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/543#issuecomment-6939461074) |
| SRS-500.11, DP — Invalid placement feedback. | [#549](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/549) | `srs-500.11-placement-rule-feedback` | [#1295](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1295) | #1289, #1290 | [Acceptance comment and screenshot](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/549#issuecomment-6939545152) |
| SRS-500.13, DP — Wall color selection. (also verifies SRS-500.14) | [#551](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/551) | `srs-500.13-preserve-dorm-appearance` | [#1296](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1296) | #1292, #1293 | [Acceptance comment and screenshot](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/551#issuecomment-6939595098) |

All three parent SRS issues and all six task sub-issues are assigned to
TheRealRinRin and closed. Each implementation branch was created before its own
fix; each PR closes its tasks. Parent cards moved Product Backlog → Sprint
Backlog → In progress as selected/implemented, then project automation moved them
Done on merge. These moves happened during this preparation session; no claim is
made that they were moved throughout the earlier week. Screenshots and separate
live acceptance were attached after integration.

## Fixes and verification

1. **#1214:** numeric catalog aliases (`7`, `07`, `0007`, `+7`) are rejected as the
   same placed item, with SQLSTATE 22023 / HTTP 400 and the precise rule. The old
   bridge returned an unavailable error. Invalid/overflowing IDs also use normal
   arrangement validation. Rejected saves leave room/version unchanged.
2. **#1216:** owned wall/floor appearances submitted as furniture now name that
   violated rule. Unknown/unowned items keep the ownership error. Existing API
   and editor error propagation remain intact.
3. **#1215:** omitted wall/floor fields retain each saved selection independently;
   explicit JSON null retains its existing reset meaning. The SRS now states
   this acceptance distinction.

All 65 checks across six DormSpace suites passed. The integrated follow-up ran
30 checks across the new save/API regressions and the latest World Explorer
avatar tests, all passing. Both production builds succeeded. This is focused
verification; it does not assert that the entire repository test suite passed.

Production deployment `dpl_H2kModBdekEo9kUeDoFKgWtCWD8v` is READY for main commit
`d8fa22024a7c0d54f48e440a5e1b5c1b04af3825`. All three committed migrations were
applied to the existing Supabase project. The hosted assertions in
[production-rollback-check.sql](production-rollback-check.sql) passed inside a
transaction that was rolled back. The server-only bridge execution grants and
the placement trigger's security-invoker setting were unchanged. A deployment
runtime scan found no error/fatal logs in the inspected 15-minute window.

Real browser checks on the deployment verified one Bed after saving, a named
doorway placement rule with the move disabled, and Sky walls / Tile floor still
selected after reload and re-entry. Original Cream walls / Oak floor were
restored. Screenshots prove ordinary UI behavior; crafted malformed-request
coverage is established separately by PostgreSQL/API regressions.

**User direction:** leave Kabanga's cards #1214–#1216 unchanged. Their code fixes
are delivered by DP, but their original open state and KB assignee are preserved.
Consequently they earn no completed-defect credit in the course-defined metrics.

## Frozen metrics snapshot

Issue snapshot: **17 November 2026, 00:24 ET**. Later GitHub activity can differ.

| Measure | Count |
| --- | ---: |
| All non-PR repository issues exported | 1,103 |
| Pull requests excluded | 195 |
| Raw defect reports | 58 |
| Test-only reports excluded | 4 |
| Duplicate reports excluded | 7 |
| Obsolete / withdrawn scope reports excluded | 4 |
| Distinct valid defects | 43 |
| Closed completed | 28 |
| Open | 15 |

Raw defect closures = 43 (28 completed + 7 duplicate + 8 not planned), open = 15.
This reconciles raw reports to the deduplicated measures; not every closed report
is a fixed defect. Bug candidates use the `bug` label or a `[Bug]` title. Three
reports lack the label, so label-only counting would omit them. PRs are excluded.

The [all-issues.csv](all-issues.csv) report includes every non-PR issue with
creator, assignees, state, reason, timestamps, reported severity and SRS.
Non-defect issues are explicitly classified `not-a-defect-report`.
[defect-audit.csv](defect-audit.csv) preserves every candidate and its exclusion.
[metrics.json](metrics.json) contains all chart arrays, person issue lists,
primary-SRS clusters, missing-field flags and the exact calculation inputs.

| Member | SocialU filed | Peer filed | Total filed | Recorded fixed |
| --- | ---: | ---: | ---: | ---: |
| SS | 8 | 6 | 14 | 10 |
| LN | 8 | 2 | 10 | 9 |
| DP | 6 | 1 | 7 | 0 |
| LP | 11 | 1 | 12 | 3 |
| KB | 3 | 1 | 4 | 6 |
| MS | 3 | 1 | 4 | 0 |
| Total | 39 | 12 | 51 | 28 |

Filed counts use the retained issue creator and include the tested peer repo,
`Yetimiah765/CSC351-StacksOverflowed`; peer test-only report #996 is excluded.
Peer #997 is retained as a report, not independently verified by this audit.
Fixed counts require a valid SocialU issue closed `completed` and assigned to the
member. Duplicates are excluded rather than credited to multiple reports.

## Data checking and corrections

- A deterministic random sample (Python seed 20261117) selected #1185, #1177,
  #1190, #1188 and #1189. Individual GitHub fetches matched the report's number,
  title, creator, assignees, state/reason, created/closed timestamps and full body.
- Reconciled 58 − 4 − 7 − 4 = 43; 28 + 15 = 43; per-person fixes sum to 28;
  primary-SRS cluster counts sum to 43. Native Sheets formulas independently
  reproduce the trend, people, SRS-group and functional-area values.
- #1169, #1170 and #1171 were assigned DP and closed not planned, with comments
  citing the already-approved 4 November 3D SRS revision. They quote superseded
  photo-label, no-collision and no-rotation requirements. This is scope triage,
  not three additional fixes. #1172 was already withdrawn as out of scope.
- Preserved GitHub's existing duplicate reason for #1151, #1174–#1176 and
  #1219–#1221. #1151's explicit duplicate comment links it to #1181, so the first
  observation date for #1181 uses the earlier report. Other retained defects use
  their own creation date. Final `closed_at` dates are used; reopened history is
  not reconstructed. Days use America/New_York.
- Parsed both Markdown headings and inline severity/SRS fields. Original High
  severity is retained; the normalized display maps High → Major.
- Remaining teammate-owned gaps are visible: #1173 has no assignee; eight MS
  additional-feature reports have no exact SRS ID; #1188 gives UR-401 only.
  Reported parent-level references 303, 306 and 308 also need leaf-level review.
  No missing requirement IDs were invented and no teammate cards were changed.

## Code count and density

`cloc` 2.12 (pinned npm `cloc@2.12.0-cloc`), against the tracked production-file
list at release d8fa220: 48,747 TypeScript/TSX + 17,845 SQL + 3,873 CSS = 70,465
code lines. Subtract the original starter's 240 production code lines at root
0851492 to report **70,225 net code-growth lines / 70.225 KLOC**.

**43 / 70.225 = 0.61231755 observed defects per KLOC.** Net growth is a transparent
proxy for team-written production code, not exact human line authorship. It
includes versioned schema/migration SQL and excludes tests, scripts, docs,
dependencies, build/generated output, public assets, JSON/lockfiles, blank lines
and comments. The counted file list and both raw cloc outputs are included.

McConnell's lecture range (1–25 per KLOC) concerns delivered software. This
pre-release report count is not directly comparable and cannot establish quality
or the number of undiscovered defects. Largest exact mapped SRS item: 124.1
(6 defects); largest functional area: MS feed/Whisper (11 defects). Count each
issue once under its first reported SRS, preserving all original fields in CSV.

## Demo preparation

Use the same shared Slides link for every teammate. Review the numbers personally
and explain the definitions. DP's seven retained filed reports are SocialU
#1185–#1190 plus peer #1006. DP's three new delivered fixes are shown by PRs
#1294–#1296, while the course-defined recorded-fixed metric remains zero because
the reporter-owned bug cards stay unchanged at the user's direction.

Demonstrate the three SRS cards, their closed tasks and merged PRs from one laptop
and integrated codebase. Show moving an existing item, a rejected placement rule,
and appearance persistence. Use the PostgreSQL/API evidence for crafted requests
the ordinary UI cannot produce. State remaining data gaps and attend the demo.

Sources: [Sprint 5 instructions](https://docs.google.com/document/d/1-e1Ut3AnzJwTNv_mlQF9qCsS7ftgE9gUFyuDA5ZPgcI/edit),
[Defect Metrics lecture](https://docs.google.com/presentation/d/1dZ2dPDKF-jCIvI97tT7sflBhGFMl6Pl2jZxPutJiqx4/edit),
GitHub issue REST snapshots and cloc reports in this directory.
