# Cinematic Japan level — design

## Intent
Make a World Explorer level feel like a small animated adventure, so the game is more engaging. The target look is a reference video of a Japan level: a close side camera on the explorer, warm hazy light, sparkling coin pickups, a "Level Complete!" moment and a passport stamp. Japan is the pilot; the same pieces can be turned on for other countries later.

## Goals
- The explorer is large on screen and the level opens with a sweep down from the vista.
- Warm golden-hour colours and haze that separates the route from the valley behind it.
- Every coin and star pickup is visibly rewarded.
- Finishing a level is a celebration, ending on a passport stamp.

## Non-goals
- Matching the reference frame for frame. The reference is pre-rendered film; the game draws live in the browser.
- Changing the course, collisions, saved progress or scoring.
- Changing the explorer character (the Game Room avatar work owns it).
- Inventing values: coins have no point value in World Explorer, so a pickup shows "+1" (the counter's own unit), not "+50".

## Constraints
- The level already draws about 300 to 400 thousand triangles, so the upgrade adds no heavy scenery and no full-screen post-processing passes.
- Reduced motion turns off the sweep, the pickup effects and the celebration.
- Existing World Explorer tests keep passing; the camera test is updated to the new framing on purpose.

## Approaches
1. **Upgrade the existing Japan scene (chosen).** Change the camera, the colours and the feedback around the level that already exists. Keeps the course, tests and progress working and can be delivered one requirement at a time.
2. Rebuild the Japan scene from scratch to mirror the reference. Much more work and risk, and it would discard a level that already has the right ingredients.
3. Play the reference video as an intro. Cheap, but it is not gameplay and would promise a look the level does not have.

## Design
| SRS | What | Where |
|---|---|---|
| 631.1 | Camera distance 19.5 → 12.8 (17 in portrait), so the explorer fills about 17.5% of a landscape screen instead of about 11.5%; opening sweep of 2.8 s from a high, distant frame. | `lib/world-explorer/game-camera.ts`, `components/world-explorer/country-scene.ts` |
| 631.2 | One palette (`japan-atmosphere.ts`) drives the sky gradient, sun glow, haze range, light colours and the lake. | `japan-atmosphere.ts`, `japan-vista.ts`, `japan-environment.ts`, `japan-water.ts`, `countries/japan.ts` |
| 631.3 | Route dressing (ferns, arch, bridge railings, mist, petals). Not built yet. | — |
| 631.4 | Bigger sparkle burst with a flash ring; floating "+1" / star label sprites. | `japan-interactives.ts`, `kit/pickup-popups.ts`, `country-scene.ts` |
| 631.5 | "Level Complete!" overlay with light rays and 36 confetti pieces for 1.9 s, then the result dialog. | `level-complete.tsx`, `level-complete.module.css`, `country-run.tsx` |
| 631.6 | Passport with a pressed stamp (country name and completion date) at the top of the result dialog. | `level-complete.tsx`, `level-complete.module.css`, `country-run.tsx` |

## Checked
- Captured in a headless browser at the start, along the route, during pickups and at the finish.
- Frame rate on real hardware is not measured here: the capture machine renders in software. The draw-call and triangle counts are unchanged by this work.
