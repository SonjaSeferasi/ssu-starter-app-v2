# Sprint 3 planning — Linh Nguyen (LN)

Prepared October 27, 2026 from the professor's CSC 351 Sprint 3 assignment. **Planning only: no new Sprint 3 implementation or completion is claimed.**

## Review this first

- Team Project: https://github.com/users/SonjaSeferasi/projects/2
- Owner and required assignee for every SRS card and task: `Dieulinhh23`.
- Canonical requirements: [SocialU SRS](../SocialU_SRS_Editable.md).
- Completion rules: [team Definition of Done](../definition-of-done.md).
- Copyable card, task and PR bodies: [templates](templates.md).
- Exact prepared SRS and task bodies for this selection: [ready-issues.md](ready-issues.md); structured copy: [issue-plan.json](issue-plan.json).

This branch is for planning files only. It is not an implementation branch for any SRS item. Create each item's own SRS-named branch before coding and put that item's actual implementation commits and PR on that branch.

## Current setup status

| Part | Status |
| --- | --- |
| Sprint 3 instructions reviewed | Complete |
| Scope and exact SRS selection | Login Activity: SRS-107.1–107.4, selected from Linh's supplied ownership area after the initial code/backlog audit |
| Planning templates | Prepared |
| GitHub SRS cards and task sub-issues | Not created by this setup; connector returned 403 on issue creation |
| Sprint 3 board view and statuses | Not configured; browser connection unavailable |
| Per-SRS implementation branches | Four SRS-named branches created at baseline `2b3a521` before coding; no implementation commits yet |
| New Sprint 3 implementation | Not started in this setup |
| Tests, merged implementation PRs and screenshots | Add after implementation; no results claimed yet |

## Selected work and later scope

Sprint 3 prepares the read-only Login Activity feature: access to the student's own recorded history, access to all recorded entries, and recorded date/time display. Four selected items have 16 prepared task bodies in total. These are unstarted implementation plans, not a claim that branches alone satisfy the assignment.

The historical #125–#133 issues were checked: they are closed as `not_planned`, not completed implementation. This setup leaves those retirement records unchanged and prepares new exact SRS parent bodies. The new parents have not been published because GitHub returned 403; no fake issue numbers or sub-issue progress are shown.

Reserve SRS-107.5–107.9 for later selection: recorded location when available, active-session status, the remote logout action, actual remote termination, and preservation of the current session. University-email changes in UR-106 also remain outside this sprint plan. This leaves meaningful implementation for the last sprint without claiming it is already scheduled or guaranteed to fit.

Choose several LN-owned SRS items that can be implemented and demonstrated in one week. Inspect the existing code and issue history first; do not treat a missing screenshot as proof that a feature has not already been built. Reuse a suitable existing SRS issue instead of making duplicates. An old issue titled `Task SRS-…` may need an honest format correction and real child tasks to become the SRS parent required by this assignment.

Possible areas for Linh to choose:

| Area | Findings to consider before selection |
| --- | --- |
| Profile editing | Substantial profile work is already merged in PR #855; editor code also already contains unsaved-change handling and display-name cooldown. Identify a genuine remaining gap before committing new work. |
| Friendships | #503–#505 have existing implementation evidence from PR #501 but unfinished acceptance records. #506/#511 are historical notification acceptance work; they are not a new implementation claim. |
| Account/security | Existing overview #423 records Login Activity as unfinished. No student-facing Login Activity route was found during the initial local audit. The canonical SRS-107 items and old issues #125–#133 are candidates for inspection, not selected commitments. |

Existing graded Sprint 1 and Sprint 2 records, the profile evidence branch, prior merged PRs and the local-only unfriend edits remain separate. No new SRS numbers or changed shall statements are introduced by this planning setup.

## Product Backlog and Sprint Backlog

The intended order below is prepared for review. Publish the exact parent/task bodies and then set the actual board statuses. Start requirements in Product Backlog and move this four-item selection into Sprint Backlog. Do not move them to In progress until work actually starts. The board has not yet been changed by this setup.

