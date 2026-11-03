import {describe,it,expect,vi,beforeEach} from 'vitest';
import {countries,countryByCode} from '../lib/world-explorer/catalog';
import {ANTARCTICA_LEVEL,STORAGE_KEY,emptyExplorerProgress,sanitizeExplorerProgress,loadExplorerProgress,saveExplorerProgress,recordCountryResult,continentProgress,overallProgress} from '../lib/world-explorer-progress';
import {fetchCountryFacts} from '../lib/world-explorer/providers';
import {GET} from '../app/api/world-explorer/countries/[code]/route';
import {discoveryFor} from '../lib/world-explorer-discoveries';
vi.mock('../lib/world-explorer/providers',()=>({fetchCountryFacts:vi.fn(),fetchCountriesDevFacts:vi.fn().mockResolvedValue(null)}));

describe('World Explorer browser passport',()=>{
 it('keeps successful country stamps and best coins through retries without mutating previous state',()=>{
  const empty=emptyExplorerProgress(),first=recordCountryResult(empty,'JPN',{completed:true,coins:6}),retry=recordCountryResult(first,'JPN',{completed:false,coins:2});
  expect(empty.countries).toEqual({});expect(first.countries.JPN).toMatchObject({completed:true,bestCoins:6,attempts:1,starsEarned:0,discoveredFactIds:[]});
  expect(retry.countries.JPN).toMatchObject({completed:true,bestCoins:6,attempts:2});
 });
 it('rejects territories, unknown IDs, malformed saves and forged truthy completion values',()=>{
  const progress=sanitizeExplorerProgress({version:1,countries:{JPN:{completed:'true',bestCoins:-4,attempts:Infinity},USA:{completed:true,bestCoins:4.9,attempts:3},ATA:{completed:true},ZZZ:{completed:true},XKX:{completed:true},PSE:{completed:true},VAT:{completed:true}}});
  expect(Object.keys(progress.countries).sort()).toEqual(['JPN','USA']);expect(progress.countries.JPN).toMatchObject({completed:false,bestCoins:0,attempts:0,starsEarned:0,discoveredFactIds:[]});
  expect(progress.countries.USA).toMatchObject({completed:true,bestCoins:4,attempts:3});expect(sanitizeExplorerProgress({version:2,countries:progress.countries})).toEqual(emptyExplorerProgress());
 });
 it('counts each of the 193 UN members once and treats Antarctica as a bonus expedition',()=>{
  let progress=emptyExplorerProgress();for(const country of countries)progress=recordCountryResult(progress,country.code,{completed:true,coins:0});
  progress=recordCountryResult(progress,ANTARCTICA_LEVEL,{completed:true,coins:3});
  expect(overallProgress(progress)).toEqual({completed:193,total:193});expect(continentProgress(progress,'antarctica')).toEqual({completed:1,total:1});
  const japan=countryByCode('JPN')!;expect(continentProgress(progress,japan.continent).completed).toBe(continentProgress(progress,japan.continent).total);
 });
 it('stores only the dedicated passport key and reloads validated state',()=>{
  const values=new Map<string,string>(),storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
  const progress=recordCountryResult(emptyExplorerProgress(),'KEN',{completed:true,coins:4});expect(saveExplorerProgress(progress,storage)).toBe(true);
  expect([...values.keys()]).toEqual([STORAGE_KEY]);expect(loadExplorerProgress(storage)).toEqual(progress);
 });
 it('handles blocked, missing and corrupt storage without claiming a successful save',()=>{
  expect(loadExplorerProgress({getItem:()=>'{broken'})).toEqual(emptyExplorerProgress());expect(loadExplorerProgress({getItem:()=>{throw new Error('blocked');}})).toEqual(emptyExplorerProgress());
  expect(saveExplorerProgress(emptyExplorerProgress(),{setItem:()=>{throw new Error('quota');}})).toBe(false);
 });
});

describe('World Explorer reference endpoint',()=>{
 beforeEach(()=>{vi.mocked(fetchCountryFacts).mockReset();});
 it('keeps bundled play available when the optional reference service is unavailable',async()=>{
  vi.mocked(fetchCountryFacts).mockRejectedValue(new Error('offline'));
  const response=await GET(new Request('http://localhost/api/world-explorer/countries/JPN'),{params:{code:'JPN'}}),body=await response.json();
  expect(response.status).toBe(200);expect(body.country.code).toBe('JPN');expect(body.live).toBeNull();expect(body.source).toBe('bundled');
 });
 it('publishes optional provider facts separately from the fixed membership record',async()=>{
  const live={code:'JPN',capital:'Tokyo',latitude:35.6,longitude:139.6,sourceUrl:'https://api.worldbank.org/v2/country/JPN?format=json',retrievedAt:'2026-10-27T12:00:00Z',provider:'world-bank' as const};
  vi.mocked(fetchCountryFacts).mockResolvedValue(live);
  const response=await GET(new Request('http://localhost/api/world-explorer/countries/jpn'),{params:{code:'jpn'}}),body=await response.json();
  expect(body.country.code).toBe('JPN');expect(body.live).toEqual(live);expect(body.source).toBe('world-bank');expect(response.headers.get('cache-control')).toContain('max-age=600');
 });
 it('does not send arbitrary URLs, non-members or the Antarctic expedition to an upstream provider',async()=>{
  for(const code of ['ANTARCTICA','ATA','VAT','PSE','XKX','TWN','https://evil.test','JPN/../../USA']){
   const response=await GET(new Request('http://localhost/api/world-explorer/countries/test'),{params:{code}});expect(response.status).toBe(404);
  }
  expect(fetchCountryFacts).not.toHaveBeenCalled();
 });
});

describe('World Explorer country discoveries',()=>{
 it('provides a named, sourced place and teaching prompt for every country without calling capitals World Heritage sites',()=>{
  for(const country of countries){const discovery=discoveryFor(country.code);expect(discovery?.landmark.length).toBeGreaterThan(1);expect(discovery?.text.length).toBeGreaterThan(20);expect(discovery?.sourceUrl).toMatch(/^https:\/\//);expect(discovery?.challengeQuestion.length).toBeGreaterThan(5);expect(discovery?.kind).not.toBe('capital');}
  expect(discoveryFor('NRU')?.text).toContain('no officially designated capital');expect(discoveryFor('NRU')?.landmark).toBe('Buada Lagoon');expect(discoveryFor('NRU')?.kind).toBe('showcase');
 });
 it('keeps the Antarctic expedition outside country membership and has distinct sourced showcase learning',()=>{
  expect(discoveryFor('ANTARCTICA')?.kind).toBe('expedition');expect(countryByCode('ANTARCTICA')).toBeUndefined();expect(discoveryFor('ZZZ')).toBeUndefined();
  expect(discoveryFor('JPN')?.answer).toBe('A stratovolcano.');expect(discoveryFor('FRA')?.answer).toBe('1889');expect(discoveryFor('USA')?.answer).toBe('France');
 });
});
