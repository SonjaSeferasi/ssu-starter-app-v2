// Destination consistency for every listed adventure, read from the running app:
//   node --experimental-websocket scripts/world-explorer/destination-check.mjs --codes JPN,ECU --base http://localhost:3100
// For each country it reads, as a player sees them:
//   card  — /world-explorer?country=<CODE>: the level title, the landmark line,
//           the setting line and the photograph (file name or in-game capture);
//   run   — /world-explorer?country=<CODE>&play=1: the level title on the HUD;
//   guide — the Country guide dialog: capital, place, landscape and photograph.
// Then it checks that they describe the same place:
//   titleMatches  — the card and run screen show the same level title;
//   placeMatches  — the guide's place shares a name with the card's landmark line
//                   or the level title;
//   photoMatches  — the guide photograph's file name names that place
//                   (accents folded); no photograph is a fail, not a pass;
//   capitalShown  — the guide shows a capital (n/a for a country with none, such as Nauru);
//   a photograph that does not load is reported with the Wikimedia response codes seen.
// Consistency is all this can check. Whether the place, facts and photograph are
// right about the real country stays a human source review.
// Writes <out>/destination-check.json and screenshots to <out>/shots/.
import {spawn} from 'node:child_process';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const pins=JSON.parse(readFileSync('lib/world-explorer/verified-photos.json','utf8')).photos;
const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,value,i,all)=>value.startsWith('--')?[...pairs,[value.slice(2),all[i+1]]]:pairs,[]));
const codes=(args.codes||'ECU').split(','),base=args.base||'http://localhost:3100',out=args.out||'documentation/world-explorer/review/acceptance-67/destination';
const wait=ms=>new Promise(r=>setTimeout(r,ms)),port=9300+Math.floor(Math.random()*90);mkdirSync(join(out,'shots'),{recursive:true});
const child=spawn(args.browser||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${mkdtempSync(join(tmpdir(),'wx-dest-'))}`,'--enable-gpu','--use-angle=d3d11','--ignore-gpu-blocklist','--no-first-run','--mute-audio','about:blank'],{stdio:'ignore'});
let version;for(let i=0;i<50&&!version;i++){try{version=await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();}catch{await wait(200);}}
const socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map();// Wikimedia responses are recorded per country, so a photograph that did not load can be told apart from a refused or failed request.
let commons=[];socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m.result);pending.delete(m.id);}if(m.method==='Network.responseReceived'&&/wikimedia|wikipedia/.test(m.params.response.url))commons.push(m.params.response.status);if(m.method==='Network.loadingFailed'&&m.params.type!=='Document')commons.push('failed');});
const send=(method,params={},sessionId)=>new Promise(r=>{const n=++id;pending.set(n,r);socket.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});
const {targetId}=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
const page=(m,p)=>send(m,p,sessionId),evaluate=async x=>(await page('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true})).result?.value;
await page('Network.enable');await page('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
const fold=t=>String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const stop=new Set(['with','from','city','historic','national','complex','heritage','level','park','route','trail','site','the','and','of','de','la','del','island','islands','old','town','view','valley','river','lake','mount','grand']);
const words=t=>fold(t).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>3&&!stop.has(w));
const shares=(a,b)=>{const B=new Set(words(b));return words(a).filter(w=>B.has(w));};
// A file name may run words together ("Schlossvaduz.jpg"): a place word found inside it counts.
const named=(file,b)=>{const joined=fold(file).replace(/[^a-z0-9]/g,'');return[...new Set([...shares(file,b),...words(b).filter(w=>w.length>4&&joined.includes(w))])];};
const catalogue=JSON.parse(readFileSync('public/world-explorer/data/countries.json','utf8')),capitalExpected=code=>(catalogue.find(c=>c.code===code)?.capital||[]).length>0;
const report={base,checkedAt:new Date().toISOString(),levels:{}};
for(const code of codes){
 commons=[];await wait(Number(args.pause||0));
 // The card.
 await page('Page.navigate',{url:`${base}/world-explorer?country=${code}`});
 let card=null;for(let i=0;i<60&&!card;i++){await wait(250);card=await evaluate(`(()=>{const s=document.querySelector('section[aria-label="Selected destination"]');if(!s)return null;const p=s.querySelector('h3')?.nextElementSibling?.innerText||'';const img=s.querySelector('figure img');return{name:s.querySelector('h3')?.innerText||'',titleLine:p,title:p.split(' · ')[0],landmark:s.querySelector('[class*="landmarkNote"]')?.innerText.trim()||'',setting:s.querySelector('[class*="landmarkNote"]')?.nextElementSibling?.innerText||'',photo:img?{alt:img.alt,src:img.getAttribute('src')}:null};})()`);}
 for(let i=0;i<20&&card&&!card.photo;i++){await wait(300);card.photo=await evaluate(`(()=>{const img=document.querySelector('section[aria-label="Selected destination"] figure img');return img&&img.complete&&img.naturalWidth>0?{alt:img.alt,src:img.getAttribute('src')}:null;})()`);}
 // The run screen and its guide.
 await page('Page.navigate',{url:`${base}/world-explorer?country=${code}&play=1`});
 let ready=false;for(let i=0;i<200&&!ready;i++){ready=await evaluate(`!!document.querySelector('canvas[data-ready="true"]')`);if(!ready)await wait(150);}
 const runTitle=(await evaluate(`document.querySelector('[class*="playIdentity"] p')?.innerText||''`)||'').replace(/^Level 1:\s*/,'');
 const opened=await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Country guide');if(!b)return false;b.click();return true;})()`);
 let photo=null;for(let i=0;i<Number(args.photoWait||40)&&!photo;i++){await wait(250);photo=await evaluate(`(()=>{const img=document.querySelector('[role="dialog"] figure img');return img&&img.complete&&img.naturalWidth>0?{alt:img.alt,src:img.getAttribute('src'),caption:img.closest('figure')?.querySelector('figcaption')?.innerText||''}:null;})()`);}
 const facts=await evaluate(`(()=>{const out={};for(const div of document.querySelectorAll('[role="dialog"] dl div')){const dt=div.querySelector('dt')?.innerText,dd=div.querySelector('dd')?.innerText;if(dt)out[dt]=dd;}return out;})()`)||{};
 const {data}=await page('Page.captureScreenshot',{format:'jpeg',quality:70});const shot=`shots/guide-${code.toLowerCase()}.jpg`;writeFileSync(join(out,shot),Buffer.from(data,'base64'));
 const place=facts.Place||'',photoName=photo?(photo.caption.split('\n')[0]||photo.alt):'';
 const placeShared=[...shares(place,card?.landmark||''),...shares(place,runTitle)],photoShared=[...named(photoName,place),...named(photoName,runTitle),...named(photoName,card?.landmark||'')];
 const v=(ok,detail,ran=true)=>({result:ran?(ok?'pass':'fail'):'not-run',detail});
 // A verified pin (lib/world-explorer/verified-photos.json) counts only when the guide shows that exact file; its recorded reason is named.
 const pin=pins[code],pinned=!!pin&&!!photo&&fold(photoName).replace(/_/g,' ')===fold(pin.file.replace(/^File:/,'')).replace(/_/g,' ');
 report.levels[code]={card,runTitle,guide:{opened,capital:facts['Capital / seat']||'',place,landscape:facts.Landscape||'',photo},screenshot:shot,checks:{
  titleMatches:v(!!card&&!!runTitle&&card.title===runTitle,`card "${card?.title||'—'}" · run "${runTitle||'—'}"`,!!card&&ready),
  placeMatches:v(placeShared.length>0,`guide place "${place||'—'}" · card landmark "${card?.landmark||'—'}"${placeShared.length?' · shared: '+[...new Set(placeShared)].join(', '):''}`,opened),
  photoMatches:v(!!photo&&(photoShared.length>0||pinned),photo?`photo "${photoName}"${photoShared.length?' · shared: '+[...new Set(photoShared)].join(', '):pinned?` · verified pin (${pin.verified}): ${pin.why||pin.aliases.join(', ')}`:' names none of the place words'}`:`no photograph loaded (Wikimedia responses: ${commons.length?[...new Set(commons)].join(', '):'none'})`,opened),
  capitalShown:capitalExpected(code)?v(!!facts['Capital / seat'],`capital "${facts['Capital / seat']||'—'}"`,opened):{result:'n/a',detail:'the country has no official capital in the catalogue'}},commonsResponses:[...commons]};
 const c=report.levels[code].checks;console.log(code,Object.entries(c).map(([k,x])=>`${k} ${x.result}`).join(' · '),'|',runTitle,'|',place,'|',photoName);
}
writeFileSync(join(out,args.file||'destination-check.json'),JSON.stringify(report,null,1));
await Promise.race([send('Browser.close'),wait(3000)]);socket.close();child.kill();
