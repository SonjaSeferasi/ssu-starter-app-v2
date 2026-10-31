# JUMPYLAND: WORLD EXPLORER
# ASIA — COMPLETE 47-COUNTRY 3D GAME DEVELOPMENT SPECIFICATION

**Project:** SocialU — Jumpyland: World Explorer
**Continent:** Asia
**Countries:** 47
**Programming:** JavaScript / existing compatible Three.js game engine
**Gameplay:** 2.5D side-scrolling platform adventure rendered in 3D
**Visual standard:** Cinematic, colorful, detailed environments established by the original Japan concept
**Main objective:** Deliver 47 visually distinctive, fully functional, geographically accurate country adventures using one shared game engine.

---

# PART 1 — PRIMARY DEVELOPMENT DIRECTIVE

## 1. Project objective

We are now building the complete Asia continent for Jumpyland.

The existing Japan level and the four new East Asia prototypes—China, Mongolia, North Korea, and South Korea—form the starting implementation.

The four new prototypes reportedly pass focused automated gameplay tests and the production build. However, their visual quality has not yet been approved.

Do not delete or unnecessarily rebuild these implementations.

First review the current code, gameplay configurations, screenshots, environmental assets, physics, and country-development tracker.

The goal is to improve the existing five East Asian environments and implement the remaining 42 countries.

Every country must feel visually and mechanically different.

**Do not build 47 copies of the same platform layout with different colors, flags, and landmarks.**

The player should experience a new landscape, a new route structure, different obstacles, a distinctive environmental mechanic, and new educational discoveries when entering another country.

The final product should feel like a professionally developed adventure game, not a collection of automatically generated obstacle courses.

## 2. Non-negotiable requirements

- Keep one shared JavaScript gameplay engine.
- Preserve working physics and player controls.
- Use actual 3D geometry and collisions.
- Give each country an individually designed level.
- Create distinct environmental art and platform structures.
- Preserve the five difficulty tiers.
- Do not lock countries based on difficulty.
- Give every country a complete start-to-finish route.
- Include optional rewards and discoveries where appropriate.
- Use geographically coherent locations.
- Maintain the existing level validator and similarity analyzer.
- Conduct human visual review and gameplay testing before release.
- Do not mark prototypes or generated configurations as finished levels.

---

# PART 2 — GLOBAL 3D GAME DESIGN STANDARDS

## 3. Camera and perspective

Use the existing 2.5D camera system.

The player should occupy approximately 9–13% of the gameplay viewport height.

The normal camera should place the character around 30–40% of the viewport width, depending on movement direction.

Maintain:

- Smooth horizontal tracking.
- Controlled vertical tracking.
- Directional look-ahead.
- Camera dead zones.
- Adjustable country-specific camera bounds.
- Smooth scenic reveals.
- A separate full-level overview for developers.

Do not display the entire level during normal gameplay.

The player should usually see the current obstacle and the next two or three traversal opportunities.

## 4. Terrain system

Every terrain asset must have real 3D volume.

Avoid flat sheets, unnaturally thin cliffs, and repetitive rectangular columns.

Create a diverse library of:

- Natural hills.
- Mountain slopes.
- Grassy ledges.
- Sandstone cliffs.
- Snowy paths.
- Ice surfaces.
- Tree branches.
- Wooden bridges.
- Stone stairs.
- Ancient masonry.
- City rooftops.
- Urban terraces.
- Coastal rocks.
- Beaches.
- Volcanic rocks.
- Caves.
- River platforms.
- Moving lifts.
- Architectural walkways.

Use detailed visual geometry with simplified collision meshes.

The shape of the landscape must vary by location. A broad steppe or salt flat should not have the same silhouette as a mountainous rainforest.

## 5. Environment rendering

Each level should contain five depth layers.

**Foreground:** Decorative foliage, rocks, flowers, railings, or nearby architecture.

**Gameplay layer:** Player, walkable terrain, enemies, hazards, coins, stars, and checkpoints.

**Near background:** Trees, buildings, rivers, cliffs, or nearby mountains.

**Far background:** Major geographic landmarks, mountain ranges, skylines, distant landscapes, and atmospheric silhouettes.

**Atmosphere:** Sky, fog, clouds, precipitation, sunlight, wind effects, and color gradients.

Use country-specific materials, vegetation, architecture, lighting, and sound.

Avoid a universal brown-rock texture or identical sky in every country.

## 6. Level design and physics

Every country needs a route graph containing a continuous mandatory path from START to FINISH.

Optional routes may include stars, scenic overlooks, and additional discoveries.

Do not require every country to have one lower bridge and one upper staircase of floating rocks.

Some levels should be mostly horizontal. Others should climb, descend, branch, cross water, explore ruins, or navigate mechanical structures.

The team's previously measured jump capabilities were approximately 5.40 horizontal world units and 1.95 vertical units. Reconfirm these measurements against the current physics configuration before using them for new levels.

All required jumps must be simulated and tested.

Maintain readable landing surfaces and safety margins. Avoid combining maximum horizontal distance with maximum vertical rise in a mandatory jump.

## 7. Difficulty tiers

Preserve the five-tier system:

**Tier 1 — Explorer:** Wide platforms, short jumps, simple routes, generous timing, and frequent safe ground.

**Tier 2 — Adventurer:** Moderate jumps, one primary mechanic, simple moving platforms, and manageable hazards.

**Tier 3 — Challenger:** More varied verticality, two compatible mechanics, alternate routes, and meaningful timing challenges.

**Tier 4 — Expert Explorer:** Narrower ledges, challenging traversal combinations, complex route structure, and longer precision sequences.

**Tier 5 — Master Explorer:** Advanced but fair combinations of movement, environmental hazards, vertical traversal, and optional precision challenges.

Difficulty is a gameplay property, not a judgement about a country.

Every Asian subregion should contain a mixture of difficulties where practical.

All released levels must remain freely selectable.

Explorer Assist must be available for difficult levels.

## 8. Enemies and hazards

Do not require a patrolling enemy in every country.

Some levels may use:

- Environmental hazards.
- Moving structures.
- Wind.
- Water currents.
- Ice.
- Timed gates.
- Puzzle switches.
- Falling obstacles.
- Mechanical devices.
- Original fictional enemies.

Use original character designs.

Real wildlife should generally be treated as neutral environmental life rather than dangerous enemies.

Do not use sacred symbols, protected monuments, or recognizable cultural figures as enemies.

---

# PART 3 — EAST ASIA
## Five countries — Review and polish the existing prototypes

# 01. CHINA — Zhangjiajie Sky Pillars

**Country code:** CN
**Selected setting:** Wulingyuan / Zhangjiajie, Hunan
**Difficulty target:** Tier 5
**Level type:** Vertical mountain ascent
**Primary mechanic:** Moving cliff lifts and precise high-altitude traversal

### Visual environment

Create an enormous landscape of tall sandstone pillars rising through misty valleys.

Use sculpted stone columns with vegetation growing on their upper surfaces.

The foreground should contain wet-looking rock ledges, small trees, hanging roots, and natural stone paths.

Place enormous mountain pillars in the background at different depths.

Use soft clouds drifting between the columns.

The environment should feel much taller than Japan's forested cliffs.

### Main route

Begin on a wide mountain observation terrace.

The player crosses a stone path, climbs progressively higher ledges, rides a moving cliff platform, crosses a narrow rocky connection, and reaches a high observation point.

The main route should include several safe resting ledges between difficult jumps.

### Optional challenge

Create an elevated route across narrow pillar tops.

Place a golden star on a remote observation platform.

The bonus route reconnects before the finish.

### Unique mechanics

- Vertically moving stone lift.
- Controlled wind gusts on exposed ledges.
- Narrow mountain-platform traversal.

### Enemy or hazard

Use environmental wind and moving terrain instead of combat enemies.

### Discovery

Teach the player about Wulingyuan's distinctive sandstone pillar landscape.

### Visual requirement

