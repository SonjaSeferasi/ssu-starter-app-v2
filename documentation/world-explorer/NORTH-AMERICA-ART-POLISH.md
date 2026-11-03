# North America — reference-informed 3D and patrol pass

This pass improves the same six authored adventures: Canada, USA, Mexico,
Guatemala, Costa Rica and Jamaica. It retains their route layouts and adds a
country-specific animated patrol to each. Japan is the architectural reference:
accurate walking caps, sculpted decorative rock shoulders, textured ground,
planted rims, foreground/background depth and separately modeled landmarks.

| Country | Art changes | Patrol |
|---|---|---|
| Canada | Organic rock shoulders, snow/grass surface detail, flowers, hanging edge growth and whorled pine branches | Marmot |
| USA | Visible layered skyline, a tapering One World Trade Center study, glass towers, brick waterfront facades, windows, cornices, fire escapes and rooftop water tanks | Cargo robot |
| Mexico | Nine-tier El Castillo study, four stair ribbons and balustrades, actual shrine openings, pale limestone masonry, modeled observatory, irregular cenote rim and open courtyard framing | Iguana |
| Guatemala | Steeper nine-tier Tikal study with roofcomb and stairway, stelae, forest clearing, branching trunks, varied crowns, buttress roots, vines and ferns | Coati |
| Costa Rica | Green bridgework and side mesh, sagging deck matched to collision, layered canopy, understory and softer cloud-forest mist | Leafcutter ant |
| Jamaica | Sculpted pale terrace profiles, separate water ribbons, pools, foam, tropical broadleaf layers and coconut palms | Land crab |

The creatures are original stylized game characters inspired by the settings.
They animate through the existing patrol/turn/alert/stun/disabled states. Patrol
speeds and pauses vary. Every checkpoint keeps a clear landing and recovery
zone before an enemy. A Canadian approach coin moves earlier on the same bank
so it remains collectible when the player jumps over the marmot.

## References inspected

The photographs were inspected for silhouettes, material colors, vegetation,
layering and landmark proportions. They are visual research, not shipped game
textures or background billboards. Shipped art is procedural 3D geometry and
the project's existing local CC0 surface maps. The routes remain fictional
compressed courses; the scenery does not claim to be an exact reconstruction.

- [El Castillo photograph — Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Chichen_Itza_El_Castillo.JPG): pale weathered stone, terraces, broad stairways and open plaza.
- [Tikal Temple I photograph — Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Tikal_temple_1_2009u.JPG): steep central stair, darker masonry, roofcomb and forest clearing.
- [Monteverde bridge photograph — Costa Rica Tourism Board](https://fr-ca.visitcostarica.com/blog/visit-monteverde-cloud-forest-biological-reserve): green bridge, layered canopy and mist.
- [Dunn's River Falls photograph — Celebrity Cruises](https://www.celebritycruises.com/blog/content/uploads/2021/07/western-caribbean-islands-dunns-river-falls-jamaica.jpg): rounded pale shelves, separate water ribbons and tropical foliage.
- [Lower Manhattan from the ferry — Zoshua Colah on Unsplash](https://unsplash.com/photos/a-view-of-a-city-from-a-boat-on-the-water-Cr0JB6dsWKY): varied glass and masonry buildings, dense skyline and tall spire.
- [Lake Louise reference — Fairmont](https://www.chateau-lake-louise.com/offers/luxury-summer-getaways/): glacial water, evergreen layers, exposed mountain rock and snow.

## Preview and review

The former port-3012 preview served older Canada/USA compiled levels during
review. The new preview verifies the current level titles and uses an isolated
compiled-output directory, so it cannot silently reuse those old chunks.

```powershell
node scripts/world-explorer/preview-north-america.cjs
# http://localhost:3016/world-explorer?country=USA&play=1
```

Replace `USA` with `CAN`, `MEX`, `GTM`, `CRI` or `JAM`. The preview/build targets
are `SOCIALU_BUILD_TARGET=north-america` and `north-america-build`; both write
under the already ignored `tmp/tools/` directory. Default app builds retain
their existing output location.

[Actual scene and enemy gallery](review/north-america/art-polish/index.html).
Captures use the real renderer, paused camera scans and closer enemy detail
cameras. They are not concept images. The comparison images are previous-pass
captures; their camera framing is similar rather than pixel-identical.

## Validation and limits

- 42 North America checks cover real simulation runs, all coins/stars,
  difficulty tiers, optional paths, checkpoints, Expert/assist, model identity,
  animation states and visible walking surfaces in both quality modes.
- 54 existing scenery and Japan regression checks pass.
- TypeScript checking and the final isolated production build pass, including
  all 43 generated pages. The exact build ID is in the build receipt.
- All six current-source captures have zero JavaScript runtime errors. The
  first pages of the Canada and refreshed Mexico captures also log one generic
  resource-404 console message each; these are retained in `browser-evidence.json`, with no corresponding failed page
  response recorded.

Visual review is an automated software-rendered inspection. Human difficulty
feedback, physical-phone play, sustained hardware performance and authenticated
cloud saving have not been established by these checks. This pass is local and
has not been published or marked as a release.
