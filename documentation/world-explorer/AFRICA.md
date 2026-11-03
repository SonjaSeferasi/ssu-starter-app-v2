# Africa — continental release

This is the dashboard for the African levels of Jumpyland: World Explorer. Every African country has its own level, built on the shared route-graph engine like Japan and the other continents. Each level is themed on the place the country is best known for.

- **Egypt** keeps its existing route-graph proof level (Pyramids of Giza).
- **South Africa** keeps its first-template level, because the level-design tests compare other levels against it.
- The other **52** countries are new. They are listed below.

The figures come from the live code:

- Places, facts and hints: `lib/world-explorer/africa.ts`
- Levels: `lib/world-explorer/levels/africa/<iso3>.ts`, with shared helpers in `common.ts`
- Scenery: `components/world-explorer/countries/africa/<country>.ts`. These use the shared Africa kit: `environment.ts`, `flora.ts`, `architecture.ts` and `shared-props.ts`.
- Tests: `__tests__/world-explorer-africa.test.ts`

## Status at a glance

| | |
| --- | --- |
| Playable from start to finish (expert and Explorer assist, with pauses and backtracking) | **52 of 52** |
| Pass all 16 LevelValidator checks | **52 of 52** |
| Measured tier equals declared tier | **52 of 52** |
| Every coin and all three stars reachable by an input-only player | **52 of 52** |
| Repetition analyzer flags (against each other, Egypt and Japan) | **0**. The highest pair is bj-level-01 and bw-level-01 at 0.71; the review threshold is 0.72. |
| Tier spread | T1: 5 · T2: 15 · T3: 17 · T4: 10 · T5: 5 |
| Human visual and gameplay review | **0 of 52, pending** |
| RELEASED | **0 of 52** |

Every level is in **TESTING**. A level is only marked released after a person has approved the design, played it on desktop and on a phone, and signed off the visuals.

## Dashboard

