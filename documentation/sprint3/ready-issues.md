> October 28 scope update: SRS-107.6 is now selected for Sprint 3, with real tasks #915–#918. The original templates below are historical preparation; use [README.md](README.md), [issue-plan.json](issue-plan.json) and [publication.json](publication.json) for the current published plan.

# Prepared Sprint 3 issue bodies

These are the original prepared issue/task templates. The cards have since been published through the reconnected GitHub browser; see [the planning index](README.md) and [verified issue links](publication.json). Placeholders below are retained as template text, not a claim that relationships are missing in the published cards. The older #125–#133 records are closed as not planned and remain unchanged.

## SRS-107.1, LN — Login-history access.

Intended board column: **Sprint Backlog**.

```markdown
The system shall allow a signed-in student to view the login history associated with the student's account.

Acceptance criterion: Given a student is signed in, when the Login Activity section is opened, then the student's recorded login history is displayed.

Traces to: UR-107

Owner: Linh Nguyen (LN), GitHub: Dieulinhh23.
Planning date: October 27, 2026.
Priority: 1 in the Login Activity backlog.
Intended board status: Sprint Backlog — Sprint 3, not started.

Source SRS: https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/SocialU_SRS_Editable.md#ur-107
UR overview: #423.
URD: https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/user_requirements.md

Historical issue #125 was closed as not_planned on October 8, 2026; it is not implementation evidence. This is a fresh dated planning record, not a backdated status change.

Dependencies: None within this selection; establish the real storage/API/UI pipeline first.
Implementation branch: https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/linh/srs-107.1-login-history-access
PR: not opened; no implementation yet.

## Acceptance and evidence
Automated results: pending.
Live acceptance and running-app screenshot: pending.
Do not mark Done until the item meets the team Definition of Done. Attach real task sub-issues and assign every task to Dieulinhh23. The prepared task list is not itself a GitHub sub-issue relationship.
```

### Task 107.1-1 Verify login-history storage and account ownership

```markdown
Parent: <replace with the real issue number for SRS-107.1>.
Owner: Linh Nguyen (Dieulinhh23).
Traces to: UR-107.
Initial intended status: Sprint Backlog; not started.

Review database/schema.sql login_sessions and the live auth/session migration contract. Establish which successful sign-ins are recorded, how student ownership is derived, and whether history survives session revocation. Reuse the schema where sufficient; record any real gap before writing a migration. Verify the selected storage contract with isolated database checks.

Attach this issue as a real sub-issue of its SRS parent in GitHub. Keep it open until the task is actually completed. Add code/PR/validation links after the work exists.
```

### Task 107.1-2 Expose the authenticated login-history API

```markdown
Parent: <replace with the real issue number for SRS-107.1>.
Owner: Linh Nguyen (Dieulinhh23).
Traces to: UR-107.
Initial intended status: Sprint Backlog; not started.

Return only the verified signed-in student’s recorded login entries. Reject unauthenticated requests and forged student IDs; return an explicit empty result when no history exists. Do not return token digests, provider tokens or other students’ records.

Attach this issue as a real sub-issue of its SRS parent in GitHub. Keep it open until the task is actually completed. Add code/PR/validation links after the work exists.
```

### Task 107.1-3 Connect Login Activity in Account Settings

```markdown
Parent: <replace with the real issue number for SRS-107.1>.
Owner: Linh Nguyen (Dieulinhh23).
Traces to: UR-107.
Initial intended status: Sprint Backlog; not started.

Provide an entry from Account Settings and render returned login records with loading, empty and error states. Opening the section must read real account data through the API. Do not introduce remote logout in this item.

Attach this issue as a real sub-issue of its SRS parent in GitHub. Keep it open until the task is actually completed. Add code/PR/validation links after the work exists.
```

### Task 107.1-4 Test and capture own-account history access

