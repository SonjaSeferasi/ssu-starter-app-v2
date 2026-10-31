# World Explorer level design manifest (production tracker)

Generated from `lib/world-explorer/design-manifest.ts` (`designManifest()` and `productionSummary()`); regenerate rather than edit by hand. Tiers and statuses are asserted by `__tests__/world-explorer-level-design.test.ts`.

Every entry is **unreviewed** (`reviewed: false`). Three levels are validated route-graph levels (`playable`); eight still run on the first shared template (`template`) and are flagged by the similarity checker for redesign; the remaining 182 are design **proposals** generated from each country’s landscape profile and await human review before production.

**Totals:** 193 countries · status planned 182, template 8, playable 3 · tiers T1 39, T2 39, T3 39, T4 38, T5 38 · reviewed 0 · blocked by unimplemented mechanics 0.

## Archetypes in use

| Archetype | Levels | Summary |
| --- | ---: | --- |
| desert-ruins-mechanism | 10 | Plateau and stairs into ruins with a switch-and-gate puzzle |
| canopy-river-traversal | 7 | Launch into a canopy, swing across, ford a river |
| vertical-cliff-precision | 7 | Climb a cliff face and cross hazards high above water |
| mountain-switchback-ascent | 8 | Long slopes and stair paths zig-zagging up to a pass |
| coastal-boardwalk-tides | 13 | Boardwalks, piers and rocks with tide-timed crossings |
| island-hopping | 11 | Short islands, rafts and reef rocks over open water |
| old-town-rooftop-run | 26 | Streets, stair alleys and rooftops with awnings |
| castle-rampart-climb | 17 | Moat, drawbridge gate, ramparts and towers |
| palace-garden-terraces | 13 | Formal terraces, fountains and hedge courts |
| tower-ascent | 3 | A vertical climb around a tall structure with lifts |
| wetland-stilt-walk | 10 | Reed beds, stilt walks and floating logs |
| savanna-plains-run | 1 | Long continuous ground, kopjes and patrols to time |
| glacier-crevasse-crossing | 7 | Ice shelves, crevasses and snow bridges |
| harbour-crane-docks | 5 | Quays, crane lifts and moored boats |
| courtyard-arcades | 34 | Arcaded courtyards, domes and gated passages |
| canyon-mesa-wind | 13 | Mesas and arches across a windy canyon |
| forest-treetop-bridges | 5 | Forest floor, trunks and rope bridges between trees |
| rolling-hills-meadow | 3 | Continuous rolling hills with dips and ridges |

## Mechanics library

| Mechanic | Status | Level data |
| --- | --- | --- |
| Moving platform (eased, paused, bobbing) | implemented | `platform.motion=horizontal|vertical, pause, bob` |
| Lift / elevator | implemented | `platform.motion='vertical'` |
| Swinging platform on a rope or vine | implemented | `platform.motion='pendulum', length` |
| Collapsing ledge that returns | implemented | `platform.collapse={delay,respawn}` |
| Slippery ice | implemented | `platform.surface='ice', physics.iceGrip` |
| Warned, periodic wind gusts | implemented | `zones[type=wind]` |
| Water or lava that respawns the player | implemented | `hazards[]` |
| Pressure plate | implemented | `switches[]` |
| Timed stone gate | implemented | `gates[]` |
| Bounce pad | implemented | `platform.bounce` |
| Walkable stairs and slopes | implemented | `platform.slope, steps; physics.stepHeight` |
| Patrol creature (IDLE/PATROL/TURN/ALERT/STUNNED/DISABLED) | implemented | `enemies[]` |
| Circular-path platform | planned | `—` |
| Pushable block | planned | `—` |
| Breakable obstacle | planned | `—` |
| Conveyor surface | planned | `—` |
| Warned falling debris | planned | `—` |
| Fog or darkness with lanterns | planned | `—` |
| Water current | planned | `—` |

## All 193 levels

