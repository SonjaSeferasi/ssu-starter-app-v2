import snapshot from '../../public/world-explorer/data/countries.json';

export type ContinentId = 'africa' | 'europe' | 'asia' | 'north-america' | 'south-america' | 'oceania' | 'antarctica';
export type Biome = 'alpine' | 'forest' | 'desert' | 'tropical' | 'coastal' | 'grassland' | 'temperate';
export type Country = {
  code: string;
  iso2: string;
  name: string;
  officialName: string;
  continent: ContinentId;
  subregion: string;
  capital: string[];
  languages: string[];
  currencies: string[];
  lat: number;
  lng: number;
  flag: string;
  /** A representative art direction, not a claim that a country has one biome. */
  biome: Biome;
  landmark: string;
  description: string;
  sources: string[];
};

export const countries: readonly Country[] = snapshot as Country[];
const byCode = new Map(countries.map(country => [country.code, country]));
export function countryByCode(code: string | null | undefined): Country | undefined {
  return typeof code === 'string' ? byCode.get(code.toUpperCase()) : undefined;
}
export function countriesForContinent(id: ContinentId): Country[] {
  return countries.filter(country => country.continent === id);
}

export type Continent = { id: ContinentId; name: string; description: string; color: string; count: number };
const details: Omit<Continent, 'count'>[] = [
  { id: 'africa', name: 'Africa', description: 'Explore coastal routes, highlands, forests and desert landscapes.', color: '#e9b851' },
  { id: 'europe', name: 'Europe', description: 'Travel through mountains, forests and historic cities.', color: '#9bc4df' },
  { id: 'asia', name: 'Asia', description: 'Discover vast mountain ranges, island chains and ancient cities.', color: '#e599ab' },
  { id: 'north-america', name: 'North America', description: 'Includes Northern America, Central America and the Caribbean.', color: '#87bf94' },
  { id: 'south-america', name: 'South America', description: 'Follow the Andes, tropical forests and Atlantic coastlines.', color: '#8dc7af' },
  { id: 'oceania', name: 'Oceania', description: 'Cross Australia, New Zealand and the Pacific island countries.', color: '#76ced6' },
  { id: 'antarctica', name: 'Antarctica', description: 'One bonus expedition across the ice; Antarctica has no countries.', color: '#d8effb' },
];
export const continents: readonly Continent[] = details.map(continent => ({ ...continent, count: countriesForContinent(continent.id).length }));

export const geographicPolicy = {
  countryScope: '193 United Nations Member States',
  grouping: 'UN M49 regions, splitting the Americas into North America (Northern America, Central America and Caribbean) and South America. Each country occurs once.',
  transcontinental: 'Statistical groupings assign Russia to Europe and Türkiye, Cyprus, Armenia, Azerbaijan, Georgia and Kazakhstan to Asia. These assignments do not describe all of their physical territory.',
  bonus: 'Antarctica is a separate expedition, not a 194th country.',
  art: 'Country scenery is a stylized representative route, not a complete model of a country or its environments.',
  snapshotDate: '2026-10-27',
  membershipSource: 'https://research.un.org/en/unmembers/currentmembers',
  groupingSource: 'https://unstats.un.org/unsd/methodology/m49/overview/',
} as const;