```markdown
Parent: <replace with the real issue number for SRS-107.1>.
Owner: Linh Nguyen (Dieulinhh23).
Traces to: UR-107.
Initial intended status: Sprint Backlog; not started.

Run the data/API checks and test own-account isolation against forged identity. In the actual integrated app, open Login Activity and attach a screenshot and reproduction steps to the parent. Record the source commit and real observed result.

Attach this issue as a real sub-issue of its SRS parent in GitHub. Keep it open until the task is actually completed. Add code/PR/validation links after the work exists.
```

## SRS-107.2, LN — Complete login history.

Intended board column: **Sprint Backlog**.

```markdown
The system shall make all recorded login-history entries associated with the student's account available in the login-activity section.

Acceptance criterion: Given multiple login records exist, when the student reviews login history, then all recorded entries are available to the student.

Traces to: UR-107

Owner: Linh Nguyen (LN), GitHub: Dieulinhh23.
Planning date: October 27, 2026.
Priority: 2 in the Login Activity backlog.
Intended board status: Sprint Backlog — Sprint 3, not started.

Source SRS: https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/SocialU_SRS_Editable.md#ur-107
UR overview: #423.
URD: https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/user_requirements.md

Historical issue #126 was closed as not_planned on October 8, 2026; it is not implementation evidence. This is a fresh dated planning record, not a backdated status change.

Dependencies: SRS-107.1. Reuse their contracts; do not duplicate implementation.
Implementation branch: https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/linh/srs-107.2-complete-login-history
PR: not opened; no implementation yet.

## Acceptance and evidence
Automated results: pending.
Live acceptance and running-app screenshot: pending.
Do not mark Done until the item meets the team Definition of Done. Attach real task sub-issues and assign every task to Dieulinhh23. The prepared task list is not itself a GitHub sub-issue relationship.
```

### Task 107.2-1 Verify complete-history queries and stable ordering

```markdown
Parent: <replace with the real issue number for SRS-107.2>.
Owner: Linh Nguyen (Dieulinhh23).
Traces to: UR-107.
Initial intended status: Sprint Backlog; not started.

Reuse the history storage from SRS-107.1. Check that query filtering does not discard recorded history just because a session ended. Define deterministic order and stable page boundaries if pagination is needed; avoid claiming unavailable historical records were reconstructed.

Attach this issue as a real sub-issue of its SRS parent in GitHub. Keep it open until the task is actually completed. Add code/PR/validation links after the work exists.
```

### Task 107.2-2 Return every history page without silent truncation

```markdown
Parent: <replace with the real issue number for SRS-107.2>.
Owner: Linh Nguyen (Dieulinhh23).
Traces to: UR-107.
Initial intended status: Sprint Backlog; not started.

Extend the owner-authorized history API so all recorded entries are reachable. Use pagination only if needed, with an explicit continuation contract. Verify ownership on every page and avoid returning a permanently truncated latest-N list.

Attach this issue as a real sub-issue of its SRS parent in GitHub. Keep it open until the task is actually completed. Add code/PR/validation links after the work exists.
```

### Task 107.2-3 Make all recorded history reachable in Login Activity

```markdown
Parent: <replace with the real issue number for SRS-107.2>.
Owner: Linh Nguyen (Dieulinhh23).
Traces to: UR-107.
Initial intended status: Sprint Backlog; not started.

Connect the page/continuation controls or complete-list rendering to the actual API, preserving loading/error feedback. A student must be able to reach older recorded entries, not just see a decorative Load more control.

Attach this issue as a real sub-issue of its SRS parent in GitHub. Keep it open until the task is actually completed. Add code/PR/validation links after the work exists.
```

### Task 107.2-4 Verify older entries and capture complete-history evidence

```markdown
Parent: <replace with the real issue number for SRS-107.2>.
Owner: Linh Nguyen (Dieulinhh23).
Traces to: UR-107.
Initial intended status: Sprint Backlog; not started.

Seed multiple records in disposable database tests and verify none are skipped or duplicated across boundaries. In the real app with an authorized test account, show older recorded entries are reachable and attach a screenshot plus navigation steps to the parent.

Attach this issue as a real sub-issue of its SRS parent in GitHub. Keep it open until the task is actually completed. Add code/PR/validation links after the work exists.
```

## SRS-107.3, LN — Login date.

Intended board column: **Sprint Backlog**.

