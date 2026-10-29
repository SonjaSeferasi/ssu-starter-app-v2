# World Explorer

World Explorer is a separate geography adventure. The existing Jumpyland mode and its account progress are separate. Country membership uses an explicit list of the **193 UN member states**, rather than interpreting every ISO code, World Bank economy or polygon as a sovereign country.

## Japan-first prototype

The current deliverable follows the supplied specification's immediate priority: **one authored Japan prototype**. The 193-country catalogue and existing scenery previews remain available for planning and inspection. `levelAvailability()` marks Japan as `prototype`, other destinations as `preview`, and every destination as `releaseReady: false` / `visualReviewed: false` until the required human/device review is complete.

Japan's `jp-level-01.json` is an authored 107-unit course with 15 colliding platforms, a 16.5-unit lower suspension bridge, a separate ascending bonus route, two moving ledges, 30 coins, three optional stars, two safe checkpoints and a finish gateway. The main route can be completed without using the upper route or collecting a star. An original hooded enemy patrols the right-hand island; a jump-hit wooden block unlocks the Mount Fuji discovery once, with its fact dialog deferred until the player lands. The character uses one original modeled student with idle/run/jump/fall/land/collect/celebrate/damage/respawn states.

The spring environment is actual Three.js geometry: a snow-streaked Fuji, curved-eave pagodas, branching cherry groves, mossy cliff layers, torii, lanterns, animated water surfaces, instanced foam/mist and drifting petals. Foreground plants stay below the traversal lane; scenic objects are separate from the validated collision surfaces. Architecture, vegetation and the student are original modeled artwork. The cliffs also use bundled CC0 PBR maps by Rob Tuytel / Poly Haven; see [material licenses](../../public/world-explorer/materials/LICENSES.md). This remains stylized game art awaiting the user's visual acceptance, rather than an exact recreation of the concept illustration.

### Run and verify

```powershell
npm run dev
# http://127.0.0.1:3000/world-explorer?country=JPN&play=1

npm test -- --maxWorkers=2 --minWorkers=1

# Independent production review, alongside a running development server:
$env:SOCIALU_BUILD_TARGET='review'
npm run build
npm run start -- --hostname 127.0.0.1 --port 3001
# http://127.0.0.1:3001/world-explorer?country=JPN&play=1
```

The optional review build uses the fixed `.next-review` directory, supported by Next.js's [distDir setting](https://nextjs.org/docs/14/app/api-reference/next-config-js/distDir), so a Windows development server can keep owning `.next/trace`. Its generated files are ignored by Git. The test worker limit avoids exhausting this machine's memory with parallel PGlite/geometry workers; it does not reduce the tested cases.

Desktop controls: arrows/A/D, Space/Up/W, P/Escape. Mobile has simultaneous left/right/jump pointer controls, safe-area spacing and compact HUD. Settings include music/effects volume, reduced motion and lightweight graphics. Sound is original synthesized audio unlocked by a real pointer/keyboard gesture; no remote music is loaded. Graphics quality applies on the next run. Facts open in a paused discovery dialog rather than obscuring an active jump.

See the [new reference-layout revision](review/reference-layout/README.md) for the supplied picture's broad-left-cliff / lower-bridge / upper-star arrangement. The earlier review captures remain preserved.

For visual review, append `&review=1` to expose a full-level overview/player-camera switch and sampled FPS/draw/triangle diagnostics. Overview pauses the simulation and awards no completion. The existence of diagnostics is not a performance sign-off. See the [actual review captures](review/README.md).

### Component boundaries