| Batch | Country | Level | Tier | Signature mechanic | Collectibles | Bot time / target | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A · North | Morocco | Chefchaouen: The Blue Medina | 3 · Challenger | market awning bounce to rooftops | 21 coins, 3 stars | 24 s / 62 s | TESTING |
| A · North | Algeria | Tassili n’Ajjer: The Stone Forest | 4 · Expert | cracking sandstone flakes in gusts | 23 coins, 3 stars | 30 s / 66 s | TESTING |
| A · North | Tunisia | El Jem: The Amphitheatre Climb | 2 · Adventurer | plate raised arena stones and hypogeum lift | 19 coins, 3 stars | 19 s / 48 s | TESTING |
| A · North | Libya | Leptis Magna: Columns by the Sea | 3 · Challenger | toppling column drums and harbour waves | 24 coins, 3 stars | 23 s / 62 s | TESTING |
| A · North | Sudan | Meroë: Pyramids of the Kushite Kings | 2 · Adventurer | sliding dune faces and camel ferry | 19 coins, 3 stars | 25 s / 58 s | TESTING |
| B · West | Mali | Djenné: Rooftops of the Mud City | 4 · Expert | toron beam wall climbs | 19 coins, 3 stars | 23 s / 64 s | TESTING |
| B · West | Niger | Kouré: The Giraffe Plateau | 3 · Challenger | ambling giraffe rides | 17 coins, 3 stars | 31 s / 58 s | TESTING |
| B · West | Mauritania | Iron Ore Train: Across the Sahara | 3 · Challenger | hop between rolling ore wagons | 19 coins, 3 stars | 30 s / 62 s | TESTING |
| B · West | Senegal | Lac Rose: The Salt Harvest | 2 · Adventurer | shoreward brine current and salt crust | 22 coins, 3 stars | 24 s / 54 s | TESTING |
| B · West | Gambia | River Gambia: Baboon Islands | 1 · Explorer | river ferry to island | 19 coins, 3 stars | 18 s / 48 s | TESTING |
| B · West | Guinea-Bissau | Bijagós: The Hippo Crossing | 2 · Adventurer | surfacing hippo backs | 20 coins, 3 stars | 20 s / 52 s | TESTING |
| B · West | Guinea | Fouta Djallon: The Bridal Veil Falls | 4 · Expert | slick ledges and cliff beside the falls | 18 coins, 3 stars | 21 s / 56 s | TESTING |
| B · West | Sierra Leone | Tiwai Island: Down the Moa River | 3 · Challenger | drifting logs and upstream rapids | 18 coins, 3 stars | 31 s / 58 s | TESTING |
| B · West | Liberia | Robertsport: The Surf Coast | 2 · Adventurer | bobbing surfboards over backwash | 18 coins, 3 stars | 22 s / 54 s | TESTING |
| B · West | Côte d’Ivoire | Yamoussoukro: The Basilica Dome | 3 · Challenger | swinging bell platform after dome lift | 19 coins, 3 stars | 23 s / 60 s | TESTING |
| B · West | Ghana | Kakum: The Canopy Walkway | 3 · Challenger | swaying spans between tree platforms | 21 coins, 3 stars | 31 s / 62 s | TESTING |
| B · West | Togo | Koutammakou: The Tower Houses | 3 · Challenger | hand climbed takienta walls | 21 coins, 3 stars | 19 s / 50 s | TESTING |
| B · West | Benin | Ganvié: The Stilt Village | 2 · Adventurer | pirogue ferries between stilt houses | 20 coins, 3 stars | 25 s / 56 s | TESTING |
| B · West | Burkina Faso | Tiébélé: The Painted Royal Court | 2 · Adventurer | two plate low doorways | 19 coins, 3 stars | 17 s / 42 s | TESTING |
| B · West | Nigeria | Zuma Rock: The Monolith Ascent | 4 · Expert | warned rockfall on the dome | 16 coins, 3 stars | 20 s / 54 s | TESTING |
| B · West | Cabo Verde | Fogo: Into the Volcano | 5 · Master | fumarole steam on the cone | 17 coins, 3 stars | 28 s / 46 s | TESTING |
| C · Middle | Cameroon | Mount Cameroon: The Race of Hope | 4 · Expert | liana swings over lava gullies | 21 coins, 3 stars | 30 s / 66 s | TESTING |
| C · Middle | Central African Republic | Dzanga Bai: The Elephant Clearing | 2 · Adventurer | sinking mud and elephant timing | 19 coins, 3 stars | 19 s / 42 s | TESTING |
| C · Middle | Chad | Ennedi: The Aloba Arch | 4 · Expert | plate raised guelta stones then arch span | 19 coins, 3 stars | 26 s / 48 s | TESTING |
| C · Middle | Democratic Republic of the Congo | Nyiragongo: Rim of the Lava Lake | 5 · Master | warned lava fountains on crater terraces | 19 coins, 3 stars | 35 s / 66 s | TESTING |
| C · Middle | Republic of the Congo | Congo River: The Brazzaville Rapids | 3 · Challenger | standing waves over rapids rocks | 20 coins, 3 stars | 21 s / 58 s | TESTING |
| C · Middle | Gabon | Loango: Elephants on the Beach | 2 · Adventurer | bobbing driftwood at the lagoon mouth | 17 coins, 3 stars | 18 s / 46 s | TESTING |
| C · Middle | Equatorial Guinea | Bioko: The Crater Lake | 3 · Challenger | moss plate raised logs on the crater lake | 16 coins, 3 stars | 20 s / 52 s | TESTING |
| C · Middle | São Tomé and Príncipe | Pico Cão Grande: The Needle | 5 · Master | two hand climbed faces with crumbling leaps | 22 coins, 3 stars | 27 s / 46 s | TESTING |
| C · Middle | Angola | Serra da Leba: The Hairpin Pass | 3 · Challenger | truck rides between hairpin bends | 13 coins, 3 stars | 29 s / 62 s | TESTING |
| D · East | Kenya | Maasai Mara: The Great Migration | 3 · Challenger | riding the crossing herd | 16 coins, 3 stars | 28 s / 58 s | TESTING |
| D · East | Tanzania | Kilimanjaro: Roof of Africa | 5 · Master | barranco wall step ups to glacier ice | 27 coins, 3 stars | 48 s / 70 s | TESTING |
| D · East | Ethiopia | Lalibela: The Rock-Hewn Churches | 3 · Challenger | courtyard plate and carved tunnel door | 18 coins, 3 stars | 19 s / 44 s | TESTING |
| D · East | Eritrea | Asmara: The Modernist City | 3 · Challenger | art deco lifts and cantilever balconies | 18 coins, 3 stars | 26 s / 58 s | TESTING |
| D · East | Djibouti | Lac Abbé: The Steaming Chimneys | 4 · Expert | land on the cool side of steaming chimneys | 17 coins, 3 stars | 21 s / 50 s | TESTING |
| D · East | Somalia | Laas Geel: The Painted Shelters | 2 · Adventurer | flaking granite and sliding sand bank | 15 coins, 3 stars | 15 s / 38 s | TESTING |
| D · East | South Sudan | The Sudd: Floating Papyrus | 2 · Adventurer | bobbing and sinking papyrus mats | 18 coins, 3 stars | 16 s / 38 s | TESTING |
| D · East | Uganda | Murchison Falls: The Nile Squeeze | 4 · Expert | river lip current toward the drop | 19 coins, 3 stars | 22 s / 58 s | TESTING |
| D · East | Rwanda | Volcanoes: The Gorilla Trail | 3 · Challenger | bent bamboo fling into the hagenia | 16 coins, 3 stars | 20 s / 56 s | TESTING |
| D · East | Burundi | Gishora: The Royal Drums | 2 · Adventurer | royal drum bounces | 15 coins, 3 stars | 18 s / 50 s | TESTING |
| D · East | Malawi | Lake Malawi: Cichlid Shores | 1 · Explorer | dugout canoe across the bay | 18 coins, 3 stars | 17 s / 46 s | TESTING |
| D · East | Mozambique | Bazaruto: The Dhow Crossing | 2 · Adventurer | sailing dhow across the channel | 12 coins, 3 stars | 19 s / 52 s | TESTING |
| D · East | Madagascar | Tsingy de Bemaraha: Razor Stone Forest | 5 · Master | crumbling pinnacle tips and rope bridge | 20 coins, 3 stars | 25 s / 45 s | TESTING |
| D · East | Mauritius | Chamarel: The Seven Coloured Earths | 2 · Adventurer | sliding coloured earth dunes | 16 coins, 3 stars | 20 s / 50 s | TESTING |
| D · East | Seychelles | La Digue: The Granite Boulders | 1 · Explorer | giant tortoise ride | 16 coins, 3 stars | 20 s / 46 s | TESTING |
| D · East | Comoros | Karthala: The Crater Rim Walk | 1 · Explorer | ylang terraces to the caldera rim | 15 coins, 3 stars | 17 s / 46 s | TESTING |
| D · East | Zambia | Victoria Falls: The Smoke That Thunders | 4 · Expert | zambezi lip current and knife edge gusts | 21 coins, 3 stars | 22 s / 42 s | TESTING |
| D · East | Zimbabwe | Great Zimbabwe: The Stone City | 3 · Challenger | enclosure plate and narrow passage | 18 coins, 3 stars | 20 s / 36 s | TESTING |
| E · Southern | Namibia | Sossusvlei: Dunes of the Namib | 3 · Challenger | sliding dune crests and deadvlei tree hops | 14 coins, 3 stars | 20 s / 52 s | TESTING |
| E · Southern | Botswana | Okavango: Mokoro Channels | 2 · Adventurer | mokoro rides between sinking lily pads | 17 coins, 3 stars | 26 s / 50 s | TESTING |
| E · Southern | Lesotho | Maletsunyane: The Highland Gorge | 4 · Expert | abseil platform down winch up beside the falls | 22 coins, 3 stars | 27 s / 60 s | TESTING |
| E · Southern | Eswatini | Mantenga: The Beehive Village | 1 · Explorer | stepping stones across the mantenga stream | 15 coins, 3 stars | 14 s / 34 s | TESTING |

