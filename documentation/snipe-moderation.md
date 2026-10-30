# Snipe moderation: group reporting, administrator review and removal (UR-514, DP)

This builds on [`snipe-basic.md`](snipe-basic.md) and [`snipe-rewards.md`](snipe-rewards.md). It was done in
two phases:

- **Group reporting and receipt.** Branch `srs-514.8-group-snipe-reporting`. Tracking: #675 SRS-514.8,
  tasks #952–#954.
- **Administrator review and group administrator removal.** Branch `srs-514.10-snipe-admin-review`. Tracking:
  #677 SRS-514.10, tasks #955–#957, with the related SRS-514.1, 514.12, 514.13, 514.15 and 524.4.

Group members **report** a published Snipe and get a **receipt**. The group's current **owner or
administrator** reviews unresolved reports, resolves each one as **Dismissed** or **Removed**, and can remove
a published group Snipe directly. Everything happens inside the existing conversation Snipe panel. Snipe has
no navbar entry.

## Current scope

| SRS | Status | Where |
| --- | --- | --- |
| 514.8 group reporting | Done | `public.socialu_snipe_report`, report route, `SnipeReport` in the panel |
| 514.9 report receipt | Done | Shown only after the server confirms the report is stored. It's read from the stored report, so it stays after a refresh or in a new session. Its status now shows the decision (*Reviewed: dismissed* / *Reviewed: Snipe removed*) |
| 514.10 review access | Done | `public.socialu_snipe_moderation` `queue`, `GET …/snipes/reports`, `ReportQueue` in the panel |
| 514.11 pending report visibility | Done | A report, and a dismissal, never change the Snipe's status, photo, consent answers or points |
| 514.12 admin decision | Done | `resolve` with `dismissed` / `removed`, `PATCH …/snipes/reports/[reportId]` |
| 514.13 removal result | Done | Removed applies the published removal behavior (status Removed, photo withdrawn, placeholder, points kept) |
| 514.1 removal roles | Done | Photographer and originally tagged friends (unchanged), plus a current group owner/administrator: `remove`, `POST …/snipes/[snipeId]/admin-removal`, **Remove as group admin** on the card |
| 514.14 no DM reporting | Done | No report, queue or administrator controls in DMs. Every reporting and moderation call in a DM is refused with `SR403` |
| 514.15 repeat removal | Done | Only an Approved Snipe moves to Removed, under the photographer and request locks. Repeats return the existing state |
| 524.4 removal keeps points | Done | No removal path writes to the ledger |

## Rules: reporting (unchanged from the reporting phase)

- **Who can report.** A current participant of the group conversation who can see the Snipe. That means
  the photographer, the tagged friends, and members who joined before it was published. The photographer
  can report their own published Snipe too, and separately keeps their **Remove Snipe** action. `SR403` is
  used only for direct messages.
- **Who is refused.**
  - Outsiders and former members get `SC404`.
  - A Snipe that's hidden from the student, missing, or in another conversation gets `SN404`. This covers a
    pending Snipe the student isn't tagged in, and a member who joined after publication.
  - Inactive or reverification-required accounts get `42501`, or are stopped earlier by `accountOperation`.
  - Every check runs again on each call: session, verified email, account lifecycle, participant and school.
- **Only published Snipes.** Pending and removed Snipes get `SR409` (and other outcomes do too).
- **Reason.** Required. It must be a JSON string of 1–500 characters (code points) after surrounding
  whitespace is trimmed. Other types are rejected with `SR400` / 400 `SNIPE_REPORT_INVALID`. The API checks
  this first, and the database checks it again.
- **Retries.** A student has at most one unresolved report per Snipe (partial unique index
  `snipe_reports_one_unresolved`). The same reason returns the stored report (200, `created: false`); a
  different reason gets 409 `SNIPE_ALREADY_REPORTED` with the first report's receipt. Once a report is
  resolved, the student can report the Snipe again if it is still published.
