/* Rebuild the factual place profiles. Read-only source summaries are supplied
 * as argv[2] (default tmp/world-explorer-heritage-reference.json). The game
 * retains original short trait labels, not copies of UNESCO descriptions. */
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8').replace(/^\uFEFF/,''));
const countries=read('public/world-explorer/data/countries.json');
const discoveries=read('public/world-explorer/data/discoveries.json');
const references=read(process.argv[2]||'tmp/world-explorer-heritage-reference.json');
const byCode=new Map(discoveries.records.map(row=>[row.code,row]));
const byId=new Map(references.map(row=>[String(row.id_no),row]));

// Explicit per-place rendering choices. These are geometric archetypes, not
// assertions that every religious building is a cathedral or every hill alpine.
const kinds=Object.fromEntries(`
AFG tower
ALB ruins
DZA castle
AND mountain
AGO ruins
ATG harbour
ARG glacier
ARM old-town
AUS palace
AUT old-town
AZE palace
BHS civic
BHR castle
BGD mosque
BRB old-town
BLR castle
BEL old-town
BLZ island
BEN palace
BTN civic
BOL old-town
BIH bridge
BWA mountain
BRA rainforest
BRN civic
BGR old-town
BFA ruins
BDI civic
CPV old-town
KHM ruins
CMR rainforest
CAN ruins
CAF savanna
TCD wetland
CHL island
CHN palace
COL harbour
COM old-town
CRI island
CIV rainforest
HRV palace
CUB old-town
CYP ruins
CZE old-town
COD mountain
DNK ruins
DJI civic
DMA mountain
DOM old-town
ECU old-town
EGY pyramid
SLV ruins
GNQ civic
ERI old-town
EST old-town
SWZ civic
ETH old-town
FJI harbour
FIN castle
FRA tower
GAB rainforest
GMB island
GEO old-town
DEU cathedral
GHA castle
GRC ruins
GRD civic
GTM old-town
GIN mountain
GNB island
GUY civic
HTI castle
HND ruins
HUN castle
ISL mountain
IND castle
IDN pyramid
IRN mosque
IRQ ruins
IRL ruins
ISR ruins
ITA ruins
JAM mountain
JPN mountain
JOR ruins
KAZ civic
KEN wetland
KIR island
KWT civic
KGZ mountain
LAO old-town
LVA old-town
LBN ruins
LSO mountain
LBR civic
LBY ruins
LIE civic
LTU old-town
LUX castle
MDG forest
MWI wetland
MYS rainforest
MDV civic
MLI mosque
MLT old-town
MHL island
MRT wetland
MUS harbour
MEX old-town
FSM ruins
MDA civic
MCO civic
MNG mountain
MNE harbour
MAR old-town
MOZ island
MMR ruins
NAM desert
NRU civic
NPL old-town
NLD island
NZL glacier
NIC ruins
NER desert
NGA palace
PRK ruins
MKD wetland
NOR harbour
OMN castle
PAK ruins
PLW island
PAN castle
PNG wetland
PRY ruins
PER old-town
PHL cathedral
POL old-town
PRT harbour
QAT ruins
COG rainforest
ROU wetland
RUS old-town
RWA rainforest
KNA castle
LCA mountain
VCT civic
WSM civic
SMR castle
STP old-town
SAU ruins
SEN island
SRB old-town
SYC island
SLE rainforest
SGP civic
SVK old-town
SVN mountain
SLB island
SOM civic
ZAF mountain
KOR old-town
SSD savanna
ESP palace
LKA ruins
SDN pyramid
SUR rainforest
SWE palace
CHE old-town
SYR old-town
TJK ruins
TZA savanna
THA ruins
TLS civic
TGO old-town
TON civic
TTO civic
TUN ruins
TUR mountain
TKM ruins
TUV civic
UGA rainforest
UKR cathedral
ARE desert
GBR castle
USA tower
URY old-town
UZB old-town
VUT island
VEN harbour
VNM palace
YEM old-town
ZMB wetland
ZWE savanna
`.trim().split('\n').map(line=>line.trim().split(/\s+/)));

