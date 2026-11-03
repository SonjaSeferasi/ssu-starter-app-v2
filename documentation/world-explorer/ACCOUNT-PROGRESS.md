# World Explorer account passport

The existing SocialU session is used for account progress. The browser calls
`/api/world-explorer/progress` with its existing access token; `verifiedUser`
checks the provider identity and app session guard. The service-only database
bridge derives the student from that verified identity. It accepts no student ID
or account ID from the submitted passport.

Apply `supabase/migrations/20261027000200_world_explorer_progress.sql` through the
team's normal migration process. **This implementation has not applied it to the
hosted database.** Until it is applied, the API reports `EXPLORER_SETUP_REQUIRED`
and the game retains device progress without claiming an account save.

The additive migration creates a destination allowlist, per-student passport and
idempotent run receipts. Destination identity is ISO alpha-2, with the existing
alpha-3 keys retained at the API/storage compatibility boundary. Antarctica is a
separate expedition. Tables have default-deny RLS and no direct `anon` or
`authenticated` access. Only the server's `service_role` can execute the narrow
function. It reuses `socialu_account('read', auth_id)` to enforce the current
verified/active account boundary. This passport does not award SocialU points or
change original Jumpyland game records.

The v1 browser storage key and existing stamps, coin records and attempt counts
are preserved. Missing extended fields migrate to zero stars and no discoveries.
Results add optional stars, elapsed milliseconds and a discovery flag. A retry
never clears completion, stars, discoveries or the best coin/time record.
Snapshot imports merge completion with OR, coin/star/attempt maxima, the earliest
completion timestamp and the lowest valid completion time. They do not increment
attempts. A run-result request increments attempts once per UUID; repeating the
same request does not inflate the result.

The device fallback uses `socialu.world-explorer.v1` for anonymous play. Account
caches use `socialu.world-explorer.v1:account:<verified UUID>` and are loaded only
after an authenticated response identifies their owner. Signing out must reset
the UI from the anonymous key before another account hydration. The client does
not upload cached data known to belong to another account. The account UUID is
never accepted in a merge/result request; the authenticated response includes it
solely to choose the isolated device cache.

Client integration:

```ts
const local = loadExplorerProgress();
const loaded = await loadAccountProgress(local);
setProgress(previous => mergeExplorerProgress(previous, loaded.progress));
// Display loaded.storage. Only 'account' means the request succeeded.

const next = recordCountryResult(previous, code, result);
saveExplorerProgress(next); // Device cache first; this is not a cloud claim.
const outcome = await saveAccountResult(code, result, runId);
// Reuse runId when retrying that network request.
```

`loadAccountProgress` uses the application's existing token refresh helper and
merges device progress into the authenticated account. A six-second API timeout,
missing migration, expired session, blocked browser storage or offline request
keeps the device-save channel explicit. Device data is a convenience passport,
not server-authoritative anti-cheat evidence.

Verification uses disposable PGlite with the actual SocialU schema and migration,
plus mocked API/provider tests. Coverage includes run deduplication, independent
accounts, denied direct table/function access, allowlisted facts/destinations,
snapshot compatibility and accurate device/account status. Hosted saving,
cross-device browser sessions and network-outage recovery require live QA after
the migration is applied.
