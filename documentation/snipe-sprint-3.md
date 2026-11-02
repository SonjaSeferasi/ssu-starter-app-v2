# Snipe — Sprint 3 final overview (UR-510 to UR-514, UR-525, DP)

Branch: `feature/snipe-sprint-3` (PR #979). This is the summary of the whole release. On 31 October 2026 the
stakeholder (DP) corrected the scope so that Snipe is **group-only**; that change and the **Take photo** camera
capture are in commit `7908664`, and the branch is being integrated with current `main` (`abcda1d`, which adds
chat replies). The group-only repair is described in [`snipe-group-only.md`](snipe-group-only.md). The
implementation history and design detail stay in the per-slice documents:
[`snipe-basic.md`](snipe-basic.md), [`snipe-rewards.md`](snipe-rewards.md),
[`snipe-moderation.md`](snipe-moderation.md), [`snipe-sharing-permissions.md`](snipe-sharing-permissions.md),
[`snipe-photo-transport.md`](snipe-photo-transport.md) and [`snipe-pagination.md`](snipe-pagination.md). Those
documents were written before the scope correction, so where they mention direct messages, this overview and
[`snipe-group-only.md`](snipe-group-only.md) take precedence.

## Feature behavior

- **Entry (UR-510).** Snipe lives only inside group conversations (an expandable panel under the conversation
  header, mounted only after the authorized history confirms a group) and in *Your Snipe sharing permissions*
  on the Messages home. Direct messages show no Snipe controls, and every Snipe API and database bridge rejects
  a non-group conversation. It has no navbar entry and adds nothing to feeds or profiles.
- **Submission.** One JPEG or PNG photo (≤ 10,000,000 bytes, ≤ 4096 × 4096, Appendix B-06) plus one or more
  current friends who are current group members. The photo is either chosen from a file or taken with
  **Take photo**, which opens the device camera in the page (rear camera preferred), and **Capture photo**
  turns the frame into a JPEG within the same limits. Frames stay on the device until the existing form is
  submitted, and the camera is released on capture or cancel. If the camera is blocked or missing, the panel
  says so and the student can still choose a file. The original goes straight to a private staging bucket
  through an upload-only URL; the server validates, re-encodes (EXIF orientation applied, metadata such as GPS
  removed) and accepts it atomically. Retrying the same submission never creates a duplicate.
- **Review (UR-511).** Only the photographer and the originally tagged friends see a pending request. Each
  tagged friend separately answers **Is this you?** and **Do you approve sharing this photo in this
  conversation?** with nothing preselected.
- **Outcomes (UR-512).** Published only when every tagged friend approves sharing and at least one says Yes
  to identity. Otherwise Rejected (any sharing No), Closed (no verified targets), Expired (24 hours) or
  Canceled (departure, ended friendship, block or deactivation). Every visible request stays reachable: the
  newest 50 first, then **Show older Snipes**.
- **Cooldowns (UR-513).** Each ordered photographer→friend pair has a 24-hour cooldown across all
  conversations, surviving every outcome.
- **Removal and moderation (UR-514).** The photographer can remove, and any tagged friend can withdraw
  sharing, with confirmation. Both also work from the Messages home after leaving the group or after the
  friendship ends, metadata only. Group members report a published Snipe and get a receipt. The current group
  owner or administrator reviews reports (Dismissed / Removed) and can remove directly. A removed Snipe shows
  *Snipe removed* and its photo is never served again.
- **Rewards (UR-525, Appendix B-01).** 25 shared points per verified friend (identity Yes), credited to the
  photographer only, exactly once at publication. Every tagged friend must still approve sharing. Unpublished
  outcomes earn 0 and removal keeps the points.
- **Photos.** Private buckets only, restrictive Storage policies for browser roles, no public or signed read
  URLs. Photos are streamed by an authorized route that checks access again after the download.

## Tracking

All 61 SRS-510 to 514 cards (#622–#682), the 6 SRS-525 cards (#722–#727) and the 22 task cards were Open
(issue state) and In review (project state) and assigned to TheRealRinRin (89 cards in total) when the
tracking screenshots below were taken. Board: <https://github.com/users/SonjaSeferasi/projects/2/views/18>.

| Slice | SRS | Parent | Tasks | PR | Document |
| --- | --- | --- | --- | --- | --- |
| Basic Snipe | 510.1 (UR-510 to 514 core) | #622 | #777–#780 | #961 | [`snipe-basic.md`](snipe-basic.md) |
| Rewards | 525.2 (UR-525) | #723 | #949–#951 | #962 | [`snipe-rewards.md`](snipe-rewards.md) |
| Group reporting | 514.8 | #675 | #952–#954 | #968 | [`snipe-moderation.md`](snipe-moderation.md) |
| Administrator review | 514.10 | #677 | #955–#957 | #972 | [`snipe-moderation.md`](snipe-moderation.md) |
| Large-photo transport | 510.2 | #623 | #958–#960 | #977 | [`snipe-photo-transport.md`](snipe-photo-transport.md) |
| Sharing permissions | 511.12 | #645 | #969–#971 | #973 | [`snipe-sharing-permissions.md`](snipe-sharing-permissions.md) |
| Request pagination | 512.1 | #647 | #974–#976 | #978 | [`snipe-pagination.md`](snipe-pagination.md) |
| Group-only scope and camera capture | 510.1, 510.2 | — | — | commit `7908664` | [`snipe-group-only.md`](snipe-group-only.md), this document |
| Final integration | all of the above | — | — | #979 | this document |

Implementation coverage: UR-510, UR-511, UR-512, UR-513, UR-514 and UR-525. The per-SRS mapping tables are
in the linked documents. The SRS records the scope correction in its Snipe section.

## Release migrations (apply in this order)

1. `supabase/migrations/20261025043213_snipe_basic.sql`
2. `supabase/migrations/20261029182808_snipe_rewards.sql`
3. `supabase/migrations/20261029184238_snipe_group_reporting.sql`
4. `supabase/migrations/20261030034841_snipe_photo_transport.sql`
5. `supabase/migrations/20261030035002_snipe_admin_review.sql`
6. `supabase/migrations/20261030040044_snipe_withdrawal_access.sql`
7. `supabase/migrations/20261030093802_snipe_request_pagination.sql`
8. `supabase/migrations/20261031223558_snipe_group_only.sql`

`20261025043213_snipe_basic.sql` sorts before migrations that may already be applied, so a fresh environment
may need `supabase db push --include-all` after review (see [`snipe-basic.md`](snipe-basic.md)). The rewards
migration stops on purpose if a different current Snipe rate already exists. The group-only migration adds
group checks to both database bridges; it changes no tables or data and broadens no grants.

Hosted state, as recorded in [`snipe-group-only.md`](snipe-group-only.md): the connected Supabase project
already had migrations 1–7, and migration 8 was applied there earlier with the user's explicit approval; its
filename matches the hosted migration history. No further hosted change is part of this integration.

## Verification

### Historical results (before the scope correction and before the merge with `main`)

Recorded locally under Node 24 on the earlier branch state (up to `b1e1f33`), when Snipe still allowed direct
messages. They are kept as history and do **not** describe the current group-only, `main`-integrated code:

- Full regression suite: 1290 tests passed in 140 files.
- Production browser acceptance: all 9 scenarios passed (105.25 s), with real SQL locally and loopback
  Auth/Storage, including a production build with TypeScript checking.
- Integration checks: 88 passed. Pagination checks: 40 passed.
- At that time no hosted migrations had been applied.

### Group-only repair results

Recorded in [`snipe-group-only.md`](snipe-group-only.md#validation): focused Snipe unit/API/database suites,
navigation checks, the phone-header check, two focused browser tests (group consent and withdrawal; DM UI/API
denial) and hosted DM denial checks. Eight broader browser scenarios were excluded from that focused run.

### Current `main`-integrated results

Not yet recorded. The full suite, browser acceptance and build are to be rerun on the merged branch (Next.js 14
and React 18 from `main`, plus the Sharp dependency). Results will be added here once those runs finish.

What the local runs do **not** show:

- The browser fixture does not implement Supabase Realtime (the panel polls). Unrelated services may answer
  503 on purpose in the local fixture.
- No provider advisors, hosted concurrency or load were run. PGlite runs one connection, so concurrency tests
  there run serially.

### Reproduce

```bash
node --version            # v24.x
npm ci
npm test -- --maxWorkers=2 --minWorkers=1   # bounded workers for the in-memory PGlite suites
npx vitest run __tests__/database/snipe-pagination.test.ts __tests__/api/snipe-pagination.test.ts __tests__/snipe-pagination.test.ts --maxWorkers=2 --minWorkers=1
# Production build + browser acceptance (needs Playwright + Chromium; builds and starts the app itself
# against a loopback service with isolated test keys, so no credentials or .env are needed):
npx vitest run --config vitest.snipe-basic.config.ts
```

Optional environment variable names for the browser run: `SNIPE_EVIDENCE_DIR` (screenshot folder, default
`tmp/snipe-basic`), `SOCIALU_PLAYWRIGHT_MODULE`, `SNIPE_BROWSER_EXECUTABLE`, `SNIPE_APP_ROOT`,
`SNIPE_BROWSER_DEV=1` (dev server instead of a production build) and `SNIPE_FOCUSED_ACCEPTANCE=1` (the focused
group-only tests; see [`snipe-group-only.md`](snipe-group-only.md#remaining-limits)).

### Evidence

Screenshots in [`sprint-3-evidence/snipe/`](sprint-3-evidence/snipe/).

Current group-only scope and camera capture:

- Group Snipe: [mobile-group-snipe-approved](sprint-3-evidence/snipe/mobile-group-snipe-approved.png),
  [mobile-group-snipe-withdrawn](sprint-3-evidence/snipe/mobile-group-snipe-withdrawn.png)
- Direct message without Snipe: [mobile-dm-no-snipe](sprint-3-evidence/snipe/mobile-dm-no-snipe.png),
  [desktop-dm-no-snipe](sprint-3-evidence/snipe/desktop-dm-no-snipe.png)
- Take photo: [mobile-camera-preview](sprint-3-evidence/snipe/mobile-camera-preview.png),
  [mobile-camera-snipe-submitted](sprint-3-evidence/snipe/mobile-camera-snipe-submitted.png)

Historical (from the 9-scenario run before the scope correction):

- Composer and review: [desktop-photographer-rules](sprint-3-evidence/snipe/desktop-photographer-rules.png),
  [mobile-tagged-review](sprint-3-evidence/snipe/mobile-tagged-review.png),
  [desktop-tagged-large-photo](sprint-3-evidence/snipe/desktop-tagged-large-photo.png)
- Rewards: [mobile-photographer-reward-new-session](sprint-3-evidence/snipe/mobile-photographer-reward-new-session.png)
- Reporting and moderation: [desktop-member-report-receipt](sprint-3-evidence/snipe/desktop-member-report-receipt.png),
  [desktop-owner-report-queue](sprint-3-evidence/snipe/desktop-owner-report-queue.png),
  [mobile-owner-report-removed](sprint-3-evidence/snipe/mobile-owner-report-removed.png)
- Sharing permissions: [mobile-sharing-former-tagged](sprint-3-evidence/snipe/mobile-sharing-former-tagged.png),
  [mobile-sharing-photographer-removed](sprint-3-evidence/snipe/mobile-sharing-photographer-removed.png)
- Pagination: [desktop-reviewer-older-approved](sprint-3-evidence/snipe/desktop-reviewer-older-approved.png)
- Direct-message Snipe, superseded by the group-only correction:
  [mobile-dm-tagged-approved](sprint-3-evidence/snipe/mobile-dm-tagged-approved.png)
- Tracking: [github-snipe-61-in-review](sprint-3-evidence/snipe/github-snipe-61-in-review.png),
  [github-sprint3-review-board](sprint-3-evidence/snipe/github-sprint3-review-board.png)

## Known tradeoffs and operations

- **Older page pauses updates.** While older Snipes are shown or loading, the 20 s poll stops and the panel
  says to select **Refresh**. Statuses and the balance can be out of date until then. See
  [UI and refresh semantics](snipe-pagination.md#ui-and-refresh-semantics).
- **Camera availability.** Take photo needs a secure context (HTTPS or localhost) and browser camera
  permission. Otherwise the panel shows the reason and file selection still works.
- **Staging cleanup.** Staged originals are cleaned up only as traffic arrives (on each upload begin), with
  per-account limits. A scheduled call can be added later. See
  [TTL and cleanup](snipe-photo-transport.md#ttl-and-cleanup). Committed objects kept after an uncertain
  outcome still need a reconciliation job, and retention of removed photo bytes still needs a decision. See
  [remaining work](snipe-basic.md#remaining-full-srs-work).
- **Hosted checks.** All eight migrations are on the connected hosted project (above), and hosted DM denial,
  the new database guards, private buckets and revoked browser execution grants were verified there
  ([`snipe-group-only.md`](snipe-group-only.md#validation)). The remaining hosted transport checks in
  [Not verified here](snipe-photo-transport.md#not-verified-here-hosted-limits) (signed upload, Storage CORS,
  uploads over 4.5 MB, streamed reads) are not recorded as run.
