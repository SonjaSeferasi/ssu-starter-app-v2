## Sprint 6 — Linh Nguyen (LN)
**Owner / assignee:** Dieulinhh23  
**Table:** `socialu.student_profiles`  
**Owner column:** `student_id` (BIGINT), resolved through `socialu.students.auth_user_id = auth.uid()`.  
**Status:** Personal before/after security runs supplied; screenshot attachment, integrated-app acceptance and PR/merge remain pending.

Linh confirmed instructor approval to use the socialu schema although the assignment names public. This is the app's actual table, not a parallel demonstration table. The rules below were published on this card before the policy SQL was written. The table-named branch existed before implementation.

## Rules designed before SQL
| Operation | Who may act | Which rows / conditions |
|---|---|---|
| SELECT | Verified, active authenticated students | Their own profile and eligible same-school profiles when neither student has blocked the other. Anonymous, blocked, unverified and cross-school reads are denied. |
| INSERT | Verified, active authenticated owner | Only their own student_id, resolved from auth.uid(); any photo_id must refer to their own profile media asset. |
| UPDATE | Verified, active authenticated owner | USING restricts the existing row to the owner; WITH CHECK preserves ownership and checks photo ownership. |
| DELETE | Nobody through the direct Data API | No DELETE policy. Privileged account lifecycle operations remain separate. |
| anon | Nobody | No policy; default deny. |

**SRS trace:** SRS-109 (profile setup/photo), SRS-110 (profile editing), SRS-113.1 / 113.10 / 113.15 (campus profile access and blocking), SRS-121.8 (blocked profile access), SRS-NFR-23/24 (data/access protection). Traces to UR-109, UR-110, UR-113 and UR-121. Existing API authorization and validation remain necessary because service_role/SECURITY DEFINER code bypasses RLS.

## Branch and implementation
- [Actual table-named branch: rls-student-profiles-table](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/rls-student-profiles-table)
- [Pre-implementation rules commit d3cc04c](https://github.com/SonjaSeferasi/ssu-starter-app-v2/commit/d3cc04c)
- [Initial policy/harness commit 2e6fc4b](https://github.com/SonjaSeferasi/ssu-starter-app-v2/commit/2e6fc4b)
- [Policy SQL](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/rls-student-profiles-table/supabase/rls-student-profiles.sql)
- [Attack suite at e601dfd, used for the personal before/after runs](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/e601dfd/__tests__/security/live/rls-suite.ts)
- [Personal execution guide](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/rls-student-profiles-table/documentation/sprint6/ln/manual-run.md)
- [SQL catalog inspection queries](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/rls-student-profiles-table/supabase/sprint6-ln/student-profiles-inspect.sql)

The SQL enables RLS and creates ln_profiles_read (SELECT), ln_profiles_insert (INSERT) and ln_profiles_update (UPDATE). UPDATE has both USING and WITH CHECK. There is no DELETE or anon policy.

## Test method and scope
Linh personally ran this command in Terminal before and after applying the SQL:
```bash
npm run test:security:ln
```

The SAME test code and assertions were used. Real Supabase Data API attacks use clients initialized with the public anon/publishable key; signed-in attackers receive their own login tokens. The separate secret/service-role client is used only for fixture setup, cleanup, metadata checks and independent verification—not attacks.

Execution target: the separate disposable project socialu-rls-sprint6-test. Controlled schema exposure and test-table grants were used there to test RLS independently of grants. This is not proof of a leak from the shared production project. Original migration SQL was retained; a local installation copy resolved duplicate migration-version labels without rewriting shared migration history.

Earlier missing-key, schema-exposure and fixture-permission failures skipped the attacks. They are setup history, NOT before evidence.

## Linh's personal results — supplied 28 November 2026
### Before applying the fix
**RLS=false; 9 failed, 3 passed (12 executed).** Linh supplied the complete Terminal log:
- Anonymous, blocked, cross-school and app-unverified callers read forbidden fixture profiles.
- Bob changed Alice's biography.
- Bob created Carol's profile.
- Bob reassigned his own profile row to Carol.
- Bob deleted Alice's profile.
- An owner directly deleted their own profile.
- The three permitted-operation checks passed.

### SQL Editor verification
Linh reported applying the policy script successfully and supplied screenshots showing:
- `rls_enabled = true`.
- Exactly three policies: INSERT, SELECT and UPDATE, scoped to authenticated.

### After applying the fix
**12 passed (12 executed).** Linh supplied the green Terminal screenshot showing all nine prohibited behaviors blocked and all three permitted behaviors working:
- Eligible same-school student reads Alice.
- Owner updates and reads their own biography.
- Carol creates her own profile.

AI assisted with drafting/debugging files and interpreting Linh's supplied output. The agent did NOT run the security tests or apply the policy SQL. Screenshot evidence seen in chat is not considered attached to this issue until uploaded here.

## Evidence attachments — upload to this card
- [ ] BEFORE: Terminal screenshot showing failed attacks and 9 failed / 3 passed.
- [ ] RLS catalog: screenshot showing rls_enabled=true.
- [ ] Policies: screenshot showing SELECT/INSERT/UPDATE and UPDATE USING/WITH CHECK.
- [ ] AFTER: Terminal screenshot showing all 12 passed.
- [ ] Running-app acceptance: owner edit persists, allowed campus viewer can read, blocked/cross-school access denied.

**Execution caption:** “I, Linh Nguyen, personally ran the same attack tests before and after applying RLS.”

## Remaining work / Definition of Done
- [x] Table selected and card assigned to Dieulinhh23.
- [x] Rules published before policy SQL.
- [x] Actual implementation on a table-named branch created beforehand.
- [x] Linh supplied a genuine failing before log.
- [x] Linh supplied RLS/policy catalog screenshots.
- [x] Linh supplied an all-passing after screenshot.
- [ ] Attach the required screenshots directly to this issue.
- [ ] Confirm placement/status on the team Project; update it as work proceeds.
- [ ] Personally verify the integrated running app and record evidence.
- [ ] Open a PR from rls-student-profiles-table to main with `Closes #1432`.
- [ ] Link that PR here and merge only after acceptance/evidence.
- [ ] Present the integrated demo and personally run/explain the tests.

Keep this issue OPEN and out of Done until the remaining acceptance and merge work is complete. The old publication-pending wording was an earlier checkpoint and is superseded by this dated record; no prior board history is backdated.

