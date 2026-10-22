Owner: Sonja Seferasi (SS)
Sprint: Sprint 2 implementation/acceptance audit, 22 October 2026.
Status: implementation evidence available; live acceptance pending.
Development plan: #375. Existing requirement and task IDs retained.

## Exact system requirement and acceptance criterion
##### SRS-616.3, SS — Jump input.

While an attempt is running and the character is standing on a platform, the system shall initiate a jump when Space (or the on-screen Jump control) is activated.

Acceptance criterion: Given the character is standing on a platform, when Space or the on-screen Jump control is activated, then the character jumps.

Traces to: UR-616.

Source: [canonical team SRS](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/documentation/SocialU_SRS_Editable.md#ur-616).

## Current implementation
Space/Up and on-screen Jump feed a buffered grounded jump. Ordinary jumping requires ground support/coyote time; powered double jumping is a separate gameplay extension. Automated mechanics/input checks pass; the actual grounded/airborne browser demonstration is pending.

Current code: [controls.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/jumpyland/controls.ts), [engine.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/jumpyland/engine.ts), [powers.ts](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/eab5235b867e608693240ede1184c7ba23d1c843/components/jumpyland/powers.ts). The client engine reuses the signed-in Game 1 entry and shared avatar. No new database table is required for this movement/collision behavior; progress/account persistence remains a separate API/schema concern. Historical Phaser instructions are replaced by this current Three.js description, while the exact canonical SRS above is preserved.

## Existing linked tasks
- [ ] #383 — implementation
- [ ] #384 — verification and actual application evidence

These are the existing actual sub-issues. No duplicate Jumpyland cards were created. Code presence is recorded separately from full task/requirement acceptance.

## Merge and branch evidence
- [Original Jumpyland PR #451, merged](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/451). Its original implementation used Phaser.
- [Later Jumpyland integration 04af351](https://github.com/SonjaSeferasi/ssu-starter-app-v2/commit/04af351), containing subsequent 3D work. This is a merge commit, not an invented PR.
- [Current integrated source eab5235](https://github.com/SonjaSeferasi/ssu-starter-app-v2/tree/eab5235b867e608693240ede1184c7ba23d1c843).
- [Avatar collection PR #515, merged](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/515); supporting avatar work, not proof of this movement/collision requirement.
- [Sprint 2 evidence PR #525, merged](https://github.com/SonjaSeferasi/ssu-starter-app-v2/pull/525).
- [Sonja Sprint 2 evidence index](https://github.com/SonjaSeferasi/ssu-starter-app-v2/blob/main/documentation/sprint-2-evidence/README.md).

## Verification
The integrated application passed 606 tests across 54 files and a production build (41 pages). Relevant suites: jumpyland-challenge, jumpyland-mechanics, jumpyland-geometry, jumpyland-model, jumpyland-life and api/jumpyland. API tests mock Supabase; geometry/mechanics tests do not constitute a signed-in playthrough. Live acceptance for this exact card remains pending.

## Pictures
![Existing environment review render](https://raw.githubusercontent.com/SonjaSeferasi/ssu-starter-app-v2/eab5235b867e608693240ede1184c7ba23d1c843/output/jumpyland/world-1-review.png)
This is a Blender environment/asset review render, not a running-game screenshot or proof of photorealistic fidelity to Sonja's reference.

![Actual Sprint 2 board screenshot](https://raw.githubusercontent.com/SonjaSeferasi/ssu-starter-app-v2/main/documentation/sprint-2-evidence/sonja-sprint-2-board.jpg)
This is an actual GitHub board screenshot from 22 October 2026. Board organization does not prove gameplay acceptance.

## Reproducible demo and remaining work
Sign in, open Game Room, launch Jumpyland without first editing an avatar, select an available world and demonstrate the exact acceptance criterion above. Record the world, keyboard/on-screen control, expected result, actual result and date; attach the actual running-application screenshot. Full level playthroughs and hosted saving were not verified in this audit.

The [Sonja — Sprint 2 view](https://github.com/users/SonjaSeferasi/projects/2/views/15) contains the existing five SRS parents. GitHub intermittently fails to load the project and reverted attempted status changes; this audit does not claim they moved to In review or Done. Sprint 1 and teammate records were left intact. No Canvas submission, retroactive development history or demo attendance is claimed.
