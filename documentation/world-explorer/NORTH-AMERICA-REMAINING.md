> Current correction review: [rendered routes, mobile controls and revised scenery](review/north-america/revision-1/README.md). The older paused-scene package below is historical evidence.

# North America â€” remaining 17 countries

All 23 North American countries in the catalogue now open authored adventures. This pass adds the 17 countries below to the earlier Canada, United States, Mexico, Guatemala, Costa Rica and Jamaica levels.

Each country uses a curated ordered route, timed mechanics, optional upper star path, discovery fact, checkpoint refuges and an articulated patrol. Base tiers range from 2 to 4; Expert and Explorer Assist remain available. Shared route arithmetic is reused; country routes, destination metadata, landmark geometry and encounter anatomy are authored separately. Monument studies are original stylizations, not surveyed replicas or a representation of every part of a country.

| Country | Destination | Tier | Route focus | Patrol | Reference |
|---|---|---:|---|---|---|
| Antigua and Barbuda | Antigua Naval Dockyard | 2 | shipyard rigging and cargo transfer | hermit-crab | [Source](https://whc.unesco.org/en/list/1499/) |
| Bahamas | Exuma Cays Land and Sea Park | 2 | sandbar rafts and limestone pockets | iguana | [Source](https://bnt.bs/explore/exuma/exuma-cays-land-sea-park/) |
| Barbados | Historic Bridgetown and its Garrison | 2 | clock court gate and rooftop lift | clockwork | [Source](https://whc.unesco.org/en/list/1376/) |
| Belize | Belize Barrier Reef Reserve System | 3 | reef current and mangrove ferry | reef-crab | [Source](https://whc.unesco.org/en/list/764/) |
| Cuba | Old Havana and its Fortification System | 2 | arcade balconies and harbour gate | anole | [Source](https://whc.unesco.org/en/list/204/) |
| Dominica | Morne Trois Pitons National Park | 4 | warned steam and forest gorge | beetle | [Source](https://whc.unesco.org/en/list/814/) |
| Dominican Republic | Colonial City of Santo Domingo | 3 | fortress gate and stone stair route | mongoose | [Source](https://whc.unesco.org/en/list/526/) |
| El Salvador | Joya de CerÃƒÂ©n Archaeological Site | 3 | ash bank collapse and raised walkway | armadillo | [Source](https://whc.unesco.org/en/list/675/) |
| Grenada | The Carenage, St GeorgeÃ¢â‚¬â„¢s | 2 | harbour boat and hillside stairs | gecko | [Source](https://grenadaports.com/index.php/port-services/cruise-terminus) |
| Haiti | National History Park Ã¢â‚¬â€œ Citadel, Sans Souci, Ramiers | 4 | citadel climb and rampart gusts | land-crab | [Source](https://whc.unesco.org/en/list/180/) |
| Honduras | Maya Site of Copan | 3 | carved terraces and stelae puzzle | coati | [Source](https://whc.unesco.org/en/list/129/) |
| Nicaragua | Ometepe Island Biosphere Reserve | 4 | lake crossing and volcanic ridge | leaf-ant | [Source](https://www.unesco.org/en/mab/ometepe-island) |
| Panama | Panama Canal locks | 3 | lock lifts and pressure gate sequence | clockwork | [Source](https://pancanal.com/en/history-of-the-panama-canal/) |
| Saint Kitts and Nevis | Brimstone Hill Fortress National Park | 3 | bastion stairs and courtyard switch | mongoose | [Source](https://whc.unesco.org/en/list/910/) |
| Saint Lucia | Pitons Management Area | 3 | piton cliffs and canopy transfer | anole | [Source](https://whc.unesco.org/en/list/1161/) |
| Saint Vincent and the Grenadines | La SoufriÃƒÂ¨re, Saint Vincent | 4 | crater ledge collapse and steam timing | beetle | [Source](https://discoversvg.com/what-to-do/eco-adventures/) |
| Trinidad and Tobago | Caroni Swamp Bird Sanctuary | 3 | mangrove current and channel boats | fiddler-crab | [Source](https://visittrinidad.tt/attractions/caroni-swamp-bird-sanctuary/) |

## Art and reference review

Reference photographs were inspected for all 17 destinations. Models emphasize Havana's arcades/balconies, Barbados' clock tower, Grenada's waterfront roofs, Maya stelae at CopÃ¡n, Joya de CerÃ©n's sheltered adobe foundations, the Citadelle's angled massing, Panama's lock gates and cargo ship, steep Pitons, broad volcanic craters, white sand cays, reef habitats and Caroni mangrove roots with decorative scarlet ibis. Original procedural masonry textures and the existing local CC0 surface library provide material detail. Third-party reference photographs are not shipped as game textures.

Playable surfaces retain the authored slope and stair profiles. Added shoulders, plants and buildings are decoration; they do not alter collision geometry. Landmark facade clearings keep trees out of the primary views. Antigua's swing envelope was shortened to keep its receiving dock clear.

See [the screenshot gallery](review/north-america/remaining/index.html), [browser evidence](review/north-america/remaining/browser-evidence.json), and [validation results](review/north-america/remaining/validation.json).

## Verification and limits

The focused suite checks full-route timing phases, all coins and three stars on clean main/bonus runs, measured tiers, Expert/Assist routes with pauses and backtracking, checkpoint fall recovery, enemy animation states, and precise visible ground raycasts in both quality modes. The separate coverage test asserts that all 23 catalogue countries open an authored level and registered environment. Existing first-six North America and Japan/environment regression checks are retained.

The production build uses `SOCIALU_BUILD_TARGET=north-america-build`; local source preview uses port 3016. Archived `documentation/**/shared-loading-baseline` TypeScript evidence is excluded from application compilation because its copied relative imports are not executable application modules.

This remains prototype work. Automated route completion and screenshots do not establish human enjoyment, final difficulty approval, physical-device performance, cloud/account saving, or release readiness. No publication was performed.

Final receipts: 216 unique acceptance/regression checks passed, plus 34 final-art rechecks. Production build `U2FaSbfJPJJx6s7BVQtus` succeeded. See [verification summary](review/north-america/remaining/verification-summary.json).
