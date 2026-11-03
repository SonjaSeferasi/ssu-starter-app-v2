// Check, against live Wikimedia Commons, which photograph a country guide would
// show: the same search (mediaSearch), the same title rule (the photo subject's
// words, accents folded, must appear in the file name) and the same licence
// rule as lib/world-explorer/media.ts.
//   node scripts/world-explorer/photo-check.mjs <places.json> <out.json>
// places.json: {"<CODE>":{"mediaSearch":"…","photoSubject":"…","place":"…"}}
// A country with no acceptable photograph is reported as such, never filled in.
import {readFileSync,writeFileSync} from 'node:fs';

const [,,input,output]=process.argv,places=JSON.parse(readFileSync(input,'utf8'));
const wait=ms=>new Promise(r=>setTimeout(r,ms)),fold=t=>String(t).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const plain=v=>typeof v==='string'?v.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim():'';
const stop=['with','from','city','historic','national','complex','heritage'];
const result={checkedAt:new Date().toISOString(),source:'https://commons.wikimedia.org/w/api.php',countries:{}};
for(const [code,p] of Object.entries(places)){
 const params=new URLSearchParams({action:'query',format:'json',formatversion:'2',generator:'search',gsrnamespace:'6',gsrlimit:'4',gsrsearch:`${p.mediaSearch} filetype:bitmap`,prop:'imageinfo',iiprop:'url|mime|extmetadata',iiurlwidth:'640',maxlag:'5'});
 let chosen=null,candidates=[],error=null;
 for(let attempt=0;attempt<3&&!chosen&&!candidates.length;attempt++){
  try{const response=await fetch('https://commons.wikimedia.org/w/api.php?'+params,{headers:{Accept:'application/json','User-Agent':'SocialUWorldExplorer/1.0 (https://github.com/SonjaSeferasi/ssu-starter-app-v2; educational landmark previews)'}});
   const json=await response.json();if(json.error){error=json.error.info;await wait(4000);continue;}
   const words=fold(p.photoSubject).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>3&&!stop.includes(w));
   for(const page of json.query?.pages||[]){
    const title=plain(page.title.replace(/^File:/,'')),info=page.imageinfo?.[0]||{},license=plain(info.extmetadata?.LicenseShortName?.value),author=plain(info.extmetadata?.Artist?.value);
    const hits=words.filter(w=>fold(title).includes(w)).length,blocked=/\b(aircraft|grumman|hawkeyes?|helicopters?|fighter|airliner|fly past|locator|screenshot|logo|postage stamp|spherical panorama)\b/i.test(title);
    const ok=!blocked&&hits>=Math.min(2,words.length)&&['image/jpeg','image/png','image/webp'].includes(info.mime)&&!!author&&/^(CC BY(?:-SA)? \d\.\d|CC0(?: 1\.0)?|Public domain)$/i.test(license);
    candidates.push({title,hits,license,ok});if(ok&&!chosen)chosen={title,license,pageUrl:info.descriptionurl};
   }
  }catch(e){error=String(e);await wait(4000);}
 }
 result.countries[code]={place:p.place,mediaSearch:p.mediaSearch,photoSubject:p.photoSubject,chosen,candidates,error};
 console.log(code.padEnd(4),chosen?`OK  ${chosen.title} (${chosen.license})`:`NONE ${error||''} candidates: ${candidates.map(c=>c.title).join(' | ').slice(0,160)}`);
 await wait(1500);
}
writeFileSync(output,JSON.stringify(result,null,1));
