import {countries,countryByCode,countriesForContinent,type ContinentId} from './world-explorer/catalog';

/** Device fallback and an account-scoped cache. A successful local write alone
 * must never be described as a successful account save. */
export const STORAGE_KEY='socialu.world-explorer.v1';
export const ANTARCTICA_LEVEL='ANTARCTICA';
export type CountryProgress={completed:boolean;bestCoins:number;attempts:number;starsEarned:number;discoveredFactIds:string[];completedAt?:string;bestTimeMs?:number};
export type ExplorerProgress={version:1;countries:Record<string,CountryProgress>;accountId?:string};
export type ExplorerRunResult={completed:boolean;coins:number;stars?:number;elapsedMs?:number;discoveryFound?:boolean};
type ReadStorage=Pick<Storage,'getItem'>;
type WriteStorage=Pick<Storage,'setItem'>;

export function emptyExplorerProgress():ExplorerProgress{return{version:1,countries:{}};}
function localStore(){try{return typeof localStorage==='undefined'?undefined:localStorage;}catch{return undefined;}}
function record(value:unknown):value is Record<string,unknown>{return typeof value==='object'&&value!==null&&!Array.isArray(value);}
function counter(value:unknown,max:number){return typeof value==='number'&&Number.isFinite(value)&&value>=0?Math.min(max,Math.floor(value)):0;}
function validLevel(code:string){return code===ANTARCTICA_LEVEL||(code===code.toUpperCase()&&!!countryByCode(code));}
export function discoveryIdFor(code:string){const key=code.toUpperCase(),country=countryByCode(key);return key==='JPN'?'mount-fuji':key===ANTARCTICA_LEVEL?'antarctic-science':country?country.iso2.toLowerCase()+'-discovery':undefined;}
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
function timestamp(value:unknown){if(typeof value!=='string')return;const n=Date.parse(value);if(Number.isFinite(n)&&n>=946684800000&&n<4133980800000)return new Date(n).toISOString();}
function emptyCountry():CountryProgress{return{completed:false,bestCoins:0,attempts:0,starsEarned:0,discoveredFactIds:[]};}
function keyFor(progress:ExplorerProgress){return progress.accountId?`${STORAGE_KEY}:account:${progress.accountId}`:STORAGE_KEY;}

/** Treat browser storage as untrusted, versioned input rather than casting JSON. */
export function sanitizeExplorerProgress(raw:unknown):ExplorerProgress{
 const clean=emptyExplorerProgress();
 if(!record(raw)||raw.version!==1||!record(raw.countries))return clean;
 if(uuid(raw.accountId))clean.accountId=raw.accountId.toLowerCase();
 for(const [code,value] of Object.entries(raw.countries)){
  if(!validLevel(code)||!record(value))continue;
  const completed=value.completed===true,completedAt=completed?timestamp(value.completedAt):undefined,bestTimeMs=completed?counter(value.bestTimeMs,86400000):0;
  clean.countries[code]={completed,bestCoins:counter(value.bestCoins,10000),attempts:counter(value.attempts,1000000),starsEarned:counter(value.starsEarned,3),discoveredFactIds:Array.isArray(value.discoveredFactIds)&&value.discoveredFactIds.includes(discoveryIdFor(code))?[discoveryIdFor(code)!]:[],...(completedAt?{completedAt}:{}),...(bestTimeMs?{bestTimeMs}:{})};
 }
 return clean;
}
export function loadExplorerProgress(storage:ReadStorage|undefined=localStore()):ExplorerProgress{
 if(!storage)return emptyExplorerProgress();
 try{const saved=storage.getItem(STORAGE_KEY);return saved?sanitizeExplorerProgress(JSON.parse(saved)):emptyExplorerProgress();}catch{return emptyExplorerProgress();}
}
export function saveExplorerProgress(progress:ExplorerProgress,storage:WriteStorage|undefined=localStore()):boolean{
 if(!storage)return false;
 try{const safe=sanitizeExplorerProgress(progress);storage.setItem(keyFor(safe),JSON.stringify(safe));return true;}catch{return false;}
}
export function loadAccountDeviceProgress(accountId:string,storage:ReadStorage|undefined=localStore()):ExplorerProgress{
 if(!uuid(accountId)||!storage)return emptyExplorerProgress();
 try{const raw=storage.getItem(`${STORAGE_KEY}:account:${accountId.toLowerCase()}`),safe=raw?sanitizeExplorerProgress(JSON.parse(raw)):emptyExplorerProgress();return safe.accountId===accountId.toLowerCase()?safe:emptyExplorerProgress();}catch{return emptyExplorerProgress();}
}
/** Merge snapshots without inflating retries or replacing best results. A known
 * different account's device cache is never imported into the incoming owner. */
