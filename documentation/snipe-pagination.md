# Snipe — conversation request pagination (SRS-512.1, 512.3, 512.11, DP)

## The gap

The conversation Snipe list (`public.socialu_snipe`, action `list`) returned the newest 50 requests visible
to the student and had no cursor. Once more than 50 newer requests were visible to the same student, every
older one became unreachable, including a request that was still Pending and waiting for that student's
answer. One way this happens: 51 different photographers each tag the same friend in one group. Each pair is
separate, so cooldowns don't prevent it. The oldest request then could not be reviewed in the panel.

The basic slice's requirement map ([`snipe-basic.md`](snipe-basic.md)) listed 512.1 – 512.3 as done from
the list view. That implied the list was complete, which it wasn't. It now links here.

## Requirement and card mapping

| SRS | GitHub issue | Status | Where |
| --- | --- | --- | --- |
| 512.1 | #647 | Done | Every visible request in the conversation can be reached: newest 50 first, then “Show older Snipes” |
| 512.3 | #649 | Done | Older pages return the same full `snipe_view` entries (each tagged friend's separate answers, the student's own answer forms) |
| 512.11 | #657 | Done | An older still-Pending request can be reached and answered; it is never hidden by newer ones |

Project cards: #622 and #777 to #780 cover these issues. Tracking: parent #647 SRS-512.1, tasks #974–#976.

## What changed

| Layer | Files |
| --- | --- |
| Migration (additive) | `supabase/migrations/20261030093802_snipe_request_pagination.sql` |
| API route | `app/api/conversations/[id]/snipes/route.ts` (GET reads an optional `before`) |
| Pager (client-safe, pure) | `lib/snipe-list-pagination.ts` |
| UI | `components/snipe/snipe-panel.tsx` (“Show older Snipes”), one rule in `components/snipe/snipe.module.css` |

No new tables, columns, indexes, triggers, views, grants, environment variables, dependencies or navigation
entries. `lib/snipe.ts` is unchanged: its existing SN400 mapping already returns 400 with the database message.

### Database

`CREATE OR REPLACE` of `public.socialu_snipe` with the same signature, `SECURITY DEFINER`, empty `search_path`
and service_role-only EXECUTE. The function is copied from `20261029182808_snipe_rewards.sql` (its latest
definition) byte for byte, except for four new list variables and the list branch itself. The account check
(`socialu_require_student`) and the strict current-participant check still run first, and `snipe_settle` still
runs before the list is read. `prepare`, `create`, `respond`, `withdraw`, `remove` and `photo` are unchanged.
`socialu.snipe_view` and the role, settle, target and reward helpers are not redefined. The same goes for the
report, moderation and sharing bridges.

The list action reads an optional `p_payload.before`:

- **Absent:** first page (the previous behavior, plus `next_cursor`).
- **Present:** it must be a JSON string matching `^[1-9][0-9]{0,17}$`. JSON null, numbers, booleans, arrays,
  objects, empty and other strings are refused with SN400.
- **The anchor row:** the ID must name a stored request in **this** conversation that this student can see
  **now** (`socialu.snipe_viewer_role` not NULL). A missing ID, an ID from another conversation and a request
  hidden from this student all get the same SN400 message: *These Snipes could not be loaded. Refresh and try
  again.* That way the refusal reveals nothing about hidden requests.
- **Position:** the next page holds the requests with `(submitted_at, snipe_id) < (anchor.submitted_at,
  anchor.snipe_id)`, ordered by both descending. The timestamp is read from the stored row, never from the
  browser. `submitted_at` is immutable (`validate_snipe`), and `snipe_id` breaks ties between equal timestamps.
- **Visibility before the limit:** the visibility filter runs before `LIMIT 51`. Requests hidden from the
  student are never returned, counted or used as the cursor.
- **Response:** at most 50 full `snipe_view` entries plus `next_cursor`. The cursor is the last returned ID,
  and only when a 51st visible request exists; otherwise it is NULL. There is no total and no placeholder.
  Every page still carries `student_id`, `kind`, `rewards` and `targets`, so older clients keep working.

Index: the existing `snipe_conversation(conversation_id, submitted_at)` serves the ordered range. `snipe_id`
only orders ties, and the per-row visibility check has to run either way, so no new index is added.

### API