// These notes describe only verified physical traits of the actual named place.
const special={
 USA:{landmarkName:'Statue of Liberty',landmarkKind:'tower',features:['Copper statue','Raised torch','Harbour island'],sourceUrl:'https://www.nps.gov/npnh/learn/news/fact-sheet-stli.htm'},
 BRA:{landmarkName:'Central Amazon Conservation Complex',landmarkKind:'rainforest',features:['Tropical forest','Seasonally flooded forest','Lakes and river channels'],sourceUrl:'https://whc.unesco.org/en/list/998/'},
 FRA:{landmarkName:'Eiffel Tower',landmarkKind:'tower',features:['Iron lattice structure','Four base piers','Open observation levels'],sourceUrl:'https://www.toureiffel.paris/en/the-monument/history'},
 EGY:{landmarkName:'Pyramids of Giza',landmarkKind:'pyramid',features:['Three main Giza pyramids','Stone funerary monuments','Giza plateau'],sourceUrl:'https://whc.unesco.org/en/list/86/'},
 JPN:{landmarkName:'Mount Fuji',landmarkKind:'mountain',features:['Stratovolcano','Often snow-capped summit','Pilgrimage landscape'],sourceUrl:'https://whc.unesco.org/en/list/1418/'},
 AUS:{landmarkName:'Great Barrier Reef',landmarkKind:'island',features:['Coral reef ecosystem','Tropical islands','Shallow turquoise water'],biome:'coastal',palette:{stone:'#d8c9a3',roof:'#8f6a48',accent:'#2fc2c9',foliage:'#3f9a48'},heritageId:154,sourceUrl:'https://whc.unesco.org/en/list/154/'},
 NOR:{landmarkName:'Lofoten Islands',landmarkKind:'harbour',features:['Steep coastal mountains','Fishing villages','Glacier-carved peaks'],biome:'alpine',sourceUrl:'https://snl.no/Lofoten',discoveryKind:'showcase',discoveryText:'A fjord forms where a glacier shapes and deepens an earlier valley; after the ice melts, the sea fills the U-shaped valley. In Lofoten, ice-age glaciers also carved deep cirques, sharp ridges and pointed peaks that rise steeply from the sea.'},
 IND:{landmarkName:'Taj Mahal',landmarkKind:'palace',features:['White marble mausoleum','Four corner minarets','Mughal charbagh garden'],biome:'temperate',shapeHints:{roof:'dome',towers:4},palette:{stone:'#f3eee0',roof:'#d9c6a6',accent:'#b76e4f',foliage:'#4b793a'},heritageId:252,sourceUrl:'https://whc.unesco.org/en/list/252/',discoveryText:'The Taj Mahal is a marble mausoleum in Agra beside the Yamuna River. Its four corner minarets, red-sandstone flanking buildings and symmetrical Mughal garden make the complex recognisable. The fictional game route is separate from the protected monument.'},
 CAN:{landmarkName:'Canadian Rocky Mountain Parks',landmarkKind:'mountain',features:['Rugged mountain peaks','Glaciers and turquoise lakes','Conifer forest'],biome:'alpine',palette:{stone:'#7d929e',roof:'#f0f6f8',accent:'#3fa0b7',foliage:'#39765f'},heritageId:304,sourceUrl:'https://whc.unesco.org/en/list/304/',discoveryText:'The Canadian Rocky Mountain Parks World Heritage property includes Banff, Jasper, Kootenay and Yoho national parks and three British Columbia provincial parks. Mountain peaks, glaciers, lakes and waterfalls shape this representative Canadian landscape.'},
 ZAF:{landmarkName:'Kruger National Park',landmarkKind:'savanna',features:['Savanna woodland','River and waterhole habitats','Elephants and giraffes'],biome:'grassland',palette:{stone:'#a98e66',roof:'#796247',accent:'#d1ac6a',foliage:'#718142'},sourceUrl:'https://www.sanparks.org/parks/kruger/explore/fauna-flora/mammals',discoveryKind:'showcase',discoveryText:'Kruger National Park protects a South African savanna landscape with many wildlife species. Its mammals include African elephants and giraffes. Wildlife in the game stays on separate scenery ledges; this fictional route does not represent an actual walking trail through the park.'},
 IDN:{features:['Buddhist temple','Stepped terraces','Bell-shaped stupas'],sourceUrl:'https://whc.unesco.org/en/list/592/'},
 MDA:{features:['Survey triangulation points','Geodetic measurement chain','Ten-country property'],sourceUrl:'https://whc.unesco.org/en/list/1187/'},
 RWA:{landmarkName:'Nyungwe National Park',landmarkKind:'rainforest',features:['Rainforest conservation','Peat bogs and moors','Grassland habitats'],sourceUrl:'https://whc.unesco.org/en/list/1697/'},
 MDG:{features:['Dry forest landscapes','Baobabs','Limestone tsingy formations'],sourceUrl:'https://whc.unesco.org/en/list/494/'},
 SAU:{features:['Rock-cut tombs','Decorated facades','Water wells'],sourceUrl:'https://whc.unesco.org/en/list/1293/'},
 KAZ:{features:['Domed mausoleum','Entrance portal','Patterned masonry'],shapeHints:{roof:'dome'},sourceUrl:'https://whc.unesco.org/en/list/1103/'},
 ITA:{landmarkName:'Colosseum',landmarkKind:'ruins',features:['Roman amphitheatre','Arcaded exterior','Open arena'],sourceUrl:'https://colosseo.it/en/area/colosseo/',discoveryKind:'showcase',discoveryText:'The Colosseum, also called the Flavian Amphitheatre, stands in the archaeological heart of Rome. Its surviving exterior arches and open arena help explain how the ancient building was organised.'},
 GBR:{landmarkName:'Elizabeth Tower and Palace of Westminster',landmarkKind:'tower',features:['Four-faced clock','Clock tower','Neo-Gothic palace'],sourceUrl:'https://www.parliament.uk/about/living-heritage/building/palace/architecture/palacestructure/towers-of-parliament/',discoveryKind:'showcase',discoveryText:'Elizabeth Tower stands beside the Palace of Westminster in London and houses a four-faced clock. Big Ben is the nickname of the tower\'s main bell; the tower itself was renamed Elizabeth Tower in 2012.'},
 MEX:{landmarkName:'Chichen-Itza',landmarkKind:'pyramid',features:['Maya stone monuments','El Castillo temple','Circular observatory'],heritageId:483,sourceUrl:'https://whc.unesco.org/en/list/483/',discoveryText:'Chichen-Itza was a major Maya centre on the Yucatan Peninsula. Its surviving monuments include El Castillo, the Warriors\' Temple and the circular observatory called El Caracol.'},
 ESP:{landmarkName:'Alhambra and Generalife',landmarkKind:'palace',features:['Hilltop fortress','Palatial residences','Generalife gardens'],heritageId:314,sourceUrl:'https://whc.unesco.org/en/list/314/',discoveryText:'The Alhambra fortress and residences rise above Granada. The nearby Generalife gardens formed part of the former rural residence of the emirs; together with the Albayzin district they belong to the World Heritage property.'},
 GRC:{landmarkName:'Acropolis of Athens',landmarkKind:'ruins',features:['Rocky hill','Classical temple complex','Parthenon monument'],heritageId:404,sourceUrl:'https://whc.unesco.org/en/list/404/',discoveryText:'The Acropolis of Athens is a rocky hill with a group of ancient monuments. These include the Parthenon, the Erechtheion, the Propylaea entrance and the temple of Athena Nike.'},
 KHM:{features:['Khmer temple complex','Sculptural decoration','Forested setting'],heritageId:668,sourceUrl:'https://whc.unesco.org/en/list/668/',discoveryText:'Angkor preserves remains of several Khmer capitals. The property includes Angkor Wat and the Bayon temple at Angkor Thom, whose architectural and sculptural details help tell its history.'},
 JOR:{features:['Rock-carved structures','Mountain setting','Passages and gorges'],heritageId:326,sourceUrl:'https://whc.unesco.org/en/list/326/',discoveryText:'Petra was a Nabataean caravan city at an important regional crossroads. Parts of the city were built, while others were carved into rock among mountains, passages and gorges.'},
 NPL:{landmarkName:'Sagarmatha National Park and Mount Everest',landmarkKind:'mountain',features:['High mountain landscape','Glaciers','Deep valleys'],biome:'alpine',heritageId:120,sourceUrl:'https://whc.unesco.org/en/list/120/',discoveryText:'Sagarmatha National Park contains dramatic mountains, glaciers and deep valleys, including Mount Everest. This Himalayan landscape is also associated with Sherpa communities and their culture.'},
 MAR:{landmarkName:'Medina of Marrakesh',landmarkKind:'old-town',features:['Historic medina','Monumental gates','Gardens'],heritageId:331,sourceUrl:'https://whc.unesco.org/en/list/331/',discoveryText:'The Medina of Marrakesh contains monuments from several periods. Its mosques, battlements, monumental gateways, gardens and public spaces show the city\'s long history as a regional centre.'},
 TZA:{landmarkName:'Kilimanjaro National Park',landmarkKind:'mountain',features:['Volcanic massif','Mountain forest','Surrounding savanna plains'],biome:'alpine',heritageId:403,sourceUrl:'https://whc.unesco.org/en/list/403/',discoveryText:'Kilimanjaro is a volcanic massif rising above the surrounding plains. Its protected landscape includes mountain forest and a high summit above the savanna.'},
 BTN:{landmarkName:'Paro Taktsang',landmarkKind:'old-town',features:['Cliffside monastery','Paro valley setting','Mountain landscape'],sourceUrl:'https://dcdd.moha.gov.bt/collection/paro-taktshang/',discoveryKind:'showcase',discoveryText:'Paro Taktsang, often called the Tiger\'s Nest, is a monastery built into a steep cliff above the Paro valley. Its architecture is closely connected with this dramatic mountain setting.'},
 BRN:{landmarkName:'Omar Ali Saifuddien Mosque',landmarkKind:'mosque',features:['Golden dome','Marble columns','Lagoon and ceremonial barge'],shapeHints:{roof:'dome'},palette:{stone:'#eee9dd',roof:'#d7b04d'},sourceUrl:'https://www.bruneitourism.com/places/omar-ali-saifuddien-mosque/',discoveryKind:'showcase',discoveryText:'The Omar Ali Saifuddien Mosque in Bandar Seri Begawan is recognised by its golden dome and marble columns. The adjacent lagoon includes a ceremonial barge.'},
 LIE:{landmarkName:'Vaduz Castle',landmarkKind:'castle',features:['Medieval residential tower','Round fortifications','Renaissance hall'],sourceUrl:'https://www.vaduz.li/en/living-environment/living-building/listed-buildings/schloss-vaduz',discoveryKind:'showcase',discoveryText:'Vaduz Castle combines a medieval residential tower with later fortifications and a Renaissance hall. It is a residence of Liechtenstein\'s princely family.'},
 MCO:{landmarkName:'Prince\'s Palace of Monaco',landmarkKind:'palace',features:['Palace on the Rock of Monaco','State apartments','Renaissance frescoes'],sourceUrl:'https://www.visitepalaisdemonaco.com/en/organized-visits/',discoveryKind:'showcase',discoveryText:'The Prince\'s Palace stands on the Rock of Monaco in Monaco-Ville. Its state apartments include Renaissance frescoes, connecting the building with the area\'s artistic history.'},
 GUY:{landmarkName:'Kaieteur Falls',landmarkKind:'wetland',features:['Single-drop waterfall','Potaro River gorge','Rainforest setting'],sourceUrl:'https://www.pac.gov.gy/kaieteur-national-park/',discoveryKind:'showcase',discoveryText:'Kaieteur Falls is a single-drop waterfall on the Potaro River. Its cliff-and-gorge setting is surrounded by rainforest within Kaieteur National Park.'},
 TTO:{landmarkName:'La Brea Pitch Lake',landmarkKind:'wetland',features:['Natural asphalt deposit','Dark low-lying surface','Water pools'],palette:{stone:'#45433e',accent:'#3b3935'},sourceUrl:'https://nationaltrust.tt/location/pitch-lake/',discoveryKind:'showcase',discoveryText:'La Brea Pitch Lake is a natural asphalt deposit on Trinidad\'s southwestern peninsula. Its dark surface and water pools make it different from an ordinary blue-water lake.'},
 BHS:{landmarkName:'Queen\'s Staircase',landmarkKind:'civic',features:['Carved limestone stair corridor','High stone walls','Tropical plants'],sourceUrl:'https://www.bahamas.com/natural-wonders/queens-staircase',discoveryKind:'showcase',discoveryText:'The Queen\'s Staircase in Nassau is a passage of steps cut through limestone. High stone walls and tropical plants frame the route through this historic site.'},
 MDV:{landmarkName:'Male Friday Mosque',landmarkKind:'mosque',features:['Carved coral stone','Timber roof structure','Cylindrical minaret'],shapeHints:{roof:'tiered'},palette:{stone:'#e2ddd1',roof:'#806751'},sourceUrl:'https://whc.unesco.org/en/tentativelists/5812/',discoveryKind:'showcase',discoveryText:'Male Friday Mosque is part of the Maldives\' coral-stone mosque tradition, with coral masonry and a timber roof structure. The nomination is on UNESCO\'s Tentative List; it is not presented here as an inscribed World Heritage property.'},
 WSM:{landmarkName:'To Sua Ocean Trench',landmarkKind:'wetland',features:['Steep-sided swimming hole','Long access ladder','Wooden platform'],sourceUrl:'https://www.samoa.travel/plan-book/activities/to-sua-ocean-trench/',discoveryKind:'showcase',discoveryText:'To Sua Ocean Trench on Upolu is a steep-sided natural swimming hole. A long access ladder and wooden platform are characteristic parts of its visitor setting.'},
 BDI:{landmarkName:'Gishora Royal Residence',landmarkKind:'palace',features:['Circular thatched royal houses','Papyrus and reed construction','Hilltop courtyards'],shapeHints:{roof:'dome'},palette:{stone:'#aa895d',roof:'#a98949'},sourceUrl:'https://whc.unesco.org/en/tentativelists/6927/',discoveryKind:'showcase',discoveryText:'The royal residence at Gishora occupies a hilltop near Gitega. Circular royal houses use poles, papyrus, reeds and thatch, with courtyards and a drum sanctuary. The residence is a Tentative List nomination, not an inscribed World Heritage property.'},
 GNQ:{landmarkName:'Basilica of the Immaculate Conception, Mongomo',landmarkKind:'cathedral',features:['Domed basilica','Hilltop setting','Colonnaded square'],shapeHints:{roof:'dome'},sourceUrl:'https://www.osservatoreromano.va/it/news/2026-04/quo-092/un-abbraccio-a-sorpresa.html',discoveryKind:'showcase',discoveryText:'The Basilica of the Immaculate Conception stands on a small hill in Mongomo, on Equatorial Guinea\'s mainland. A colonnaded square and domes are distinctive parts of its architectural setting.'},
 GRD:{landmarkName:'Molinere Underwater Sculpture Park',landmarkKind:'island',features:['Underwater sculptures','Artificial reef setting','Sandy seabed'],sourceUrl:'https://www.puregrenada.com/underwatersculpturepark/',discoveryKind:'showcase',discoveryText:'Molinere Underwater Sculpture Park lies beneath the sea in the Molinere Beausejour Marine Protected Area. Its sculptures provide surfaces for marine life and form an underwater gallery among sandy patches and reef gullies.'},
 LBR:{landmarkName:'Providence Island',landmarkKind:'island',features:['River island','Historic landing place','Mangrove margins'],sourceUrl:'https://whc.unesco.org/en/tentativelists/6247/',discoveryKind:'showcase',discoveryText:'Providence Island is a historic river island at Monrovia, between the Mesurado River and Stockton Creek. Remains of a landing dock, a well and mangroves form part of the site. It is on the Tentative List, rather than the inscribed World Heritage List.'},
 NRU:{landmarkName:'Buada Lagoon',landmarkKind:'wetland',features:['Landlocked waterbody','Coral-limestone island setting','Interior island basin'],sourceUrl:'https://www.spc.int/sites/default/files/tenderfiles/2022-07/Annex%20I-%20pre%20feasability%20study.pdf',discoveryKind:'showcase',discoveryText:'Buada Lagoon is a landlocked, slightly brackish waterbody in the interior of Nauru\'s raised coral-limestone island. Despite its name, some accounts classify it as a small lake. Nauru has no officially designated capital.'},
 VCT:{landmarkName:'La Soufriere, Saint Vincent',landmarkKind:'mountain',features:['Stratovolcano','Summit crater','Volcanic island landscape'],sourceUrl:'https://volcano.si.edu/volcano.cfm?vn=360150',discoveryKind:'showcase',discoveryText:'La Soufriere is a stratovolcano on the northern part of Saint Vincent. Its broad summit contains craters that have changed through successive eruptions, shaping this volcanic island landscape.'},
 SOM:{landmarkName:'Laas Geel rock shelters, Somaliland region',landmarkKind:'ruins',features:['Rock shelters','Cattle and human rock paintings','Rocky setting near Hargeisa'],sourceUrl:'https://tourism.gov.so/posts/de0b51ab-db1f-43b9-8571-3d606744a509',discoveryKind:'showcase',discoveryText:'Laas Geel is a group of rock shelters near Hargeisa in the Somaliland region. Its preserved paintings include decorated cattle and human figures, recording aspects of the lives of earlier inhabitants.'},
 GAB:{features:['Tropical rainforest','Relict savanna','Hilltop rock-art sites'],sourceUrl:'https://whc.unesco.org/en/list/1147/'},
 COG:{features:['Congolese forest','Forest-savanna transition','Forest regeneration'],sourceUrl:'https://whc.unesco.org/en/list/692/'},
 GIN:{features:['Mountain slopes','Dense forest','Grassy mountain pastures'],sourceUrl:'https://whc.unesco.org/en/list/155/'},
 BFA:{features:['Stone walls','Fortified enclosures','Archaeological settlement'],sourceUrl:'https://whc.unesco.org/en/list/1225/'},
 LSO:{features:['Basaltic buttresses','Sandstone cliffs','Rock shelters and paintings'],sourceUrl:'https://whc.unesco.org/en/list/985/'},
 SGP:{landmarkKind:'forest',features:['Tropical botanic garden','Historic plantings and buildings','Plant conservation setting'],sourceUrl:'https://whc.unesco.org/en/list/1483/'},
 LAO:{features:['Lao urban architecture','Colonial-era buildings','Preserved townscape'],sourceUrl:'https://whc.unesco.org/en/list/479/'},
 KOR:{features:['Buddhist temple','Woodblock depository buildings','Mount Gaya setting'],shapeHints:{roof:'tiered'},sourceUrl:'https://whc.unesco.org/en/list/737/'},
 NZL:{features:['Glaciated fjords','Rocky coasts and cliffs','Lakes and waterfalls'],sourceUrl:'https://whc.unesco.org/en/list/551/'},
 DJI:{landmarkName:'Lake Assal',landmarkKind:'wetland',features:['Salt lake','White salt and gypsum shoreline','Arid volcanic depression'],biome:'desert',palette:{stone:'#d3d0b9',accent:'#65ced2',foliage:'#94865e'},sourceUrl:'https://guide.visitdjibouti.dj/explorer-ce-quil-faut-voir/explorer-3/sites-touristiques-naturels/le-lac-assal/',discoveryKind:'showcase',discoveryText:'Lake Assal occupies an arid volcanic depression in Djibouti. Salt and gypsum create a pale shoreline beside turquoise water and dark volcanic ground.'},
 SWZ:{landmarkName:'Sibebe Rock',landmarkKind:'mountain',features:['Exposed granite dome','Rounded rocky slopes','Grassy and wooded clefts'],sourceUrl:'https://www.thekingdomofeswatini.com/central-eswatini/sibebe-rock/',discoveryKind:'showcase',discoveryText:'Sibebe Rock is a large exposed granite dome near Mbabane. Rounded rock surfaces are interrupted by grassy and wooded clefts, making it a distinctive Eswatini landscape.'},
 KWT:{landmarkName:'Kuwait Towers',landmarkKind:'tower',features:['Three slender waterfront towers','Spheres on two towers','Blue-green mosaic sphere surfaces'],shapeHints:{towers:3},palette:{stone:'#d6d0ba',roof:'#5d9a9c',accent:'#58a4a6'},sourceUrl:'https://www.e.gov.kw/sites/kgoenglish/Pages/Visitors/TourismInKuwait/ActivitiesInKuwaitAttractiveSpots.aspx',discoveryKind:'showcase',discoveryText:'Kuwait Towers form a group of three slender structures beside the waterfront. Spheres on two of the towers, clad with blue-green mosaic surfaces, make their silhouette recognisable.'},
 TON:{landmarkName:'Ha\'amonga \'a Maui trilithon',landmarkKind:'ruins',features:['Coral-limestone slabs','Two upright stones','Horizontal lintel'],sourceUrl:'https://whc.unesco.org/en/tentativelists/5167/',discoveryKind:'showcase',discoveryText:'Ha\'amonga \'a Maui is a stone trilithon on Tongatapu near Niutoua. Two coral-limestone uprights support a horizontal lintel. It forms part of the Ancient Capitals nomination on the Tentative List; its possible astronomical purpose remains uncertain.'},
 TLS:{landmarkName:'Cristo Rei, Dili',landmarkKind:'tower',features:['Statue with outstretched arms','Globe pedestal','Cape Fatucama hilltop'],sourceUrl:'https://timorleste.tl/tet/destinations/cristo-rei',discoveryKind:'showcase',discoveryText:'Cristo Rei stands on a globe at Cape Fatucama overlooking Dili Bay. Its outstretched arms, hilltop position and approaching stairway distinguish the monument and its coastal setting.'},
 TUV:{landmarkName:'Funafuti Conservation Area',landmarkKind:'island',features:['Atoll reef and lagoon','Low wooded islets','Coral-sand beaches'],sourceUrl:'https://kaupulefunafuti.tv/conservation-area',discoveryKind:'showcase',discoveryText:'Funafuti Conservation Area protects part of the western atoll, including reef, lagoon and low wooded islets. Coral-sand beaches and marine habitats form a representative Tuvalu setting.'},
};

