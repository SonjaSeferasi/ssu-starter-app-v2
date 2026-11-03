// Finds guide-photo candidates that the app's own filter accepts, for a person
// (or reviewer) to look at before a file is pinned in verified-photos.json:
//   node_modules/.bin/vite-node scripts/world-explorer/photo-candidates.run.ts --plan <plan.json> --out <folder>
// plan.json: {"CODE":[["search terms","alias"],…],…}. For each search it asks
// Commons for ten files, keeps those commonsImage() accepts for the alias
// (licence, attribution, safe hosts, alias words in the title) and saves a
// 320 px thumbnail of the first three per country to <out>/<code>-<n>.jpg.
// Busy answers (HTTP 429/503, maxlag, search too busy) are retried with a pause.
// Nothing is pinned here: candidates.json lists what was found.
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {commonsImage} from '../../lib/world-explorer/media';

const args=Object.fromEntries(process.argv.slice(2).reduce<string[][]>((p,v,i,a)=>v.startsWith('--')?[...p,[v.slice(2),a[i+1]]]:p,[]));
const plan=JSON.parse(readFileSync(args.plan,'utf8')) as Record<string,[string,string][]>,out=args.out as string;mkdirSync(out,{recursive:true});
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms)),agent={'User-Agent':'SocialUWorldExplorer/1.0 (guide photo verification; https://github.com/SonjaSeferasi/ssu-starter-app-v2)'};
async function ask(params:URLSearchParams){
 for(let attempt=0;attempt<6;attempt++){
  // A network error is treated like a busy answer: wait and ask again.
  const r=await fetch('https://commons.wikimedia.org/w/api.php?'+params,{headers:agent}).catch(()=>null);if(!r){await wait(4000*(attempt+1));continue;}const body:any=r.ok?await r.json().catch(()=>null):null;
  if(r.status===429||r.status===503||['maxlag','cirrussearch-too-busy-error'].includes(body?.error?.code)){await wait(4000*(attempt+1));continue;}
  return body;
 }
 return null;
}
const found:Record<string,unknown[]>={};
for(const [code,searches] of Object.entries(plan)){
 const accepted:{search:string;alias:string;title:string;license:string;author:string;pageUrl:string;url:string}[]=[];
 for(const [search,alias] of searches){
  const body=await ask(new URLSearchParams({action:'query',format:'json',formatversion:'2',generator:'search',gsrnamespace:'6',gsrlimit:'10',gsrsearch:`${search} filetype:bitmap`,prop:'imageinfo',iiprop:'url|mime|extmetadata',iiurlwidth:'320',maxlag:'5'}));
  for(const page of body?.query?.pages??[]){const image=commonsImage({query:{pages:[page]}},alias);if(image&&!accepted.some(a=>a.title===image.title))accepted.push({search,alias,title:image.title,license:image.license,author:image.author.slice(0,80),pageUrl:image.pageUrl,url:image.url});}
  await wait(2500);
 }
 found[code]=accepted;
 for(const [i,a] of accepted.slice(0,3).entries()){const r=await fetch(a.url,{headers:agent}).catch(()=>null);if(r?.ok)writeFileSync(join(out,`${code.toLowerCase()}-${i+1}.jpg`),Buffer.from(await r.arrayBuffer()));await wait(800);}
 console.log(code,accepted.length,'accepted:',accepted.slice(0,3).map((a,i)=>`[${i+1}] ${a.title} (${a.license})`).join(' | '));
}
writeFileSync(join(out,'candidates.json'),JSON.stringify({checkedAt:new Date().toISOString(),found},null,1));
