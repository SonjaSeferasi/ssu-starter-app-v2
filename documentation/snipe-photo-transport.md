# Snipe — private large-photo transport (SRS-510.2, DP)

Branch: `srs-510.2-private-photo-transport`. Migration: `supabase/migrations/20261030034841_snipe_photo_transport.sql`.

## Why

The approved photo policy (Appendix B-06, [`snipe-basic.md`](snipe-basic.md)) allows JPEG/PNG up to
10,000,000 bytes and 4096 × 4096 pixels. The basic slice sent the photo as a multipart body to a Next.js route,
but a hosted function request body is capped at 4.5 MB, so large photos could not be submitted when hosted.
The policy is **not** reduced. Instead, the original photo goes from the browser directly to private Storage,
and the app only receives small JSON.

## Flow

1. **Begin** — `POST /api/conversations/:id/snipes/uploads`, JSON only (≤ 8 KB, never a form or image):
   `{ submissionKey, targets, digest, mimeType, byteCount }`. `digest` is the SHA-256 of the ORIGINAL file,
   computed in the browser. The route verifies the session and account, checks the declared type and size
   against the policy, and calls `public.socialu_snipe_photo('begin')`, which first runs the core
   `socialu_snipe('prepare')` (membership, friendship, cooldowns, retry identity) and then records one ticket.
   The browser receives an opaque 256-bit `ticket` (the database stores only its SHA-256) and an
   upload-only URL from `createSignedUploadUrl(stagingKey, { upsert: false })`.
2. **Upload** — the browser `PUT`s the original file to that URL. It goes straight to Storage, never through
   the app, so the function body cap does not apply.
3. **Finalize** — `POST /api/conversations/:id/snipes/uploads/finalize`, JSON `{ ticket }`. The route
   claims the ticket (short exclusive lease), downloads the staged ORIGINAL with the server key, reads at most
   the declared byte count, and requires the exact size and SHA-256 declared at begin. It then runs the
   existing strict decoder (`validateSnipePhoto`: signature sniffing, header and pixel limits, `failOn:
   'warning'`, declared type must match, full decode and re-encode, metadata such as GPS removed). The
   re-encoded copy is uploaded to a new attempt-specific committed key
   (`snipe/<auth>/<submission>/<digest>/<attempt>.<ext>`, `upsert: false`) and accepted with
   `socialu_snipe_photo('accept')`, which calls the core `socialu_snipe('create')` in the same transaction.
   Membership, friendship, cooldowns and the submission key are therefore rechecked at acceptance, and every
   existing reward rule and trigger applies unchanged.

The UI (`components/snipe/snipe-panel.tsx`) uses only begin → PUT → finalize. The multipart `POST
/api/conversations/:id/snipes` route is kept unchanged on purpose as a legacy path for a browser still running
the previous bundle during a deploy. It is tested, but hosted it only works for bodies under 4.5 MB.

## Ticket binding and states

A ticket (`socialu.snipe_photo_stages`) is bound to the verified Auth user, the conversation, the submission
key, the sorted unique tag list, the original digest, the MIME type and the byte count. Only the ticket hash
crosses back from the browser; every other value comes from the row. A ticket of another account or another
conversation is answered exactly like a missing one (`SP404`).

| State | Meaning |
| --- | --- |
| `open` | Waiting for the upload / a finalize |
| `finalizing` | One finalize holds a 3-minute claim; others get `SP409` (“already being checked”) |
| `accepted` | The Snipe exists; repeating finalize or begin returns it (`created: false`) |
| `rejected` | Terminal: decoder rejection (`SP422`, reason kept), a definite database rejection at claim or accept (e.g. `SN422`, `SN429` with cooldown details), or a ticket whose upload URL could not be issued |
| `expired` | Terminal: the 30-minute finalize deadline passed (`SP410`), even if the bytes were uploaded |

Retries. The same key with the same selection and the same original reuses the live ticket: a new ticket
replaces the old one (which stops working) and the staging object is kept. If Storage refuses to sign that
existing upload-once key, begin returns `upload: null` and the browser goes straight to finalize. Any change of
photo, tags, size, type or conversation under the same key is `SN409`, whether the earlier attempt is staged or
accepted: after acceptance, begin returns the saved request only when the core `prepare` matches (conversation,
tags in any order, digest) and every kept ticket of that key also has the same declared type and exact size. A
submission accepted through the legacy multipart route has no ticket, so it is returned as before. After a
terminal ticket, the same submission may begin again with a new ticket and staging object.

