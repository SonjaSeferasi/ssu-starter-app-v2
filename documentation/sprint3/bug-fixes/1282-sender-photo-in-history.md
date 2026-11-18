# SRS-211.2 — show each sender's profile picture with their messages

Owner: Loens Paul / bosspml.
Requirement: SRS-211.2 ([#1282](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1282)).
Branch: `srs-211.2-display-sender-profile-picture`, merged in
[#1338](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/1338).
Migration: `20261117050000_chat_sender_photo_in_history.sql` (SHA-256 `de1f8a0…`).

## Explanation for class

"Every avatar in a conversation was the same generic placeholder, and not because the page was lazy:
`socialu_conversation_messages` returned each sender's name and username and nothing else. The page
had nothing to show even if it wanted to."

The migration adds one field to the `senders` block — and it adds the storage **key**, not a link.

## The photo travels as a key, never a link

The `media` bucket is private, and only the server holds the credentials to sign a link into it. That
is the same reason chat photos themselves come back as keys (`20261103130000`).

`lib/chat-sender-photos.ts` swaps each key for a signed link and **removes the key** rather than
adding beside it:

```ts
export function applySenderPhotoUrls(senders, signed) {
  // destructures photo_key OUT, so it cannot survive into the response
}
```

So a response cannot leak a private object path even if the page ignores it. That is checked against a
running server, not only in the unit test — see the evidence below.

Keys are signed in **one batch**. A group can hold a dozen senders, and a dozen round trips before the
history returns would be felt. A key that cannot be signed leaves that sender without a photo rather
than failing the whole history: one placeholder is a gap, an error is the conversation not loading.

## What deliberately did not change

**Who is in the `senders` map.** #1222 narrows it, for a former member, to the people whose messages
they may still read. That `WHERE` clause is untouched, and the database test asserts the boundary
still holds — a sender who spoke only after the student left is still absent, photo or no photo.

## Two judgement calls, both flagged in the code

**One photo per run.** The photo is shown on the first message of each run from another student, the
same rule the sender name already follows, so a burst of five messages is not a column of five
repeated faces. The space is held for the rest of the run, so the bubbles stay in line. It follows
that rule in private conversations as well as groups — a *name* is a group-only affordance, a *face*
is not.

**Not on the student's own messages.** The requirement is about knowing who sent a message, and your
own side already reads "You". It is one line to change if the team disagrees.

## Verified evidence

Taken November 18, 2026 against `scripts/tests/chat-evidence-fixture.mjs` — the real Next UI and the
real API routes over the real migrations in a disposable in-memory PGlite database. Only Supabase's
Auth and PostgREST transport is replaced. **The hosted database is never contacted.**

### The slot, and the one-per-run rule

![One avatar per run of messages from the same sender](1282-evidence/01-one-avatar-per-sender-run.png)

Test1 is signed in, in the `CSC 281 Project` group. Test 2's message and Loens's message each carry a
sender slot; Test1's own message on the right carries none.

**What this screenshot cannot show, stated plainly:** the avatars here are the placeholder, not real
photographs. The fixture serves **no Supabase Storage**, so `createSignedUrls` always yields a null
link and the page correctly falls back to the placeholder. The `<img>` path itself is not exercised
here; it is covered by `__tests__/chat-sender-photos.test.ts`. What the fixture *does* prove is the
layout rule above and the leak check below.

### The key does not reach the browser

`1282-evidence/senders-payload.json` — `GET /api/conversations/3/messages`, read as Test1 against the
running fixture:

```json
"senders": {
  "1": { "name": "Loens", "username": "loens", "photo_url": null },
  "2": { "name": "Test1", "username": "test1", "photo_url": null },
  "3": { "name": "Test 2", "username": "test2", "photo_url": null }
}
```

`photo_key` appears **nowhere** in the response — not in `senders`, not anywhere else in the body.
That is the security property the destructuring above exists to guarantee, confirmed against a real
response rather than argued from the code.

## Tests

- `__tests__/chat-sender-photos.test.ts` — 6 tests for the mapping, including that the key cannot
  survive into the response, and that an unsignable key leaves that one sender without a photo instead
  of failing the history.
- `__tests__/database/sender-photo-in-history.test.ts` — one database scenario for the key coming
  back, the null for a student with no photo, and the #1222 former-member boundary holding.

50 tests green across 9 chat files at the time of merge.

## Hosted migration

`20261117050000` was applied to the hosted project and recorded: read-only probe, SHA-256 of the
editor content checked against the committed file (`de1f8a0…`), a dry run inside a rolled-back
transaction, the rollback verified clean, then applied and verified — `photo_key` present in the
`senders` block, the `WHERE` clause from #1222 unchanged, and nothing granted to `anon` or
`authenticated`.
