# Central Asia — five TESTING prototypes

This batch adds Kazakhstan, Kyrgyzstan, Tajikistan, Turkmenistan and Uzbekistan to the existing 25 Asia testing candidates. East Asia revision 2 / commit `1c7ed65`, the eleven Southeast Asia prototypes, the nine South Asia prototypes and the shared simulation remain preserved. All 47 Asian countries remain unreleased. West Asia's seventeen countries remain proposed designs; this batch returns for review before that region starts.

Open [the game capture gallery](index.html), [the 47-country tracker](asia-tracker.csv) or [the validation record](validation.json). The local production preview runs at `http://127.0.0.1:3011/world-explorer` while its server is running.

| Country | Setting and distinctive route | Signature mechanic | Measured layout tier |
| --- | --- | --- | --- |
| Kazakhstan | Charyn's red, eroded canyon towers; descending ledges, river view and an optional high shelf | Warned timed rockfall on the main terrace | 2 |
| Kyrgyzstan | Ala-Archa's greener juniper valley, mountain stream and snowy Ala-Too backdrop; bridges lead to an upper ridge | Optional slippery ice shelf above the stream route | 4 |
| Tajikistan | Sparse eastern Pamir plateau and rugged mountain backdrop; granite ascent and narrow upper pass | Climbable face followed by a warned wind zone | 5 |
| Turkmenistan | Yangykala's contrasting white, red, yellow and orange bands; terraced descent and an elevated lookout | Sliding mineral platform | 3 |
| Uzbekistan | Registan-inspired mosaic portals, turquoise domes and a fictional Samarkand courtyard circuit | Timed courtyard gate and tiled service lift | 2 |

These are original stylized procedural environments, not photographic reproductions or exact reconstructions. The interactive routes are fictional; protected architecture stays separate from gameplay colliders. Country flags, identity, discoveries and source links use the existing country pipeline. No paid API, dependency or database change is required by this batch.

The developer capture review still identifies art limitations for human review: the canyon towers have regular silhouettes, the Ala-Archa/Pamir mountain surfaces are too smooth, juniper vegetation is simplified, and Samarkand's facades and paving need finer architectural detail. These findings do not change the validated routes or count as completed art acceptance.

## Verification

- **160 complete input-driven simulation runs:** both routes in five countries × four runtime challenge settings × four start delays (`0`, `0.7`, `1.9`, `3.1` seconds). Each finishes with three hearts and discovery content unlocked. Every bonus route collects three stars. Every main/bonus pair covers all placed coins and stars at each setting and timing.
- **176 individual route-edge checks** at four additional cycle timings (`0`, `0.9`, `2.1`, `3.6` seconds), including optional transitions.
- **320 checkpoint pause/recovery fixtures:** pause freezes time and moving platforms; a controlled missed landing respawns at the saved checkpoint, retains collected rewards and restores left/right movement. This fault injection is separate from all browser capture tapes.
- **Ten rendered browser route completions** at each country's actual normal runtime setting, using recorded left/right/jump inputs. Browser HUD counters, hearts, stars and discovery results must match the simulation tape. See [rendered results](desktop-playthroughs.json).
- **45 actual game captures:** nine per country, including both route replays, completion states, mobile controls, mechanism, landmark, start and overview. Camera scans are explicitly presentation captures, not proof of traversal; only the replay runs establish rendered traversal.
- **Forty responsive layout checks:** five countries across `320×568`, `360×640`, `390×844`, `568×320`, `667×375` and `844×390`. Check single-line country names, fitting subtitles, separate counters and horizontal overflow. See [layout gallery](mobile-layouts/index.html).
- Full test-suite and final focused-suite counts are recorded from their actual logs in [test-results.txt](test-results.txt). The production build output is preserved in [production-build.txt](production-build.txt); the same build ID must appear in every browser evidence record.
- Source preservation checks compare the frozen East Asia files against `1c7ed65`, and Southeast/South Asia routes and scenery against the pre-batch [source hashes](preserved-source-baseline.json). The CSS comparison permits only added Central Asia environment selectors and the Central Asia-only desktop name rule; existing regional rules remain unchanged.

Runtime challenge settings (`1–4`) and layout tiers (`1–5`) measure different things. The new routes are tested at every runtime setting, with the measured geometry tiers checked against the supplied country targets. Structural similarity is screened at `0.72`; no new flagged pair is accepted automatically.

## Open art work and acceptance gates

The **six Southeast Asia art tasks remain PLANNED** in their [separate queue](southeast-art-pass.csv): repeated platform bodies, Laos's pools, Philippine terraces, Cambodia's temple forms, Myanmar's temple forms and Vietnam's cave opening. Their tested collisions and mechanics remain protected.

South Asia's remaining visual refinements are recorded separately as **nine PLANNED entries** in [south-art-pass.csv](south-art-pass.csv): Band-e Amir shores, mangrove detail, Paro cliff/monastery, Agra garden paving, Yazd facades, Maldives shore/dock contact, Khumbu terrain detail, Passu riverbanks and Sigiriya relief. Recording these proposals does not change those testing candidates or claim human art approval.

The ten East Asia human sessions remain **NOT_RUN**, queued with **Japan's beginner route first**. See [the unchanged playtest queue](east-asia-human-playtests.csv) and [human playtest instructions](../phase-a-revision-2/mongolia-seam/HUMAN-PLAYTESTS.md). Automated input playback is not a human playtest.

Account-save verification and physical-phone testing remain **PENDING**. **60 FPS remains UNVERIFIED** until measured in a confirmed 60+ Hz browser environment. Headless browser timing is diagnostic only, particularly with concurrent review contexts. No prototype is released by a passing test, build, screenshot or tracker entry.

## Geography sources

- Kazakhstan: [UNESCO — Charyn Biosphere Reserve](https://www.unesco.org/en/mab/charyn).
- Kyrgyzstan: [Kyrgyz Community Based Tourism — Ala-Archa](https://cbtkyrgyzstan.kg/destinations/ala-archa/).
- Tajikistan: [UNESCO — Tajik National Park, Mountains of the Pamirs](https://whc.unesco.org/en/list/1252/).
- Turkmenistan: [Turkmenistan government — Yangykala's layered formations](https://turkmenistan.gov.tm/en/post/59322/yangi-kala-space-landscapes-turkmen-canyon).
- Uzbekistan: [UNESCO — Samarkand, Crossroad of Cultures](https://whc.unesco.org/en/list/603/).

## Reproduce

Use `node scripts/world-explorer/report-central-asia.cjs` for the simulation/timing report, `npm test` for the suite, and `SOCIALU_BUILD_TARGET=asia-phase-a` with `npm run build` for the isolated production build (set the variable with PowerShell syntax on Windows). Start that build on port 3011. Capture scripts accept `EXPLORER_REVIEW_URL`, `EXPLORER_REVIEW_OUTPUT`, `EXPLORER_BUILD_ID` and country selection variables; the desktop replay script also accepts `EXPLORER_INPUT_TAPES` and up to two `EXPLORER_REVIEW_WORKERS`. The installed review-only Playwright module is in ignored `tmp/tools/asia-browser`.

After all evidence exists, run `node scripts/world-explorer/package-central-asia.cjs`, then `node scripts/world-explorer/validate-central-asia-gallery.cjs`, then the packager once more to incorporate gallery validation. Packaging asserts the regional counts, source preservation, same-build provenance, route outcomes, open art queues and unreleased status.
