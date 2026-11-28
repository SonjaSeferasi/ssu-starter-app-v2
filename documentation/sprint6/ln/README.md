# Linh Nguyen — Sprint 6 preparation

## Instructor feedback that controls this sprint

“I took off 5 points because an AI agent ran the tests and the assignment requires you to run them yourself here.”

Linh must personally execute all assignment test commands, inspect the results, and capture the required screenshots. An agent may draft code, policies and instructions, but must not run those tests or manufacture terminal output/screenshots. A prepared test is not a passing test. No Sprint 6 tests have been executed during this preparation.

## Security first

Claimed table: `socialu.student_profiles`; owner: `student_id`, linked to `socialu.students.auth_user_id`. Linh confirmed the instructor permits the `socialu` schema. Teammate claims found on 27 November: avatar_photo_faces (#1379, SS), post_likes (#1380, MS), events (#1382, KB), messages (#1384, LP). None is taken for this work.

1. [Rules card #1432](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1432) is published and assigned to Dieulinhh23. Rules were verified before writing policy SQL. Add it to the shared Project if not already there; board placement has not been verified.
2. Branch `rls-student-profiles-table` was created before implementation. The manual SQL and real Supabase anon-key attack harness are now prepared on it, not executed. Follow [Linh's personal run instructions](manual-run.md). PGlite role simulation is not used as a substitute for the required anon-key execution.
3. Choose a dedicated, nonproduction Supabase test instance with the real app schema/migrations. Keep production grants and schema exposure unchanged. Missing Data API exposure/grants are setup errors, not evidence that RLS blocked an attack. Record any controlled exposure used to test RLS independently of grants.
4. Linh tells teammates before personally running tests that create disposable real accounts/rows. Run the before tests, capture actual failures, and keep the exact commands/test revision.
5. Linh applies the SQL in the SQL Editor and personally runs catalog checks. Capture RLS enabled and the actual policies.
6. Linh reruns the same tests, captures the passing results, and personally checks owner edits, allowed campus profile viewing, blocked/cross-school denial, and the integrated app.
7. Create a PR from the actual implementation branch containing `Closes #<RLS-card>`. Link branch/PR/evidence from the card. Merge and mark Done only after Linh's evidence and acceptance exist.

## Sprint feature candidates — existing LN work, not newly completed features

Keep security first, then reported defects, then missing SRS items. These are candidates for a small carryover sprint, not a claim that old implementation is new Sprint 6 work:

- [SRS-124.1 Save My Board, #1038](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/1038): existing implementation is merged. Inspect the current state of deployment defect #1299 before selecting new work. The old parent records pending team sign-off; do not invent that sign-off or replace its history. Existing original task sub-issues #1039–#1042 must not be duplicated or reopened without a specific new finding.
- [SRS-107.5 Login location, #878](https://github.com/SonjaSeferasi/ssu-starter-app-v2/issues/878): existing tasks #1048–#1051 cover recorded data, authenticated API, UI and acceptance evidence. Confirm which are actually still outstanding. Do not claim location data was captured without personally verifying a real record. Create a correctly SRS-named branch before any new implementation for this item; retain historical branch/prototype notes honestly.

Before selecting either, review the current issue and existing implementation. Assign every selected parent and actual task to Linh. Use genuine sub-issues, not standalone task cards. Do not move another person's cards. Board status must reflect actual work as it occurs; no backdating or batch-completion claim.

## Evidence and Canvas checklist

- Team Project link.
- Each selected SRS card, its actual task sub-issues, branch, merged PR, and Linh's running-app screenshot.
- RLS card with pre-SQL rules, Linh's before screenshot, SQL catalog screenshot, and after screenshot.
- RLS branch/PR and saved policy script in `supabase/`.
- A personal five-minute demo from the integrated codebase: Linh runs the attack tests and explains each rule.

Current status: implementation prepared, personal verification pending. No SQL applied, no security result claimed, no screenshot fabricated, no PR or Done status claimed.
