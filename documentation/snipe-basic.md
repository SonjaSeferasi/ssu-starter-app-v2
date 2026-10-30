# Snipe — basic vertical slice (UR-510 to UR-514, DP)

Branch: `feature/srs-510-1-basic-snipe`. This is a basic, usable Snipe inside existing conversations. It is
not the full Snipe feature. Group reporting, administrator report review and administrator removal are
**not** implemented and are not advertised in the UI. Reward points were added later; see
[`snipe-rewards.md`](snipe-rewards.md). Group reporting and its receipt were added later; see
[`snipe-moderation.md`](snipe-moderation.md).

## Decision record: Snipe photo policy (Appendix B-06)

| Item | Decision |
| --- | --- |
| Formats | JPEG and PNG only |
| Byte limit | 10,000,000 bytes (MB = 1,000,000 bytes) |
| Pixel limit | 4096 pixels wide and 4096 pixels high |
| Approved by | DP (Snipe feature owner), 25 October 2026 |
| Not recorded | LP review and whole-team approval. Appendix B-06 records DP's approval only. |

Where it is enforced: `lib/snipe-policy.ts` (shared constants and browser pre-check), `lib/snipe-image.ts`
(server decoder), and the two `upload_policies` rows seeded by the migration (`validate_media` rejects any
other Snipe type or size). Dimensions are enforced by the decoder; `media_assets` does not store them.

Rewards: this basic slice awarded no points. B-01 (25 points per verified friend, photographer only) was
approved by DP on 29 October 2026 and is implemented by `20261029182808_snipe_rewards.sql`; see
[`snipe-rewards.md`](snipe-rewards.md).

## What the basic slice does

1. From an authorized private or group conversation, a participant submits exactly one validated photo and
   one or more current friends who are current participants of that conversation.
2. The photographer and the originally tagged friends privately see the request and each tagged friend's
   two answers. Untagged members see no photo, controls or placeholder while it is unpublished.
3. Each tagged friend separately answers **Is this you?** and **Do you approve sharing this photo in this
   conversation?** Nothing is preselected, and saving one answer never fills in the other.
4. Publication happens only when every original target has answered both questions, every sharing answer is
   Yes, at least one identity answer is Yes, and eligibility still holds.
5. An approved Snipe (photo plus verified targets only) is shown only inside its original conversation.
   Nothing is added to feeds or profiles.
6. Outcomes: one sharing No → Rejected; all sharing Yes but no identity Yes → Closed (“No verified
   targets”); 24 hours without complete answers → Expired; a required participant leaving, a required
   friendship ending, a block or a deactivated account → Canceled. Ordered photographer→friend cooldowns of
   24 elapsed hours apply across all conversations and survive every outcome.
7. A tagged friend can withdraw sharing permission (pending → Canceled, published → Removed); the
   photographer can remove a published Snipe. Both ask for confirmation. Removed Snipes show
   “Snipe removed” and their photo is never served again.

Private and group conversations are both supported using the existing membership rules
(`socialu.is_current_participant`, which also applies the school boundary). In groups, members who joined
after publication do not see that Snipe, matching chat history (`can_read_message`).

## How it is built

| Layer | Files |
| --- | --- |
| Migration (additive) | `supabase/migrations/20261025043213_snipe_basic.sql` |
| Server bridge | `lib/snipe.ts` (`SNIPE_BUCKET`, the dedicated private bucket; the general media bucket is not used), `lib/snipe-image.ts`, `lib/snipe-policy.ts` |
| API routes | `app/api/conversations/[id]/snipes/route.ts` (GET list, POST submit), `.../snipes/[snipeId]/route.ts` (PATCH respond / withdraw / remove), `.../snipes/[snipeId]/photo/route.ts` (GET bytes) |
| UI | `components/snipe/snipe-panel.tsx`, `components/snipe/snipe.module.css`, one line in `app/messages/[conversationId]/page.tsx` |

Database. No new tables. The migration reuses `snipe_requests`, `snipe_tags`, `media_assets` and the
existing `validate_snipe`, `validate_snipe_tag`, `check_snipe_consent`, `apply_snipe_consent`,
`cancel_snipes_after_departure` and friendship-cleanup triggers. It adds one server-only bridge,
`public.socialu_snipe(p_auth_id, p_action, p_conversation_id, p_snipe_id, p_payload)` (SECURITY DEFINER,
`search_path = ''`, EXECUTE revoked from PUBLIC/anon/authenticated and granted to service_role only), plus
private helpers in `socialu` with EXECUTE revoked. The acting student always comes from
`socialu_require_student(p_auth_id)`; no actor ID is accepted from the browser.

