# Snipe sharing permissions for original actors (SRS-511.12, 514.1; DP)

Branch: `srs-511.12-snipe-withdrawal-access`. Tracking: parent #645, tasks #969–#971 (assigned TheRealRinRin,
Sprint 3). Builds on [`snipe-basic.md`](snipe-basic.md), [`snipe-rewards.md`](snipe-rewards.md) and
[`snipe-moderation.md`](snipe-moderation.md).

| Card | Scope |
| --- | --- |
| #969 | Original actor authorization: the server-only bridge, scope from stored original roles, removal and withdrawal |
| #970 | Metadata-only Messages controls: the two routes and *Your Snipe sharing permissions* on the Messages home |
| #971 | Verification: the focused database, API and component tests below |

Before this change, a published Snipe could only be withdrawn or removed from inside its conversation's Snipe
panel, which requires being a current participant. A photographer or tagged friend who had left the group could no
longer reach that control. Now the photographer and every originally tagged friend who approved sharing keep their
withdrawal/removal control over the Approved Snipe after leaving the group or after the friendship ends. They get
**no** new access to the photo, the Snipe list or the chat.

## Requirement mapping

| SRS | Cards | Status | Where |
| --- | --- | --- | --- |
| 511.12 withdrawal after publication | #969, #970, #971 | Done, now also for former participants | `withdraw` on `public.socialu_snipe_sharing`. The existing `consent_outcome` trigger turns Approved into Removed (`Sharing permission withdrawn`) |
| 514.1 removal roles: photographer and original tagged friends | #969, #970, #971 | Done, independent of current membership and friendship | Scope is the stored original role: `snipe_requests.submitter_id`, or the student's own `snipe_tags` row with `sharing_yes` TRUE (identity No counts) |
| 514.1 group administrator removal | — | **Not built here** | Later administrator-review phase (see `snipe-moderation.md`) |
| 514.2 – 514.7 removal effect and privacy | #969, #970, #971 | Done | The status becomes Removed for everyone in the original conversation, and the existing photo route stops serving it. This path returns metadata only |
| 514.15 repeated removal | #969, #971 | Done | A repeat, or an action after another original actor removed it, changes nothing and returns the stored state (`changed: false`) |
| 524.4 reward retention | #969, #971 | Done | Nothing in this path writes, changes or reverses `point_transactions`. The photographer keeps the points credited at publication |

## Rules

- **Who qualifies.** Only for Snipes whose status is Approved or Removed:
  - the photographer (original submitter);
  - an originally tagged friend whose own stored sharing answer is Yes. Identity No with sharing Yes qualifies.

  Nothing else qualifies:
  - a tag with sharing No or unanswered, even on a Removed Snipe;
  - unrelated members, outsiders and members who joined later;
  - Pending, Rejected, Expired, Canceled and Closed requests. They never appear and can't be acted on, so a
    request canceled by a departure or a friendship ending stays canceled.
- **Not checked.** Current group membership, DM participation and friendship aren't checked on this path. Account
  checks still run on every call: `socialu_require_student`, plus `verifiedUser` and `accountOperation('read')`
  through `snipeUser`.
- **Actions.**
  - Photographer: `remove` changes Approved to Removed with the existing reason `Removed by the photographer`,
    the same update the in-chat removal makes. A photographer sending `withdraw` gets `SN400`.
  - Any other action, including NULL, gets `SN400` before any row is read or locked. (The HTTP route also
    accepts only `withdraw` / `remove`; the bridge checks again for any other server caller.)
  - Tagged friend: `withdraw` (or `remove`, treated the same) sets the existing `sharing_withdrawn` flag, and the
    existing `consent_outcome` trigger removes the Snipe. `SET CONSTRAINTS ALL IMMEDIATE` then runs the deferred
    consent checks.
  - A Removed Snipe is never changed again. If another actor already removed it, the student's tag isn't
    updated.
- **Indistinguishable refusals.** Missing, unrelated, out-of-scope and unpublished Snipes all return the same
  `SN404` / HTTP 404 `{"error":"Snipe not available."}`. An outsider's list is empty.