| # | Country | Status | Tier | Archetype | Signature mechanic | Landmark |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | Afghanistan (AFG) | planned | 5 · Master Explorer | old-town-rooftop-run | bounce-pad | Minaret and Archaeological Remains of Jam |
| 2 | Albania (ALB) | planned | 5 · Master Explorer | courtyard-arcades | timed-gate | Butrint |
| 3 | Algeria (DZA) | planned | 3 · Challenger | castle-rampart-climb | timed-gate | Al Qal'a of Beni Hammad |
| 4 | Andorra (AND) | planned | 5 · Master Explorer | mountain-switchback-ascent | stairs-and-slopes | Madriu-Perafita-Claror Valley |
| 5 | Angola (AGO) | planned | 5 · Master Explorer | canyon-mesa-wind | wind-gusts | Mbanza Kongo, Vestiges of the Capital of the former Kingdom of Kongo |
| 6 | Antigua and Barbuda (ATG) | planned | 4 · Expert Explorer | coastal-boardwalk-tides | moving-platform | Antigua Naval Dockyard and Related Archaeological Sites |
| 7 | Argentina (ARG) | planned | 5 · Master Explorer | vertical-cliff-precision | collapsing-ledge | Los Glaciares National Park |
| 8 | Armenia (ARM) | planned | 5 · Master Explorer | castle-rampart-climb | timed-gate | Monasteries of Haghpat and Sanahin |
| 9 | Australia (AUS) | template | 3 · Challenger | island-hopping | moving-platform | Great Barrier Reef |
| 10 | Austria (AUT) | planned | 5 · Master Explorer | old-town-rooftop-run | bounce-pad | Historic Centre of the City of Salzburg |
| 11 | Azerbaijan (AZE) | planned | 5 · Master Explorer | courtyard-arcades | timed-gate | Walled City of Baku with the Shirvanshah's Palace and Maiden Tower |
| 12 | Bahamas (BHS) | planned | 2 · Adventurer | palace-garden-terraces | pressure-plate | Queen's Staircase |
| 13 | Bahrain (BHR) | planned | 3 · Challenger | castle-rampart-climb | timed-gate | Qal’at al-Bahrain – Ancient Harbour and Capital of Dilmun |
| 14 | Bangladesh (BGD) | planned | 2 · Adventurer | courtyard-arcades | timed-gate | Historic Mosque City of Bagerhat |
| 15 | Barbados (BRB) | planned | 1 · Explorer | courtyard-arcades | timed-gate | Historic Bridgetown and its Garrison |
| 16 | Belarus (BLR) | planned | 2 · Adventurer | old-town-rooftop-run | vertical-lift | Mir Castle Complex |
| 17 | Belgium (BEL) | planned | 2 · Adventurer | old-town-rooftop-run | vertical-lift | Flemish Béguinages |
| 18 | Belize (BLZ) | planned | 4 · Expert Explorer | island-hopping | moving-platform | Belize Barrier Reef Reserve System |
| 19 | Benin (BEN) | planned | 5 · Master Explorer | courtyard-arcades | timed-gate | Royal Palaces of Abomey |
| 20 | Bhutan (BTN) | planned | 5 · Master Explorer | old-town-rooftop-run | vertical-lift | Paro Taktsang |
| 21 | Bolivia (BOL) | planned | 5 · Master Explorer | old-town-rooftop-run | vertical-lift | City of Potosí |
| 22 | Bosnia and Herzegovina (BIH) | planned | 5 · Master Explorer | harbour-crane-docks | vertical-lift | Old Bridge Area of the Old City of Mostar |
| 23 | Botswana (BWA) | planned | 3 · Challenger | glacier-crevasse-crossing | ice-surface | Tsodilo |
| 24 | Brazil (BRA) | playable | 3 · Challenger | canopy-river-traversal | vine-swings | Central Amazon Conservation Complex |
| 25 | Brunei (BRN) | planned | 4 · Expert Explorer | courtyard-arcades | timed-gate | Omar Ali Saifuddien Mosque |
| 26 | Bulgaria (BGR) | planned | 2 · Adventurer | courtyard-arcades | stairs-and-slopes | Boyana Church |
| 27 | Burkina Faso (BFA) | planned | 5 · Master Explorer | courtyard-arcades | timed-gate | Ruins of Loropéni |
| 28 | Burundi (BDI) | planned | 4 · Expert Explorer | palace-garden-terraces | bounce-pad | Gishora Royal Residence |
| 29 | Cabo Verde (CPV) | planned | 1 · Explorer | courtyard-arcades | stairs-and-slopes | Cidade Velha, Historic Centre of Ribeira Grande |
| 30 | Cambodia (KHM) | planned | 4 · Expert Explorer | courtyard-arcades | timed-gate | Angkor |
| 31 | Cameroon (CMR) | planned | 3 · Challenger | forest-treetop-bridges | pendulum-swing | Dja Faunal Reserve |
| 32 | Canada (CAN) | template | 3 · Challenger | vertical-cliff-precision | collapsing-ledge | Canadian Rocky Mountain Parks |
| 33 | Central African Republic (CAF) | planned | 1 · Explorer | rolling-hills-meadow | stairs-and-slopes | Manovo-Gounda St Floris National Park |
| 34 | Chad (TCD) | planned | 3 · Challenger | wetland-stilt-walk | collapsing-ledge | Lakes of Ounianga |
| 35 | Chile (CHL) | planned | 5 · Master Explorer | island-hopping | bounce-pad | Rapa Nui National Park |
| 36 | China (CHN) | planned | 2 · Adventurer | courtyard-arcades | pressure-plate | Imperial Palaces of the Ming and Qing Dynasties in Beijing and Shenyang |
| 37 | Colombia (COL) | planned | 4 · Expert Explorer | harbour-crane-docks | vertical-lift | Port, Fortresses and Group of Monuments, Cartagena |
| 38 | Comoros (COM) | planned | 1 · Explorer | courtyard-arcades | stairs-and-slopes | The Medinas of the Historic Sultanates of the Comoros |
| 39 | Costa Rica (CRI) | planned | 4 · Expert Explorer | island-hopping | bounce-pad | Cocos Island National Park |
| 40 | Côte d’Ivoire (CIV) | planned | 5 · Master Explorer | canopy-river-traversal | pendulum-swing | Taï National Park |
| 41 | Croatia (HRV) | planned | 1 · Explorer | courtyard-arcades | stairs-and-slopes | Historical Complex of Split with the Palace of Diocletian |
| 42 | Cuba (CUB) | planned | 4 · Expert Explorer | castle-rampart-climb | timed-gate | Old Havana and its Fortification System |
| 43 | Cyprus (CYP) | planned | 1 · Explorer | canyon-mesa-wind | collapsing-ledge | Paphos |
| 44 | Czechia (CZE) | planned | 2 · Adventurer | castle-rampart-climb | timed-gate | Historic Centre of Český Krumlov |
| 45 | Democratic Republic of the Congo (COD) | planned | 2 · Adventurer | mountain-switchback-ascent | wind-gusts | Virunga National Park |
| 46 | Denmark (DNK) | planned | 1 · Explorer | canyon-mesa-wind | collapsing-ledge | Jelling Mounds, Runic Stones and Church |
| 47 | Djibouti (DJI) | planned | 3 · Challenger | coastal-boardwalk-tides | moving-platform | Lake Assal |
| 48 | Dominica (DMA) | planned | 5 · Master Explorer | mountain-switchback-ascent | wind-gusts | Morne Trois Pitons National Park |
| 49 | Dominican Republic (DOM) | planned | 4 · Expert Explorer | old-town-rooftop-run | bounce-pad | Colonial City of Santo Domingo |
| 50 | Ecuador (ECU) | planned | 4 · Expert Explorer | castle-rampart-climb | pressure-plate | City of Quito |
| 51 | Egypt (EGY) | playable | 2 · Adventurer | desert-ruins-mechanism | pressure-plate-timed-gate | Pyramids of Giza |
| 52 | El Salvador (SLV) | planned | 4 · Expert Explorer | courtyard-arcades | pressure-plate | Joya de Cerén Archaeological Site |
| 53 | Equatorial Guinea (GNQ) | planned | 3 · Challenger | old-town-rooftop-run | bounce-pad | Basilica of the Immaculate Conception, Mongomo |
| 54 | Eritrea (ERI) | planned | 3 · Challenger | courtyard-arcades | pressure-plate | Asmara: A Modernist African City |
| 55 | Estonia (EST) | planned | 2 · Adventurer | old-town-rooftop-run | vertical-lift | Historic Centre (Old Town) of Tallinn |
| 56 | Eswatini (SWZ) | planned | 2 · Adventurer | mountain-switchback-ascent | wind-gusts | Sibebe Rock |
| 57 | Ethiopia (ETH) | planned | 5 · Master Explorer | courtyard-arcades | stairs-and-slopes | Rock-Hewn Churches, Lalibela |
| 58 | Fiji (FJI) | planned | 2 · Adventurer | harbour-crane-docks | moving-platform | Levuka Historical Port Town |
| 59 | Finland (FIN) | planned | 2 · Adventurer | old-town-rooftop-run | vertical-lift | Fortress of Suomenlinna |
| 60 | France (FRA) | template | 2 · Adventurer | old-town-rooftop-run | bounce-pad | Eiffel Tower |
| 61 | Gabon (GAB) | planned | 4 · Expert Explorer | forest-treetop-bridges | collapsing-ledge | Ecosystem and Relict Cultural Landscape of Lopé-Okanda |
| 62 | Gambia (GMB) | planned | 5 · Master Explorer | coastal-boardwalk-tides | bounce-pad | Kunta Kinteh Island and Related Sites |
| 63 | Georgia (GEO) | planned | 5 · Master Explorer | old-town-rooftop-run | timed-gate | Gelati Monastery |
| 64 | Germany (DEU) | planned | 2 · Adventurer | tower-ascent | vertical-lift | Aachen Cathedral |
| 65 | Ghana (GHA) | planned | 4 · Expert Explorer | old-town-rooftop-run | timed-gate | Forts and Castles, Volta, Greater Accra, Central and Western Regions |
| 66 | Greece (GRC) | planned | 1 · Explorer | courtyard-arcades | pressure-plate | Acropolis of Athens |
| 67 | Grenada (GRD) | planned | 3 · Challenger | coastal-boardwalk-tides | bounce-pad | Molinere Underwater Sculpture Park |
| 68 | Guatemala (GTM) | planned | 4 · Expert Explorer | courtyard-arcades | stairs-and-slopes | Antigua Guatemala |
| 69 | Guinea (GIN) | planned | 2 · Adventurer | glacier-crevasse-crossing | wind-gusts | Mount Nimba Strict Nature Reserve |
| 70 | Guinea-Bissau (GNB) | planned | 5 · Master Explorer | island-hopping | moving-platform | Coastal and Marine Ecosystems of the Bijagós Archipelago – Omatí Minhô |
| 71 | Guyana (GUY) | planned | 2 · Adventurer | wetland-stilt-walk | moving-platform | Kaieteur Falls |
| 72 | Haiti (HTI) | planned | 4 · Expert Explorer | old-town-rooftop-run | timed-gate | National History Park – Citadel, Sans Souci, Ramiers |
| 73 | Honduras (HND) | planned | 5 · Master Explorer | canyon-mesa-wind | moving-platform | Maya Site of Copan |
| 74 | Hungary (HUN) | planned | 1 · Explorer | castle-rampart-climb | timed-gate | Budapest, including the Banks of the Danube, the Buda Castle Quarter and Andrássy Avenue |
| 75 | Iceland (ISL) | planned | 5 · Master Explorer | vertical-cliff-precision | ice-surface | Þingvellir National Park |
| 76 | India (IND) | template | 3 · Challenger | courtyard-arcades | stairs-and-slopes | Taj Mahal |
| 77 | Indonesia (IDN) | planned | 4 · Expert Explorer | desert-ruins-mechanism | timed-gate | Borobudur Temple Compounds |
| 78 | Iran (IRN) | planned | 3 · Challenger | courtyard-arcades | pressure-plate | Meidan Emam, Esfahan |
| 79 | Iraq (IRQ) | planned | 3 · Challenger | desert-ruins-mechanism | wind-gusts | Hatra |
| 80 | Ireland (IRL) | planned | 2 · Adventurer | desert-ruins-mechanism | wind-gusts | Brú na Bóinne - Archaeological Ensemble of the Bend of the Boyne |
| 81 | Israel (ISR) | planned | 3 · Challenger | courtyard-arcades | stairs-and-slopes | Masada |
| 82 | Italy (ITA) | template | 3 · Challenger | canyon-mesa-wind | wind-gusts | Colosseum |
| 83 | Jamaica (JAM) | planned | 4 · Expert Explorer | vertical-cliff-precision | ice-surface | Blue and John Crow Mountains |
| 84 | Japan (JPN) | template | 2 · Adventurer | mountain-switchback-ascent | vertical-lift | Mount Fuji |
| 85 | Jordan (JOR) | planned | 3 · Challenger | canyon-mesa-wind | wind-gusts | Petra |
| 86 | Kazakhstan (KAZ) | planned | 1 · Explorer | palace-garden-terraces | pressure-plate | Mausoleum of Khoja Ahmed Yasawi |
| 87 | Kenya (KEN) | planned | 1 · Explorer | wetland-stilt-walk | moving-platform | Lake Turkana National Parks |
| 88 | Kiribati (KIR) | planned | 1 · Explorer | island-hopping | moving-platform | Phoenix Islands Protected Area |
| 89 | Kuwait (KWT) | planned | 3 · Challenger | old-town-rooftop-run | vertical-lift | Kuwait Towers |
| 90 | Kyrgyzstan (KGZ) | planned | 5 · Master Explorer | glacier-crevasse-crossing | ice-surface | Sulaiman-Too Sacred Mountain |
| 91 | Laos (LAO) | planned | 2 · Adventurer | old-town-rooftop-run | bounce-pad | Town of Luang Prabang |
| 92 | Latvia (LVA) | planned | 3 · Challenger | courtyard-arcades | timed-gate | Historic Centre of Riga |
| 93 | Lebanon (LBN) | planned | 2 · Adventurer | canyon-mesa-wind | wind-gusts | Anjar |
| 94 | Lesotho (LSO) | planned | 5 · Master Explorer | glacier-crevasse-crossing | ice-surface | Maloti-Drakensberg Park |
| 95 | Liberia (LBR) | planned | 2 · Adventurer | coastal-boardwalk-tides | water-hazard | Providence Island |
| 96 | Libya (LBY) | planned | 3 · Challenger | canyon-mesa-wind | wind-gusts | Archaeological Site of Cyrene |
| 97 | Liechtenstein (LIE) | planned | 5 · Master Explorer | castle-rampart-climb | timed-gate | Vaduz Castle |
| 98 | Lithuania (LTU) | planned | 3 · Challenger | old-town-rooftop-run | bounce-pad | Vilnius Historic Centre |
| 99 | Luxembourg (LUX) | planned | 2 · Adventurer | castle-rampart-climb | pressure-plate | City of Luxembourg: its Old Quarters and Fortifications |
| 100 | Madagascar (MDG) | planned | 4 · Expert Explorer | canopy-river-traversal | pendulum-swing | Andrefana Dry Forests |
| 101 | Malawi (MWI) | planned | 5 · Master Explorer | wetland-stilt-walk | water-hazard | Lake Malawi National Park |
| 102 | Malaysia (MYS) | planned | 4 · Expert Explorer | forest-treetop-bridges | collapsing-ledge | Gunung Mulu National Park |
| 103 | Maldives (MDV) | planned | 1 · Explorer | palace-garden-terraces | bounce-pad | Male Friday Mosque |
| 104 | Mali (MLI) | planned | 3 · Challenger | palace-garden-terraces | moving-platform | Old Towns of Djenné |
| 105 | Malta (MLT) | planned | 1 · Explorer | courtyard-arcades | pressure-plate | City of Valletta |
| 106 | Marshall Islands (MHL) | planned | 1 · Explorer | coastal-boardwalk-tides | water-hazard | Bikini Atoll Nuclear Test Site |
| 107 | Mauritania (MRT) | planned | 3 · Challenger | coastal-boardwalk-tides | bounce-pad | Banc d'Arguin National Park |
| 108 | Mauritius (MUS) | planned | 2 · Adventurer | coastal-boardwalk-tides | water-hazard | Aapravasi Ghat |
| 109 | Mexico (MEX) | planned | 4 · Expert Explorer | desert-ruins-mechanism | timed-gate | Chichen-Itza |
| 110 | Micronesia (FSM) | planned | 1 · Explorer | palace-garden-terraces | bounce-pad | Nan Madol: Ceremonial Centre of Eastern Micronesia |
| 111 | Moldova (MDA) | planned | 1 · Explorer | old-town-rooftop-run | vertical-lift | Struve Geodetic Arc |
| 112 | Monaco (MCO) | planned | 2 · Adventurer | palace-garden-terraces | pressure-plate | Prince's Palace of Monaco |
| 113 | Mongolia (MNG) | planned | 1 · Explorer | mountain-switchback-ascent | stairs-and-slopes | Orkhon Valley Cultural Landscape |
| 114 | Montenegro (MNE) | planned | 5 · Master Explorer | coastal-boardwalk-tides | bounce-pad | Natural and Culturo-Historical Region of Kotor |
| 115 | Morocco (MAR) | planned | 3 · Challenger | courtyard-arcades | pressure-plate | Medina of Marrakesh |
| 116 | Mozambique (MOZ) | planned | 4 · Expert Explorer | coastal-boardwalk-tides | bounce-pad | Island of Mozambique |
| 117 | Myanmar (MMR) | planned | 2 · Adventurer | courtyard-arcades | pressure-plate | Pyu Ancient Cities |
| 118 | Namibia (NAM) | planned | 3 · Challenger | desert-ruins-mechanism | timed-gate | Twyfelfontein or /Ui-//aes |
| 119 | Nauru (NRU) | planned | 2 · Adventurer | wetland-stilt-walk | collapsing-ledge | Buada Lagoon |
| 120 | Nepal (NPL) | planned | 5 · Master Explorer | mountain-switchback-ascent | stairs-and-slopes | Sagarmatha National Park and Mount Everest |
| 121 | Netherlands (NLD) | planned | 2 · Adventurer | island-hopping | water-hazard | Schokland and Surroundings |
| 122 | New Zealand (NZL) | planned | 5 · Master Explorer | glacier-crevasse-crossing | ice-surface | Te Wahipounamu – South West New Zealand |
| 123 | Nicaragua (NIC) | planned | 4 · Expert Explorer | canyon-mesa-wind | collapsing-ledge | Ruins of León Viejo |
| 124 | Niger (NER) | planned | 3 · Challenger | desert-ruins-mechanism | timed-gate | Air and Ténéré Natural Reserves |
| 125 | Nigeria (NGA) | planned | 4 · Expert Explorer | palace-garden-terraces | pressure-plate | Sukur Cultural Landscape |
| 126 | North Korea (PRK) | planned | 2 · Adventurer | palace-garden-terraces | bounce-pad | Complex of Koguryo Tombs |
| 127 | North Macedonia (MKD) | planned | 5 · Master Explorer | wetland-stilt-walk | collapsing-ledge | Natural and Cultural Heritage of the Ohrid region |
| 128 | Norway (NOR) | playable | 4 · Expert Explorer | vertical-cliff-precision | collapsing-ice-ledges | Lofoten Islands |
| 129 | Oman (OMN) | planned | 3 · Challenger | castle-rampart-climb | pressure-plate | Bahla Fort |
| 130 | Pakistan (PAK) | planned | 5 · Master Explorer | canyon-mesa-wind | moving-platform | Archaeological Ruins at Moenjodaro |
| 131 | Palau (PLW) | planned | 1 · Explorer | island-hopping | moving-platform | Rock Islands Southern Lagoon |
| 132 | Panama (PAN) | planned | 4 · Expert Explorer | castle-rampart-climb | patrol-enemy | Fortifications on the Caribbean Side of Panama: Portobelo-San Lorenzo |
| 133 | Papua New Guinea (PNG) | planned | 2 · Adventurer | wetland-stilt-walk | moving-platform | Kuk Early Agricultural Site |
| 134 | Paraguay (PRY) | planned | 1 · Explorer | palace-garden-terraces | moving-platform | Jesuit Missions of La Santísima Trinidad de Paraná and Jesús de Tavarangue |
| 135 | Peru (PER) | planned | 5 · Master Explorer | castle-rampart-climb | pressure-plate | City of Cuzco |
| 136 | Philippines (PHL) | planned | 4 · Expert Explorer | old-town-rooftop-run | vertical-lift | Baroque Churches of the Philippines |
| 137 | Poland (POL) | planned | 2 · Adventurer | old-town-rooftop-run | timed-gate | Historic Centre of Kraków |
| 138 | Portugal (PRT) | planned | 1 · Explorer | harbour-crane-docks | water-hazard | Central Zone of the Town of Angra do Heroismo in the Azores |
| 139 | Qatar (QAT) | planned | 3 · Challenger | canyon-mesa-wind | moving-platform | Al Zubarah Archaeological Site |
| 140 | Republic of the Congo (COG) | planned | 4 · Expert Explorer | canopy-river-traversal | moving-platform | Forest Massif of Odzala-Kokoua |
| 141 | Romania (ROU) | planned | 1 · Explorer | wetland-stilt-walk | moving-platform | Danube Delta |
| 142 | Russia (RUS) | planned | 5 · Master Explorer | castle-rampart-climb | patrol-enemy | Historic Centre of Saint Petersburg and Related Groups of Monuments |
| 143 | Rwanda (RWA) | planned | 4 · Expert Explorer | canopy-river-traversal | moving-platform | Nyungwe National Park |
| 144 | Saint Kitts and Nevis (KNA) | planned | 1 · Explorer | castle-rampart-climb | patrol-enemy | Brimstone Hill Fortress National Park |
| 145 | Saint Lucia (LCA) | planned | 1 · Explorer | glacier-crevasse-crossing | collapsing-ledge | Pitons Management Area |
| 146 | Saint Vincent and the Grenadines (VCT) | planned | 1 · Explorer | glacier-crevasse-crossing | wind-gusts | La Soufriere, Saint Vincent |
| 147 | Samoa (WSM) | planned | 1 · Explorer | wetland-stilt-walk | water-hazard | To Sua Ocean Trench |
| 148 | San Marino (SMR) | planned | 2 · Adventurer | old-town-rooftop-run | bounce-pad | San Marino Historic Centre and Mount Titano |
| 149 | São Tomé and Príncipe (STP) | planned | 1 · Explorer | courtyard-arcades | stairs-and-slopes | The Roças of Sao Tome and Principe: Colonial Agricultural System and Forced Migration |
| 150 | Saudi Arabia (SAU) | planned | 3 · Challenger | canyon-mesa-wind | moving-platform | Hegra Archaeological Site (al-Hijr / Madā ͐ in Ṣāliḥ) |
| 151 | Senegal (SEN) | planned | 4 · Expert Explorer | island-hopping | moving-platform | Island of Gorée |
| 152 | Serbia (SRB) | planned | 1 · Explorer | courtyard-arcades | timed-gate | Stari Ras and Sopoćani |
| 153 | Seychelles (SYC) | planned | 2 · Adventurer | island-hopping | bounce-pad | Aldabra Atoll |
| 154 | Sierra Leone (SLE) | planned | 4 · Expert Explorer | forest-treetop-bridges | pendulum-swing | Gola-Tiwai Complex |
| 155 | Singapore (SGP) | planned | 1 · Explorer | forest-treetop-bridges | pendulum-swing | Singapore Botanic Gardens |
| 156 | Slovakia (SVK) | planned | 5 · Master Explorer | castle-rampart-climb | timed-gate | Historic Town of Banská Štiavnica and the Technical Monuments in its Vicinity |
| 157 | Slovenia (SVN) | planned | 5 · Master Explorer | vertical-cliff-precision | ice-surface | Škocjan Caves |
| 158 | Solomon Islands (SLB) | planned | 1 · Explorer | coastal-boardwalk-tides | water-hazard | East Rennell |
| 159 | Somalia (SOM) | planned | 3 · Challenger | desert-ruins-mechanism | timed-gate | Laas Geel rock shelters, Somaliland region |
| 160 | South Africa (ZAF) | template | 3 · Challenger | rolling-hills-meadow | stairs-and-slopes | Kruger National Park |
| 161 | South Korea (KOR) | planned | 2 · Adventurer | old-town-rooftop-run | bounce-pad | Haeinsa Temple Janggyeong Panjeon, the Depositories for the Tripitaka Koreana Woodblocks |
| 162 | South Sudan (SSD) | planned | 1 · Explorer | rolling-hills-meadow | bounce-pad | Boma–Badingilo Migratory Landscape |
| 163 | Spain (ESP) | planned | 1 · Explorer | courtyard-arcades | pressure-plate | Alhambra and Generalife |
| 164 | Sri Lanka (LKA) | planned | 4 · Expert Explorer | courtyard-arcades | timed-gate | Ancient City of Polonnaruwa |
| 165 | Sudan (SDN) | planned | 3 · Challenger | desert-ruins-mechanism | pressure-plate | Gebel Barkal and the Sites of the Napatan Region |
| 166 | Suriname (SUR) | planned | 4 · Expert Explorer | canopy-river-traversal | pendulum-swing | Central Suriname Nature Reserve |
| 167 | Sweden (SWE) | planned | 2 · Adventurer | courtyard-arcades | pressure-plate | Royal Domain of Drottningholm |
| 168 | Switzerland (CHE) | planned | 5 · Master Explorer | old-town-rooftop-run | vertical-lift | Abbey of St Gall |
| 169 | Syria (SYR) | planned | 2 · Adventurer | courtyard-arcades | pressure-plate | Ancient City of Damascus |
| 170 | Tajikistan (TJK) | planned | 5 · Master Explorer | courtyard-arcades | timed-gate | Proto-urban Site of Sarazm |
| 171 | Tanzania (TZA) | planned | 5 · Master Explorer | mountain-switchback-ascent | wind-gusts | Kilimanjaro National Park |
| 172 | Thailand (THA) | planned | 4 · Expert Explorer | palace-garden-terraces | pressure-plate | Historic City of Ayutthaya |
| 173 | Timor-Leste (TLS) | planned | 4 · Expert Explorer | old-town-rooftop-run | vertical-lift | Cristo Rei, Dili |
| 174 | Togo (TGO) | planned | 4 · Expert Explorer | castle-rampart-climb | pressure-plate | Koutammakou, the Land of the Batammariba |
| 175 | Tonga (TON) | planned | 1 · Explorer | courtyard-arcades | pressure-plate | Ha'amonga 'a Maui trilithon |
| 176 | Trinidad and Tobago (TTO) | planned | 1 · Explorer | coastal-boardwalk-tides | bounce-pad | La Brea Pitch Lake |
| 177 | Tunisia (TUN) | planned | 3 · Challenger | canyon-mesa-wind | collapsing-ledge | Amphitheatre of El Jem |
| 178 | Türkiye (TUR) | planned | 2 · Adventurer | vertical-cliff-precision | collapsing-ledge | Göreme National Park and the Rock Sites of Cappadocia |
| 179 | Turkmenistan (TKM) | planned | 3 · Challenger | palace-garden-terraces | bounce-pad | State Historical and Cultural Park “Ancient Merv” |
| 180 | Tuvalu (TUV) | planned | 1 · Explorer | island-hopping | water-hazard | Funafuti Conservation Area |
| 181 | Uganda (UGA) | planned | 4 · Expert Explorer | canopy-river-traversal | bounce-pad | Bwindi Impenetrable National Park |
| 182 | Ukraine (UKR) | planned | 2 · Adventurer | tower-ascent | wind-gusts | Kyiv: Saint-Sophia Cathedral and Related Monastic Buildings, Kyiv-Pechersk Lavra |
| 183 | United Arab Emirates (ARE) | planned | 3 · Challenger | desert-ruins-mechanism | pressure-plate | Cultural Sites of Al Ain (Hafit, Hili, Bidaa Bint Saud and Oases Areas) |
| 184 | United Kingdom (GBR) | planned | 2 · Adventurer | tower-ascent | moving-platform | Elizabeth Tower and Palace of Westminster |
| 185 | United States (USA) | template | 3 · Challenger | old-town-rooftop-run | timed-gate | Statue of Liberty |
| 186 | Uruguay (URY) | planned | 1 · Explorer | old-town-rooftop-run | timed-gate | Historic Quarter of the City of Colonia del Sacramento |
| 187 | Uzbekistan (UZB) | planned | 3 · Challenger | castle-rampart-climb | patrol-enemy | Itchan Kala |
| 188 | Vanuatu (VUT) | planned | 1 · Explorer | coastal-boardwalk-tides | bounce-pad | Chief Roi Mata’s Domain |
| 189 | Venezuela (VEN) | planned | 4 · Expert Explorer | harbour-crane-docks | vertical-lift | Coro and its Port |
| 190 | Vietnam (VNM) | planned | 4 · Expert Explorer | palace-garden-terraces | moving-platform | Complex of Hué Monuments |
| 191 | Yemen (YEM) | planned | 3 · Challenger | courtyard-arcades | stairs-and-slopes | Old Walled City of Shibam |
| 192 | Zambia (ZMB) | planned | 1 · Explorer | wetland-stilt-walk | collapsing-ledge | Mosi-oa-Tunya / Victoria Falls |
| 193 | Zimbabwe (ZWE) | planned | 1 · Explorer | savanna-plains-run | bounce-pad | Mana Pools National Park, Sapi and Chewore Safari Areas |
