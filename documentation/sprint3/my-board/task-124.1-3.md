# Task 124.1-3 Connect the board editor and profile tab

Parent: SRS-124.1, LN — Save My Board. (attach the actual parent issue using GitHub sub-issues).
Owner: Linh Nguyen (Dieulinhh23).
Traces to: UR-124.
Sprint: 3. Status: In progress; keep open pending acceptance and integration.

Scope: Provide the scrapbook editor for photos, notes, stickers, project and Spotify cards; moving, size, rotation, removal, Save board and unsaved-change feedback. Keep Posts, Tagged and private Saved.

Existing contract/code: components/profile/profile-board.tsx; profile-content-tabs.tsx; profile-view.tsx; profile-decorator.tsx.

Acceptance: The running app permits editing the owner’s board, saves through the real API, renders the result after reload and exposes no editing controls on another student’s board.

Actual code branch: https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/linh/srs-124.1-save-my-board
Evidence: local prototype tests/build passed; live evidence and merged PR pending. Do not backdate the prototype or claim the SRS branch preceded it.

Published implementation: https://github.com/SonjaSeferasi/ssu-starter-app-v2/commit/ccd4b3f
The verification task is still pending live evidence; do not claim completion from code alone.