`GET /api/conversations/{id}/snipes?before={snipeId}`. Sign-in, the live session, the account lifecycle and the
conversation ID are checked first, as before. Then `before` is checked once against the same Snipe ID format.
A malformed value returns 400 with the same message as the database, and no database call is made. Only
`{ before }` is forwarded. Any `student_id`, `p_auth_id`, timestamp or other query field is ignored, and the
student always comes from the verified token. Without `before`, the RPC payload is still `{}`. Responses
remain `Cache-Control: no-store`. POST (prepare, upload, create) is unchanged and never reads `before`.

### UI and refresh semantics

- **When the button shows:** “Show older Snipes” appears after the cards only while the latest response has a
  `next_cursor`. A server that predates pagination sends no cursor, so the button never shows.
- **Loading and errors:** while loading, the button is disabled and `aria-busy`. A failure shows an alert and
  *Try again*.
- **What an older page changes:** it appends only Snipes, skips any ID already shown or repeated within the
  page itself, and keeps order. The student, kind, rewards balance and targets stay those of the current first
  page. A page whose requesting cursor no longer matches the list's cursor is not applied and does not mark
  the list as extended, so it never pauses automatic updates.
- **Fresh first page:** every fresh first page replaces the whole list and its cursor. That covers opening,
  automatic updates (when not paused, below), Refresh, retry, after a submission, after a change or decision,
  reopening the panel after older pages were shown, and reloading. It also cancels or discards any older-page
  request in flight. Older pages loaded earlier are dropped, not merged. Newer requests could have pushed the
  first page past them, so merging would skip requests in between, and their states could be out of date. The
  student pages again from the fresh cursor.
- **Automatic updates pause while older pages are shown or loading:** the 20 s poll and the refresh when the
  tab becomes visible again make no request then (`snipeListPager().poll()` returns null), so an older card the
  student is answering is not replaced mid-answer and a loading older page is not discarded. Under the heading
  the panel says: *Older Snipes are shown, so this list won’t update on its own. Select Refresh to check for
  updates.* Refresh, retry, a submission, a change or decision (each of which reloads from the server, which
  checks authorization again) and reopening the panel still load a fresh first page, after which automatic
  updates resume. Saving an answer still updates only that card from the server's response, as before. If
  “Show older” fails or the panel is closed while it loads, nothing was appended and updates resume.
  Consequence: while paused, statuses and the points balance shown can be out of date until the student
  selects Refresh. After a membership loss the panel hides itself at the student's next list request (Refresh,
  Show older, or a reload after an action) rather than at the next poll; until then every photo, answer and
  other request is still refused by the server, which checks membership on each one.
- **Stale results:** each fresh first page and each stop starts a new generation (`snipeListPager`), so late
  results and late errors are discarded. This covers a refresh racing “Show older”, a superseded first page,
  a closed panel, an unmounted panel and a changed conversation. A first page that lands while “Show older” is
  in flight also drops that request, because it was based on the list being replaced.
- **Changing conversation:** the panel keeps one pager per conversation. When the conversation changes, the
  previous conversation's list, photos and cursor are cleared at once.
- **Closing and unmounting:** closing aborts older-page requests, while a first page in flight completes as
  before. Reopening after older pages were shown loads a fresh first page. Unmounting aborts everything.
- **Membership loss:** a 404 on either request type hides the panel and clears the list, so no photo stays on
  screen.
- **Unchanged behavior:** the first-load participant check runs before the panel is opened, as before. Polling
  still runs only while the panel is open and the tab is visible. Also unchanged: the report queue's revision,
  administrator removal, and every card, answer form, report form and Composer behavior.

Known limit: a request whose transaction started before an earlier page's anchor but committed after it gets
an older `submitted_at`. A cursor that was already handed out never reaches it, but the next fresh first page
(the next unpaused poll, or Refresh) does.

## Security notes

- The actor is derived only from the verified token. The cursor names a stored row, and its position is
  re-derived on every call.
- Authorization comes first. Outsiders, departed members and non-existent conversations get SC404, and inactive
  or reverification-required accounts get 42501, whatever the cursor (valid, hidden or malformed).
- Nothing about hidden requests can be observed: they are not returned or counted, they never become the
  cursor, and using one as the anchor gives the same error as a missing ID.
- No points, rates or answers change, and there is no raw schema or storage grant.