China must be defined by extreme verticality, layered mountain pillars, and mist. It must not look like the same Japanese floating-rock level with different trees.

---

# 02. JAPAN — Cherry Blossom Mountain Path

**Country code:** JP
**Selected setting:** Mount Fuji-inspired spring landscape
**Difficulty target:** Tier 1
**Level type:** Scenic forest-platform adventure
**Primary mechanic:** Beginner jumping and wooden bridges

### Visual environment

Preserve the existing Japan level.

Maintain Mount Fuji, cherry blossom trees, traditional Japanese-inspired architecture, waterfalls, torii gates, stone lanterns, and grassy platforms.

Improve the 3D terrain geometry, water, lighting, and background depth to match the approved cinematic reference.

### Main route

Begin on a broad grassy island.

Cross a simple gap, continue along a wooden bridge, traverse wide natural stone platforms, and finish at a scenic gateway.

### Optional challenge

Create an ascending route of irregular grassy rocks leading to a floating golden star.

The player should be able to return safely to the main path.

### Unique mechanics

- Simple moving wooden platform.
- Educational discovery block.
- Optional elevated star route.

### Enemy

Use the original red hooded forest creature already established, with predictable patrol movement.

### Discovery

Mount Fuji and the Japanese landscape.

### Visual requirement

Japan should remain the visual benchmark for the game but must not become the standard layout copied across Asia.

---

# 03. MONGOLIA — Endless Steppe Expedition

**Country code:** MN
**Selected setting:** Orkhon Valley / Mongolian steppe
**Difficulty target:** Tier 2
**Level type:** Open horizontal expedition
**Primary mechanic:** Wind-assisted traversal and moving ground obstacles

### Visual environment

Create vast grasslands under a huge blue sky.

Include rolling green and golden hills, distant mountains, winding river sections, and scattered rock outcrops.

Traditional ger structures may appear as background cultural references in appropriate locations.

The scenery should be open, with very few tall structures.

Avoid dense forests and large floating islands.

### Main route

The player runs across broad grassy terrain, crosses shallow gullies, moves over natural stone ledges, and traverses a short river crossing.

The route should feel expansive and mostly horizontal.

### Optional challenge

Place a star on a small isolated hilltop reached through a series of short jumps.

### Unique mechanics

- Predictable steppe wind gusts.
- Moving wooden river platform.
- Momentum-based short jumps across gullies.

### Hazards

Use wind and natural terrain gaps rather than combat enemies.

### Discovery

Mongolia's steppe environment and traditional pastoral landscapes.

### Visual requirement

Mongolia must feel wide, open, and horizontal—the opposite of China's narrow vertical climbing.

---

# 04. NORTH KOREA — Mount Paektu Highlands

**Country code:** KP
**Selected setting:** Mount Paektu volcanic landscape
**Difficulty target:** Tier 4
**Level type:** Volcanic mountain ridge traversal
**Primary mechanic:** Wind-exposed ridges and loose-rock platforms

### Visual environment

Create an alpine volcanic landscape with a large crater lake visible in the distance.

Use dark volcanic rock, rugged ridgelines, sparse high-altitude vegetation, snow patches, and cool atmospheric lighting.

Add distant mountains and clouds.

Keep the level focused on physical geography rather than politics.

### Main route

Begin on a broad volcanic ridge.

Travel over rocky ledges, cross a narrow mountain pass, climb several natural steps, and follow a descending path toward the finish viewpoint.

### Optional challenge

An elevated overlook contains a star and a view of the crater lake.

### Unique mechanics

- Periodic mountain wind.
- Loose-rock platforms with visible warning animations.
- Short climbing sections.

### Hazards

Use rock movement and terrain instability.

### Discovery

Mount Paektu's volcanic landscape and crater lake.

### Visual requirement

The environment should be geographically distinctive, with volcanic highland geology rather than generic snowy mountains.

---

# 05. SOUTH KOREA — Seoul Skyline Adventure

**Country code:** KR
**Selected setting:** Seoul / Han River urban landscape
**Difficulty target:** Tier 3
**Level type:** Urban rooftop traversal
**Primary mechanic:** Elevators and rooftop platforming

### Visual environment

Create a stylized Seoul city scene featuring a modern skyline, tree-lined streets, bridges, and N Seoul Tower in the background.

Use modern building materials, illuminated signs, rooftop gardens, and architectural variation.

Traditional hanok-inspired buildings may appear in a separate historic district section, but do not mix distant districts into one inaccurately literal streetscape.

### Main route

Begin on a rooftop terrace.

Cross a short pedestrian structure, ride a moving maintenance lift, traverse two building terraces, and descend toward a riverside finish.

### Optional challenge

An elevated rooftop garden contains a star.

### Unique mechanics

- Vertical elevator.
- Sliding rooftop maintenance platform.
- Timed urban crossing.

### Enemy

Optional small original service robot patrolling one rooftop.

### Discovery

Seoul's urban geography and the Han River.

### Visual requirement

South Korea should feel like a modern, layered urban adventure rather than another mountain level.

---

# PART 4 — SOUTHEAST ASIA
## Eleven unique country levels

# 06. BRUNEI — Ulu Temburong Canopy Expedition

**Code:** BN
**Setting:** Ulu Temburong rainforest
**Difficulty:** Tier 2
**Layout:** Forest canopy walkway
**Signature mechanic:** Suspended bridges and canopy lifts

### Environment

Create dense tropical rainforest with towering trees, deep green foliage, river valleys, and mist-covered hills.

Use raised wooden walkways and canopy-observation structures inspired by rainforest exploration infrastructure.

The background should contain several layers of rainforest canopy.

### Gameplay

The player begins at a forest research platform, crosses a suspension bridge, climbs a short wooden observation tower, and uses a moving platform to reach the next section.

The main route should be safe and moderately elevated.

### Bonus route

A higher canopy walkway contains a star and extra coins.

### Hazards

Use swinging bridge sections and predictable moving platforms.

### Discovery

Borneo rainforest biodiversity.

### Visual differentiation

Brunei should emphasize elevated canopy walkways, not Brazil's vine-swinging traversal.

---

# 07. CAMBODIA — Angkor Forest Ruins

**Code:** KH
**Setting:** Angkor archaeological landscape, Siem Reap
**Difficulty:** Tier 3
**Layout:** Ancient-ruins puzzle
**Signature mechanic:** Stone switches and movable gates

### Environment

Create Khmer architectural forms inspired by Angkor, including towers, sandstone passages, galleries, reservoirs, and large tree roots surrounding ruined structures.

Use weathered stone, moss, tropical trees, and warm filtered light.

Keep actual protected temples as scenic landmarks; place gameplay obstacles in fictional nearby structures.

### Gameplay

Begin in a courtyard, traverse a raised stone passage, activate a floor switch, open a gate, and reach a garden corridor.

### Bonus route

An optional elevated gallery contains a star.

### Hazards

Timed doors and moving stone platforms.

### Discovery

Angkor's architectural and historical significance.

### Visual differentiation

Cambodia should have a dense architectural puzzle structure, not a generic forest obstacle course.

---

# 08. INDONESIA — Mount Bromo Volcanic Expedition

**Code:** ID
**Setting:** Bromo Tengger Semeru volcanic landscape, East Java
**Difficulty:** Tier 5
**Layout:** Volcanic ascent
**Signature mechanic:** Periodic steam vents and unstable ash-rock surfaces

### Environment

Create dark volcanic mountains, ash-covered slopes, a broad volcanic plain, drifting mist, and distant crater formations.

Use charcoal gray, warm mineral brown, and muted green materials.

### Gameplay

Start on a wide volcanic plain.

Climb a sequence of rocky slopes, pass through a steam-vent section, cross a narrow volcanic ridge, and reach a crater observation platform.

### Bonus route

A more difficult high rock passage contains a star.

### Hazards

Telegraphed steam bursts, loose stones, and crumbling platforms.

### Discovery

Volcanic processes and Indonesia's position along active tectonic zones.

