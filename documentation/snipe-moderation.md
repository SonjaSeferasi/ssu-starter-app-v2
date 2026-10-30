# Snipe moderation: group reporting and receipt (UR-514, DP)

Branch: `srs-514.8-group-snipe-reporting`. Tracking: #675 SRS-514.8, tasks #952–#954. This builds on
[`snipe-basic.md`](snipe-basic.md) and [`snipe-rewards.md`](snipe-rewards.md).

This phase lets group members **report** a published Snipe and get a **receipt**. Administrators can't
review or decide reports yet. That comes in the next phase (SRS-514.10, on its own branch).

## Current scope

| SRS | Status | Where |
| --- | --- | --- |
| 514.8 group reporting | Done | `public.socialu_snipe_report`, report route, `SnipeReport` in the panel |
| 514.9 report receipt | Done | Shown only after the server confirms the report is stored. It's read from the stored report, so it stays after a refresh or in a new session |
| 514.11 pending report visibility | Done | A report never changes the Snipe's status, photo, consent answers or points |
| 514.14 no DM reporting | Done | No controls in DMs (`can_report` is only true in groups, and the panel also checks `kind`). The bridge refuses DMs with `SR403`, and the existing `validate_snipe_report` trigger does too |
| 514.10 review access | Next phase | No administrator queue or UI |
| 514.12 / 514.13 admin decision, removal result | Next phase | Nothing sets `dismissed` / `removed` or `resolved_by` |
| 514.1 group administrator removal | Next phase | |

## Rules

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
- **Browser input.** The server reads only `reason`. It never accepts the reporter's identity, a report
  status, or an administrator decision from the browser.
- **Retries.** A student has at most one unresolved report per Snipe. The new partial unique index
  `snipe_reports_one_unresolved` enforces this; `snipe_reports` had no uniqueness constraint before.
  - Repeating the same reason returns the stored report: 200, `created: false`.
  - A different reason is refused with 409 `SNIPE_ALREADY_REPORTED`. The response includes the receipt for
    the first report, whose reason stays unchanged.
  - The bridge locks the photographer and then the request, in the same order as the Snipe bridge. So
    duplicate deliveries run one after another, and the index backs this up.
  - A retry after the Snipe was removed still returns the stored report.
- **Immutable reports.** The new trigger `freeze_snipe_report` stops anyone changing a report's `snipe_id`,
  `reporter_id` or `reason`. Review can only change `status` and `resolved_by`, and the existing check still
  requires a current group owner or administrator for that.
- **Unchanged.** Untagged members still can't see pending Snipes. Photos stay private. Consent is still
  separate. The 25-point award still applies, and withdrawal and removal work as before. Reporters earn
  nothing.

## How it is built

| Layer | Files |
| --- | --- |
| Migration | `supabase/migrations/20261029184238_snipe_group_reporting.sql` (CLI-generated name). It reuses `socialu.snipe_reports`, its CHECKs and `validate_snipe_report`. It adds the partial unique index, the `freeze_snipe_report` trigger and the private helper `socialu.snipe_report_receipt`, and replaces `socialu.snipe_view`, unchanged apart from the new `can_report` and `my_report` fields. The new server-only bridge `public.socialu_snipe_report(p_auth_id, p_conversation_id, p_snipe_id, p_payload)` is SECURITY DEFINER with `search_path = ''`. Only service_role can execute it. The existing `public.socialu_snipe` bridge is unchanged |
| Server | `lib/snipe.ts`: `snipeReport` and the mappings `SR400` → 400, `SR403` → 403, `SR409` → 409 |
| API | `POST /api/conversations/[id]/snipes/[snipeId]/report` (`app/api/.../report/route.ts`). It runs `snipeUser` (`verifiedUser` and `accountOperation('read')`), and every response is `no-store`. Results: 201 created, 200 existing, 409 conflict |
| UI | `components/snipe/snipe-panel.tsx` and `snipe.module.css`, inside the existing conversation Snipe panel (no new page, no navbar entry). **Report Snipe** opens a labelled reason field and moves focus to it. **Send report** stays disabled until the reason has text. The panel has **Cancel** (or Escape, which puts focus back on Report), sending, error and **Try again** states, and a connection-loss message saying a retry won't send twice. A receipt (`role="status"`) shows the report number, the reason and *Waiting for review by a group administrator* |

## Verification (for Codex to run; I didn't run any of this while writing it)

```bash
npx tsc --noEmit
npx vitest run __tests__/database/snipe-reporting.test.ts __tests__/api/snipe-reports.test.ts
npx vitest run __tests__/database/snipe.test.ts __tests__/database/snipe-rewards.test.ts __tests__/api/snipes.test.ts __tests__/snipe-image.test.ts
npm test
npm run build
SNIPE_EVIDENCE_DIR=tmp/snipe-moderation npx vitest run --config vitest.snipe-basic.config.ts
```

- `__tests__/helpers/snipe-db.ts` applies migrations in filename order. The order is Chat, Snipe basic,
  school communities, rewards, then group reporting (`reporting: false` skips the last one). It also adds
  `snipeReportCall`, which calls the bridge as service_role.
- `__tests__/database/snipe-reporting.test.ts` runs against the real schema in PGlite, with no hosted data.
  It covers:
  - grants;
  - required, trimmed and invalid reasons;
  - a member report persisted with its receipt, ignoring browser identity, status and decision fields;
  - the photo staying available to everyone;
  - retries returning the same report or a conflict, and 20 deliveries storing one row;
  - the unique index, immutability and the existing manager-only resolution;
  - the photographer reporting their own published Snipe (receipt only for them, still published, Remove
    still offered);
  - pending (including for the photographer), missing, outsider, later-joiner, former-member and inactive cases;
  - DMs refused, including direct inserts;
  - removed Snipes refused while the stored receipt is kept;
  - the ledger and consent answers unchanged.
- `__tests__/api/snipe-reports.test.ts` covers that only the trimmed reason is forwarded for the verified
  account. It also checks:
  - validation happens before any database call, including the 500/501-character boundary counted in code
    points;
  - the auth, session and lifecycle gates;
  - the status codes 201, 200 and 409, including a photographer's own report;
  - the error mapping and `no-store`.
- `scripts/tests/snipe-basic.browser.ts` runs the existing synthetic group member, student 4, through the
  flow:
  - keyboard open, then Escape to cancel;
  - the send button disabled while the reason is blank or only whitespace;
  - a report sent, with the receipt shown after it's stored;
  - the photo still shown;
  - the receipt still there after a refresh and in a new phone session, with no horizontal overflow;
  - an API retry and a changed-reason conflict, with no duplicate;
  - the photographer offered both **Report Snipe** and **Remove Snipe**, and unaffected by the member's report;
  - the receipt kept after the Snipe is removed.

  New screenshots: `desktop-member-report-receipt` and `mobile-member-report-receipt`.

Nothing has been applied to a hosted database. Apply this migration after
`20261029182808_snipe_rewards.sql`. If a hosted database already has duplicate unresolved reports, which is
unlikely because the table wasn't used before, creating the unique index fails so they can be reviewed.

## Next phase: SRS-514.10 administrator review (not built)

- A current group owner or administrator opens the group's unresolved Snipe reports (514.10) and resolves
  each one as Dismissed or Removed (514.12). Resolving as Removed applies the existing published-removal
  behavior (514.13, 514.15). Group administrator removal (514.1) also belongs to that phase.
- Planned approach: new actions on the report bridge with fresh manager checks. The existing
  `validate_snipe_report` already requires a current manager in `resolved_by`. Once a report is resolved, the
  reporter can report the Snipe again, because the unique index only covers unresolved reports.
