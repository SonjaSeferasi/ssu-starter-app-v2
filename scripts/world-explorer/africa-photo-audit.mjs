// Records the landmark-card photograph each African country actually gets from
// the running app, and why when it gets none.
//
//   node scripts/world-explorer/africa-photo-audit.mjs --base http://127.0.0.1:3117 --out tmp/africa-verify/photo-audit.json
//
// 1. Asks the app (GET /api/world-explorer/media/CODE). This is the real
//    selection: the same server code the card uses. The result is recorded as is.
// 2. Separately sends the same Commons search the app sends, and records for each
//    returned file its search rank ("index"), its position in the response and
//    what the filter would object to. That only explains a result; the app's
//    answer in step 1 is the selection.
// Uses only the network of this computer; nothing is written outside --out.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i>0?process.argv[i+1]:fallback;};
const base=arg('--base','http://127.0.0.1:3117'),out=arg('--out','tmp/africa-verify/photo-audit.json');
const here=dirname(fileURLToPath(import.meta.url));
const destinations=JSON.parse(readFileSync(join(here,'africa-photo-destinations.json'),'utf8'));
const UA='SocialUWorldExplorer/1.0 (https://github.com/SonjaSeferasi/ssu-starter-app-v2; educational landmark previews)';
const fold=t=>t.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const tokens=t=>fold(t).replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean);
// Mirrors commonsImage() in lib/world-explorer/media.ts: every word of one of the
// destination's names must appear as a whole word in the file title.
const stop=new Set(['the','of','and','in','at','with','from','historic','national','heritage']);
const why=(page,subjects)=>{
 const info=page.imageinfo?.[0],title=String(page.title||'').replace(/^File:/,''),objections=[];
 const have=new Set(tokens(title));
 const named=subjects.some(s=>{const w=tokens(s).filter(x=>!stop.has(x));return w.length>0&&w.every(x=>have.has(x));});
 if(!named)objections.push('title does not name the destination');
 if(/\b(aircraft|grumman|hawkeyes?|helicopters?|fighter|airliner|fly past|locator|screenshot|logo|postage stamp|spherical panorama)\b/i.test(title))objections.push('excluded word in title');
 if(!info)objections.push('no imageinfo');else{
  if(!['image/jpeg','image/png','image/webp'].includes(String(info.mime)))objections.push(`mime ${info.mime}`);
  const m=info.extmetadata||{},lic=String(m.LicenseShortName?.value||'').replace(/<[^>]*>/g,'').trim(),artist=String(m.Artist?.value||'').replace(/<[^>]*>/g,'').trim();
  if(!artist)objections.push('no Artist');else if(artist.length>500)objections.push('Artist over 500 characters');
  if(!/^(CC BY(?:-SA)? \d\.\d|CC0(?: 1\.0)?|Public domain)$/i.test(lic))objections.push(`licence "${lic||'none'}" not accepted`);
  if(!m.LicenseUrl?.value)objections.push('no licence URL');
 }
 return{title,index:page.index??null,mime:info?.mime??null,licence:info?.extmetadata?.LicenseShortName?.value??null,objections};
};

const results=[];
for(const d of destinations){
 const row={code:d.code,destination:d.place,mediaSearch:d.mediaSearch,subjects:d.subjects,pinnedFile:d.photoFile};
 try{
  const r=await fetch(`${base}/api/world-explorer/media/${d.code}`,{signal:AbortSignal.timeout(20000)});
  const body=await r.json();
  row.app={status:r.status,image:body.image??null};
 }catch(e){row.app={error:String(e?.message||e)};}
 try{
  const params=new URLSearchParams({action:'query',format:'json',formatversion:'2',generator:'search',gsrnamespace:'6',gsrlimit:'4',gsrsearch:`${d.mediaSearch} filetype:bitmap`,prop:'imageinfo',iiprop:'url|mime|extmetadata',iiurlwidth:'640',maxlag:'5'});
  const r=await fetch('https://commons.wikimedia.org/w/api.php?'+params,{headers:{Accept:'application/json','User-Agent':UA},signal:AbortSignal.timeout(15000)});
  if(!r.ok)row.commons={status:r.status};
  else{const j=await r.json();const pages=j?.query?.pages??[];row.commons={status:r.status,listedOrder:pages.map(p=>p.index??null),candidates:pages.map(p=>why(p,d.subjects))};}
 }catch(e){row.commons={error:String(e?.message||e)};}
 const img=row.app?.image;
 row.verdict=img?'SELECTED (review the picture)':row.app?.error?'APP REQUEST FAILED':row.commons?.error||row.commons?.status!==200?'NO IMAGE: Commons not reachable from this computer':row.commons.candidates.length===0?'NO IMAGE: search returned no files':'NO IMAGE: every returned file was rejected (see candidates)';
 results.push(row);
 console.log(`${d.code} ${row.verdict}${img?` | ${img.title} | ${img.author} | ${img.license}`:''}`);
 await new Promise(r=>setTimeout(r,400));
}
const ordered=results.filter(r=>r.commons?.listedOrder?.length>1);
const summary={when:new Date().toISOString(),base,countries:results.length,selected:results.filter(r=>r.app?.image).length,
 // Is the response listed in search-rank order? (Evidence for the ordering fix.)
 responsesListedOutOfRankOrder:ordered.filter(r=>r.commons.listedOrder.some((v,i,a)=>i&&v!==null&&a[i-1]!==null&&v<a[i-1])).map(r=>r.code),responsesWithIndex:ordered.length};
mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,JSON.stringify({summary,results},null,1)+'\n');
console.log(JSON.stringify(summary));
