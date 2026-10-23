# Jumpyland natural worlds and current campus avatar

Review date: 2026-10-23. These are local browser captures of the live 3D renderer at 1280 x 720, not generated concept art. The supplied October 22 references guided composition and world landmarks.

## What changed

- Mushroom world: grass-covered cliffs, irregular rock edges, mushroom gills, pipes, castle terraces, waterfalls, river, arched bridge and pastel hills.
- Skybound world: scanned rock materials on floating terrain, stepped temple mesas, dome houses, engraved stone arches, waterfalls and two textured planets.
- Shinobi world: ancient cedar trunks, timber decks and braces, suspended logs, bamboo, rope bridges, lit paper lanterns, red gates, village rooftops, drifting maple leaves and five modeled mountain reliefs. Reduced overlapping trunks to expose the valley.
- Player: an animated 3D body with continuous skinned clothing and a modeled head, nose, hair/hijab and optional glasses. The current campus selection determines its colors, skin, hairstyle and outfit; saved face art provides surface detail on the curved head.
- Game Room: only the current complete collection is offered, with Male/Female/Hijab and Hair/Face/Outfit sections. Old saved values get a compatible preview without changing the account until the user explicitly chooses and saves. Attempt preparation uses that current look.

## Visual comparison

| Reference | Browser result | Remaining difference |
| --- | --- | --- |
| Mushroom cliffs and castle | [World 1](world-1.jpg) | Geometry and lighting remain stylized; the reference has much denser vegetation and more realistic rock formations. |
| Floating temple islands and planets | [World 2](world-2.jpg) | The landmarks are modeled, but surface detail and atmospheric depth are less realistic than the reference. |
| Ancient tree, village and carved mountain | [World 3](world-3.jpg) | The valley is visible and the forest has more structure; the reference has richer foliage, finer architecture and more natural sunlight. |
| Coordinated campus collection | [Avatar editor](avatar-editor.jpg) | The moving game character is a modeled interpretation of the artwork, not an identical high-resolution character scan. |

## Verification

- Isolated release candidate: all 66 Vitest files passed, 669 tests total.
- Production `next build`: passed, including TypeScript checks.
- Browser: all three 3D worlds rendered. A keyboard Space press lifted the avatar off the starting forest platform; a separate 1.4-second right/jump input fixture advanced the camera along the course without reporting a run-ending event. No browser runtime warnings or errors were captured during the final forest check.
- Browser: Female -> Hair -> High ponytail changed the complete preview; no original-collection switch appeared after reload.
- Database save/account-isolation behavior passed in the local PGlite test suite. No live account save or hosted migration was performed for this visual update. The editor screenshot is explicitly a preview with account saving disabled.
- Full level completion, mobile GPU performance and hosted visual verification were not run. The result remains stylized and does not reproduce the reference images' photorealism.

Development-only direct inspection: `/dev/jumpyland?world=1`, `world=2`, or `world=3`. The route returns not-found outside development. Optional `avatar=...`, `x=...`, and `run=...` parameters select a valid collection look, starting position in centimeters, and a bounded movement fixture. These previews do not create saved attempts.