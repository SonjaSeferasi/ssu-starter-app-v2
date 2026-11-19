# RLS, LP, Secure the messages table

Paste the sections below into the GitHub issue. The issue title is this file's heading.

---

## Table

`socialu.messages` — the row that holds one chat message.

**Owner column:** `sender_id` (`BIGINT` → `socialu.students.student_id`).

`sender_id` is not a UUID, so a policy cannot compare `auth.uid()` to it directly. The helper
`socialu.rls_current_student()` turns the signed-in `auth.uid()` into that student's
`student_id`, using the same active / verified / not-awaiting-reverification gate the app's
`socialu_require_student` already applies.

## Rules

| Operation | Who may do it | Which rows |
|---|---|---|
| **select** | signed-in students (`authenticated`) | Messages of a conversation the student belongs to. Private: either side of the pair. Group: only messages sent inside that student's own membership window (`joined_at` ≤ sent ＜ `left_at`). A student always sees their own message, whether its status is `sent` or `failed`. |
| **insert** | signed-in students (`authenticated`) | Only a row whose `sender_id` is that student **and** whose conversation they are a *current* participant of. |
| **update** | nobody | No policy. The app never updates a message — the only writes in `supabase/migrations` are four `INSERT` sites (send text, emoji, reply, photo). |
| **delete** | nobody | No policy. The app hides messages instead (`socialu.deleted_messages`, `socialu.hidden_messages`); it never removes the row. |
| **anything** | logged-out visitor (`anon`) | Nothing. No policy names `anon`, so a visitor matches no row at all. |

**Traces to:** SRS-213.5 (who may read a message, including the former-member history window
restored in #1222), SRS-213.1 (missing and forbidden must look the same), SRS-201.1 / SRS-209.4
(who may send and reply), SRS-NFR-26.

The select rule is the same rule the app already enforces in `socialu.can_read_message`. It is
restated against the row's own columns rather than by calling that function, because
`can_read_message` selects `FROM messages`, and a policy on `messages` that queries `messages`
recurses forever.

## Before we could attack it at all

SocialU keeps every table in the private `socialu` schema, and the hosted project exposes only
`public, graphql_public`. An anon-key request was refused by PostgREST before it ever reached a
row:

```
{"code":"PGRST106","hint":"Only the following schemas are exposed: public, graphql_public",
 "message":"Invalid schema: socialu"}
```

So the attack tests would have passed before any fix, which proves nothing.
`supabase/rls-messages-00-expose.sql` puts `socialu.messages` into the ordinary Supabase posture
the assignment assumes — reachable over the Data API, no row rules yet — scoped to that one
table. Every other `socialu` table still answers "permission denied", because `anon` and
`authenticated` are granted nothing on them.

## Files

| File | What it does |
|---|---|
| `supabase/rls-messages-00-expose.sql` | Step 0 — makes the hole real, so the "before" tests genuinely fail. |
| `supabase/rls-messages.sql` | Step 1 — the fix: enables RLS, three helper functions, one select policy, one insert policy, no update or delete policy. |
| `supabase/rls-messages-verify.sql` | Step 2 — `pg_class` and `pg_policies` checks for screenshot 2. |
| `supabase/rls-messages-reset.sql` | Undo, if the demo has to start over. |
| `__tests__/security/rls-suite.ts` | The attacks, anon key only. |
| `__tests__/security/messages.rls.test.ts` | Runs the suite against `messages`. |

## Attacks

Seven tests, all with the **anon key**. The service-role key appears only in `beforeAll` /
`afterAll` to seed and clean up — never inside a test, because it bypasses RLS and would prove
nothing.

Three students are created: **Alice** (sends the message), **Bob** (in the group), **Carol**
(not in the group).

| # | Attack | Must end as |
|---|---|---|
| 1 | A logged-out visitor lists `messages` | nothing returned |
| 2 | Carol reads a message from a group she is not in | nothing returned |
| 3 | Bob edits Alice's message | refused, stored text unchanged |
| 4 | Bob inserts a message signed `sender_id = Alice` | refused |
| 5 | Carol inserts a message into the group | refused |
| 6 | Bob reads the group he *is* in (the app still works) | one row returned |
| 7 | Bob deletes Alice's message | refused, row survives |

## How each policy blocks each attack

- **1** — no policy names `anon`, so a logged-out visitor matches no row. RLS denies by default.
- **2** — the select policy's `USING` calls `rls_may_read_in`, which finds no membership row for
  Carol in that conversation, so the row is invisible. She gets an empty list, not an error,
  which is what SRS-213.1 asks for: missing and forbidden look the same.
- **3** — there is no update policy at all, so no row is updatable by anyone through the Data API.
- **4** — the insert policy's `WITH CHECK` requires `sender_id = rls_current_student()`. Bob's
  student id is not Alice's, so the check fails.
- **5** — the same `WITH CHECK` also requires `rls_is_current_member`, and Carol holds no
  membership row, so it fails on that half instead.
- **6** — Bob's membership row covers the time the message was sent, so `rls_may_read_in` returns
  true and the row is visible. The rules do not lock out the people they are for.
- **7** — there is no delete policy, so no row is deletable through the Data API.

## Evidence

- [ ] Screenshot 1 — `npm run test:security` failing, **before** `rls-messages.sql`
- [ ] Screenshot 2 — `rls-messages-verify.sql` output: RLS on, two policies listed
- [ ] Screenshot 3 — `npm run test:security` passing, **after** `rls-messages.sql`

## Branch and pull request

- Branch: `rls-messages-table`
- Pull request description includes `Closes #<issue number>`

## One thing to raise

The assignment says to pick a table **in the `public` schema**. SocialU has none — every table
the app created lives in `socialu`, reached only through `SECURITY DEFINER` functions in
`public`. Worth a line on the card and a word to the instructor at demo, since it changes what
"before the fix" means for this app.
