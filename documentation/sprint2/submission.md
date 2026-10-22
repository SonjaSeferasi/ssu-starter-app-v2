# CSC 351 — Sprint 2 — Linh Nguyen (LN)

Updated October 22, 2026. GitHub account: Dieulinhh23. Application: SocialU.

**Prepared for submission review; not a claim of full completion.** The selected notification slice is implemented and merged. Its final fresh two-account delivery check is deferred at Linh's request. No demo script is included in this submission package.

## Canvas: copy these links

- Team project / personal Sprint 2 view: https://github.com/users/SonjaSeferasi/projects/2/views/14
- Selected SRS issue: https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/506
- Merged implementation PR: https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/501
- Merged SRS-named recipient-access/evidence PR: https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/512
- Merged notification UI/backfill PR: https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/514
- SRS-named branch: https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/linh/srs-114.7-friend-request-notification-sprint2

Suggested submission note:

> My Sprint 2 item is SRS-114.7, LN — Friend-request notification, tracing to UR-114. Its database, authenticated API, notification interface and automated tests are implemented and merged in PRs #501, #512 and #514. Issue #506 links the assigned task sub-issues, branches, code and running-application screenshot. Four of five tasks are complete. The screenshot shows real existing received requests; the final fresh two-account request/unread-bell check in #511 is still pending and is not claimed complete.

## Selected SRS item

**SRS-114.7, LN — Friend-request notification.**

The system shall notify the receiving student when a new friend request is submitted successfully.

Acceptance criterion: Given a friend request is successfully created, when the request is recorded, then the receiving student receives a friend-request notification.

Traces to: UR-114

UR-114: As a student, I want to send a friend request from another student's profile, so that I can connect with classmates and other students I know.

Canonical source: [SRS](../SocialU_SRS_Editable.md#ur-114); [UR overview #430](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/430).

## Five SRS cards, in dependency order

All five titles, shall statements and trace lines were checked against the canonical SRS. All are assigned to Dieulinhh23. The following are current statuses, not fabricated earlier sprint history.

| Priority | Exact title / issue | Current status |
| --- | --- | --- |
| 1 | [SRS-114.1, LN — Add Friend action. #502](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/502) | Done: PR #530 merged; four tasks closed; eligible-profile screenshot attached |
| 2 | [SRS-114.2, LN — Create pending friend request. #503](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/503) | Product Backlog: supporting implementation exists; own acceptance package unfinished |
| 3 | [SRS-114.3, LN — Duplicate pending-request restriction. #504](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/504) | Product Backlog: supporting implementation exists; own acceptance package unfinished |
| 4 | [SRS-114.4, LN — Friendship requires acceptance. #505](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/505) | Product Backlog: supporting implementation exists; own acceptance package unfinished |
| 5 | [SRS-114.7, LN — Friend-request notification. #506](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/506) | In review: one formal Sprint 2 selection, 4/5 tasks complete |

The assignment text alternates between Sprint 1/Sprint 2 and several/exactly one SRS selection. This package follows the explicit rubric's one-formal-item rule and does not rewrite the assignment. Ask the instructor if a different interpretation is required.

## Vertical slice: actual assigned sub-issues of #506

| Layer | Task | Evidence | Status |
| --- | --- | --- | --- |
| Database | [#507 — Task 114.7-1](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/507) | Persisted notification and friendship trigger; merged PR #501 | Done |
| API | [#508 — Task 114.7-2](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/508) | Authenticated GET/POST `/api/notifications`; signed actor photos | Done |
| UI | [#509 — Task 114.7-3](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/509) | Bell badge; Notifications and Friend requests tabs; profile links | Done |
| Tests | [#510 — Task 114.7-4](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/510) | Recipient boundary, real-schema persistence and unread-state tests; PRs #512/#514 | Done |
| Live acceptance | [#511 — Task 114.7-5](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/511) | Fresh request, recipient bell, persisted notification, screenshot | Open; deferred by Linh |

These are real sub-issue relationships, not just checklist text. #506 and #511 stay open. When the sprint actually ends, any unfinished work returns to Product Backlog; the end date has not been invented.

## Evidence already available

[Real recipient screenshot attached to #506](https://github.com/user-attachments/assets/e362dae0-b3c1-4c53-9d79-43ae42a051ea): pending requests from Darrin and Loens, with Accept/Decline controls. Both remained after returning to the page. Their displayed ages were 2–3 days, so this is evidence of existing received requests, not proof of a fresh request generated after deployment.

[Completed Add Friend acceptance #502](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/502) has its own [eligible-profile screenshot](https://github.com/user-attachments/assets/edb99669-bfbd-4489-be8d-c6afe4cccd58), four closed sub-issues and [merged PR #530](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/530). It is supporting completed work, not a silent replacement for the selected #506. See [its acceptance record](srs-114.1-acceptance.md).

The original implementation branch was `linh/friends-notifications-20261022`. SRS-named evidence branches and task records were created afterward. This package does not claim they were the original development branches or recreate a week's board history.

## Schema and integration findings

Two overlapping friendship APIs and older feed function bodies needed integration. The compatibility migration `20261022050000_integrate_notifications_with_main.sql` preserves the newer feed contract while recording friendship notifications from the shared workflow. The notification trigger and wrapper were confirmed installed in hosted Supabase. This confirmation is not a claim that every statement in that migration was replayed.

The idempotent legacy-request backfill and notification tabs are merged in PR #514. Historical notifications retain the original request times. The backfill is not used as evidence of new live delivery.

Later school-community, profile-highlight and campus-directory work is in main. It is additional development, not automatically counted toward SRS-114.7. For the final live check, both real test accounts must now be in the same verified school community.

## Current verification

At integrated commit `40294284dd806f139b7ab707695b9f1494591d3e` on October 22, 2026:

- `npx tsc --noEmit`: passed.
- Targeted friendship/notification API and database suites: **41 tests passed across 4 files**.
- API tests mock the provider. Database tests execute real SQL in disposable PostgreSQL; they do not modify hosted classmates' records or replace the final two-account UI check.

See [validation.txt](validation.txt). PR merge states were independently checked: #501, #512, #514 and #530 are merged.

## Only remaining acceptance step

1. Arrange two consenting, verified same-school accounts that are not friends, have no pending request and have no block.
2. Have the sender submit one new Add Friend request to Linh Nguyen's account.
3. On the recipient's signed-in app, refresh/focus, show the unread bell, then open Notifications and show the new sender. Reload to confirm it persists.
4. Attach the fresh screenshot and reproduction notes to #506. Close #511 and #506 and move them to Done only after this passes.
5. Submit the verified links in Canvas. Linh must personally attend the course demo to receive credit; preparing files is not attendance or Canvas submission.

## Rubric readiness

| Criterion | Points | Current position |
| --- | ---: | --- |
| Product Backlog | 6 | Five own SRS issues with exact titles, shall statements, traces and dependency order |
| Sprint item/tasks | 10 | One selected item; five assigned vertical-slice sub-issues; one live task outstanding |
| Branch/code links | 9 | Original branch identified; SRS-named branches and merged PRs linked honestly |
| Working evidence | 5 | Real existing-request screenshot attached; fresh delivery check outstanding |
| Current board | 5 | Completed work in Done; deferred/unfinished work open; no backdated history |
| Sprint demo | 15 | Working implementation available; final real request check and personal attendance still required |

This is a readiness record, not a guaranteed score. [Team Definition of Done](../definition-of-done.md).