### Visual differentiation

Indonesia must emphasize volcanic geology rather than rainforest or generic floating islands.

---

# 09. LAOS — Kuang Si Waterfall Journey

**Code:** LA
**Setting:** Kuang Si Falls near Luang Prabang
**Difficulty:** Tier 2
**Layout:** Terraced waterfall ascent
**Signature mechanic:** Water-powered moving platforms

### Environment

Create beautiful multi-tier waterfalls, turquoise pools, forested limestone formations, and wooden footbridges.

Use lush vegetation, damp moss, and flowing streams.

### Gameplay

The player begins along a forest path, crosses a stream, climbs small limestone terraces, and uses a slowly moving platform near a waterfall.

### Bonus route

A higher forest overlook contains a star.

### Hazards

Short water-flow obstacles and controlled moving platforms.

### Discovery

The natural waterfall landscape and limestone pools.

### Visual differentiation

Laos must emphasize terraces and flowing water rather than large canyon cliffs.

---

# 10. MALAYSIA — Mount Kinabalu Highlands

**Code:** MY
**Setting:** Mount Kinabalu region, Sabah
**Difficulty:** Tier 4
**Layout:** Mountain-forest ascent
**Signature mechanic:** Rock climbing and exposed-ridge traversal

### Environment

Create an ecological transition from lush montane forest to rugged high-elevation granite landscapes.

Use dense lower vegetation, cloud layers, steep mountains, and pale granite formations.

### Gameplay

Begin in a forested mountain section.

Travel upward through rocky paths, use limited climbable surfaces, cross an exposed ridge, and reach a high observation platform.

### Bonus route

An optional ledge climb contains a star.

### Hazards

Wind gusts and occasional moving rock platforms.

### Discovery

Mount Kinabalu's biodiversity and mountain ecology.

### Visual differentiation

Malaysia should emphasize a change in elevation and vegetation within one level.

---

# 11. MYANMAR — Bagan Plains Adventure

**Code:** MM
**Setting:** Bagan archaeological landscape
**Difficulty:** Tier 3
**Layout:** Historical plains and courtyard traversal
**Signature mechanic:** Mechanical lifts and gate switches

### Environment

Create a broad plain with historic temple silhouettes, dry-season trees, warm sunlight, and weathered brick textures.

Keep protected historical structures in scenic areas.

Construct fictional walkable courtyards and terraces inspired by regional architecture.

### Gameplay

The player travels through a market-inspired walkway, crosses low terraces, activates a mechanism, and reaches an elevated observation point.

### Bonus route

A fictional raised gallery provides an optional star.

### Hazards

Moving lifts, short gaps, and timed gates.

### Discovery

Bagan's historical landscape.

### Visual differentiation

Myanmar should feature a wide historic plain and numerous distant structures rather than one enormous central monument.

---

# 12. PHILIPPINES — Banaue Rice Terrace Challenge

**Code:** PH
**Setting:** Ifugao / Banaue rice terrace region
**Difficulty:** Tier 4
**Layout:** Stepped mountain terraces
**Signature mechanic:** Water-channel gates and vertical terrace jumps

### Environment

Create an enormous stepped agricultural mountain landscape.

Use green rice terraces, earthen retaining walls, irrigation channels, misty mountains, and small village structures.

### Gameplay

Begin on a broad terrace.

Climb successive terrace levels, cross a small irrigation canal, activate a water gate, and reach a higher overlook.

### Bonus route

A narrow upper terrace leads to a star.

### Hazards

Moving water platforms, narrow but readable terrace ledges, and controlled irrigation mechanisms.

### Discovery

Rice terrace engineering and agricultural heritage.

### Visual differentiation

The repeated geometry should come from the real stepped-terrace landscape, but platform spacing must still be individually designed and varied.

---

# 13. SINGAPORE — Futuristic Garden City

**Code:** SG
**Setting:** Marina Bay / Gardens by the Bay-inspired environment
**Difficulty:** Tier 2
**Layout:** Modern elevated garden pathways
**Signature mechanic:** Moving elevators and mechanical walkways

### Environment

Create a stylized futuristic urban garden with sculptural tree-like structures, landscaped terraces, glass buildings, water features, and the Marina Bay skyline.

Use original walkable structures inspired by modern garden architecture.

### Gameplay

Begin in a landscaped plaza, ride a vertical lift, traverse an elevated garden walkway, and descend toward a waterfront finish.

### Bonus route

A high glass observation platform contains a star.

### Hazards

Slow moving walkways and timed mechanical platforms.

### Discovery

Singapore's urban green spaces and waterfront development.

### Visual differentiation

Singapore should feel clean, futuristic, and engineered rather than natural or ancient.

---

# 14. THAILAND — Phang Nga Limestone Islands

**Code:** TH
**Setting:** Phang Nga Bay
**Difficulty:** Tier 4
**Layout:** Coastal karst island hopping
**Signature mechanic:** Tidal crossings and moving boats

### Environment

Create tall limestone karsts rising from turquoise-green water, coastal vegetation, small beaches, and distant islands.

Use water reflections and mist between rock formations.

### Gameplay

The player crosses a rocky coastal path, rides a small boat platform, jumps across limestone ledges, and climbs to a viewpoint.

### Bonus route

A higher isolated karst ledge contains a star.

### Hazards

Changing water levels and moving boat platforms.

### Discovery

Thailand's coastal limestone landscapes.

### Visual differentiation

Thailand should emphasize tall rock islands and seawater, rather than the reef-focused environment used for Australia.

---

# 15. TIMOR-LESTE — Atauro Island Coastal Expedition

**Code:** TL
**Setting:** Atauro Island
**Difficulty:** Tier 1
**Layout:** Beginner coastal exploration
**Signature mechanic:** Simple floating docks

### Environment

Create rocky tropical shores, clear blue water, coastal hills, fishing village structures, and coral-rich marine scenery.

Use a bright open atmosphere.

### Gameplay

Begin on a wide coastal trail, cross a simple wooden pier, make two short island-platform jumps, and reach a scenic beach overlook.

### Bonus route

A low optional rock island contains a star.

### Hazards

Slowly drifting platforms, with generous timing.

### Discovery

Atauro Island's marine environment.

### Visual differentiation

Timor-Leste should be gentle, scenic, and accessible rather than another demanding ocean obstacle course.

---

# 16. VIETNAM — Ha Long Bay Floating Islands

**Code:** VN
**Setting:** Ha Long Bay
**Difficulty:** Tier 5
**Layout:** Limestone island traversal
**Signature mechanic:** Moving boat platforms and alternating elevation routes

### Environment

Create mist-covered limestone islands emerging from green-blue water.

Include small boats, coastal vegetation, caves, and distant karst silhouettes.

### Gameplay

Begin on a limestone shoreline, ride a moving boat, climb natural rock ledges, pass through a short cave section, and reach a high viewpoint.

### Bonus route

An optional upper cave exit leads to a difficult star route.

### Hazards

Water-current movement, vertically shifting platforms, and cave timing challenges.

### Discovery

Ha Long Bay's limestone karst geography.

### Visual differentiation

Vietnam should combine water travel, caves, and limestone ascent in one connected route.

---

# PART 5 — SOUTH ASIA
## Nine country levels

# 17. AFGHANISTAN — Band-e Amir Lake Expedition

**Code:** AF
**Setting:** Band-e Amir lakes, Bamyan region
**Difficulty:** Tier 4
**Layout:** Rocky lake-valley traversal
**Signature mechanic:** Narrow mineral terraces and controlled water crossings

### Environment

Create blue lakes separated by natural mineral terraces, rugged mountains, dry rock formations, and clear high-altitude light.

### Gameplay

Begin on a broad lakeside rock path, cross elevated natural terraces, traverse a short stone bridge, and climb to a scenic overlook.

### Bonus route

A higher limestone ledge provides a star.

### Hazards

Moving stone platforms and controlled gaps.

### Discovery

