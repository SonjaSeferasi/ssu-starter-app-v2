## Sprint 2 current implementation audit — 22 October 2026
Owner: Sonja Seferasi (SS). Existing issue retained; no duplicate SRS card created.

Space/Up/touch jump actions feed a buffered grounded jump with coyote time. Powered double jump is an explicit gameplay extension; ordinary jumping remains grounded. Actual browser grounded/airborne checks remain pending.

Implementation: [Jumpyland PR #451](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/451), [later integrated Jumpyland merge 04af351](https://github.com/SonjaSeferasi/ssu-starter-app-v2/commit/04af351), and [review baseline eab5235](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/eab5235b867e608693240ede1184c7ba23d1c843). Avatar collection: [merged PR #515](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/515).

Code: [controls.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/jumpyland/controls.ts), [engine.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/jumpyland/engine.ts), [powers.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/jumpyland/powers.ts). Tests: __tests__/jumpyland-challenge.test.ts, jumpyland-mechanics.test.ts, jumpyland-geometry.test.ts, jumpyland-model.test.ts, jumpyland-life.test.ts and api/jumpyland.test.ts. Current integrated check: 606 tests / 54 files passed; production build passed. Unit/geometry checks are not a full signed-in playthrough.

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

## SRS-616.3 — Jump input
While an attempt is running and the character is standing on a platform, the system shall initiate a jump when Space (or the on-screen Jump control) is activated.

## Acceptance criterion
Given the character is standing on a platform, when Space or the on-screen Jump control is activated, then the character jumps.

Traces to: UR-616.
Source: [team SRS](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/SocialU_SRS_Editable.md#ur-616).

## Implementation boundaries
Use Phaser Arcade Physics to initiate a jump on Space when the character is standing on a platform. Route the future on-screen Jump control through the same action. Do not allow an unsupported midair double jump. Keep jump parameters in the game configuration for tuning without inventing numerical SRS thresholds.

No database table/API is needed solely for this client-side behavior. Reuse signed-in entry and the existing account/session boundary. Persisted completion, points and participation have separate requirements and owner dependencies.

## Verification
Verify a grounded Space press starts a jump, an airborne repeated press does not create another jump, and horizontal movement can continue while airborne. Mark phone/on-screen input coverage pending until SRS-616.4 is implemented.

## Completion evidence required
- [ ] Implementation and verification sub-issues completed.
- [ ] Branch and merged PR linked; task-completing PRs use Closes #<task number>.
- [ ] Relevant checks pass and signed-in running-app evidence is attached.
- [ ] Actual demo steps and remaining dependencies are recorded; no mock or entry-only view is claimed as gameplay.

## Implementation sub-issues
- [ ] #383 — implementation
- [ ] #384 — verification
