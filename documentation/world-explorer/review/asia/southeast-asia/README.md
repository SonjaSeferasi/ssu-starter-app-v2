# Southeast Asia — eleven-country testing batch

This is a **testing candidate, not a release**. East Asia remains frozen at commit `1c7ed65`, revision 2, including the Mongolia seam correction. Japan's art, the five East Asia routes, tier calibration, shared physics and difficulty thresholds are unchanged.

Open [the capture gallery](index.html), [the 47-country tracker](asia-tracker.csv), or [the machine-readable validation](validation.json). Play the local production preview at `http://127.0.0.1:3011/world-explorer`. All eleven countries have their existing correct national flag in the HUD and country selector, sourced discoveries, separate authored routes and country-specific 3D scenery.

| Country | Setting and route | Signature mechanic | Measured tier |
|---|---|---|---:|
| Brunei | Ulu Temburong rainforest; low bridge, tower, canopy lift and upper walkways | Suspension walk and canopy lift | 2 |
| Cambodia | Angkor-inspired forest courtyards; gallery gate, stairs and garden ledges | Pressure plate and timed stone gate | 3 |
| Indonesia | Bromo/Tengger sand plain; warned steam corridor, ash ascent and descending rim | Steam timing and collapsing ash shelf | 5 |
| Laos | Kuang Si cascades; stream crossing, limestone terraces and upper pools | Water-wheel-themed lift | 2 |
| Malaysia | Kinabalu; forest steps, granite face, exposed ridge and descent | Hold-jump climbing and warned ridge wind | 4 |
| Myanmar | Bagan river plain; fictional market steps, service lift and brick gallery | Market lift and timed gallery gate | 3 |
| Philippines | Ifugao-inspired irrigated terraces; contour ascent and sluice crossing | Irrigation-channel pressure plate and gate | 4 |
| Singapore | Marina gardens; plaza, elevator, skywalk and waterfront | Elevator and moving garden walkway | 2 |
| Thailand | Phang Nga limestone coast; warned surf, boat transfer and karst ledges | Tide-window timing and long-tail-boat platform | 4 |
| Timor-Leste | Atauro beaches; low pier, floating dock and coastal trail | Gentle floating dock and beginner gaps | 1 |
| Vietnam | Ha Long Bay; boat, high island, low cave, climbing face and upper exit | Boat-to-cave ascent and alternating elevations | 5 |

Each bonus path rejoins the main route. Coins, three stars, stable checkpoints, discovery panels and completion use the existing engine. Some optional pickups can also be reached by an accurately timed main-route jump; human feedback is still needed on whether the alternatives read clearly.

## Automated evidence

- **352 full simulation runs:** both routes, four start delays and all four runtime challenge settings. The normal UI runtime setting is recorded separately from the measured five-tier layout classification.
- **388 individual edge checks**, plus checkpoint recovery fault fixtures. Captured input tapes contain only real left/right/jump input; recovery fixtures are not used in browser playbacks.
- Every run completes without damage; all three stars and all coins are reachable across the two routes at each setting and start delay. Climbing, switches, gates, moving platforms and timed warnings have direct assertions.
- The existing structural similarity threshold remains **0.72**. No pair involving this batch is flagged across the current authored catalogue.
- The full repository suite passed **1,149 tests in 100 files**. The final follow-up regional and tracker checks passed **39 tests** after presentation adjustments. Production compilation, type checking and static generation passed; exact build IDs and logs are in `validation.json` and `production-build.txt`.
- Actual rendered browser replays cover both routes in every country at its normal runtime setting. Their result counters must match the recorded simulation tapes. [Browser results](desktop-playthroughs.json) and [route evidence](route-evidence.json) retain exact counts.
- [Desktop and emulated-phone evidence](browser-evidence.json) includes start, mechanic, landmark, overview and 390×844 captures. These checks cover overflow, heading fit, visible controls and movement response. Phone emulation is not physical-phone acceptance.

Capture and rendered-run records retain their actual production build ID. A final follow-up build repairs UTF-8 punctuation in the teaching copy; scenery, routes, physics and runtime settings are unchanged. Two optional-field typings in the existing patrol diagnostic script were also corrected for production type checking.

## Human and release gates

The user has kept the ten East Asia human sessions queued. **No human results have been received.** Start with Japan's beginner/main route, then Japan bonus, Paektu, China, Seoul and Mongolia, both routes. Use the unchanged [East Asia session instructions](../phase-a-revision-2/mongolia-seam/HUMAN-PLAYTESTS.md) and [session sheet](east-asia-human-playtests.csv). Route visibility, beginner readability, warnings, checkpoints, rewards and camera behavior require actual participant observations.

Account-save and physical-phone verification remain pending. **60 FPS remains unverified** until measured in a confirmed 60+ Hz browser environment. Concurrent headless review timing is diagnostic data, not performance approval. Device saves, mocked/disposable database tests, test passes and screenshots do not certify live account saving.

All **47 Asian country release flags remain false**. Five East Asia countries and eleven Southeast Asia countries are testing candidates; the other **31 countries remain proposed designs**. No next region is included in this batch.

## Art and geography limits

The landmarks are original procedural, stylized studies, not scans or exact reconstructions. These scenes need human visual review and further art refinement; they do not claim the cinematic fidelity of the supplied concept pictures. Routes, gates, lifts, hazard cycles and compressed distances are fictional. Protected monuments are scenery rather than instructions for climbing real sites. Ifugao heritage attribution does not claim every Banaue terrace is part of the UNESCO property.

Primary sources are linked for each country in the tracker and in `lib/world-explorer/southeast-asia.ts`: Brunei Tourism, UNESCO, Indonesia Travel, Luang Prabang Tourism, Gardens by the Bay, Tourism Authority of Thailand and Atauro's community tourism association. No new paid API, credential, remote database migration or runtime network dependency is required.

## Reproduce

```powershell
node scripts/world-explorer/report-southeast-asia.cjs
npx vitest run --maxWorkers=2 --minWorkers=1
$env:SOCIALU_BUILD_TARGET='asia-phase-a'
npm run build
```

Start that production build on port 3011, verify its `BUILD_ID` in the served HTML, then set `EXPLORER_REVIEW_OUTPUT` to this folder and `EXPLORER_REVIEW_COUNTRIES` to the eleven country codes before running `capture-asia-phase-a.cjs`. Set `EXPLORER_INPUT_TAPES` to this folder's `input-tapes.json` before running `review-asia-desktop.cjs`. The browser helpers use the existing ignored Playwright installation and installed Edge, with fresh guest contexts. They do not sign into accounts.