- **Locks.** The bridge locks the photographer's `students` row and then the `snipe_requests` row. That's the same
  order as the Snipe bridge, `snipe_settle`, the report bridge and the existing `validate_snipe` /
  `validate_snipe_tag` triggers. Scope and status are checked again under both locks.
- **The pending in-chat path is unchanged.** Withdrawing before publication still happens in the conversation's
  Snipe panel through the existing `public.socialu_snipe` bridge.

## Endpoints and metadata

| Endpoint | Input read | Response (`Cache-Control: no-store`) |
| --- | --- | --- |
| `GET /api/snipes/sharing` | optional `?before=<cursor>` (`^[1-9]\d{0,17}$`, otherwise 400) | `{ records, next_cursor }`, at most 20 records, newest Snipe ID first. `next_cursor` is `null` on the last page |
| `PATCH /api/snipes/sharing/[snipeId]` | Snipe ID (`snipeIdParam`; invalid IDs get 404) and body `{ "action": "withdraw" \| "remove" }` only | `{ changed, snipe }`, 200 also on a repeat |

Each record has exactly these fields: `id`, `status` (`approved` / `removed`), `role` (`photographer` /
`tagged`), `submitted_at`, `published_at`, `sharing` (the tagged student's own `approved` / `withdrawn`, `null`
for the photographer) and `action` (`remove` / `withdraw`, `null` once Removed).

These are never returned:

- photo bytes, storage keys or URLs;
- conversation IDs, names or links;
- other people or their answers;
- terminal reasons;
- messages;
- reports;
- rewards.

The UI shows the fixed label *Original conversation*.

The acting student always comes from the verified token. The browser's actor ID, `user_metadata` and any extra
body fields are ignored. Error mapping (`lib/snipe-sharing.ts`, reusing `SnipeError` / `snipeResponse` without
changing `lib/snipe.ts`):

| Code | HTTP |
| --- | --- |
| `SN404` | 404 |
| `SN400` | 400 |
| `42501` | 403 |
| `PGRST202` | 503 `SNIPE_SETUP_REQUIRED` |
| lost connection | 503 network message |
| anything else | 503 generic message |

## How it is built

| Layer | Files |
| --- | --- |
| Migration | `supabase/migrations/20261030040044_snipe_withdrawal_access.sql` (CLI-generated). It adds the private helpers `socialu.snipe_sharing_role` and `socialu.snipe_sharing_record`, with EXECUTE revoked from PUBLIC, anon, authenticated and service_role. It also adds the bridge `public.socialu_snipe_sharing(p_auth_id, p_action, p_snipe_id, p_before)`: SECURITY DEFINER, `search_path = ''`, EXECUTE revoked from PUBLIC, anon and authenticated, and granted to service_role only. There are no table, trigger, view or grant changes to existing objects. `public.socialu_snipe`, `socialu.snipe_view`, `public.socialu_snipe_report` and the admin functions are untouched, and `snipe_view` isn't called because it requires current participation and returns more data |
| Server | `lib/snipe-sharing.ts`: server-only bridge calls and types. Client code imports its types only |
| API | `app/api/snipes/sharing/route.ts` (GET), `app/api/snipes/sharing/[snipeId]/route.ts` (PATCH). No conversation membership guard |
| UI | `components/snipe/snipe-sharing-permissions.tsx` and its own `snipe-sharing-permissions.module.css`, mounted only in `app/messages/page.tsx` (the Messages home). It isn't in the navbar or in conversations. The *Your messages* prompt is unchanged on wide screens. On phones the section follows the conversation list |

The UI is an expandable section, *Your Snipe sharing permissions*, collapsed by default. It doesn't call the API
until it's opened, and the page renders it only for a signed-in student.

- **Refreshing.** It refreshes on open, when the window regains focus and when the tab becomes visible. After a
  change, it uses the returned record and then refreshes. A refresh replaces the list with the fresh first page
  and its own cursor; pages loaded earlier through **Show more** are dropped and can be loaded again. Merging
  them could skip every ID between the two (when more than 20 Snipes were published in between) and would keep
  their old statuses. Statuses can still change between refreshes. That is safe because every action is
  authorized again by the server against the live record.