// Only evidence-supported labels are selected; there are no invented national
// animals, flowers, costumes, food traditions or landmark dimensions.
const rules=[
 [/onion.{0,15}domes?/i,'Onion-shaped domes'],[/mud[ -]?brick|adobe|earthen architecture/i,'Earthen architecture'],
 [/stepped|step pyramid/i,'Stepped construction'],[/rock.hewn|rock.cut/i,'Rock-cut structures'],[/limestone/i,'Limestone formations'],[/sandstone/i,'Sandstone surfaces'],[/granite/i,'Granite rock'],
 [/timber|wooden buildings|wooden architecture/i,'Timber buildings'],[/brickwork|brick buildings|brick architecture/i,'Brickwork'],[/gothic/i,'Gothic architecture'],[/baroque/i,'Baroque architecture'],[/romanesque/i,'Romanesque architecture'],[/byzantine/i,'Byzantine architecture'],
 [/minaret/i,'Minaret'],[/mosque/i,'Mosque architecture'],[/pagoda/i,'Pagodas'],[/stupa/i,'Stupas'],[/cathedral/i,'Cathedral architecture'],[/church/i,'Church buildings'],[/monaster/i,'Monastic buildings'],[/palace/i,'Palatial buildings'],[/castle/i,'Castle structures'],[/fortif|fortress/i,'Fortified structures'],[/bridge/i,'Bridge crossing'],[/terrace/i,'Terraced landscape'],[/\btowers?\b/i,'Towers'],[/basilica/i,'Basilica'],[/cupola/i,'Cupola'],[/courtyard/i,'Courtyards'],[/arcades|blind arches/i,'Arcades and arches'],[/balconies/i,'Balconies'],[/walled enclosure|defensive walls|ramparts/i,'Defensive walls'],[/stone buildings/i,'Stone buildings'],[/wood.framed|wooden houses/i,'Timber structures'],[/\bwharf\b/i,'Wharf setting'],[/burial mounds/i,'Burial mounds'],
 [/rainforest|tropical forest/i,'Tropical forest'],[/coral|reef/i,'Reef environment'],[/\bglaciers?\b|\bglacial (?:landscape|valley|lake|erosion)/i,'Glacial landscape'],[/cave/i,'Cave formations'],[/rock art|rock.paintings|petroglyph|engravings/i,'Rock art'],[/cliff/i,'Cliff setting'],[/coast|maritime/i,'Coastal setting'],[/\bharbou?rs?\b(?!\s+(?:a|an|the|one|many|several)\b)|\bports?\b/i,'Harbour setting'],[/archipelago|atoll|islands?/i,'Island setting'],[/savann/i,'Savanna landscape'],[/grassland/i,'Grassland'],[/wetland|marsh|swamp/i,'Wetlands'],[/\bdeserts?\b/i,'Desert setting'],[/dunes?/i,'Dunes'],[/mountain/i,'Mountain setting'],[/valley/i,'Valley setting'],[/rivers?/i,'River setting'],[/waterfalls?|cataract/i,'Waterfalls'],[/volcan/i,'Volcanic landscape'],[/lakes?/i,'Lake setting'],[/gardens?/i,'Gardens'],[/forest|woodland/i,'Forested landscape'],[/archaeolog|ruins|remains/i,'Archaeological remains'],[/historic.{0,20}(?:town|city)|old town/i,'Historic urban fabric'],
];
const palettes={
 alpine:{stone:'#b2b9be',roof:'#586a74',accent:'#e3b84c',foliage:'#65836a'},
 forest:{stone:'#b9b1a2',roof:'#a76b4c',accent:'#d7b16a',foliage:'#3d784e'},
 desert:{stone:'#d6b075',roof:'#9a6548',accent:'#55b7b0',foliage:'#768f49'},
 tropical:{stone:'#b0a387',roof:'#8c5144',accent:'#e8bc64',foliage:'#36764a'},
 coastal:{stone:'#c1bba8',roof:'#bd7858',accent:'#7bd8df',foliage:'#4c8d61'},
 grassland:{stone:'#c6ac8d',roof:'#9b6342',accent:'#deba5f',foliage:'#94a653'},
 temperate:{stone:'#c6bdaa',roof:'#a65e4b',accent:'#cba553',foliage:'#5b8c5b'},
};
const profiles=countries.map(country=>{
 const discovery=byCode.get(country.code);if(!discovery||!kinds[country.code])throw Error('Missing country profile: '+country.code);
 const custom=special[country.code]||{};
 if(custom.discoveryText){
  discovery.landmark=custom.landmarkName||discovery.landmark;discovery.title=discovery.landmark;discovery.text=custom.discoveryText;discovery.sourceUrl=custom.sourceUrl;discovery.kind=custom.discoveryKind||'heritage';discovery.challengeQuestion='Which country are you exploring on this route?';discovery.answer=country.name;
  delete discovery.inscriptionYear;
  if(custom.heritageId)discovery.heritageId=custom.heritageId;else if(custom.discoveryKind==='showcase'){delete discovery.heritageId;delete discovery.shared;}
 }
 const reference=byId.get(String(discovery.heritageId)),haystack=[discovery.landmark,reference?.short_description_en||''].join(' ');
 const landmarkName=custom.landmarkName||discovery.landmark;
 const features=custom.features||rules.filter(([pattern])=>pattern.test(haystack)).map(([,label])=>label).slice(0,3);
 if(discovery.kind==='capital'&&!custom.features)features.push('Named capital or administrative seat','Civic route illustration','Country reference facts');
 if(!features.length)features.push(discovery.kind==='heritage'?'Source-listed cultural landscape':'Named place');
 const landmarkKind=custom.landmarkKind||kinds[country.code];
 let biome=custom.biome||country.biome;
 if(landmarkKind==='glacier')biome='alpine';else if(landmarkKind==='rainforest')biome='tropical';else if(landmarkKind==='desert'||country.code==='EGY')biome='desert';else if(landmarkKind==='savanna')biome='grassland';
 const palette={...palettes[biome],...custom.palette};
 if(features.includes('Earthen architecture')){palette.stone='#b98762';palette.roof='#8d5f43';}
 if(features.includes('Brickwork'))palette.stone='#b77351';
 const shapeHints={};
 if(/domed|domes?|cupola/i.test(haystack))shapeHints.roof='dome';else if(/pagoda|tiered roof/i.test(haystack))shapeHints.roof='tiered';else if(/gabled|gable roof/i.test(haystack))shapeHints.roof='gable';else if(/flat.roof/i.test(haystack))shapeHints.roof='flat';else if(/spire/i.test(haystack))shapeHints.roof='spire';
 Object.assign(shapeHints,custom.shapeHints||{});
 const titles={JPN:'Cherry Blossom Path',ITA:'Ancient Rome: Colosseum Adventure',EGY:'Pyramids of Giza: Desert Adventure',BRA:'Amazon Rainforest Expedition',CAN:'Rocky Mountains: Alpine Adventure',AUS:'Great Barrier Reef: Tropical Coast Adventure',IND:'Taj Mahal: Garden Journey',ZAF:'Savanna Wildlife Adventure',NOR:'Northern Fjords: Mountain and Ice Adventure',FRA:'Paris: Eiffel Tower Rooftop Adventure',USA:'New York Harbor Adventure'};
 return{code:country.code,levelTitle:titles[country.code]||(landmarkName.length>60?landmarkName.slice(0,57)+'…':landmarkName)+' Route',landmarkName,landmarkKind,palette,features:[...new Set(features)].slice(0,3),biome,sourceUrl:custom.sourceUrl||discovery.sourceUrl,representation:'stylized',mediaSearch:landmarkName+' '+country.name,...(Object.keys(shapeHints).length?{shapeHints}:{})};
});
if(profiles.length!==193||new Set(profiles.map(p=>p.code)).size!==193)throw Error('Expected 193 unique country profiles');
profiles.push({code:'ANTARCTICA',levelTitle:'Polar Research Trail',landmarkName:'Antarctic research expedition',landmarkKind:'research-station',palette:{stone:'#b7d7ea',roof:'#426e8c',accent:'#e8b252',foliage:'#c7e5ec'},features:['Ice landscape','Research station illustration','Peace and science'],biome:'alpine',sourceUrl:'https://www.dfat.gov.au/international-relations/antarctic-treaty-system',representation:'stylized',mediaSearch:'Antarctica research station'});
const output={reviewed:'2026-10-27',source:'UNESCO World Heritage Centre via UNESCO Datahub; country facts from Mohammed Le Doze and contributors; government, tourism, protected-area, monument-operator and scientific sources linked per record.',license:'UNESCO-derived facts CC BY-SA 4.0; country reference facts ODbL 1.0. Original trait labels and rendering classifications indicate changes.',representation:'Every country has a source-linked named natural or cultural place. These places are represented by stylized scene archetypes, not scans or measured reconstructions. Palettes are art direction, not verified historical paint colours. No invented monument identity or national stereotype is substituted for a source-linked place.',profiles};
fs.writeFileSync(path.join(root,'public/world-explorer/data/profiles.json'),JSON.stringify(output,null,2)+'\n');
discoveries.license='CC BY-SA 4.0 for UNESCO-derived factual metadata; ODbL 1.0 for country reference metadata. Original teaching notes and per-place primary sources are identified individually.';
fs.writeFileSync(path.join(root,'public/world-explorer/data/discoveries.json'),JSON.stringify(discoveries,null,2)+'\n');
console.log('Built '+profiles.length+' profiles: 193 country places and the Antarctic bonus.');