| Priority | Exact SRS title and issue link | Status | Branch link | Task sub-issues |
| --- | --- | --- | --- | --- |
| 1 | SRS-107.1, LN — Login-history access. | Intended Sprint Backlog; card not published | [`linh/srs-107.1-login-history-access`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/linh/srs-107.1-login-history-access) | Four bodies prepared; relationships not created |
| 2 | SRS-107.2, LN — Complete login history. | Intended Sprint Backlog; card not published | [`linh/srs-107.2-complete-login-history`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/linh/srs-107.2-complete-login-history) | Four bodies prepared; relationships not created |
| 3 | SRS-107.3, LN — Login date. | Intended Sprint Backlog; card not published | [`linh/srs-107.3-login-date`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/linh/srs-107.3-login-date) | Four bodies prepared; relationships not created |
| 4 | SRS-107.4, LN — Login time. | Intended Sprint Backlog; card not published | [`linh/srs-107.4-login-time`](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/linh/srs-107.4-login-time) | Four bodies prepared; relationships not created |
| 5–9 | Exact SRS-107.5–107.9 titles and bodies in ready-issues.md | Intended Product Backlog; not selected for Sprint 3 | Create when selected | Decompose when selected |

`database/schema.sql` already proposes a `login_sessions` table with a recorded timestamp, optional location, remembered-session flag and revocation timestamp. The first item's data task must verify how that reviewed schema relates to the live auth/session implementation. Do not add redundant tables or treat provider active sessions as complete historical records without checking retention.

The professor requires several SRS items; one broad UR or this planning document does not replace those cards.

## Set up each selected SRS item

1. Use its exact title from the canonical SRS, including number, LN initials and wording. Paste its exact shall statement, acceptance criterion and `Traces to: UR-…` line. Link its existing UR overview and the corresponding [URD story](../user_requirements.md).
2. Assign the SRS parent to `Dieulinhh23`; add it to the team Project with the appropriate backlog status.
3. Create actual task sub-issues covering the data contract/database, API, UI and automated plus live acceptance needed for that behavior. Assign every task to `Dieulinhh23`. A checklist or a `Parent: #…` sentence alone does not establish a GitHub sub-issue relationship.
4. Create the SRS-named branch from an up-to-date integrated baseline before coding, for example `linh/srs-107.1-login-history-access`. This is a naming example, not a branch already created by this setup. Link the branch on the SRS issue.
5. Keep tasks open and the parent in Sprint Backlog until work starts. Update statuses during the week as work changes.

Existing schema can satisfy the data layer. Add only tasks needed by the exact SRS behavior; do not add unrelated features to inflate the slice.

## Add implementation and evidence later

For each selected SRS item:

- Do its actual coding on its own SRS-named branch. A later empty branch is not a substitute.
- Open a PR to `main` with the problem, resulting behavior and validation. Use `Closes #<task issue>` for each task the PR actually completes. Link the PR from the SRS card. Close the parent only when its complete acceptance and Definition of Done are satisfied.
- Attach a screenshot directly to the SRS issue showing that exact behavior in the running integrated app. Include route, date, commit, reproduction steps and result. Test logs and design mockups do not replace the screenshot.
- Keep recorded automated results separate from live hosted acceptance. Do not claim a passing save, persistence check, or database deployment before verifying it.
- If SRS/schema changes become necessary, record the finding on the relevant card and review the actual change. This setup does not authorize rewriting the canonical requirements.

## Demo and submission — at sprint end

Linh must attend demo day. Show the integrated checked-in application on one laptop, the SRS parents and linked tasks, each behavior end to end, and each merged PR. Allow about five minutes. Describe unfinished work honestly and return it to Product Backlog for Sprint 4.

Canvas links to fill in later:

- Team Project link: https://github.com/users/SonjaSeferasi/projects/2
- Each Sprint 3 SRS issue: selected bodies prepared; actual GitHub publication pending.
- Each merged implementation PR: pending implementation.

The assignment totals 50 points: Product Backlog 6; sprint items/tasks 10; branches/code links 9; screenshots 5; current board 5; demo 15. This plan does not guarantee points or claim submission/attendance.
