Student profile rows lacked RLS. Add owner-bound INSERT/UPDATE policies and a SELECT policy that preserves eligible campus profile viewing while denying visitors, blocks and cross-school access. No direct DELETE policy is added. Existing backend authorization, validation triggers, grants and production schema exposure are preserved.

Closes #1432

## Scope and traceability

- Owner: Linh Nguyen (LN / Dieulinhh23).
- Table/branch: socialu.student_profiles / rls-student-profiles-table.
- The card's rules were verified as published before writing the policy SQL.
- Linh confirmed instructor approval for the socialu schema.
- Additive manual policy script: supabase/rls-student-profiles.sql.
- Separate opt-in real Supabase anon-key harness and isolated-project setup/inspection scripts.
- Manual run instructions: documentation/sprint6/ln/manual-run.md.

## Verification — pending Linh's personal runs

The agent has NOT run the tests, applied SQL, created test accounts or captured results. No passing security outcome is claimed.

- [ ] Linh personally ran the before tests and attached genuine failed-attack evidence.
- [ ] Linh personally applied SQL and attached RLS/policy catalog evidence.
- [ ] Linh personally ran the same unchanged tests after the fix and attached passing evidence.
- [ ] Linh personally checked the integrated app and attached evidence.
- [ ] Fixture cleanup verified; no production grants/schema exposure changed.
- [ ] Card is assigned, on the team board, and links this PR/branch/evidence.

Keep this PR DRAFT until the checklist is satisfied. Do not merge unfinished work or interpret agent preparation as Linh's required execution. Controlled exposure in the disposable test project proves RLS independently of grants; it does not prove a production data leak.