- **Request cleanup.** A refresh cancels and discards any first-page or **Show more** request still in flight,
  and closing the section or leaving the page cancels all of them, so a late answer can't change the list. A
  Remove/Withdraw already sent isn't canceled (the server applies it either way), but an unmounted record makes
  no follow-up refresh.
- **Each record shows:**
  - *Original conversation* with an Approved or Removed badge;
  - the role (*You took this Snipe* or *You were tagged and approved sharing*);
  - the publication date;
  - for a tagged student, their own sharing permission;
  - the one available control: **Remove Snipe** for the photographer, **Withdraw sharing permission** for a
    tagged student.
- **Confirmation.** The step explains that the photo will disappear from its original conversation for everyone,
  that the change can't be undone and that points already awarded are kept. **Cancel** goes back.
- **While saving.** Both buttons are disabled. A failure shows the message with **Try again**, which is safe
  because a repeat changes nothing.
- **Other states.** Loading on the first open, empty (*You have no published Snipes to manage.*), and a first
  load error with **Try again**. If a later refresh fails, the loaded list stays with *Couldn’t refresh* and
  **Retry**. **Show more** pages with the cursor and shows its own error.
- **Never shown.** Images, links into former conversations, and names.

## Verification (#971)

Final evidence, run by Codex under Node v24.22.1:

- **Focused and existing Snipe tests: passed.** 104 tests in 8 files:
  - new: `__tests__/database/snipe-sharing.test.ts` (1), `__tests__/api/snipe-sharing.test.ts` (29),
    `__tests__/snipe-sharing-permissions.test.ts` (10);
  - existing: `__tests__/api/snipes.test.ts` (32), `__tests__/api/snipe-reports.test.ts` (24),
    `__tests__/database/snipe.test.ts` (3), `__tests__/database/snipe-rewards.test.ts` (4),
    `__tests__/database/snipe-reporting.test.ts` (1).

  The full repository suite (`npm test`) wasn't part of this evidence.