## How the levels were built

- **One idea per country.** Each level has its own archetype and signature mechanic; the test suite checks that no two are the same. For example:
  - Morocco climbs the blue rooftops of Chefchaouen's medina, bouncing off a market awning and riding a goods hoist up to the kasbah wall.
  - Mali climbs the toron beams of the Great Mosque of Djenné.
  - Zambia crosses the Knife-Edge Bridge in the spray of Victoria Falls.
  - Burundi bounces on royal drums.
  - Botswana rides mokoro canoes between sinking lily pads.
- **Japan as the reference for detail.** Every level has a full country environment:
  - its own sky, fog and lighting
  - layered backdrops and a named landmark group (each one checked by the tests)
  - platform dressing in local materials
  - animated life: herds, flocks, boats, waterfalls, mist and drifting sand
  - local flora: baobab, quiver tree, ravenala, papyrus, giant groundsel and others
  - a native creature as the enemy
  - checkpoint and crate colours from the country's flag
- **Respectful representation.**
  - Every environment states what is a game device and what is a study of the real place.
  - Sacred and protected sites (Lalibela, Laas Geel, the royal drums, the Deadvlei trees) are scenery only. The route never crosses them.
- **Difficulty.**
  - Each country's tier is the one the production manifest planned for it, so that the 193 member states land exactly on the 39/39/39/38/38 split.
  - Each level file is the authored layout (landmark, sections, mechanics, collectibles). Each level declares its calibrated blockout tier: on 2026-11-03 the project owner chose to keep every built level's tier (`tierTarget` in design-manifest.ts) rather than re-tier to the old 39/39/39/38/38 quota. The difficulty pass in `levels/africa/tune.ts` (which re-spaces a level's plain jumps for a different tier) is therefore inactive and kept only for a future tier change.
  - The measured tier (mean of the hardest third of the jumps plus timing mechanics) is checked against the declared tier for every level.
  - Gaps and rises were tuned until an input-only bot could clear every mandatory edge at every timing.

## Known limitations

- **No human playtest or visual sign-off yet.** Scenery passed automated checks for mounting, disposal, finite geometry, vertex budget and named landmarks. Nobody has looked at it on screen.
- **Landmarks are procedural studies at game scale,** not measured models.
- **No photo-reference files.** `referenceFile` is left undefined, so the card uses the country's media search.
- **Shared-file wiring.** `dev/integrate.py` wires the levels into these shared files with anchor patches:
  - `authored-levels.ts`
  - `profiles.ts`
  - `guide-destination.ts`
  - `world-explorer-discoveries.ts`
  - `country-run.tsx` (the trail tip)
  - `countries/registry.ts`

  If one of those files is restructured, re-run the script and check its output for `ANCHOR MISSING`.
