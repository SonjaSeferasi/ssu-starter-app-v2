import {afterEach,describe,expect,it,vi} from 'vitest';
import {countries,continents,countryByCode,countriesForContinent,geographicPolicy} from '../lib/world-explorer/catalog';
import members from '../public/world-explorer/data/un-members.json';

describe('World Explorer geographic scope',()=>{
  it('contains each of the 193 reviewed UN members exactly once, excluding observers and territories',()=>{
    expect(countries).toHaveLength(193);
    expect(new Set(countries.map(country=>country.code)).size).toBe(193);
    expect(new Set(countries.map(country=>country.iso2)).size).toBe(193);
    expect(countries.map(country=>country.code).sort()).toEqual([...members].sort());
    for(const code of ['VAT','PSE','TWN','XKX','KOS','GRL','PRI','ATA','ANTARCTICA']) expect(countryByCode(code)).toBeUndefined();
  });
  it('uses one explicit M49 assignment per country and keeps Antarctica out of the country count',()=>{
    expect(Object.fromEntries(continents.map(continent=>[continent.id,continent.count]))).toEqual({africa:54,europe:43,asia:47,'north-america':23,'south-america':12,oceania:14,antarctica:0});
    expect(continents.reduce((sum,continent)=>sum+continent.count,0)).toBe(193);
    expect(countriesForContinent('antarctica')).toEqual([]);
    expect(countryByCode('RUS')?.continent).toBe('europe');
    for(const code of ['TUR','CYP','GEO','ARM','AZE','KAZ']) expect(countryByCode(code)?.continent).toBe('asia');
    for(const code of ['MEX','BLZ','PAN','CUB','USA','CAN']) expect(countryByCode(code)?.continent).toBe('north-america');
    expect(geographicPolicy.bonus).toContain('not a 194th country');
  });
  it('has usable coordinates, facts, stable identifiers and attribution without invented landmark facts',()=>{
    for(const country of countries){
      expect(country.code).toMatch(/^[A-Z]{3}$/);expect(country.iso2).toMatch(/^[A-Z]{2}$/);
      expect(country.lat).toBeGreaterThanOrEqual(-90);expect(country.lat).toBeLessThanOrEqual(90);
      expect(country.lng).toBeGreaterThanOrEqual(-180);expect(country.lng).toBeLessThanOrEqual(180);
      expect(country.languages.length).toBeGreaterThan(0);expect(country.currencies.length).toBeGreaterThan(0);
      expect(country.sources).toContain(geographicPolicy.membershipSource);
      expect(country.sources).toContain(geographicPolicy.groupingSource);
      expect(country.description).toContain(country.subregion);
      expect(['alpine','forest','desert','tropical','coastal','grassland','temperate']).toContain(country.biome);
    }
    expect(countryByCode('NRU')?.capital).toEqual([]);
    expect(countryByCode('NRU')?.description).toContain('No official capital');
    expect(countryByCode('ZAF')?.capital).toHaveLength(3);
    expect(countryByCode('CHE')?.description).toContain('federal city');
    expect(countryByCode('ISR')?.description).toContain('disputed');
    expect(countryByCode('jpn')?.name).toBe('Japan');
    expect(countryByCode('FSM')?.currencies).toEqual(['USD — United States dollar']);
    expect(countryByCode('BGR')?.currencies[0]).toContain('EUR');
    expect(countryByCode('ZWE')?.currencies.some(currency=>currency.startsWith('ZWG'))).toBe(true);
    expect(countryByCode('JPN')?.landmark).toBe('Mount Fuji');
    expect(countryByCode('KIR')?.currencies).toEqual(['AUD — Australian dollar']);
    expect(countryByCode('TUV')?.currencies).toEqual(['AUD — Australian dollar']);
  });
});

afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});
describe('Optional free country facts provider',()=>{
  it('validates the returned country identity and caches a successful response',async()=>{
    const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify([{total:1},[{id:'JPN',capitalCity:'Tokyo',latitude:'35.67',longitude:'139.77'}]]),{status:200}));
    vi.stubGlobal('fetch',fetcher);
    const {fetchCountryFacts}=await import('../lib/world-explorer/providers');
    const facts=await fetchCountryFacts('jpn');
    expect(facts).toMatchObject({code:'JPN',capital:'Tokyo',provider:'world-bank',latitude:35.67,longitude:139.77});
    await fetchCountryFacts('JPN');expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe('https://api.worldbank.org/v2/country/JPN?format=json');
  });
  it('rejects nonmember input and wrong/aggregate responses without changing the offline catalog',async()=>{
    const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify([{},[{id:'WLD',capitalCity:'World'}]]),{status:200}));
    vi.stubGlobal('fetch',fetcher);
    const {fetchCountryFacts}=await import('../lib/world-explorer/providers');
    expect(await fetchCountryFacts('PSE')).toBeNull();expect(fetcher).not.toHaveBeenCalled();
    expect(await fetchCountryFacts('JPN')).toBeNull();expect(countries).toHaveLength(193);
  });
  it('returns a safe fallback on failed HTTP, malformed JSON or a network error',async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(new Response('unavailable',{status:503})).mockResolvedValueOnce(new Response('{}',{status:200})).mockRejectedValueOnce(new Error('offline'));
    vi.stubGlobal('fetch',fetcher);
    const {fetchCountryFacts}=await import('../lib/world-explorer/providers');
    expect(await fetchCountryFacts('JPN')).toBeNull();expect(await fetchCountryFacts('JPN')).toBeNull();expect(await fetchCountryFacts('JPN')).toBeNull();
    expect(countryByCode('JPN')?.capital).toContain('Tokyo');
  });
});