Band-e Amir's natural lakes and mineral formations.

### Visual requirement

Use a peaceful natural landscape. Avoid conflict imagery, weapons, or military themes.

---

# 18. BANGLADESH — Sundarbans Mangrove Journey

**Code:** BD
**Setting:** Sundarbans mangrove delta
**Difficulty:** Tier 1
**Layout:** Low-elevation river and mangrove exploration
**Signature mechanic:** Gentle tidal platforms

### Environment

Create mangrove forests, intertwined roots, muddy riverbanks, shallow waterways, and boats.

### Gameplay

The player crosses a wooden boardwalk, steps over small root obstacles, rides a slow floating platform, and finishes at a forest observation station.

### Bonus route

A raised wooden lookout contains a star.

### Hazards

Slow moving water and short gaps.

### Discovery

Mangrove ecosystems and their coastal importance.

### Visual requirement

Avoid turning real wildlife, including tigers, into enemies.

---

# 19. BHUTAN — Paro Mountain Cliff Adventure

**Code:** BT
**Setting:** Paro Valley / Taktsang monastery landscape
**Difficulty:** Tier 5
**Layout:** Advanced mountain ascent
**Signature mechanic:** High cliff traversal and moving mountain lifts

### Environment

Create forested Himalayan cliffs, dramatic mountain valleys, traditional Bhutanese architectural forms, and a distant monastery integrated into a cliff.

### Gameplay

Begin on a forest path, climb successive rocky ledges, traverse a suspension bridge, and follow an elevated mountain trail.

### Bonus route

A demanding rocky overlook contains a star.

### Hazards

Wind, narrow ledges, and moving platforms.

### Discovery

Bhutan's mountain geography and traditional architecture.

### Visual requirement

Keep religious buildings as protected scenic landmarks rather than destructible or hostile game objects.

---

# 20. INDIA — Taj Mahal Garden Adventure

**Code:** IN
**Setting:** Agra / Taj Mahal garden-inspired environment
**Difficulty:** Tier 2
**Layout:** Ornamental garden and terrace puzzle
**Signature mechanic:** Moving garden platforms

### Environment

Create pale marble-inspired architecture, red sandstone, symmetrical gardens, fountains, flowerbeds, and long water channels.

Place the Taj Mahal clearly in the distance.

### Gameplay

Begin in a garden courtyard, cross carved stone bridges, use a moving platform over a water channel, and reach a garden overlook.

### Bonus route

A raised fictional pavilion contains a star.

### Hazards

Timed water crossings and simple moving terraces.

### Discovery

Taj Mahal architecture and its historical context.

### Visual requirement

Do not make the protected monument itself part of a destructive platforming obstacle.

---

# 21. IRAN — Yazd Windcatcher City

**Code:** IR
**Setting:** Historic Yazd
**Difficulty:** Tier 3
**Layout:** Desert-city rooftop navigation
**Signature mechanic:** Windcatcher-inspired airflow and rooftop mechanisms

### Environment

Create earthen architecture, traditional wind towers, narrow lanes, courtyards, roof terraces, and desert-colored structures.

### Gameplay

The player travels through a historic-inspired street, climbs onto broad fictional rooftop terraces, uses a rising platform, and crosses a shaded courtyard.

### Bonus route

A higher terrace provides a star and city panorama.

### Hazards

Controlled airflow zones and moving rooftop lifts.

### Discovery

Traditional windcatcher architecture and passive cooling.

### Visual requirement

Iran should be identified by its architectural geometry, not by generic sand dunes.

---

# 22. MALDIVES — Coral Lagoon Island Adventure

**Code:** MV
**Setting:** Baa Atoll-inspired lagoon
**Difficulty:** Tier 1
**Layout:** Gentle island hopping
**Signature mechanic:** Slow floating coastal platforms

### Environment

Create white sandy islands, shallow turquoise lagoons, coral formations, palm trees, and clear tropical skies.

### Gameplay

Begin on a wide sandy island, cross a short wooden dock, jump across a few low rock platforms, and reach a coastal finish.

### Bonus route

A small optional island contains a star.

### Hazards

Slow moving rafts and gentle wave timing.

### Discovery

Coral reef ecology and island geography.

### Visual requirement

Create a bright, low-elevation environment without tall mountains or oversized cliffs.

---

# 23. NEPAL — Himalayan Suspension Trail

**Code:** NP
**Setting:** Khumbu Valley / Everest region
**Difficulty:** Tier 5
**Layout:** High-altitude mountain ascent
**Signature mechanic:** Suspension bridges and advanced cliff traversal

### Environment

Create towering Himalayan peaks, snow-covered rock, mountain valleys, alpine vegetation, and trail infrastructure.

### Gameplay

Begin on a rocky trekking path, climb steep ledges, cross a suspended bridge, traverse a mountain ridge, and reach a high lookout.

### Bonus route

A precision-jump trail leads to a star.

### Hazards

Wind, moving bridge segments, and slippery surfaces.

### Discovery

Himalayan mountain formation and geography.

### Visual requirement

Nepal should have dramatic vertical terrain and suspension-trail structures, distinct from Bhutan's forested cliff setting.

---

# 24. PAKISTAN — Hunza Valley Expedition

**Code:** PK
**Setting:** Hunza Valley / Passu Cones region
**Difficulty:** Tier 5
**Layout:** High mountain river crossing
**Signature mechanic:** Long suspension crossings and moving rock platforms

### Environment

Create steep rocky mountains, the distinctive Passu Cones skyline, mountain rivers, terraced settlements, and glacial valleys.

### Gameplay

The player begins on a rocky trail, crosses a narrow suspension structure, climbs mountain ledges, and descends toward a river viewpoint.

### Bonus route

An upper rock crossing contains a difficult star.

### Hazards

Wind, moving suspension platforms, and difficult but fair jumps.

### Discovery

Hunza Valley's dramatic mountain geography.

### Visual requirement

Avoid treating Pakistan as a generic desert; focus on its northern high-mountain environment.

---

# 25. SRI LANKA — Sigiriya Gardens Adventure

**Code:** LK
**Setting:** Sigiriya rock fortress landscape
**Difficulty:** Tier 3
**Layout:** Ancient garden and rock ascent
**Signature mechanic:** Stone stairs and water-garden puzzles

### Environment

Create the towering Sigiriya rock formation, surrounding jungle, ornamental garden areas, water features, and historic architectural references.

### Gameplay

Start in a garden, cross water channels, climb fictional stone terraces near the main rock, and finish at a scenic overlook.

### Bonus route

A higher observation platform contains a star.

### Hazards

Moving stone stairs and simple timed water gates.

### Discovery

Sigiriya's historical and landscape significance.

### Visual requirement

Keep the protected archaeological site visually recognizable and avoid damage-based gameplay.

---

# PART 6 — CENTRAL ASIA
## Five country levels

# 26. KAZAKHSTAN — Charyn Canyon Expedition

**Code:** KZ
**Setting:** Charyn Canyon
**Difficulty:** Tier 2
**Layout:** Canyon descent and crossing
**Signature mechanic:** Natural ledges and timed falling stones

### Environment

Create large red and orange canyon formations, stratified cliffs, dry valleys, and sparse vegetation.

### Gameplay

Begin on a high overlook, descend a sequence of broad ledges, cross a narrow canyon bridge, and finish on the valley floor.

### Bonus route

An elevated rock lookout contains a star.

### Hazards

Slow, well-telegraphed falling stones.

### Discovery

Charyn Canyon's geology.

### Visual requirement

Kazakhstan should emphasize layered canyon formations rather than the open steppes of Mongolia.

---

# 27. KYRGYZSTAN — Ala-Archa Alpine Climb

**Code:** KG
**Setting:** Ala-Archa National Park
**Difficulty:** Tier 4
**Layout:** Alpine mountain ascent
**Signature mechanic:** River bridges and snow-rock transitions

### Environment

Create green alpine valleys, rocky mountain slopes, pine forests, glacial streams, and snowy peaks.

