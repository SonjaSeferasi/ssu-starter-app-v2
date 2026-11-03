/* Rebuild after downloading countries-source.json and m49-source.html alongside
 * this script. The source files are public data; no credentials are involved.
 * See public/world-explorer/data/SOURCES.md for download URLs and licensing. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const metadata = JSON.parse(fs.readFileSync(path.join(__dirname, 'countries-source.json'), 'utf8'));
const html = fs.readFileSync(path.join(__dirname, 'm49-source.html'), 'utf8');
const members = `AFG AGO ALB AND ARE ARG ARM ATG AUS AUT AZE BDI BEL BEN BFA BGD BGR BHR BHS BIH BLR BLZ BOL BRA BRB BRN BTN BWA CAF CAN CHE CHL CHN CIV CMR COD COG COL COM CPV CRI CUB CYP CZE DEU DJI DMA DNK DOM DZA ECU EGY ERI ESP EST ETH FIN FJI FRA FSM GAB GBR GEO GHA GIN GMB GNB GNQ GRC GRD GTM GUY HND HRV HTI HUN IDN IND IRL IRN IRQ ISL ISR ITA JAM JOR JPN KAZ KEN KGZ KHM KIR KNA KOR KWT LAO LBN LBR LBY LCA LIE LKA LSO LTU LUX LVA MAR MCO MDA MDG MDV MEX MHL MKD MLI MLT MMR MNE MNG MOZ MRT MUS MWI MYS NAM NER NGA NIC NLD NOR NPL NRU NZL OMN PAK PAN PER PHL PLW PNG POL PRK PRT PRY QAT ROU RUS RWA SAU SDN SEN SGP SLB SLE SLV SMR SOM SRB SSD STP SUR SVK SVN SWE SWZ SYC SYR TCD TGO THA TJK TKM TLS TON TTO TUN TUR TUV TZA UGA UKR URY USA UZB VCT VEN VNM VUT WSM YEM ZAF ZMB ZWE`.split(' ');
if (members.length !== 193 || new Set(members).size !== 193) throw new Error('Expected exactly 193 UN member codes');
const clean = value => value.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&rsquo;/g, '\u2019').trim();
const table = html.match(/<table\s+id\s*=\s*"downloadTableEN"[\s\S]*?<\/table>/i)?.[0];
if (!table) throw new Error('UN M49 English table was not found');
const rows = new Map();
for (const row of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
  const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => clean(cell[1]));
  if (/^[A-Z]{3}$/.test(cells[11] || '')) rows.set(cells[11], cells);
}
const biomeGroups = {
  alpine: 'AFG ALB AND ARM AUT AZE BTN BIH BOL CHE CHL ETH GEO ISL KGZ LIE LSO MNE MKD NPL NOR PAK PER RUS SVK SVN TJK',
  desert: 'DZA BHR BWA DJI EGY ERI IRN IRQ ISR JOR KWT LBY MAR MRT MLI NAM NER OMN QAT SAU SDN SOM TCD TKM TUN ARE UZB YEM',
  forest: 'BLR CAN CAF CMR COD COG EST FIN GAB GIN GNQ GUY LAO LBR LTU LVA MMR PNG SLE SUR SWE',
  coastal: 'AUS BHS BRB CPV COM CYP DNK ESP FJI FSM GRC HRV IRL ITA KIR KNA LCA MDV MHL MLT MUS NRU NZL PLW PRT SGP SLB STP SYC TON TTO TUV VCT VUT WSM',
  grassland: 'ARG HUN KAZ KEN MDA MNG PRY ROU SRB SSD TZA UGA URY ZAF ZMB ZWE',
};
const chosenBiome = new Map(Object.entries(biomeGroups).flatMap(([biome,codes]) => codes.split(' ').map(code => [code,biome])));
const names = { TUR: 'Türkiye', CIV: 'Côte d’Ivoire', CPV: 'Cabo Verde', SWZ: 'Eswatini', MKD: 'North Macedonia', COD: 'Democratic Republic of the Congo', COG: 'Republic of the Congo' };
const highlights = {
  USA: {name:'Statue of Liberty',fact:'The Statue of Liberty stands in New York Harbor and was inaugurated in 1886.',url:'https://whc.unesco.org/en/list/307/'},
  FRA: {name:'Eiffel Tower',fact:'The Eiffel Tower was completed in Paris in 1889 for the World’s Fair.',url:'https://www.toureiffel.paris/en/the-monument/history'},
  BRA: {name:'Central Amazon rainforest',fact:'The Central Amazon Conservation Complex protects forests, lakes and river environments in Brazil.',url:'https://whc.unesco.org/en/list/998/'},
  EGY: {name:'Pyramids of Giza',fact:'The Giza pyramids are part of the Memphis and its Necropolis World Heritage property.',url:'https://whc.unesco.org/en/list/86/'},
  JPN: {name:'Mount Fuji',fact:'Mount Fuji is a stratovolcano whose landscape has inspired religious traditions and art.',url:'https://whc.unesco.org/en/list/1418/'},
  AUS: {name:'Sydney Opera House',fact:'The Sydney Opera House opened in 1973 and stands beside Sydney Harbour.',url:'https://whc.unesco.org/en/list/166/'},
};
function continent(cells) {
  if (cells[3] !== 'Americas') return cells[3].toLowerCase();
  return cells[7] === 'South America' ? 'south-america' : 'north-america';
}
const countries = members.map(code => {
  const item = metadata.find(record => record.cca3 === code), cells = rows.get(code);
  if (!item || !cells) throw new Error('Missing source record for ' + code);
  const name = names[code] || item.name.common;
  const subregion = cells[7] || cells[5];
  const capital = code === 'NRU' ? [] : [...item.capital];
  let capitalText = capital.length ? 'Capital' + (capital.length > 1 ? 's' : '') + ': ' + capital.join(', ') + '.' : 'No official capital; government offices are in Yaren district.';
  if (code === 'CHE') capitalText = 'Bern is the federal city and seat of government.';
  if (code === 'ISR') capitalText = 'Jerusalem is the declared capital; its status is disputed.';
  return {
    code, iso2: item.cca2, name, officialName: item.name.official,
    continent: continent(cells), subregion, capital,
    languages: Object.values(item.languages),
    currencies: code === 'FSM' ? ['USD — United States dollar'] : Object.entries(item.currencies).filter(([currency]) => !['KID','TVD'].includes(currency)).map(([currency, value]) => currency + ' — ' + value.name),
    lat: item.latlng[0], lng: item.latlng[1], flag: item.flag,
    biome: chosenBiome.get(code) || (Math.abs(item.latlng[0]) < 23.5 ? 'tropical' : 'temperate'),
    landmark: highlights[code]?.name || '',
    description: name + ' is grouped in ' + subregion + ' in UN M49. ' + capitalText + (highlights[code] ? ' ' + highlights[code].fact : ''),
    sources: ['https://research.un.org/en/unmembers/currentmembers', 'https://unstats.un.org/unsd/methodology/m49/overview/', 'https://github.com/mledoze/countries', ...(highlights[code] ? [highlights[code].url] : []), ...(code === 'FSM' ? ['https://www.six-group.com/en/products-services/financial-information/market-reference-data/data-standards.html'] : [])],
  };
}).sort((a,b) => a.name.localeCompare(b.name, 'en'));
const expected = { africa:54, europe:43, asia:47, 'north-america':23, 'south-america':12, oceania:14 };
for (const [id,count] of Object.entries(expected)) if (countries.filter(country => country.continent === id).length !== count) throw new Error('Unexpected M49 count for ' + id);
const output = path.join(root, 'public/world-explorer/data');
fs.writeFileSync(path.join(output, 'countries.json'), JSON.stringify(countries, null, 2) + '\n');
fs.writeFileSync(path.join(output, 'un-members.json'), JSON.stringify(members, null, 2) + '\n');
console.log('Generated ' + countries.length + ' countries. ' + JSON.stringify(expected));
