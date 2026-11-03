/** Oceania: one playable adventure per country (Australia keeps its existing
 * level), each set at the place its source describes. Most are UNESCO World
 * Heritage listings; where the design manifest names a place that is not
 * inscribed (Buada Lagoon, To Sua, Ha'amonga 'a Maui, the Funafuti
 * Conservation Area), the fact says so and the source is the cited reference.
 * Facts are paraphrased from those sources and checked against
 * review/oceania/site-sources.json and site-overrides.json. The jumping routes
 * and their mechanisms are fictional and never climb or alter the real places.
 * Tier, archetype and signature mechanic follow the design manifest. */
import type {Biome} from './catalog';

export type OceaniaScene={
 terrain:'atoll'|'reef'|'volcanic'|'limestone-islets'|'highlands'|'mountains'|'town';
 water:'lagoon'|'sea'|'lake'|'swamp'|'fiord'|'pool';
 vegetation:'coconut'|'pandanus'|'rainforest'|'mangrove'|'beech'|'garden'|'scrub';
 town?:'colonial'|'thatch';
 landmark:string;
};
export type OceaniaPlace={iso2:string;title:string;landmark:string;tier:1|2|3|4|5;archetype:string;signature:string;biome:Biome;
 source:string;features:[string,string,string];fact:string;question:string;answer:string;mediaSearch:string;photoSubject:string;
 palette:{ground:string;rock:string;stone:string;roof:string;accent:string;foliage:string;sky:string};scene:OceaniaScene;
 /** How the manifest mechanic is shown at this place when its usual look would not fit (for review). */
 interpretation?:string};

