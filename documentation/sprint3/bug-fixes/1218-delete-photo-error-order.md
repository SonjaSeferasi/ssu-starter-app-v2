# Bug #1218 — `socialu_delete_photo` told outsiders what kind of message an id was

Owner: Loens Paul / bosspml. Severity: Minor (information disclosure, no data loss).
Requirement: SRS-201.8. Reported by MeriemeSakhs in the Sprint 4 messaging audit.
Branch: `lp/bug-1218-delete-photo-error-order`, merged in
[#1255](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1255).
Migration: `20261116120000_chat_delete_photo_error_order.sql` (SHA-256 `16b8244…`).

## Explanation for class

"When you delete one of your own photos, the database has several reasons it might say no: you are
not in that conversation, the message is not a photo, the photo is already gone, or you are not the
person who sent it. The checks were in the wrong order. It looked at *what the message is* before it
looked at *whether you are allowed to be asking at all*. So a complete stranger who guessed message
ids got one answer for a real photo and a different answer for anything else — and from that
difference they could map out which ids in a conversation they had never been in were photographs."

Nothing in the rules changed. Only the order did: the row is still locked first, then participancy is
decided, and only then is the message itself examined. A message id that does not exist now answers
the same way as a conversation you are not in, which closes the leak in the other direction too — an
outsider could otherwise learn that an id exists by being told it is "not a photo".

## Why there is nothing to see

This fix has **no visible change in the app**. The student who sends a photo sees exactly the same
thing before and after; the only person whose experience changes is someone probing the API from
outside, and what changes for them is that two answers become one. There is no screenshot that would
show that, so the evidence here is the API trace.

## Verified evidence

`1218-evidence/outsider-error-trace.json`, taken November 18, 2026 against
`scripts/tests/chat-evidence-fixture.mjs`, which runs the real Next UI and the real API routes over
the real migrations in a disposable in-memory PGlite database. Only Supabase's Auth and PostgREST
transport is replaced. **The hosted database is never contacted.**

Both runs use the same seed and the same client build. Only the migration differs — the `--without=`
flag added on this branch drops a named migration so a before run can be taken for any fix:

```
node scripts/tests/chat-evidence-fixture.mjs --without=20261116120000   # before
node scripts/tests/chat-evidence-fixture.mjs                            # after
```

**Test 2** then sends `DELETE /api/conversations/1/photos/<messageId>` three times. Test 2 is not a
participant of conversation 1. The three ids are a real photo, a real text message, and an id that
does not exist at all.

| message id | before | after |
| --- | --- | --- |
| `3` — a real photo | 404 `Conversation not available.` | 404 `Conversation not available.` |
| `1` — a real text message | 404 `That photo is no longer available.` | 404 `Conversation not available.` |
| `99999` — does not exist | 404 `That photo is no longer available.` | 404 `Conversation not available.` |

**Before**: two distinguishable answers. Walking the id space tells an outsider which messages in a
private conversation are photographs.

**After**: one answer for all three. Participancy is decided before the message is looked at, so
`SCD01` and `SCD02` are now only ever seen by someone already in the conversation.

## Tests

- `__tests__/database/photo-delete.test.ts` — the existing suite asserted the old behaviour for a
  missing id, so that assertion changes with the fix; two cases are added for a non-participant
  pointing at a text message and at a missing id.
- `__tests__/database/chat-photo-bugs.test.ts` — all six of Merieme's reported cases pass.
- `__tests__/database/chat-former-member-history-access.test.ts` — one expectation updated for the
  same reason.

## Hosted migration

`20261116120000` was applied to the hosted project and recorded, under the usual procedure:
read-only probe, SHA-256 of the editor content checked against the committed file, a dry run inside a
rolled-back transaction, the rollback verified clean, then applied and verified — the function's
grants unchanged, nothing reachable by `anon` or `authenticated`.