```markdown
The system shall display the recorded date for each login-history entry.

Acceptance criterion: Given a login-history record exists, when the record is displayed, then its recorded login date is shown.

Traces to: UR-107

Owner: Linh Nguyen (LN), GitHub: Dieulinhh23.
Planning date: October 27, 2026.
Priority: 3 in the Login Activity backlog.
Intended board status: Sprint Backlog — Sprint 3, not started.

Source SRS: https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/SocialU_SRS_Editable.md#ur-107
UR overview: #423.
URD: https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/user_requirements.md

Historical issue #127 was closed as not_planned on October 8, 2026; it is not implementation evidence. This is a fresh dated planning record, not a backdated status change.

Dependencies: SRS-107.1 and SRS-107.2. Reuse their contracts; do not duplicate implementation.
Implementation branch: https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/linh/srs-107.3-login-date
PR: not opened; no implementation yet.

## Acceptance and evidence
Automated results: pending.
Live acceptance and running-app screenshot: pending.
Do not mark Done until the item meets the team Definition of Done. Attach real task sub-issues and assign every task to Dieulinhh23. The prepared task list is not itself a GitHub sub-issue relationship.
```

### Task 107.3-1 Verify recorded login timestamps for date display

```markdown
Parent: <replace with the real issue number for SRS-107.3>.
Owner: Linh Nguyen (Dieulinhh23).
Traces to: UR-107.
Initial intended status: Sprint Backlog; not started.

Reuse the actual signed-in timestamp contract from SRS-107.1. Verify it is stored as an instant rather than replacing historical dates with the current date. Agree and document the date display timezone; no duplicate date column is required when the existing timestamp suffices.

Attach this issue as a real sub-issue of its SRS parent in GitHub. Keep it open until the task is actually completed. Add code/PR/validation links after the work exists.
```

### Task 107.3-2 Return recorded timestamps for date rendering

```markdown
Parent: <replace with the real issue number for SRS-107.3>.
Owner: Linh Nguyen (Dieulinhh23).
Traces to: UR-107.
Initial intended status: Sprint Backlog; not started.

Preserve the recorded timestamp through the authenticated history response, including older pages from SRS-107.2. Return an unambiguous timestamp so UI date formatting does not depend on a guessed server timezone.

Attach this issue as a real sub-issue of its SRS parent in GitHub. Keep it open until the task is actually completed. Add code/PR/validation links after the work exists.
```

### Task 107.3-3 Render the recorded login date for every entry

```markdown
Parent: <replace with the real issue number for SRS-107.3>.
Owner: Linh Nguyen (Dieulinhh23).
Traces to: UR-107.
Initial intended status: Sprint Backlog; not started.

Display a readable recorded date on each Login Activity row using the documented timezone. Reuse the existing layout; handle unavailable dates honestly rather than inventing a date.

Attach this issue as a real sub-issue of its SRS parent in GitHub. Keep it open until the task is actually completed. Add code/PR/validation links after the work exists.
```

### Task 107.3-4 Test date boundaries and capture recorded-date evidence

```markdown
Parent: <replace with the real issue number for SRS-107.3>.
Owner: Linh Nguyen (Dieulinhh23).
Traces to: UR-107.
Initial intended status: Sprint Backlog; not started.

Check multiple dates and near-midnight timezone boundaries with fixed timestamps. In the actual app show the recorded date on login rows, compare it to authorized stored data, and attach a screenshot and steps to the parent.

Attach this issue as a real sub-issue of its SRS parent in GitHub. Keep it open until the task is actually completed. Add code/PR/validation links after the work exists.
```

## SRS-107.4, LN — Login time.

Intended board column: **Sprint Backlog**.

