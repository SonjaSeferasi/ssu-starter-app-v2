## Sprint 2 current implementation audit — 22 October 2026
Owner: Sonja Seferasi (SS). Existing issue retained; no duplicate SRS card created.

Descending characters land on the collision profile used by the visible terrain. Geometry tests compare cap vertices and raycastable surfaces against collision heights and moving-platform offsets. Browser landing acceptance remains pending.

Implementation: [Jumpyland PR #451](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/451), [later integrated Jumpyland merge 04af351](https://github.com/SonjaSeferasi/ssu-starter-app-v2/commit/04af351), and [review baseline eab5235](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/eab5235b867e608693240ede1184c7ba23d1c843). Avatar collection: [merged PR #515](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/515).

Code: [landing-geometry.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/jumpyland/landing-geometry.ts), [terrain-model.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/jumpyland/terrain-model.ts), [engine.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/jumpyland/engine.ts). Tests: __tests__/jumpyland-challenge.test.ts, jumpyland-mechanics.test.ts, jumpyland-geometry.test.ts, jumpyland-model.test.ts, jumpyland-life.test.ts and api/jumpyland.test.ts. Current integrated check: 606 tests / 54 files passed; production build passed. Unit/geometry checks are not a full signed-in playthrough.

![Blender environment review render](https://raw.githubusercontent.com/SonjaSeferasi/ssu-starter-app-v2/eab5235b867e608693240ede1184c7ba23d1c843/output/jumpyland/world-3-review.png)
Picture type: Blender asset/environment review render already in the repository. It is not a browser screenshot and does not prove the game matches the reference artwork. Photorealistic fidelity is not claimed.

Live acceptance: sign in, launch Jumpyland, select a world, demonstrate this card's exact behavior and capture the actual application. Full level playthroughs, hosted saving and current browser visuals are unverified. This issue remains open. Records updated today do not backdate development.

## Historical plan and exact requirement
The original planning text follows for traceability. Its Phaser implementation directions and old not-started claims are superseded by the current audit above; acceptance criteria remain unchanged.

Owner: Sonja Seferasi (SS)
Development plan: #375 — Jumpyland (Game 1), using Phaser.
Status: implementation audit below; live acceptance pending.

## User story
As a student, I want to move my avatar left and right and jump between platforms while avoiding hazards and collecting optional coins, so that I can challenge myself to reach the finish flag and choose whether to collect coins along the way.

## SRS-616.6 — Land on platforms
During a running attempt, the system shall support the character on a platform when the character lands on its upper surface.

## Acceptance criterion
Given the character is descending above a platform, when it reaches the upper surface, then it lands rather than falling through.

Traces to: UR-616.
Source: [team SRS](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/SocialU_SRS_Editable.md#ur-616).

## Implementation boundaries
Create Phaser Arcade Physics platform collisions so a descending character lands on a platform upper surface and remains supported. Use static platform bodies and a correctly sized player collision body. Preserve gaps; do not make the entire world floor solid.

No database table/API is needed solely for this client-side behavior. Reuse signed-in entry and the existing account/session boundary. Persisted completion, points and participation have separate requirements and owner dependencies.

## Verification
Test landings at different horizontal positions and from different heights, standing on a platform, and a missed landing through a real gap. Check that the character does not fall through or hover above a platform.

## Completion evidence required
- [ ] Implementation and verification sub-issues completed.
- [ ] Branch and merged PR linked; task-completing PRs use Closes #<task number>.
- [ ] Relevant checks pass and signed-in running-app evidence is attached.
- [ ] Actual demo steps and remaining dependencies are recorded; no mock or entry-only view is claimed as gameplay.

## Implementation sub-issues
- [ ] #386 — implementation
- [ ] #387 — verification

