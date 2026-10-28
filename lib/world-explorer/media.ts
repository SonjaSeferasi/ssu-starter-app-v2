import {countryByCode} from './catalog';
import {countryProfile} from './profiles';

export type LandmarkImage={title:string;url:string;pageUrl:string;author:string;license:string;licenseUrl:string;retrievedAt:string};
type CacheEntry={value:LandmarkImage|null;until:number};
const cache=new Map<string,CacheEntry>(),pending=new Map<string,Promise<LandmarkImage|null>>();
const HOUR=60*60*1000;
const plain=(value:unknown)=>typeof value==='string'?value.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').trim().slice(0,2000):'';
const object=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
function allowedUrl(value:unknown,hosts:string[]){try{const url=new URL(typeof value==='string'?value:'');return url.protocol==='https:'&&hosts.includes(url.hostname)?url.href:null;}catch{return null;}}
function licenceLink(value:string){try{const url=new URL(value);if(url.hostname==='creativecommons.org'&&url.protocol==='http:')url.protocol='https:';return allowedUrl(url.href,['creativecommons.org','commons.wikimedia.org']);}catch{return null;}}
function metadata(record:unknown,key:string){if(!object(record)||!object(record[key]))return '';return plain(record[key].value);}

/** Commons metadata is contributor supplied. Keep it as text, require an
 * explicit supported licence and retain author + source alongside the image. */
export function commonsImage(payload:unknown,subject:string):LandmarkImage|null{
 if(!object(payload)||!object(payload.query)||!Array.isArray(payload.query.pages))return null;
 const words=subject.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>3&&!['with','from','city','historic','national','complex','heritage'].includes(w));
 if(!words.length)return null;
 for(const page of payload.query.pages){
  if(!object(page)||typeof page.title!=='string'||!Array.isArray(page.imageinfo)||!object(page.imageinfo[0]))continue;
  const info=page.imageinfo[0],title=plain(page.title.replace(/^File:/,''));
  if(/\b(aircraft|grumman|hawkeyes?|helicopters?|fighter|airliner|fly past|locator|screenshot|logo|postage stamp)\b/i.test(title))continue;
  // Do not substitute a random travel image when the named place cannot be found.
  const hits=words.filter(word=>title.toLowerCase().includes(word)).length;
  if(hits<Math.min(2,words.length))continue;
  if(!['image/jpeg','image/png','image/webp'].includes(String(info.mime)))continue;
  const author=metadata(info.extmetadata,'Artist'),license=metadata(info.extmetadata,'LicenseShortName');
  const licenseUrl=licenceLink(metadata(info.extmetadata,'LicenseUrl'));
  const url=allowedUrl(info.thumburl||info.url,['upload.wikimedia.org','thumb.wikimedia.org']);
  const pageUrl=allowedUrl(info.descriptionurl,['commons.wikimedia.org']);
  if(!author||author.length>500||title.length>400||!licenseUrl||!url||!pageUrl||!(/^(CC BY(?:-SA)? \d\.\d|CC0(?: 1\.0)?|Public domain)$/i.test(license)))continue;
  return{title,url,pageUrl,author,license,licenseUrl,retrievedAt:new Date().toISOString()};
 }
 return null;
}

/** Only catalogue country codes can start a request; no user URLs or arbitrary
 * search strings are accepted. Optional media never blocks the modeled level. */
export async function landmarkImage(code:string):Promise<LandmarkImage|null>{
 const country=countryByCode(code),profile=country?countryProfile(country.code):undefined;
 if(!country||!profile)return null;
 const key=country.code,hit=cache.get(key);if(hit&&hit.until>Date.now())return hit.value;
 const active=pending.get(key);if(active)return active;
 const request=(async()=>{
  let value:LandmarkImage|null=null;
  try{
   const params=new URLSearchParams({action:'query',format:'json',formatversion:'2',generator:'search',gsrnamespace:'6',gsrlimit:'4',gsrsearch:`${profile.mediaSearch} filetype:bitmap`,prop:'imageinfo',iiprop:'url|mime|extmetadata',iiurlwidth:'640',maxlag:'5'});
   const response=await fetch('https://commons.wikimedia.org/w/api.php?'+params,{headers:{Accept:'application/json','User-Agent':'SocialUWorldExplorer/1.0 (https://github.com/SonjaSeferasi/ssu-starter-app-v2; educational landmark previews)'},signal:AbortSignal.timeout(5000),cache:'no-store'});
   if(response.ok)value=commonsImage(await response.json(),profile.landmarkName);
  }catch{/* A sourced text card and all 3D geometry remain usable. */}
  cache.set(key,{value,until:Date.now()+(value?24*HOUR:HOUR)});return value;
 })();pending.set(key,request);
 try{return await request;}finally{pending.delete(key);}
}
