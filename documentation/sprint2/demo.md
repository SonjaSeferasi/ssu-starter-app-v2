# Sprint 2 — five-minute demo — Linh Nguyen

Selected item: SRS-114.7, LN — Friend-request notification (#506), tracing to UR-114.

## Before presenting

Use one laptop and one integrated checkout containing merged PR #501. Start the app with the project's normal local environment. Never put tokens, passwords, or `.env.local` on the projector or in evidence. Use two authorized university test accounts in separate browser profiles, or have a teammate use the second account. Do not create a fake notification through SQL and call that an end-to-end demonstration.

Confirm all required migrations, including `20261022050000_integrate_notifications_with_main.sql`, are applied. Prepare an eligible pair: not already friends, no pending request, no block, both verified and active. Do not delete classmates' real friendships just to prepare a demo.

## Presentation script

| Time | Screen/action | What to say |
| --- | --- | --- |
| 0:00–0:40 | Open the Linh Nguyen - Sprint 2 view and #506 | “My requirement is SRS-114.7. When a new friend request is saved, the recipient must receive a notification. It traces to UR-114.” |
| 0:40–1:15 | Expand the five sub-issues | “This is a vertical slice: database notification, authenticated API, bell/list UI, automated tests, and live evidence.” |
| 1:15–2:10 | As Student A, open Student B's profile and click Add friend | “The API uses the authenticated sender identity. The database stores the pending request and its recipient notification in the same transaction.” |
| 2:10–3:15 | Switch to Student B, refresh/focus the app, show the bell, click it | “This notification belongs to Student B. It identifies the sender and opens the sender's profile. The badge counts unread notifications.” |
| 3:15–3:50 | Reload the recipient's notification page | “It remains after a reload because it is persisted, not just temporary browser state. Opening the list marks notifications read, so the badge can clear while the list remains.” |
| 3:50–4:30 | Show API and database test evidence | “API tests mock the provider; the database test runs the actual schema and migrations in a disposable database. They do not replace this live demonstration.” |
| 4:30–5:00 | Show merged PR #501 and screenshot on #506 | “This runs from the integrated repository. Any remaining acceptance work stays open; I have not recreated earlier board history.” |

The bell polls every 30 seconds and refreshes on window focus. If testing in two profiles, return focus to Student B's window or reload. A request that existed before notification creation was deployed may not produce a historical notification; use a new eligible request.

## Required screenshot

Capture Student B's real `/notifications` page showing a sender and **sent you a friend request**, with the application context visible. The screenshot must not be the empty state, a mockup, test-output terminal, or GitHub board. Use authorized test identities. Attach it to SRS issue #506 with the date, integrated commit, and brief reproduction steps. Record the screenshot path in the submission once available.

An additional board screenshot should show the separate Sprint 2 tab, four Product Backlog SRS cards, the one selected SRS card with its task progress, and truthful statuses.

## If something fails

- Missing RPC / backend error: confirm the additive compatibility migration is installed; record the failure and keep #511/#506 open.
- No notification: verify eligibility, the current recipient account, whether the request is new, and successful API responses. Do not invent delivery evidence.
- Already pending or already friends: choose a different authorized test pair; don't send duplicate requests.
- Unable to finish: demonstrate what works, state the exact remaining gap, and return unfinished work to Product Backlog when the sprint ends.

You must personally attend demo day to receive assignment credit.