- **Immutable reports.** `freeze_snipe_report` keeps a report's `snipe_id`, `reporter_id` and `reason`.
  Review only changes `status` and `resolved_by`. The existing `validate_snipe_report` check still requires
  `resolved_by` to be a current group owner or administrator.

## Rules: administrator review and removal

- **Who is a manager.** A current participant of the group (membership and school, via
  `is_current_participant`) whose current membership has the `owner` or `administrator` role
  (`socialu.snipe_group_manager`). This is read again on every call. A revoked administrator, a former member
  or a deactivated account loses access on the very next request.
- **Who is refused.**
  - Non-participants and former members get `SC404` / 404.
  - DMs get `SR403` / 403 `SNIPE_REPORT_NOT_ALLOWED`.
  - Other members, including the photographer and tagged friends who aren't managers, get `SM403` / 403
    `SNIPE_MODERATION_NOT_ALLOWED`.
  - Inactive accounts get `42501`.
  - The manager check runs before any report is read, so a refused caller learns nothing about reports.
- **Role-change races.** Role changes (assign, revoke, transfer, leave, member removal) all update
  `group_memberships`. Its `validate_membership` trigger locks the conversation row `FOR UPDATE`. The
  moderation bridge takes that row `FOR SHARE` before checking the role, so a decision and a role change run
  one after the other, and the decision sees the role as committed.
- **Queue (514.10).** The queue lists only this group's unresolved reports, oldest first, at most 100. Each
  report shows:
  - the reason, the reporter and the photographer;
  - the Snipe's status and when it was published;
  - `visible`, which follows the existing viewing rule (`snipe_viewer_role`), and `photo_available`, which is
    true only when the manager can see the Snipe and it is still Approved.

  A manager who joined after publication sees the report metadata and can decide it. They never get the
  photo; the photo route still refuses them with `SN404`. Their Snipe list still doesn't include the Snipe,
  so they aren't silently given access to old chat history. Pending Snipes can't be reported, so the queue
  never reveals one. Storage keys never appear in the queue or anywhere else.
- **Decisions (514.12).** The payload must be `{"decision": "dismissed"}` or `{"decision": "removed"}`,
  exactly. Anything else gets `SM400` / 400 `SNIPE_DECISION_INVALID`; the API checks first and the database
  checks again.
  - The resolver always comes from the verified account. Any resolver, role, status or balance in the body is
    ignored.
  - An unknown report, or one from another group, gets `SR404` / 404 *Report not available.*
- **Dismissed.** Only the report changes. The Snipe stays Approved with its photo, consent answers and points.
  The reporter's receipt shows *Reviewed: dismissed*, and they can file a fresh report.
- **Removed (514.13).** Resolving as Removed uses `socialu.snipe_manager_remove`:
  - The Snipe becomes Removed with the reason *Removed by a group administrator*.
  - Its photo is no longer served to anyone.
  - Members see the *Snipe removed* placeholder in the conversation.
  - The ledger is untouched, so points already awarded stay.
  - The same decision also closes the Snipe's other unresolved reports, with the same manager as resolver.

  If the Snipe was already removed (for example, a tagged friend withdrew), nothing changes except the report
  status. The queue shows *Snipe removed* and offers **Resolve as removed** without a confirmation.
- **Idempotent and serialized.** The bridge locks the photographer, then the request, then the report, in the
  same order as the Snipe and report bridges. Concurrent decisions, reports, withdrawals and removals of one
  Snipe therefore run one at a time.
  - Repeating a stored decision returns it (200, `changed: false`).
  - The other decision gets 409 `SNIPE_REPORT_ALREADY_RESOLVED`, and the first decision is kept.
  - A removal happens at most once, and no path creates a second removal or changes points.
- **Direct removal (514.1).** A manager who can see an Approved Snipe gets `can_admin_remove`. The photographer
  keeps `can_remove` instead. The card's **Remove as group admin** asks for confirmation first, then applies
  the same removal, which also closes the Snipe's open reports.
  - A Snipe the manager can't see (pending and untagged, published before they joined, or missing) gets
    `SN404`. A reported one can still be removed by resolving its report.
  - A repeat returns the Removed state.