- **TypeScript: passed** with `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
- **Production build: not completed.** `next build --webpack` was attempted and stopped when DNS lookups failed
  for the existing Google Fonts (Pixelify Sans in `app/game-room/dormspace/layout.tsx`, Caveat in
  `components/profile/handwriting.ts`). No withdrawal compile error was reported. A network-enabled retry didn't
  run because its permission approval timed out; that was a timeout, not a safety decision. Fonts, config and
  dependencies weren't changed to work around it.
- **Supabase security advisor: not completed.** `supabase db advisors --local --type security --fail-on error`
  was attempted but couldn't connect: no local Postgres was running at `127.0.0.1:54322` (`ECONNREFUSED`). No
  hosted advisor, migration, deploy or push was run. The available evidence for grants and security settings is
  the PGlite real-schema test below.
- **Browser: not run here.** The root runs integrated browser acceptance of the former-participant controls and
  the final production validation after merging the sibling branches.

**What the tests prove.** SQL behavior against the real schema in PGlite, the static role and confirmation
markup, and the list's request and pagination ordering. They don't prove DOM clicks, focus/visibility events or
concurrent behavior on hosted Postgres.

```bash
node node_modules/typescript/bin/tsc --noEmit --incremental false
npx vitest run __tests__/database/snipe-sharing.test.ts __tests__/api/snipe-sharing.test.ts __tests__/snipe-sharing-permissions.test.ts
npx vitest run __tests__/database/snipe.test.ts __tests__/database/snipe-rewards.test.ts __tests__/database/snipe-reporting.test.ts __tests__/api/snipes.test.ts __tests__/api/snipe-reports.test.ts
npm test                 # full suite: not part of this evidence
npx next build --webpack # needs network for Google Fonts; not completed here
```

### `__tests__/database/snipe-sharing.test.ts`

It uses real SQL in PGlite and applies this migration after `createSnipeDatabase`; the shared helper isn't
changed. It covers:

- **Grants.** Only service_role can execute the bridge, and the helpers are executable by none of the API
  roles. No PUBLIC ACL entry exists. The bridge is SECURITY DEFINER with an empty `search_path`, and browser roles
  can't reach the bridge or the tables.
- **Lock order.** It checks the lock order in the function source only. It isn't a concurrency proof, because
  PGlite serializes.
- **Leaving the group.** A tagged identity-No/sharing-Yes friend who left the group withdraws a published Snipe.
  Before and after, they still get `SC404` from the existing Snipe list, the photo and the chat history.
  Everyone else's photo returns 404.
- **Photographer leaving.** A photographer who left (another student owns the group) removes their Snipe, over
  10 repeated deliveries with exactly one change.
- **Ended friendships.** A former DM friend withdraws after the friendship ended. A current group member whose
  friendship with the photographer ended withdraws too.
- **Refusals.** Unrelated current members, outsiders and wrong-role students get the same `SN404` message as a
  missing Snipe, and outsiders' lists are empty.
- **Unpublished requests.** Pending requests canceled by a departure or a friendship ending stay canceled and
  absent. So do Rejected ones, including the sharing-No tag.
- **Defensive check.** A Removed Snipe with a non-sharing tag doesn't qualify.
- **Repeats.** Repeats and actions after another actor's removal return the stored state without a tag update.
- **Ledger.** The point ledger is identical before and after every action.
- **Responses.** JSON has exact keys and no photo field keys, storage, conversation, person, answer, reason,
  reward or report data.
- **Pagination.** Two pages of 20 + 3 reach all 23 records exactly once, for the photographer and for the tagged
  friend.
- **Invalid requests.** An unsupported action, a NULL action (from the photographer and from a tagged friend), an
  invalid cursor and a wrong-role action all get `SN400`, and the Snipe stays Approved with no tag withdrawn.
- **Account checks.** An inactive account gets `42501`.

### `__tests__/api/snipe-sharing.test.ts`

It uses real `snipeUser` with a mocked Supabase client, like `snipe-reports.test.ts`. It covers:

- only the token's auth ID, cursor, Snipe ID and action are forwarded; body and `user_metadata` identity fields
  are ignored;
- cursor, ID and action validation (including a null action) before any database call;
- sign-in, session, verified email and account lifecycle gates;
- `changed: false` repeats;
- error mapping and `no-store`;
- no anonymous fallback.

### `__tests__/snipe-sharing-permissions.test.ts`

It renders with `react-dom/server` and covers:

- the collapsed initial state with no loading;
- the exact confirmation, status and control text for an Approved photographer and an Approved tagged student;
- disabled saving and **Try again**;
- Removed records with no action;
- no image, link, storage or conversation markup.

It also drives `sharingPager` (the list's request ordering) against a fake server that answers one request at a
time:

- after 30 Snipes are published past two loaded pages, a refresh keeps only the fresh first page and its cursor,
  and **Show more** then reaches every ID once, including the range a merge would have skipped;
- an older record removed by someone else isn't kept with its old status, and comes back Removed when paged to;
- a **Show more** or refresh overtaken by a newer refresh is aborted and its late answer or failure is ignored;
- after `stop()` (closing or unmounting), no late answer changes the list;
- a failure of the current request reaches the caller.

There is no DOM in the test environment, so the focus and visibility listeners themselves aren't exercised.

### Browser acceptance

No browser acceptance test was added, and `scripts/tests/snipe-basic.browser.ts` and its config are unchanged.
The root runs the full browser suite after the branches merge; it hasn't been run for this branch.

Nothing has been applied to a hosted database. Apply this migration after
`20261029184238_snipe_group_reporting.sql`.

## Not in scope

- Group administrator review, decisions and removal (SRS-514.10, 514.12, 514.13, and the administrator part of
  514.1). They're planned for the administrator-review phase.
- Changing an answer while pending, or withdrawing a pending request after leaving. A departure or ended
  friendship already cancels pending requests (SRS-512.7, 512.8).
