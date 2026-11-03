import {countryByCode} from './catalog';

/** Supplemental World Bank facts. Coordinates refer to the capital city and
 * must never replace the bundled country center used by the map. */
export type CountryFacts = {
  code: string;
  capital: string;
  latitude: number | null;
  longitude: number | null;
  sourceUrl: string;
  retrievedAt: string;
  provider: 'world-bank';
};
type CachedFacts = {facts: CountryFacts; expires: number};
const cache = new Map<string, CachedFacts>();
const inFlight = new Map<string, Promise<CountryFacts | null>>();
const DAY = 24 * 60 * 60 * 1000;
function coordinate(value: unknown, limit: number): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

/** No account, key, arbitrary host or user-provided URL is accepted. A missing
 * upstream record is normal: the immutable bundled catalog remains usable. */
export async function fetchCountryFacts(requestedCode: string): Promise<CountryFacts | null> {
  const country = countryByCode(requestedCode);
  if (!country) return null;
  const code = country.code, hit = cache.get(code);
  if (hit && hit.expires > Date.now()) return hit.facts;
  const pending = inFlight.get(code);
  if (pending) return pending;
  const request = (async () => {
    try {
      const sourceUrl = `https://api.worldbank.org/v2/country/${code}?format=json`;
      const response = await fetch(sourceUrl, {
        signal: AbortSignal.timeout(4000),
        headers: {Accept: 'application/json'},
        cache: 'no-store',
      });
      if (!response.ok) return null;
      const payload: unknown = await response.json();
      if (!Array.isArray(payload) || !Array.isArray(payload[1]) || payload[1].length !== 1) return null;
      const row: unknown = payload[1][0];
      if (!row || typeof row !== 'object') return null;
      const record = row as Record<string, unknown>;
      // The country API also contains territories and aggregate groupings.
      // Never trust their inclusion merely because the service returned 200.
      if (record.id !== code || typeof record.capitalCity !== 'string') return null;
      const capital = record.capitalCity.trim();
      if (!capital || capital.length > 180 || /[<>\u0000-\u001f]/.test(capital)) return null;
      const facts: CountryFacts = {
        code, capital, latitude: coordinate(record.latitude,90), longitude: coordinate(record.longitude,180),
        sourceUrl, retrievedAt: new Date().toISOString(), provider: 'world-bank',
      };
      cache.set(code,{facts,expires:Date.now()+DAY});
      return facts;
    } catch {
      return null;
    } finally {
      inFlight.delete(code);
    }
  })();
  inFlight.set(code,request);
  return request;
}

/** Optional keyless countries.dev metadata. Population and currencies are
 * deliberately not imported: those unversioned fields can lag current facts.
 * This response never changes the UN member set, map positions or local flags. */
export type CountriesDevFacts = {
  code: string;
  iso2: string;
  capital: string;
  languages: string[];
  flagPath: string;
  sourceUrl: string;
  retrievedAt: string;
  provider: 'countries.dev';
};
const countryApiCache = new Map<string,{facts:CountriesDevFacts;expires:number}>();
const countryApiPending = new Map<string,Promise<CountriesDevFacts|null>>();
const safeText=(value:unknown)=>typeof value==='string'&&value.trim().length<=180&&!/[<>\u0000-\u001f]/.test(value)?value.trim():'';

export async function fetchCountriesDevFacts(requestedCode:string):Promise<CountriesDevFacts|null> {
  const country=countryByCode(requestedCode);
  if(!country)return null;
  const code=country.code,hit=countryApiCache.get(code);
  if(hit&&hit.expires>Date.now())return hit.facts;
  const existing=countryApiPending.get(code);if(existing)return existing;
  const request=(async()=>{
    try{
      const sourceUrl=`https://countries.dev/alpha/${country.iso2}`;
      const response=await fetch(sourceUrl,{signal:AbortSignal.timeout(4000),headers:{Accept:'application/json'},cache:'no-store'});
      if(!response.ok)return null;
      const payload:unknown=await response.json();
      if(!payload||typeof payload!=='object'||Array.isArray(payload))return null;
      const row=payload as Record<string,unknown>;
      if(row.alpha3Code!==country.code||row.alpha2Code!==country.iso2)return null;
      const languages=Array.isArray(row.languages)?row.languages.slice(0,30).flatMap(language=>{
        if(!language||typeof language!=='object')return[];
        const name=safeText((language as Record<string,unknown>).name);return name?[name]:[];
      }):[];
      const facts:CountriesDevFacts={code,iso2:country.iso2,capital:safeText(row.capital),languages:[...new Set(languages)],flagPath:`/world-explorer/flags/${country.iso2.toLowerCase()}.svg`,sourceUrl,retrievedAt:new Date().toISOString(),provider:'countries.dev'};
      countryApiCache.set(code,{facts,expires:Date.now()+DAY});return facts;
    }catch{return null;}finally{countryApiPending.delete(code);}
  })();
  countryApiPending.set(code,request);return request;
}