### Gameplay

Begin beside a mountain stream, climb rocky ledges, cross a bridge, and reach a high alpine viewpoint.

### Bonus route

An optional icy ridge contains a star.

### Hazards

Slippery surfaces and moving mountain platforms.

### Discovery

Kyrgyzstan's alpine landscapes.

### Visual requirement

Use greener mountain valleys than the higher, arid Pamir environment planned for Tajikistan.

---

# 28. TAJIKISTAN — Pamir Mountain Challenge

**Code:** TJ
**Setting:** Eastern Pamir highlands
**Difficulty:** Tier 5
**Layout:** Advanced high-altitude ridge traversal
**Signature mechanic:** Narrow ledges, wind, and vertical climbing

### Environment

Create high rugged mountains, broad rocky valleys, sparse vegetation, snow-covered peaks, and dramatic high-altitude skies.

### Gameplay

Begin on a mountain trail, cross a steep rocky pass, climb several narrow ledges, and descend to a final observation point.

### Bonus route

An advanced upper-ridge path contains a star.

### Hazards

Wind and controlled loose-rock platforms.

### Discovery

The Pamir Mountains and their geographic significance.

### Visual requirement

Tajikistan must emphasize remote high-altitude rock landscapes and challenging verticality.

---

# 29. TURKMENISTAN — Yangykala Canyon Journey

**Code:** TM
**Setting:** Yangykala Canyon
**Difficulty:** Tier 3
**Layout:** Layered canyon platforming
**Signature mechanic:** Sliding mineral-rock platforms

### Environment

Create spectacular layered canyon walls with bands of white, red, yellow, and orange mineral colors.

Use sparse desert vegetation and open skies.

### Gameplay

Begin on a broad canyon rim, descend through terraced rocks, use a moving stone platform, and cross a lower canyon path.

### Bonus route

A high isolated rock terrace contains a star.

### Hazards

Moving slabs and timed ledges.

### Discovery

Yangykala's unusual layered geological formations.

### Visual requirement

Turkmenistan should have strong striped rock formations, visibly different from Kazakhstan's red canyon.

---

# 30. UZBEKISTAN — Samarkand Silk Road Adventure

**Code:** UZ
**Setting:** Samarkand / Registan-inspired historic environment
**Difficulty:** Tier 2
**Layout:** Architectural courtyard puzzles
**Signature mechanic:** Decorative gates and moving lifts

### Environment

Create turquoise-tiled domes, mosaic-covered architectural facades, monumental courtyards, stone passages, and historic urban scenery.

### Gameplay

The player begins in a fictional courtyard, activates a gate, crosses raised stone passages, and reaches a scenic terrace.

### Bonus route

A raised gallery contains a star.

### Hazards

Timed gate and a slow moving platform.

### Discovery

Samarkand's historical importance along Silk Road trade networks.

### Visual requirement

Protect real historic structures as scenic landmarks, keeping interactive mechanisms in clearly fictional extensions.

---

# PART 7 — WEST ASIA
## Seventeen country levels

# 31. ARMENIA — Garni Basalt Gorge

**Code:** AM
**Setting:** Garni Gorge / Symphony of Stones landscape
**Difficulty:** Tier 4
**Layout:** Basalt-column traversal
**Signature mechanic:** Narrow column-shaped rock platforms

### Environment

Create dramatic hexagonal basalt formations, rocky cliffs, river valleys, and Armenian highland vegetation.

The Garni Temple may appear as a distant contextual landmark in an appropriate composition.

### Gameplay

Begin on a rocky trail, descend toward the gorge, cross several basalt ledges, and climb to an overlook.

### Bonus route

A difficult column-top route contains a star.

### Hazards

Moving stones and careful precision jumps.

### Discovery

Basalt column formation.

### Visual requirement

The hexagonal geometry should define the level's visual identity.

---

# 32. AZERBAIJAN — Gobustan Mud Volcano Expedition

**Code:** AZ
**Setting:** Gobustan-region mud-volcano landscape
**Difficulty:** Tier 3
**Layout:** Open mineral terrain puzzle
**Signature mechanic:** Periodic bubbling mud hazards

### Environment

Create barren mineral hills, shallow mud pools, small mud-volcano cones, dry earth, and distant Caspian-region landscapes.

### Gameplay

Begin on compacted earth, cross several elevated mineral platforms, wait for a mud eruption to finish, and reach a rocky overlook.

### Bonus route

A higher mineral ledge contains a star.

### Hazards

Clearly telegraphed mud bursts and slippery surfaces.

### Discovery

Mud volcanoes and their geological formation.

### Visual requirement

Do not place protected rock-art artifacts in the hazard zone or present them as destructible objects.

---

# 33. BAHRAIN — Coastal Fort and Harbor

**Code:** BH
**Setting:** Bahrain Fort / coastal heritage landscape
**Difficulty:** Tier 1
**Layout:** Historic coastal walkway
**Signature mechanic:** Simple moving dock platform

### Environment

Create an archaeological coastal setting with stone fort silhouettes, sandy coastal ground, waterfront paths, and small harbor structures.

### Gameplay

Begin on a wide stone promenade, cross a short wooden pier, ride one simple moving platform, and reach an elevated coastal viewpoint.

### Bonus route

A small safe terrace contains a star.

### Hazards

Only gentle moving platforms and short jumps.

### Discovery

Bahrain's historic maritime trade connections.

### Visual requirement

Use fictional walkable structures near the heritage landscape rather than making the actual fort destructible.

---

# 34. CYPRUS — Troodos Mountain Villages

**Code:** CY
**Setting:** Troodos Mountains
**Difficulty:** Tier 2
**Layout:** Mountain village paths
**Signature mechanic:** Terraced stone walkways and small lifts

### Environment

Create pine-covered mountains, traditional stone villages, terraced slopes, winding paths, and clear Mediterranean light.

### Gameplay

Begin in a village square, cross short stone walkways, climb a hillside stair route, and finish at a pine-forest viewpoint.

### Bonus route

An elevated stone balcony contains a star.

### Hazards

Simple moving platform and short gaps.

### Discovery

Troodos mountain geography and traditional village architecture.

### Visual requirement

Cyprus should look mountainous and Mediterranean, not like a generic desert.

---

# 35. GEORGIA — Svaneti Tower Village Expedition

**Code:** GE
**Setting:** Upper Svaneti / Ushguli-inspired landscape
**Difficulty:** Tier 5
**Layout:** Mountain settlement vertical traversal
**Signature mechanic:** Steep paths and moving wooden lifts

### Environment

Create high Caucasus mountains, grassy alpine valleys, stone defensive towers, mountain streams, and traditional village architecture.

### Gameplay

The player begins near a mountain village, climbs successive stone terraces, crosses an elevated path, rides a wooden lift, and finishes at a mountain lookout.

### Bonus route

A high rocky trail contains a star.

### Hazards

Narrow ledges, strong wind, and moving lifts.

### Discovery

Svaneti's traditional tower architecture.

### Visual requirement

Keep historic towers as cultural scenery; use fictional walkable platforms and structures for jumps.

---

# 36. IRAQ — Mesopotamian Marshes Adventure

**Code:** IQ
**Setting:** Southern Iraqi marshlands
**Difficulty:** Tier 2
**Layout:** Wetland waterway traversal
**Signature mechanic:** Reed-boat platforms and river currents

### Environment

Create reed beds, shallow waterways, marsh islands, traditional reed structures, birds, and warm sky reflections.

### Gameplay

Begin on a dry marsh island, cross a wooden walkway, board a slow reed-boat-inspired platform, and continue to a raised observation area.

### Bonus route

An elevated reed walkway contains a star.

### Hazards

Controlled currents and moving floating platforms.

### Discovery

The ecology and cultural significance of the Mesopotamian Marshes.

### Visual requirement

Iraq should be represented by this distinctive wetland landscape, not automatically by war or barren desert imagery.

---

# 37. ISRAEL — Masada Desert Plateau

