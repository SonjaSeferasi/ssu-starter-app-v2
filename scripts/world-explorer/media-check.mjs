// Asks the running app's guide-photo route for each country, one at a time,
// and records what it returns:
//   node scripts/world-explorer/media-check.mjs --codes JPN,FJI --base http://127.0.0.1:3100 --pause 1500 --out <file.json>
// The route looks the photograph up on Wikimedia Commons from the server and
// caches the answer in that server process: a found photograph for a day, a
// failed or empty lookup for an hour. Run it against a freshly started server
// so earlier failures are not served from the cache. Nothing is filled in: a
// country with no photograph is recorded with the route's response.
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,value,i,all)=>value.startsWith('--')?[...pairs,[value.slice(2),all[i+1]]]:pairs,[]));
const codes=(args.codes||'JPN').split(','),base=args.base||'http://127.0.0.1:3100',pause=Number(args.pause||1500),out=args.out;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const results={};
for(const code of codes){
 const started=Date.now();let record;
 try{const response=await fetch(`${base}/api/world-explorer/media/${code}`);const body=response.ok?await response.json().catch(()=>null):null;const image=body?.image??body;
  record={status:response.status,found:!!image?.url,title:image?.title||null,license:image?.license||null,ms:Date.now()-started};}
 catch(error){record={status:'error',found:false,error:String(error.message||error),ms:Date.now()-started};}
 results[code]=record;console.log(code,record.found?'OK  '+record.title:'NONE status '+record.status,`${record.ms} ms`);
 await wait(pause);
}
if(out){mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify({checkedAt:new Date().toISOString(),base,results},null,1));}
