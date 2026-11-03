# Argentina — Fitz Roy snow caps

**Status:** Argentina stays at **TESTING**. A person still has to sign off the look (checklist item C5).

## Before

Each granite needle had a short, wide five-sided cone part-way up as its "snow" (`h*.12` tall, radius `w*1.05`). From the course it read as a flat white disc or plate around every spire. See `../followup-production/captures/arg-a-start.jpg` and `arg-d-overview.jpg`.

## After

`components/world-explorer/countries/argentina.ts`, `snowCap()` and `fitzRoy()`:

- Snow is the upper part of the needle's own five-faceted cone, about 5% proud of the rock, so it lies on the facets.
  - On each tower, the top 18% (`snowCap(w*.8,h,.18,…)`).
  - On each broad base, the upper half, the snow on the shoulders (`snowCap(w*1.5,h*.55,.5,…)`).
- The lower edge is ragged. Each ridge line carries snow a different distance down, and the snow slides along the cone's surface as it goes, so the edge runs down the gullies instead of ending in a ring.
- The caps use the same position, turn and lean as the rock they sit on. The random sequence is unchanged, so every needle keeps its place, height and lean.
- Scenery only: no collider, platform or route changed. The Argentina replays on this build match their recordings (`../shader-prep/replays/`).

## Evidence

Production-build captures in `after/`, made with `scripts/world-explorer/capture-levels.mjs` on the verification build:

- `arg-c-landmark.jpg`, a close-up of the needles from a review camera at (70, 14, −70) looking at (86, 24, −150)
- `arg-a-start.jpg`, the start view with the needles on the horizon
- `arg-d-overview.jpg`, `arg-b-gameplay.jpg` and `arg-phone.jpg`

The scene keeps 120 FPS on the laptop: 86 draw calls, 100k triangles (`after/capture-results.json`).

The close-up camera is not one of the standard review shots (the standard `c` shot faces the glacier), so it has no exact "before" twin. The before and after start and overview shots use the same cameras.