**Code:** IL
**Setting:** Masada / Judean Desert landscape
**Difficulty:** Tier 3
**Layout:** Desert plateau ascent and descent
**Signature mechanic:** Narrow stone trails and wind-exposed ledges

### Environment

Create arid rocky cliffs, pale desert mountains, distant Dead Sea views, and archaeological structures in appropriate scenic areas.

### Gameplay

Begin on a desert foothill, traverse a narrow but safe cliff path, climb stone ledges, and reach a high plateau viewpoint.

### Bonus route

A difficult desert overlook contains a star.

### Hazards

Wind and loose rock sections.

### Discovery

Masada's geography and archaeological setting.

### Visual requirement

Avoid political conflict imagery or damage to protected archaeological structures.

---

# 38. JORDAN — Petra Canyon Adventure

**Code:** JO
**Setting:** Petra / Siq-inspired sandstone gorge
**Difficulty:** Tier 4
**Layout:** Narrow canyon traversal
**Signature mechanic:** Stone passage puzzles and moving gates

### Environment

Create towering rose-colored sandstone canyon walls, winding passages, carved architectural facades, and warm reflected light.

### Gameplay

Begin in a narrow canyon, follow a winding rock passage, climb small sandstone ledges, activate a stone mechanism, and reach a scenic view of Petra-inspired architecture.

### Bonus route

An upper canyon trail contains a star.

### Hazards

Timed doors and narrow ledges.

### Discovery

Petra's rock-cut architecture and historical significance.

### Visual requirement

The narrow canyon should define the visual composition, not generic isolated floating rocks.

---

# 39. KUWAIT — Coastal City Promenade

**Code:** KW
**Setting:** Kuwait City waterfront
**Difficulty:** Tier 1
**Layout:** Beginner modern coastal traversal
**Signature mechanic:** Small mechanical waterfront lifts

### Environment

Create a modern city coastline with the Kuwait Towers visible as a landmark, landscaped promenades, waterfront buildings, and calm sea views.

### Gameplay

Begin on a broad promenade, cross a short pier, ride a simple moving platform, and reach an elevated observation deck.

### Bonus route

An accessible raised walkway contains a star.

### Hazards

Small gaps and a slow mechanical lift.

### Discovery

Kuwait City's coastal geography and recognizable skyline.

### Visual requirement

Keep the scene bright, open, modern, and beginner-friendly.

---

# 40. LEBANON — Qadisha Valley Mountain Trails

**Code:** LB
**Setting:** Qadisha Valley / northern Lebanese mountains
**Difficulty:** Tier 4
**Layout:** Forested valley ascent
**Signature mechanic:** Cliff paths and rope-supported crossings

### Environment

Create steep green mountain valleys, rocky cliffs, cedar forests in appropriate nearby landscapes, and historic stone structures in the distance.

### Gameplay

Begin on a forest trail, cross a stream, climb rocky ledges, traverse a narrow bridge, and reach a high mountain overlook.

### Bonus route

An upper cliff trail contains a star.

### Hazards

Moving bridges and vertical terrain challenges.

### Discovery

Lebanon's mountain landscapes and cedar heritage.

### Visual requirement

Respect historic religious structures and keep them as non-destructible scenery.

---

# 41. OMAN — Wadi Shab Gorge Expedition

**Code:** OM
**Setting:** Wadi Shab
**Difficulty:** Tier 5
**Layout:** Canyon and water-pool traversal
**Signature mechanic:** Water-level transitions and rock climbing

### Environment

Create pale limestone cliffs, turquoise pools, narrow canyon passages, desert mountains, and scattered palms where appropriate.

### Gameplay

Begin on a dry canyon path, climb natural stone ledges, cross water using moving platforms, enter a narrower gorge, and reach a final overlook.

### Bonus route

A challenging high canyon ledge contains a star.

### Hazards

Moving water platforms, narrow jumps, and controlled water currents.

### Discovery

Wadi formation and Oman's natural landscapes.

### Visual requirement

Oman should feel like a dramatic water-cut desert canyon, not a featureless sand desert.

---

# 42. QATAR — Doha Skyline Adventure

**Code:** QA
**Setting:** Doha Corniche and West Bay skyline
**Difficulty:** Tier 2
**Layout:** Modern urban waterfront
**Signature mechanic:** Elevated mechanical walkways

### Environment

Create modern towers, landscaped waterfront paths, fountains, coastal water, and distinctive urban architecture.

### Gameplay

Begin on a broad walkway, ascend an elevated platform, ride a moving lift, cross a rooftop terrace, and finish at a skyline viewpoint.

### Bonus route

A higher observation deck contains a star.

### Hazards

Predictable moving platforms and short gaps.

### Discovery

Doha's coastal urban development and geography.

### Visual requirement

Make Qatar visually different from Singapore and the UAE through its selected skyline, materials, and route structure.

---

# 43. SAUDI ARABIA — AlUla Sandstone Expedition

**Code:** SA
**Setting:** AlUla sandstone valley / Hegra region
**Difficulty:** Tier 5
**Layout:** Canyon exploration and complex stone traversal
**Signature mechanic:** Sandstone ledges and light-based environmental puzzles

### Environment

Create enormous natural sandstone formations, narrow valleys, desert vegetation, and ancient rock-cut architectural references.

Use dramatic warm light and textured rock.

### Gameplay

Begin on a wide valley floor, climb sandstone steps, traverse a narrow rock passage, activate a light-sensitive fictional mechanism, and finish at an elevated desert panorama.

### Bonus route

A difficult upper sandstone crossing contains a star.

### Hazards

Timed platforms and controlled sand movement.

### Discovery

AlUla's desert landscape and archaeological heritage.

### Visual requirement

Do not use protected tomb facades as destructible or climbable hazards.

---

# 44. SYRIA — Palmyra-Inspired Oasis Landscape

**Code:** SY
**Setting:** Historic Palmyra region, represented through a fictional non-destructive adventure environment
**Difficulty:** Tier 3
**Layout:** Ancient oasis and stone colonnade traversal
**Signature mechanic:** Stone mechanisms and wind

### Environment

Create desert plains, palm groves around an oasis, historic-inspired colonnade silhouettes, weathered stone structures, and distant mountains.

Use warm light and atmospheric haze.

### Gameplay

Begin on a sandy path, cross stone terraces, use a fictional ancient mechanism to raise a platform, and continue to a high observation area.

### Bonus route

An upper stone passage contains a star.

### Hazards

Timed stone platforms and predictable desert wind.

### Discovery

The historic importance of Palmyra as an ancient trading center.

### Visual requirement

Use culturally respectful historical representation without depicting contemporary violence or damage to actual heritage sites as gameplay.

---

# 45. TÜRKIYE — Cappadocia Valley Adventure

**Code:** TR
**Setting:** Cappadocia
**Difficulty:** Tier 4
**Layout:** Fairy-chimney valley and cave traversal
**Signature mechanic:** Vertical cave lifts and rock passage puzzles

### Environment

Create distinctive fairy-chimney rock formations, pale volcanic tuff cliffs, valleys, cave-like structures, and distant hot-air balloons as atmospheric scenery.

### Gameplay

Begin on a valley floor, climb several natural stone ledges, enter a short cave passage, use a moving lift, and emerge onto a high overlook.

### Bonus route

An upper rock formation contains a star.

### Hazards

Narrow cave exits, timed stone lifts, and controlled vertical jumps.

### Discovery

Cappadocia's volcanic landscape and erosion features.

### Visual requirement

Türkiye must have its recognizable fairy-chimney silhouettes rather than generic desert cliffs.

---

# 46. UNITED ARAB EMIRATES — Dubai Skyline Adventure

**Code:** AE
**Setting:** Dubai modern waterfront district
**Difficulty:** Tier 3
**Layout:** Futuristic city platforming
**Signature mechanic:** Vertical elevators and moving urban bridges

### Environment

