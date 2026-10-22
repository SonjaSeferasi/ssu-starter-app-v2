## Sprint 2 current implementation audit — 22 October 2026
Owner: Sonja Seferasi (SS). Existing issue retained; no duplicate SRS card created.

REQUIREMENTS GAP: current gameplay consumes a heart and respawns at a checkpoint after nonfatal damage/falls, and ends the attempt after three damaging hits. It does not satisfy the exact requirement to end the attempt on every fall/hazard. Do not mark this requirement or its tasks Done. Reconcile the finite-life design with the team SRS before acceptance.

Implementation: [Jumpyland PR #451](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/451), [later integrated Jumpyland merge 04af351](https://github.com/SonjaSeferasi/ssu-starter-app-v2/commit/04af351), and [review baseline eab5235](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/eab5235b867e608693240ede1184c7ba23d1c843). Avatar collection: [merged PR #515](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/515).

Code: [attempt-life.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/jumpyland/attempt-life.ts), [engine.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/jumpyland/engine.ts). Tests: __tests__/jumpyland-challenge.test.ts, jumpyland-mechanics.test.ts, jumpyland-geometry.test.ts, jumpyland-model.test.ts, jumpyland-life.test.ts and api/jumpyland.test.ts. Current integrated check: 606 tests / 54 files passed; production build passed. Unit/geometry checks are not a full signed-in playthrough.

![Blender environment review render](https://raw.githubusercontent.com/SonjaSeferasi/ssu-starter-app-v2/eab5235b867e608693240ede1184c7ba23d1c843/output/jumpyland/world-3-review.png)
Picture type: Blender asset/environment review render already in the repository. It is not a browser screenshot and does not prove the game matches the reference artwork. Photorealistic fidelity is not claimed.

Live acceptance: sign in, launch Jumpyland, select a world, demonstrate this card's exact behavior and capture the actual application. Full level playthroughs, hosted saving and current browser visuals are unverified. This issue remains open. Records updated today do not backdate development.

## Historical plan and exact requirement
The original planning text follows for traceability. Its Phaser implementation directions and old not-started claims are superseded by the current audit above; acceptance criteria remain unchanged.

Owner: Sonja Seferasi (SS)
Development plan: #375 — Jumpyland (Game 1), using Phaser.
Status: implementation audit below; live acceptance pending.

## User story
As a student, I want to be told whether a fall or hazard ended my attempt and be able to restart the current level immediately, with no limit on retries, so that I can try again without losing previously completed levels.

## SRS-620.1 — End an attempt after a fall or hazard
When the character falls below the level's playable area or touches a hazard during running gameplay, the system shall end the attempt unsuccessfully.

## Acceptance criterion
Given an attempt is running, when either failure condition occurs, then that attempt stops unsuccessfully.

Traces to: UR-620.
Source: [team SRS](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/SocialU_SRS_Editable.md#ur-620).

## Implementation boundaries
Detect a fall below the playable area and contact with a hazard using Phaser world state/overlap handling. Transition the running attempt to a single failed state, stop gameplay input and physics for that attempt, and guard against duplicate failure events. Unlimited retry and explanatory failure UI remain separately traceable to SRS-620.2–620.4.

No database table/API is needed solely for this client-side behavior. Reuse signed-in entry and the existing account/session boundary. Persisted completion, points and participation have separate requirements and owner dependencies.

## Verification
Verify both failure causes stop a running attempt, that a safe platform landing does not fail, and that repeated collision callbacks do not create multiple failure transitions. This requirement must not consume lives, erase completed levels, or award points.

## Completion evidence required
- [ ] Implementation and verification sub-issues completed.
- [ ] Branch and merged PR linked; task-completing PRs use Closes #<task number>.
- [ ] Relevant checks pass and signed-in running-app evidence is attached.
- [ ] Actual demo steps and remaining dependencies are recorded; no mock or entry-only view is claimed as gameplay.

## Implementation sub-issues
- [ ] #389 — implementation
- [ ] #390 — verification