Deferred trigger fix. `check_snipe_consent` backs two `DEFERRABLE INITIALLY DEFERRED` constraint triggers.
Fired at commit, it runs as the session role; the app's service_role has no USAGE on schema `socialu`, so it
would fail with 42P01 — including when an existing unfriend or group-leave cancels a pending Snipe outside
the new bridge. The migration applies the same narrow fix the team used in `20261019120100` for
`check_group_structure`: `ALTER FUNCTION ... SECURITY DEFINER` with its existing fixed `search_path`, and
EXECUTE revoked. No browser grant changes. (The in-memory tests run PostgreSQL 18, which runs deferred
checks as the queuing role, so they cannot reproduce the hosted failure; the database test asserts the fix.)
The bridge also calls `SET CONSTRAINTS ALL IMMEDIATE` after its own writes.

Every API request runs `verifiedUser` (token, verified email, app session revocation via
`socialu_session_guard`) and `accountOperation('read')` (account lifecycle: inactive or
reverification-required accounts stop) before any Snipe call, including every photo read.

Photos.
- Server validation decodes for real: signature sniffing first (so SVG/GIF/WebP/HEIC never reach a
  decoder), header dimension check, decoder pixel limit (`limitInputPixels`), `failOn: 'warning'` for
  corrupt or truncated data, rejection of labels that disagree with the contents, then a full decode and
  re-encode in the same format. Re-encoding applies EXIF orientation and drops embedded metadata such as GPS
  location before anything is stored.
- Size and type are checked before the body is decoded; the photo is decoded before `prepare` (its digest is
  part of the submission); eligibility and cooldowns (`prepare`) are checked before anything is uploaded.
- Each attempt uploads to its own key in the private `socialu-snipe-photos` bucket,
  `snipe/<auth user id>/<submission UUID>/<SHA-256 of the submitted file>/<attempt UUID>.<jpg|png>`,
  with `upsert: false`, so nothing can overwrite a committed photo. The bridge checks that the digest segment
  matches the `content_digest` it was given. Cleanup: a database rejection (any
  SQLSTATE) means the transaction rolled back and the attempt's object is removed. An uncertain outcome
  (lost connection, no code) keeps the object and logs it for reconciliation. A `created: false` answer
  removes the object only when the database confirms (`same_upload: false`) it is not the committed photo.
- Supabase's documentation says private bucket objects need an authorized download, and signed URLs stay
  valid until they expire, so they cannot guarantee immediate removal. Snipe therefore creates no public or
  signed URL. Bytes are streamed by the authorized photo route with
  `Cache-Control: private, no-store, max-age=0` and `nosniff`. Access is rechecked on every request against
  the request's current status, before the download and again after it, so a withdrawal or removal that
  commits during the download sends nothing. Missing, hidden and removed photos all return the same 404.
- Storage isolation. The migration creates the private `socialu-snipe-photos` bucket (when Supabase Storage
  tables exist) and adds one RESTRICTIVE policy on `storage.objects` for anon and authenticated:
  `bucket_id IS DISTINCT FROM 'socialu-snipe-photos'` in both USING and WITH CHECK. Restrictive policies are
  ANDed with every permissive one, so even an existing broad permissive policy cannot let a browser role read,
  list, create, move or delete Snipe objects; other buckets are unaffected. Only service_role (server) uses it.
- Uploads are refused (503, `SNIPE_STORAGE_PUBLIC`) if the Snipe bucket is public.
- The browser fetches photos with the bearer token and shows them through `blob:` URLs, which are revoked
  when a photo is no longer allowed, the card unmounts, or the selected file changes.

Submission identity. The browser generates one UUID per compose. Retrying the same photo and tags reuses
it; changing either starts a new one. The bridge serializes each photographer's submissions with the same
row lock `validate_snipe` takes, so concurrent attempts see each other's pair reservations and keys. A
reused key with different tags, another conversation or a different photo (digest of the committed photo's
storage path differs) is refused (409); it never returns the earlier Snipe as if it were the same action.

UI. An expandable “Snipe” panel under the conversation header, shown once the participant check passes.
It covers compose with preview and policy pre-check, eligible target selection (friends in cooldown are
disabled with their next time), cards with status badges, the photo or “Snipe removed”, verified targets,
each tagged friend's two answers, independent answer forms, confirmation steps, terminal reasons, and
loading, empty, error, refresh and retry states. It polls every 20 s only while open and the tab is visible,
skips overlapping polls and aborts stale requests. Normal chat behavior is unchanged.

