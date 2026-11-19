# Validation — 19 November 2026

Migration: `20261119171202_snipe_dormspace_shared_points_rls.sql`.
Applied successfully to the linked SocialU Supabase project. The file version
matches the recorded hosted migration version.

| Check | Result |
|---|---|
| Baseline, same attacks without the new migration | 49 failed, 24 passed |
| After migration, real PostgreSQL RLS suite | 73 passed |
| Existing group-only, Snipe reward and dorm shop regressions | 10 passed |
| Live anonymous / owner / unrelated-user database-role assertions | 40 passed |
| Live anonymous HTTP table/RPC boundary checks | 34 passed before and after |
| Scoped live tables with RLS enabled | 30 of 30 |
| UPDATE policies with USING and WITH CHECK | 3 of 3 |
| Derived views with security_invoker enabled | 3 of 3 |
| Live private-schema ACLs after test rollback | Restored and verified |
| Targeted TypeScript check and JavaScript syntax check | Passed |

The baseline passes for already-private internal tables are expected. The missing
RLS was a defense gap behind existing schema/table ACLs, not proof of a previously
exploitable public endpoint. No existing RLS was disabled for the baseline.

The post-migration application smoke exercises owner open/save, friend access,
stranger rejection, guestbook/placement policy isolation, Snipe consent and
publication, daily participation, points balance, and an atomic shop purchase and
idempotent retry. All test accounts, photo placeholders and the affordable shop
offer exist only in the disposable database.

Authenticated hosted checks used real PostgreSQL roles and JWT claim settings in
a rollback transaction; they did not log in through a browser or use real user
passwords. The hosted HTTP script ran with the public anon key. Real owner/other
HTTP sessions were not run because their access tokens were not supplied.

Security advisor review found only the seven intentional `RLS enabled, no policy`
informational findings in this feature scope: private staging, directory, live,
voice and music tables. They deliberately have no browser access. The advisor's
unrelated authentication/Realtime notices were left outside this change.

The direct GitHub connection rejected branch creation with HTTP 403, `Resource
not accessible by integration`. The signed-in GitHub browser subsequently provided
working branch access for publishing the migration, rules, tests and this evidence.
