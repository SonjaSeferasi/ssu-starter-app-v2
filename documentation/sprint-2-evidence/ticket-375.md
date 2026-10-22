## Board reconciliation update
The existing five Jumpyland SRS cards (#376, #379, #382, #385 and #388) and their existing tasks are the Sprint 2 board scope. No duplicate Jumpyland requirement cards were created. The separate avatar issues #516–521 document supporting work and are not substituted for these backlog requirements. The live project view is [Sonja — Sprint 2](https://github.com/users/SonjaSeferasi/projects/2/views/15). The original SRS criteria remain authoritative; automatic completion is not claimed for renderer/finite-life mismatches.

## Sprint 2 current implementation audit — 22 October 2026
Owner: Sonja Seferasi (SS). Existing issue retained; no duplicate SRS card created.

The historical Phaser plan is superseded by the requested Three.js/Blender 3D implementation. Keep the exact canonical SRS text until the team approves requirement changes. Five existing SRS cards and ten task cards are reconciled by this audit; scope mismatches remain open.

Implementation: [Jumpyland PR #451](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/451), [later integrated Jumpyland merge 04af351](https://github.com/SonjaSeferasi/ssu-starter-app-v2/commit/04af351), and [review baseline eab5235](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/eab5235b867e608693240ede1184c7ba23d1c843). Avatar collection: [merged PR #515](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/515).

Code: [levels.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/jumpyland/levels.ts), [engine.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/jumpyland/engine.ts), [scene-3d.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/jumpyland/scene-3d.ts). Tests: __tests__/jumpyland-challenge.test.ts, jumpyland-mechanics.test.ts, jumpyland-geometry.test.ts, jumpyland-model.test.ts, jumpyland-life.test.ts and api/jumpyland.test.ts. Current integrated check: 606 tests / 54 files passed; production build passed. Unit/geometry checks are not a full signed-in playthrough.

![Blender environment review render](https://raw.githubusercontent.com/SonjaSeferasi/ssu-starter-app-v2/eab5235b867e608693240ede1184c7ba23d1c843/output/jumpyland/world-1-review.png)
Picture type: Blender asset/environment review render already in the repository. It is not a browser screenshot and does not prove the game matches the reference artwork. Photorealistic fidelity is not claimed.

Live acceptance: sign in, launch Jumpyland, select a world, demonstrate this card's exact behavior and capture the actual application. Full level playthroughs, hosted saving and current browser visuals are unverified. This issue remains open. Records updated today do not backdate development.

## Historical plan and exact requirement
The original planning text follows for traceability. Its Phaser implementation directions and old not-started claims are superseded by the current audit above; acceptance criteria remain unchanged.

Owner: Sonja Seferasi (SS)
Status: planned; no Jumpyland gameplay implementation is claimed.

## Product decision
Game 1 will be named **Jumpyland**. Use **Phaser** with **Arcade Physics**, embedded in the existing Next.js application. Keep the existing `/game-1` route, `game1` activity code, and SRS/UR identifiers so links and stored data remain compatible. The visible name should change in the Game Room activity and game entry when implementation begins.

## Current starting point
#43 and #42 cover the existing Game Room-to-Game 1 entry/return wiring. That entry view explicitly reports that gameplay is unavailable; it is not evidence of a playable platformer. Do not reopen or duplicate the completed entry requirement.

## First development slice
Five linked SRS backlog cards will cover the Phaser course, horizontal movement, jumping, landing, and fall/hazard failure. Each card will have separate implementation and verification sub-issues. All remain planned in Product Backlog; no sprint or completion date is assigned.

## Follow-up scope from the existing SRS
- [ ] Instructions before play and during an attempt: SRS-615.1–615.2.
- [ ] On-screen controls, visibility, released direction and vertical-motion handling: SRS-616.4–616.5, SRS-616.7–616.8.
- [ ] Current level and attempt-only coins, each coin once, reset on retry/replay: SRS-617.1–617.5.
- [ ] Three required levels, sequential unlocks, saved progression and replay: SRS-618.1–618.6. A fourth level remains optional if time allows.
- [ ] Finish-flag success even with zero coins, saved completion, next/replay actions and unresolved-save recovery: SRS-619.1–619.11.
- [ ] Failure explanation and unlimited retries from the current level: SRS-620.2–620.4.
- [ ] Pause, interruption handling and explicit Resume: SRS-621.1–621.5.
- [ ] Hidden global navigation, return/exit confirmation, abandoned-attempt rules and unresolved completion handling: UR-622 and its SRS children; retain existing standalone layout behavior.
- [ ] Use the selected avatar when compatible, while allowing a default character and no photograph prerequisite: SRS-610.1–610.2 and SRS-607.4.
- [ ] Integrate with the one shared participation record and Darrin's points service using the existing SRS contracts; do not create another streak, set reward values, or treat an opened menu as participation.

## Boundaries
Physics, movement, collisions, pause, unfinished attempts and transient coins stay client-side. Confirmed progression/completion uses the authenticated server and the existing schema; new storage must trace to an existing requirement. Each implementation PR links its issue and records tests plus running-app evidence per the proposed Definition of Done. This plan does not add multiplayer, limited lives, Wordle, catalog purchases, or new reward amounts.

## References
- [Team SRS](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/SocialU_SRS_Editable.md#ur-615)
- [Proposed Definition of Done](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/Definition_of_Done.md)
- [Phaser Arcade Physics documentation](https://docs.phaser.io/phaser/concepts/physics/arcade)
- [SocialU project](https://github.com/users/SonjaSeferasi/projects/2)

## Initial SRS backlog cards
- [ ] #376 — SRS-616.1
- [ ] #379 — SRS-616.2
- [ ] #382 — SRS-616.3
- [ ] #385 — SRS-616.6
- [ ] #388 — SRS-620.1