## Requirement mapping

| SRS | Status | Where |
| --- | --- | --- |
| 510.1 chat entry | Done | Panel in conversation page |
| 510.2 / 510.3 photo policy and reasons | Done (B-06 as approved above) | `snipe-image.ts`, POST route, policy rows |
| 510.4 / 510.5 / 510.6 targets | Done | `snipe_targets`, create checks |
| 510.7 / 510.8 eligibility, whole rejection | Done | create checks + `validate_snipe_tag` |
| 510.9 / 510.10 immutable Pending request | Done | existing triggers, sealed tag list |
| 510.11 retry identity | Done | `submission_key`, `prepare` / `create` |
| 510.12 chat-only | Done | No feed/profile integration |
| 511.1 private review access | Done | `snipe_viewer_role`, photo action |
| 511.2 – 511.5 separate answers, ownership | Done | `respond`, AnswerForm |
| 511.6 – 511.10 outcomes | Done | existing `apply_snipe_consent` / `check_snipe_consent` |
| 511.11 / 511.12 withdrawal | Done | `withdraw` |
| 511.13 terminal response rejection | Done | `respond` returns closed/expired (409) |
| 512.1 – 512.3 private status, invisibility | Done | list view |
| 512.4 – 512.6 deadline and expiry | Done | `snipe_settle` before every read/action |
| 512.7 / 512.8 eligibility cancellation | Done | existing triggers + `snipe_settle` (also blocks/deactivation) |
| 512.9 – 512.12 reasons, durability | Done | stored outcome, view |
| 513.1 – 513.9 cooldowns | Done | create checks + trigger; SN429 names friend and next time |
| 514.1 removal roles | Partial | Photographer and tagged friends. Group administrator removal: later |
| 514.2 – 514.7 removal | Done | `remove`, `withdraw`, placeholder, photo route |
| 514.8, 514.9, 514.11, 514.14 group reporting and receipt | Done (later branch) | `snipe-moderation.md` |
| 514.10, 514.12, 514.13 admin review and decisions | Later | Next phase, see `snipe-moderation.md` |
| 514.15 repeat removal | Done | idempotent `remove` / `withdraw` |
| 525.x Snipe rewards | Done (B-01, DP) | `snipe-rewards.md` |

## Prerequisites before hosted use (not performed here)

1. Apply `supabase/migrations/20261025043213_snipe_basic.sql` after the existing migrations. It sorts
   before the already-committed `20261026000100_school_communities.sql` / `20261026000200_campus_members.sql`.
   A database that already applied those needs the CLI's out-of-order option (`supabase db push --include-all`)
   after review.
2. The migration provisions the private bucket `socialu-snipe-photos` and its restrictive policy. After
   applying, confirm in the dashboard that the bucket is private and the policy
   `socialu_snipe_photos_server_only` exists on `storage.objects`. Do not add any anon/authenticated policy
   for this bucket. If you later set a bucket file size limit, it must allow at least 10,000,000 bytes.
3. No new environment variables. `sharp` is a direct dependency (`0.35.5`, exact). `package.json` now
   declares the tested runtime (Next 16.4.2, React/React DOM 19.3.1, their types 19.3.0, Node 24.x);
   `package-lock.json` has been regenerated and a clean dependency install verified these versions.

## Verification recorded by Codex on October 25 2026

- A clean dependency install succeeded with the declared Next.js, React and Sharp versions.
- Full regression suite: **722 tests passed across 72 files**, including the new Snipe tests.
- Focused API/image/peer checks: 41 tests passed. All three real-schema Snipe database tests passed,
  including lifecycle behavior and browser-role Storage isolation under a broad permissive policy.
- TypeScript validation, whitespace validation and the production build (`next build --webpack`) passed.
- Integrated Snipe browser acceptance: **both scenarios passed**, with real Next UI/API and SQL in
  disposable PGlite, and local Auth/Storage transport. This covers upload, private review, independent
  answers, approval, fresh-session persistence, member visibility, withdrawal, blocked photo retrieval,
  and lost-response retry without a duplicate. Desktop and phone screenshots are in the project output
  folder under `SocialU_Avatar_Snipe_2026-10-25/snipe-browser`.
- The first attempt was blocked by sandbox/approval-service limits. Once execution was available, the
  browser test found mobile horizontal overflow. Claude corrected the photo-picker intrinsic width and
  the mobile Messages grid minimum; both scenarios then passed without weakening the assertions.
- Hosted migrations, provisioning and deployment have not been performed.

## Repeatable verification

