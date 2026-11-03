# South America Phase 3 — Batch C review package

**Countries:** Paraguay, Peru, Suriname, Uruguay. **Status:** all four stay at **TESTING**. Human gameplay review and real-phone play have not been done.

Every image here is a capture of the running game in headless Microsoft Edge with hardware WebGL. Captures were only arranged and scaled, never retouched or generated.

## What to look at

| File | Contents |
| --- | --- |
| `../followup-production/captures/{pry,per,sur,ury}-*.jpg` | Fresh production-build captures: start, main gameplay, landmark, overview and phone viewport |
| `../art-polish/compare-{pry,per,sur,ury}.jpg` | Before (left) and after (right) for the four review shots (from the development build) |
| `playthroughs/` | Production-build playthroughs: results, input scripts and screenshots |
| `../acceptance/timing-sweep-batch-c.json` | 24-timing sweep of every route at runtime difficulty |
| `../followup-production/captures/capture-results.json` | Frame rate, load time, draw calls and triangles on the production build |

Runtime difficulties: Paraguay 1, Peru 3, Suriname 1, Uruguay 1.

## Gameplay

No platform, collider, route edge, hazard, patrol or timing changed in Batch C. The art changes are scenery and platform bodies only. The walking-cap raycast tests and both full playthrough routes confirm the walkable surfaces are where they were.

**Suriname's logged timing hit.** The 24-timing sweep at difficulty 1 reproduces it: 2 of 72 runs take one hit on `sr-market`, at x 41.5–41.6. These are the main route at a 1.13 s start delay and the critical route at 2.25 s.

The trace shows what happens:

1. The bot drops from the waterkant onto the market square while the mango beetle patrols x 38.4–42.6.
2. Its look-ahead then dithers in short hops behind the beetle instead of jumping it.
3. The beetle turns back into the bot.

The other 70 runs pass this point without damage. A player sees the beetle and can wait or jump it. **This is a bot timing miss, as with Brazil's far-bank patrol; the mechanics are unchanged.** A person's judgement of this patrol is still wanted, together with Brazil's.

## Art

Each environment gets sculpted platform bodies of limited visual depth instead of walls running out of view, its own landmark set piece and its own materials.

- **Paraguay, Trinidad.** The red-earth ground masses widen down into the dry arroyo bed. Other details:
  - The crumbling earth banks are short slabs, so their collapse reads.
  - The mission ground is sandstone masonry on a plinth.
  - The arcaded church walls are masonry bodies reaching to the ground.
- **Peru, Machu Picchu.** Several platform types are now sculpted:
  - Terraces keep upright fitted-stone retaining walls one step high.
  - Ridge rocks are rock islands, and cliffs and the trail are sculpted rock reaching down the slope.
  - Steep forested granite sugarloaf peaks, banded with bare rock, stand around the gorge, as they do around Machu Picchu.
  - The snow peaks of the Vilcabamba are lower and further off.
  - Huayna Picchu has grass, forest and bare rock by slope.
- **Suriname, Paramaribo.** The waterkant is a stone quay on timber pilings, and the fort and market are brick. Other details:
  - The timber galleries and roofs stay as houses.
  - The Cathedral Basilica of Saints Peter and Paul, a large cream-and-grey timber church with twin spires, stands over the town.
  - Mangroves line the far bank of the Suriname River.
- **Uruguay, Colonia.** The waterfront houses stand on fieldstone seawall plinths where the river laps them. Other details:
  - The rambla and awnings are bounded masses instead of walls running down out of view.

## Tests (scoped)

| Scope | What ran | Result |
| --- | --- | --- |
| 24-timing sweep at runtime difficulty | Critical, main and bonus routes; 72 runs per country | Paraguay, Peru, Uruguay: 0 damaged, 0 failed. Suriname: 2 damaged (above), 0 failed. Every coin and star collected without damage in all four |

The level and environment tests and both full-suite runs are reported in [../followup-production/README.md](../followup-production/README.md). The full-suite runs were made once for this whole follow-up.

## Production-build playthroughs

These ran on the production build (`SOCIALU_BUILD_TARGET=review next build`, served by `next start`). See `playthroughs/playthrough-results.json`.

**Replays.** All 12 scripted playthroughs passed: two completion routes and a hazard run per country. In each, the page reached exactly the recorded outcome: status, hearts, coins and their ids, stars, discovery and events.

| Country | Bonus route | Main route | Across both routes | Hazard run (respawn checkpoint) |
| --- | --- | --- | --- | --- |
| Paraguay | 23 coins, 3 stars | 24 coins, 1 star | 27/27 coins, 3/3 stars | lost a heart, respawned at `py-clearing` |
| Peru | 26 coins, 3 stars | 26 coins, 1 star | 28/28 coins, 3/3 stars | lost a heart, respawned at `pe-gorge-far` |
| Suriname | 23 coins, 3 stars | 23 coins, 2 stars | 25/25 coins, 3/3 stars | lost a heart, respawned at `sr-market` |
| Uruguay | 33 coins, 3 stars | 33 coins, 0 stars | 35/35 coins, 3/3 stars | lost a heart, respawned at `uy-convent` |

Every completion run passed the discovery dialog and the result screen, kept all three hearts and passed both checkpoints.

**Saved progress.** Passed for all four: `localStorage` held each as completed, and each card read Completed after a reload.

**Keyboard and emulated touch.** Passed for all four. The touch check uses Chromium touch emulation in an 844×390 viewport on a laptop; it is not a real phone.

**Load and frame rate.** Production build, laptop display capped at 120 FPS, 600 frames per viewport (`../followup-production/captures/capture-results.json`):

| Level | Desktop: average · 1% low · worst frame · ready | Phone viewport: average · 1% low · worst frame · ready | Draw calls | Triangles |
| --- | --- | --- | --- | --- |
| Paraguay | 120 · 116 · 8.7 ms · 0.8 s | 120 · 116 · 8.9 ms · 0.8 s | 88 | 141k |
| Peru | 120 · 113 · 8.9 ms · 0.8 s | 120 · 116 · 9.0 ms · 0.9 s | 80 | 109k |
| Suriname | 120 · 115 · 8.9 ms · 0.9 s | 120 · 117 · 8.6 ms · 0.8 s | 87 | 134k |
| Uruguay | 120 · 116 · 8.8 ms · 1.0 s | 120 · 116 · 8.8 ms · 1.0 s | 75 | 129k |

These levels were measured in the same browser session after Batch B, so they were not cold starts.

## Open items

1. **People and devices.** Human gameplay review, desktop and physical-phone play for all four are not done.
2. **Suriname's market patrol.** A person should judge whether the mango beetle on `sr-market` is fair after the drop from the waterkant.