## Test coverage

First focused run (Codex): 35 of 36 passed (database 1, API 22, pager file 12 of 13); one pager test failed because an overlapping
older page that repeated ID 100 within itself kept the duplicate. The pager now deduplicates against both the
shown list and the incoming page, and a cursor-mismatch regression test was added. Not re-run after that fix.

- `__tests__/database/snipe-pagination.test.ts`: real migrations in PGlite (`createSnipeDatabase(61)`, then the
  sharing migration, then this one).
  - **The scenario:** 51 photographers tag one reviewer, with hidden Pending requests interleaved before, between
    and after. The first page holds the newest 50 and a cursor. The older page reaches the oldest Pending request.
  - **The old request still works:** the reviewer views its photo and answers it, it is published, and the
    photographer is credited 25 points once.
  - **Ordering and boundaries:** filter before limit. Ties share one `submitted_at` (test-only replica-role
    fixture) with the page boundary inside the tie. The 50 vs 51 boundary is tested exactly, and no ID repeats.
  - **New requests between page requests:** a cursor already handed out stays stable. A fresh walk reaches all
    54 requests, with nothing from another conversation.
  - **Uniform SN400:** for hidden, missing and other-conversation anchors and for 21 malformed values, explicit
    JSON null included. A member cannot use a request still Pending for others as the anchor.
  - **Authorization first:** for outsider, departed and deactivated accounts. Grants and owner settings are
    unchanged.
  - **Preservation:** `pg_get_functiondef` before and after. The header, the setup and the whole core from
    `IF p_action IN ('prepare', 'create')` must match byte for byte. Every other function in `public` and
    `socialu` (including `snipe_view` and the report, moderation and sharing bridges), every relation and its
    grants, every policy and schema grant must be unchanged. Without a cursor, the response must equal the
    previous function's response plus `next_cursor`. PGlite runs one connection, so this is not a concurrency
    proof.
- `__tests__/api/snipe-pagination.test.ts` (mocked Supabase): the default payload `{}` is unchanged; only a valid
  `before` is forwarded; injected actor and timestamp fields are ignored; 17 malformed URL values return 400 with
  no call; auth, session, account and conversation ID are checked first; SN400 maps to 400 and SC404 to 404 with
  no detail; responses are no-store; POST never forwards `before`.
- `__tests__/snipe-pagination.test.ts`: static markup of the control (absent, idle, loading, failed) and the
  collapsed panel. The pager is tested against a fake server: first page plus Show older reaches the old Pending
  request, the first page's metadata is kept, dedup (including IDs repeated within one page) and order hold, a
  page whose cursor no longer matches neither changes the list nor pauses updates, and a reset after more than 50 new Snipes
  skips nothing. It also checks that late results and failures are discarded after a refresh, a superseded page,
  closing, stop and a conversation change, and that a 404 reaches the caller. Pause regressions: once an older
  page is shown, polls make no request and leave the oldest Pending card in place while newer Snipes arrive;
  an explicit refresh replaces the list and polls resume; a poll during “Show older” loading neither aborts nor
  discards it; a failed or closed “Show older” and stop un-pause; a poll is skipped while a first page is in
  flight. The panel's own wiring (interval, visibility listener, the status text) is not rendered in these
  tests: there are no DOM clicks and no browser run here.

Commands (for Codex to run):

```bash
npx vitest run __tests__/database/snipe-pagination.test.ts __tests__/api/snipe-pagination.test.ts __tests__/snipe-pagination.test.ts
npx vitest run __tests__/api/snipes.test.ts __tests__/database/snipe.test.ts __tests__/database/snipe-rewards.test.ts \
  __tests__/database/snipe-reporting.test.ts __tests__/database/snipe-admin-review.test.ts __tests__/database/snipe-sharing.test.ts \
  __tests__/api/snipe-reports.test.ts __tests__/api/snipe-moderation.test.ts __tests__/api/snipe-sharing.test.ts \
  __tests__/snipe-sharing-permissions.test.ts
npx tsc --noEmit
```

## Not performed

- No hosted migration, Supabase advisor run, deployment or other external change. The local Supabase advisor is
  unavailable (no local Postgres on 54322).
- No full-repository suite, production build or browser run is claimed here. The existing network-font build
  issue is already recorded elsewhere.