```bash
npx tsc --noEmit
npx vitest run __tests__/snipe-image.test.ts __tests__/api/snipes.test.ts __tests__/database/snipe.test.ts
npm test
npm run build
# Integrated Next + browser acceptance (local loopback transport, real SQL in PGlite; needs Playwright + Chromium):
npx vitest run --config vitest.snipe-basic.config.ts
#   optional: SNIPE_EVIDENCE_DIR (default tmp/snipe-basic), SOCIALU_PLAYWRIGHT_MODULE, SNIPE_BROWSER_EXECUTABLE, SNIPE_APP_ROOT
```

- `__tests__/snipe-image.test.ts`: real decoding of valid JPEG/PNG, EXIF orientation/metadata removal, exact
  4096/4097 boundaries, decompression-bomb header, >10,000,000 bytes, SVG/GIF/WebP, disguised and truncated files.
- `__tests__/api/snipes.test.ts`: sign-in, session revocation and lifecycle before any call; no browser actor IDs;
  ordering (cheap checks → decode → prepare → private Snipe bucket → upload → create); only the Snipe bucket is
  used; public bucket refusal; cleanup on definite vs uncertain outcomes, including a retry after an uncertain
  commit removing only its own object; retry with a different photo refused; cooldown details; answer payloads;
  no-store private image streaming with a recheck after download; and indistinguishable 404s.
- `__tests__/database/snipe.test.ts`: real schema and triggers as service_role, plus a Storage fixture with a broad
  permissive policy. Covers the private bucket and restrictive policy (anon/authenticated cannot read, insert,
  move, update or delete Snipe objects; the media bucket still follows its own policy; the migration also applies
  without Storage tables); grants and the deferred trigger fix; eligible and outsider reads; invalid submissions
  reserving nothing; idempotent retry and key reuse (other tags, conversation or photo digest);
  separate answers and the incomplete gate; approve, reject, identity No with sharing Yes, and no verified
  targets; expiry enforced on response; cooldowns across conversations, including the exact 24-hour boundary;
  photographer removal; tagged withdrawal before and after publication; later members; friendship end,
  departure and deactivation cancellation; exactly the published Snipes credited (see `snipe-rewards.md`); no posts.
- `scripts/tests/snipe-basic.browser.ts`: photographer and tagged student through upload, review (keyboard,
  phone), approval, persistence across reload and new session, member view, confirmed withdrawal and blocked photo
  retrieval for everyone. Also covers lost-response retry without a duplicate. It asserts that no Snipe storage
  key or signed URL reaches the browser. Screenshots: `desktop-photographer-pending`, `mobile-tagged-review`,
  `desktop-member-approved`, `mobile-tagged-removed`, `desktop-photographer-removed`, `mobile-retry-review`.

## Remaining full-SRS work

- Administrator report review and decisions (SRS-514.10, 514.12, 514.13) and group administrator removal
  (rest of SRS-514.1). Group reporting and the receipt are done; see [`snipe-moderation.md`](snipe-moderation.md).
- Live updates and notifications for new requests and outcomes (the basic panel polls while open).
- A reconciliation job for Snipe objects without a `media_assets` row (kept after uncertain outcomes). A
  retention decision for the private bytes of Removed / unpublished Snipes, which are never served but not
  yet deleted.
- Changing an answer while pending is not offered (each answer is saved once; withdrawal is separate). A
  tagged friend who has left the conversation cannot reach the panel to withdraw; both need team decisions.
- LP/team confirmation of B-06 (only DP's approval is recorded).

## Hosted large-photo transport

The basic multipart upload and buffered private-photo response pass local API and integrated browser tests. Before releasing the full 10 MB policy on Vercel, adapt the transport: [Vercel Functions limits](https://vercel.com/docs/functions/limitations) cap request and buffered response payloads at 4.5 MB. Use an authenticated direct upload into the same protected bucket, followed by server validation and atomic acceptance, and an appropriate protected streaming/derivative response for large photographs. Keep the restrictive Storage policy and immediate authorization checks; do not replace private delivery with public or long-lived signed photo links. The current local flow is not a certification of 10 MB uploads on the hosted deployment.

## Interactive local sample preview

Run `node node_modules/vite-node/vite-node.mjs scripts/demo/snipe-local.ts` with Node 24 from the checkout.
The launcher prints a random loopback URL and disposable sample account logins, and keeps the real app
running against in-memory SQL with local Auth/Storage transport. Sign in as the photographer, open the
printed conversation URL, then choose **Snipe → New Snipe**. Stop the launcher to discard all sample data.
This development-only script is not imported by the application and does not use hosted accounts.
