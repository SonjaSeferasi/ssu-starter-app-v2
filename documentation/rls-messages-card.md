# RLS, LP, Secure the messages table

Issue #1384. Body for the card; the heading is the issue title.

Follows the method a teammate set in #1382 (RLS on `socialu.events`): the attacks run on PGlite, an
in-memory Postgres built from the real schema, as the `anon` and `authenticated` roles. Nothing is done
to the hosted project, so the tests run on any laptop at demo time.

---

## Table

`socialu.messages` — the row that holds one chat message.

**Owner column:** `sender_id` (`BIGINT` → `socialu.students.student_id`).

`sender_id` is not a UUID, so a policy cannot compare `auth.uid()` to it directly.
`socialu.rls_student_id()` — the helper #1382 introduced — turns the signed-in `auth.uid()` into that
student's id, and returns null for anyone signed out, suspended, unverified or awaiting reverification.

## Rules

| Operation | Who may do it | Which rows |
|---|---|---|
| **select** | signed-in students (`authenticated`) | Messages of a conversation I belong to. Private: either side of the pair. Group: only messages sent inside one of my own membership periods, so someone who left keeps the history they could read while they were in it. I always see my own message, sent or failed. |
| **insert** | signed-in students (`authenticated`) | Only a row whose `sender_id` is me, and only in a conversation I am a *current* participant of. |
| **update** | nobody | No policy. The app never edits a message — the four `INSERT` sites in `supabase/migrations` are the only writes it makes to this table. |
| **delete** | nobody | No policy. The app hides messages (`socialu.deleted_messages`, `socialu.hidden_messages`) so a reply still has something to point at (SRS-209.6). It never removes the row. |
| **anything** | logged-out visitor (`anon`) | Nothing. No policy names `anon`, so a visitor matches no row at all. |

**Traces to:** SRS-213.5 (who may read a message, including the former-member history window restored in
#1222), SRS-213.1 (missing and forbidden look the same), SRS-201.1 / SRS-209.4 (who may send and reply),
SRS-NFR-26.

The select rule is the rule the app already enforces in `socialu.can_read_message`. It is restated against
the row's own columns rather than by calling that function, because `can_read_message` selects
`FROM messages`, and a policy on `messages` that queries `messages` recurses forever.

Cross-school isolation is not repeated in the policy. A membership or private pair cannot span two schools
in the first place — `socialu.require_same_school_pair()` refuses such a row on the way in — so belonging to
the conversation already implies the same school.

## Files

| File | What it does |
|---|---|
| `supabase/migrations/20261119130000_messages_rls.sql` | The fix: three helpers, RLS on, one select policy, one insert policy, no update or delete policy. |
| `__tests__/security/messages.rls.test.ts` | The attacks, on PGlite, as `anon` / `authenticated`. |
| `scripts/verify-messages-rls.mjs` | Prints the `pg_class` / `pg_policies` checks for screenshot 2. |

## Attacks

Twelve tests. Five students: **Alice** (sends the message under attack), **Bob** (in the group),
**Carol** (in no conversation), **Dana** (in the group, email not verified), **Erin** (was in the group,
left two days before the message).

The setup grants `anon` and `authenticated` full DML on `socialu.messages` first, so the table is as
exposed as a table in the `public` schema would be. That is the worst case the policies have to survive.

| # | Attack | Must end as | Fails before the fix? |
|---|---|---|---|
| 1 | A logged-out visitor lists `messages` | nothing returned | yes — read 3 |
| 2 | Carol reads a group she is not in | nothing returned | yes — LEAK |
| 3 | Dana (unverified) reads the group | nothing returned | yes — read 3 |
| 4 | Erin reads a message sent after she left | nothing returned | yes — LEAK |
| 5 | Bob edits Alice's message | stored text unchanged | yes — TAMPERING |
| 6 | Bob inserts a message signed `sender_id = Alice` | refused | yes — IMPERSONATION |
| 7 | Carol inserts into the group | refused | no — see below |
| 8 | Erin inserts into the group she left | refused | no — see below |
| 9 | Bob deletes Alice's message | row survives | yes — DESTRUCTION |

Then three checks that the app still works: a member reads the conversation, a former member still reads
the history from her own membership period, and a member can still send as themselves.

**7 and 8 already pass before the fix**, and the test file says so. The app's own `validate_message`
trigger refuses a sender who is not a current participant, whatever RLS says, so those two prove the
trigger, not the policy. They are kept as regression guards. Attack 6 is the one that proves the insert
policy: there the sender *is* a current participant, so only `sender_id = my own student id` stops it —
and before the fix it goes straight through.

## How each policy blocks each attack

- **1** — no policy names `anon`, so a logged-out visitor matches no row. RLS denies by default.
- **2, 3, 4** — the select policy's `USING` calls `rls_in_conversation_at(conversation_id, sent_at)`. Carol has no membership row; Dana's `rls_student_id()` is null because her email is unverified; Erin's membership period ended before the message was posted. Each gets an empty list rather than an error, which is what SRS-213.1 asks for.
- **5** — there is no update policy at all, so no row is updatable through the Data API.
- **6** — the insert policy's `WITH CHECK` requires `sender_id = rls_student_id()`. Bob's id is not Alice's.
- **7, 8** — the same `WITH CHECK` also requires `rls_current_participant`, which neither holds. (`validate_message` refuses them first either way.)
- **9** — there is no delete policy, so no row is deletable through the Data API.

## Evidence

| Screenshot | File | Shows |
|---|---|---|
| 1 — before | `documentation/evidence/rls-messages-1-before.png` | 7 failed, 5 passed; LEAK ×4, TAMPERING, IMPERSONATION, DESTRUCTION |
| 2 — RLS on | `documentation/evidence/rls-messages-2-policies.png` | `relrowsecurity = true`, two policies, both `{authenticated}` |
| 3 — after | `documentation/evidence/rls-messages-3-after.png` | 12 passed, exit 0 |

Screenshot 1 was taken with `20261119130000_messages_rls.sql` moved out of `supabase/migrations/`; the test
looks the fix up by filename, so with it absent the table is unprotected and the attacks land.

## Branch and pull request

- Branch: `rls-messages-table`
- Pull request description includes `Closes #1384`
