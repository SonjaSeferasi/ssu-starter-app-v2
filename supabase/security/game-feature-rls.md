# Snipe, DormSpace and shared points access rules

Scope: 30 tables, plus their three derived views. The actual application tables
live in `socialu`, not `public`; DormSpace infrastructure uses private schemas.
Shared catalog/inventory and activity/level definitions are included because these
features use them. Account, feed, general chat, avatar and Wordle tables are outside
this change. Existing Storage protections for Snipe and music remain in place.

The app uses checked server-only RPCs. Browser roles keep **no raw table grants**.
The RLS rules below provide a second boundary if a table is accidentally granted
later; they do not open direct Data API access. In particular, row ownership alone
cannot authorize a reward, purchase, Snipe publication or consent transition.
Those writes must continue through the existing RPCs and integrity triggers.

`self` means the verified, active student mapped from `auth.uid()` through
`socialu.students.auth_user_id`. Numeric `owner_id`/`student_id` cannot be compared
directly with a Supabase UUID. Private `socialu_rls` helpers resolve that mapping
without granting access to the students table or accepting a caller-selected ID.
Helpers use fixed empty search paths and authenticated-only execution rights.

The following are **RLS policy permissions**; persistent table/schema ACLs still
block all direct browser operations. Anonymous visitors have no policies.

| Schema | Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| socialu | activities | Eligible student | Server | Server | Server |
| socialu | catalog_items | Eligible student | Server | Server | Server |
| socialu | owned_items | Self | Server | Server | Server |
| socialu | room_surfaces | Eligible student | Server | Server | Server |
| socialu | reserved_room_cells | Eligible student | Server | Server | Server |
| socialu | item_footprints | Eligible student | Server | Server | Server |
| socialu | compatible_item_overlaps | Eligible student | Server | Server | Server |
| socialu | dorms | Owner/current friend | Owner | Owner | No app operation |
| socialu | dorm_placements | Owner/current friend | Owner | Owner | Owner |
| socialu | guestbook_notes | Owner/current friend | Self as author, in a friend's dorm | Author, while authorized | Dorm owner or authorized author |
| socialu | counted_dorm_visits | Dorm owner or recorded visitor | Server | No app operation | No app operation |
| socialu | game_levels | Eligible student | Server | Server | Server |
| socialu | participation_settings | Self | Server | No app operation | No app operation |
| socialu | participation_events | Self | Server | No app operation | No app operation |
| socialu | streak_instances | Self | Server | Server | No app operation |
| socialu | participation_days | Self | Server | Server | No app operation |
| socialu | reminder_dismissals | Self | Server | No app operation | No app operation |
| socialu | level_completions | Owner of source attempt | Server | No app operation | No app operation |
| socialu | snipe_requests | Current group reviewer; eligible group member after publication | Server | Server | No app operation |
| socialu | snipe_tags | Current group photographer/tagged reviewer | Server | Server | No app operation |
| socialu | snipe_reports | Current reporter or group manager | Server | Server | No app operation |
| socialu | snipe_photo_stages | Server | Server | Server | Server |
| socialu | reward_rules | Eligible student | Server | Server | Server |
| socialu | point_transactions | Self | Server | No app operation | No app operation |
| dormspace_directory | room_assignments | Server | Server | No app operation | No app operation |
| dormspace_live | players | Server | Server | Server | Server |
| dormspace_live | messages | Server | Server | No app operation | Server cleanup |
| dormspace_live | voice_leases | Server | Server | Server | Server |
| dormspace_live | voice_sweep_health | Server | Server | Server | No app operation |
| dormspace_music | tracks | Server | Server | Server | Server |

`Server` means no browser RLS policy. A verified Next.js request invokes an already
restricted RPC, which rechecks the actor, membership, consent, entitlement or
reward rules. Its database owner context intentionally bypasses table RLS; never
treat a successful service-role call as an attack test. Music/storage keys,
session identifiers, upload claims and voice leases stay private even to their
owners. RPCs return only authorized response fields or signed access URLs.

Design references: SRS-500/503/505/507/508/509 (own room, persistence, friends,
guestbooks, visits), SRS-510–514 (group-only consent and moderation), SRS-520–528
(shared ledger, purchases, rewards, participation), SRS-530/531 (music and voice).
The migration adds both `USING` and `WITH CHECK` to each UPDATE policy; the
existing immutable guestbook identity trigger remains in force. Points/history
and visit-count views become `security_invoker` and retain private grants.

## Reproduce the tests

Run from the repository root after installing its locked dependencies:

```sh
# Before: omit only this new migration in a DISPOSABLE database. Do not disable
# RLS on the hosted database to make a demonstration fail.
SOCIALU_RLS_BASELINE=1 npm test -- __tests__/database/game-feature-rls.test.ts --no-cache

# After: the identical attacks with the migration installed.
npm test -- __tests__/database/game-feature-rls.test.ts --no-cache

# Related existing regression tests.
npm test -- __tests__/database/snipe-group-only.test.ts __tests__/database/snipe-rewards.test.ts __tests__/database/dormspace-shop.test.ts --no-cache --maxWorkers=1 --minWorkers=1

# Live read-only API boundary check: public anon/publishable key only.
node --env-file=.env.local scripts/tests/game-feature-api-boundary.mjs
```

The PostgreSQL suite loads real schema/functions into PGlite, with nonempty
fixtures for every table. Attacks switch to `anon` or `authenticated` and set the
caller identity; neither role owns the tables or has BYPASSRLS. Temporary grants
inside rollback transactions isolate RLS from schema/ACL denials. Some policy-only
probes disable unrelated integrity triggers in that disposable transaction, so
a trigger denial cannot produce a false pass. The application smoke tests retain
the real triggers and call the restricted bridges separately.

The API script refuses service-role keys. By default it tests a logged-out visitor;
optional `OWNER_ACCESS_TOKEN` and `OTHER_ACCESS_TOKEN` add real authenticated HTTP
sessions and must identify distinct users. It checks all 30 private tables and
four RPC permission boundaries. It is an API-exposure test, not a substitute for
the PostgreSQL mutation tests.

Run `supabase/security/verify-game-feature-rls.sql` as the database administrator
after deployment for live owner, unrelated-user and anonymous role assertions.
It requires real existing fixtures, makes a no-op owner update, tests ownership
reassignment, then rolls back all writes and temporary grants.

Before this change, 23 tables lacked RLS, while all 30 were already hidden by
private-schema/table permissions. The red tests demonstrate the missing database
boundary under accidental grants; they do not establish that browser users could
previously access these tables. Already-secure internal tables should pass before
the change. Do not weaken them to manufacture failures.

## New installations

Use the complete ordered migration chain, including
`20261119171202_snipe_dormspace_shared_points_rls.sql`. The historical schema
snapshot alone is not a complete application installation. The migration fails
if prerequisite tables or unexpected policies are present, rather than quietly
leaving part of the feature unsecured. No data is deleted or reward rate changed.
