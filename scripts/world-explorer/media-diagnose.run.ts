// Asks Commons directly, outside the app server, what each country's guide-photo
// search returns and whether the app's own filter accepts any of it:
//   npx vite-node scripts/world-explorer/media-diagnose.run.ts --codes NOR,FJI --out <file.json>
// Separates "the search finds no file whose title names the place" (content)
// from "Commons answered with an error or lag" (service). Read-only.
import {writeFileSync} from 'node:fs';
import {commonsImage} from '../../lib/world-explorer/media';
import {guideDestination} from '../../lib/world-explorer/guide-destination';
const args=Object.fromEntries(process.argv.slice(2).reduce<string[][]>((p,v,i,a)=>v.startsWith('--')?[...p,[v.slice(2),a[i+1]]]:p,[]));
const codes=String(args.codes||'NOR').split(','),out=args.out as string|undefined;
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const results:Record<string,unknown>={};
for(const code of codes){
 const d=guideDestination(code);if(!d){results[code]={error:'no destination'};continue;}
 const params=new URLSearchParams({action:'query',format:'json',formatversion:'2',generator:'search',gsrnamespace:'6',gsrlimit:'4',gsrsearch:`${d.mediaSearch} filetype:bitmap`,prop:'imageinfo',iiprop:'url|mime|extmetadata',iiurlwidth:'640',maxlag:'5'});
 let record:Record<string,unknown>={search:d.mediaSearch,subject:d.photoAliases??d.photoSubject};
 try{const r=await fetch('https://commons.wikimedia.org/w/api.php?'+params,{headers:{Accept:'application/json','User-Agent':'SocialUWorldExplorer/1.0 (acceptance diagnosis)'},signal:AbortSignal.timeout(10000)});
  const body:any=await r.json().catch(()=>null);const pages=body?.query?.pages??[];
  record={...record,status:r.status,apiError:body?.error?.code??null,titles:pages.map((p:any)=>p.title),accepted:commonsImage(body,d.photoAliases??d.photoSubject)?.title??null};}
 catch(e){record={...record,status:'error',error:String((e as Error).message)};}
 results[code]=record;console.log(code,record.status,record.apiError??'',record.accepted?'ACCEPTED '+record.accepted:'none of '+((record.titles as string[])?.length??0));
 await wait(Number(args.pause||1500));
}
if(out)writeFileSync(out,JSON.stringify({checkedAt:new Date().toISOString(),results},null,1));
