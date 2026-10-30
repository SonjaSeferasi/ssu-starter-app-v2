# SRS-124.1, LN — Save My Board.

The system shall persist the signed-in student's personal profile board when the student selects Save board.

Acceptance criterion: Given the student has valid board edits, when Save board succeeds and the profile is reloaded, then the saved card contents, positions, sizes, and rotations are displayed on that student's My Board.

Traces to: UR-124

Owner: Linh Nguyen (LN), GitHub: Dieulinhh23.
Sprint: 3. Status: In progress; local prototype exists, live acceptance and review are pending.
Priority: After the existing selected Login Activity items; this is one additional vertical slice, not a replacement for them.

Source SRS and URD addendum: https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/linh/sprint-3-my-board-traceability/documentation/sprint3/my-board/srs-addendum.md#srs-1241
Stakeholder source: Linh's October 30 request to add the scrapbook board to the profile and Sprint 3.

## Existing baseline and actual change
Reuse profile-space JSON storage, owner permissions, private pinned-memory uploads and the sticker catalog. Add My Board, its editor and authenticated save/confirm behavior. Preserve Posts, Tagged and private Saved. No new board migration is required.

## Implementation and process finding
Actual implementation branch: https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/linh/srs-124.1-save-my-board
PR: pending publication; do not record a merged PR until it exists.
The local prototype was written before this SRS card on the profile-photo-polish branch. The SRS-named implementation branch is a later traceability correction; it was not created before the prototype. Do not backdate this history or count an empty branch as implementation evidence. Further work belongs on the actual SRS branch.

## Task sub-issues
Attach four real sub-issues covering data, API, UI and verification from issue-plan.json. Assign every child to Dieulinhh23. A checklist alone is not a GitHub sub-issue relationship.

## Evidence and remaining work
Automated prototype verification: 1,077 tests in 124 files pass; production build passes. Relevant checks: profile-board.test.ts, api/profile-space.test.ts, database/profile-space.test.ts and profile-card-decorations.test.ts. The database test includes owner persistence and another authorized viewer reading the saved fractional positions and rotations. These are isolated tests, not a live hosted acceptance claim.
Running app preview: http://localhost:3003/profile → My Board.
Live Save board → reload → visitor acceptance: pending browser reconnection.
Running-application screenshot: pending; the reference design is not application evidence.
Keep the SRS and verification task open/In progress until real evidence and the reviewed merge meet the Definition of Done. Do not close existing Sprint 1 or Sprint 2 cards for this new behavior.


## Published code — October 30, 2026
Actual board implementation commit: https://github.com/SonjaSeferasi/ssu-starter-app-v2/commit/ccd4b3f
The SRS branch contains real board changes. GitHub issue/PR creation and project updates remain blocked by connector permissions and browser timeouts; the feature is not merged into main.
