Latest update (November 3, 2026): the [3D and patrol polish pass](NORTH-AMERICA-ART-POLISH.md) supersedes the earlier art/build review below. Its isolated production build passes; use the current-source preview on port 3016.

# World Explorer — North America, first playable enhancement batch

This batch enhances six of the continent’s 23 countries. Canada and the USA
replace their older template routes; Mexico, Guatemala, Costa Rica and Jamaica
gain authored routes and dedicated scenery. The other 17 countries remain at
their existing development-preview status. These six are local prototypes,
awaiting player feedback and physical-device review.

| Country | Adventure | Tier | Distinctive challenge |
|---|---|---:|---|
| Canada | Rockies: Glacier Pass | 3 | Brake on ice, cross a timber gorge, ride a lift and time an exposed gust corridor |
| USA | New York: Harbor Shift | 2 | Open a dock gate, transfer from a ferry to cargo lifts, then cross a patrolled warehouse quay |
| Mexico | Yucatán: Cenote Observatory | 3 | Raise stepping stones with a pressure plate, then ascend limestone terraces |
| Guatemala | Tikal: Above the Forest | 3 | Stone stairs, two collapsing fallen logs and a rising temple-forest route |
| Costa Rica | Monteverde: Canopy Crossing | 2 | Vertical basket, sagging suspension bridge, then a moving canopy transfer |
| Jamaica | Dunn’s River: Cascade Climb | 3 | Read downhill currents, stop on dry banks, then climb wet cascade shelves |

All countries remain freely selectable. Every route has stable checkpoint
refuges and three optional stars. Gaps and landing heights are measured against
the real explorer jump envelope. A person can finish the main path and return
for the harder star detour. No new account requirements or purchases are added.
The Country guide includes a specific trail tip, landscape description,
discovery question and primary source for the actual playable destination.

## How this follows Japan

Japan’s environment implements `CountryEnvironment`: scenery, platform dressing,
lighting, patrol art and markers. The shared scene and simulation own movement,
collision, hearts, collectibles, checkpoints and saved results. This batch uses
the same contract. It does not edit Japan, Asia or South American level files.

The new routes use `authorLevel` and explicit route graphs instead of the older
eight-section template. Their coordinates and mechanics are authored per country.
Shared builders fill IDs, graph node types and defaults; they do not generate
a country’s path from its flag or random seed.

Canada and the USA retain their existing landmark/background environments.
Small wrapper modules replace the new deep platforms’ island shells with
continuous landforms. The four new environments share lifecycle and material
utilities, with separate scenery branches for a limestone cenote and Maya
monuments, Tikal’s forest skyline, cloud-forest bridge supports and terraced
waterfall pools. All scenery is a stylized study. Moving monuments, log timers,
platform lifts and puzzles are fictional game devices.

## Play locally

Open World Explorer and select North America. For the local review server:

- `http://localhost:3012/world-explorer?country=CAN&play=1`
- `http://localhost:3012/world-explorer?country=USA&play=1`
- `http://localhost:3012/world-explorer?country=MEX&play=1`
- `http://localhost:3012/world-explorer?country=GTM&play=1`
- `http://localhost:3012/world-explorer?country=CRI&play=1`
- `http://localhost:3012/world-explorer?country=JAM&play=1`

Use A/D or arrow keys to move, Space/W/up to jump, P/Escape to pause. Touch
controls use the existing responsive UI. Read the Country guide for each trail.

## Verification

`__tests__/world-explorer-north-america.test.ts` covers all six destinations:

- Schema, graph connectivity, checkpoint spacing, headroom and measured tier.
- Mandatory and optional jumps at multiple mechanism phases; complete clean
  simulation runs from four start delays.
- Every coin and all three stars collected across clean input-only main and
  bonus runs at three start delays.
- Expert and assist runs, including checkpoint pauses and backtracking.
- A fall and recovery at every checkpoint, costing exactly one heart.
- Both scenery quality modes, named landmarks, lifecycle and guide consistency.

The Canada/USA template assumptions in the older reference-country tests are
replaced by these route-graph checks. The other four template countries retain
their existing tests. The shared acceptance recorder also receives an explicit
return type for its pass/fail verdict; this fixes a pre-existing production
type-check failure without changing runtime behavior.

Local screenshots and browser findings are in `review/north-america/`.
`tmp/north-america/validation.json` records per-country simulation findings.
Bot times are roughly 20–24 seconds for a direct main-route run; the 55-second
design target allows for human exploration but has not been measured with people.
The screenshots use software rendering. They do not establish hardware frame
rates, physical-phone usability, human enjoyment or authenticated cloud saving.

## Next countries

The remaining countries are Antigua and Barbuda, Bahamas, Barbados, Belize,
Cuba, Dominica, Dominican Republic, El Salvador, Grenada, Haiti, Honduras,
Nicaragua, Panama, Saint Kitts and Nevis, Saint Lucia, Saint Vincent and the
Grenadines, and Trinidad and Tobago. Their current previews are unchanged.
Use feedback on this batch before extending the same production work to them.

## Geographic sources

- [Canadian Rocky Mountain Parks — UNESCO](https://whc.unesco.org/en/list/304/)
- [Statue of Liberty — National Park Service](https://www.nps.gov/npnh/learn/news/fact-sheet-stli.htm)
- [Chichen-Itza — UNESCO](https://whc.unesco.org/en/list/483/)
- [Tikal National Park — UNESCO](https://whc.unesco.org/en/list/64/)
- [Monteverde Cloud Forest Preserve](https://cloudforestmonteverde.com/visit-the-preserve/)
- [Dunn’s River Falls — Jamaica Tourism Board](https://www.visitjamaica.com/experiences/natural-wonders/waterfalls-rivers/dunns-river-falls/)

## Final review status

The six routes pass gameplay validation, collectible acceptance, Expert/assist
runs and recovery at every checkpoint. Surface-ray checks verify the rendered
walking lane. The focused regressions for guides, profiles, progress, Japan and
the remaining template countries pass. The diff whitespace check passes.

All six destinations returned HTTP 200 and produced actual gameplay, mechanic
and overview captures. Four captures have no console errors; Canada and Costa
Rica each recorded one generic resource-404 console message with no failed page
response recorded. These messages remain in the browser evidence for review.
The phone capture is a 390 × 844 browser emulation of Mexico.

The production bundle compiled successfully. The full build then failed in
`components/world-explorer/countries/europe.ts:39`: the union type for the
current Europe scenery does not expose optional property `water` on every
member. That separate environment was not modified by this North America task.
Full production-build completion therefore remains blocked.

Human difficulty feedback, real-phone testing, hardware performance and live
authenticated saving remain unverified. No release approval or publication is
claimed.