- `lib/world-explorer/game-types.ts`: shared level, input, state, result and callback types.
- `public/world-explorer/levels/jp-level-01.json` and `level-manifest.ts`: ISO-alpha-2 level identity, stable IDs, runtime validation, authored Japan and seeded preview configurations.
- `simulation.ts`: pure fixed-60-Hz movement, swept collisions, carrying platforms, coyote/buffer timing, collectibles, safe checkpoints, enemy patrol/contact damage, one-time underside-hit discovery blocks, discovery pause and completion.
- `game-camera.ts`: reference-oriented Japan framing, leading player position and a vertical dead zone for small jumps.
- `country-scene.ts`: renderer/input adapters, visible entities, articulated character and bounded side camera. Rendering reads simulation state.
- `japan-environment.ts`: independent five-layer country scenery, animation, reduced-motion/quality presets and GPU cleanup.
- `japan-architecture.ts`, `japan-terrain.ts`, `japan-grove.ts` and `japan-vista.ts`: tiled pagodas/veranda buildings, weathered moss terraces, instanced cherry blossoms, outward-facing snow-streaked Fuji, a gradient sky volume and cloud banks.
- `japan-materials.ts`: locally bundled CC0 rock diffuse/normal/roughness maps, with procedural fallback and safe asynchronous loading.
- `japan-interactives.ts`: original hooded patrol character, beveled wooden discovery block and disposable collection sparkles.
- `explorer-character.ts`: articulated student with modeled curls, glasses, hoodie seams, jeans, sneakers and backpack, batched by animation pivot.
- `country-run.tsx`: compact HUD, touch controls, explicit loading/play/pause/discovery/completion/error views and accessible dialogs.
- `world-explorer.tsx`: atlas, continent/country/level selection, passport, milestones and settings.
- `world-explorer-progress.ts`, `progress-client.ts`, progress API and SQL migration: compatible device saves plus existing SocialU account integration.

### Acceptance evidence and remaining review

Input-driven tests traverse normal and Expert Japan without teleporting, retain all three hearts, land on moving platforms, activate the checkpoint/discovery, collect more than ten coins and reach the real finish. A second input-driven route collects all three optional stars and finishes. Further checks cover side walls, hazard failure, checkpoint recovery, item deduplication, coyote time, input buffering, pause timing and frame partitioning. Environment checks cover real geometry, depth clearance, animation, reduced-motion toggling, lightweight quality and resource cleanup.

**Japan visual revision, October 28:** inspected the real running scene in Microsoft Edge and compared the normal camera with the supplied Japan reference. Replaced smooth islands, sparse blossom masses and distant cone primitives; added tiled architectural detail, layered waterfall terraces, denser spring groves, natural rock surface maps, an early playable bridge and the timber/blue HUD. Regression tests protect cap height, a clear walking corridor, outward mountain/roof normals, visible Fuji snow and initial pagoda framing. The full suite passed **782 tests in 86 files**.

**Acceptance remains partial.** The desktop preview sampled around 30 FPS at 1,707 pixels window width during the observed review; this is a point-in-time observation, not a sustained production benchmark or the requested 60 FPS sign-off. Native browser review does not replace real-device mobile testing. Automated input tests complete the route, but a full manual browser completion, user approval of visual fidelity and mobile/FPS targets remain pending. Other countries remain scenery previews until their authored levels and country-specific visual work receive the same review.

The hosted passport RPC was probed with a null identity/read action and returned `404 / PGRST202`, confirming its migration is not installed. Apply the reviewed additive migration through the team's authorized database workflow before claiming account saving. Device saves remain available. See [account progress](ACCOUNT-PROGRESS.md). Publication/deployment and the remaining production-country rollout follow the specification's later phases.

## Country scope and geographical grouping