Create modern glass towers, elevated gardens, waterfront promenades, and the Burj Khalifa as a distant recognizable skyline landmark.

Use reflective building materials, decorative lighting, and detailed urban architecture.

### Gameplay

Begin on a broad waterfront terrace, ride a maintenance lift, cross two elevated pedestrian structures, and reach a high garden viewpoint.

### Bonus route

An optional rooftop-like platform contains a star.

### Hazards

Moving platforms and timing-based mechanical crossings.

### Discovery

Dubai's modern urban architecture.

### Visual requirement

Avoid making the player unrealistically jump between the actual tops of famous skyscrapers. Use fictional lower-level urban structures.

---

# 47. YEMEN — Socotra Island Highlands

**Code:** YE
**Setting:** Socotra Island
**Difficulty:** Tier 5
**Layout:** Island highland climbing and coastal descent
**Signature mechanic:** Irregular rock slopes and changing wind

### Environment

Create Socotra's distinctive dragon's blood trees, dry rocky highlands, unusual plant forms, limestone plateaus, and distant turquoise coastlines.

Use warm sunlight and strong landscape silhouettes.

### Gameplay

Begin in an open highland environment, cross uneven rock platforms, climb a narrow ridge, and descend toward a coastal viewpoint.

### Bonus route

A more demanding upper plateau contains a star.

### Hazards

Wind-exposed ledges and unstable rocky steps.

### Discovery

Socotra's unique plant biodiversity and island ecosystems.

### Visual requirement

Dragon's blood trees should be carefully modeled as distinctive environmental features. Do not require players to damage protected vegetation.

---

# PART 8 — JAVASCRIPT IMPLEMENTATION REQUIREMENTS

## 9. Shared game architecture

Continue using the existing JavaScript/TypeScript application structure.

Do not duplicate the engine.

Recommended conceptual organization:

```text
world-explorer/
  engine/
    PlayerController
    PhysicsWorld
    CameraController
    InputManager
    GameStateManager

  systems/
    LevelLoader
    LevelValidator
    DifficultyAnalyzer
    LevelSimilarityAnalyzer
    CollectibleManager
    CheckpointManager
    ProgressManager
    DiscoveryManager

  entities/
    Platform
    MovingPlatform
    ClimbableSurface
    Bridge
    Enemy
    Hazard
    Coin
    Star
    Finish

  environments/
    TerrainRenderer
    LandmarkRenderer
    VegetationRenderer
    WaterRenderer
    LightingManager
    AtmosphereRenderer

  levels/
    asia/
      east/
      southeast/
      south/
      central/
      west/

  data/
    countries
    levelManifest
    education
    assetManifest

  tests/
    configuration
    traversal
    physics
    difficulty
    repetition
    progress
```

Adapt this organization to the actual existing repository rather than creating redundant modules.

## 10. Country-level configuration

Every country should have a data-driven configuration.

Example:

```js
export const chinaLevel = {
  id: "CN-01",
  countryCode: "CN",
  countryName: "China",
  continent: "Asia",
  region: "East Asia",

  location: "Wulingyuan",
  title: "Zhangjiajie Sky Pillars",
  difficultyTier: 5,

  environment: {
    biome: "misty-mountain",
    terrainPack: "sandstone-pillars",
    vegetationPack: "mountain-forest",
    landmarkPack: "wulingyuan",
    lighting: "misty-morning",
    atmosphere: "mountain-clouds"
  },

  gameplay: {
    primaryLayout: "vertical-ascent",
    mainMechanic: "moving-cliff-lifts",
    secondaryMechanics: [
      "wind",
      "precision-jumps"
    ],
    enemyProfile: null,
    checkpointTarget: 3,
    starTarget: 3
  },

  review: {
    designApproved: false,
    visualApproved: false,
    humanPlaytested: false,
    mobileTested: false
  },

  status: "proposed"
};
```

This is a design manifest, not a complete level.

The actual level must additionally define real geometry, collision objects, route graphs, collectible positions, triggers, and asset references.

Use schema validation before loading any level.

Country status must reflect actual development progress.

## 11. Level route graph

Represent each country level as a traversal graph.

Each node should represent a meaningful playable area or interaction.

Examples:

- START
- PLATFORM
- CHECKPOINT
- PUZZLE
- MOVING_PLATFORM
- HAZARD
- DISCOVERY
- OPTIONAL_REWARD
- FINISH

Edges must specify the action required to move between nodes.

For example:

- WALK
- JUMP
- CLIMB
- RIDE
- SWING
- ACTIVATE
- DROP

The engine must verify that a mandatory path exists between START and FINISH.

Validate physical reachability rather than relying only on graph connectivity.

## 12. Gameplay feature registry

Some gameplay mechanics may still be planned but not implemented.

Create or maintain an authoritative feature registry.

Before releasing a level, verify that every required mechanic has a functioning module.

If the country requires a new mechanic, implement and test the mechanic before marking the country playable.

Do not fake interactions with purely visual animations.

## 13. Difficulty calibration

Use measured jump distance, jump height, run acceleration, platform speed, and hazard timing to validate each course.

Each difficulty tier should correspond to real gameplay complexity.

Include:

- Main-route jump difficulty.
- Optional-route difficulty.
- Landing-area width.
- Number of mechanics.
- Hazard timing.
- Checkpoint spacing.
- Expected human completion time.

Do not artificially increase difficulty by making the character frustrating to control.

Difficulty should come from interesting level design.

## 14. Visual similarity detection

Use the existing similarity analyzer.

Compare each Asian level against:

- The other Asian levels.
- The South American levels.
- Japan, Egypt, Norway, and other existing reference environments.

Compare route structure, verticality, obstacle sequences, and gameplay mechanics.

Also perform visual comparison.

Two levels may share terrain assets or mechanics without being copies, but they should not reuse entire routes unchanged.

Do not modify similarity thresholds simply to hide repeated layouts.

## 15. Asset pipeline

Use optimized 3D assets.

Preferred file format: GLB/glTF.

Where suitable, use:

- Compressed geometry.
- Optimized textures.
- Texture atlases.
- Instanced vegetation.
- Reusable materials.
- Level-of-detail models.
- Efficient particle systems.
- Appropriate shadow budgets.

Maintain an asset manifest with source and license metadata.

Use accurate geographic visual references for country-specific landmarks, vegetation, and architectural details.

Do not treat AI-generated concept images as exact geographically verified references or ready-made 3D models.

---

# PART 9 — USER INTERFACE

## 16. Country-selection screen

The player should be able to select:

Asia → Subregion → Country → Level.

Display all 47 countries in the Asia catalog.

Each card should include:

- Correct country flag.
- Country name.
- Level name.
- Difficulty tier.
- Country-specific thumbnail.
- Progress.
- Playability status.

Released levels must be available without difficulty-based locking.

Unimplemented levels should display their true production status rather than presenting a nonfunctional Play button.

## 17. Gameplay HUD

Use the same Jumpyland interface across all countries.

**Top left:** Country flag, country name, level title.

**Top center:** Progress bar.

**Top right:** Coins, stars, pause.

**Bottom controls:** Mobile movement and jump buttons when using touch input.

Keep developer performance statistics out of the normal gameplay UI.

## 18. Completion screen

Display:

- Country visited.
- Level completed.
- Difficulty tier.
- Coins collected.
- Stars earned.
- Completion time.
- Educational discovery.
- Passport stamp.
- Replay.
- Return to continent map.

Save progress through the existing persistence system.

---

# PART 10 — VISUAL QUALITY AND TESTING

## 19. Visual review standards

Every country must pass a dedicated 3D art review.

Check:

- Is the geographic setting recognizable?
- Are terrain meshes genuinely three-dimensional?
- Are platforms integrated into the environment?
- Do rocks look natural rather than rectangular?
- Is the player clearly visible?
- Are landmarks correctly positioned and scaled?
- Is vegetation appropriate?
- Does architecture reflect the selected location?
- Are water effects convincing?
- Is the scene composition attractive?
- Does the background contain multiple layers?
- Does the country look different from other levels?
- Are all gameplay paths readable?