- **Unchanged.** The photographer and every originally tagged friend keep their removal roles. That includes a
  friend who answered No to "Is this you?" but approved sharing; they still withdraw sharing to remove a
  published Snipe. Pending Snipes stay hidden from untagged members and managers. Consent, cooldowns, private
  storage, rewards and ordinary chat are unchanged.

## How it is built

| Layer | Files |
| --- | --- |
| Migration (reporting) | `supabase/migrations/20261029184238_snipe_group_reporting.sql`: partial unique index, `freeze_snipe_report`, `socialu.snipe_report_receipt`, `can_report` / `my_report` in `snipe_view`, server-only `public.socialu_snipe_report` |
| Migration (review) | `supabase/migrations/20261030035002_snipe_admin_review.sql` (CLI-generated name). It adds three private helpers: `socialu.snipe_group_manager`, `socialu.snipe_report_item` and `socialu.snipe_manager_remove`. It replaces `socialu.snipe_view`, unchanged apart from `can_admin_remove`. All of these have a fixed `search_path` and EXECUTE revoked from PUBLIC, anon, authenticated and service_role. The new bridge `public.socialu_snipe_moderation(p_auth_id, p_action, p_conversation_id, p_target_id, p_payload)` has the actions `queue`, `resolve` and `remove`. It is SECURITY DEFINER with `search_path = ''`, and only service_role can execute it. It gets the actor from `socialu_require_student`. No tables, existing bridges or triggers change |
| Server | `lib/snipe.ts`: `snipeModeration`, `SNIPE_DECISIONS`, and the mappings `SM400` → 400, `SM403` → 403 and `SR404` → 404 |
| API | `GET /api/conversations/[id]/snipes/reports` (queue). `PATCH /api/conversations/[id]/snipes/reports/[reportId]` (decision; reads only `decision`). `POST /api/conversations/[id]/snipes/[snipeId]/admin-removal` (reads no body). Each one runs `snipeUser` (`verifiedUser` + `accountOperation('read')`), validates the IDs first, and responds `no-store` |
| UI | `components/snipe/snipe-panel.tsx` and `snipe.module.css`. **Reports to review** (`ReportQueue`) appears in group panels only when the server confirms a current manager. A 403 or 404 hides it, with a note if the role was just lost. Each report shows the reporter, reason, Snipe status and photo, or *Snipe removed*, or *Photo not shown: this Snipe was published before you joined the group*. **Dismiss report** saves straight away. **Remove Snipe** asks for confirmation (**Confirm removal** / **Keep it**). Buttons show *Dismissing…*, *Removing…* or *Saving…* while busy. Errors have a retry, and a lost connection says the retry won't apply twice. The empty state reads *No reports are waiting for review in this group.* The queue refreshes with the Snipe list, including its polling and Refresh button, and after every decision or removal. So role changes and removals show up, and a removed photo's card unmounts and releases its blob URL. Member reporting, receipts and the message layout are unchanged |

## Verification (for Codex to run; I didn't run any of this while writing it)

```bash
npx tsc --noEmit
npx vitest run __tests__/database/snipe-admin-review.test.ts __tests__/api/snipe-moderation.test.ts
npx vitest run __tests__/database/snipe-reporting.test.ts __tests__/api/snipe-reports.test.ts
npx vitest run __tests__/database/snipe.test.ts __tests__/database/snipe-rewards.test.ts __tests__/api/snipes.test.ts __tests__/snipe-image.test.ts
npm test
npm run build
SNIPE_EVIDENCE_DIR=tmp/snipe-moderation npx vitest run --config vitest.snipe-basic.config.ts
```

- `__tests__/helpers/snipe-db.ts` applies migrations in filename order: Chat, Snipe basic, school communities,
  rewards, group reporting, then admin review. `review: false` skips the last one. It also adds
  `snipeModerationCall`, which calls the new bridge as service_role.
