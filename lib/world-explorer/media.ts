import melanesiaMedia from '../../public/world-explorer/data/melanesia-media.json';
import westMedia from '../../public/world-explorer/data/west-asia-media.json';
import {countryByCode} from './catalog';
import {guideDestination} from './guide-destination';

export type LandmarkImage={title:string;url:string;pageUrl:string;author:string;license:string;licenseUrl:string;retrievedAt:string};
type CacheEntry={value:LandmarkImage|null;until:number};
const cache=new Map<string,CacheEntry>(),pending=new Map<string,Promise<LandmarkImage|null>>();
const HOUR=60*60*1000;
// Lookups from this server reach Commons at most four a second, never in a burst.
let lastTurn=Promise.resolve();
const paced=()=>{const turn=lastTurn.then(()=>new Promise<void>(resolve=>setTimeout(resolve,250)));lastTurn=turn;return turn;};
const plain=(value:unknown)=>typeof value==='string'?value.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').trim().slice(0,2000):'';
const object=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
function allowedUrl(value:unknown,hosts:string[]){try{const url=new URL(typeof value==='string'?value:'');return url.protocol==='https:'&&hosts.includes(url.hostname)?url.href:null;}catch{return null;}}
function licenceLink(value:string){try{const url=new URL(value);if(url.hostname==='creativecommons.org'&&url.protocol==='http:')url.protocol='https:';return allowedUrl(url.href,['creativecommons.org','commons.wikimedia.org']);}catch{return null;}}
function metadata(record:unknown,key:string){if(!object(record)||!object(record[key]))return '';return plain(record[key].value);}

/** Commons metadata is contributor supplied. Keep it as text, require an
 * explicit supported licence and retain author + source alongside the image. */
export function commonsImage(payload:unknown,subject:string|readonly string[]):LandmarkImage|null{
 if(!object(payload)||!object(payload.query)||!Array.isArray(payload.query.pages))return null;
 // Accents are folded on both sides, so "Galápagos" matches "Galapagos".
 const fold=(text:string)=>text.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
 // A destination must match in full; generic overlapping words such as
 // "management area" or "bird sanctuary" cannot identify a place. Aliases
 // are curated names, each of which must independently match whole tokens.
 const tokenize=(text:string)=>fold(text).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean);
 const stop=new Set(['the','of','and','in','at','with','from','historic','national','heritage']);
 const aliases=(typeof subject==='string'?[subject]:subject).map(name=>tokenize(name).filter(word=>!stop.has(word)));
 if(!aliases.length||aliases.some(words=>!words.length))return null;
 // generator=search does not list pages in rank order (formatversion 2 lists them
 // by page id); each page carries its search rank in `index`. Walk best first.
 const ranked=payload.query.pages.map((page,i)=>({page,i,rank:object(page)&&typeof page.index==='number'?page.index:Infinity})).sort((a,b)=>a.rank-b.rank||a.i-b.i).map(entry=>entry.page);
 for(const page of ranked){
  if(!object(page)||typeof page.title!=='string'||!Array.isArray(page.imageinfo)||!object(page.imageinfo[0]))continue;
  const info=page.imageinfo[0],title=plain(page.title.replace(/^File:/,''));
  if(/\b(aircraft|grumman|hawkeyes?|helicopters?|fighter|airliner|fly past|locator|screenshot|logo|postage stamp|spherical panorama)\b/i.test(title))continue;
  // Do not substitute a random travel image when the named place cannot be found.
  const titleWords=new Set(tokenize(title));
  if(!aliases.some(words=>words.every(word=>titleWords.has(word))))continue;
  if(!['image/jpeg','image/png','image/webp'].includes(String(info.mime)))continue;
  const license=metadata(info.extmetadata,'LicenseShortName'),publicDomain=/^Public domain$/i.test(license);
  // A public-domain file is often credited to an agency rather than an artist.
  const author=metadata(info.extmetadata,'Artist')||(publicDomain?metadata(info.extmetadata,'Credit'):'');
  const url=allowedUrl(info.thumburl||info.url,['upload.wikimedia.org','thumb.wikimedia.org']);
  const pageUrl=allowedUrl(info.descriptionurl,['commons.wikimedia.org']);
  // A public-domain file has no licence deed to link; its Commons page records why it is free.
  const licenseUrl=licenceLink(metadata(info.extmetadata,'LicenseUrl'))??(publicDomain?pageUrl:null);
  if(!author||author.length>500||title.length>400||!licenseUrl||!url||!pageUrl||!(/^(CC BY(?:-SA)? \d\.\d|CC0(?: 1\.0)?|Public domain)$/i.test(license)))continue;
  return{title,url,pageUrl,author,license,licenseUrl,retrievedAt:new Date().toISOString()};
 }
 return null;
}

/** Only catalogue country codes can start a request; no user URLs or arbitrary
 * search strings are accepted. Optional media never blocks the modeled level. */
export async function landmarkImage(code:string):Promise<LandmarkImage|null>{
 // A playable level's own destination when it has one, else the country profile.
 const reviewed=melanesiaMedia.records.find(record=>record.code===code.toUpperCase());
 if(reviewed)return reviewed.image;
 const fixed=westMedia.records.find(record=>record.code===code.toUpperCase());
 if(fixed)return fixed.image;
 const country=countryByCode(code),destination=country?guideDestination(country.code):undefined;
 if(!country||!destination)return null;
 const key=country.code,hit=cache.get(key);if(hit&&hit.until>Date.now())return hit.value;
 const active=pending.get(key);if(active)return active;
 const request=(async()=>{
  let value:LandmarkImage|null=null,answered=false;
  try{
   // A verified photo is asked for by its file title; otherwise the destination's search is used.
   const lookup:Record<string,string>=destination.photoFile?{titles:destination.photoFile}:{generator:'search',gsrnamespace:'6',gsrlimit:'4',gsrsearch:`${destination.mediaSearch} filetype:bitmap`};
   const params=new URLSearchParams({action:'query',format:'json',formatversion:'2',...lookup,prop:'imageinfo',iiprop:'url|mime|extmetadata',iiurlwidth:'640',maxlag:'5'});
   // Commons asks clients to back off when busy (HTTP 429/503, or a maxlag error): wait as told and try again, twice at most.
   for(let attempt=0;attempt<3&&!answered;attempt++){
    await paced();
    const response=await fetch('https://commons.wikimedia.org/w/api.php?'+params,{headers:{Accept:'application/json','User-Agent':'SocialUWorldExplorer/1.0 (https://github.com/SonjaSeferasi/ssu-starter-app-v2; educational landmark previews)'},signal:AbortSignal.timeout(5000),cache:'no-store'});
    const payload=response.ok?await response.json():null,busy=response.status===429||response.status===503||(object(payload)&&object(payload.error)&&['maxlag','cirrussearch-too-busy-error'].includes(String(payload.error.code)));
    if(busy){await new Promise(resolve=>setTimeout(resolve,Math.min(4000,1000*(attempt+1)*(Number(response.headers?.get?.('retry-after'))||1))));continue;}
    if(response.ok){value=commonsImage(payload,destination.photoAliases??destination.photoSubject);answered=true;}
    break;
   }
  }catch{/* A sourced text card and all 3D geometry remain usable. */}
  // A photo is kept for a day and a definite "no matching photo" for an hour; a
  // busy, failed or timed-out lookup only briefly, so a later visit tries again.
  cache.set(key,{value,until:Date.now()+(value?24*HOUR:answered?HOUR:2*60*1000)});return value;
 })();pending.set(key,request);
 try{return await request;}finally{pending.delete(key);}
}
