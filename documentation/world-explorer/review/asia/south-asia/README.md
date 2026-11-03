# South Asia — nine-country testing batch

This batch contains Afghanistan, Bangladesh, Bhutan, India, Iran, Maldives, Nepal, Pakistan and Sri Lanka. They are **testing prototypes, not releases**. Iran is included in this project's South Asia development batch as requested by the existing tracker; that workflow grouping does not replace the catalogue's geographic classifications.

Open the [actual capture gallery](index.html), [47-country tracker](asia-tracker.csv), [runtime route evidence](route-evidence.json), [rendered browser results](desktop-playthroughs.json) or [validation summary](validation.json). The local production preview is `http://127.0.0.1:3011/world-explorer`.

## What is implemented

| Country | Authored route and setting | Signature mechanic | Measured tier |
|---|---|---|---:|
| Afghanistan | Band-e Amir lakes, pale mineral terraces, stone crossing and overlook | Precise mineral-terrace water crossings | 4 |
| Bangladesh | Sundarbans mangrove banks, low boardwalk, lookout and forest station | Gentle tidal raft | 1 |
| Bhutan | Paro forest path, successive cliff ledges, suspension bridge and distant monastery | Mountain lift and high cliff ascent | 5 |
| India | Agra water gardens, carved bridge, raised pavilion and garden overlook | Moving garden pavilion | 2 |
| Iran | Yazd earthen streets, rooftops, windcatchers and shaded courtyard | Airflow cue and rooftop service lift | 3 |
| Maldives | Low Baa-inspired sand islands, shallow lagoon, pier and coastal finish | Slow floating dock | 1 |
| Nepal | Khumbu snowy ledges, suspension trail, granite face and high lookout | Advanced bridge-to-climb traversal | 5 |
| Pakistan | Hunza/Passu skyline, long suspension crossing, mountain ascent and river descent | Moving rock lift | 5 |
| Sri Lanka | Sigiriya water gardens, sluice courtyard, stone stairs and rock overlook | Water-garden plate and gate | 3 |

All nine use the shared engine, country flags, coins, three optional stars, stable checkpoints, discovery panels and existing passport result flow. Each has a main route and an optional path that rejoins it. A main-route completion does not require every optional star; bonus runs verify all three. India retains its existing detailed Taj Mahal scenery and uses a new route around the gardens; the protected monument is not a destructible obstacle.

The new routes were adjusted using actual input-driven failures, including Bangladesh's lookout landing and Nepal's climb exit. No shared physics, collision system, difficulty threshold or East Asia mechanic was changed. These are still stylized procedural scenes awaiting human visual and gameplay acceptance; no exact reconstruction or cinematic concept-art match is claimed.

## Preserved candidates and heading correction

East Asia remains revision 2 / commit `1c7ed65`, including the Mongolia seam repair. The eleven Southeast Asia routes, mechanics and scenery module are preserved; hashes are checked against their working-tree snapshot taken before this batch. Existing East Asia protected files are also checked directly against `1c7ed65`.

Vietnam and Singapore's phone identity panels now use a full identity row in portrait and a compact two-column arrangement in landscape. The country names remain whole, subtitles wrap normally, and counters stay separate. Actual before/after captures cover **320×568, 360×640, 390×844, 568×320, 667×375 and 844×390** for both countries. See the [heading review](../southeast-asia/mobile-headings/README.md) and [after-check data](../southeast-asia/mobile-headings/after.json). These are browser viewport checks, not physical-phone testing.

The [focused Southeast Asia art tracker](southeast-art-pass.csv) contains six **PLANNED** tasks: repeated platform bodies; Laos's pools; Philippine terraces; Cambodian temple forms; Myanmar temple forms; and Vietnam's cave opening. These tasks are tracked separately and have not been marked complete. Each explicitly prohibits collision or mechanic changes.

## Evidence and remaining gates

The runtime report drives both routes at all four actual challenge settings and four start delays: **288 full simulation runs and 288 individual edge checks**. It verifies clean completion, discovery, collectible coverage and checkpoint reward retention. Fault-injected missed landings are separate recovery fixtures and are not used in captured input tapes. The unchanged structural similarity threshold is 0.72; the report includes comparisons against the current authored catalogue.

Browser replay feeds the recorded left/right/jump inputs into the actual renderer and checks the resulting HUD/result counters. It does not teleport the player, award items or count as human playtesting. Capture build IDs, source hashes, test counts and production-build results are retained in `validation.json`, `test-results.txt` and `production-build.txt`.

The ten East Asia human sessions remain **NOT_RUN / queued**, beginning with Japan's beginner/main route. The original [human instructions](../phase-a-revision-2/mongolia-seam/HUMAN-PLAYTESTS.md) and the copied [session sheet](east-asia-human-playtests.csv) retain the required observations on warnings, visibility, checkpoints, rewards and camera behavior.

**Account-save and physical-phone verification remain pending. 60 FPS remains unverified until measured in a confirmed 60+ Hz browser environment.** Concurrent headless replay timing is diagnostic information, not hardware acceptance. Tests, screenshots, guest device saves and disposable database checks do not prove live account saving.

All 47 Asian country release flags remain false. Twenty-five countries are testing candidates; the other **22 countries in Central and West Asia remain proposals**. No Central or West Asia country is implemented by this batch.

## Geography sources

Short discovery notes are original summaries linked to primary sources: [NASA: Band-e Amir](https://science.nasa.gov/earth/earth-observatory/band-e-amir-national-park-afghanistan-38311/), [UNESCO: Sundarbans](https://whc.unesco.org/en/list/798/), [Bhutan heritage authority: Paro Taktshang](https://dcdd.moha.gov.bt/collection/paro-taktshang/), [UNESCO: Taj Mahal](https://whc.unesco.org/en/list/252/), [UNESCO: Yazd](https://whc.unesco.org/en/list/1544/), [UNDP Maldives: Baa Atoll](https://www.undp.org/maldives/conservation-and-climate-action), [UNESCO: Sagarmatha](https://whc.unesco.org/en/list/120/), [Gilgit-Baltistan Tourism: Passu](https://e-tourism.visitgilgitbaltistan.gov.pk/tourist-destinations/passu-cones-hunza), and [UNESCO: Sigiriya](https://whc.unesco.org/en/list/202/).

Game routes, lifts, bridge distances, wind cycles and puzzles are fictional. Wildlife is not used as a hostile national stereotype. Cultural and religious landmarks remain protected scenery. No new paid API, account credential, production database write or hosted migration was introduced.

## Reproduce

```powershell
node scripts/world-explorer/report-south-asia.cjs
npx vitest run --maxWorkers=2 --minWorkers=1
$env:SOCIALU_BUILD_TARGET='asia-phase-a'
npm run build
```

Start that production build on port 3011 and verify its `BUILD_ID` against the served HTML. Run `check-regional-headings.cjs` for the phone regression. Set `EXPLORER_REVIEW_OUTPUT` to this folder and `EXPLORER_REVIEW_COUNTRIES` to the nine country codes before running `capture-asia-phase-a.cjs`; set `EXPLORER_INPUT_TAPES` to this folder's `input-tapes.json` before `review-asia-desktop.cjs`. Browser tools use the existing ignored Playwright installation, installed Edge and fresh guest contexts.
