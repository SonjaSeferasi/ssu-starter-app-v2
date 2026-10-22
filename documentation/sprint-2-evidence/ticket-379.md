## Sprint 2 current implementation audit — 22 October 2026
Owner: Sonja Seferasi (SS). Existing issue retained; no duplicate SRS card created.

Held left/right inputs feed horizontalVelocity and fixed-step movement; opposing inputs cancel. Controls unit tests pass. Actual browser held-key and touch demonstration remains pending in this audit.

Implementation: [Jumpyland PR #451](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/451), [later integrated Jumpyland merge 04af351](https://github.com/SonjaSeferasi/ssu-starter-app-v2/commit/04af351), and [review baseline eab5235](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/eab5235b867e608693240ede1184c7ba23d1c843). Avatar collection: [merged PR #515](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/515).

Code: [controls.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/jumpyland/controls.ts), [levels.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/jumpyland/levels.ts), [engine.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/jumpyland/engine.ts). Tests: __tests__/jumpyland-challenge.test.ts, jumpyland-mechanics.test.ts, jumpyland-geometry.test.ts, jumpyland-model.test.ts, jumpyland-life.test.ts and api/jumpyland.test.ts. Current integrated check: 606 tests / 54 files passed; production build passed. Unit/geometry checks are not a full signed-in playthrough.

![Blender environment review render](https://raw.githubusercontent.com/SonjaSeferasi/ssu-starter-app-v2/eab5235b867e608693240ede1184c7ba23d1c843/output/jumpyland/world-2-review.png)
Picture type: Blender asset/environment review render already in the repository. It is not a browser screenshot and does not prove the game matches the reference artwork. Photorealistic fidelity is not claimed.

Live acceptance: sign in, launch Jumpyland, select a world, demonstrate this card's exact behavior and capture the actual application. Full level playthroughs, hosted saving and current browser visuals are unverified. This issue remains open. Records updated today do not backdate development.

## Historical plan and exact requirement
The original planning text follows for traceability. Its Phaser implementation directions and old not-started claims are superseded by the current audit above; acceptance criteria remain unchanged.

Owner: Sonja Seferasi (SS)
Development plan: #375 — Jumpyland (Game 1), using Phaser.
Status: implementation audit below; live acceptance pending.

## User story
As a student, I want to move my avatar left and right and jump between platforms while avoiding hazards and collecting optional coins, so that I can challenge myself to reach the finish flag and choose whether to collect coins along the way.

## SRS-616.2 — Move while a direction is held
While an attempt is running with one direction held, the system shall move the character horizontally in the direction specified by the Game 1 Controls table.

## Acceptance criterion
Given running gameplay, when Left Arrow or on-screen Left is held alone, then the character moves left; the corresponding Right inputs move it right.

Traces to: UR-616.
Source: [team SRS](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/SocialU_SRS_Editable.md#ur-616).

## Implementation boundaries
Connect Phaser keyboard input to horizontal movement while Left Arrow or Right Arrow is held alone. Keep the movement action reusable by the separately planned touch controls. Do not change shared avatar/account data during movement. Keep key-release and airborne vertical-motion behavior traceable to SRS-616.7 and SRS-616.8 as follow-up requirements.

No database table/API is needed solely for this client-side behavior. Reuse signed-in entry and the existing account/session boundary. Persisted completion, points and participation have separate requirements and owner dependencies.

## Verification
Demonstrate and test left-only and right-only movement during a running attempt. Record the control used and a running-app screenshot or short reproducible demo. Do not mark touch controls or pause handling complete under this requirement.

## Completion evidence required
- [ ] Implementation and verification sub-issues completed.
- [ ] Branch and merged PR linked; task-completing PRs use Closes #<task number>.
- [ ] Relevant checks pass and signed-in running-app evidence is attached.
- [ ] Actual demo steps and remaining dependencies are recorded; no mock or entry-only view is claimed as gameplay.

## Implementation sub-issues
- [ ] #380 — implementation
- [ ] #381 — verification

