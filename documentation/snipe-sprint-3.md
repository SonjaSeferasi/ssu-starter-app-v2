# Snipe — Sprint 3 final overview (UR-510 to UR-514, UR-525, DP)

Final branch: `feature/snipe-sprint-3` (PR #979). `main` is unchanged at `127f23f`. This is the verified
summary of the whole release. The implementation history and design detail stay in the per-slice documents:
[`snipe-basic.md`](snipe-basic.md), [`snipe-rewards.md`](snipe-rewards.md),
[`snipe-moderation.md`](snipe-moderation.md), [`snipe-sharing-permissions.md`](snipe-sharing-permissions.md),
[`snipe-photo-transport.md`](snipe-photo-transport.md) and [`snipe-pagination.md`](snipe-pagination.md).

## Feature behavior

- **Entry (UR-510).** Snipe lives only inside existing private and group conversations (an expandable panel
  under the conversation header) and in *Your Snipe sharing permissions* on the Messages home. It has no
  navbar entry and adds nothing to feeds or profiles.
- **Submission.** One JPEG or PNG photo (≤ 10,000,000 bytes, ≤ 4096 × 4096, Appendix B-06) plus one or more
  current friends who are current participants. The original goes straight to a private staging bucket
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
  owner or administrator reviews reports (Dismissed / Removed) and can remove directly. Direct messages have no
  reporting or administrator controls. A removed Snipe shows *Snipe removed* and its photo is never served again.
- **Rewards (UR-525, Appendix B-01).** 25 shared points per verified friend (identity Yes), credited to the
  photographer only, exactly once at publication. Every tagged friend must still approve sharing. Unpublished
  outcomes earn 0 and removal keeps the points.
- **Photos.** Private buckets only, restrictive Storage policies for browser roles, no public or signed read
  URLs. Photos are streamed by an authorized route that checks access again after the download.

## Tracking

All 61 SRS-510 to 514 cards (#622–#682), the 6 SRS-525 cards (#722–#727) and the 22 task cards are Open (issue
state) and In review (project state) and assigned to TheRealRinRin (89 cards in total). Board:
<https://github.com/users/SonjaSeferasi/projects/2/views/18>.

| Slice | SRS | Parent | Tasks | PR | Document |
| --- | --- | --- | --- | --- | --- |
| Basic Snipe | 510.1 (UR-510 to 514 core) | #622 | #777–#780 | #961 | [`snipe-basic.md`](snipe-basic.md) |
| Rewards | 525.2 (UR-525) | #723 | #949–#951 | #962 | [`snipe-rewards.md`](snipe-rewards.md) |
| Group reporting | 514.8 | #675 | #952–#954 | #968 | [`snipe-moderation.md`](snipe-moderation.md) |
| Administrator review | 514.10 | #677 | #955–#957 | #972 | [`snipe-moderation.md`](snipe-moderation.md) |
| Large-photo transport | 510.2 | #623 | #958–#960 | #977 | [`snipe-photo-transport.md`](snipe-photo-transport.md) |
| Sharing permissions | 511.12 | #645 | #969–#971 | #973 | [`snipe-sharing-permissions.md`](snipe-sharing-permissions.md) |
| Request pagination | 512.1 | #647 | #974–#976 | #978 | [`snipe-pagination.md`](snipe-pagination.md) |
| Final integration | all of the above | — | — | #979 | this document |

Implementation coverage: UR-510, UR-511, UR-512, UR-513, UR-514 and UR-525. The per-SRS mapping tables are
in the linked documents.

## Release migrations (apply in this order)

1. `supabase/migrations/20261025043213_snipe_basic.sql`
2. `supabase/migrations/20261029182808_snipe_rewards.sql`
3. `supabase/migrations/20261029184238_snipe_group_reporting.sql`
4. `supabase/migrations/20261030034841_snipe_photo_transport.sql`
5. `supabase/migrations/20261030035002_snipe_admin_review.sql`
6. `supabase/migrations/20261030040044_snipe_withdrawal_access.sql`
7. `supabase/migrations/20261030093802_snipe_request_pagination.sql`

`20261025043213_snipe_basic.sql` sorts before migrations that may already be applied, so it may need
`supabase db push --include-all` after review (see [`snipe-basic.md`](snipe-basic.md)). The rewards migration
stops on purpose if a different current Snipe rate already exists.

## Final verification

Run locally under Node 24:

- Full regression suite: **1290 tests passed in 140 files**.
- Production browser acceptance: **all 9 scenarios passed** (105.25 s). Real SQL runs locally with loopback
  Auth/Storage, and the run includes a production build with TypeScript checking (`next build --webpack`,
  then `next start`).
- Integration checks: **88 passed**. Pagination checks: **40 passed**.

What this does **not** show:

- The browser fixture does not implement Supabase Realtime (the panel polls). Unrelated services may answer
  503 on purpose in the local fixture.
- This is not a hosted end-to-end result. No hosted migrations were applied, and no provider advisors,
  hosted concurrency or load were run. PGlite runs one connection, so concurrency tests there run serially.

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
`tmp/snipe-basic`), `SOCIALU_PLAYWRIGHT_MODULE`, `SNIPE_BROWSER_EXECUTABLE`, `SNIPE_APP_ROOT`.

