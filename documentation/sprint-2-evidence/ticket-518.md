Owner: Sonja Seferasi (SS)
Sprint 2 acceptance audit, 22 October 2026. Status: implementation evidence recorded; live acceptance pending.

## Exact system requirement
##### SRS-608.4, SS — Preview a default face.

When a student selects a provided default face, the system shall display that face on the Game Room avatar.

Acceptance criterion: Given default faces are available, when one is selected, then the avatar displays it without requiring a photograph.

Traces to: UR-608.

Source: [canonical SRS](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/documentation/SocialU_SRS_Editable.md#ur-608).

## Current implementation and vertical slice
Provided faces remain selectable without a photograph. The opt-in collection supplies 11 hairstyles and six hijab choices, each in six tones; glasses use calibrated eye positions. Composition renders verify artwork placement, not actual browser interactions.

Code/test locations: [components/game-room/avatar-preview.tsx](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/game-room/avatar-preview.tsx), [components/game-room/layered-avatar.tsx](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/game-room/layered-avatar.tsx), [components/game-room/face-details.tsx](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/game-room/face-details.tsx), [public/avatars/v2/overrides.json](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/public/avatars/v2/overrides.json).

## Merge and verification evidence
Merged avatar implementation: [PR #515](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/515). Branch: [feature/avatar-layered-collection](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/feature/avatar-layered-collection). Reviewed integrated code: [eab5235](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/eab5235b867e608693240ede1184c7ba23d1c843).

Validation on 22 October 2026: 606 tests passed across 54 files; production build passed with 41 pages. API tests use mocks; avatar persistence tests execute the real schema and migration in a disposable database. Hosted saving, sign-out/return acceptance and current browser screenshots were not verified. The browser integration exposes no available browser. New layered saves require 20261018020000_avatar_layers.sql in the hosted database.

These issue records document existing work today; their dates do not backdate development. A merged PR does not replace live acceptance. No teammate's ownership or Sprint 1 records are changed.

## Picture
![Avatar artwork composition render](https://raw.githubusercontent.com/SonjaSeferasi/ssu-starter-app-v2/eab5235b867e608693240ede1184c7ba23d1c843/output/avatar-art/hairstyles-1.png)
This is a render of imported layers using the actual layout, not a running-application screenshot.

## Demo / acceptance
Sign in, open Game Room, use an entitled outfit and provided face, try the new collection, preview another combination, explicitly Save, then return and verify the confirmed appearance. Capture the actual app for this requirement. Do not claim automatic saving: the current editor uses Save avatar, per Sonja's later request. SRS-608.3/608.5 and failure behavior in SRS-608.6 need requirements reconciliation before acceptance.

- [x] Merged implementation and automated evidence linked.
- [x] Artwork picture attached with its evidence type identified.
- [ ] Hosted migration and account-specific acceptance verified.
- [ ] Actual browser screenshot and live demo recorded.

Board access limitation: the available GitHub credential lacks Projects scopes, so this issue has not been added to a Sprint 2 view by this audit.
