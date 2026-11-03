# Europe — country previews (batch 1 of the remaining 126)

Forty new European adventures, one per country. France, Italy and Norway keep their existing levels. Every adventure is at **TESTING**. None is released: release needs human desktop play, a physical-phone test, live account-save verification and visual sign-off, and none of those has been performed yet.

The figures come from the live code and the recorded evidence:

- Places, facts, sources and photo searches: `lib/world-explorer/europe.ts`
- Routes, composed from beats: `lib/world-explorer/levels/europe/index.ts`, using the shared composer `lib/world-explorer/levels/compose.ts`
- Scenery: `components/world-explorer/countries/europe.ts` (one shared chunk) and `europe-landmarks.ts`
- Tests: `__tests__/world-explorer-europe.test.ts`
- Tracker: `review/europe/europe-tracker.csv` / `.json` (regenerate: `npx vitest run --config scripts/world-explorer/europe-report.vitest.config.mjs`)
- Guide photographs: `review/acceptance-all/media/media-check-europe-oceania.json` (through the running app). The older `review/europe/live-photo-check.json` used a looser rule than the app and is superseded.
- Game captures: `review/europe/captures/`
- Acceptance checklist across every built country: `review/acceptance-all/ACCEPTANCE.md`

## Status at a glance

| | |
| --- | --- |
| Countries | 40 |
| Design validator (16 checks) | 40 of 40 pass |
| Measured tier equals the manifest tier | 40 of 40 (T1: 10, T2: 16, T3: 2, T5: 12) |
| Both routes, every coin and star, no damage, at 0, 1.8 and 3.6 s starts | 40 of 40 (test suite and the acceptance runner's two bots) |
| Checkpoints reached; hazard recovery | 40 of 40; 39 by a natural fall, Belarus by the controlled missed-landing fixture |
| Test suite | 200 of 200 pass |
| Guide photograph loaded through the running app (`/api/world-explorer/media`) | 40 of 40 (after Denmark and Liechtenstein search terms changed; see open issue 2) |
| Destination: card, run screen and guide name the same place | 40 of 40 for title, place and capital; photo name check fails Belgium and Ireland only (photo named "Begijnhof" / "Newgrange") |
| Browser replays (both completions), keyboard, emulated touch, saved progress card | 40 of 40 (headless Edge; touch is emulated, not a phone) |
| Frame rate at the level start, desktop and phone-sized view | 40 of 40 at or above 55 FPS; desktop average 76 to 120 FPS, median 106 (laptop GPU, headless Edge) |
| Shader links after the level is ready (cold start) | 0 for all 40 |
| Layout, five viewports | Fails only on the shared HUD: 8 px text on phone portrait and landscape (open issue 6) |
| Similarity pairs at or above 0.72 (review threshold) | 13, listed below |
| Human source review, desktop play, physical phone, live account save, visual sign-off | **not performed** for any country |
| RELEASED | 0 of 40 |

## Changes in this pass

- **Composer fixes.** Three levels failed after the last plan changes, and the fixes went into the composer:
  - **Bulgaria:** the first checkpoint now falls back to the last safe platform before a third of the route when the next one lies past half way.
  - **Moldova:** coins on a descending slope sit on its lower part, where every approach lands.
  - **Poland:** patrol platforms keep their coins outside the walker's beat.
- **Re-tested.** All 40 were re-tested after the fixes: suite, gameplay acceptance and tracker.

## Open issues

1. **Similarity (person to judge).** These pairs remain at or above 0.72: Czechia and Hungary 0.795, Belgium and Finland 0.777, Greece and Spain 0.776, Greece and Luxembourg 0.77, Malta and Spain 0.768, Belarus and Finland 0.767, Estonia and Moldova 0.757, Liechtenstein and Slovakia 0.745, Greece and Malta 0.739, Hungary and Liechtenstein 0.738, Malta and Sweden 0.735, Iceland and Slovenia 0.726, Belgium and Switzerland 0.721.
2. **Guide photographs (person to judge).** The earlier "40 of 40" came from a check looser than the app's own filter. Tested through the running app, Denmark and Liechtenstein had no photo, so their search terms changed:
   - **Denmark:** now 'Jelling stones', showing "Runesten i Jelling".
   - **Liechtenstein:** now 'Vaduz Castle', showing "Vaduz Castle 1".

   These photos load but may not suit:
   - **Germany:** shows an interior mosaic.
   - **Spain:** shows an arabesque detail.
   - **Romania:** shows pelicans, not the reeds.
   - **Belgium:** the file is named "Begijnhof", the Dutch word for béguinage, so the automated name check fails. A person must confirm the photo.
   - **Ireland:** the photo shows Newgrange, the main tomb of Brú na Bóinne. The automated name check fails for the same reason.

   Commons search ranking changes over time, so the chosen photos can change too.
3. **Source review (person to judge).** Each fact paraphrases its UNESCO listing (Vaduz and Monaco cite their official pages); a person still has to read each against its source.
4. **Art (person to judge).** The scenery is a first stylized pass. Captures are in `review/europe/captures/`.
5. **Human and device checks.** These have not been performed for any country (`review/acceptance-all/HUMAN-RESULTS.md` explains how to record them).
6. **Phone HUD text (shared).** On phone viewports the level line and the "Country guide" button render at 8 px. This comes from the shared `world-explorer.module.css`, affects all 193 adventures and was not changed here.
