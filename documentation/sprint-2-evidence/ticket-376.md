## Sprint 2 current implementation audit — 22 October 2026
Owner: Sonja Seferasi (SS). Existing issue retained; no duplicate SRS card created.

Three authored single-player courses, starts, platforms, gaps, coins, enemies and exits are present. The implementation now uses Three.js with side-view movement, not the originally planned Phaser renderer. It differs from the original two-dimensional rendering plan; confirm the requested 3D presentation in the requirements baseline.

Implementation: [Jumpyland PR #451](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/451), [later integrated Jumpyland merge 04af351](https://github.com/SonjaSeferasi/ssu-starter-app-v2/commit/04af351), and [review baseline eab5235](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/eab5235b867e608693240ede1184c7ba23d1c843). Avatar collection: [merged PR #515](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/515).

Code: [levels.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/jumpyland/levels.ts), [engine.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/jumpyland/engine.ts), [scene-3d.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/jumpyland/scene-3d.ts). Tests: __tests__/jumpyland-challenge.test.ts, jumpyland-mechanics.test.ts, jumpyland-geometry.test.ts, jumpyland-model.test.ts, jumpyland-life.test.ts and api/jumpyland.test.ts. Current integrated check: 606 tests / 54 files passed; production build passed. Unit/geometry checks are not a full signed-in playthrough.

![Blender environment review render](https://raw.githubusercontent.com/SonjaSeferasi/ssu-starter-app-v2/eab5235b867e608693240ede1184c7ba23d1c843/output/jumpyland/world-1-review.png)
Picture type: Blender asset/environment review render already in the repository. It is not a browser screenshot and does not prove the game matches the reference artwork. Photorealistic fidelity is not claimed.

Live acceptance: sign in, launch Jumpyland, select a world, demonstrate this card's exact behavior and capture the actual application. Full level playthroughs, hosted saving and current browser visuals are unverified. This issue remains open. Records updated today do not backdate development.

## Historical plan and exact requirement
The original planning text follows for traceability. Its Phaser implementation directions and old not-started claims are superseded by the current audit above; acceptance criteria remain unchanged.

Owner: Sonja Seferasi (SS)
Development plan: #375 — Jumpyland (Game 1), using Phaser.
Status: implementation audit below; live acceptance pending.

## User story
As a student, I want to move my avatar left and right and jump between platforms while avoiding hazards and collecting optional coins, so that I can challenge myself to reach the finish flag and choose whether to collect coins along the way.

## SRS-616.1 — Present the platform challenge
When a level starts, the system shall present a single-player, two-dimensional course containing a starting position, platforms, gaps, hazards, optional coins, and a finish flag.

## Acceptance criterion
Given an available level is selected, when its attempt begins, then the course contains all listed elements.

Traces to: UR-616.
Source: [team SRS](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/SocialU_SRS_Editable.md#ur-616).

## Implementation boundaries
Mount a client-only Phaser game at the existing /game-1 route, dispose the Phaser instance on unmount, and create the first course with a spawn, platforms, gaps, hazards, optional coins and a finish flag. Use Phaser Arcade Physics. Display Jumpyland in the Game Room entry and game heading while retaining the existing Game 1 requirement IDs and route. Keep a default character available; avatar artwork integration is separate.

No database table/API is needed solely for this client-side behavior. Reuse signed-in entry and the existing account/session boundary. Persisted completion, points and participation have separate requirements and owner dependencies.

## Verification
Verify authenticated entry, no required avatar editing, one Phaser canvas after repeated route visits, cleanup on exit, and the presence of all course elements. Capture a running-app screenshot. This task does not claim coin collection, flag completion, or saved progression.

## Completion evidence required
- [ ] Implementation and verification sub-issues completed.
- [ ] Branch and merged PR linked; task-completing PRs use Closes #<task number>.
- [ ] Relevant checks pass and signed-in running-app evidence is attached.
- [ ] Actual demo steps and remaining dependencies are recorded; no mock or entry-only view is claimed as gameplay.

## Implementation sub-issues
- [ ] #377 — implementation
- [ ] #378 — verification