```markdown
The system shall display the recorded time for each login-history entry.

Acceptance criterion: Given a login-history record exists, when the record is displayed, then its recorded login time is shown.

Traces to: UR-107

Owner: Linh Nguyen (LN), GitHub: Dieulinhh23.
Planning date: October 27, 2026.
Priority: 4 in the Login Activity backlog.
Intended board status: Sprint Backlog — Sprint 3, not started.

Source SRS: https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/SocialU_SRS_Editable.md#ur-107
UR overview: #423.
URD: https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/user_requirements.md

Historical issue #128 was closed as not_planned on October 8, 2026; it is not implementation evidence. This is a fresh dated planning record, not a backdated status change.

Dependencies: SRS-107.1 and SRS-107.2. Reuse their contracts; do not duplicate implementation.
Implementation branch: https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/linh/srs-107.4-login-time
PR: not opened; no implementation yet.

## Acceptance and evidence
Automated results: pending.
Live acceptance and running-app screenshot: pending.
Do not mark Done until the item meets the team Definition of Done. Attach real task sub-issues and assign every task to Dieulinhh23. The prepared task list is not itself a GitHub sub-issue relationship.
```

### Task 107.4-1 Verify recorded login timestamps for time display

```markdown
Parent: <replace with the real issue number for SRS-107.4>.
Owner: Linh Nguyen (Dieulinhh23).
Traces to: UR-107.
Initial intended status: Sprint Backlog; not started.

Reuse the login instant and timezone decision from SRS-107.3. Confirm the stored instant includes the time needed for display. Do not substitute request time or add redundant storage just to create a database task.

Attach this issue as a real sub-issue of its SRS parent in GitHub. Keep it open until the task is actually completed. Add code/PR/validation links after the work exists.
```

### Task 107.4-2 Preserve recorded time through history responses

```markdown
Parent: <replace with the real issue number for SRS-107.4>.
Owner: Linh Nguyen (Dieulinhh23).
Traces to: UR-107.
Initial intended status: Sprint Backlog; not started.

Ensure authenticated history responses preserve the recorded time and offset information on every page. Reuse the existing timestamp field; test that serialization does not reset time to midnight or remove the offset.

Attach this issue as a real sub-issue of its SRS parent in GitHub. Keep it open until the task is actually completed. Add code/PR/validation links after the work exists.
```

### Task 107.4-3 Render the recorded login time with clear timezone context

```markdown
Parent: <replace with the real issue number for SRS-107.4>.
Owner: Linh Nguyen (Dieulinhh23).
Traces to: UR-107.
Initial intended status: Sprint Backlog; not started.

Show each entry’s recorded time consistently with its displayed date. Make timezone context understandable so the student can interpret the time; include the real time on older entries too.

Attach this issue as a real sub-issue of its SRS parent in GitHub. Keep it open until the task is actually completed. Add code/PR/validation links after the work exists.
```

### Task 107.4-4 Test time boundaries and capture recorded-time evidence

```markdown
Parent: <replace with the real issue number for SRS-107.4>.
Owner: Linh Nguyen (Dieulinhh23).
Traces to: UR-107.
Initial intended status: Sprint Backlog; not started.

Test fixed instants, midnight and daylight-saving boundaries for the chosen timezone. In the running app verify displayed time against the recorded instant and attach a screenshot and reproduction notes to the parent.

Attach this issue as a real sub-issue of its SRS parent in GitHub. Keep it open until the task is actually completed. Add code/PR/validation links after the work exists.
```

## SRS-107.5, LN — Login location.

Intended board column: **Product Backlog**.

```markdown
The system shall display the recorded location associated with each login-history entry when location information is available.

Acceptance criterion: Given location information exists for a login record, when the record is displayed, then the recorded location is shown.

Traces to: UR-107

Owner: Linh Nguyen (LN), GitHub: Dieulinhh23.
Planning date: October 27, 2026.
Priority: 5 in the Login Activity backlog.
Intended board status: Product Backlog — reserved for later sprint selection; not started.

Source SRS: https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/SocialU_SRS_Editable.md#ur-107
UR overview: #423.
URD: https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/user_requirements.md

Historical issue #129 was closed as not_planned on October 8, 2026; it is not implementation evidence. This is a fresh dated planning record, not a backdated status change.

No Sprint 3 commitment, implementation branch, task decomposition, PR, test result or screenshot is claimed. Revisit after the selected history feature is delivered. Remote logout and other later capabilities must use their own SRS-named branches when selected.
```