Concurrency. Begin, claim and accept lock the photographer row first (the lock the core create takes), then
the ticket. Only the current claim holder can accept, and only while its lease is live, so a finalize that
overran its lease cannot commit. The core create and the unique submission key prevent duplicate Snipes;
a duplicate accept answers `created: false` with `same_upload`.

Committed objects. Exactly the legacy rules: a definite database answer (any SQLSTATE, or a committed
`rejected` / `expired` / `retry` outcome) removes that attempt's committed copy; an uncertain answer (lost
connection) keeps it (and the staged original) for reconciliation; `created: false` removes the copy only
when the database confirms `same_upload: false`. Cleanup never deletes a possibly committed photo.

## Isolation

- Staged originals live in their own private bucket, `socialu-snipe-staging`, at
  `stage/<auth user id>/<random UUID>.<jpg|png>`. Committed photos stay in `socialu-snipe-photos`. Cleanup only
  ever addresses the staging bucket and only keys of that shape, so it cannot reach a committed photo.
- The migration adds a second RESTRICTIVE policy, `socialu_snipe_staging_server_only`, on `storage.objects`
  for anon and authenticated (`bucket_id IS DISTINCT FROM 'socialu-snipe-staging'`). The existing
  `socialu_snipe_photos_server_only` policy is unchanged. No permissive policy is added for either bucket.
- Where the Storage schema has the columns, the staging bucket is limited to 10,000,000 bytes and
  `image/jpeg` / `image/png`.
- The browser may learn its staging key (it is part of the upload URL) but never a committed key. Staged
  bytes are never shown to anyone: there is no read route for them, and no public or signed READ URL exists
  for either bucket.
- `socialu.snipe_photo_stages` has RLS on and no grants; only the SECURITY DEFINER bridge
  `public.socialu_snipe_photo` and `public.socialu_snipe_photo_reap` (EXECUTE for service_role only) use it.
- Integration: the migration does not redefine `public.socialu_snipe`, `socialu.snipe_view` or any reward
  object. `socialu.snipe_photo_core` calls `public.socialu_snipe` by name with `EXECUTE` at run time, so a later
  reporting/admin wrapper installed under that name is used automatically.

## TTL and cleanup

- Finalize deadline: 30 minutes after begin.
- Upload URL: Storage keeps a signed upload URL valid for 2 hours and cannot revoke it early, so it can
  recreate a deleted staging object until then. The database records `upload_expires_at` as 2 h 15 min after
  the URL was (re)issued.
- Per account: at most 3 live tickets and at most 20 staging objects not yet cleaned up (`SP429`, HTTP 429).
- Finalize deletes the staged original right after an acceptance or a decoder rejection.
- `reapStagedUploads` (run on every begin) asks `socialu_snipe_photo_reap('claim')` for up to 20 finished
  tickets whose upload URL has expired, under a 5-minute lease with `SKIP LOCKED`, deletes those staging
  objects, and only then marks them cleared. A failed delete is retried by a later batch. Rows are dropped a week
  after cleanup. Cleanup is driven by traffic; a quiet deployment keeps at most 20 × 10 MB per account until
  the next begin. A scheduled call of the same two RPCs can be added later if needed.

## Photo reads

`GET .../snipes/:snipeId/photo` keeps the basic slice's guarantee that access is checked again after the
download has completed:

1. The session, account and current Snipe access are checked (`socialu_snipe('photo')`).
2. The committed object is read from private Storage with the server key, never through a public or signed
   read URL. The whole body is read into memory, bounded by the 10,000,000-byte photo policy; every committed
   copy is a validated re-encode within that limit. An object over the limit, a missing object or a broken
   or cancelled read stops there (Storage's stream is cancelled when the limit is passed) and gets the 404.
   Logs name only the Snipe ID, never the key.
3. Only after the read has completed is the current Snipe access checked again in the database
   (`socialu_snipe('photo')`: account lifecycle, membership and Snipe status). The session is not verified
   a second time; it was verified once in step 1, as in the basic slice. A
   withdrawal, removal or departure that commits while Storage is still sending the body therefore sends no
   photo byte, and a Snipe that now points at another object is refused too.
4. The checked bytes are returned as the route's own pull-based `ReadableStream` in 64 KB chunks with no
   `Content-Length`. That is a streamed response, so a photo above 4.5 MB is not limited by the buffered
   response body cap.

The response keeps `Cache-Control: private, no-store, max-age=0`, `nosniff`,
`Cross-Origin-Resource-Policy: same-origin` and `Content-Disposition: inline`. A removed, hidden, withdrawn
or non-participant read gets the same 404 as a missing one. Each read holds at most one 10 MB photo in memory.

## Verification (local only)

```bash
npx tsc --noEmit
npx vitest run __tests__/api/snipe-uploads.test.ts __tests__/api/snipes.test.ts __tests__/database/snipe-photo-transport.test.ts \
  __tests__/database/snipe.test.ts __tests__/database/snipe-rewards.test.ts __tests__/snipe-image.test.ts
npx vitest run --config vitest.snipe-basic.config.ts   # real Next UI/API + PGlite + loopback Auth/Storage
```

- `__tests__/database/snipe-photo-transport.test.ts` (real SQL in PGlite): grants, RLS and the staging bucket's
  restrictive policy; no core redefinition; binding and stable retries; changed-content conflicts, including a changed size or type after acceptance and a
  legacy accepted key with no ticket; policy and key
  checks; foreign account / conversation; exclusive claim, stale claim refusal; atomic acceptance with rewards
  unchanged; expiry before and during finalize; terminal rejection; cooldown and friendship rechecked at
  acceptance; per-account bounds; reaping only after the upload URL expires, with leases.
- `__tests__/api/snipe-uploads.test.ts`: small-JSON-only bodies, >10 MB / type / digest checks before any call,
  ticket hashing and upload-only signing, accepted-retry shortcut, changed, oversized, short, too-wide,
  disguised, SVG and truncated uploads rejected terminally, missing uploads released, claim answers mapped,
  definite vs uncertain acceptance cleanup, concurrent `same_upload`.
- `__tests__/api/snipes.test.ts`: photo reads checked again only after the whole object was read; a withdrawal
  committed after Storage's headers, while the body is still arriving, sends no photo bytes; an allowed read
  streams in chunks with no `Content-Length`; over-limit, broken and replaced objects get the 404.
- `scripts/tests/snipe-basic.browser.ts`: every scenario now uses direct upload; a new scenario submits a
  deterministic ~6.5 MB PNG (1800 × 1200) through the UI and asserts the app received only two small JSON
  requests, the original crossed only the signed Storage upload, the staged original was deleted, and the
  tagged friend's private read streams without `Content-Length`.
- Phone conversation header (SRS-510.1/#622): the first browser scenario measured the real layout at 390 × 844
  beside the side rail. The single-row header left the group title 0 px wide, so "Group chat" was stacked one
  letter per line and the header was 374 px tall
  (`tmp/tools/snipe-transport-evidence/mobile-header-before-fix.png`). At ≤ 900 px,
  `app/messages/messages.module.css` now lets the header wrap with smaller padding and gaps. The back button,
  avatar and title share the first row, with at least 120 px for the title, and Invite / Members move to a
  right-aligned second row. Wide screens are unchanged. The scenario now covers a member (Members) and the owner
  (Invite + Members). For each, it logs the header geometry, saves `mobile-conversation-header-<role>-after-fix.png`,
  and requires a visible level-2 title in the Conversation region wider than 40 px. It also requires a header
  under 260 px, visible on-screen actions, a visible Snipe toggle and no horizontal overflow.

## Not verified here (hosted limits)

Nothing was run against hosted Supabase or Vercel. Before release, on a real project:

1. Apply the migration and confirm the `socialu-snipe-staging` bucket is private with its size and type limits,
   and that both restrictive policies exist.
2. Confirm a signed upload URL issued by service_role succeeds with the restrictive policy in place, that
   `upsert: false` refuses a second PUT, and how Storage answers signing an existing key.
3. Confirm the browser PUT works cross-origin from the deployed site (Storage CORS).
4. Submit a > 4.5 MB photo on the deployment and confirm finalize stays within the function's memory and
   duration (a 10 MB original plus its decode at 4096 × 4096).
5. Confirm a streamed photo response above 4.5 MB is delivered in full.
