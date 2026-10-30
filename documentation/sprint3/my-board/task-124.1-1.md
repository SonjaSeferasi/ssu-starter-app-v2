# Task 124.1-1 Data contract and ownership

Parent: SRS-124.1, LN — Save My Board. (attach the actual parent issue using GitHub sub-issues).
Owner: Linh Nguyen (Dieulinhh23).
Traces to: UR-124.
Sprint: 3. Status: In progress; keep open pending acceptance and integration.

Scope: Reuse profile-space JSON and pinned-memory IDs for a validated board with bounded content, unique IDs, coordinates, width and rotation. Preserve existing look fields and owner/block permissions.

Existing contract/code: lib/profile-board.ts; lib/profile-space.ts; existing socialu_profile_space and memory RPCs.

Acceptance: A valid board survives an isolated PostgreSQL save/read, other authorized viewers see its saved values, and another student cannot replace the owner’s board.

Actual code branch: https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/linh/srs-124.1-save-my-board
Evidence: local prototype tests/build passed; live evidence and merged PR pending. Do not backdate the prototype or claim the SRS branch preceded it.

Published implementation: https://github.com/SonjaSeferasi/ssu-starter-app-v2/commit/ccd4b3f
The verification task is still pending live evidence; do not claim completion from code alone.