const built='The jumping route is fictional and never climbs the real monument.';
const wild='The jumping route is fictional; the real place is scenery only.';
export const oceaniaPlaces={
 FJI:{iso2:'FJ',title:'Levuka: Harbour Wharf',landmark:'Levuka Historical Port Town',tier:2,archetype:'harbour-crane-docks',signature:'moving-platform',biome:'coastal',source:'https://whc.unesco.org/en/list/1399/',
  features:['Wooden shopfronts along the waterfront','Harbour wharf','Forested hills of Ovalau'],
  fact:`Levuka, on the east coast of Ovalau, grew into a trading port from the 1820s and became Fiji's first colonial capital after the islands were ceded to Britain in 1874. It was inscribed in 2013 as a rare late-colonial port town shaped by both Fijian and colonial ways of building. ${built}`,
  question:"Which town was Fiji's first colonial capital?",answer:'Levuka, on Ovalau.',mediaSearch:'Levuka town',photoSubject:'Levuka',
  palette:{ground:'#7a9a52',rock:'#4e5248',stone:'#e8e0cc',roof:'#b0504a',accent:'#2f8aa0',foliage:'#2f6a36',sky:'#8cc6e8'},scene:{terrain:'town',water:'sea',vegetation:'coconut',town:'colonial',landmark:'levuka-waterfront'},
  interpretation:'Moving platforms are cargo pallets carried by harbour cranes.'},
 KIR:{iso2:'KI',title:'Phoenix Islands: Ocean Atolls',landmark:'Phoenix Islands Protected Area',tier:1,archetype:'island-hopping',signature:'moving-platform',biome:'coastal',source:'https://whc.unesco.org/en/list/1325/',
  features:['Low coral atolls','Deep blue open ocean','Seabird colonies'],
  fact:`The Phoenix Islands Protected Area in Kiribati covers about 408,250 km² of the central Pacific, one of the largest marine protected areas on Earth. When it was inscribed in 2010 it was the largest and deepest World Heritage site. ${wild}`,
  question:'What made the Phoenix Islands stand out when they were inscribed?',answer:'They were the largest and deepest World Heritage site.',mediaSearch:'Phoenix Islands Kiribati',photoSubject:'Phoenix',
  palette:{ground:'#e6d6a8',rock:'#9a8e78',stone:'#d8ccae',roof:'#8a7a56',accent:'#2fb0c0',foliage:'#4f8a3e',sky:'#86c8ec'},scene:{terrain:'atoll',water:'sea',vegetation:'coconut',landmark:'phoenix-atoll'},
  interpretation:'Moving platforms are drifting outrigger canoes.'},
 MHL:{iso2:'MH',title:'Bikini Atoll: Quiet Lagoon',landmark:'Bikini Atoll Nuclear Test Site',tier:1,archetype:'coastal-boardwalk-tides',signature:'water-hazard',biome:'coastal',source:'https://whc.unesco.org/en/list/1339/',
  features:['Ring of 23 coral islands','Wide central lagoon','Sunken ships of the test fleet'],
  fact:`Bikini Atoll in the Marshall Islands is a ring of 23 islands around a large lagoon. After the Second World War the United States used it for nuclear weapons tests and moved its 167 inhabitants away. It was inscribed in 2010 as a reminder of the dawn of the nuclear age. ${wild}`,
  question:'How many people lived on Bikini before they were moved away?',answer:'167.',mediaSearch:'Bikini Atoll',photoSubject:'Bikini',
  palette:{ground:'#e2d4ac',rock:'#8a8070',stone:'#cfc4aa',roof:'#7a6a50',accent:'#2fa8c0',foliage:'#4a8240',sky:'#8cc8ea'},scene:{terrain:'atoll',water:'lagoon',vegetation:'coconut',landmark:'bikini-lagoon'}},
 FSM:{iso2:'FM',title:'Nan Madol: Basalt Islets',landmark:'Nan Madol: Ceremonial Centre of Eastern Micronesia',tier:1,archetype:'palace-garden-terraces',signature:'bounce-pad',biome:'coastal',source:'https://whc.unesco.org/en/list/1503/',
  features:['Walls of stacked basalt columns','Canals between the islets','Mangrove shores of Pohnpei'],
  fact:`Nan Madol, off the south-east shore of Pohnpei, is a group of artificial islets built from basalt and coral boulders and linked by canals. It was the capital of the Saudeleur dynasty until about 1628, and was inscribed in 2016, at once on the List of World Heritage in Danger. ${built}`,
  question:'Which dynasty ruled from Nan Madol?',answer:'The Saudeleur dynasty.',mediaSearch:'Nan Madol basalt',photoSubject:'Nan Madol',
  palette:{ground:'#5e7a44',rock:'#34343a',stone:'#4a4a50',roof:'#7a6a4a',accent:'#2f9a9a',foliage:'#2c5e34',sky:'#94c4dc'},scene:{terrain:'volcanic',water:'lagoon',vegetation:'mangrove',landmark:'nan-madol-walls'},
  interpretation:'Bounce pads are drawn as springy woven mats on mangrove roots.'},
 NRU:{iso2:'NR',title:'Buada Lagoon: Island Lake',landmark:'Buada Lagoon',tier:2,archetype:'wetland-stilt-walk',signature:'collapsing-ledge',biome:'coastal',source:'https://en.wikipedia.org/wiki/Buada_Lagoon',
  features:['Landlocked waterbody','Coconut palms and gardens','Coral pinnacles of the plateau'],
  fact:`Buada Lagoon, in the south-west of Nauru, is a small landlocked lake of about 3.8 hectares, fed by rain; despite its name it is not joined to the sea. Nauru has no World Heritage site and no officially designated capital. ${wild}`,
  question:'Is Buada Lagoon joined to the sea?',answer:'No. It is a landlocked lake fed by rain.',mediaSearch:'Buada Lagoon Nauru',photoSubject:'Buada',
  palette:{ground:'#7e9a4c',rock:'#a8a090',stone:'#c4bca8',roof:'#8a6a4a',accent:'#3f9a8a',foliage:'#2f6a36',sky:'#90c8e8'},scene:{terrain:'reef',water:'lake',vegetation:'coconut',landmark:'buada-pinnacles'},
  interpretation:'Collapsing ledges are crumbling coral-limestone pinnacles.'},
 NZL:{iso2:'NZ',title:'Te Wāhipounamu: Glacier Country',landmark:'Te Wahipounamu – South West New Zealand',tier:5,archetype:'glacier-crevasse-crossing',signature:'ice-surface',biome:'coastal',source:'https://whc.unesco.org/en/list/551/',
  features:['Glaciers below Aoraki / Mount Cook','Fiords and waterfalls','Southern beech rainforest'],
  fact:`Te Wāhipounamu, "the place of greenstone", covers 26,000 km² of south-west New Zealand and takes in four national parks, among them Aoraki / Mount Cook and Fiordland. Its glaciers, fiords and forests hold some of the best living examples of the plants and animals of ancient Gondwana. ${wild}`,
  question:'What does Te Wāhipounamu mean?',answer:'"The place of greenstone".',mediaSearch:'Fox Glacier New Zealand',photoSubject:'Glacier',
  palette:{ground:'#6a8a4a',rock:'#5e5e60',stone:'#8a8a8a',roof:'#5a5040',accent:'#d8a84a',foliage:'#2f5a34',sky:'#94c0e6'},scene:{terrain:'mountains',water:'fiord',vegetation:'beech',landmark:'aoraki-glacier'}},
 PLW:{iso2:'PW',title:'Rock Islands: Mushroom Isles',landmark:'Rock Islands Southern Lagoon',tier:1,archetype:'island-hopping',signature:'moving-platform',biome:'coastal',source:'https://whc.unesco.org/en/list/1386/',
  features:['Forested limestone islets','Turquoise lagoon','Marine lakes with jellyfish'],
  fact:`The Rock Islands Southern Lagoon in Palau has 445 uninhabited limestone islands, many undercut by the sea into mushroom shapes. Its 52 marine lakes, more than anywhere else, hold animals such as jellyfish found nowhere else. It was inscribed in 2012. ${wild}`,
  question:'How many marine lakes are in the Rock Islands Southern Lagoon?',answer:'52, more than anywhere else in the world.',mediaSearch:'Rock Islands Palau',photoSubject:'Rock Islands',
  palette:{ground:'#5e8a44',rock:'#b8b4a4',stone:'#d0ccbc',roof:'#7a6a4a',accent:'#2fc0c0',foliage:'#2c6a34',sky:'#8ccaea'},scene:{terrain:'limestone-islets',water:'lagoon',vegetation:'rainforest',landmark:'rock-islands'},
  interpretation:'Moving platforms are small boats between the islets.'},
 PNG:{iso2:'PG',title:'Kuk: Ancient Garden Swamp',landmark:'Kuk Early Agricultural Site',tier:2,archetype:'wetland-stilt-walk',signature:'moving-platform',biome:'forest',source:'https://whc.unesco.org/en/list/887/',
  features:['Swamp gardens and drainage ditches','Wahgi Valley highlands','Banana and taro plots'],
  fact:`Kuk lies about 1,500 metres above sea level in Papua New Guinea’s highlands. Cultivation mounds and drainage ditches preserve evidence of changing agricultural practices over at least 7,000 years, possibly 10,000. The site also provides evidence of independent agricultural development. ${wild}`,
  question:'How old is the earliest evidence of farming drainage at Kuk?',answer:'About 9,000 years.',mediaSearch:'Kuk swamp',photoSubject:'Kuk',
  palette:{ground:'#6a8a44',rock:'#5a5446',stone:'#8a7a5e',roof:'#9a8650',accent:'#d8a84a',foliage:'#2f6232',sky:'#a6c4d4'},scene:{terrain:'highlands',water:'swamp',vegetation:'garden',town:'thatch',landmark:'kuk-ditches'},
  interpretation:'Moving platforms are floating log rafts on the drainage channels.'},
 WSM:{iso2:'WS',title:'To Sua: Ocean Trench',landmark:'To Sua Ocean Trench',tier:1,archetype:'wetland-stilt-walk',signature:'water-hazard',biome:'coastal',source:'https://showcaves.com/english/other/karst/ToSua.html',
  features:['Pool in a collapsed lava tube','Wooden ladder down','Gardens on the coastal lava field'],
  fact:`To Sua, near Lotofaga on the south coast of Upolu, is a deep hole about 30 m deep in an old lava field, where sea water flows in through underwater tunnels. Visitors climb down a wooden ladder to swim. It is not a World Heritage site. ${wild}`,
  question:'How does sea water reach To Sua?',answer:'Through underwater tunnels from the ocean.',mediaSearch:'To Sua Ocean Trench',photoSubject:'To Sua',
  palette:{ground:'#6a9a4a',rock:'#3a3a3c',stone:'#5a5650',roof:'#8a6a4a',accent:'#2fc0b8',foliage:'#2f6e36',sky:'#8ccaea'},scene:{terrain:'volcanic',water:'pool',vegetation:'garden',landmark:'to-sua-trench'}},
 SLB:{iso2:'SB',title:'East Rennell: Lake Tegano',landmark:'East Rennell',tier:1,archetype:'coastal-boardwalk-tides',signature:'water-hazard',biome:'coastal',source:'https://whc.unesco.org/en/list/854/',
  features:['Lake Tegano, the former lagoon','Raised coral cliffs','Dense island forest'],
  fact:`East Rennell is the southern part of Rennell Island, the largest raised coral atoll in the world. Around Lake Tegano, its old lagoon, live many species found nowhere else. The site has been on the List of World Heritage in Danger since 2013 because of logging. ${wild}`,
  question:'What kind of island is Rennell?',answer:"The world's largest raised coral atoll.",mediaSearch:'Lake Tegano Rennell',photoSubject:'Rennell',
  palette:{ground:'#6a8a48',rock:'#a8a28e',stone:'#c4bca4',roof:'#7a6a4a',accent:'#3faa9a',foliage:'#2a5e32',sky:'#94c6e4'},scene:{terrain:'reef',water:'lake',vegetation:'rainforest',landmark:'tegano-lake'}},
 TON:{iso2:'TO',title:"Ha'amonga 'a Maui: Stone Gateway",landmark:"Ha'amonga 'a Maui trilithon",tier:1,archetype:'courtyard-arcades',signature:'pressure-plate',biome:'coastal',source:'https://whc.unesco.org/en/tentativelists/5167/',
  features:['Two upright stones','Coral limestone lintel','Historical park in Niutōua'],
  fact:`Ha'amonga 'a Maui, "the burden of Maui", is a stone gateway on eastern Tongatapu built in the 13th century under King Tu'itātui: two coral limestone pillars about 5 m high carry a stone lintel. It is on UNESCO's Tentative List, not the World Heritage List. ${built}`,
  question:"What does Ha'amonga 'a Maui mean?",answer:'"The burden of Maui".',mediaSearch:"Ha'amonga 'a Maui",photoSubject:'Maui',
  palette:{ground:'#7a9a4c',rock:'#9a9484',stone:'#c8c0a8',roof:'#8a6a4a',accent:'#c9443c',foliage:'#2f6a36',sky:'#90c6e6'},scene:{terrain:'reef',water:'sea',vegetation:'coconut',landmark:'trilithon'}},
 TUV:{iso2:'TV',title:'Funafuti: Lagoon Islets',landmark:'Funafuti Conservation Area',tier:1,archetype:'island-hopping',signature:'water-hazard',biome:'coastal',source:'https://en.wikipedia.org/wiki/Funafuti_Conservation_Area',
  features:['Low sandy islets','Shallow lagoon and reef','Turtle nesting beaches'],
  fact:`The Funafuti Conservation Area covers 33 km² of reef, lagoon and islets on the western side of Funafuti atoll in Tuvalu. Its islets are nesting sites for green sea turtles. It is not a World Heritage site. ${wild}`,
  question:'Which turtles nest on the islets of the Funafuti Conservation Area?',answer:'Green sea turtles.',mediaSearch:'Funafuti lagoon',photoSubject:'Funafuti',
  palette:{ground:'#ece0b4',rock:'#a09884',stone:'#d8ceb0',roof:'#7a6a4e',accent:'#2fbac4',foliage:'#4a8a3e',sky:'#88caec'},scene:{terrain:'atoll',water:'lagoon',vegetation:'pandanus',landmark:'funafuti-motu'}},
 VUT:{iso2:'VU',title:"Roi Mata's Domain: Three Islands",landmark:'Chief Roi Mata’s Domain',tier:1,archetype:'coastal-boardwalk-tides',signature:'bounce-pad',biome:'coastal',source:'https://whc.unesco.org/en/list/1280/',
  features:['Fels Cave on Lelepa','Eretoka, the burial island','Village site on Efate'],
  fact:`Chief Roi Mata's Domain covers three sites on Efate, Lelepa and Eretoka linked to Roi Mata, a chief who lived around 1600, the last of a long line of chiefs with that title. The places of his home, death and burial were inscribed in 2008. ${built}`,
  question:"On how many islands are the Roi Mata sites?",answer:'Three: Efate, Lelepa and Eretoka.',mediaSearch:'Eretoka Hat Island Vanuatu',photoSubject:'Eretoka',
  palette:{ground:'#6a9a4a',rock:'#5a564a',stone:'#8a826a',roof:'#9a8650',accent:'#d8a84a',foliage:'#2c6634',sky:'#8ec8e8'},scene:{terrain:'volcanic',water:'sea',vegetation:'coconut',town:'thatch',landmark:'eretoka-hat'},
  interpretation:'Bounce pads are drawn as outrigger floats.'},
} satisfies Record<string,OceaniaPlace>;
export type OceaniaCode=keyof typeof oceaniaPlaces;
export const oceaniaCodes=Object.keys(oceaniaPlaces) as OceaniaCode[];
