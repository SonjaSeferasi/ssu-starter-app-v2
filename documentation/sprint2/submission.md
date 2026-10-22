# CSC 351 — Sprint 2 — Linh Nguyen (LN)

Prepared October 22, 2026. Application: SocialU. GitHub: Dieulinhh23.

## Canvas links

1. [Team project — Linh Nguyen - Sprint 2](https://github.com/users/SonjaSeferasi/projects/2/views/14).
2. [Selected SRS-114.7 issue #506](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/506): requirement, UR trace, five assigned task sub-issues, implementation references and remaining acceptance work.
3. [Merged implementation PR #501](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/501).
4. [SRS-named evidence branch](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/linh/srs-114.7-friend-request-notification-sprint2).

**Submission status:** implementation is merged and automated checks pass. The live recipient screenshot and a real two-account demonstration remain outstanding. Do not represent this document as full completion until those are recorded on #506. The student must attend demo day; a prepared script does not satisfy attendance.

## Selected requirement

**SRS-114.7, LN — Friend-request notification.**

The system shall notify the receiving student when a new friend request is submitted successfully.

Acceptance criterion: Given a friend request is successfully created, when the request is recorded, then the receiving student receives a friend-request notification.

Traces to: UR-114

UR-114: As a student, I want to send a friend request from another student's profile, so that I can connect with classmates and other students I know.

Source: [canonical SRS](../SocialU_SRS_Editable.md#ur-114); [UR overview #430](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/430).

## Prioritized backlog

| Priority | Exact SRS title | Issue | Sprint 2 role |
| --- | --- | --- | --- |
| 1 | SRS-114.1, LN — Add Friend action. | [#502](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/502) | Product Backlog acceptance audit; supporting code exists |
| 2 | SRS-114.2, LN — Create pending friend request. | [#503](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/503) | Product Backlog acceptance audit; supporting code exists |
| 3 | SRS-114.3, LN — Duplicate pending-request restriction. | [#504](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/504) | Product Backlog acceptance audit; supporting code exists |
| 4 | SRS-114.4, LN — Friendship requires acceptance. | [#505](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/505) | Product Backlog acceptance audit; supporting code exists |
| 5 | SRS-114.7, LN — Friend-request notification. | [#506](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/506) | One formal Sprint 2 selection; finish hosted evidence |

The order follows dependencies: expose the action, persist a valid pending request, enforce request integrity, then notify the recipient. The notification slice reuses the already-built request behavior. Existing retired issues #193–#199 were left unchanged; the new issues use the assignment's exact SRS-card structure. These are current acceptance-audit records, not a claim that implementation began after their creation.

The assignment repeatedly says Sprint 1 and alternates between several items and exactly one. This preparation follows the explicit 50-point rubric's one-formal-item rule for Sprint 2. Confirm with the instructor if the intended rule differs.

## Vertical slice and real sub-issues

| Layer | Assigned task | Evidence | Current outcome |
| --- | --- | --- | --- |
| Database | [#507 — Task 114.7-1](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/507) | `socialu.notifications`, request relationship, transaction trigger in `20261022050000_integrate_notifications_with_main.sql` | Code merged; disposable database test passes |
| API | [#508 — Task 114.7-2](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/508) | `/api/notifications` uses verified identity; signed photo URLs; read-state update | Code merged; API tests use mocks |
| User interface | [#509 — Task 114.7-3](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/509) | Header bell, unread count, `/notifications`, actor profile links | Code merged; real page opened, currently empty |
| Automated verification | [#510 — Task 114.7-4](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/510) | Database persistence/unread checks; API response and identity checks | Automated verification passes; does not substitute for hosted acceptance |
| Live acceptance / evidence | [#511 — Task 114.7-5](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/511) | Real sender and recipient; notification persists on reload; recipient screenshot on #506 | OPEN — not claimed complete |

The five tasks are actual sub-issues of #506, not a Markdown checklist standing in for relationships. Four implementation tasks are closed with merged-code evidence; live acceptance remains open. The parent stays open.

## Implementation and schema findings

The original integrated feature was developed on `linh/friends-notifications-20261022` and merged through PR #501. The SRS-named branch was created afterward for assignment traceability and additional recipient-boundary tests; it is not falsely presented as the original implementation branch.

Integration found two overlapping friendship APIs and older feed functions that would overwrite newer likes/comments/photo contracts. The additive `20261022050000_integrate_notifications_with_main.sql` preserves the current feed functions, creates notifications from the shared friendship workflow, and adapts the older friend-action RPC to current authorization. Already-applied migrations were not rewritten and no data reset was used.

The notification `read_at` column supports a badge counting unread notifications instead of every pending request. Read-state behavior is supporting implementation, not a replacement for SRS-114.7's requirement to actually deliver a notification.

Hosted deployment of the compatibility migration must be confirmed before the live demo. The earlier user-reported installed functions do not prove this later migration was deployed.

## Evidence and limits

- PR #501 was verified merged on October 22, 2026.
- The integrated snapshot passed 519 tests and TypeScript checks during conflict resolution. Later evidence-branch results are recorded in validation.txt.
- Disposable database tests execute the real schema and notification migrations, create a request, inspect the recipient's unread notification, mark it read, and verify acceptance notifications.
- API tests mock Supabase. They validate routing and identity boundaries, not email delivery or the hosted database.
- The real signed-in app at `/notifications` displayed **No notifications yet** during preparation. That empty state is not evidence of successful request notification delivery.
- No two-account screenshot, live request delivery, or demo attendance is claimed.
- Board/task records were created October 22 after implementation. Continuous status updates earlier in the week cannot be recreated retroactively.

## Remaining actions before submission

1. Confirm the latest compatibility migration is deployed in the shared environment.
2. Perform [the five-minute demo and screenshot steps](demo.md) with two authorized accounts.
3. Put the real recipient screenshot and reproduction notes on #506; close #511 only after it passes.
4. Move #506 to Done only when the team's Definition of Done is satisfied. Keep other acceptance-audit cards open unless independently verified.
5. Submit the project link, selected SRS issue and merged implementation PR in Canvas. Attend the actual demo.

## Rubric self-check — 50 points

| Criterion | Points | Evidence / remaining gap |
| --- | ---: | --- |
| Product Backlog | 6 | Five exact LN SRS issues, shall statements, UR traces and dependency priority |
| Sprint item and tasks | 10 | One formal selection; five assigned real sub-issues across data/API/UI/tests/live acceptance |
| Branch and code links | 9 | Merged implementation PR #501; original branch identified honestly; later SRS-named branch and evidence PR linked separately |
| Evidence it works | 5 | Real successful-delivery screenshot still required on #506 |
| Board kept current | 5 | Current statuses recorded; no retroactive week-long history claimed |
| Sprint demo | 15 | Five-minute script prepared; live demonstration and attendance still required |

This is an evidence audit, not a promised grade. See [the team's Definition of Done](../definition-of-done.md).