## SRS-107.6, LN — Active-session status.

Intended board column: **Product Backlog**.

```markdown
The system shall identify which recorded sessions are currently active.

Acceptance criterion: Given one or more sessions remain active, when login activity is viewed, then each active session is identified as active.

Traces to: UR-107

Owner: Linh Nguyen (LN), GitHub: Dieulinhh23.
Planning date: October 27, 2026.
Priority: 6 in the Login Activity backlog.
Intended board status: Product Backlog — reserved for later sprint selection; not started.

Source SRS: https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/SocialU_SRS_Editable.md#ur-107
UR overview: #423.
URD: https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/user_requirements.md

Historical issue #130 was closed as not_planned on October 8, 2026; it is not implementation evidence. This is a fresh dated planning record, not a backdated status change.

No Sprint 3 commitment, implementation branch, task decomposition, PR, test result or screenshot is claimed. Revisit after the selected history feature is delivered. Remote logout and other later capabilities must use their own SRS-named branches when selected.
```

## SRS-107.7, LN — Remote logout option.

Intended board column: **Product Backlog**.

```markdown
The system shall provide the signed-in student with a logout action for another currently active session associated with the account.

Acceptance criterion: Given another active session exists, when the student views that session, then a remote logout option is available.

Traces to: UR-107

Owner: Linh Nguyen (LN), GitHub: Dieulinhh23.
Planning date: October 27, 2026.
Priority: 7 in the Login Activity backlog.
Intended board status: Product Backlog — reserved for later sprint selection; not started.

Source SRS: https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/SocialU_SRS_Editable.md#ur-107
UR overview: #423.
URD: https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/user_requirements.md

Historical issue #131 was closed as not_planned on October 8, 2026; it is not implementation evidence. This is a fresh dated planning record, not a backdated status change.

No Sprint 3 commitment, implementation branch, task decomposition, PR, test result or screenshot is claimed. Revisit after the selected history feature is delivered. Remote logout and other later capabilities must use their own SRS-named branches when selected.
```

## SRS-107.8, LN — End selected remote session.

Intended board column: **Product Backlog**.

```markdown
The system shall terminate the selected active session after the student completes the remote logout action.

Acceptance criterion: Given another session is active, when the student confirms remote logout for that session, then the selected session is terminated.

Traces to: UR-107

Owner: Linh Nguyen (LN), GitHub: Dieulinhh23.
Planning date: October 27, 2026.
Priority: 8 in the Login Activity backlog.
Intended board status: Product Backlog — reserved for later sprint selection; not started.

Source SRS: https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/SocialU_SRS_Editable.md#ur-107
UR overview: #423.
URD: https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/user_requirements.md

Historical issue #132 was closed as not_planned on October 8, 2026; it is not implementation evidence. This is a fresh dated planning record, not a backdated status change.

No Sprint 3 commitment, implementation branch, task decomposition, PR, test result or screenshot is claimed. Revisit after the selected history feature is delivered. Remote logout and other later capabilities must use their own SRS-named branches when selected.
```

## SRS-107.9, LN — Preserve current session during remote logout.

Intended board column: **Product Backlog**.

```markdown
The system shall keep the session being used to perform the remote logout active when another session is terminated.

Acceptance criterion: Given the student remotely logs out another session, when that logout completes, then the student's current session remains authenticated.

Traces to: UR-107

Owner: Linh Nguyen (LN), GitHub: Dieulinhh23.
Planning date: October 27, 2026.
Priority: 9 in the Login Activity backlog.
Intended board status: Product Backlog — reserved for later sprint selection; not started.

Source SRS: https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/SocialU_SRS_Editable.md#ur-107
UR overview: #423.
URD: https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/user_requirements.md

Historical issue #133 was closed as not_planned on October 8, 2026; it is not implementation evidence. This is a fresh dated planning record, not a backdated status change.

No Sprint 3 commitment, implementation branch, task decomposition, PR, test result or screenshot is claimed. Revisit after the selected history feature is delivered. Remote logout and other later capabilities must use their own SRS-named branches when selected.
```