### Evidence

Screenshots in [`sprint-3-evidence/snipe/`](sprint-3-evidence/snipe/):

- Composer and review: [desktop-photographer-rules](sprint-3-evidence/snipe/desktop-photographer-rules.png),
  [mobile-tagged-review](sprint-3-evidence/snipe/mobile-tagged-review.png),
  [desktop-tagged-large-photo](sprint-3-evidence/snipe/desktop-tagged-large-photo.png)
- Rewards: [mobile-photographer-reward-new-session](sprint-3-evidence/snipe/mobile-photographer-reward-new-session.png)
- Reporting and moderation: [desktop-member-report-receipt](sprint-3-evidence/snipe/desktop-member-report-receipt.png),
  [desktop-owner-report-queue](sprint-3-evidence/snipe/desktop-owner-report-queue.png),
  [mobile-owner-report-removed](sprint-3-evidence/snipe/mobile-owner-report-removed.png)
- Direct message: [mobile-dm-tagged-approved](sprint-3-evidence/snipe/mobile-dm-tagged-approved.png)
- Sharing permissions: [mobile-sharing-former-tagged](sprint-3-evidence/snipe/mobile-sharing-former-tagged.png),
  [mobile-sharing-photographer-removed](sprint-3-evidence/snipe/mobile-sharing-photographer-removed.png)
- Pagination: [desktop-reviewer-older-approved](sprint-3-evidence/snipe/desktop-reviewer-older-approved.png)
- Tracking: [github-snipe-61-in-review](sprint-3-evidence/snipe/github-snipe-61-in-review.png),
  [github-sprint3-review-board](sprint-3-evidence/snipe/github-sprint3-review-board.png)

## Known tradeoffs and operations

- **Older page pauses updates.** While older Snipes are shown or loading, the 20 s poll stops and the panel
  says to select **Refresh**. Statuses and the balance can be out of date until then. See
  [UI and refresh semantics](snipe-pagination.md#ui-and-refresh-semantics).
- **Staging cleanup.** Staged originals are cleaned up only as traffic arrives (on each upload begin), with
  per-account limits. A scheduled call can be added later. See
  [TTL and cleanup](snipe-photo-transport.md#ttl-and-cleanup). Committed objects kept after an uncertain
  outcome still need a reconciliation job, and retention of removed photo bytes still needs a decision. See
  [remaining work](snipe-basic.md#remaining-full-srs-work).
- **Hosted rollout.** Before release, apply the migrations above to the hosted project and run the hosted
  checks in [Not verified here](snipe-photo-transport.md#not-verified-here-hosted-limits) (private buckets and
  policies, signed upload, Storage CORS, uploads over 4.5 MB, streamed reads).
