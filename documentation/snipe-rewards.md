# Snipe rewards (UR-525, DP)

Branch: `srs-525.2-snipe-rewards` (based on `srs-510.1-chat-submission-entry`). Tracking: #723 SRS-525.2,
with SRS-525.1–525.6, 521.1, 524.1–524.4, 528.2 and NFR-49. Builds on the basic slice in
[`snipe-basic.md`](snipe-basic.md).

## Decision record: Snipe reward rate (Appendix B-01)

| Item | Decision |
| --- | --- |
| Rate | 25 shared points per verified friend (originally tagged friend whose identity answer is Yes at publication) |
| Recipient | Photographer only. Tagged friends earn nothing |
| When | Once, when the Snipe is published (Approved). Any outcome that isn't published earns 0 |
| Cap | No photographer-wide daily cap. Only the existing 24-hour per-pair cooldown applies |
| Approved by | DP (Snipe and shared points owner), 29 October 2026 |
| Not recorded | Team review. Every other reward amount (B-02, B-03) and catalog price (B-04) is still open and not configured |

## Behavior

- **Award.** The `snipe_publication_reward` trigger runs on `snipe_requests` when the status changes from pending
  to approved. It inserts one `point_transactions` row for the photographer. `validate_points_transaction`
  works out the amount as the current rule's rate × the number of `identity_yes` tags, and checks that this
  photographer's request is approved. The row is written in the same transaction as the consent answer that
  published the Snipe, so either both commit or neither does.
- **Consent still applies.** Publication still needs every original tag's sharing Yes, including friends who
  answered No to identity (`check_snipe_consent`). Those friends just don't count toward the reward.
- **Exactly once.** Three things guarantee it:
  1. The bridge locks the photographer's row first, so concurrent final answers run one at a time.
  2. `validate_snipe` allows only one move into approved.
  3. The existing `snipe_reward_once` unique index rejects a second credit. That rolls the whole publication
     back instead of crediting twice.

  The ledger `action_key` is the Snipe's own `submission_key`.
- **No backfill.** Only the transition fires the award. A Snipe approved before this migration has no ledger
  row, and the photographer sees it as **Not awarded**. Reading or removing it credits nothing.
- **Removal.** Points and the ledger row are kept (`immutable_points`). The reward stays visible on the Removed
  card without the photo.
- **Failure.** If no current Snipe rule exists, the publishing answer fails with `SN503`. The API returns 503
  `SNIPE_REWARDS_UNAVAILABLE`, nothing is saved and the request stays Pending, so a later retry can succeed.
  There is no phantom balance.
- **Frozen history.** Each ledger row stores the rule id, the verified-friend count and the amount, and the row
  can't be changed. Snipe rules can't be edited, deleted or reactivated (`freeze_snipe_reward_rule`); a new rate
  means retiring the old rule and adding a new row. The reward shown to the photographer comes from the ledger
  row (`points_change / reward_units`), not from the current rule.
- **Balance and history.** Both come only from the existing `points_balances` and `points_history` views.
  There's no new balance, counter or ledger, and no streak logic.

## Mapping

| Layer | Where |
| --- | --- |
| Migration | `supabase/migrations/20261029182808_snipe_rewards.sql`. It seeds the B-01 rule and stops if a different current Snipe rate already exists. It adds the award and rule-freeze triggers, private helpers `socialu.snipe_reward` and `socialu.snipe_rewards_summary`, adds `reward` to `snipe_view` (photographer only, Approved/Removed), and makes `list` return `rewards: { points_per_friend, balance }`. All helpers live in `socialu` with a fixed `search_path` and EXECUTE revoked from PUBLIC, anon, authenticated and service_role. The only entry point is still `public.socialu_snipe`, which only service_role can call and which gets the actor from `socialu_require_student`. |
| Server | `lib/snipe.ts`: `SN503` → 503 `SNIPE_REWARDS_UNAVAILABLE`. The routes are unchanged and still run `verifiedUser` + `accountOperation('read')` with `no-store`. No amount or account comes from the client. |
| UI | `components/snipe/snipe-panel.tsx`, `snipe.module.css`, inside the existing Snipe panel (no navbar entry). It shows the confirmed shared balance (labelled "last confirmed" when a refresh fails) and the rules before submission (rate, all-person sharing, 24-hour expiry, pair cooldown), with an "up to N points" estimate. Each photographer card shows its result: *Reward: N points*, *k verified friends × 25 points per friend = N points*, plus when it was credited; *Not awarded* for older Snipes; *No points* for unpublished outcomes. |
| SRS | Appendix B-01 records DP's approval only. |
| Also fixed | `app/students/[username]/page.tsx`: Next 16 async `params` (`Promise` + `await`), with the same behavior. |

| SRS | Status |
| --- | --- |
| 525.1 photographer only | Done |
| 525.2 rate × identity-Yes count | Done (25, B-01) |
| 525.3 unpublished → 0 | Done |
| 525.4 identity No excluded | Done |
| 525.5 no photographer cap | Done |
| 525.6 reward explanation | Done |
| 521.1 / 521.4 balance in Snipe result, last-confirmed label | Done |
| 523.3 / 523.7 / 523.8, NFR-49 | Done |
| 524.1 / 524.4 persistence, removal keeps points | Done |
| 527.5 / 527.7 frozen amounts, removed history | Done (ledger). The general points-history page belongs to UR-527 and isn't built here |
| 528.2 rules before submission | Done |

## Verification (to be run by Codex; not run while writing this)

```bash
npx tsc --noEmit
npx vitest run __tests__/database/snipe-rewards.test.ts __tests__/database/snipe.test.ts __tests__/api/snipes.test.ts __tests__/snipe-image.test.ts
npm test
npm run build
SNIPE_EVIDENCE_DIR=tmp/snipe-rewards npx vitest run --config vitest.snipe-basic.config.ts
```

- `__tests__/database/snipe-rewards.test.ts` uses the real schema and covers:
  - the rule and its grants;
  - two verified friends → 50, with nothing credited before publication;
  - 100 deliveries of the publishing answer → one credit;
  - a duplicate insert or re-publication refused;
  - tagged friends and members get 0 and see no reward;
  - removal keeps the points, and the ledger can't be changed;
  - identity No + sharing Yes excluded, but that friend's sharing is still required;
  - rejected, closed, expired, canceled and withdrawn → 0;
  - no photographer cap;
  - `SN503` rollback, then a single credit on retry;
  - rules can't be edited, deleted or reactivated, and a test-only later rate leaves earlier entries unchanged;
  - no backfill (shown as not awarded);
  - the migration refuses to apply over a different current rate.
- `__tests__/database/snipe.test.ts`: the lifecycle now expects exactly the three published Snipes to be credited.
- `__tests__/api/snipes.test.ts`: `SN503` mapping with no client amount forwarded, and the list passes through the
  student's own rate and balance.
- `scripts/tests/snipe-basic.browser.ts`: rules before submission; the photographer's reward and balance after
  publication, after a refresh and in a new phone session; the tagged friend gets 0; removal keeps the points.
  New screenshots: `desktop-photographer-rules`, `desktop-photographer-reward`,
  `mobile-photographer-reward-new-session` (plus the existing set).
- Limits: PGlite has one connection, so "concurrent" deliveries run one after another there. Hosted
  concurrency relies on the photographer row lock and `snipe_reward_once`. Nothing has been applied to a hosted
  database.

## Hosted rollout notes

Apply after `20261025043213_snipe_basic.sql`. A database that already has later migrations may need
`supabase db push --include-all` for the basic Snipe migration first. If hosted already has a current Snipe
rule with another rate, the migration stops on purpose.
