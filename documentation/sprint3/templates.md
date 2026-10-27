# Sprint 3 — copyable GitHub templates

Replace every `<placeholder>` before publishing. These are templates, not existing issues or completed work. Assign all actual parent and task issues to `Dieulinhh23`.

## SRS parent issue

Title: `<paste the EXACT SRS heading, including SRS number, LN and wording>`

```markdown
<paste the exact shall statement>

Acceptance criterion: <paste the exact acceptance criterion>

Traces to: UR-<number>

Owner: Linh Nguyen (LN), GitHub: Dieulinhh23.
Sprint: 3. Initial status: Sprint Backlog. Implementation not started.
Priority: <dependency order and brief reason>.

Source SRS: <link to canonical requirement>
URD story: <link to corresponding story>
UR overview: #<existing overview issue>

## Existing baseline and intended change
<State what already exists and exactly what remains to implement.>

## Implementation
Branch created before coding: <actual SRS-named branch link>
Pull request: not opened yet.

## Task sub-issues
Use GitHub's sub-issue controls to attach the actual data/API/UI/verification tasks.
All tasks remain open until completed; do not claim progress from this template.

## Evidence
Running-app screenshot: pending implementation.
Automated checks: not run for this item yet.
Live acceptance: pending.

## Findings
SRS/schema changes: none identified yet; record any actual findings here.
```

## Task sub-issue

Title: `Task <SRS number>-<sequence> <specific action for this behavior>`

```markdown
Parent: #<SRS parent issue> — SRS-<number>.
Owner: Linh Nguyen (Dieulinhh23).
Traces to: UR-<number>.
Initial status: Sprint Backlog; not started.

Scope: <one necessary piece of the parent's exact behavior>.
Existing contract/code: <relevant files, tables or functions>.
Acceptance: <observable outcome that proves this task is complete>.
Evidence: <add actual code/PR/test or screenshot link when available>.

Also attach this issue as a real sub-issue using GitHub's relationship controls.
```

Possible tasks, adapted to each item's needs:

1. Data contract: verify/reuse existing tables and ownership rules; change schema only if needed.
2. API: implement authenticated request/response behavior for the specific requirement.
3. UI: connect the actual control and show its saved/returned result and applicable errors.
4. Verification: test relevant boundaries and demonstrate the parent criterion in the running app; attach its screenshot to the parent.

## Implementation PR — only after actual work

```markdown
<Concrete problem and resulting behavior.>

SRS issue: #<parent>
Implementation branch: <this item's actual SRS-named branch>

## Validation
<Commands run and actual results; distinguish mocks, disposable database tests and live acceptance.>

## Evidence and setup
<Link real running-app screenshot on the parent; describe migration/deployment needs if any.>

Closes #<completed task>
Closes #<completed task>
```

Include closing references only for real completed tasks. Link a partially accepted parent without closing it. Do not open an empty implementation PR or add invented results just to fill in this template.
