# Country guide follows the authored level

**Scope:** the Country guide dialog for the twelve South American levels. All twelve stay at **TESTING**.

## The problem

The guide's Place and Landscape lines, and its reference photograph, came from the general country profile instead of the level that is played:

| Country | Level | Guide showed |
| --- | --- | --- |
| Chile | El Tatio: Geysers at Dawn | Rapa Nui: place, landscape and photo |
| Colombia | Cocora Valley: Cloud Forest Climb | Cartagena: place and landscape |
| Ecuador | Galápagos: Lava Coast | Quito's historic centre: place, landscape and photo |

The source was `components/world-explorer/country-run.tsx`, which read `countryProfile(code).landmarkName` and `.features`. The photo search in `lib/world-explorer/media.ts` used the same profile fields.

## The fix

- **`lib/world-explorer/guide-destination.ts` (new).** `guideDestination(code)` returns the guide's place, landscape lines, photo search and photo subject. For a built South American level these come from the level:
  - the place is the card's featured landmark and location, for example "Galápagos lava coast · Galápagos Islands" (a location that already begins with the landmark name is not repeated, as with Chile's "El Tatio geyser field, Antofagasta Region")
  - landscape lines describe the level's own scenery
  - the photo search and photo subject name the level's place

  Every other country keeps its general profile.
- **`country-run.tsx`.** The guide's Place and Landscape lines read the destination. The Capital / seat line still comes from the catalogue and is unchanged: Santiago, Bogotá and Quito.
- **`media.ts`.** The Commons photo search uses the destination. Title matching folds accents ("Galápagos" matches "Galapagos"). A photograph is accepted only when its title names the level's place, and spherical panoramas are rejected.

## Regression coverage

`__tests__/world-explorer-guide-destination.test.ts`, 17 tests:

- For each built level, the guide names the card's landmark and location and has at least two landscape lines.
  - Where the old profile names a different place, the guide does not contain it and a photo titled with that place is rejected.
  - Uruguay's Colonia and Paraguay's Trinidad are the same place in both, so they are not treated as a mismatch.
- The three reported mismatches are checked explicitly, and the capitals stay Santiago, Bogotá and Quito.
- Photo matching folds accents, rejects Quito and Rapa Nui photos for Ecuador and Chile, and rejects spherical panoramas.
- The photo lookup searches the destination and picks the El Tatio photo over a Rapa Nui one.
- Non-South-American countries (Japan) keep their profile.
- The run screen's source renders Place and Landscape from the destination.

## Evidence in this folder

| File | Contents |
| --- | --- |
| `guide-check.json` | For all twelve levels on the production build: the Capital / seat, Place and Landscape text read from the open dialog, and the photo's file name and source |
| `guide-{code}.jpg` | Screenshot of each open Country guide, with its photo loaded |
| `live-photo-check.json` | Earlier live Commons lookup through `landmarkImage` for all twelve; each returned a photo of the level's place |

`guide-check.json` and the screenshots were made with `scripts/world-explorer/guide-check.mjs` on the production build (`SOCIALU_BUILD_TARGET=review next build`, then `next start` on port 3100). In headless Edge, the script opens each level, presses Country guide and waits for the photo. All twelve guides show the level's own place, and Chile, Colombia and Ecuador now show:

- **Chile.** Place: El Tatio geyser field, Antofagasta Region. Photo: "Géiseres del Tatio, Atacama, Chile, 2016-02-01, DD 51-53 HDR.JPG".
- **Colombia.** Place: Quindío wax palms · Cocora Valley, Quindío. Photo: "Palmas de cera, Valle del cócora.jpg".
- **Ecuador.** Place: Galápagos lava coast · Galápagos Islands. Photo: "Weathered Pahoehoe Lava Flow Galapagos.jpg".

Photos come live from Wikimedia Commons, so the exact file returned can change over time; the title check keeps it on the level's place.