- `__tests__/database/snipe-admin-review.test.ts` runs on the real schema in PGlite. A test-only trigger audits
  lifecycle transitions so each removal can be counted. It covers:
  - grants and browser roles;
  - the empty queue, and refusals for members, tagged friends, outsiders, unknown actions and DMs;
  - the queue's exact shape;
  - isolation from another group's reports (not listed, `SR404` across groups);
  - strict decision payloads;
  - a dismissal by the administrator, with browser resolver and role fields ignored. The photo stays served to
    everyone, answers are unchanged, and the receipt updates. A repeat is `existing`, and the other decision is
    a `conflict`;
  - a fresh report after dismissal;
  - an administrator's role revoked mid-session (queue, decision, direct removal and `can_admin_remove` all
    refused), then restored;
  - a later-joining administrator, who gets metadata only (no photo, no Snipe, no direct removal, no pending
    Snipe) but resolves as Removed. That removes the Snipe once, withdraws the photo for everyone, closes the
    sibling report and keeps the reward;
  - direct owner removal, and who is offered it;
  - pending Snipes hidden from untagged managers;
  - removal by an identity-No tagged friend;
  - ten concurrent, conflicting decisions, which store one decision;
  - concurrent report decisions, direct removal and photographer removal, which produce one removal and no
    ledger change;
  - DM refusals, with DM withdrawal still working;
  - former managers and inactive accounts.
- `__tests__/api/snipe-moderation.test.ts` checks that only the verified account, the path IDs and the decision
  are forwarded. Roles, resolvers and balances in the body are ignored. It also covers:
  - validation before any database call (decision values, IDs, malformed bodies);
  - the auth, session and lifecycle gates;
  - 200 / 409 for repeats and conflicts, and `SNIPE_CLOSED`;
  - the error mapping and `no-store`.
- `scripts/tests/snipe-basic.browser.ts` gains two scenarios:
  - **Group.** The group owner (photographer 1):
    - resolves the earlier report on the withdrawn Snipe, whose queue item shows *Snipe removed*;
    - then gets photographer 2's new Snipe, reported through the UI by member 4, and sees the reason and photo;
    - dismisses it, after which the photo is still served and 4 sees *Reviewed: dismissed* and reports again.
      Members and tagged friends never see the queue, and the API refuses them;
    - on a phone, opens the removal confirmation, backs out with **Keep it**, then confirms;
    - afterwards the photo is refused for everyone, the cards show the placeholder with no image, 4's receipt
      reads *Reviewed: Snipe removed*, photographer 2 keeps 25 points, and a repeat removal returns Removed.
  - **Direct message.** In a real DM between 2 and 3:
    - 3 submits through the composer, and 2 answers both questions on a phone, publishing it;
    - 3 is credited 25 points;
    - neither participant sees report, queue or administrator controls, and the three moderation/report
      endpoints answer 403 `SNIPE_REPORT_NOT_ALLOWED`;
    - 3 removes it with confirmation, and the photo is then refused for both while the points are kept.

  New screenshots: `desktop-owner-queue-removed-snipe`, `desktop-owner-report-queue`,
  `mobile-owner-confirm-removal`, `mobile-owner-report-removed`, `desktop-member-report-removed`,
  `mobile-dm-tagged-approved`, `desktop-dm-photographer-removed`. The existing
  `desktop-member-report-receipt` and `mobile-member-report-receipt` remain.

Nothing has been applied to a hosted database. Apply `20261030035002_snipe_admin_review.sql` after
`20261029184238_snipe_group_reporting.sql`. It is additive and creates no tables.

## Not covered

- The school part of the manager check comes from the existing `is_current_participant`. No separate
  cross-school moderation test was added.
- No notifications to reporters or managers when a report is filed or decided. The panel polls while open.
- No audit history beyond `snipe_reports.status` / `resolved_by` and the Snipe's terminal reason. There is no
  decision timestamp column, and none was added.
