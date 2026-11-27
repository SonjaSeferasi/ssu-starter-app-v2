# RLS rules — card #1432

## Sprint 6 ownership and scope
Owner: Linh Nguyen (LN), GitHub Dieulinhh23. Claimed 27 November 2026 before implementation. No existing RLS claim for student_profiles was found in the shared repository issues.
Table: socialu.student_profiles. Owner column: student_id (BIGINT), linked through socialu.students.auth_user_id to auth.uid().
The assignment names public; Linh confirmed the instructor permits socialu tables. This is the actual app table, not a parallel demonstration table.

## Rules designed before SQL
| Operation | Who may act | Which rows / conditions |
|---|---|---|
| SELECT | Verified, active authenticated students | Their own profile and eligible same-school profiles when neither student has blocked the other. Preserve the existing campus profile-viewing behavior. No anonymous or cross-school reads. |
| INSERT | Verified, active authenticated owner | Only student_id belonging to auth.uid(); a non-null photo_id must refer to that owner's media asset. |
| UPDATE | Verified, active authenticated owner | USING permits only the owner's existing row; WITH CHECK preserves ownership and checks photo ownership. |
| DELETE | Nobody through direct Data API | No DELETE policy. Account lifecycle/deactivation remains in the existing privileged backend. |
| anon | Nobody | No policy; visitors see no rows. |

Traces to SRS-109 (profile setup/photo), SRS-110 (edit profile), SRS-113 (view profiles), SRS-121 (blocking), and SRS-NFR-23/24 (private data / unauthorized access). Identity must be resolved from the authenticated JWT, never a caller-supplied owner ID. Privileged API routes must retain their existing authorization checks.

## Workflow / evidence rule
Branch created before implementation: rls-student-profiles-table.
Policy SQL and the opt-in attack harness are prepared. SQL has NOT been applied. No test has been run for this card.
**Linh must personally run all assignment tests and capture evidence. An AI agent must not run the before/after tests or represent agent results as Linh's results.**
Required evidence, all pending:
- [ ] Linh's before screenshot: actual anon-key attacks fail because the attacks succeed.
- [ ] SQL Editor screenshot: RLS enabled and SELECT/INSERT/UPDATE policies listed.
- [ ] Linh's after screenshot: the SAME tests pass.
- [ ] Linh's app regression/demo evidence: owner edit and allowed campus viewing still work.

## Important test boundary
Use real Supabase SDK clients initialized with the public anon key (plus each test user's login token). service_role is allowed only for fixture administration and independent verification, never for attacks.
The current socialu schema uses server-private grants. Missing-schema/grant errors must STOP the test setup; they are not RLS successes. Only use an isolated approved test Supabase project/stack for any temporary table exposure or insecure before state; do not disable production protections.
Tell teammates before personally starting tests because setup creates real disposable users/rows.

## Definition of Done
Linh has run and explained the attacks, attached the three real screenshots, verified the integrated app, and the table-named branch is merged through a PR containing Closes #this-issue. Keep this card open until every item is met.


## Publication status — 27 November 2026
Linh created [#1432](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1432). Its published rules were read and verified before the policy SQL was written. Assignment to Dieulinhh23 was subsequently verified. Earlier publication-pending wording is preserved in Git history; it is no longer the current state. Board placement and personal execution/evidence are still pending verification. The connected app still lacks write permission, so Linh must attach results and update the card directly.

