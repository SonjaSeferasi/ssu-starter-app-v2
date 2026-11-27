# Linh's personal Sprint 6 run — #1432

These are instructions for **Linh to execute personally**, not an execution record.
The agent has not run the attacks, applied SQL, created fixture users, or produced result screenshots.

## 1. Use the actual implementation branch

Use a clean checkout so your unrelated work is preserved:

```bash
git clone --single-branch --branch rls-student-profiles-table https://github.com/SonjaSeferasi/ssu-starter-app-v2.git ssu-sprint6-ln
cd ssu-sprint6-ln
npm ci
cp .env.rls.example .env.rls.local
```

Use Node 22 or newer. The new command is `npm run test:security:ln`; the generic `test:security` command runs teammates' existing PGlite tests and is **not** this assignment's live anon-key evidence. The LN suite is opt-in and is not selected by ordinary `npm test`.

## 2. Select a disposable Supabase test instance

Use an approved nonproduction Supabase project or a local Supabase stack with the **real SocialU migrations**, not a parallel profile-shaped mock table. If you only have the shared production project, stop and arrange a test instance with the team. Do not reset or weaken production protections.

For an empty approved hosted test project, you can use the Supabase CLI to link this clean checkout to that project's ref and apply the existing migrations. Inspect the destination yourself before any database command:

If the table-list query returns no public/socialu app tables, the project has not been initialized yet. This helper reads only the selected test URL/ref for display and **prints** the commands; it never connects to a database, runs SQL or runs tests:

```bash
node scripts/ln-sprint6-schema-commands.mjs
```

Follow its commands one at a time. It prints login, the exact test-project link command and a migration dry run before the actual push. See the [official CLI documentation](https://supabase.com/docs/reference/cli/supabase-db-push). Do not paste a partial schema or run the destructive development reset instead. The repository's first migration uses CREATE SCHEMA and refuses to overwrite an existing socialu schema.

```bash
npx supabase login
npx supabase link --project-ref YOUR_DISPOSABLE_PROJECT_REF
npx supabase db push --dry-run
# Inspect the target and plan before continuing:
npx supabase db push
```

This is for an empty disposable project only. Do not run `supabase/schema.sql` as a reset against a shared database. If a migration fails, stop and retain that setup error; it is not an attack result. The fix is intentionally a manual script outside `supabase/migrations`, so installing the existing migrations does not silently apply it before your BEFORE run.

In the test project's API/Data API settings, add `socialu` to the exposed schemas. Then personally run `supabase/sprint6-ln/student-profiles-test-project-setup.sql` in that project's SQL Editor. This grants direct test access only to the real target table for anon/authenticated callers. The administrator also receives narrow fixture grants. **It never disables RLS** and refuses setup if the target already has RLS enabled. Use a fresh test baseline rather than weakening a secured table.

This controlled exposure demonstrates RLS independently of schema/table grants. It does **not** establish that the current production project, whose raw schema is private, is exploitable.

Edit `.env.rls.local` yourself with this test instance's URL, matching project ref, public anon/publishable key, and separate service-role/secret key. For a local stack, set the ref to `local` and URL to its localhost API address. Never paste keys into an issue, screenshot, chat or commit. The suite does not read your app's `.env.local`.

Notify your team that the run will create six disposable real Auth users and SocialU rows. Only then set `RLS_TEST_CONFIRM_DISPOSABLE=yes` and `RLS_TEST_TEAM_NOTIFIED=yes`. These acknowledgments are your confirmations, not proof supplied by an agent.

## 3. Personally capture BEFORE

Open Terminal yourself in this checkout and run:

```bash
npm run test:security:ln
```

Capture the real terminal showing the command, target suite and individual failed attacks. Genuine failures mention LEAK, TAMPERING, IMPERSONATION, OWNERSHIP TRANSFER or DESTRUCTION. SETUP/INFRASTRUCTURE errors, missing credentials, unavailable schema, missing grants and login failures are **not** valid before evidence. Resolve those first.

The suite has 12 checks: nine prohibited behaviors and three allowed behaviors. That count is from source review; no actual result or failure count has been measured by the agent. Before RLS, prohibited behaviors are expected to fail; positive owner/campus checks should already work. If everything passes before the fix, stop and investigate the actual protection—do not fabricate failures or disable production RLS.

All attack clients are built with the public anon key; signed-in attacks obtain their own Auth token through signInWithPassword. The service-role client is used only for fixtures, the setup manifest and independent database verification. The tests restore only their own fixture rows between cases, then remove those rows and Auth users. Cleanup failures are reported; resolve them before another run.

## 4. Personally apply the policy and capture the catalog

In the **same test project's SQL Editor**, run the complete `supabase/rls-student-profiles.sql` file. Then run `supabase/sprint6-ln/student-profiles-inspect.sql`.

Capture the real results together:

- `socialu.student_profiles`: `rls_enabled=true`.
- Three policies, scoped to authenticated: SELECT, INSERT, UPDATE.
- UPDATE has both USING and WITH CHECK.
- No DELETE policy and no anon policy.

Do not rerun the insecure test-project setup after applying the fix. It deliberately refuses an already-secured table.

## 5. Personally capture AFTER with the same tests

Run the **same command and test revision**, without editing assertions:

```bash
npm run test:security:ln
```

Capture the real passing output. If a test fails, retain the failure and report its message for a code correction; do not mark the card Done. Before/after setup makes new randomly identified fixtures in the same project; the table, rule expectations and attack code remain the same.

## 6. Personally check the running app

Use the integrated branch with app `.env.local` configured for that same test instance. Do not reuse production credentials accidentally. Use your approved demo accounts, not the disposable suite accounts (the suite deletes those).

```bash
npm run dev
```

Verify, from one laptop/codebase:

1. The owner edits their profile biography and reloads; the change remains.
2. An allowed same-school student sees the owner's profile.
3. A blocked student and a student from another school cannot view that profile.
4. Profile setup/photo behavior and normal account flows still work through the existing authenticated backend.

Direct RLS does not replace backend authorization. Existing SECURITY DEFINER RPCs/service_role bypass row policies, so the app's authorization checks still matter. Photo validation triggers, seven-day display-name limits and private Storage access remain separate checks.

## 7. Finish the card and PR honestly

- Card: https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1432
- Branch: https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/rls-student-profiles-table
- Ensure Dieulinhh23 is assigned, add the card to the team Project and move it as actual work progresses.
- Attach YOUR before, catalog and after screenshots, plus the app regression evidence. Name who ran the commands and the real run date.
- Open a PR from this branch to main using [the prepared description](pull-request.md). Keep it draft while personal verification is pending. Its description includes `Closes #1432`.
- Link that PR to the card. Merge/Done only after actual acceptance and evidence. Do not rewrite earlier history or claim these prepared files are a completed sprint.

For the five-minute demo, explain: auth.uid resolves to the verified student; SELECT checks school/blocks; INSERT checks ownership; UPDATE checks both old and new ownership; absent DELETE/anon policies deny by default. Run the attacks yourself during the demo as required.
