# Oceania — country previews (batch 4 of the remaining 126)

Thirteen new Oceania adventures, one per country; Australia keeps its existing level. Every adventure is at **TESTING**. None is released: release needs human desktop play, a physical-phone test, live account-save verification and visual sign-off, and none of those has been performed yet.

The figures come from the live code and the recorded evidence:

- Places, facts, sources, photo searches and how each mechanic is shown: `lib/world-explorer/oceania.ts`
- Routes (composed from beats, like Europe): `lib/world-explorer/levels/oceania/index.ts`
- Scenery: `components/world-explorer/countries/oceania.ts` (one shared chunk) and `oceania-landmarks.ts`
- Tests: `__tests__/world-explorer-oceania.test.ts`
- Tracker: `review/oceania/oceania-tracker.csv` / `.json` (regenerate: `REPORT_REGION=oceania npx vitest run --config scripts/world-explorer/europe-report.vitest.config.mjs`)
- Source evidence: `review/oceania/site-sources.json` (Wikipedia API: intro and infobox World Heritage number; `scripts/world-explorer/fetch-site-sources.mjs`) and `review/oceania/site-overrides.json` (web-search confirmations)
- Guide photographs: `review/acceptance-all/media/media-check-europe-oceania.json` (through the running app) and `media-diagnose.json` (direct Commons query with the app's filter). The older `review/oceania/live-photo-check.json` used a looser rule than the app and is superseded.
- Game captures: `review/oceania/captures/`
- Acceptance checklist across every built country: `review/acceptance-all/ACCEPTANCE.md`

## Status at a glance

| | |
| --- | --- |
| Countries | 13: FJI, KIR, MHL, FSM, NRU, NZL, PLW, PNG, WSM, SLB, TON, TUV, VUT |
| Design validator (16 checks) | 13 of 13 pass |
| Measured tier equals the manifest tier | 13 of 13 (T1: 9, T2: 3, T5: 1) |
| Both routes, every coin and star, no damage, at 0, 1.8 and 3.6 s starts | 13 of 13 (test suite and the acceptance runner's two bots) |
| Checkpoints reached; hazard recovery | 13 of 13; 12 by a natural fall, Samoa by the controlled missed-landing fixture |
| Test suite | 65 of 65 pass |
| Guide photograph loaded through the running app (`/api/world-explorer/media`) | 12 of 13; none for Papua New Guinea (open issue 6) |
| Destination: card, run screen and guide name the same place | 13 of 13 for title, place and capital (Nauru has no capital: n/a); photo name check passes 11, fails PNG (no photo) and VUT (photo named "Eretoka") |
| Browser replays (both completions), keyboard, emulated touch, saved progress card | 13 of 13 (headless Edge; touch is emulated, not a phone) |
| Frame rate at the level start, desktop and phone-sized view | 13 of 13 at or above 55 FPS; desktop average 91–120 FPS (laptop GPU, headless Edge) |
| Shader links after the level is ready (cold start) | 0 for all 13 |
| Layout, five viewports | Fails only on the shared HUD: 8 px text on phone portrait and landscape (open issue 7) |
| Similarity pairs at or above 0.72 (review threshold) | 4, listed below |
| Human source review, desktop play, physical phone, live account save, visual sign-off | **not performed** for any country |
| RELEASED | 0 of 13 |

## The countries

| Code | Adventure | Place (source) | Tier | Signature mechanic and how it is shown |
| --- | --- | --- | --- | --- |
| FJI | Levuka: Harbour Wharf | Levuka Historical Port Town (UNESCO 1399) | 2 | Moving platforms are cargo pallets on harbour cranes |
| KIR | Phoenix Islands: Ocean Atolls | Phoenix Islands Protected Area (UNESCO 1325) | 1 | Drifting outrigger canoes; trade-wind gusts on the sand spits |
| MHL | Bikini Atoll: Quiet Lagoon | Bikini Atoll Nuclear Test Site (UNESCO 1339) | 1 | Water hazards in the lagoon; old pier boards that give way; a channel current |
| FSM | Nan Madol: Basalt Islets | Nan Madol (UNESCO 1503, in danger) | 1 | Bounce pads are woven mats on mangrove roots; a canal raft |
| NRU | Buada Lagoon: Island Lake | Buada Lagoon (not World Heritage; reference article) | 2 | Collapsing coral-limestone pinnacles |
| NZL | Te Wāhipounamu: Glacier Country | Te Wahipounamu (UNESCO 551) | 5 | Real glacier ice; a moraine climb; collapsing seracs |
| PLW | Rock Islands: Mushroom Isles | Rock Islands Southern Lagoon (UNESCO 1386) | 1 | Lagoon skiffs; an islet-cliff climb |
| PNG | Kuk: Ancient Garden Swamp | Kuk Early Agricultural Site (UNESCO 887) | 2 | Log rafts on drainage channels; a garden-path patrol |
| WSM | To Sua: Ocean Trench | To Sua Ocean Trench (not World Heritage; show-cave reference) | 1 | Lava ledges over water; the wooden ladder as a climb |
| SLB | East Rennell: Lake Tegano | East Rennell (UNESCO 854, in danger) | 1 | Lake stones; a raised-coral cliff climb; a forest-path patrol |
| TON | Ha'amonga 'a Maui: Stone Gateway | Ha'amonga 'a Maui (UNESCO Tentative List only) | 1 | Pressure plates raise platforms beside the trilithon |
| TUV | Funafuti: Lagoon Islets | Funafuti Conservation Area (not World Heritage; reference article) | 1 | Reef-flat stones; sandbars that give way |
| VUT | Roi Mata's Domain: Three Islands | Chief Roi Mata's Domain (UNESCO 1280) | 1 | Bounce pads are outrigger floats; a reef-channel current |

Every fact ends with the same disclaimer: the jumping route is fictional and never climbs or alters the real place. Four places are not World Heritage sites, and their facts say so. Bikini's fact names the nuclear tests plainly and the route stays a calm lagoon walk; its guide photograph is a beach, not a test image.

## Open issues

1. **Similarity (person to judge).** Four pairs remain at or above 0.72 after two rounds of route changes: Kiribati and Palau 0.77, Marshall Islands and Solomon Islands 0.75, Marshall Islands and Tuvalu 0.75, Samoa and Solomon Islands 0.72. All are tier-1 island routes; the composer's shared skeleton (the valley and the closing ledges) carries much of the score. The European batch was left at a similar point (13 pairs up to 0.795) for the same review.
2. **Mechanic interpretations (person to judge).** The manifest names a mechanic for each country; where its usual look would not fit the place, it is restyled and the place data says how (the table above and `interpretation` in `oceania.ts`).
3. **Source review (person to judge).** Each fact was checked against the sources listed in `site-sources.json` and `site-overrides.json`; a person still has to read each one against its source before release.
4. **Art (person to judge).** The scenery is a first stylized pass. Water sites now have a low shore behind the water for the landmark and trees, and the water runs in front of the camera. Captures are in `review/oceania/captures/`.
5. **Human and device checks.** Desktop play, a physical phone, the live account save and visual sign-off have not been performed for any country (`review/acceptance-all/human-results.json` is empty; `HUMAN-RESULTS.md` explains how to record them).
6. **Guide photographs.** An earlier note here said 13 of 13. That figure came from a check looser than the app's own filter. Tested through the running app, four had no photo, so their search terms changed: Fiji 'Levuka town', Marshall Islands 'Bikini Atoll' (a satellite view of the atoll ring, not a test image) and Tuvalu 'Funafuti lagoon'. Papua New Guinea still has none. The only Commons photo named after Kuk is public domain, and the shared `lib/world-explorer/media.ts` rejects public-domain files because they carry no licence URL. The guide shows its sourced text card. Fixing this needs an openly licensed photo or a change to that shared file, which other teams are editing. Vanuatu's photo shows Eretoka, one of the three Roi Mata islands. The automated name check stays failed until a person confirms it. Commons search ranking changes over time, so these photos can change too.
7. **Phone HUD text (shared).** On phone viewports the level line ("Level 1: …") and the "Country guide" button render at 8 px. This comes from the shared `world-explorer.module.css`, affects all 193 adventures and was not changed here.
