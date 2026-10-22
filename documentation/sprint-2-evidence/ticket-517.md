Owner: Sonja Seferasi (SS)
Sprint 2 acceptance audit, 22 October 2026. Status: implementation evidence recorded; live acceptance pending.

## Exact system requirement
##### SRS-608.2, SS — Preview an outfit selection.

When a student selects an available outfit, the system shall display that complete outfit on the Game Room avatar.

Acceptance criterion: Given the outfit selector is open, when an outfit is selected, then the avatar displays the selected complete outfit.

Traces to: UR-608.

Source: [canonical SRS](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/documentation/SocialU_SRS_Editable.md#ur-608).

## Current implementation and vertical slice
Selecting an available outfit updates the draft avatar immediately. The opt-in collection adds 144 transparent pieces with calibrated layering. All 1,224 supported head/tone/top/bottom combinations pass layout checks. Live selector interaction remains pending. This is supporting avatar work. Sonja requested that Sprint 2 organization focus on the existing Jumpyland SRS cards already in the project backlog. No formal demo selection is claimed by this card.

Code/test locations: [components/game-room/game-room.tsx](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/game-room/game-room.tsx), [components/game-room/avatar-preview.tsx](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/game-room/avatar-preview.tsx), [components/game-room/layered-avatar.tsx](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/game-room/layered-avatar.tsx), [lib/avatar-layers.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/lib/avatar-layers.ts), [__tests__/avatar-art.test.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/__tests__/avatar-art.test.ts).

## Merge and verification evidence
Merged avatar implementation: [PR #515](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/515). Branch: [feature/avatar-layered-collection](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/feature/avatar-layered-collection). Reviewed integrated code: [eab5235](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/eab5235b867e608693240ede1184c7ba23d1c843).

Validation on 22 October 2026: 606 tests passed across 54 files; production build passed with 41 pages. API tests use mocks; avatar persistence tests execute the real schema and migration in a disposable database. Hosted saving, sign-out/return acceptance and current browser screenshots were not verified. The browser integration exposes no available browser. New layered saves require 20261018020000_avatar_layers.sql in the hosted database.

These issue records document existing work today; their dates do not backdate development. A merged PR does not replace live acceptance. No teammate's ownership or Sprint 1 records are changed.

## Picture
![Avatar artwork composition render](https://raw.githubusercontent.com/SonjaSeferasi/ssu-starter-app-v2/eab5235b867e608693240ede1184c7ba23d1c843/output/avatar-art/outfits.png)
This is a render of imported layers using the actual layout, not a running-application screenshot.

## Demo / acceptance
Sign in, open Game Room, use an entitled outfit and provided face, try the new collection, preview another combination, explicitly Save, then return and verify the confirmed appearance. Capture the actual app for this requirement. Do not claim automatic saving: the current editor uses Save avatar, per Sonja's later request. SRS-608.3/608.5 and failure behavior in SRS-608.6 need requirements reconciliation before acceptance.

- [x] Merged implementation and automated evidence linked.
- [x] Artwork picture attached with its evidence type identified.
- [ ] Hosted migration and account-specific acceptance verified.
- [ ] Actual browser screenshot and live demo recorded.

Board access limitation: the available GitHub credential lacks Projects scopes, so this issue has not been added to a Sprint 2 view by this audit.

## Actual linked sub-issues
- [x] #522 — Task 608.2-1 — Implement immediate account-owned outfit preview
- [x] #523 — Task 608.2-2 — Verify imported artwork and preview data contracts
- [ ] #524 — Task 608.2-3 — Demonstrate signed-in outfit preview and attach app screenshot

Two implementation/automated-verification tasks are complete. Live acceptance remains open; the requirement is not claimed Done.