- Membership: [UN member states](https://www.un.org/en/about-us/member-states).
- Grouping: [UN Statistics Division M49](https://unstats.un.org/unsd/methodology/m49/), a statistical convention with one assignment per country. The Americas are split into South America and North America; the latter includes Northern America, Central America and the Caribbean.
- Transcontinental countries appear once in the catalogue according to that convention. This is a navigation scheme, not a statement that all of a country's territory or cultures fit within one continent.
- Antarctica has **no country level**. It has a separate bonus expedition, giving 193 country levels plus one expedition. The 193-country passport denominator excludes the expedition.
- Observer states, dependent territories and other areas can have valid ISO codes or map polygons while remaining outside this specific 193-member-state campaign.
- Each level's scenery is a representative, fictional platform course. A single biome does not describe an entire country's landscapes or people; course layout and props are not a geographic reconstruction.

The bundled catalogue includes source links. Its base country reference dataset is the open [mledoze countries project](https://github.com/mledoze/countries), with its database licence retained beside the data. UN membership and M49 grouping are applied independently. Names, capitals and other facts can change, so the snapshot date is shown rather than claiming perpetual accuracy.

## Free data services and licence checks

Checked on October 27, 2026:

| Source | Use | Access and limits |
| --- | --- | --- |
| [World Bank Indicators API](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation) | Optional current country reference facts | The public v2 country endpoint does not require an API key. The provider requests only an allowlisted country, validates the response, uses a four-second timeout and caches for 24 hours. Its coordinates describe the capital and are not substituted for country map positions. |
| [countries.dev](https://countries.dev/) | Optional capital/language metadata | The public alpha-code endpoint was checked without a key. Requests have a four-second timeout and a 24-hour application cache. Its response must match both bundled ISO codes. Unversioned population/currency values and remote flag URLs are not imported; local flag assets remain available during an outage. The documented abuse ceiling is approximately 60 requests/second/IP; no service-level guarantee is assumed. |
| [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) | Simplified continent/country outlines | Raster and vector map data are public domain. The display uses cartographic generalisation; borders are not suitable for navigation, surveying or asserting legal claims. Small island states remain selectable in the country list even when a low-resolution map omits their shape. |
| [REST Countries](https://restcountries.com/docs), [plans](https://restcountries.com/plans) | Evaluated, not a runtime dependency | The current v5 documentation requires an API key. The advertised free tier is 1,000 requests/month; sustained traffic above 20 requests/10 seconds is rate-limited. Versions 1–4 are deprecated. Current terms also disallow permanent offline snapshot use and re-exposing their data as another feed, so this implementation does not depend on the former no-key v3 endpoint or bundle a new snapshot from that service. |
| [Wikimedia Commons API](https://commons.wikimedia.org/wiki/Commons:API) | Optional real landmark reference photographs in the discovery card | No key is required. The server searches an allowlisted country's reviewed place name, uses a five-second timeout and an identifying User-Agent, and caches positive results for 24 hours. Only supported, explicitly licensed raster images with author and source metadata are accepted. The image, author, licence and Commons file-page link stay together. No photo is substituted for the 3D scenery. |
| [UNESCO World Heritage Datahub](https://data.unesco.org/explore/dataset/whc001/) | Reviewed names and physical traits of real places | Factual metadata is bundled with source links and CC BY-SA 4.0 attribution; runtime levels do not wait for UNESCO. Tentative List sites are identified as such. |

No paid account, API key or secret is required for the bundled game catalogue or the integrated country/landmark services. External services can become unavailable; the country level remains usable from its bundled data. This does not claim a third-party uptime guarantee. Unsplash was evaluated but is not required or called: its developer key and demo quota add a dependency that the optional Commons preview avoids.

World Bank open data defaults to [CC BY 4.0 with additional World Bank terms](https://datacatalog.worldbank.org/public-licenses), unless a dataset specifies another licence. The source URL and retrieval timestamp accompany live facts; copied text and data must retain appropriate attribution.

## Facts endpoint

`GET /api/world-explorer/countries/JPN` returns `{country, live, countryApi, source, snapshotDate}`. `country` is the fixed campaign record. Optional `live` World Bank facts contain the matching ISO alpha-3 code, capital, capital coordinates, source URL and retrieval timestamp. Optional `countryApi` facts contain countries.dev capital/language metadata and a local flag path. The two providers run independently; either may be null while the bundled level remains available. Unrecognised codes and non-member areas return 404.

Provider data cannot add levels, change membership or silently reassign a continent. No population value is displayed without an accompanying source and reference year.

`GET /api/world-explorer/media/JPN` returns an optional Commons image record. Unknown and non-member codes return 404. Missing, mismatched or unsupported licence metadata returns `image: null`; a photo outage never prevents the level from opening. Successful image metadata contains the contributor, licence URL, Commons file page and retrieval date. Japan was checked against the live service: a Mount Fuji landscape returned with its author and CC BY-SA licence.

## Flags

All 193 country flags are bundled locally under `public/world-explorer/flags/` from MIT-licensed flag-icons v7.3.2. The licence and per-file source/SHA-256 manifest are retained. The selection card, gameplay banner and modeled flagpole use the same allowlisted ISO identity. Switzerland retains its square proportions; Nepal retains its non-rectangular transparency. Antarctica uses a neutral expedition symbol rather than an invented national flag. Afghanistan's diplomatic-tricolor convention and recent Syria/Kyrgyzstan flag checks are documented beside the assets.

## Named places and discovery notes

`lib/world-explorer-discoveries.ts` provides a named place, teaching note, source link and recall question for every country, plus the Antarctic expedition. Seven showcase notes use the Statue of Liberty, Central Amazon Conservation Complex, Eiffel Tower, Giza pyramids, Mount Fuji, Sydney Opera House and Antarctic science cooperation.

The country discoveries combine factual UNESCO World Heritage metadata with separately checked government, protected-area, official tourism, monument-operator and scientific sources. A selected place represents one part of a country, rather than a ranking of national importance or a claim to describe its entire culture. Multi-country heritage properties retain their association with the relevant countries. Tentative List places, including Male Friday Mosque, Gishora Royal Residence and Providence Island, are explicitly distinguished from inscribed World Heritage properties.

The reference-driven additions select the Taj Mahal for India ([UNESCO 252](https://whc.unesco.org/en/list/252/)), Canadian Rocky Mountain Parks for Canada ([UNESCO 304](https://whc.unesco.org/en/list/304/)) and Kruger National Park for South Africa ([SANParks](https://www.sanparks.org/parks/kruger)). Their discovery notes and generator overrides use the same place identities as their dedicated models. These are representative selections rather than descriptions of an entire country.

The factual UNESCO-derived names, country associations, classifications and inscription years came from the official [UNESCO Datahub `whc001` API](https://data.unesco.org/api/explore/v2.1/catalog/datasets/whc001). Its dataset metadata declares [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); the derived metadata in `public/world-explorer/data/discoveries.json` retains that attribution and share-alike notice. The base country reference facts retain ODbL 1.0 terms. No long UNESCO descriptions, photographs, logos or video are copied into the discovery snapshot; teaching notes are newly written and link the relevant primary source. UNESCO does not endorse this game.

## Country place profiles and 3D interpretation

`lib/world-explorer/profiles.ts` supplies every country with a named place, physical traits, a rendering archetype, an illustrative palette, a source link and a reference-image search. `public/world-explorer/data/profiles.json` also contains the separate Antarctic science expedition. Examples include the Colosseum, Elizabeth Tower, Chichen-Itza, the Alhambra, the Acropolis, Angkor, Borobudur, Petra, Sagarmatha, Marrakesh and Kilimanjaro. These are actual named places, with architectural or landscape differences retained in the profile.

The final snapshot contains 193 unique named country places and the Antarctic expedition. No country uses a capital-name-only fallback. Country scenes and the visible landmark card both consume the profile, while the base catalogue retains the separately sourced country facts.

The meshes are stylized geometric interpretations, **not scans, measured reconstructions or 193 bespoke asset packs**. A rendering archetype is not a formal building classification: the opera house uses the palace family with shell-roof traits; Borobudur uses stepped geometry with Buddhist stupas. Palettes are art direction rather than verified historical paint colours. A scene's fictional platform route is not a visitor route or a claim that protected buildings can be climbed.

Physical distinctions matter: Madagascar's dry forest is separate from Amazon rainforest; Hegra has rock-cut tombs; La Brea Pitch Lake is asphalt rather than ordinary blue water; To Sua is a deep swimming hole; Laas Geel is rock shelter art in the Somaliland region, not a ruined temple. Each profile identifies its source so later model refinement can be checked against the real place. No national costume, animal, flower, food or precise monument dimension is invented from a continent stereotype.

Maintainers can refresh the local UNESCO research input with `node scripts/world-explorer/fetch-heritage-reference.cjs`, then rebuild with `node scripts/world-explorer/build-profiles.cjs`. The fetch makes serial public Datahub requests; it does not run in the game. `build-profiles.cjs` also accepts the local research JSON path as its first argument. Review changes and recheck the linked primary sources before replacing a reviewed snapshot; an API refresh is not an accuracy review.

## Passport storage

Existing v1 device stamps, best coins and attempts are preserved. New fields record stars, discovered fact IDs, first completion and best completion time. Signed-in requests use SocialU's existing verified session and a service-only, student-scoped RPC; anonymous users and failed/missing account setup use an explicit device-save channel. A successful local write is never reported as an account save.

`supabase/migrations/20261027000200_world_explorer_progress.sql` adds a destination allowlist, private passport records and UUID-deduplicated run receipts. It has passed real disposable PGlite schema/RLS tests but has **not been applied to hosted Supabase**. Its destination IDs are alpha-2, with compatible alpha-3 API/device keys. It neither changes avatar data nor awards SocialU points. [Account integration and migration details](ACCOUNT-PROGRESS.md) cover ownership, retries, failure behavior and remaining live QA.

## Verification

The latest [Japan reference-layout revision](review/reference-layout/README.md) passed **789 tests across 87 files** and a production build. All **21 targeted route, simulation and vista tests** passed again after the final camera starting-position adjustment. Its actual opening and full-course captures are preserved in that review folder. The layout is closer to the supplied picture; cinematic art fidelity and real-device mobile acceptance remain pending.

The full bounded-worker command passed **768 tests across 83 files**. `SOCIALU_BUILD_TARGET=review npm run build` passed, including TypeScript, both optional country/media endpoints and the authenticated progress endpoint. Tests use disposable databases or mocked providers; they do not prove hosted saving or browser visual fidelity. A prior unconstrained worker run exhausted host memory; the same complete suite passed with two workers.

## Integrated mode

Open `/world-explorer`, or use **Explore the world** in the Game Room. Japan is the authored prototype; other country routes are explicitly development previews. The atlas opens continent selection, and completing a route records a sourced discovery and prototype passport stamp. The Antarctic expedition has its own completion record. The introductory portion of a route is Explore; moving-platform challenges begin later in the Challenge portion; Discover appears at the finish. Expert Challenge overrides the progression difficulty without changing the country facts.

All 193 countries have distinct deterministic layouts and named educational discoveries. The 3D renderer consumes the per-country place profile so natural landscapes, architecture, roof forms, source-supported traits and palettes vary across the campaign. USA, Brazil, France, Egypt, Japan, Australia, India, Canada, South Africa and Antarctica have ten showcase environment treatments. These are procedural interpretations, rather than bespoke reconstructions of every landmark. The explorer character and keyboard/touch controls remain consistent.

The dedicated scenery includes Taj Mahal gardens, Canadian Rockies and Kruger savanna. Egypt also has a modeled Sphinx; Brazil has broadleaf canopies, vines, a log crossing and a source-checked Amazon toucan; France has mansard roofs, balconies and street lamps; Australia has Sydney Harbour Bridge's arch and four pylons. Supporting primary-source URLs are retained in `country-showcase.ts` and `reference-details.ts`. Sydney scenery is not labelled as the geographically distant Great Barrier Reef.

Source-led district builders distinguish Chinese imperial courtyards, Lalibela's rock-cut cruciform church, Armenian and Georgian monasteries, Tallinn's gables, medina courtyards, timber houses, earthen towers, Nan Madol's basalt islets, Jelling's mounds and Asmara's modernist buildings. Other countries continue to use profile-driven shared geometry. These changes improve differentiation but do not establish bespoke photorealistic artwork for all 193 countries.

Along the playable route, Paris/New York use roof furniture rather than forest trees, Amazon settings use broadleaf canopy trees rather than only palms, Indian terraces use garden balustrades, Canadian ledges have snow and ice edging, and the Kruger route has dry-grass details. Arid and savanna settings use land-coloured ground instead of a universal turquoise sea. Profile-coloured cliff geometry has local procedural grain; texture-coordinate and batching changes retain the solid collision cap and preserve UV-free sculpted roof geometry.

Prior catalogue/preview validation checked all 193 local flag URLs, the real atlas polygons, optional Japan metadata/photo responses and unknown-code 404 behavior. Those checks establish data/asset coverage, not completion of 193 production environments. Current prototype acceptance and remaining review are recorded above.