export function mergeExplorerProgress(local:ExplorerProgress,incoming:ExplorerProgress):ExplorerProgress{
 const left=sanitizeExplorerProgress(local),right=sanitizeExplorerProgress(incoming),result=emptyExplorerProgress();
 if(right.accountId)result.accountId=right.accountId;else if(left.accountId)result.accountId=left.accountId;
 const allowedLeft=left.accountId&&right.accountId&&left.accountId!==right.accountId?emptyExplorerProgress():left;
 for(const code of new Set([...Object.keys(allowedLeft.countries),...Object.keys(right.countries)])){
  const a=allowedLeft.countries[code]||emptyCountry(),b=right.countries[code]||emptyCountry(),times=[a.bestTimeMs,b.bestTimeMs].filter((n):n is number=>!!n),dates=[a.completedAt,b.completedAt].filter((d):d is string=>!!d).sort();
  result.countries[code]={completed:a.completed||b.completed,bestCoins:Math.max(a.bestCoins,b.bestCoins),attempts:Math.max(a.attempts,b.attempts),starsEarned:Math.max(a.starsEarned,b.starsEarned),discoveredFactIds:[...new Set([...a.discoveredFactIds,...b.discoveredFactIds])],...(dates.length?{completedAt:dates[0]}:{}),...(times.length?{bestTimeMs:Math.min(...times)}:{})};
 }
 return result;
}
export function recordCountryResult(previous:ExplorerProgress,code:string,result:ExplorerRunResult):ExplorerProgress{
 const progress=sanitizeExplorerProgress(previous),key=code.toUpperCase();
 if(!validLevel(key))return progress;
 const before=progress.countries[key]||emptyCountry(),elapsedMs=result.completed===true?counter(result.elapsedMs,86400000):0;
 progress.countries[key]={...before,completed:before.completed||result.completed===true,bestCoins:Math.max(before.bestCoins,counter(result.coins,10000)),attempts:Math.min(1000000,before.attempts+1),starsEarned:Math.max(before.starsEarned,counter(result.stars,3)),discoveredFactIds:result.discoveryFound===true?[discoveryIdFor(key)!]:before.discoveredFactIds,...(result.completed===true&&!before.completedAt?{completedAt:new Date().toISOString()}:{}),...(elapsedMs?{bestTimeMs:Math.min(before.bestTimeMs||elapsedMs,elapsedMs)}:{})};
 return progress;
}
/** Antarctica has one bonus expedition, not one country. */
export function continentProgress(progress:ExplorerProgress,id:ContinentId|'antarctica'){
 const saved=sanitizeExplorerProgress(progress);
 if(id==='antarctica')return{completed:saved.countries[ANTARCTICA_LEVEL]?.completed?1:0,total:1};
 const assigned=countriesForContinent(id);
 return{completed:assigned.filter(country=>saved.countries[country.code]?.completed).length,total:assigned.length};
}
export function overallProgress(progress:ExplorerProgress){
 const saved=sanitizeExplorerProgress(progress);
 return{completed:countries.filter(country=>saved.countries[country.code]?.completed).length,total:countries.length};
}