The visual standard should match the approved cinematic Jumpyland reference direction.

A level with only basic colored blocks and a landmark model is a gameplay prototype, not an art-complete environment.

## 20. Required screenshots

For all 47 countries, capture four in-game screenshots:

1. Starting area.
2. Main gameplay mechanic.
3. Country landmark or scenic reveal.
4. Full-level developer overview.

This produces **188 review screenshots**.

All captures must come from the actual game.

Use a consistent browser viewport for desktop reference images.

Capture additional mobile screenshots for responsive testing.

Do not substitute generated concept art for proof of implementation.

## 21. Human gameplay review

Every level must be manually tested.

Review:

- Route clarity.
- Jump fairness.
- Moving-platform reliability.
- Enemy interactions.
- Checkpoints.
- Optional rewards.
- Camera transitions.
- Controls.
- Completion behavior.
- Country recognition.
- Visual quality.
- Enjoyment.

Measure actual human completion times.

Automated bot runs are valuable for functional testing but cannot establish that a level is enjoyable or visually polished.

## 22. Performance

Target approximately 60 FPS on representative modern desktops and at least 30 FPS on supported mid-range mobile hardware.

Record:

- Average FPS.
- Frame-time variation.
- Draw calls.
- Triangle count.
- Texture usage.
- Loading time.
- Memory behavior.

Do not load all 47 country environments simultaneously.

Only load the selected country's necessary assets.

Preserve reusable shared asset caches where appropriate.

---

# PART 11 — PRODUCTION PLAN

## 23. Phase A — Finish East Asia

**Countries:** China, Japan, Mongolia, North Korea, South Korea.

These levels already exist as prototypes or earlier implementations.

Tasks:

- Capture screenshots.
- Review terrain geometry.
- Improve environmental materials.
- Review camera framing.
- Verify the actual landmarks.
- Test unique gameplay mechanics.
- Recheck difficulty tiers.
- Test on desktop and mobile.
- Approve visual quality.

Do not mark them released based only on the existing automated tests.

## 24. Phase B — Southeast Asia

**Countries:** Brunei, Cambodia, Indonesia, Laos, Malaysia, Myanmar, Philippines, Singapore, Thailand, Timor-Leste, Vietnam.

Prioritize representative environments first:

- Indonesia — volcanic terrain.
- Cambodia — historic architectural puzzle.
- Singapore — futuristic city.
- Vietnam — island and cave traversal.

Validate those four before producing the remaining seven.

## 25. Phase C — South Asia

**Countries:** Afghanistan, Bangladesh, Bhutan, India, Iran, Maldives, Nepal, Pakistan, Sri Lanka.

Begin with visually different environments:

- Maldives — beginner tropical islands.
- Bangladesh — mangrove waterways.
- India — historic gardens.
- Nepal — advanced mountain climbing.

Then complete the other five.

## 26. Phase D — Central Asia

**Countries:** Kazakhstan, Kyrgyzstan, Tajikistan, Turkmenistan, Uzbekistan.

Each must demonstrate different geographic and structural characteristics:

- Kazakhstan — canyon.
- Kyrgyzstan — alpine valley.
- Tajikistan — high-altitude precision.
- Turkmenistan — layered mineral canyon.
- Uzbekistan — historic city puzzle.

## 27. Phase E — West Asia

**Countries:** Armenia, Azerbaijan, Bahrain, Cyprus, Georgia, Iraq, Israel, Jordan, Kuwait, Lebanon, Oman, Qatar, Saudi Arabia, Syria, Türkiye, United Arab Emirates, Yemen.

Begin with distinct structural environments:

- Armenia — basalt formations.
- Iraq — wetlands.
- Jordan — narrow sandstone canyon.
- Türkiye — cave and fairy-chimney valley.
- UAE — modern urban platforms.
- Yemen — unusual island highlands.

Complete the remaining countries in controlled production batches.

---

# PART 12 — SOURCE CONTROL AND PARALLEL TEAM DEVELOPMENT

The Asia and South America teams may work in the same repository.

Before making broad changes:

1. Inspect the working tree.
2. Identify existing staged modifications.
3. Coordinate ownership of shared engine modules.
4. Preserve work from other teams.
5. Use separate feature branches or isolated Git worktrees.
6. Commit country-specific changes separately from shared-engine changes where practical.
7. Review and integrate shared changes deliberately.
8. Run regression tests across all existing continents.
9. Avoid resetting or overwriting another team's files.
10. Record test results and commit identifiers.

Shared gameplay systems must remain compatible with South America, Japan, Egypt, and Norway.

Do not modify global physics or camera behavior only to fix one Asian level without testing other existing levels.

---

# PART 13 — DEVELOPMENT TRACKER

Maintain the existing Asia dashboard for all 47 countries.

Every record must include:

- Country name.
- ISO country code.
- Subregion.
- Selected location.
- Difficulty tier.
- Main layout.
- Signature mechanic.
- Visual environment.
- Design approval status.
- Gameplay implementation status.
- Art completion status.
- Automated testing status.
- Human playtest status.
- Mobile testing status.
- Visual review status.
- Release status.

Use clear production states:

PROPOSED → DESIGN APPROVED → BLOCKOUT → GAMEPLAY IMPLEMENTED → ART INTEGRATION → TESTING → RELEASED

Do not count proposals as playable levels.

Do not count automated test completion as human approval.

Provide a report after each regional batch documenting:

- What was implemented.
- What was tested.
- What was visually reviewed.
- What remains incomplete.
- Which new mechanics were added.
- Whether any existing levels regressed.
- Current source-control status.

---

# PART 14 — FINAL ACCEPTANCE CRITERIA

Asia is considered complete only when:

1. All 47 countries have individual level designs.
2. Every country has a real playable 3D environment.
3. No country is merely a recolored copy of another.
4. Every level has a complete start-to-finish route.
5. All required gameplay mechanics function.
6. Every country has distinct landscape and architectural characteristics.
7. Country-specific landmarks and geographic facts are reviewed.
8. Difficulty tiers match actual gameplay.
9. Mandatory jumps and puzzles are reachable.
10. Collectibles, checkpoints, and completion systems function.
11. All automated validation passes.
12. Human visual reviews are complete.
13. Human gameplay testing is complete.
14. Supported desktop and mobile devices have been tested.
15. Country-selection cards display correct information.
16. Released countries are freely selectable.
17. Passport and player progression work correctly.
18. Source code and assets are documented and integrated safely.
19. Performance meets the agreed supported-device targets.
20. All 47 levels have reached RELEASED status.

---

# FINAL INSTRUCTION TO THE ASIA DEVELOPMENT TEAM

Our objective is to create **47 distinctive, beautiful, fully playable Asian country adventures**, all powered by one shared JavaScript game engine.

We do not want 47 copies of the Japan prototype.

China should feel like climbing enormous mountain pillars.

Mongolia should feel like traveling across open grasslands.

Indonesia should feel volcanic and dramatic.

Cambodia should feel like exploring ancient architectural environments.

Singapore should feel modern and futuristic.

Nepal should feel like an advanced mountain expedition.

Uzbekistan should feel like an architectural Silk Road adventure.

Oman should feel like navigating a water-cut canyon.

Türkiye should feel like exploring unusual volcanic valleys and caves.

Socotra in Yemen should feel like traveling across a unique island ecosystem.

Each country must have its own scenery, terrain silhouette, traversal route, gameplay challenges, and educational discoveries.

Preserve shared functionality, but make each adventure distinct.

**First complete the visual and gameplay review of East Asia. Then continue through Southeast Asia, South Asia, Central Asia, and West Asia until all 47 countries are fully implemented, tested, reviewed, and released.**

Do not consider the project complete after creating country cards, generated level configurations, or automated gameplay prototypes.

**The final goal is a cinematic, educational 3D world-exploration game in which every country feels like a new adventure.**
